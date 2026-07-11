import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

function getArgValue(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return defaultValue;
  return args[idx + 1];
}

const jsonPath = path.resolve(getArgValue("--json", "productos.json"));
const csvOutPath = path.resolve(getArgValue("--out", "productos_actualizado.csv"));

function sanitizeCell(value) {
  return String(value ?? "")
    .replace(/\r?\n+/g, " | ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function csvEscape(value) {
  const str = sanitizeCell(value);
  if (str.includes('"') || str.includes(",")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function vendidoToCsv(vendido, estado) {
  return vendido === true || estado === "vendido" ? "Si" : "";
}

function imageNameFromPath(imagePath) {
  if (!imagePath) return "";
  return path.basename(String(imagePath));
}

async function main() {
  const products = JSON.parse(await fs.readFile(jsonPath, "utf8"));

  const header = [
    "Producto",
    "Descripcion",
    "Fecha",
    "Precio Lista",
    "Precio sugerido",
    "Categoria",
    "Vendido",
    "Nuevo",
    "Foto",
    "no Foto"
  ];

  const lines = [header.map(csvEscape).join(",")];

  for (const p of products) {
    const row = [
      p.titulo || "",
      p.descripcion || "",
      p.fecha || "",
      p.precioVenta || "",
      p.precioSugerido || "",
      p.categoria || "",
      vendidoToCsv(p.vendido, p.estado),
      p.nuevo || "",
      p.imagen || "",
      imageNameFromPath(p.imagen)
    ];
    lines.push(row.map(csvEscape).join(","));
  }

  await fs.writeFile(csvOutPath, `${lines.join("\n")}\n`, "utf8");

  console.log(JSON.stringify({
    jsonPath,
    csvOutPath,
    totalProducts: products.length,
    normalizedMultilineFields: true
  }, null, 2));
}

main().catch((error) => {
  console.error("Error exportando CSV:", error);
  process.exit(1);
});
