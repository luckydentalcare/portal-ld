const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Rc\\.gemini\\antigravity-ide\\brain\\3d1379e8-37f6-455b-afb6-8f60e0374fff';

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function sendWs(ws, method, params = {}, id = 1) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ id, method, params });
    const onMessage = (data) => {
      const msg = JSON.parse(data);
      if (msg.id === id) {
        ws.removeListener('message', onMessage);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.on('message', onMessage);
    ws.send(payload);
  });
}

async function run() {
  const WebSocket = require('ws');

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const list = await getJson('http://127.0.0.1:9222/json/list');
    const wsUrl = list[0].webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);

    await new Promise((res, rej) => {
      ws.on('open', res);
      ws.on('error', rej);
    });

    let msgId = 1;
    const call = (method, params) => sendWs(ws, method, params, msgId++);

    await call('Page.enable');
    await call('DOM.enable');

    console.log('Navigating to appointment.html...');
    await call('Page.navigate', { url: 'http://127.0.0.1:5173/appointment.html' });
    await new Promise(r => setTimeout(r, 2500));

    // 1. Trigger Login and activate Edit Mode via evaluation
    await call('Runtime.evaluate', {
      expression: `
        (function() {
          window.LuckyAuth.setToken('test_token');
          window.LuckyCMS.enableEdit();
          // Select 'অন্যান্য'
          const sel = document.getElementById('pageServiceSelect');
          if (sel) {
            for (let i = 0; i < sel.options.length; i++) {
              if (sel.options[i].text.includes('অন্যান্য') || sel.options[i].value.includes('অন্যান্য')) {
                sel.selectedIndex = i;
                sel.dispatchEvent(new Event('change'));
                break;
              }
            }
          }
        })();
      `
    });

    await new Promise(r => setTimeout(r, 1200));

    // Capture proof 1: Appointment page in edit mode with "অন্যান্য" active and floating dock
    const snap1 = await call('Page.captureScreenshot', { format: 'png' });
    const path1 = path.join(artifactDir, 'appointment_edit_mode_other_service.png');
    fs.writeFileSync(path1, Buffer.from(snap1.data, 'base64'));
    console.log('Saved proof 1:', path1);

    // 2. Open Dropdown Manager modal
    await call('Runtime.evaluate', {
      expression: `window.LuckyCMS.openDropdownManager('services');`
    });
    await new Promise(r => setTimeout(r, 1200));

    const snap2 = await call('Page.captureScreenshot', { format: 'png' });
    const path2 = path.join(artifactDir, 'appointment_dropdown_manager_modal.png');
    fs.writeFileSync(path2, Buffer.from(snap2.data, 'base64'));
    console.log('Saved proof 2:', path2);

    // 3. Open History Drawer
    await call('Runtime.evaluate', {
      expression: `
        document.getElementById('luckyDropdownManagerModal')?.classList.remove('active');
        window.LuckyCMS.openHistory();
      `
    });
    await new Promise(r => setTimeout(r, 1500));

    const snap3 = await call('Page.captureScreenshot', { format: 'png' });
    const path3 = path.join(artifactDir, 'cms_version_history_drawer.png');
    fs.writeFileSync(path3, Buffer.from(snap3.data, 'base64'));
    console.log('Saved proof 3:', path3);

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

run().catch(console.error);
