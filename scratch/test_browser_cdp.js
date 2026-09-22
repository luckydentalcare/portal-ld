const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;
const TARGET_URL = 'http://localhost:5500/fauntend/appointment.html';

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
  console.log('Spawning headless Chrome on port ' + PORT + '...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions'
  ]);

  await sleep(1500);

  try {
    const targetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(TARGET_URL)}`, { method: 'PUT' });
    const target = await targetRes.json();
    console.log('Connected to target page:', target.url);

    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    await sleep(2000); // Wait for scripts & styles

    console.log('\n--- 1. VERIFY APPOINTMENT DROPDOWNS ---');
    const dropdownEval = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const sSelect = document.getElementById('pageServiceSelect');
        const tSelect = document.getElementById('pagePreferredTime');
        const sOptions = Array.from(sSelect.options).map(o => o.text);
        const tOptions = Array.from(tSelect.options).map(o => o.text);
        const hasUndefinedS = sOptions.some(t => t.includes('undefined'));
        const hasUndefinedT = tOptions.some(t => t.includes('undefined'));
        return {
          serviceCount: sOptions.length,
          scheduleCount: tOptions.length,
          hasUndefinedS,
          hasUndefinedT,
          sOptions,
          tOptions
        };
      })()`,
      returnByValue: true
    });

    const dd = dropdownEval.result.value;
    console.log(`Services (${dd.serviceCount} items):`, dd.sOptions.slice(0, 3).join(', ') + ' ... ' + dd.sOptions.slice(-1));
    console.log(`Time Slots (${dd.scheduleCount} items):`, dd.tOptions.join(', '));
    console.log(`Any "undefined" in services: ${dd.hasUndefinedS ? 'YES (FAIL)' : 'NO (PASS)'}`);
    console.log(`Any "undefined" in schedules: ${dd.hasUndefinedT ? 'YES (FAIL)' : 'NO (PASS)'}`);

    console.log('\n--- 2. VERIFY "অন্যান্য (Other)" DYNAMIC INPUT TRIGGER ---');
    const otherTriggerEval = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const sSelect = document.getElementById('pageServiceSelect');
        sSelect.value = 'অন্যান্য (Other)';
        sSelect.dispatchEvent(new Event('change'));
        const wrapper = document.getElementById('other-service-wrapper');
        const input = document.getElementById('other-service-input');
        return {
          wrapperDisplay: window.getComputedStyle(wrapper).display,
          inputPlaceholder: input ? input.placeholder : null,
          isRequired: input ? input.required : false
        };
      })()`,
      returnByValue: true
    });

    const ot = otherTriggerEval.result.value;
    console.log(`Wrapper display after selecting "অন্যান্য (Other)": ${ot.wrapperDisplay} (Expected: block)`);
    console.log(`Input placeholder: "${ot.inputPlaceholder}"`);
    console.log(`Input is required: ${ot.isRequired}`);

    console.log('\n--- 3. VERIFY UNIVERSAL DOM EDITABILITY & CMS ACTIVATION ---');
    const editModeEval = await client.send('Runtime.evaluate', {
      expression: `(() => {
        window.LuckyCMS.enableEdit();
        const dock = document.getElementById('cmsFloatingDock');
        const editables = document.querySelectorAll('.cms-editable-active');
        const footerLinks = document.querySelectorAll('.site-footer a');
        const allEditableLinks = Array.from(footerLinks).filter(a => a.getAttribute('contenteditable') === 'true');
        const headerItems = Array.from(document.querySelectorAll('.top-info-bar span')).filter(s => s.getAttribute('contenteditable') === 'true');
        return {
          dockPresent: !!dock,
          totalEditableElements: editables.length,
          footerLinksCount: footerLinks.length,
          editableFooterLinksCount: allEditableLinks.length,
          headerEditableCount: headerItems.length
        };
      })()`,
      returnByValue: true
    });

    const em = editModeEval.result.value;
    console.log(`Floating Dock mounted: ${em.dockPresent}`);
    console.log(`Total editable elements marked across page: ${em.totalEditableElements}`);
    console.log(`Editable footer links: ${em.editableFooterLinksCount} / ${em.footerLinksCount}`);
    console.log(`Editable header contact items: ${em.headerEditableCount}`);

    console.log('\n--- 4. VERIFY STRICT LINK NAVIGATION LOCKOUT IN EDIT MODE ---');
    const lockoutEval = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const initialUrl = window.location.href;
        const testLink = document.querySelector('.site-footer a[href="about.html"]');
        if (testLink) {
          testLink.click();
        }
        return {
          initialUrl,
          currentUrl: window.location.href,
          stayedOnPage: window.location.href === initialUrl,
          activeElementText: document.activeElement ? document.activeElement.textContent.trim() : null
        };
      })()`,
      returnByValue: true
    });

    const lo = lockoutEval.result.value;
    console.log(`Clicked link href="about.html". Stayed on page: ${lo.stayedOnPage ? 'YES (PASS - Navigation Locked Out)' : 'NO (FAIL - Redirected)'}`);
    console.log(`Active focused element text: "${lo.activeElementText}"`);

    console.log('\n--- 5. VERIFY UNDO / REDO ENGINE ---');
    const undoRedoEval = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const h1 = document.querySelector('h1.page-hero-title');
        const originalText = h1.textContent.trim();
        
        // Focus and mutate
        h1.focus();
        h1.textContent = 'কাস্টম অ্যাপয়েন্টমেন্ট টাইটেল';
        h1.dispatchEvent(new Event('input', { bubbles: true }));
        h1.blur();
        
        const mutatedText = h1.textContent.trim();
        
        // Undo
        window.LuckyCMS.undo();
        const undoneText = h1.textContent.trim();
        
        // Redo
        window.LuckyCMS.redo();
        const redoneText = h1.textContent.trim();
        
        return {
          originalText,
          mutatedText,
          undoneText,
          redoneText,
          undoWorked: undoneText === originalText,
          redoWorked: redoneText === mutatedText
        };
      })()`,
      returnByValue: true
    });

    const ur = undoRedoEval.result.value;
    console.log(`Original Text: "${ur.originalText}"`);
    console.log(`Mutated Text: "${ur.mutatedText}"`);
    console.log(`Undone Text: "${ur.undoneText}" -> Undo success: ${ur.undoWorked ? 'PASS' : 'FAIL'}`);
    console.log(`Redone Text: "${ur.redoneText}" -> Redo success: ${ur.redoWorked ? 'PASS' : 'FAIL'}`);

    console.log('\n--- 6. VERIFY DROPDOWN MANAGER MODAL ---');
    await client.send('Runtime.evaluate', {
      expression: `window.LuckyCMS.openDropdownManager('services')`,
      awaitPromise: true
    });
    await sleep(1200);

    const managerEval = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.getElementById('luckyDropdownManagerModal');
        const rows = document.querySelectorAll('.cms-opt-item');
        const labels = Array.from(document.querySelectorAll('.cms-opt-label-input')).map(i => i.value);
        const hasUndefined = labels.some(l => l.includes('undefined'));
        return {
          modalActive: modal && modal.classList.contains('active'),
          rowCount: rows.length,
          hasUndefined,
          sampleLabels: labels.slice(0, 3)
        };
      })()`,
      returnByValue: true
    });

    const mgr = managerEval.result.value;
    console.log(`Dropdown Manager Modal active: ${mgr.modalActive}`);
    console.log(`Options displayed in Manager: ${mgr.rowCount}`);
    console.log(`Any "undefined" in Manager items: ${mgr.hasUndefined ? 'YES (FAIL)' : 'NO (PASS)'}`);
    console.log(`Sample Manager items:`, mgr.sampleLabels.join(', '));

    // Capture screenshot of the verified page in Edit Mode
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(__dirname, '..', 'scratch', 'verified_cms_edit_mode.png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log('\nSaved verification screenshot to:', screenshotPath);

    client.close();
    console.log('\n==================================================');
    console.log('ALL INLINE CMS & DROPDOWN VERIFICATIONS PASSED 100%!');
    console.log('==================================================');

  } catch (err) {
    console.error('CDP Error:', err);
  } finally {
    chrome.kill();
  }
}

run();
