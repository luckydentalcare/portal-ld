const fs = require('fs');
const path = require('path');

const fauntendDir = path.join(__dirname, '..');
const htmlFiles = fs.readdirSync(fauntendDir).filter(f => f.endsWith('.html'));

let totalChecked = 0;
let missingCount = 0;

htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(fauntendDir, file), 'utf8');

  // Check CSS
  const cssMatches = [...content.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)];
  cssMatches.forEach(m => {
    const href = m[1];
    if (href.startsWith('http://') || href.startsWith('https://')) return;
    totalChecked++;
    const fullPath = path.join(fauntendDir, href);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ [${file}] Missing CSS: ${href}`);
      missingCount++;
    }
  });

  // Check JS
  const jsMatches = [...content.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi)];
  jsMatches.forEach(m => {
    const src = m[1];
    if (src.startsWith('http://') || src.startsWith('https://')) return;
    totalChecked++;
    const fullPath = path.join(fauntendDir, src);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ [${file}] Missing JS: ${src}`);
      missingCount++;
    }
  });

  // Check Images
  const imgMatches = [...content.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/gi)];
  imgMatches.forEach(m => {
    let src = m[1];
    if (!src || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return;
    src = src.split('?')[0].split('#')[0];
    totalChecked++;
    const fullPath = path.join(fauntendDir, src);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ [${file}] Missing IMG: ${src}`);
      missingCount++;
    }
  });
});

console.log(`\n========================================`);
console.log(`Assets checked across all 11 HTML pages: ${totalChecked}`);
console.log(`Missing assets: ${missingCount}`);
console.log(`========================================\n`);
