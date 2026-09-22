const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const BASE_URL = 'http://127.0.0.1:5173';

const pages = [
  'index.html',
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

const breakpoints = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.logs = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const cb = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) cb.reject(msg.error);
        else cb.resolve(msg.result);
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        this.logs.push(msg.params.entry.text);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.logs.push(msg.params.args.map(a => a.value || a.description).join(' '));
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
  console.log('Spawning headless Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions'
  ]);

  await sleep(1500);

  try {
    // Get target websocket URL
    const versionRes = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
    const target = await versionRes.json();
    console.log('Connected to target:', target.webSocketDebuggerUrl);

    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');

    console.log('\n--- TESTING BREAKPOINTS & RESPONSIVE OVERFLOW ---');
    let totalTests = 0;
    let overflowFailures = [];
    let consoleErrors = [];

    for (const page of pages) {
      process.stdout.write(`Testing ${page} ... `);
      let pageErrors = [];

      for (const bp of breakpoints) {
        totalTests++;
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: bp.width,
          height: bp.height,
          deviceScaleFactor: 1,
          mobile: bp.width <= 768
        });

        await client.send('Page.navigate', { credentials: 'omit', url: `${BASE_URL}/${page}` });
        await sleep(350); // wait for render & animations

        const evalRes = await client.send('Runtime.evaluate', {
          expression: `(() => {
            const scrollWidth = document.documentElement.scrollWidth;
            const innerWidth = window.innerWidth;
            const hasOverflow = scrollWidth > innerWidth + 1;
            let overflowingEls = [];
            if (hasOverflow) {
              const all = document.querySelectorAll('*');
              for (const el of all) {
                const rect = el.getBoundingClientRect();
                if (rect.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1) {
                  overflowingEls.push(el.tagName + (el.className ? '.' + Array.from(el.classList).join('.') : '') + ' (r=' + Math.round(rect.right) + ', w=' + Math.round(rect.width) + ')');
                  if (overflowingEls.length > 5) break;
                }
              }
            }
            return {
              scrollWidth,
              innerWidth,
              hasOverflow,
              overflowingEls
            };
          })()`,
          returnByValue: true
        });

        const res = evalRes.result.value;
        if (res.hasOverflow) {
          overflowFailures.push({
            page,
            breakpoint: `${bp.width}x${bp.height}`,
            scrollWidth: res.scrollWidth,
            innerWidth: res.innerWidth,
            overflowingEls: res.overflowingEls
          });
          pageErrors.push(`${bp.width}px overflow (${res.scrollWidth} > ${res.innerWidth})`);
        }
      }

      if (pageErrors.length > 0) {
        console.log(`❌ FAIL [${pageErrors.join(', ')}]`);
      } else {
        console.log(`✅ OK across all 9 breakpoints`);
      }
    }

    // Now test Section Header Centering on index.html, about.html, service.html, why-us.html
    console.log('\n--- VERIFYING SECTION HEADERS CENTERING ---');
    for (const testPage of ['index.html', 'about.html', 'service.html', 'why-us.html', 'digital.html']) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await client.send('Page.navigate', { credentials: 'omit', url: `${BASE_URL}/${testPage}` });
      await sleep(300);

      const headerCheck = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const headers = document.querySelectorAll('.section-header');
          const results = [];
          const docMid = window.innerWidth / 2;
          for (const h of headers) {
            const hRect = h.getBoundingClientRect();
            const hMid = hRect.left + hRect.width / 2;
            const badge = h.querySelector('.section-badge');
            const title = h.querySelector('.section-title');
            const subtitle = h.querySelector('.section-subtitle');
            results.push({
              headerCentered: Math.abs(hMid - docMid) < 15,
              badgeCentered: badge ? Math.abs((badge.getBoundingClientRect().left + badge.getBoundingClientRect().width/2) - hMid) < 15 : null,
              titleCentered: title ? Math.abs((title.getBoundingClientRect().left + title.getBoundingClientRect().width/2) - hMid) < 15 : null,
              subtitleCentered: subtitle ? Math.abs((subtitle.getBoundingClientRect().left + subtitle.getBoundingClientRect().width/2) - hMid) < 15 : null,
              titleText: title ? title.textContent.trim().substring(0, 30) : 'none'
            });
          }
          return results;
        })()`,
        returnByValue: true
      });

      console.log(`Page: ${testPage} (${headerCheck.result.value.length} headers checked)`);
      for (const h of headerCheck.result.value) {
        const ok = h.headerCentered && (h.badgeCentered === null || h.badgeCentered) && (h.titleCentered === null || h.titleCentered);
        console.log(`  Header "${h.titleText}...": ${ok ? '✅ Centered' : '❌ Not centered'}`);
      }
    }

    console.log(`\n================================`);
    console.log(`Total breakpoint checks: ${totalTests}`);
    console.log(`Overflow failures: ${overflowFailures.length}`);
    if (overflowFailures.length > 0) {
      console.log('Details:');
      console.log(JSON.stringify(overflowFailures, null, 2));
    }
    console.log(`Console errors during test: ${client.logs.length}`);
    if (client.logs.length > 0) {
      console.log('Console logs/errors:', client.logs);
    }
    console.log(`================================\n`);

    client.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    chrome.kill();
  }
}

run();
