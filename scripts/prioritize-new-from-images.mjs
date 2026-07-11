import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

function getArgValue(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return defaultValue;
  return args[idx + 1];
}

function hasFlag(flag) {
  return args.includes(flag);
}

const inputDir = path.resolve(getArgValue("--input", "images"));
const jsonPath = path.resolve(getArgValue("--json", "productos.json"));
const newDate = getArgValue("--date", new Date().toISOString().slice(0, 10));
const priorityStart = Number(getArgValue("--priority-start", "50"));
const priorityStep = Number(getArgValue("--priority-step", "1"));
const orderMode = getArgValue("--order", "price-desc");
const includeSold = hasFlag("--include-sold");
const dryRun = hasFlag("--dry-run");
const setPriority = hasFlag("--set-priority");
const overridePriority = hasFlag("--override-priority");

const validExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function slugifySegment(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function isSold(product) {
  return product.vendido === true || product.estado === "vendido";
}

function parsePriceToNumber(priceValue) {
  if (typeof priceValue === "number") return priceValue;
  return Number(String(priceValue || "").replace(/[^\d]/g, "")) || 0;
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return fullPath;
    })
  );
  return files.flat();
}

function keyFromImagePath(filePath) {
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  return slugifySegment(base);
}

function keyFromProductImage(productImagePath) {
  const ext = path.extname(String(productImagePath || ""));
  const base = path.basename(String(productImagePath || ""), ext);
  return slugifySegment(base);
}

function hasManualPriority(product) {
  return Number(product.prioridad) > 0;
}

async function main() {
  try {
    await fs.access(inputDir);
  } catch {
    console.error(`No existe la carpeta de imagenes: ${inputDir}`);
    process.exit(1);
  }

  const allFiles = await walk(inputDir);
  const inputImages = allFiles.filter((filePath) => validExtensions.has(path.extname(filePath).toLowerCase()));

  if (inputImages.length === 0) {
    console.log("No se encontraron imagenes para priorizar.");
    return;
  }

  const imageKeys = new Set(inputImages.map((filePath) => keyFromImagePath(filePath)));
  const products = JSON.parse(await fs.readFile(jsonPath, "utf8"));

  const matches = [];
  const notMatchedImageFiles = [];

  for (const imageFile of inputImages) {
    const key = keyFromImagePath(imageFile);
    const product = products.find((item) => keyFromProductImage(item.imagen) === key);

    if (!product) {
      notMatchedImageFiles.push(path.relative(process.cwd(), imageFile));
      continue;
    }

    if (!includeSold && isSold(product)) {
      continue;
    }

    if (!matches.some((item) => item.id === product.id)) {
      matches.push(product);
    }
  }

  if (matches.length === 0) {
    console.log("No hubo productos matcheados para actualizar prioridad/nuevo.");
    if (notMatchedImageFiles.length > 0) {
      console.log("Imagenes sin match:");
      notMatchedImageFiles.forEach((file) => console.log(`- ${file}`));
    }
    return;
  }

  if (orderMode === "price-desc") {
    matches.sort((a, b) => parsePriceToNumber(b.precioVenta) - parsePriceToNumber(a.precioVenta));
  } else if (orderMode === "price-asc") {
    matches.sort((a, b) => parsePriceToNumber(a.precioVenta) - parsePriceToNumber(b.precioVenta));
  } else {
    matches.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }

  let currentPriority = priorityStart;
  const updated = [];

  for (const product of matches) {
    product.nuevo = newDate;

    const canSetPriority =
      setPriority && (overridePriority || !hasManualPriority(product));

    if (canSetPriority) {
      product.prioridad = currentPriority;
      currentPriority += priorityStep;
    }

    updated.push({
      id: product.id,
      titulo: product.titulo,
      precioVenta: product.precioVenta,
      prioridad: product.prioridad,
      prioridadActualizada: canSetPriority,
      nuevo: newDate
    });
  }

  if (!dryRun) {
    await fs.writeFile(jsonPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({
    mode: dryRun ? "dry-run" : "applied",
    inputDir,
    jsonPath,
    orderMode,
    includeSold,
    setPriority,
    overridePriority,
    imageFilesFound: inputImages.length,
    imageKeysFound: imageKeys.size,
    productsUpdated: updated.length,
    prioritiesUpdated: updated.filter((item) => item.prioridadActualizada).length,
    imagesWithoutMatch: notMatchedImageFiles.length
  }, null, 2));

  console.log("\nProductos priorizados:");
  updated.forEach((item) => {
    const tag = item.prioridadActualizada ? "p-set" : "p-keep";
    console.log(`- id:${item.id} p:${item.prioridad} [${tag}] ${item.titulo} (${item.precioVenta})`);
  });

  if (notMatchedImageFiles.length > 0) {
    console.log("\nImagenes sin match en JSON:");
    notMatchedImageFiles.forEach((file) => console.log(`- ${file}`));
  }
}

main().catch((error) => {
  console.error("Error al priorizar nuevos por imagenes:", error);
  process.exit(1);
});
