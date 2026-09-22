const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
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

    // 1. Desktop view scrolled to Estimator
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.send('Page.navigate', { credentials: 'omit', url: `${BASE_URL}/index.html` });
    await sleep(800);

    // Click 2 checkboxes and scroll into view
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const est = document.getElementById('price-estimator');
        if (est) est.scrollIntoView({ behavior: 'instant', block: 'start' });
        const boxes = document.querySelectorAll('.treatment-checkbox');
        if (boxes.length >= 2) {
          boxes[0].click();
          boxes[1].click();
        }
      })()`
    });
    await sleep(600);

    const shotEstimator = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'desktop_price_estimator.png'), Buffer.from(shotEstimator.data, 'base64'));
    console.log('Saved desktop_price_estimator.png');

    // 2. Mobile view scrolled to Estimator
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await client.send('Page.navigate', { credentials: 'omit', url: `${BASE_URL}/index.html` });
    await sleep(800);

    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const est = document.getElementById('price-estimator');
        if (est) est.scrollIntoView({ behavior: 'instant', block: 'start' });
        const boxes = document.querySelectorAll('.treatment-checkbox');
        if (boxes.length >= 1) {
          boxes[0].click();
        }
      })()`
    });
    await sleep(600);

    const shotMobileEstimator = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_price_estimator.png'), Buffer.from(shotMobileEstimator.data, 'base64'));
    console.log('Saved mobile_price_estimator.png');

    client.close();
  } catch (err) {
    console.error(err);
  } finally {
    chrome.kill();
  }
}

run();
