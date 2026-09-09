import fs from 'node:fs';
import vm from 'node:vm';

const htmlPath = process.argv[2];
if (!htmlPath) throw new Error('Usage: node validate-diagram-fixtures.mjs <lighting.html>');
const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/const LIGHT_FIXTURES=(\[[\s\S]*?\]);\s*const LIGHT_MODIFIERS=/);
if (!match) throw new Error('LIGHT_FIXTURES registry not found');

const context = {};
vm.createContext(context);
vm.runInContext(`LIGHT_FIXTURES=${match[1]}`, context);
const fixtures = context.LIGHT_FIXTURES;
const allowedGroups = new Set(['Video Lights', 'Cinema Lights']);
const allowedForms = new Set(['quad', 'cob', 'fresnel', 'tube', 'pocket', 'panel', 'ring', 'kino4', 'kino2', 'tungsten']);
const ids = new Set();

if (!Array.isArray(fixtures) || fixtures.length !== 32) {
  throw new Error(`Expected 32 fixtures, found ${fixtures?.length ?? 0}`);
}

fixtures.forEach((fixture) => {
  if (ids.has(fixture.id)) throw new Error(`Duplicate fixture id: ${fixture.id}`);
  ids.add(fixture.id);
  if (!allowedGroups.has(fixture.group)) throw new Error(`${fixture.id}: invalid group`);
  if (!allowedForms.has(fixture.form)) throw new Error(`${fixture.id}: unsupported form ${fixture.form}`);
  if (!(fixture.watts > 0)) throw new Error(`${fixture.id}: wattage must be positive`);
  if (!(fixture.cctMin <= fixture.cctDefault && fixture.cctDefault <= fixture.cctMax)) {
    throw new Error(`${fixture.id}: default CCT is outside its range`);
  }
  if (!(fixture.beamMin <= fixture.beamDefault && fixture.beamDefault <= fixture.beamMax)) {
    throw new Error(`${fixture.id}: default beam is outside its range`);
  }
  if (!(fixture.softness >= 0 && fixture.softness <= 1)) {
    throw new Error(`${fixture.id}: softness must be between 0 and 1`);
  }
});

const groupCounts = fixtures.reduce((counts, fixture) => {
  counts[fixture.group] = (counts[fixture.group] || 0) + 1;
  return counts;
}, {});
if (groupCounts['Video Lights'] !== 17 || groupCounts['Cinema Lights'] !== 15) {
  throw new Error(`Unexpected group counts: ${JSON.stringify(groupCounts)}`);
}

console.log(`Validated 32 fixture profiles, ${ids.size} unique IDs, CCT/beam ranges, output wattage, softness, and 10 supported 3D forms.`);
