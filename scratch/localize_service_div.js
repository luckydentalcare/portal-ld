const fs = require('fs');
const path = require('path');

const serviceDivPath = path.join(__dirname, '..', 'fauntend', 'service-div.html');
let content = fs.readFileSync(serviceDivPath, 'utf8');

const replacements = [
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Teeth-Gap-Filling-before\.webp/g, local: 'img/service-gap-filling-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Teeth-Gap-Filling-after\.webp/g, local: 'img/service-gap-filling-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Painless-Root-Canal-Treatment-before\.webp/g, local: 'img/service-root-canal-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Painless-Root-Canal-Treatment-after\.webp/g, local: 'img/service-root-canal-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Dental-Crown-before\.webp/g, local: 'img/service-crown-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Dental-Crown-after\.webp/g, local: 'img/service-crown-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Scalling-treatment-before\.webp/g, local: 'img/service-scaling-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/scalling-treatment-after-\.webp/g, local: 'img/service-scaling-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/dental-filling-after-\.webp/g, local: 'img/service-filling-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/dental-filling-before\.webp/g, local: 'img/service-filling-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Teeth-Braces-before\.webp/g, local: 'img/service-braces-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Teeth-Braces-after\.webp/g, local: 'img/service-braces-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Dental-Implants-before-\.webp/g, local: 'img/service-implants-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Dental-Implants-after-image\.webp/g, local: 'img/service-implants-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/veneers-before\.webp/g, local: 'img/service-veneers-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/veneers-after\.webp/g, local: 'img/service-veneers-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Invisalign-Clear-Aligners-before\.webp/g, local: 'img/service-invisalign-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Invisalign-Clear-Aligners-after\.webp/g, local: 'img/service-invisalign-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/dental-smile-design-before\.webp/g, local: 'img/service-smile-design-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/dental-smile-design-after\.webp/g, local: 'img/service-smile-design-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/teeth-whitting-before\.webp/g, local: 'img/service-whitening-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/teeth-whitting-after\.webp/g, local: 'img/service-whitening-after.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Pediatric-Children-Dentistry-before\.webp/g, local: 'img/service-pediatric-before.webp' },
  { remote: /https:\/\/techdentalcare\.com\/wp-content\/uploads\/2026\/02\/Pediatric-Children-Dentistry-after\.webp/g, local: 'img/service-pediatric-after.webp' }
];

replacements.forEach(r => {
  content = content.replace(r.remote, r.local);
});

fs.writeFileSync(serviceDivPath, content, 'utf8');
console.log('Successfully localized service-div.html images!');
