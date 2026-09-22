const fs = require('fs');
const path = require('path');

const fauntendDir = path.join(__dirname, '..');
const pages = [
  'about.html',
  'heritage.html',
  'service.html',
  'digital.html',
  'why-us.html',
  'gallery.html',
  'contact.html',
  'appointment.html',
  '404.html',
  'treatment-of-missing-tooth.html'
];

pages.forEach(file => {
  const filePath = path.join(fauntendDir, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Script injection
  if (!content.includes('js/cms.js')) {
    content = content.replace(
      '<script src="js/main.js"></script>',
      '<!-- Lucky Dental Care Scripts -->\n  <script src="js/global.js"></script>\n  <script src="js/cms.js"></script>\n  <script src="js/main.js"></script>'
    );
  }

  // 2. Footer admin link
  if (!content.includes('cms-admin-entry-link')) {
    content = content.replace(
      '<div>Lucky Dental Care © 2026. সর্বস্বত্ব সংরক্ষিত। | <strong>SMILE FOR LIFE</strong></div>',
      '<div>Lucky Dental Care © 2026. সর্বস্বত্ব সংরক্ষিত। | <strong>SMILE FOR LIFE</strong> | <a href="#" class="cms-admin-entry-link" title="অ্যাডমিন সম্পাদনা মোড"><i class="fas fa-lock"></i> সম্পাদনা</a></div>'
    );
    // Also try alternative Bengali phrasing if slightly different
    content = content.replace(
      '<div>Lucky Dental Care © 2026. সর্বস্বত্ব সংরক্ষিত। | <strong>SMILE FOR LIFE</strong>\n        </div>',
      '<div>Lucky Dental Care © 2026. সর্বস্বত্ব সংরক্ষিত। | <strong>SMILE FOR LIFE</strong> | <a href="#" class="cms-admin-entry-link" title="অ্যাডমিন সম্পাদনা মোড"><i class="fas fa-lock"></i> সম্পাদনা</a></div>'
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated CMS scripts and footer in ${file}`);
});
