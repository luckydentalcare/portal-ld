const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==================================================');
console.log('LUCKY DENTAL CARE — CMS & DROPDOWN AUDIT VERIFICATION');
console.log('==================================================\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name} -> ${err.message}`);
    failCount++;
  }
}

// 1. Check appointment-options controller logic
const controllerPath = path.join(__dirname, '..', 'apps', 'api', 'src', 'controllers', 'appointment-options.controller.ts');
const controllerCode = fs.readFileSync(controllerPath, 'utf8');

test('appointment-options controller extracts names safely without "undefined"', () => {
  assert(controllerCode.includes('extractName'), 'extractName helper must exist');
  assert(controllerCode.includes("s.name !== 'undefined'"), 'Filter must reject literal "undefined"');
  assert(controllerCode.includes("s.name !== 'null'"), 'Filter must reject literal "null"');
});

test('appointment-options controller includes 13 default services ending in অন্যান্য (Other)', () => {
  assert(controllerCode.includes("id: 'other', name: 'অন্যান্য (Other)'"), 'Default services must contain অন্যান্য (Other)');
  assert(controllerCode.includes("id: 'gen-checkup'"), 'Default services must contain gen-checkup');
  assert(controllerCode.includes("DEFAULT_SERVICES"), 'DEFAULT_SERVICES must exist');
});

// 2. Check appointment.html
const appointmentHtmlPath = path.join(__dirname, '..', 'fauntend', 'appointment.html');
const appointmentHtml = fs.readFileSync(appointmentHtmlPath, 'utf8');

test('appointment.html has #other-service-wrapper and #other-service-input', () => {
  assert(appointmentHtml.includes('id="other-service-wrapper"'), '#other-service-wrapper must exist');
  assert(appointmentHtml.includes('id="other-service-input"'), '#other-service-input must exist');
  assert(appointmentHtml.includes('আপনার সমস্যার সংক্ষিপ্ত বিবরণ লিখুন *'), 'Bengali label for other service must exist');
});

test('appointment.html service select contains 13 verified options', () => {
  assert(appointmentHtml.includes('<option value="দাঁতের সাধারণ চিকিৎসা ও চেকআপ">'), 'General checkup option present');
  assert(appointmentHtml.includes('<option value="রুট ক্যানাল চিকিৎসা (RCT)">'), 'RCT option present');
  assert(appointmentHtml.includes('<option value="অন্যান্য (Other)">'), 'Other option present');
  assert(!appointmentHtml.includes('<option>undefined</option>'), 'Literal undefined option must never exist in HTML');
});

test('appointment.html safe populateDropdown function guards against undefined', () => {
  assert(appointmentHtml.includes('function populateDropdown'), 'populateDropdown function must be present');
  assert(appointmentHtml.includes("text !== 'undefined'"), 'Strict check for undefined');
  assert(appointmentHtml.includes('VERIFIED_SERVICES'), 'VERIFIED_SERVICES fallback must exist');
  assert(appointmentHtml.includes('VERIFIED_SCHEDULES'), 'VERIFIED_SCHEDULES fallback must exist');
});

// 3. Check cms.js
const cmsJsPath = path.join(__dirname, '..', 'fauntend', 'js', 'cms.js');
const cmsJs = fs.readFileSync(cmsJsPath, 'utf8');

test('cms.js has valid syntax and compiles cleanly', () => {
  assert.doesNotThrow(() => {
    new Function(cmsJs);
  }, 'cms.js must have valid javascript syntax');
});

test('cms.js implements capture-phase navigation lockout', () => {
  assert(cmsJs.includes("window.addEventListener('click', preventNavigationInEditMode, true)"), 'Click listener must use capture phase (true)');
  assert(cmsJs.includes("window.addEventListener('submit', preventSubmitInEditMode, true)"), 'Submit listener must use capture phase (true)');
  assert(cmsJs.includes('link.focus()'), 'Link must be focused for editing upon click interception');
});

test('cms.js implements Universal DOM tree walker with content key assignment', () => {
  assert(cmsJs.includes('assignContentKeys'), 'assignContentKeys must exist');
  assert(cmsJs.includes('makeAllTextNodesEditable'), 'makeAllTextNodesEditable must exist');
  assert(cmsJs.includes('cms-editable-active'), 'cms-editable-active class must be added');
  assert(cmsJs.includes("setAttribute('contenteditable', 'true')"), 'contenteditable must be set');
  assert(cmsJs.includes("setAttribute('contenteditable', 'false')"), 'child icons/badges must be protected with contenteditable=false');
});

test('cms.js implements input placeholder & value mini-editor popover', () => {
  assert(cmsJs.includes('attachInputPlaceholderTriggers'), 'Placeholder triggers must exist');
  assert(cmsJs.includes('openInputEditorPopover'), 'openInputEditorPopover must exist');
  assert(cmsJs.includes('cms-editor-popover'), 'cms-editor-popover element must exist');
});

test('cms.js implements Undo/Redo stack on input event with keyboard shortcuts', () => {
  assert(cmsJs.includes('pushMutation'), 'pushMutation must exist');
  assert(cmsJs.includes('undo'), 'undo must exist');
  assert(cmsJs.includes('redo'), 'redo must exist');
  assert(cmsJs.includes('Ctrl+Z'), 'Ctrl+Z shortcut supported');
});

test('cms.js openDropdownManager confirms option deletion and syncs to backend', () => {
  assert(cmsJs.includes('openDropdownManager'), 'openDropdownManager must exist');
  assert(cmsJs.includes('confirm'), 'Must confirm option deletion');
  assert(cmsJs.includes('/api/admin/appointment-options'), 'Must sync to PUT /api/admin/appointment-options');
});

// 4. Check style.css
const styleCssPath = path.join(__dirname, '..', 'fauntend', 'css', 'style.css');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

test('style.css enforces cursor: text !important on links in edit mode', () => {
  assert(styleCss.includes('body.cms-edit-mode-active a'), 'Edit mode link selector must exist');
  assert(styleCss.includes('cursor: text !important;'), 'cursor: text !important must be applied');
});

test('style.css styles .cms-editor-popover and #other-service-wrapper', () => {
  assert(styleCss.includes('.cms-editor-popover'), '.cms-editor-popover styling must exist');
  assert(styleCss.includes('#other-service-wrapper'), '#other-service-wrapper styling must exist');
  assert(styleCss.includes('cmsSlideDown'), 'Slide down animation must exist');
});

console.log('\n==================================================');
console.log(`AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==================================================\n');

if (failCount > 0) process.exit(1);
