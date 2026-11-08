// Shared by task chips, filters, the label manager, and the task editor.
const labelPresets = ['#39a765', '#e05263', '#397fce', '#9860cc', '#d69a26', '#239b95', '#d25799', '#ed7735', '#775b48', '#56647a'];
function labelPalette(color) {
  const safe = /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : '#9860cc';
  const rgb = [1, 3, 5].map(start => parseInt(safe.slice(start, start + 2), 16));
  const mix = white => '#' + rgb.map(value => Math.round(value * (1 - white) + 255 * white).toString(16).padStart(2, '0')).join('');
  const ink = '#' + rgb.map(value => Math.round(value * .42).toString(16).padStart(2, '0')).join('');
  const linear = rgb.map(value => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
  return { color: safe, background: mix(.88), border: mix(.4), ink, selectedText: luminance > .179 ? '#000000' : '#ffffff' };
}
if (typeof module !== 'undefined') module.exports = { labelPalette, labelPresets };
