const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/main/resources/static/i18n.js'), 'utf8');

function browser(saved, blocked = false) {
  const events = {}, writes = [];
  const text = { nodeValue: 'All tasks', parentElement: { tagName: 'SPAN' } };
  const title = { firstChild: { nodeValue: 'Workbench · Tasks' } };
  const select = { value: '', addEventListener(name, fn) { events[name] = fn; } };
  const document = {
    body: {}, documentElement: {},
    querySelector(selector) { return selector === 'title' ? title : select; },
    querySelectorAll() { return []; },
    createTreeWalker() {
      let pending = true;
      return { currentNode: text, nextNode() { const result = pending; pending = false; return result; } };
    }
  };
  const window = { addEventListener(name, fn) { events[name] = fn; }, dispatchEvent() {} };
  vm.runInNewContext(source, { window, document, NodeFilter: { SHOW_TEXT: 4 }, Event: class {},
    localStorage: {
      getItem() { if (blocked) throw Error('blocked'); return saved; },
      setItem(key, value) { if (blocked) throw Error('blocked'); writes.push([key, value]); }
    }
  });
  return { document, text, select, events, writes, i18n: window.workbenchI18n };
}

test('defaults to Simplified Chinese and restores only supported preferences', () => {
  assert.equal(browser(null).document.documentElement.lang, 'zh-CN');
  assert.equal(browser('invalid').text.nodeValue, '全部任务');
  assert.equal(browser('es').text.nodeValue, 'Todas las tareas');
  assert.equal(browser('en').text.nodeValue, 'All tasks');
});

test('switching translates text and interpolation without interpreting user content', () => {
  const page = browser(null);
  page.i18n.setLanguage('es');
  assert.equal(page.select.value, 'es');
  assert.equal(page.text.nodeValue, 'Todas las tareas');
  assert.deepEqual(page.writes[0], ['workbench.language', 'es']);
  assert.equal(page.i18n.t('Delete {title}', {title: '<b>{count}</b>'}), 'Eliminar «<b>{count}</b>»');
  page.i18n.setLanguage('en');
  assert.equal(page.text.nodeValue, 'All tasks');
  page.i18n.setLanguage('invalid');
  assert.equal(page.i18n.language, 'en');
});

test('blocked storage still permits switching and cross-tab updates do not write back', () => {
  const blocked = browser(null, true);
  blocked.i18n.setLanguage('es');
  assert.equal(blocked.text.nodeValue, 'Todas las tareas');
  const page = browser('en');
  page.events.storage({key: 'unrelated', newValue: 'es'});
  assert.equal(page.i18n.language, 'en');
  page.events.storage({key: 'workbench.language', newValue: 'es'});
  assert.equal(page.i18n.language, 'es');
  page.events.storage({key: null, newValue: null});
  assert.equal(page.i18n.language, 'zh-CN');
  assert.deepEqual(page.writes, []);
});
