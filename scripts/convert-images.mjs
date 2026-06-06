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
const markerSuffix = getArgValue("--marker-suffix", ".converted");

const validExtensions = new Set([".jpg", ".jpeg", ".png"]);

function slugifySegment(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function slugifyRelativePath(relativePathWithoutExtension) {
  const segments = relativePathWithoutExtension.split(path.sep);
  return segments.map((segment) => slugifySegment(segment)).join(path.sep);
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

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function getMarkerPath(filePath) {
  return `${filePath}${markerSuffix}`;
}

async function shouldSkipConversion(filePath) {
  const markerPath = getMarkerPath(filePath);

  try {
    const [sourceStat, markerStat] = await Promise.all([
      fs.stat(filePath),
      fs.stat(markerPath)
    ]);

    // Si la imagen original no se modifico desde la ultima conversion, se saltea.
    return markerStat.mtimeMs >= sourceStat.mtimeMs;
  } catch {
    return false;
  }
}

async function markAsConverted(filePath, metadata) {
  const markerPath = getMarkerPath(filePath);
  const markerContent = JSON.stringify(
    {
      convertedAt: new Date().toISOString(),
      outputs: {
        webp: metadata.webpPath,
        avif: metadata.avifPath
      }
    },
    null,
    2
  );

  await fs.writeFile(markerPath, markerContent, "utf8");
}

async function convertOne(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!validExtensions.has(ext)) return null;

  if (await shouldSkipConversion(filePath)) {
    return { skipped: true, rel: path.relative(inputDir, filePath) };
  }

  const rel = path.relative(inputDir, filePath);
  const relNoExt = rel.slice(0, -ext.length);
  const slugRelNoExt = slugifyRelativePath(relNoExt);

  const webpPath = path.join(outputDir, `${slugRelNoExt}.webp`);
  const avifPath = path.join(outputDir, `${slugRelNoExt}.avif`);

  await ensureDir(path.dirname(webpPath));

  const image = sharp(filePath);
  await image.webp({ quality: webpQuality }).toFile(webpPath);
  await sharp(filePath).avif({ quality: avifQuality }).toFile(avifPath);

  const metadata = { rel, slugRelNoExt, webpPath, avifPath };
  await markAsConverted(filePath, metadata);

  return { ...metadata, skipped: false };
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
  let skipped = 0;
  for (const file of imageFiles) {
    const out = await convertOne(file);
    if (out) {
      if (out.skipped) {
        skipped += 1;
        console.log(`SKIP: ${out.rel}`);
        continue;
      }

      converted += 1;
      console.log(`OK: ${out.rel} -> ${out.slugRelNoExt}`);
    }
  }

  console.log(`Listo. Convertidas: ${converted}`);
  console.log(`Salteadas: ${skipped}`);
  console.log(`Salida: ${outputDir}`);
}

main().catch((err) => {
  console.error("Error durante la conversion:", err);
  process.exit(1);
});
