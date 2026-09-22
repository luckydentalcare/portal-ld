const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
const TARGET_URL = 'http://localhost:5500/fauntend/appointment.html';

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
    return new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
  }
  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve: res, reject: rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

(async () => {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,1000'
  ]);
  await new Promise(r => setTimeout(r, 1500));
  const targetRes = await fetch('http://127.0.0.1:' + PORT + '/json/new?' + encodeURIComponent(TARGET_URL), { method: 'PUT' });
  const target = await targetRes.json();
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.ready();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1100, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 1500));

  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const s = document.getElementById('pageServiceSelect');
      s.value = 'অন্যান্য (Other)';
      s.dispatchEvent(new Event('change'));
      const otherInput = document.getElementById('other-service-input');
      if (otherInput) otherInput.value = 'মাড়ি ফোলা ও তীব্র দাঁত ব্যথা';
      const name = document.getElementById('pagePatientName');
      if (name) name.value = 'মোঃ জাহিদ হাসান';
      const phone = document.getElementById('pagePatientPhone');
      if (phone) phone.value = '01712345678';
    })()`
  });

  await new Promise(r => setTimeout(r, 800));

  const ss = await client.send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:\\Users\\Rc\\.gemini\\antigravity-ide\\brain\\258399b6-165f-46ca-83de-6fef7e711d71\\verified_appointment_dropdown.png';
  fs.writeFileSync(outPath, Buffer.from(ss.data, 'base64'));
  chrome.kill();
  console.log('Saved appointment screenshot to:', outPath);
})();
