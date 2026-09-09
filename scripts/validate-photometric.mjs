import fs from 'node:fs';
import vm from 'node:vm';

const file = process.argv[2] || 'work/lighting-production.html';
const html = fs.readFileSync(file, 'utf8');

function extract(pattern, label) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing ${label}`);
  return vm.runInNewContext(`(${match[1]})`);
}

const fixtures = extract(/const LIGHT_FIXTURES=(\[[\s\S]*?\]);\s*const LIGHT_MODIFIERS=/, 'LIGHT_FIXTURES');
const modifiers = extract(/const LIGHT_MODIFIERS=(\[[\s\S]*?\]);\s*\/\/ Hybrid photometric/, 'LIGHT_MODIFIERS');
const profiles = extract(/const PHOTOMETRIC_PROFILES=(\{[\s\S]*?\});\s*let selectedFixtureId=/, 'PHOTOMETRIC_PROFILES');
const presets = extract(/const PRESETS=(\{[\s\S]*?\});\s*const PRESET_RECOMMENDED_FIXTURES=/, 'PRESETS');
const recommendations = extract(/const PRESET_RECOMMENDED_FIXTURES=(\{[\s\S]*?\});\s*let currentPresetName=/, 'PRESET_RECOMMENDED_FIXTURES');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const fixtureById = Object.fromEntries(fixtures.map(fixture => [fixture.id, fixture]));
const modifierById = Object.fromEntries(modifiers.map(modifier => [modifier.id, modifier]));
const allowedEmitters = new Set(['point', 'cluster', 'panel', 'tube', 'ring', 'kino']);
const allowedQuality = new Set(['manufacturer', 'derived', 'category']);

assert(fixtures.length === 32, `Expected 32 fixtures, found ${fixtures.length}`);
assert(new Set(fixtures.map(fixture => fixture.id)).size === fixtures.length, 'Fixture IDs are not unique');
assert(Object.keys(profiles).length === fixtures.length, 'Photometric profile count does not match fixtures');

for (const fixture of fixtures) {
  const profile = profiles[fixture.id];
  assert(profile, `Missing profile: ${fixture.id}`);
  assert(allowedEmitters.has(profile.emitter), `Invalid emitter: ${fixture.id}`);
  assert(allowedQuality.has(profile.quality), `Invalid profile quality: ${fixture.id}`);
  assert(Number.isFinite(profile.powerDraw) && profile.powerDraw > 0, `Invalid power draw: ${fixture.id}`);
  assert(Number.isFinite(profile.lux1m) && profile.lux1m > 0, `Invalid 1m lux: ${fixture.id}`);
  assert(Number.isFinite(profile.beam) && profile.beam >= 4 && profile.beam <= 170, `Invalid beam: ${fixture.id}`);
  if (profile.reflectorLux1m) {
    assert(profile.reflectorBeam >= 4 && profile.reflectorBeam <= 170, `Invalid reflector beam: ${fixture.id}`);
    assert(profile.reflectorLux1m > profile.lux1m, `Reflector output should exceed bare output: ${fixture.id}`);
  }
  if (profile.emitters) assert(profile.emitters >= 2 && profile.emitters <= 12, `Invalid emitter count: ${fixture.id}`);
}

for (const id of Object.keys(profiles)) assert(fixtureById[id], `Orphan profile: ${id}`);
for (const modifier of modifiers) {
  assert(modifier.transmission > 0 && modifier.transmission <= 1, `Invalid modifier transmission: ${modifier.id}`);
  assert(modifier.beamScale > 0, `Invalid modifier beam scale: ${modifier.id}`);
}

function modifierSupported(fixture, modifierId) {
  if (modifierId === 'none' || modifierId === 'diffusion') return true;
  const mount = profiles[fixture.id].mount;
  if (modifierId === 'reflector' || modifierId === 'fresnel') return mount === 'bowens' || mount === 'fm';
  if (modifierId === 'softbox' || modifierId === 'umbrella') return ['bowens', 'fm', 'openface'].includes(mount);
  if (modifierId === 'softgrid') return ['bowens', 'fm', 'openface', 'panel', 'tube', 'kino'].includes(mount);
  if (modifierId === 'barndoors') return ['bowens', 'fm', 'fresnel', 'openface', 'panel', 'tube', 'kino'].includes(mount);
  return false;
}

function solidAngle(degrees) {
  const radians = Math.max(4, Math.min(170, degrees)) * Math.PI / 180 / 2;
  return 2 * Math.PI * (1 - Math.cos(radians));
}

function beamAngle(fixture, profile, modifier, state) {
  if (modifier.id === 'reflector' && profile.reflectorBeam) return profile.reflectorBeam;
  if (modifier.id === 'fresnel' && profile.fresnelMin) return Math.max(profile.fresnelMin, Math.min(profile.fresnelMax, state.spread ?? profile.fresnelMin));
  const base = profile.focusMin
    ? Math.max(profile.focusMin, Math.min(profile.focusMax, state.spread ?? profile.beam))
    : profile.beam;
  return Math.max(4, Math.min(150, base * modifier.beamScale));
}

function luxAtSubject(fixture, profile, modifier, state) {
  let referenceLux = profile.lux1m;
  let referenceBeam = profile.beam;
  let transmission = modifier.transmission;
  if (modifier.id === 'reflector' && profile.reflectorLux1m) {
    referenceLux = profile.reflectorLux1m;
    referenceBeam = profile.reflectorBeam;
    transmission = 1;
  }
  const beamRatio = Math.max(.05, Math.min(25, solidAngle(referenceBeam) / solidAngle(beamAngle(fixture, profile, modifier, state))));
  const rgbFactor = fixture.rgb && state.colorMode === 'rgb' ? .72 : 1;
  const cct = state.cct ?? fixture.cctDefault;
  const cctCenter = (fixture.cctMin + fixture.cctMax) / 2;
  const cctRange = Math.max(1, fixture.cctMax - fixture.cctMin);
  const cctFactor = fixture.cctMin === fixture.cctMax ? 1 : 1 - .14 * Math.abs(cct - cctCenter) / (cctRange / 2);
  return referenceLux * beamRatio * transmission * state.intensity * rgbFactor * cctFactor / (state.dist * state.dist);
}

const ratioRanges = {
  threepoint: [2, 4.5], rembrandt: [5, 12], butterfly: [1.3, 3], split: [12, 50],
  loop: [2.5, 6], highkey: [1.1, 2.5], interview: [1.5, 4.5], product: [1.2, 3], cinematic: [4, 14]
};
const auditRows = [];

assert(Object.keys(presets).length === 12, `Expected 12 presets, found ${Object.keys(presets).length}`);
for (const [presetId, preset] of Object.entries(presets)) {
  const recommended = recommendations[presetId];
  assert(recommended, `Missing fixture recommendations: ${presetId}`);
  const outputs = {};
  let totalLux = 0;
  let totalPower = 0;
  for (const [role, state] of Object.entries(preset.lights)) {
    const fixtureId = recommended[role];
    const fixture = fixtureById[fixtureId];
    assert(fixture, `Missing recommended fixture for ${presetId}.${role}`);
    const modifier = modifierById[state.modifierId];
    assert(modifier, `Unknown modifier ${state.modifierId} in ${presetId}.${role}`);
    assert(modifierSupported(fixture, modifier.id), `Unsupported modifier ${modifier.id} on ${fixtureId} in ${presetId}.${role}`);
    assert(state.intensity >= 0 && state.intensity <= 1, `Intensity outside 0–1 in ${presetId}.${role}`);
    assert(state.dist > 0, `Invalid distance in ${presetId}.${role}`);
    if (state.colorMode === 'rgb') assert(fixture.rgb, `RGB preset assigned to non-RGB fixture in ${presetId}.${role}`);
    const profile = profiles[fixture.id];
    const output = luxAtSubject(fixture, profile, modifier, state);
    assert(Number.isFinite(output) && output >= 0, `Invalid lux result in ${presetId}.${role}`);
    outputs[role] = output;
    totalLux += output;
    totalPower += profile.powerDraw;
  }
  const ratio = outputs.key && outputs.fill ? outputs.key / outputs.fill : null;
  if (ratioRanges[presetId]) {
    const [minimum, maximum] = ratioRanges[presetId];
    assert(ratio >= minimum && ratio <= maximum, `${presetId} ratio ${ratio.toFixed(2)} outside ${minimum}–${maximum}`);
  }
  auditRows.push({presetId, ratio, totalLux, totalPower});
}

const qualityCounts = Object.values(profiles).reduce((counts, profile) => {
  counts[profile.quality] = (counts[profile.quality] || 0) + 1;
  return counts;
}, {});

for (const row of auditRows) {
  console.log(`${row.presetId.padEnd(11)} ratio=${row.ratio === null ? 'intentional' : row.ratio.toFixed(2).padStart(5)} lux=${Math.round(row.totalLux).toString().padStart(6)} power=${Math.round(row.totalPower).toString().padStart(4)}W`);
}
console.log(`PASS: ${fixtures.length} fixtures, ${Object.keys(profiles).length} profiles, ${Object.keys(presets).length} presets; quality manufacturer=${qualityCounts.manufacturer || 0}, derived=${qualityCounts.derived || 0}, category=${qualityCounts.category || 0}`);
