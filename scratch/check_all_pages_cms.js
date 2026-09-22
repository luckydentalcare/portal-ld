const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'fauntend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

console.log(`Checking ${files.length} HTML pages for CMS integration:\n`);

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf-8');
  const hasStyle = content.includes('css/style.css');
  const hasCms = content.includes('js/cms.js');
  const hasEditLink = content.includes('cms-admin-entry-link');
  console.log(`- ${f}: style.css=${hasStyle}, cms.js=${hasCms}, editLink=${hasEditLink}`);
});
