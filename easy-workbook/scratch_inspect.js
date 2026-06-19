import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const data = new Uint8Array(fs.readFileSync('/home/gvenkatesh/Downloads/GATE NOTES/NETWORK THEORY/Lecture-27 Graph Theory Part-1.pdf'));
  
  const wasmPath = pathToFileURL(path.join(__dirname, 'node_modules/pdfjs-dist/wasm/')).href;
  const fontPath = pathToFileURL(path.join(__dirname, 'node_modules/pdfjs-dist/standard_fonts/')).href;
  
  console.log('Using Wasm path:', wasmPath);
  console.log('Using Font path:', fontPath);

  const loadingTask = pdfjsLib.getDocument({ 
    data,
    cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: fontPath,
    wasmUrl: wasmPath,
  });
  const doc = await loadingTask.promise;
  
  const page = await doc.getPage(3);
  const opList = await page.getOperatorList();
  
  console.log('Successfully retrieved page operators! Operator list length:', opList.fnArray.length);
}

main().catch(console.error);
