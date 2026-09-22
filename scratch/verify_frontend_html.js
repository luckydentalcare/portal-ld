const http = require('http');

http.get('http://127.0.0.1:5173/appointment.html', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    console.log('appointment.html fetched successfully! Length:', html.length);
    console.log('Has cms-dropdown-gear-btn:', html.includes('cms-dropdown-gear-btn'));
    console.log('Has conditional-other-box:', html.includes('conditional-other-box'));
    console.log('Has pageOtherServiceInput:', html.includes('pageOtherServiceInput'));
    console.log('Has অন্যান্য (Other):', html.includes('অন্যান্য'));
    console.log('Has cms.js included:', html.includes('js/cms.js'));
  });
}).on('error', console.error);
