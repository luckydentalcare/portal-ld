const fs = require('fs');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const serviceHtml = fs.readFileSync('service.html', 'utf8');

const serviceCardLinks = [...indexHtml.matchAll(/href="(service\.html#[^"]+)"/g)].map(m => m[1]);
console.log('Links in index.html:', serviceCardLinks);

let missing = 0;
serviceCardLinks.forEach(link => {
  const id = link.split('#')[1];
  const hasId = serviceHtml.includes(`id="${id}"`);
  console.log(`ID in service.html #${id} -> ${hasId ? 'FOUND' : 'MISSING!'}`);
  if (!hasId) missing++;
});

console.log('Total checked:', serviceCardLinks.length, 'Missing:', missing);
