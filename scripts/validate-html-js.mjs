import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultHtmlPath = fileURLToPath(new URL("./lighting-production.html", import.meta.url));
const htmlPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultHtmlPath;
const baseDir = path.dirname(htmlPath);
const html = fs.readFileSync(htmlPath, "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim());

if (!scripts.length) {
  throw new Error("No inline scripts found");
}

scripts.forEach((source, index) => {
  try {
    new Function(source);
  } catch (error) {
    throw new Error(`Inline script ${index + 1}: ${error.message}`);
  }
});

const requiredTokens = [
  "gsap.quickTo",
  "gsap.ticker.add",
  "powerPreference:RENDER_TIER==='performance'?'low-power':'high-performance'",
  "o.beam.scale.set",
  "scheduleReadout"
];

const missing = requiredTokens.filter((token) => !html.includes(token));
if (missing.length) {
  throw new Error(`Missing optimization hooks: ${missing.join(", ")}`);
}

const copiedHomeMotionTokens = [
  "window.NitadeMotion = {",
  "enabled:function(){ return Boolean(window.gsap && !reduceMotion.matches); }",
  "document.documentElement.classList.add('gsap-ready');",
  "gsap.ticker.lagSmoothing(500,33);",
  "function initHomeHeroMotion()",
  "if (currentPage !== 'home' || !window.NitadeMotion || !window.NitadeMotion.enabled()) return;",
  "const intro = document.querySelectorAll('.hero-learning-brand,.hero-nav,.hero-header-actions');",
  "const content = document.querySelectorAll('.hero-desc,.hero-cta');",
  "const timeline = gsap.timeline({defaults:{ease:'power3.out'}});",
  ".fromTo(intro,{autoAlpha:0,y:-10},{autoAlpha:1,y:0,duration:.42,stagger:.055,clearProps:'opacity,visibility,transform'})",
  ".fromTo(content,{autoAlpha:0,y:18},{autoAlpha:1,y:0,duration:.52,stagger:.09,clearProps:'opacity,visibility,transform'},'-=.18')",
  "initHomeHeroMotion();",
  "function initLightingHeroMotion()",
  "initLightingHeroMotion();"
];
const missingCopiedHomeMotion = copiedHomeMotionTokens.filter((token) => !html.includes(token));
if (missingCopiedHomeMotion.length) {
  throw new Error(`Missing copied Home logo motion: ${missingCopiedHomeMotion.join(", ")}`);
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) {
  throw new Error(`Duplicate IDs: ${duplicateIds.join(", ")}`);
}
const idSet = new Set(ids);
const literalIdReferences = [...html.matchAll(/getElementById\((['"])([^'"]+)\1\)/g)]
  .map((match) => match[2]);
const missingIdReferences = [...new Set(literalIdReferences)].filter((id) => !idSet.has(id));
if (missingIdReferences.length) {
  throw new Error(`getElementById references missing markup: ${missingIdReferences.join(", ")}`);
}

const pagesBlock = html.match(/const PAGES\s*=\s*\[([\s\S]*?)\];/);
if (!pagesBlock) throw new Error("PAGES registry not found");
const registeredPages = [...pagesBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
const markupPages = [...html.matchAll(/\sid="page-([^"]+)"/g)].map((match) => match[1]);
const missingPageMarkup = registeredPages.filter((page) => !markupPages.includes(page));
const unregisteredPageMarkup = markupPages.filter((page) => !registeredPages.includes(page));
if (missingPageMarkup.length || unregisteredPageMarkup.length) {
  throw new Error(
    `Page registry mismatch; missing markup: ${missingPageMarkup.join(", ") || "none"}; ` +
    `unregistered markup: ${unregisteredPageMarkup.join(", ") || "none"}`
  );
}
const navTargets = [...html.matchAll(/\bnav\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]);
const invalidNavTargets = [...new Set(navTargets)].filter((page) => !registeredPages.includes(page));
if (invalidNavTargets.length) {
  throw new Error(`Navigation targets missing from PAGES: ${invalidNavTargets.join(", ")}`);
}

const supportTokens = [
  "id=\"contactTrigger\"",
  "id=\"issueTrigger\"",
  "id=\"contactModal\"",
  "class=\"contact-action-stack\"",
  "class=\"modal-socials\"",
  "facebook.com/people/Nitade-Creator-Lab-DPU",
  "line.me/R/ti/p/@538vsbhu",
  "youtube.com/@DPUCAlab",
  "docs.google.com/forms/d/e/1FAIpQLSdFbogMZsdH0FBUqbWoyWYqlU7NaeAKw6ZjcTFwkdRrQnEo8A"
];
const missingSupport = supportTokens.filter((token) => !html.includes(token));
if (missingSupport.length) {
  throw new Error(`Missing support integration: ${missingSupport.join(", ")}`);
}

const forbiddenCustomTokens = [
  "lab-utility",
  "support-modal",
  "data-support-mode",
  "openSupportModal"
];
const customRemnants = forbiddenCustomTokens.filter((token) => html.includes(token));
if (customRemnants.length) {
  throw new Error(`Custom support UI remnants remain: ${customRemnants.join(", ")}`);
}

const iconReferences = [...html.matchAll(/data-src="(assets\/icons\/social-[^"]+\.png)"/g)]
  .map((match) => match[1]);
if (iconReferences.length !== 6) {
  throw new Error(`Expected 6 original social icon references, found ${iconReferences.length}`);
}

const logoTokens = [
  "class=\"hero-learning-brand brand\"",
  "class=\"brand-mark\"",
  "M8 5v14l11-7L8 5z",
  "<a class=\"name\" href=\"https://aohpongsathon-con.github.io/NitadeCreatorLabDPU/\" target=\"_blank\" rel=\"noopener noreferrer\" title=\"เปิดเว็บไซต์ Nitade Creator Lab\">Nitade Creator Lab</a>",
  "<div class=\"sub\">Learning Hub</div>"
];
const missingLogo = logoTokens.filter((token) => !html.includes(token));
if (missingLogo.length) {
  throw new Error(`Missing original top-left logo: ${missingLogo.join(", ")}`);
}
if (html.includes("hero-learning-icon") || html.includes("hero-learning-copy")) {
  throw new Error("The previous top-left Lighting logo is still present");
}

if (/Creator Lab · Alpha Test|class="(?:topnav-alpha|hero-alpha-badge)"/.test(html)) {
  throw new Error('Release page still contains an Alpha Test badge');
}

const compatibilityTokens = [
  "assets/fonts/fonts.css",
  "assets/vendor/three.min.js",
  "assets/vendor/RoomEnvironment.js",
  "assets/vendor/OrbitControls.js",
  "assets/vendor/GLTFLoader.js",
  "assets/models/StudioHuman.data.js",
  "assets/models/ProductBottle.data.js",
  "assets/models/ProductBox.data.js",
  "assets/vendor/gsap.min.js",
  "prefers-reduced-motion:reduce",
  "-webkit-backdrop-filter",
  "function safeScrollToTop()",
  "function safeScrollIntoView(element)",
  "show3DUnavailable",
  "'MutationObserver' in window",
  "'ResizeObserver' in window",
  "'PointerEvent' in window",
  "webglcontextlost",
  "webglcontextrestored",
  "window.__syncDiagramVisibility",
  "NodeList.prototype.forEach",
  "Object.values=function",
  "id=\"compatWarning\"",
  "window.__lightingAppReady=true"
];
const missingCompatibility = compatibilityTokens.filter((token) => !html.includes(token));
if (missingCompatibility.length) {
  throw new Error(`Missing compatibility fallbacks: ${missingCompatibility.join(", ")}`);
}
if (/\?\./.test(html) || /\.\.\.\s*[A-Za-z_$[]/.test(html)) {
  throw new Error("Parser-level optional chaining or object spread remains");
}

const externalRuntimeAssets = [
  ...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(https?:\/\/[^"]+)"/gi)
].map((match) => match[1]);
if (externalRuntimeAssets.length) {
  throw new Error(`External runtime assets remain: ${externalRuntimeAssets.join(", ")}`);
}

const localAssetReferences = [
  ...html.matchAll(/<(?:script|link|img)\b[^>]*(?:src|href|data-src)="([^"]+)"/gi)
].map((match) => match[1]).filter((reference) => (
  !/^(?:https?:|mailto:|tel:|data:|#)/i.test(reference)
));
const missingAssets = [...new Set(localAssetReferences)].filter((reference) => {
  const filePath = path.resolve(baseDir, reference.replace(/\//g, path.sep));
  return !fs.existsSync(filePath) || fs.statSync(filePath).size === 0;
});
if (missingAssets.length) {
  throw new Error(`Missing or empty local assets: ${missingAssets.join(", ")}`);
}

const fontsCssPath = path.resolve(baseDir, "assets", "fonts", "fonts.css");
const fontsCss = fs.readFileSync(fontsCssPath, "utf8");
const fontReferences = [...fontsCss.matchAll(/url\(\.\/([^)]+)\)/g)].map((match) => match[1]);
const missingFonts = fontReferences.filter((reference) => {
  const filePath = path.resolve(path.dirname(fontsCssPath), reference);
  return !fs.existsSync(filePath) || fs.statSync(filePath).size === 0;
});
if (missingFonts.length) {
  throw new Error(`Missing local font files: ${missingFonts.join(", ")}`);
}

const homeContrastTokens = [
  "html[data-theme=\"light\"] .hero-learning-brand.brand{--sky:#94c9fd;--violet:#6a1bff;--text-0:#fff;--text-2:#a6acc6}",
  ".hero-nav a{font-size:11px;color:rgba(200,220,250,.74)",
  ".kelvin-k{font-family:'IBM Plex Mono',monospace;font-size:12px;font-size:clamp(11px,1.4vw,13px);letter-spacing:.28em;color:rgba(255,255,255,.58)",
  ".hero-desc{font-size:12.5px;color:rgba(215,229,250,.76)",
  ".kelvin-labels{display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:8.5px;letter-spacing:.08em;color:rgba(255,255,255,.64)",
  ".hero-header-actions .contact-action-stack{--panel-line:rgba(255,255,255,.22);--text-0:#fff"
];
const missingHomeContrast = homeContrastTokens.filter((token) => !html.includes(token));
if (missingHomeContrast.length) {
  throw new Error(`Missing home contrast corrections: ${missingHomeContrast.join(", ")}`);
}
if (/html\[data-theme="light"\]\s+\.contact-action-stack\s*,/.test(html)) {
  throw new Error("Light-mode modal colors are leaking into the dark hero contact controls");
}

const diagramLightListTokens = [
  "class=\"dg-stage-layout\"",
  "class=\"dg-used-lights-panel\"",
  "id=\"dgUsedLightsTitle\"",
  "id=\"dgUsedLightsCount\"",
  "id=\"dgUsedLightsList\"",
  "id=\"dgSelectionStatus\"",
  "function renderUsedLights()",
  "function selectLight(type,animateMarker)",
  "function drawSelectionMarker(type)",
  "new THREE.CanvasTexture(markerCanvas)",
  "selectedLightMarker.visible",
  "item.setAttribute('aria-pressed','false')",
  "item.addEventListener('click',()=>selectLight(type,true))",
  "selectLight(type,true);"
];
const missingDiagramLightList = diagramLightListTokens.filter((token) => !html.includes(token));
if (missingDiagramLightList.length) {
  throw new Error(`Missing used-lights selection integration: ${missingDiagramLightList.join(", ")}`);
}

const darkStageTokens = [
  "const STAGE_AMBIENT_LEVELS=studioEnvironmentTarget",
  "?{dark:0.045,lit:0.09}",
  "function syncStageAmbient(animate)",
  "scene.environment=active&&studioEnvironmentTarget?studioEnvironmentTarget.texture:null",
  "if(k==='intensity') syncStageAmbient(true)",
  "color:0x090711,roughness:0.94",
  "color:0x0c0918,roughness:1",
  "floorGrid.material.opacity=0.27"
];
const missingDarkStage = darkStageTokens.filter((token) => !html.includes(token));
if (missingDarkStage.length) {
  throw new Error(`Missing no-light dark-stage integration: ${missingDarkStage.join(", ")}`);
}

const realisticHumanTokens = [
  "data-subject=\"humanfull\"",
  "data-subject=\"humanhalf\"",
  "สมจริง · เต็มตัว",
  "สมจริง · ครึ่งตัว",
  "id=\"dgModelStatus\"",
  "Human model · MakeHuman / MPFB · CC0",
  "let currentSubjectKey='humanfull'",
  "renderer.localClippingEnabled=true",
  "window.STUDIO_HUMAN_GLB_BASE64",
  "function prepareRealisticHuman(",
  "function ensureRealisticHuman(",
  "function attachRealisticHuman(",
  "function buildRealisticHuman(",
  "new THREE.AnimationMixer(imported)",
  "const REALISTIC_HALF_SCALE=1.52",
  "const REALISTIC_HALF_BODY_RATIO=0.54",
  "const REALISTIC_HALF_FLOOR_Y=0.018",
  "function readStudioAttributeComponent(",
  "function getStudioHumanSurfaceBounds(",
  "const initialBox=getStudioHumanSurfaceBounds(imported)",
  "asset.userData.surfaceBounds=groundedSurfaceBounds.clone()",
  "function installStudioHumanClipShader(",
  "if(vStudioWorldY<studioClipY) discard;",
  "function setStudioHumanClip(",
  "asset.position.y=-surfaceBounds.min.y*displayScale",
  "const abdomenY=surfaceBounds.min.y+surfaceSize.y*REALISTIC_HALF_BODY_RATIO",
  "asset.position.y=REALISTIC_HALF_FLOOR_Y-abdomenY*displayScale",
  "asset.userData.activeVisibleBounds=visibleBounds",
  "subjectGroup.scale.set(1,1,1)",
  "persistentSubjectAsset",
  "data-subject=\"mannequin\"",
  "โหมดเบา · Low-poly",
  "function buildStudioMannequin()",
  "function addSubjectLimb(",
  "flatShading:true",
  "new THREE.SphereGeometry(0.25,10,8)",
  "new THREE.ConeGeometry(0.045,0.12,5)",
  "SUBJECT_CENTER.set(0,1.18,0)"
];
const missingRealisticHuman = realisticHumanTokens.filter((token) => !html.includes(token));
if (missingRealisticHuman.length) {
  throw new Error(`Missing realistic human integration: ${missingRealisticHuman.join(", ")}`);
}

const diagramGroundTokens = [
  "new THREE.PlaneGeometry(14,14)",
  "new THREE.GridHelper(12,24",
  "new THREE.RingGeometry(1.72,1.75,72)",
  "function snapSubjectToFloor(",
  "function addSubjectContactShadow(",
  "const CAMERA_REFERENCE=new THREE.Vector3(0,1.35,3.6)",
  "no camera or tripod model is rendered in the set"
];
const missingDiagramGround = diagramGroundTokens.filter((token) => !html.includes(token));
if (missingDiagramGround.length) {
  throw new Error(`Missing diagram ground integration: ${missingDiagramGround.join(", ")}`);
}
const removedCameraModelTokens = [
  "assets/models/StudioCamera.data.js",
  "Camera model · Antique Camera · CC0",
  "window.STUDIO_CAMERA_GLB_BASE64",
  "function buildCameraFallback(",
  "function loadStudioCamera(",
  "camGizmo"
];
const cameraModelRemnants = removedCameraModelTokens.filter((token) => html.includes(token));
if (cameraModelRemnants.length) {
  throw new Error(`Removed studio-camera model remnants remain: ${cameraModelRemnants.join(", ")}`);
}
if (html.includes("new THREE.CylinderGeometry(0.44,0.52,REALISTIC_HALF_CUT_Y,36)")) {
  throw new Error("Legacy realistic half-body pedestal must not be present.");
}

const productPbrLightingTokens = [
  "Bottle model · Microsoft / Khronos · CC0",
  "Box model · Rahul Chaudhary / Poly Haven · CC0",
  "PRODUCT_BOTTLE_GLB_BASE64",
  "PRODUCT_BOX_GLB_BASE64",
  "const PRODUCT_MODEL_CONFIG={",
  "function prepareProductModel(",
  "function ensureProductModel(",
  "function attachProductModel(",
  "function buildProductSubject(",
  "texture.anisotropy=maxAnisotropy",
  "material.envMapIntensity=config.environmentIntensity",
  "renderer.physicallyCorrectLights=true",
  "new THREE.PMREMGenerator(renderer)",
  "new THREE.RoomEnvironment()",
  "scene.environment=active&&studioEnvironmentTarget?studioEnvironmentTarget.texture:null",
  "photometricCandela(st)*PHOTOMETRIC_RENDER_SCALE",
  "o.spots.forEach(spot=>",
  "spot.shadow.mapSize.set(shadowMapSize,shadowMapSize)",
  "spot.shadow.normalBias=0.018"
];
const missingProductPbrLighting = productPbrLightingTokens.filter((token) => !html.includes(token));
if (missingProductPbrLighting.length) {
  throw new Error(`Missing product PBR/lighting integration: ${missingProductPbrLighting.join(", ")}`);
}

const equipmentFixtureTokens = [
  "id=\"dgFixtureSelect\"",
  "id=\"dgFixtureSpec\"",
  "const LIGHT_FIXTURES=[",
  "const PHOTOMETRIC_PROFILES={",
  "function createLightState(",
  "function photometricCandela(",
  "function effectiveFixtureOutput(",
  "function kelvinToHex(",
  "function createFixtureGizmo(",
  "function updateFixtureEmitter(",
  "function replaceFixtureGizmo(",
  "function setLightFixture(",
  "raycaster.intersectObjects(fixtures,true)",
  "profile.beam",
  "function beamControlRange(",
  "fixture.cctMin",
  "fixture.cctMax",
  "fixture.rgb",
  "fixture.softness",
  "const LIGHT_MODIFIERS=[",
  "function effectiveBeamAngle(",
  "function setLightModifier(",
  "function modifierSupported(",
  "const RENDER_TIER=",
  "Power Draw",
  "function renderAnalysis(",
  "Lighting Ratio โดยประมาณ (Key:Fill)",
  "ควรใช้ Lux meter และข้อมูล IES/Photometric"
];
const missingEquipmentFixtures = equipmentFixtureTokens.filter((token) => !html.includes(token));
if (missingEquipmentFixtures.length) {
  throw new Error(`Missing equipment-fixture integration: ${missingEquipmentFixtures.join(", ")}`);
}
const videoFixtureCount = (html.match(/group:'Video Lights'/g) || []).length;
const cinemaFixtureCount = (html.match(/group:'Cinema Lights'/g) || []).length;
if (videoFixtureCount !== 17 || cinemaFixtureCount !== 15) {
  throw new Error(`Fixture inventory mismatch: Video=${videoFixtureCount}/17; Cinema=${cinemaFixtureCount}/15`);
}
if (html.includes("new THREE.ConeGeometry(0.075,0.16,16)")) {
  throw new Error("Legacy generic cone light gizmo remains in the Diagram.");
}

const inlineHandlerFunctions = [
  ...html.matchAll(/\sonclick="([^"]+)"/g)
].flatMap((match) => [...match[1].matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((call) => call[1]));
const declaredHandlerFunctions = new Set([
  ...[...html.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]),
  ...[...html.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)].map((match) => match[1])
]);
const missingHandlerFunctions = [...new Set(inlineHandlerFunctions)]
  .filter((name) => !declaredHandlerFunctions.has(name));
if (missingHandlerFunctions.length) {
  throw new Error(`Inline handlers reference missing functions: ${missingHandlerFunctions.join(", ")}`);
}

console.log(
  `Validated ${scripts.length} inline scripts, ${requiredTokens.length} GSAP/3D hooks, ` +
  `${supportTokens.length} original contact hooks, 6 social icons, the original top-left logo, no Alpha Test badges, ` +
  `${compatibilityTokens.length} compatibility fallbacks, ${localAssetReferences.length} local asset references, ` +
  `${fontReferences.length} local font references, ${homeContrastTokens.length} home contrast checks, ${registeredPages.length} routes, ` +
  `${diagramLightListTokens.length} used-lights selection checks, ${new Set(inlineHandlerFunctions).size} inline-handler functions, ` +
  `${darkStageTokens.length} no-light dark-stage checks, ` +
  `${realisticHumanTokens.length} realistic-human checks, ${diagramGroundTokens.length} floor checks, ${removedCameraModelTokens.length} camera-removal checks, ` +
  `${productPbrLightingTokens.length} product PBR/lighting checks, ` +
  `${equipmentFixtureTokens.length} equipment-fixture checks, 17 Video Lights, 15 Cinema Lights, ` +
  `and ${ids.length} unique IDs.`
);
