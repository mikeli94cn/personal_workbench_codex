const {test} = require('node:test');
const assert = require('node:assert/strict');
const {labelPalette, labelPresets} = require('../src/main/resources/static/label-colors.js');
function luminance(hex) {
  const values = [1,3,5].map(start => parseInt(hex.slice(start,start+2),16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return values[0]*.2126+values[1]*.7152+values[2]*.0722;
}
function contrast(a,b) { const values=[luminance(a),luminance(b)].sort((a,b)=>b-a); return (values[0]+.05)/(values[1]+.05); }
test('preset and custom label colors retain readable normal and selected text', () => {
  for (const color of [...labelPresets,'#ffffff','#000000','#ffff00','#00ffff','#0000ff','#ff00ff','#808080','#aabbcc']) {
    const palette=labelPalette(color);
    assert.ok(contrast(palette.color,palette.selectedText)>=4.5, color+' selected');
    assert.ok(contrast(palette.background,palette.ink)>=4.5, color+' normal');
  }
});
test('invalid color values cannot enter generated CSS and valid hex is preserved', () => {
  assert.equal(labelPalette('#AB12CD').color,'#ab12cd');
  assert.equal(labelPalette('red; background: url(example)').color,'#9860cc');
});
