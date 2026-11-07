const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/main/resources/static/themes.js'), 'utf8');

function browser(saved, blocked = false) {
  const documentEvents = {}, windowEvents = {}, controlEvents = {}, writes = [];
  const select = { value:'', options:[], append(option) { this.options.push(option); }, addEventListener(name, fn) { controlEvents[name] = fn; } };
  const hint = {textContent:'', dataset:{}};
  const document = {
    documentElement: {dataset:{}},
    addEventListener(name, fn) { documentEvents[name] = fn; },
    querySelector(selector) { return selector === '#theme-select' ? select : hint; },
    createElement() { return {}; }
  };
  vm.runInNewContext(source, {
    document,
    window: {addEventListener(name, fn) {windowEvents[name] = fn;}},
    localStorage: {
      getItem() { if(blocked) throw new Error('Blocked'); return saved; },
      setItem(key, value) { if(blocked) throw new Error('Blocked'); writes.push([key, value]); }
    }
  });
  const beforeReady = document.documentElement.dataset.theme;
  documentEvents.DOMContentLoaded();
  return {document, select, hint, writes, beforeReady, change:controlEvents.change, storage:windowEvents.storage};
}

test('restores a valid saved palette before DOM ready and defaults safely', () => {
  assert.equal(browser('crystal').beforeReady, 'crystal');
  assert.equal(browser('crystal').select.value, 'crystal');
  assert.equal(browser('unknown').beforeReady, 'sakura');
  assert.equal(browser(null).select.options.length, 4);
});

test('all palette choices apply immediately and persist for reload', () => {
  for (const theme of ['sakura','clow','star','crystal']) {
    const page = browser(null);
    page.select.value = theme; page.change();
    assert.equal(page.document.documentElement.dataset.theme, theme);
    assert.deepEqual(page.writes[0], ['workbench.theme', theme]);
    assert.equal(browser(page.writes[0][1]).beforeReady, theme);
  }
});

test('blocked storage does not prevent changing themes', () => {
  const page = browser(null, true);
  page.select.value = 'clow'; page.change();
  assert.equal(page.document.documentElement.dataset.theme, 'clow');
  assert.match(page.hint.textContent, /unavailable/);
});

test('other tabs synchronize theme changes and reset on storage clear', () => {
  const page = browser('clow');
  page.storage({key:'unrelated', newValue:'star'});
  assert.equal(page.select.value, 'clow');
  page.storage({key:'workbench.theme', newValue:'star'});
  assert.equal(page.select.value, 'star');
  assert.equal(page.document.documentElement.dataset.theme, 'star');
  page.storage({key:null, newValue:null});
  assert.equal(page.select.value, 'sakura');
});
