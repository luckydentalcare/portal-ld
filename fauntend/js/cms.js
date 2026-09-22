/**
 * Lucky Dental Care — True Universal DOM Inline CMS Engine
 * 1. 100% Element Editability via Recursive DOM Tree Walker & Content Key Engine
 * 2. Strict Link & Form Navigation Lockout (Capture Phase Interceptor)
 * 3. Dropdown "undefined" Crash Elimination & Dynamic Options Manager with Database Sync
 * 4. In-Memory Undo/Redo Stack (Cap 50) with Input Listeners & Shortcuts (Ctrl+Z / Ctrl+Y)
 * 5. Input Placeholder & Value Mini-Editor Popover (Right-Click / Double-Click)
 * 6. Image & CSS Background-Image Replacement with Cloud Media Storage
 * 7. Version History & Atomic Rollback
 * ZERO secrets or passwords in client code.
 */

(function () {
  'use strict';

  // State
  let currentContent = {};
  const pendingChanges = new Map();
  let isEditModeActive = false;

  // Undo / Redo Stacks (Cap at 50 mutations)
  const MAX_STACK = 50;
  const undoStack = [];
  const redoStack = [];

  // Verified Complete Clinic Defaults
  const DEFAULT_CLINIC_SERVICES = [
    'দাঁতের সাধারণ চিকিৎসা ও চেকআপ',
    'রুট ক্যানাল চিকিৎসা (RCT)',
    'দাঁত পরিষ্কার ও স্কেলিং',
    'দাঁতের ফিলিং ও রেস্টোরেশন',
    'দাঁত তোলা ও এক্সট্রাকশন',
    'দাঁতের ক্যাপ ও ক্রাউন',
    'ডেন্টাল ব্রিজ ও দাঁত প্রতিস্থাপন',
    'মাড়ির চিকিৎসা (Gums Care)',
    'শিশুদের দাঁতের যত্ন',
    'ওরাল মাইনর সার্জারি',
    'দাঁতের সৌন্দর্যবর্ধন (Smile Design)',
    'ডিজিটাল এক্স-রে ও ডায়াগনস্টিক',
    'অন্যান্য (Other)'
  ];

  const DEFAULT_CLINIC_SCHEDULES = [
    'সকাল (১০:০০টা - ০১:০০টা)',
    'বিকাল (০৪:০০টা - ০৬:০০টা)',
    'সন্ধ্যা (০৬:০০টা - ০৯:০০টা)'
  ];

  // Existing Clinic Gallery Presets
  const GALLERY_PRESETS = [
    { label: 'ক্লিনিক লোগো', src: 'lucky_image/logo_main.jpg' },
    { label: 'ক্লিনিক ফ্রন্ট ভিউ', src: 'lucky_image/image_front.jpg' },
    { label: 'ডাঃ মোঃ জোসেফ বিশ্বাস রকি', src: 'lucky_image/dr_rocky_portrait.jpg' },
    { label: 'অত্যাধুনিক ডেন্টাল চেয়ার ১', src: 'lucky_image/image_02.jpg' },
    { label: 'ডেন্টাল কনসাল্টেশন জোন', src: 'lucky_image/image_03.jpg' },
    { label: 'আধুনিক চিকিৎসা চেম্বার', src: 'lucky_image/image_04.jpg' },
    { label: 'স্টেরিলাইজেশন অটোক্লেভ', src: 'lucky_image/image_05.jpg' },
    { label: 'ডিজিটাল ডেন্টাল ডায়াগনস্টিক', src: 'lucky_image/image_06.jpg' },
    { label: 'রুট ক্যানাল চিকিৎসা', src: 'lucky_image/root_canal.jpg' },
    { label: 'স্কেলিং ও পলিশিং', src: 'lucky_image/scaling_polishing.jpg' },
    { label: 'দাঁতের ফিলিং', src: 'lucky_image/dental_filling.jpg' },
    { label: 'ক্যাপ ও ক্রাউন', src: 'lucky_image/crown_bridge.jpg' }
  ];

  function getPageId() {
    const raw = window.location.pathname.split('/').pop() || 'index.html';
    return raw.replace('.html', '').toLowerCase() || 'home';
  }

  // Resilient API Requester with automatic fallback
  async function apiFetch(endpoint, options = {}) {
    if (typeof window.fetchWithBackendFallback === 'function') {
      return window.fetchWithBackendFallback(endpoint, options);
    }
    const apiBase = window.LUCKY_API_BASE_URL || 'http://localhost:5000';
    const clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    return fetch(`${apiBase}${clean}`, options);
  }

  // --------------------------------------------------------------------------
  // 1. DETERMINISTIC CONTENT KEY ASSIGNMENT & PUBLIC HYDRATION
  // --------------------------------------------------------------------------
  function isCmsExcluded(el) {
    if (!el) return true;
    return !!el.closest(
      '#cmsFloatingDock, .cms-floating-dock, .cms-modal-backdrop, .cms-modal-box, .cms-modal-card, ' +
      '#luckyHistoryDrawer, .cms-history-drawer, #luckyToastContainer, .cms-editor-popover, ' +
      '.cms-change-img-btn, #cmsImagePickerModal, #luckyAdminLoginBackdrop, #luckyDropdownManagerModal, ' +
      'script, style, noscript, svg, iframe'
    );
  }

  function assignContentKeys() {
    const pageId = getPageId();
    let textIdx = 1;
    let imgIdx = 1;

    const targetTags = new Set([
      'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
      'A', 'LI', 'BUTTON', 'LABEL', 'TH', 'TD',
      'STRONG', 'EM', 'B', 'I'
    ]);

    document.body.querySelectorAll('*').forEach((el) => {
      if (isCmsExcluded(el)) return;

      const tag = el.tagName;
      const isTarget = targetTags.has(tag) ||
        Array.from(el.classList).some(c => c.startsWith('btn-') || c.startsWith('section-') || c.startsWith('hero-') || c.startsWith('brand-')) ||
        el.classList.contains('form-label');

      if (isTarget) {
        const hasDirectText = Array.from(el.childNodes).some(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
        );
        if (hasDirectText && !el.getAttribute('data-cms-key')) {
          const autoKey = `${pageId}_${tag.toLowerCase()}_${textIdx++}`;
          el.setAttribute('data-cms-auto-key', autoKey);
          el.setAttribute('data-cms-key', autoKey);
        }
      }

      if (tag === 'IMG' && !el.getAttribute('data-cms-img')) {
        const autoKey = `${pageId}_img_${imgIdx++}`;
        el.setAttribute('data-cms-auto-key', autoKey);
        el.setAttribute('data-cms-img', autoKey);
      }
    });
  }

  async function hydratePublicContent() {
    try {
      assignContentKeys();
      const res = await apiFetch('/api/site-content', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.content) {
        currentContent = data.content;
        applyContentToDOM(currentContent);
      }
    } catch (err) {
      // Graceful fallback to bundled static content
    }
  }

  function getElementPureText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.cms-key-badge, .cms-change-img-btn, script, style, i, svg').forEach(n => n.remove());
    return clone.textContent.trim();
  }

  function setElementTextPreservingIcons(node, newText) {
    if (!node || newText === undefined || newText === null) return;
    const clean = String(newText).trim();

    // Check if node has children like <i> or <svg>
    const icons = Array.from(node.querySelectorAll('i, svg'));
    if (icons.length === 0) {
      const badge = node.querySelector('.cms-key-badge');
      if (badge) badge.remove();
      node.textContent = clean;
      return;
    }

    // Has icons: preserve them and update direct text node
    const textNodes = Array.from(node.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
    );

    if (textNodes.length > 0) {
      textNodes[0].textContent = ' ' + clean;
      for (let i = 1; i < textNodes.length; i++) {
        textNodes[i].textContent = '';
      }
    } else {
      node.appendChild(document.createTextNode(' ' + clean));
    }
  }

  function applyContentToDOM(contentMap) {
    if (!contentMap || typeof contentMap !== 'object') return;

    // 1. Text elements
    document.querySelectorAll('[data-cms-key], [data-cms-auto-key]').forEach((node) => {
      const key = node.getAttribute('data-cms-key') || node.getAttribute('data-cms-auto-key');
      if (key && contentMap[key] !== undefined) {
        setElementTextPreservingIcons(node, contentMap[key]);
      }
    });

    // 2. Images & Backgrounds
    document.querySelectorAll('[data-cms-img]').forEach((img) => {
      const key = img.getAttribute('data-cms-img');
      if (key && contentMap[key]) {
        if (img.tagName === 'IMG') {
          img.setAttribute('src', contentMap[key]);
        } else {
          img.style.backgroundImage = `url('${contentMap[key]}')`;
        }
      }
    });

    // 3. Link Hrefs
    document.querySelectorAll('[data-cms-href]').forEach((link) => {
      const key = link.getAttribute('data-cms-href');
      if (key && contentMap[key]) {
        link.setAttribute('href', contentMap[key]);
      }
    });

    // 4. Input Placeholders & Values
    const pageId = getPageId();
    Object.keys(contentMap).forEach((key) => {
      if (key.startsWith(pageId + '.') && key.endsWith('.placeholder')) {
        const fieldId = key.replace(pageId + '.', '').replace('.placeholder', '');
        const el = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
        if (el) el.placeholder = contentMap[key];
      } else if (key.startsWith(pageId + '.') && key.endsWith('.value')) {
        const fieldId = key.replace(pageId + '.', '').replace('.value', '');
        const el = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
        if (el) el.value = contentMap[key];
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. VIEWPORT-CENTERED LOGIN MODAL
  // --------------------------------------------------------------------------
  function openAdminLoginModal() {
    const backdropId = 'luckyAdminLoginBackdrop';
    let backdrop = document.getElementById(backdropId);
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = backdropId;
      backdrop.className = 'cms-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    backdrop.innerHTML = `
      <div class="cms-modal-card">
        <div class="cms-auth-header">
          <div class="cms-auth-logo-badge">
            <i class="fas fa-key"></i>
          </div>
          <div class="cms-auth-title-group">
            <h3>অ্যাডমিন প্রবেশাধিকার</h3>
            <span>Lucky Dental Care — কন্ট্রোল প্যানেল</span>
          </div>
        </div>
        <form id="cmsLoginForm">
          <div class="cms-form-group">
            <label for="cmsAdminPassword">অ্যাডমিন পাসওয়ার্ড</label>
            <div class="cms-input-wrapper">
              <input 
                type="password" 
                id="cmsAdminPassword" 
                class="cms-input" 
                placeholder="পাসওয়ার্ড প্রদান করুন..." 
                required 
                autocomplete="current-password"
                style="padding-right: 42px;"
              >
              <button type="button" class="cms-password-toggle" id="cmsPasswordToggleBtn" title="পাসওয়ার্ড দেখুন">
                <i class="far fa-eye" id="cmsPasswordEyeIcon"></i>
              </button>
            </div>
          </div>
          <div id="cmsLoginError" class="cms-error-msg" style="display:none;"></div>
          <div class="cms-card-actions">
            <button type="button" class="btn-cms-secondary" id="cmsLoginCancelBtn">বাতিল</button>
            <button type="submit" class="btn-cms-primary" id="cmsLoginSubmitBtn">
              <i class="fas fa-sign-in-alt"></i> প্রবেশ করুন
            </button>
          </div>
        </form>
      </div>
    `;

    const pwdInput = document.getElementById('cmsAdminPassword');
    const toggleBtn = document.getElementById('cmsPasswordToggleBtn');
    const eyeIcon = document.getElementById('cmsPasswordEyeIcon');

    toggleBtn?.addEventListener('click', () => {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        eyeIcon.className = 'far fa-eye-slash';
      } else {
        pwdInput.type = 'password';
        eyeIcon.className = 'far fa-eye';
      }
    });

    const closeLogin = () => backdrop.classList.remove('active');
    document.getElementById('cmsLoginCancelBtn')?.addEventListener('click', closeLogin);

    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeLogin();
    };

    backdrop.classList.add('active');
    setTimeout(() => pwdInput?.focus(), 100);

    const form = document.getElementById('cmsLoginForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = pwdInput.value;
      const errorBox = document.getElementById('cmsLoginError');
      const submitBtn = document.getElementById('cmsLoginSubmitBtn');

      errorBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> যাচাই করা হচ্ছে...';

      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: 'admin@luckydental.com', password })
        });

        let data = {};
        try {
          data = await res.json();
        } catch (jsonErr) {
          data = {};
        }

        if (res.ok) {
          if (data.token && window.LuckyAuth) {
            window.LuckyAuth.setToken(data.token);
          }
          closeLogin();
          enableEditMode();
          if (window.showToast) window.showToast('অ্যাডমিন সম্পাদনা মোড সক্রিয় হয়েছে!', 'success');
        } else {
          const safeMsg = (window.toSafeErrorMessage && window.toSafeErrorMessage(data.error)) || 'লগইন তথ্য সঠিক নয়। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
          errorBox.textContent = safeMsg;
          errorBox.style.display = 'flex';
          pwdInput.focus();
        }
      } catch (err) {
        errorBox.textContent = 'সার্ভারের সাথে এই মুহূর্তে যোগাযোগ করা যাচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।';
        errorBox.style.display = 'flex';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> প্রবেশ করুন';
      }
    });
  }

  // --------------------------------------------------------------------------
  // 3. UNDO / REDO ENGINE & MUTATION STACKS
  // --------------------------------------------------------------------------
  function pushMutation(mutation) {
    undoStack.push(mutation);
    if (undoStack.length > MAX_STACK) undoStack.shift();
    redoStack.length = 0;
    updateDockUI();
  }

  function undo() {
    if (undoStack.length === 0) return;
    const mutation = undoStack.pop();
    redoStack.push(mutation);

    applyMutationValue(mutation, mutation.previousValue);
    updateDockUI();
    if (window.showToast) window.showToast('আনডু করা হয়েছে', 'info');
  }

  function redo() {
    if (redoStack.length === 0) return;
    const mutation = redoStack.pop();
    undoStack.push(mutation);

    applyMutationValue(mutation, mutation.newValue);
    updateDockUI();
    if (window.showToast) window.showToast('রিডু করা হয়েছে', 'info');
  }

  function applyMutationValue(mutation, val) {
    const { key, targetEl, type } = mutation;
    if (!targetEl) return;

    if (type === 'text') {
      setElementTextPreservingIcons(targetEl, val);
      pendingChanges.set(key, val);
    } else if (type === 'image') {
      if (targetEl.tagName === 'IMG') {
        targetEl.src = val;
      } else {
        targetEl.style.backgroundImage = `url('${val}')`;
      }
      pendingChanges.set(key, val);
    } else if (type === 'placeholder') {
      targetEl.placeholder = val;
      targetEl.setAttribute('placeholder', val);
      pendingChanges.set(key, val);
    } else if (type === 'value') {
      targetEl.value = val;
      targetEl.setAttribute('value', val);
      pendingChanges.set(key, val);
    }
  }

  // --------------------------------------------------------------------------
  // 4. UNIVERSAL DOM RECURSIVE DISCOVERY ENGINE
  // --------------------------------------------------------------------------
  function attachBadge(el, key) {
    if (!el || !key) return;
    el.setAttribute('data-cms-key', key);
    const legacy = el.querySelector('.cms-key-badge');
    if (legacy) legacy.remove();
  }

  function attachTextListeners(el, key) {
    if (el._cmsListenersAttached) return;
    el._cmsListenersAttached = true;

    el.addEventListener('focus', function () {
      el.dataset.cmsFocusText = getElementPureText(el);
    });

    let inputTimer = null;
    el.addEventListener('input', function () {
      const cur = getElementPureText(el);
      pendingChanges.set(key, cur);
      updateDockUI();

      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => {
        const prev = el.dataset.cmsFocusText || '';
        if (cur !== prev) {
          pushMutation({
            key,
            targetEl: el,
            previousValue: prev,
            newValue: cur,
            type: 'text'
          });
          el.dataset.cmsFocusText = cur;
        }
      }, 400);
    });

    el.addEventListener('blur', function () {
      clearTimeout(inputTimer);
      const prev = el.dataset.cmsFocusText || '';
      const cur = getElementPureText(el);
      if (cur !== prev) {
        pushMutation({
          key,
          targetEl: el,
          previousValue: prev,
          newValue: cur,
          type: 'text'
        });
        el.dataset.cmsFocusText = cur;
        pendingChanges.set(key, cur);
        updateDockUI();
      }
    });
  }

  function makeAllTextNodesEditable() {
    assignContentKeys();
    const pageId = getPageId();
    let autoCounter = 1;

    const targetTags = new Set([
      'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
      'A', 'LI', 'BUTTON', 'LABEL', 'TH', 'TD',
      'STRONG', 'EM', 'B', 'I'
    ]);

    document.body.querySelectorAll('*').forEach((el) => {
      if (isCmsExcluded(el)) return;

      const tag = el.tagName;
      const isTargetTag = targetTags.has(tag) ||
        Array.from(el.classList).some(c => c.startsWith('btn-') || c.startsWith('section-') || c.startsWith('hero-') || c.startsWith('brand-')) ||
        el.classList.contains('form-label');

      if (!isTargetTag && !el.hasAttribute('data-cms-key')) return;

      const hasDirectText = Array.from(el.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
      );

      if (hasDirectText) {
        let key = el.getAttribute('data-cms-key') || el.getAttribute('data-cms-auto-key');
        if (!key) {
          key = `${pageId}_${tag.toLowerCase()}_${autoCounter++}`;
          el.setAttribute('data-cms-auto-key', key);
          el.setAttribute('data-cms-key', key);
        }

        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
        el.classList.add('cms-editable-active');

        // Protect inner icons & badges from text mangling
        el.querySelectorAll('i, svg, .cms-key-badge').forEach((child) => {
          child.setAttribute('contenteditable', 'false');
        });

        attachBadge(el, key);
        attachTextListeners(el, key);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 5. INPUT PLACEHOLDER & VALUE MINI-EDITOR POPOVER
  // --------------------------------------------------------------------------
  function attachInputPlaceholderTriggers() {
    const inputs = document.querySelectorAll('input:not([type="submit"]):not([type="button"]):not([type="hidden"]), textarea');
    inputs.forEach((input) => {
      if (isCmsExcluded(input)) return;
      if (input._cmsInputTriggerAttached) return;
      input._cmsInputTriggerAttached = true;

      const handlePopoverOpen = (e) => {
        if (!isEditModeActive) return;
        e.preventDefault();
        e.stopPropagation();
        openInputEditorPopover(input);
      };

      input.addEventListener('contextmenu', handlePopoverOpen);
      input.addEventListener('dblclick', handlePopoverOpen);
    });
  }

  function openInputEditorPopover(inputEl) {
    closeInputEditorPopover();

    const popover = document.createElement('div');
    popover.id = 'cmsInputEditorPopover';
    popover.className = 'cms-editor-popover';

    const pageId = getPageId();
    const fieldId = inputEl.id || inputEl.name || 'input_' + Math.floor(Math.random() * 1000);
    const placeholderKey = `${pageId}.${fieldId}.placeholder`;
    const valueKey = `${pageId}.${fieldId}.value`;

    const initialPlaceholder = inputEl.getAttribute('placeholder') || inputEl.placeholder || '';
    const initialValue = inputEl.value || '';

    popover.innerHTML = `
      <div class="cms-popover-header">
        <span><i class="fas fa-edit"></i> ইনপুট ফিল্ড সম্পাদনা</span>
        <button type="button" class="cms-popover-close" id="cmsPopoverCloseBtn">&times;</button>
      </div>
      <div class="cms-popover-body">
        <label>প্লেসহোল্ডার টেক্সট (Placeholder):</label>
        <input type="text" class="cms-popover-input" id="cmsPopoverPlaceholderInput" value="${initialPlaceholder}">
        
        <label>ডিফল্ট মান (Default Value):</label>
        <input type="text" class="cms-popover-input" id="cmsPopoverValueInput" value="${initialValue}">
      </div>
      <div class="cms-popover-footer">
        <button type="button" class="btn-cms-secondary btn-cms-sm" id="cmsPopoverCancelBtn">বাতিল</button>
        <button type="button" class="btn-cms-primary btn-cms-sm" id="cmsPopoverSaveBtn">প্রয়োগ করুন</button>
      </div>
    `;

    document.body.appendChild(popover);

    const rect = inputEl.getBoundingClientRect();
    const top = window.scrollY + rect.bottom + 6;
    const left = Math.min(window.scrollX + rect.left, window.innerWidth - 340);
    popover.style.top = `${top}px`;
    popover.style.left = `${Math.max(10, left)}px`;

    document.getElementById('cmsPopoverCloseBtn')?.addEventListener('click', closeInputEditorPopover);
    document.getElementById('cmsPopoverCancelBtn')?.addEventListener('click', closeInputEditorPopover);

    document.getElementById('cmsPopoverSaveBtn')?.addEventListener('click', () => {
      const newPlaceholder = (document.getElementById('cmsPopoverPlaceholderInput')?.value || '').trim();
      const newValue = (document.getElementById('cmsPopoverValueInput')?.value || '').trim();

      if (newPlaceholder !== initialPlaceholder) {
        pushMutation({
          key: placeholderKey,
          targetEl: inputEl,
          previousValue: initialPlaceholder,
          newValue: newPlaceholder,
          type: 'placeholder'
        });
        inputEl.placeholder = newPlaceholder;
        inputEl.setAttribute('placeholder', newPlaceholder);
        pendingChanges.set(placeholderKey, newPlaceholder);
      }

      if (newValue !== initialValue) {
        pushMutation({
          key: valueKey,
          targetEl: inputEl,
          previousValue: initialValue,
          newValue: newValue,
          type: 'value'
        });
        inputEl.value = newValue;
        inputEl.setAttribute('value', newValue);
        pendingChanges.set(valueKey, newValue);
      }

      updateDockUI();
      closeInputEditorPopover();
      if (window.showToast) window.showToast('ইনপুট ফিল্ড সফলভাবে হালনাগাদ করা হয়েছে!', 'success');
    });
  }

  function closeInputEditorPopover() {
    const pop = document.getElementById('cmsInputEditorPopover');
    if (pop) pop.remove();
  }

  // --------------------------------------------------------------------------
  // 6. IMAGE & CSS BACKGROUND REPLACEMENT
  // --------------------------------------------------------------------------
  function attachImageEditTriggers() {
    const pageId = getPageId();
    let imgIdx = 1;

    // 1. Regular <img> tags
    const images = document.querySelectorAll('img, [data-cms-img]');
    images.forEach((img) => {
      if (isCmsExcluded(img)) return;

      const parent = img.parentElement;
      if (!parent || parent.querySelector('.cms-change-img-btn')) return;

      parent.classList.add('cms-img-container-relative');

      let key = img.getAttribute('data-cms-img') || img.getAttribute('data-cms-auto-key');
      if (!key) {
        key = `${pageId}_img_${imgIdx++}`;
        img.setAttribute('data-cms-img', key);
        img.setAttribute('data-cms-auto-key', key);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cms-change-img-btn';
      btn.innerHTML = '<i class="fas fa-camera"></i> ছবি পরিবর্তন';
      btn.title = 'ছবি প্রতিস্থাপন করুন';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openImageReplacementModal(img, key);
      });

      parent.appendChild(btn);
    });

    // 2. Elements with CSS background-image
    document.querySelectorAll('.page-hero, .hero-section, .banner-section').forEach((bgEl) => {
      if (isCmsExcluded(bgEl)) return;
      if (bgEl.querySelector('.cms-change-img-btn')) return;

      bgEl.classList.add('cms-img-container-relative');
      const key = `${pageId}_bg_${bgEl.className.split(' ')[0]}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cms-change-img-btn';
      btn.innerHTML = '<i class="fas fa-camera"></i> ব্যাকগ্রাউন্ড পরিবর্তন';
      btn.title = 'ব্যাকগ্রাউন্ড ছবি প্রতিস্থাপন করুন';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openImageReplacementModal(bgEl, key);
      });

      bgEl.appendChild(btn);
    });
  }

  function openImageReplacementModal(targetEl, key) {
    const modalId = 'luckyImagePickerModal';
    let backdrop = document.getElementById(modalId);
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = modalId;
      backdrop.className = 'cms-modal-backdrop cms-img-picker-modal';
      document.body.appendChild(backdrop);
    }

    const currentSrc = targetEl.tagName === 'IMG'
      ? (targetEl.getAttribute('src') || '')
      : (targetEl.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1') || '');

    backdrop.innerHTML = `
      <div class="cms-modal-box" style="max-width: 580px;">
        <div style="background: #0f172a; color: #fff; padding: 16px 22px; display: flex; align-items: center; justify-content: space-between;">
          <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-camera"></i> ছবি প্রতিস্থাপন (${key})
          </h3>
          <button type="button" class="cms-history-close-btn" id="cmsImgPickerCloseBtn">&times;</button>
        </div>

        <div style="padding: 20px;">
          <div class="cms-tab-nav">
            <button type="button" class="cms-tab-btn active" id="tabUploadBtn"><i class="fas fa-cloud-upload-alt"></i> লোকাল আপলোড</button>
            <button type="button" class="cms-tab-btn" id="tabUrlBtn"><i class="fas fa-link"></i> ছবির লিঙ্ক (URL)</button>
            <button type="button" class="cms-tab-btn" id="tabGalleryBtn"><i class="fas fa-images"></i> গ্যালারি প্রিসেট</button>
          </div>

          <div id="tabUploadContent">
            <div style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 30px; text-align: center; background: #f8fafc; cursor: pointer;" id="cmsDropzone">
              <i class="fas fa-file-image" style="font-size: 2.4rem; color: #94a3b8; margin-bottom: 12px; display: block;"></i>
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">কম্পিউটার থেকে ছবি আপলোড করতে ক্লিক করুন</p>
              <span style="font-size: 0.8rem; color: #64748b;">(সাপোর্টেড: JPG, PNG, WEBP — সর্বোচ্চ 5MB)</span>
              <input type="file" id="cmsFileInput" accept="image/*" style="display:none;">
            </div>
            <div id="cmsUploadStatus" style="margin-top: 12px; font-size: 0.88rem; display: none;"></div>
          </div>

          <div id="tabUrlContent" style="display: none;">
            <div class="cms-form-group">
              <label>ছবির পূর্ণাঙ্গ লিঙ্ক বা পাথ লিখুন:</label>
              <input type="text" id="cmsImgUrlInput" class="cms-input" value="${currentSrc}" placeholder="যেমন: lucky_image/image_front.jpg বা https://...">
            </div>
            <div style="text-align: center; margin-top: 12px; max-height: 160px; overflow: hidden; border-radius: 8px; border: 1px solid #e2e8f0;">
              <img id="cmsUrlPreview" src="${currentSrc}" alt="Preview" style="max-height: 160px; object-fit: contain;">
            </div>
          </div>

          <div id="tabGalleryContent" style="display: none;">
            <p style="font-size: 0.85rem; color: #64748b; margin-top: 0;">ক্লিনিকের পূর্বনির্ধারিত ছবি নির্বাচন করুন:</p>
            <div class="cms-gallery-grid" id="cmsGalleryContainer"></div>
          </div>
        </div>

        <div style="padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn-cms-secondary" id="cmsImgCancelBtn">বাতিল</button>
          <button type="button" class="btn-cms-primary" id="cmsImgApplyBtn">
            <i class="fas fa-check"></i> প্রয়োগ করুন
          </button>
        </div>
      </div>
    `;

    const closePicker = () => backdrop.classList.remove('active');
    document.getElementById('cmsImgPickerCloseBtn')?.addEventListener('click', closePicker);
    document.getElementById('cmsImgCancelBtn')?.addEventListener('click', closePicker);

    const tabUploadBtn = document.getElementById('tabUploadBtn');
    const tabUrlBtn = document.getElementById('tabUrlBtn');
    const tabGalleryBtn = document.getElementById('tabGalleryBtn');
    const tabUploadContent = document.getElementById('tabUploadContent');
    const tabUrlContent = document.getElementById('tabUrlContent');
    const tabGalleryContent = document.getElementById('tabGalleryContent');

    let selectedImgSrc = currentSrc;

    tabUploadBtn?.addEventListener('click', () => {
      tabUploadBtn.classList.add('active');
      tabUrlBtn.classList.remove('active');
      tabGalleryBtn.classList.remove('active');
      tabUploadContent.style.display = 'block';
      tabUrlContent.style.display = 'none';
      tabGalleryContent.style.display = 'none';
    });

    tabUrlBtn?.addEventListener('click', () => {
      tabUrlBtn.classList.add('active');
      tabUploadBtn.classList.remove('active');
      tabGalleryBtn.classList.remove('active');
      tabUrlContent.style.display = 'block';
      tabUploadContent.style.display = 'none';
      tabGalleryContent.style.display = 'none';
    });

    tabGalleryBtn?.addEventListener('click', () => {
      tabGalleryBtn.classList.add('active');
      tabUploadBtn.classList.remove('active');
      tabUrlBtn.classList.remove('active');
      tabGalleryContent.style.display = 'block';
      tabUploadContent.style.display = 'none';
      tabUrlContent.style.display = 'none';
    });

    const galleryContainer = document.getElementById('cmsGalleryContainer');
    if (galleryContainer) {
      GALLERY_PRESETS.forEach((preset) => {
        const thumb = document.createElement('div');
        thumb.className = `cms-gallery-thumb ${preset.src === currentSrc ? 'selected' : ''}`;
        thumb.innerHTML = `<img src="${preset.src}" alt="${preset.label}" title="${preset.label}">`;
        thumb.addEventListener('click', () => {
          galleryContainer.querySelectorAll('.cms-gallery-thumb').forEach(t => t.classList.remove('selected'));
          thumb.classList.add('selected');
          selectedImgSrc = preset.src;
        });
        galleryContainer.appendChild(thumb);
      });
    }

    const urlInput = document.getElementById('cmsImgUrlInput');
    const urlPreview = document.getElementById('cmsUrlPreview');
    urlInput?.addEventListener('input', () => {
      selectedImgSrc = urlInput.value.trim();
      if (urlPreview) urlPreview.src = selectedImgSrc;
    });

    const dropzone = document.getElementById('cmsDropzone');
    const fileInput = document.getElementById('cmsFileInput');
    const uploadStatus = document.getElementById('cmsUploadStatus');

    dropzone?.addEventListener('click', () => fileInput.click());

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      uploadStatus.style.display = 'block';
      uploadStatus.innerHTML = '<span style="color:#0284c7;"><i class="fas fa-spinner fa-spin"></i> ছবি আপলোড ও অপ্টিমাইজ হচ্ছে...</span>';

      const formData = new FormData();
      formData.append('image', file);

      try {
        const token = window.LuckyAuth?.getToken();
        const res = await apiFetch('/api/admin/upload-image', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          credentials: 'include',
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.url) {
          selectedImgSrc = data.url;
          uploadStatus.innerHTML = '<span style="color:#16a34a;"><i class="fas fa-check-circle"></i> সফলভাবে আপলোড সম্পন্ন হয়েছে!</span>';
        } else {
          const errText = window.toSafeErrorMessage ? window.toSafeErrorMessage(data.error, 'আপলোড সম্পন্ন করা যায়নি') : 'আপলোড সম্পন্ন করা যায়নি';
          uploadStatus.innerHTML = `<span style="color:#dc2626;"><i class="fas fa-exclamation-triangle"></i> ${errText}</span>`;
        }
      } catch (err) {
        uploadStatus.innerHTML = '<span style="color:#dc2626;"><i class="fas fa-exclamation-triangle"></i> সার্ভার সংযোগে সমস্যা হয়েছে</span>';
      }
    });

    document.getElementById('cmsImgApplyBtn')?.addEventListener('click', () => {
      if (selectedImgSrc && selectedImgSrc !== currentSrc) {
        pushMutation({
          key,
          targetEl,
          previousValue: currentSrc,
          newValue: selectedImgSrc,
          type: 'image'
        });

        if (targetEl.tagName === 'IMG') {
          targetEl.setAttribute('src', selectedImgSrc);
        } else {
          targetEl.style.backgroundImage = `url('${selectedImgSrc}')`;
        }

        pendingChanges.set(key, selectedImgSrc);
        updateDockUI();
        if (window.showToast) window.showToast('ছবি সফলভাবে পরিবর্তন করা হয়েছে', 'success');
      }
      closePicker();
    });

    backdrop.classList.add('active');
  }

  // --------------------------------------------------------------------------
  // 7. EDIT MODE TOGGLE & NAVIGATION LOCKOUT INTERCEPTOR
  // --------------------------------------------------------------------------
  function preventNavigationInEditMode(e) {
    if (!isEditModeActive) return;

    if (e.target.closest(
      '#cmsFloatingDock, .cms-floating-dock, .cms-modal-backdrop, .cms-modal-card, .cms-modal-box, ' +
      '.cms-editor-popover, #luckyHistoryDrawer, .cms-history-drawer, .cms-change-img-btn, ' +
      '.cms-dropdown-gear-btn, #luckyToastContainer, .cms-key-badge, .cms-opt-manager-modal, .cms-img-picker-modal'
    )) {
      return;
    }

    const link = e.target.closest('a');
    const submitBtn = e.target.closest('button[type="submit"], input[type="submit"]');

    if (link) {
      e.preventDefault();
      e.stopPropagation();
      link.focus();
    }

    if (submitBtn) {
      e.preventDefault();
      e.stopPropagation();
      submitBtn.focus();
    }
  }

  function preventSubmitInEditMode(e) {
    if (!isEditModeActive) return;
    if (e.target.closest('#cmsLoginForm')) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function enableEditMode() {
    isEditModeActive = true;
    document.body.classList.add('cms-edit-mode-active');

    mountFloatingDock();
    makeAllTextNodesEditable();
    attachImageEditTriggers();
    attachInputPlaceholderTriggers();

    if (window.LuckyEstimator && typeof window.LuckyEstimator.refresh === 'function') {
      window.LuckyEstimator.refresh();
    }

    updateDockUI();
  }

  function disableEditMode() {
    isEditModeActive = false;
    document.body.classList.remove('cms-edit-mode-active');

    document.querySelectorAll('[contenteditable="true"]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      el.classList.remove('cms-editable-active');
      const badge = el.querySelector('.cms-key-badge');
      if (badge) badge.remove();
    });

    document.querySelectorAll('.cms-change-img-btn').forEach((btn) => btn.remove());
    closeInputEditorPopover();

    const dock = document.getElementById('cmsFloatingDock');
    if (dock) dock.remove();

    closeHistoryDrawer();

    if (window.LuckyEstimator && typeof window.LuckyEstimator.refresh === 'function') {
      window.LuckyEstimator.refresh();
    }
  }

  // --------------------------------------------------------------------------
  // 8. SLEEK FLOATING BOTTOM ADMIN DOCK
  // --------------------------------------------------------------------------
  function mountFloatingDock() {
    let dock = document.getElementById('cmsFloatingDock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'cmsFloatingDock';
      dock.className = 'cms-floating-dock';
      dock.innerHTML = `
        <button type="button" class="cms-dock-btn" id="cmsDockUndoBtn" title="পূর্বের পরিবর্তন বাতিল (Ctrl+Z)" disabled>
          <i class="fas fa-undo"></i> <span>আনডু</span>
        </button>
        <button type="button" class="cms-dock-btn" id="cmsDockRedoBtn" title="বাতিলকৃত পরিবর্তন ফেরান (Ctrl+Y)" disabled>
          <i class="fas fa-redo"></i> <span>রিডু</span>
        </button>
        <div class="cms-dock-divider"></div>
        <button type="button" class="cms-dock-btn" id="cmsDockHistoryBtn" title="পূর্বের সংস্করণ তালিকা ও রোলব্যাক">
          <i class="fas fa-history"></i> <span>সংস্করণ ইতিহাস</span>
        </button>
        <div class="cms-dock-divider"></div>
        <button type="button" class="cms-dock-btn cms-dock-save-btn" id="cmsDockSaveBtn" disabled>
          <i class="fas fa-save"></i> <span>সংরক্ষণ করুন</span>
          <span class="cms-dock-badge-count" id="cmsDockUnsavedCount" style="display:none;">0</span>
        </button>
        <button type="button" class="cms-dock-btn cms-dock-exit-btn" id="cmsDockExitBtn" title="সম্পাদনা মোড থেকে প্রস্থান">
          <i class="fas fa-times"></i> <span>প্রস্থান</span>
        </button>
      `;
      document.body.appendChild(dock);

      document.getElementById('cmsDockUndoBtn')?.addEventListener('click', undo);
      document.getElementById('cmsDockRedoBtn')?.addEventListener('click', redo);
      document.getElementById('cmsDockHistoryBtn')?.addEventListener('click', openHistoryDrawer);
      document.getElementById('cmsDockSaveBtn')?.addEventListener('click', saveAllPendingChanges);
      document.getElementById('cmsDockExitBtn')?.addEventListener('click', handleAdminExit);
    }
  }

  function updateDockUI() {
    const undoBtn = document.getElementById('cmsDockUndoBtn');
    const redoBtn = document.getElementById('cmsDockRedoBtn');
    const saveBtn = document.getElementById('cmsDockSaveBtn');
    const badge = document.getElementById('cmsDockUnsavedCount');

    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;

    const count = pendingChanges.size;
    if (saveBtn) {
      saveBtn.disabled = count === 0;
    }
    if (badge) {
      if (count > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = window.toBengaliNumerals ? window.toBengaliNumerals(count) : count;
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // --------------------------------------------------------------------------
  // 9. PERSISTENCE: SAVE ALL PENDING CHANGES TO DATABASE
  // --------------------------------------------------------------------------
  async function saveAllPendingChanges() {
    if (pendingChanges.size === 0) return;

    const saveBtn = document.getElementById('cmsDockSaveBtn');
    const originalHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>সংরক্ষণ হচ্ছে...</span>';

    const payload = {};
    pendingChanges.forEach((val, key) => {
      payload[key] = val;
    });

    const token = window.LuckyAuth?.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await apiFetch('/api/admin/site-content/batch', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ items: payload })
      });

      const data = await res.json();

      if (res.ok) {
        pendingChanges.clear();
        updateDockUI();
        if (window.showToast) window.showToast('সকল পরিবর্তন স্থায়ীভাবে ডেটাবেজে সংরক্ষিত হয়েছে!', 'success');
      } else {
        const msg = window.toSafeErrorMessage ? window.toSafeErrorMessage(data.error, 'সংরক্ষণ ব্যর্থ হয়েছে') : 'সংরক্ষণ ব্যর্থ হয়েছে';
        alert(msg);
      }
    } catch (err) {
      alert('সার্ভারের সাথে এই মুহূর্তে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    } finally {
      saveBtn.disabled = pendingChanges.size === 0;
      saveBtn.innerHTML = originalHtml;
      updateDockUI();
    }
  }

  function handleAdminExit() {
    if (pendingChanges.size > 0) {
      const confirmExit = confirm(`আপনার ${pendingChanges.size}টি অসংরক্ষিত পরিবর্তন রয়েছে। আপনি কি নিশ্চিত যে সংরক্ষণ ছাড়াই প্রস্থান করতে চান?`);
      if (!confirmExit) return;
    }
    logoutAdmin();
  }

  function logoutAdmin() {
    if (window.LuckyAuth) window.LuckyAuth.clearToken();
    try {
      const apiBase = window.LUCKY_API_BASE_URL || 'http://localhost:5000';
      fetch(`${apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {}
    disableEditMode();
    if (window.showToast) window.showToast('সফলভাবে লগআউট হয়েছে', 'info');
  }

  // --------------------------------------------------------------------------
  // 10. VERSION HISTORY & ATOMIC ROLLBACK DRAWER
  // --------------------------------------------------------------------------
  function openHistoryDrawer() {
    let drawer = document.getElementById('luckyHistoryDrawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'luckyHistoryDrawer';
      drawer.className = 'cms-history-drawer';
      document.body.appendChild(drawer);
    }

    drawer.innerHTML = `
      <div class="cms-history-header">
        <h3><i class="fas fa-history"></i> সংস্করণ ইতিহাস (Version History)</h3>
        <button type="button" class="cms-history-close-btn" onclick="document.getElementById('luckyHistoryDrawer').classList.remove('open')">&times;</button>
      </div>
      <div class="cms-history-timeline" id="cmsHistoryTimeline">
        <div style="text-align: center; padding: 30px; color: #64748b;">
          <i class="fas fa-spinner fa-spin fa-2x"></i>
          <p style="margin-top: 10px;">ইতিহাস লোড হচ্ছে...</p>
        </div>
      </div>
    `;

    drawer.classList.add('open');
    fetchAndRenderHistory();
  }

  function closeHistoryDrawer() {
    const drawer = document.getElementById('luckyHistoryDrawer');
    if (drawer) drawer.classList.remove('open');
  }

  async function fetchAndRenderHistory() {
    const container = document.getElementById('cmsHistoryTimeline');
    if (!container) return;

    try {
      const token = window.LuckyAuth?.getToken();
      const res = await apiFetch('/api/admin/site-content/history', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });

      const data = await res.json();
      const history = data.history || [];

      if (history.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #64748b;">
            <i class="fas fa-info-circle fa-2x" style="color: #94a3b8; margin-bottom: 12px; display:block;"></i>
            <p>এখনো কোনো পূর্ববর্তী সংস্করণ সংরক্ষিত হয়নি। সম্পাদনা করে "সংরক্ষণ করুন" চাপলে ইতিহাস তৈরি হবে।</p>
          </div>
        `;
        return;
      }

      container.innerHTML = history.map((item) => {
        const dateObj = new Date(item.timestamp);
        const formattedDate = dateObj.toLocaleDateString('bn-BD', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const changeCount = item.changes ? item.changes.length : 0;
        const changeSummary = (item.changes || []).slice(0, 3).map(c => `• <code>${c.key}</code>`).join('<br>');

        return `
          <div class="cms-history-card">
            <div class="cms-history-meta">
              <strong>${item.updatedBy || 'অ্যাডমিন'}</strong>
              <span>${formattedDate}</span>
            </div>
            <div class="cms-history-changes">
              <span style="font-weight: 600; color: var(--brand-red);">${window.toBengaliNumerals ? window.toBengaliNumerals(changeCount) : changeCount}টি আইটেম পরিবর্তিত</span>
              <div style="margin-top: 6px; font-size: 0.8rem; color: #64748b;">${changeSummary}</div>
            </div>
            <button type="button" class="btn-cms-rollback" onclick="window.LuckyCMS.confirmRollback('${item.versionId}')">
              <i class="fas fa-undo-alt"></i> পূর্বের অবস্থায় ফেরত যান
            </button>
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = '<div style="color:#ef4444;text-align:center;padding:20px;">ইতিহাস লোড করা যায়নি।</div>';
    }
  }

  async function rollbackToVersion(versionId) {
    const doubleConfirm = confirm('সতর্কতা: আপনি কি নিশ্চিত যে এই সংস্করণে ওয়েবসাইটের সকল তথ্য রোলব্যাক করতে চান? বর্তমান অসংরক্ষিত সকল পরিবর্তন মুছে যাবে।');
    if (!doubleConfirm) return;

    try {
      const token = window.LuckyAuth?.getToken();
      const res = await apiFetch(`/api/admin/site-content/rollback/${versionId}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok && data.content) {
        currentContent = data.content;
        applyContentToDOM(currentContent);
        pendingChanges.clear();
        undoStack.length = 0;
        redoStack.length = 0;
        updateDockUI();
        closeHistoryDrawer();
        if (window.showToast) window.showToast('সংস্করণ সফলভাবে পুনর্বহাল করা হয়েছে!', 'success');
      } else {
        alert(data.error || 'রোলব্যাক সম্পন্ন করা যায়নি');
      }
    } catch (e) {
      alert('রোলব্যাক করতে সমস্যা হয়েছে।');
    }
  }

  // --------------------------------------------------------------------------
  // 11. DYNAMIC APPOINTMENT DROPDOWN MANAGER (Services & Shift Schedules)
  // --------------------------------------------------------------------------
  let cachedAppointmentOptions = { services: [], schedules: [] };

  async function openDropdownManager(type = 'services') {
    const modalId = 'luckyDropdownManagerModal';
    let backdrop = document.getElementById(modalId);
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = modalId;
      backdrop.className = 'cms-modal-backdrop cms-opt-manager-modal';
      document.body.appendChild(backdrop);
    }

    const isService = type === 'services';
    const title = isService ? 'প্রয়োজনীয় সেবার তালিকা ব্যবস্থাপনা' : 'পছন্দের সময়সূচি তালিকা ব্যবস্থাপনা';

    backdrop.innerHTML = `
      <div class="cms-modal-box" style="max-width: 600px;">
        <div style="background: #0f172a; color: #fff; padding: 16px 22px; display: flex; align-items: center; justify-content: space-between;">
          <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-tasks"></i> ${title}
          </h3>
          <button type="button" class="cms-history-close-btn" id="cmsOptCloseBtn">&times;</button>
        </div>

        <div style="padding: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 0.88rem; color: #64748b;">তালিকায় বিদ্যমান অপশনগুলো সম্পাদনা বা নতুন যোগ করুন:</span>
            <button type="button" class="btn-cms-secondary" id="cmsOptAddBtn" style="padding: 6px 12px; font-size: 0.82rem;">
              <i class="fas fa-plus"></i> নতুন যোগ করুন
            </button>
          </div>

          <div class="cms-opt-list" id="cmsOptListContainer">
            <div style="text-align:center;padding:20px;color:#64748b;"><i class="fas fa-spinner fa-spin"></i> অপশন লোড হচ্ছে...</div>
          </div>
        </div>

        <div style="padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn-cms-secondary" id="cmsOptCancelBtn">বাতিল</button>
          <button type="button" class="btn-cms-primary" id="cmsOptSaveBtn">
            <i class="fas fa-save"></i> ডেটাবেজে সংরক্ষণ করুন
          </button>
        </div>
      </div>
    `;

    const closeManager = () => backdrop.classList.remove('active');
    document.getElementById('cmsOptCloseBtn')?.addEventListener('click', closeManager);
    document.getElementById('cmsOptCancelBtn')?.addEventListener('click', closeManager);

    backdrop.classList.add('active');

    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 1200) : null;
      const res = await apiFetch('/api/appointment-options', {
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (res.ok) {
        cachedAppointmentOptions = await res.json();
      }
    } catch (e) {}

    const rawList = isService
      ? (cachedAppointmentOptions.services || [])
      : (cachedAppointmentOptions.schedules || []);

    let workingItems = rawList
      .map((it, idx) => {
        const text = typeof it === 'string' ? it : (it.name || it.label || it.title || it.value || '');
        return {
          id: (typeof it === 'object' && it.id) ? it.id : `opt-${Date.now()}-${idx}`,
          name: text,
          label: text,
          value: text,
          active: (typeof it === 'object' && it.active !== undefined) ? it.active : true,
          order: idx + 1
        };
      })
      .filter((it) => it.name && it.name !== 'undefined' && it.name !== 'null' && it.name.trim() !== '');

    if (workingItems.length === 0) {
      const defaults = isService ? DEFAULT_CLINIC_SERVICES : DEFAULT_CLINIC_SCHEDULES;
      workingItems = defaults.map((name, idx) => ({
        id: `opt-seed-${idx}`,
        name,
        label: name,
        value: name,
        active: true,
        order: idx + 1
      }));
    }

    const listContainer = document.getElementById('cmsOptListContainer');

    function renderItems() {
      if (!listContainer) return;
      if (workingItems.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center;padding:15px;color:#64748b;">কোনো অপশন নেই। নতুন যোগ করুন।</div>';
        return;
      }

      listContainer.innerHTML = workingItems.map((item, idx) => {
        const displayLabel = item.name || item.label || item.value || '';
        return `
        <div class="cms-opt-item" data-index="${idx}">
          <span style="color:#94a3b8;font-size:0.8rem;width:22px;">${idx + 1}.</span>
          <input type="text" class="cms-opt-label-input" value="${displayLabel}" placeholder="বাংলা নাম">
          <button type="button" class="cms-opt-up-btn" title="উপরে সরান" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}><i class="fas fa-arrow-up"></i></button>
          <button type="button" class="cms-opt-down-btn" title="নিচে সরান" ${idx === workingItems.length - 1 ? 'disabled style="opacity:0.3;"' : ''}><i class="fas fa-arrow-down"></i></button>
          <button type="button" class="cms-opt-del-btn" title="মুছে ফেলুন"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      }).join('');

      listContainer.querySelectorAll('.cms-opt-item').forEach((row) => {
        const idx = Number(row.getAttribute('data-index'));

        row.querySelector('.cms-opt-label-input')?.addEventListener('input', (e) => {
          const val = e.target.value;
          workingItems[idx].label = val;
          workingItems[idx].name = val;
          workingItems[idx].value = val;
        });

        row.querySelector('.cms-opt-up-btn')?.addEventListener('click', () => {
          if (idx > 0) {
            const temp = workingItems[idx];
            workingItems[idx] = workingItems[idx - 1];
            workingItems[idx - 1] = temp;
            renderItems();
          }
        });

        row.querySelector('.cms-opt-down-btn')?.addEventListener('click', () => {
          if (idx < workingItems.length - 1) {
            const temp = workingItems[idx];
            workingItems[idx] = workingItems[idx + 1];
            workingItems[idx + 1] = temp;
            renderItems();
          }
        });

        row.querySelector('.cms-opt-del-btn')?.addEventListener('click', () => {
          const itemNameToDelete = workingItems[idx].name || 'এই অপশনটি';
          if (confirm(`আপনি কি নিশ্চিত যে "${itemNameToDelete}" মুছে ফেলতে চান?`)) {
            workingItems.splice(idx, 1);
            renderItems();
          }
        });
      });
    }

    renderItems();

    document.getElementById('cmsOptAddBtn')?.addEventListener('click', () => {
      const defaultName = isService ? 'নতুন ডেন্টাল সেবা' : 'নতুন সময়সূচি (যেমন: রাত ০৮:০০টা)';
      workingItems.push({
        id: `opt-${Date.now()}`,
        name: defaultName,
        label: defaultName,
        value: defaultName,
        active: true,
        order: workingItems.length + 1
      });
      renderItems();
    });

    document.getElementById('cmsOptSaveBtn')?.addEventListener('click', async () => {
      const saveBtn = document.getElementById('cmsOptSaveBtn');
      const origHtml = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>সংরক্ষণ হচ্ছে...</span>';

      const normalizedItems = workingItems
        .map((it, i) => {
          const cleanName = String(it.name || it.label || it.value || '').trim();
          return {
            id: it.id || `opt-${Date.now()}-${i}`,
            name: cleanName,
            label: cleanName,
            value: cleanName,
            active: it.active !== false,
            order: i + 1
          };
        })
        .filter((it) => it.name && it.name !== 'undefined' && it.name !== 'null' && it.name.length > 0);

      const payload = {
        services: isService ? normalizedItems : (cachedAppointmentOptions.services || []),
        schedules: !isService ? normalizedItems : (cachedAppointmentOptions.schedules || [])
      };

      try {
        const token = window.LuckyAuth?.getToken();
        const res = await apiFetch('/api/admin/appointment-options', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          cachedAppointmentOptions = payload;
          if (typeof window.refreshAppointmentDropdowns === 'function') {
            window.refreshAppointmentDropdowns();
          }
          closeManager();
          if (window.showToast) window.showToast('তালিকা সফলভাবে ডেটাবেজে সংরক্ষিত হয়েছে!', 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = window.toSafeErrorMessage ? window.toSafeErrorMessage(errData.error, 'সংরক্ষণ ব্যর্থ হয়েছে') : 'সংরক্ষণ ব্যর্থ হয়েছে';
          alert(errMsg);
        }
      } catch (e) {
        alert('সার্ভারের সাথে এই মুহূর্তে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origHtml;
      }
    });
  }

  // --------------------------------------------------------------------------
  // 12. SHORTCUTS & EVENT LISTENERS
  // --------------------------------------------------------------------------
  function setupShortcutsAndTriggers() {
    // 1. Strict Capture-Phase Link & Form Lockout
    window.addEventListener('click', preventNavigationInEditMode, true);
    window.addEventListener('submit', preventSubmitInEditMode, true);

    // 2. Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Toggle Edit Mode: Ctrl + Shift + E
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        if (isEditModeActive) {
          disableEditMode();
        } else if (window.LuckyAuth?.isAuthenticated()) {
          enableEditMode();
        } else {
          openAdminLoginModal();
        }
        return;
      }

      // Undo & Redo while in Edit Mode
      if (isEditModeActive) {
        // Undo: Ctrl + Z
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          e.preventDefault();
          undo();
        }
        // Redo: Ctrl + Y OR Ctrl + Shift + Z
        else if (
          ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
        ) {
          e.preventDefault();
          redo();
        }
      }
    });

    // 3. Footer Discreet Admin Link "🔒 সম্পাদনা"
    document.querySelectorAll('.cms-admin-entry-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isEditModeActive) {
          disableEditMode();
        } else if (window.LuckyAuth?.isAuthenticated()) {
          enableEditMode();
        } else {
          openAdminLoginModal();
        }
      });
    });

    // 4. Auto-resume edit mode if admin session active
    if (window.LuckyAuth?.isAuthenticated()) {
      enableEditMode();
    }
  }

  // --------------------------------------------------------------------------
  // 13. PUBLIC API EXPOSURE
  // --------------------------------------------------------------------------
  window.LuckyCMS = {
    get isEditMode() {
      return isEditModeActive;
    },
    openLogin: openAdminLoginModal,
    enableEdit: enableEditMode,
    disableEdit: disableEditMode,
    refresh: hydratePublicContent,
    undo,
    redo,
    openHistory: openHistoryDrawer,
    confirmRollback: rollbackToVersion,
    openDropdownManager
  };

  // Bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      hydratePublicContent();
      setupShortcutsAndTriggers();
    });
  } else {
    hydratePublicContent();
    setupShortcutsAndTriggers();
  }
})();
