const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;
const BASE_URL = 'http://127.0.0.1:5173';
const ARTIFACTS_DIR = 'C:\\Users\\Rc\\.gemini\\antigravity-ide\\brain\\3d1379e8-37f6-455b-afb6-8f60e0374fff';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const cb = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) cb.reject(msg.error);
        else cb.resolve(msg.result);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions'
  ]);

  await sleep(1500);

  try {
    const versionRes = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
    const target = await versionRes.json();
    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();

    await client.send('Page.enable');

    // 1. Desktop full page on index.html
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.send('Page.navigate', { credentials: 'omit', url: `${BASE_URL}/index.html` });
    await sleep(600);
    const shotDesktop = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'desktop_repaired_index.png'), Buffer.from(shotDesktop.data, 'base64'));
    console.log('Saved desktop_repaired_index.png');

    // 2. Mobile on index.html
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await client.send('Page.navigate', { credentials: 'omit', url: `${BASE_URL}/index.html` });
    await sleep(600);
    const shotMobile = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_repaired_index.png'), Buffer.from(shotMobile.data, 'base64'));
    console.log('Saved mobile_repaired_index.png');

    // 3. Tablet on service.html
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 768,
      height: 1024,
      deviceScaleFactor: 1,
      mobile: true
    });
    await client.send('Page.navigate', { credentials: 'omit', url: `${BASE_URL}/service.html` });
    await sleep(600);
    const shotService = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'tablet_repaired_service.png'), Buffer.from(shotService.data, 'base64'));
    console.log('Saved tablet_repaired_service.png');

    client.close();
  } catch (err) {
    console.error(err);
  } finally {
    chrome.kill();
  }
}

run();
