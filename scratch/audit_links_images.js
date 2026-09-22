const fs = require('fs');
const path = require('path');

const fauntendDir = path.join(__dirname, '..', 'fauntend');
const htmlFiles = fs.readdirSync(fauntendDir).filter(f => f.endsWith('.html'));

console.log(`Auditing ${htmlFiles.length} HTML files: ${htmlFiles.join(', ')}`);

let totalRemoteImgs = 0;
let totalDeadLinks = 0;
const deletedPages = ['heritage.html', 'digital.html', 'why-us.html', 'gallery.html'];

htmlFiles.forEach(file => {
  const filePath = path.join(fauntendDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check remote images
  const imgRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    console.log(`[REMOTE IMAGE] in ${file}: ${match[1]}`);
    totalRemoteImgs++;
  }

  // Check dead links
  deletedPages.forEach(dep => {
    // Regex for href="heritage.html" or href="./heritage.html"
    const linkRegex = new RegExp(`href=["'](\\./)?${dep}["']`, 'gi');
    let lMatch;
    while ((lMatch = linkRegex.exec(content)) !== null) {
      console.log(`[DEAD LINK] in ${file}: ${lMatch[0]}`);
      totalDeadLinks++;
    }
  });
});

console.log(`\nAudit Summary:`);
console.log(`- Total remote images: ${totalRemoteImgs}`);
console.log(`- Total dead links: ${totalDeadLinks}`);

if (totalRemoteImgs === 0 && totalDeadLinks === 0) {
  console.log('✅ AUDIT PASSED: ZERO remote images and ZERO dead links!');
} else {
  console.error('❌ AUDIT FAILED!');
  process.exit(1);
}
