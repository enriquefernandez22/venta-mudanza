import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);

function getArgValue(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return defaultValue;
  return args[idx + 1];
}

const inputDir = path.resolve(getArgValue("--input", "images"));
const outputDir = path.resolve(getArgValue("--output", "img"));
const webpQuality = Number(getArgValue("--webp", "78"));
const avifQuality = Number(getArgValue("--avif", "50"));

const validExtensions = new Set([".jpg", ".jpeg", ".png"]);

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

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function convertOne(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!validExtensions.has(ext)) return null;

  const rel = path.relative(inputDir, filePath);
  const relNoExt = rel.slice(0, -ext.length);

  const webpPath = path.join(outputDir, `${relNoExt}.webp`);
  const avifPath = path.join(outputDir, `${relNoExt}.avif`);

  await ensureDir(path.dirname(webpPath));

  const image = sharp(filePath);
  await image.webp({ quality: webpQuality }).toFile(webpPath);
  await sharp(filePath).avif({ quality: avifQuality }).toFile(avifPath);

  return { rel, webpPath, avifPath };
}

async function main() {
  try {
    await fs.access(inputDir);
  } catch {
    console.error(`No existe la carpeta de entrada: ${inputDir}`);
    console.error("Usa: npm run convert:images -- --input images --output img");
    process.exit(1);
  }

  const allFiles = await walk(inputDir);
  const imageFiles = allFiles.filter((f) => validExtensions.has(path.extname(f).toLowerCase()));

  if (imageFiles.length === 0) {
    console.log("No se encontraron JPG/PNG para convertir.");
    return;
  }

  console.log(`Convirtiendo ${imageFiles.length} imagen(es)...`);

  let converted = 0;
  for (const file of imageFiles) {
    const out = await convertOne(file);
    if (out) {
      converted += 1;
      console.log(`OK: ${out.rel}`);
    }
  }

  console.log(`Listo. Convertidas: ${converted}`);
  console.log(`Salida: ${outputDir}`);
}

main().catch((err) => {
  console.error("Error durante la conversion:", err);
  process.exit(1);
});
