# Project handoff

- Static Thai lighting education site. Edit `lighting-production.html`; run `npm run sync` to update `index.html` for GitHub Pages.
- Preserve relative asset paths, direct file:// support, branding, contact/report controls, navigation, theme contrast, responsive layout and reduced motion.
- Diagram: 32 fixture profiles, 8 modifiers, 12 presets, selection markers, realistic/low-poly subjects, floor alignment and PBR products. The camera model was intentionally removed. The unlit scene is intentionally dark.
- Photometric analysis is hybrid: manufacturer data where available, derived/category estimates elsewhere. Do not claim measured accuracy for estimates.
- Tier List includes lighting fixtures, modifiers, light-control gear and stands only; no cameras, lenses, sound equipment or monitors.
- Preserve bundled assets and third-party attribution. No backend or CDN is needed to open the site.
- Run npm test after relevant changes. These code/data checks do not establish visual correctness on all devices; browser-test changed layout and interactions.
- Commit and push before switching computers; pull --ff-only before starting elsewhere. Never force-push over divergent work.
- Browser localStorage, credentials and chat history are not in Git.
