import fs from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node validate-responsive.mjs <lighting.html>');
const html = fs.readFileSync(file, 'utf8');

const checks = new Map([
  ['viewport-fit cover', /<meta\s+name="viewport"[^>]*viewport-fit=cover/i],
  ['zoom remains enabled', text => !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?(?:[,"'])/i.test(text)],
  ['small viewport units with fallback', /min-height:100vh;min-height:100svh/],
  ['safe-area insets', /env\(safe-area-inset-(?:top|right|bottom|left)\)/],
  ['tablet navigation breakpoint', /@media\(max-width:1024px\)/],
  ['tablet content breakpoint', /@media\(max-width:899px\)/],
  ['phone diagram breakpoint', /@media\(max-width:759px\)/],
  ['phone navigation breakpoint', /@media\(max-width:640px\)/],
  ['narrow phone breakpoint', /@media\(max-width:420px\)/],
  ['landscape phone handling', /@media\(max-height:520px\) and \(orientation:landscape\)/],
  ['coarse pointer touch targets', /@media\(pointer:coarse\)/],
  ['scrollable mobile menu', /#mobileMenu\{[^}]*overflow-y:auto/s],
  ['scrollable mobile tables', /\.info-table\{[^}]*overflow-x:auto/s],
  ['touch-friendly light tools', /\.dg-tool\{[^}]*touch-action:manipulation/s],
  ['responsive diagram columns', /@media\(min-width:760px\)\{\.dg-wrap\{grid-template-columns:minmax\(230px,260px\) minmax\(0,1fr\)\}\}/],
  ['tiered WebGL pixel-ratio cap', /RENDER_TIER==='performance'\?1:\(RENDER_TIER==='balanced'\?1\.35:1\.75\)/],
  ['mobile WebGL pixel-ratio cap', /w<520\?Math\.min\(tierPixelRatio,1\.1\):tierPixelRatio/],
  ['device capability tiers', /const DEVICE_CAPABILITY=\{[\s\S]*hardwareConcurrency[\s\S]*deviceMemory[\s\S]*saveData/s],
  ['low-power renderer tier', /powerPreference:RENDER_TIER==='performance'\?'low-power':'high-performance'/],
  ['tiered emitter budgets', /function emitterCountForProfile\(profile\)/],
  ['mobile select zoom prevention', /\.dg-fixture-select,\.dg-row-fixture-select,\.dg-row-modifier-select\{font-size:16px/],
  ['legacy aspect-ratio fallback', /@supports not \(aspect-ratio:16\/10\)/],
  ['visual viewport resize hook', /window\.visualViewport\.addEventListener\('resize',resize/],
  ['orientation resize hook', /window\.addEventListener\('orientationchange'/],
  ['WebGL context recovery', /webglcontextlost[\s\S]*webglcontextrestored/s],
  ['keyboard-operable light tools', /tool\.setAttribute\('tabindex','0'\)/]
]);

const failed = [];
for (const [name, test] of checks) {
  const ok = typeof test === 'function' ? test(html) : test.test(html);
  if (!ok) failed.push(name);
}

const css = [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n');
let depth = 0;
let quote = '';
let comment = false;
for (let i = 0; i < css.length; i += 1) {
  const char = css[i];
  const next = css[i + 1];
  if (comment) {
    if (char === '*' && next === '/') { comment = false; i += 1; }
    continue;
  }
  if (!quote && char === '/' && next === '*') { comment = true; i += 1; continue; }
  if (quote) {
    if (char === '\\') { i += 1; continue; }
    if (char === quote) quote = '';
    continue;
  }
  if (char === '"' || char === "'") { quote = char; continue; }
  if (char === '{') depth += 1;
  if (char === '}') depth -= 1;
  if (depth < 0) throw new Error('CSS has an unexpected closing brace');
}
if (depth !== 0 || quote || comment) failed.push('balanced CSS blocks');

if (failed.length) throw new Error(`Responsive validation failed: ${failed.join(', ')}`);
console.log(`Validated ${checks.size} responsive/mobile requirements and balanced CSS across phone, tablet, landscape, touch, safe-area, and WebGL performance rules.`);
