import fs from "node:fs";
import vm from "node:vm";

const target = process.argv[2] || new URL("./lighting-production.html", import.meta.url);
const html = fs.readFileSync(target, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function evaluateLiteral(pattern, label) {
  const match = html.match(pattern);
  assert(match, `Cannot locate ${label} data.`);
  return vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 1000 });
}

const modifiers = evaluateLiteral(
  /const LIGHT_MODIFIERS=(\[[\s\S]*?\]);\s*\/\/ Hybrid photometric/,
  "LIGHT_MODIFIERS"
);
assert(Array.isArray(modifiers) && modifiers.length === 8, `Modifier count mismatch: ${modifiers.length}/8`);
const modifierIds = new Set();
for (const modifier of modifiers) {
  assert(typeof modifier.id === "string" && modifier.id, "A modifier is missing its id.");
  assert(!modifierIds.has(modifier.id), `Duplicate modifier id: ${modifier.id}`);
  modifierIds.add(modifier.id);
  assert(typeof modifier.label === "string" && modifier.label, `${modifier.id}: missing label`);
  assert(typeof modifier.desc === "string" && modifier.desc, `${modifier.id}: missing description`);
  assert(Number.isFinite(modifier.output) && modifier.output > 0, `${modifier.id}: invalid output multiplier`);
  assert(Number.isFinite(modifier.transmission) && modifier.transmission > 0 && modifier.transmission <= 1, `${modifier.id}: invalid transmission`);
  assert(Number.isFinite(modifier.beamScale) && modifier.beamScale > 0, `${modifier.id}: invalid beam scale`);
  assert(modifier.softness === null || (modifier.softness >= 0 && modifier.softness <= 1), `${modifier.id}: invalid softness`);
  assert(Number.isFinite(modifier.spill) && modifier.spill > 0, `${modifier.id}: invalid spill`);
  assert(Number.isFinite(modifier.sourceScale) && modifier.sourceScale > 0, `${modifier.id}: invalid source scale`);
}

const presets = evaluateLiteral(
  /const PRESETS=(\{[\s\S]*?\});\s*const PRESET_RECOMMENDED_FIXTURES=/,
  "PRESETS"
);
const presetIds = Object.keys(presets);
assert(presetIds.length === 12, `Preset count mismatch: ${presetIds.length}/12`);
const allowedRoles = new Set(["key", "fill", "back", "prac", "bg"]);
for (const presetId of presetIds) {
  const preset = presets[presetId];
  assert(typeof preset.label === "string" && preset.label, `${presetId}: missing label`);
  assert(typeof preset.desc === "string" && preset.desc, `${presetId}: missing description`);
  assert(preset.lights && typeof preset.lights === "object", `${presetId}: missing light setup`);
  assert(Object.keys(preset.lights).length > 0, `${presetId}: empty light setup`);
  for (const [role, state] of Object.entries(preset.lights)) {
    assert(allowedRoles.has(role), `${presetId}: unsupported role ${role}`);
    for (const field of ["az", "el", "dist", "intensity"]) {
      assert(Number.isFinite(state[field]), `${presetId}/${role}: invalid ${field}`);
    }
    assert(state.dist > 0, `${presetId}/${role}: distance must be positive`);
    assert(state.intensity >= 0 && state.intensity <= 1, `${presetId}/${role}: intensity must stay within 0–1`);
    assert(modifierIds.has(state.modifierId), `${presetId}/${role}: unknown modifier ${state.modifierId}`);
  }
}

const buttonIds = [...html.matchAll(/data-preset="([^"]+)"/g)].map((match) => match[1]);
assert(buttonIds.length === 12, `Preset button count mismatch: ${buttonIds.length}/12`);
assert(new Set(buttonIds).size === buttonIds.length, "Duplicate preset buttons found.");
assert(presetIds.every((id) => buttonIds.includes(id)), "A preset is missing its matching UI button.");

for (const id of ["dgPresetStatus", "dgAnalysis", "dgAnalysisState", "dgAnalysisMetrics", "dgAnalysisAdvice"]) {
  assert(html.includes(`id="${id}"`), `Missing learning-system element #${id}`);
}

for (const token of [
  ".dg-row-modifier-select",
  "function setLightModifier(",
  "function effectiveBeamAngle(",
  "function photometricCandela(",
  "photometricCandela(st)*PHOTOMETRIC_RENDER_SCALE",
  "spot.shadow.radius=",
  "function renderAnalysis(",
  "Key–Fill Ratio",
  "Illuminance รวมที่ตัวแบบ",
  "Incident EV100 โดยประมาณ",
  "totalWatts>1800",
  "setPresetStatus(name)",
  "gsap.to(st,{"
]) {
  assert(html.includes(token), `Missing learning-system integration: ${token}`);
}

console.log(`PASS: ${modifiers.length} modifiers, ${presetIds.length} presets, and real-time analysis hooks validated.`);
