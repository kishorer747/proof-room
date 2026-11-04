// Copies src/ to public/. public/ is what the server shows, so a change in
// src/ is not live until this has run.
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('./src/', import.meta.url));
const pub = fileURLToPath(new URL('./public/', import.meta.url));

if (!existsSync(src)) {
  console.error(`publish: source folder not found: ${src}`);
  process.exit(1);
}

// Start empty so a page deleted from src/ also disappears from public/.
rmSync(pub, { recursive: true, force: true });
cpSync(src, pub, { recursive: true });

const files = readdirSync(pub, { recursive: true, withFileTypes: true }).filter((e) => e.isFile());
console.log(`published ${files.length} files to ${pub}`);
