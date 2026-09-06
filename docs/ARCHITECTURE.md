# Unfold Studio architecture

Unfold Studio is a static browser application. Cloudflare serves the application; the browser owns the 3D scene. The catalogue can grow without loading more than the selected model.

## Boundaries

| Directory                | Owns                                                          | Must not own                          |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------- |
| `src/core/catalog`       | Content contracts and capability validation                   | React, Three.js, individual subjects  |
| `src/core/viewer`        | Pure view transitions and quality policy                      | DOM, asset loading, mesh construction |
| `src/core/assets`        | Delivery URL resolution and reference-counted resource leases | Interface state, model-specific names |
| `src/core/audio`         | A lazy audio context and bounded playback                     | Renderer, global catalogue downloads  |
| `src/content`            | Registered showcases, credits, presentation settings          | Viewer implementation                 |
| `src/features/viewer`    | Three.js renderer, loading adapter, transforms, diagnostics   | Rifle-specific geometry or labels     |
| `src/features/inspector` | Content inspection interface                                  | Direct mesh manipulation              |
| `src/features/controls`  | Accessible control bindings                                   | Animation math and loading            |
| `src/features/catalog`   | Lightweight discovery and navigation                          | Live canvases for every item          |
| `src/features/layout`    | Independent panel visibility controls                         | Camera and model state                |
| `src/app`                | Composition, current selection, dialogs                       | Per-frame work                        |
| `src/shared`             | Small reusable browser/UI utilities                           | Domain rules                          |

The dependency direction is **app → features → core**, with content satisfying core contracts. A feature can be replaced without changing the catalogue contract. Keep core modules free of React and Three.js imports so logic stays independently testable.

## Add a showcase

1. Prepare a versioned GLB. Record the source, redistribution permission, credit requirements, and any adaptation.
2. Create a `defineShowcase(...)` record under `src/content`. It declares the asset URL, visual groups, node names, separation offsets, initial camera, normalization extent, and orientation.
3. Declare only supported capabilities. Animation clips and optional alternate animation nodes are content settings. `sectionNodes` identifies existing outer surfaces that can be hidden; it does not generate interior geometry.
4. Register the record in `src/content/catalog.ts`. No renderer edits should be necessary for a model using the existing contracts.
5. Verify initial framing, selection, full separation/return, reset, all animation states, and asset credits. Test on a reference desktop and phone before adding a quality tier.

The Lightning artwork has one animated skinned mesh plus six static presentation groups sharing textures. `animation.displayNodes` explicitly declares that arrangement. Other models can animate their existing groups without declaring alternate nodes.

## Categories and object references

The desktop studio composes category navigation, the 3D viewport, and object information as independent features. Top-right buttons toggle the two panels and bottom controller independently through animated CSS grid tracks, keeping the same viewer and controller mounted. Hidden contents become inert immediately so keyboard focus cannot enter collapsed panels. On narrow screens, both panels use the existing accessible dialog. Panel visibility belongs to the application shell, outside the model state.

Set a showcase's `category` and optional `subcategory` in its content record. `src/content/categories.ts` controls the preferred category order and visible empty subcategories; categories found in registered content are also included automatically. The application passes that data into the reusable sidebar. The sidebar owns a permanently visible search field and displays matching thumbnail cards in the same panel when the query is nonempty. Search indexes human-readable catalogue metadata once per item-list change and matches case-insensitive query words in any order. Clearing search leaves focus in the field and reveals the previous category expansion. On phones, search stays within the existing browse dialog; Escape clears a nonempty query before dismissing that dialog.

A showcase declares a Wikipedia article title and URL. The inspector fetches the plain-text article summary from Wikipedia only while visible in an active tab. It aborts hidden requests, caches at most 50 summaries for five minutes, and provides manual retry and a source link on failure. The response supplies the displayed title and factual text; no local historical summary or infobox duplicates are maintained. Article text retains its separate CC BY-SA attribution, documented in ATTRIBUTION.md.

Each object may also declare a static `thumbnail` with a versioned media path, alternative text, and intrinsic dimensions. The collection uses compressed images instead of creating additional 3D canvases. `ObjectThumbnail` reserves its aspect ratio but mounts its image only after entering the visible area, including clipping by a scroll container. Once mounted, the image remains available for scrolling back; `content-visibility: auto` lets the browser skip off-screen thumbnail content. Record derivative artwork provenance alongside the original asset.

`src/shared/use-element-visible.ts` pools visibility subscriptions through one IntersectionObserver and disconnects it when no targets remain. The viewer uses continuous visibility updates; thumbnails use the `once` option. If the browser lacks IntersectionObserver, content remains functional through a visible fallback. The catalogue, collection, thumbnails, and inspector are memoized, and application callbacks stay stable so unrelated viewer controls do not rerender those features.

`src/shared/ScrollArea.tsx` provides native scrolling with a thin draggable overlay. The page, sidebars, and dialogs share it; scrollbars do not reserve layout space. The viewer has no global letter-key shortcuts. Its controls remain focusable and usable with standard keyboard navigation.

## Themes and interface motion

Theme colors are shared CSS variables in `src/app/theme.css` and `src/app/theme-modes.css`. The separate theme feature owns the dark/light preference, safe local storage, and cross-tab synchronization. The document applies a saved theme before the first paint; theme changes never recreate the 3D scene.

`src/app/motion.css` owns common durations, easing, hover/press feedback, content arrivals, and dialog transitions. Feature modules own their layout-specific movement. The controller uses CSS container queries so its compact action row adapts to the actual workspace width when side panels change. Object action names and separation stay visible; icon tools retain accessible names and hover titles. The slider keeps its native range interaction and detent callbacks while omitting duplicate endpoint captions. Motion stops when interactions settle, and the final reduced-motion rules apply across all modules. Native dialogs retain their focus trap through exit and restore focus before unmounting. Category content becomes inert while closing and unmounts after its transition; collapsed catalogs do not keep every thumbnail resident. Scroll areas recalculate after content animations finish as well as on resize and scroll.

## Add a system

Put standalone policy/state in `core`, renderer integration in a small viewer component, and controls in the owning feature. Examples include annotation tools, guided tours, alternative lighting, and external sound packs. A new domain must not be implemented as a switch on a specific model ID inside the renderer.

For a viewer capability, extend the capability contract, validate its required content, implement its reducer transitions and renderer adapter, then expose controls only for supporting items. Avoid adding a generic event bus, service locator, or plugin framework until an actual integration needs one. Explicit typed contracts are the extension mechanism today.

## Object actions and studio preferences

Showcases may declare typed `actions` records. Each action selects a named one-shot animation clip or a bounded presentation recoil, plus an optional sound cue. The renderer is driven by these records; it does not switch on rifle IDs. Unsupported actions carry an explicit unavailable reason. Lightning currently exposes Shoot and Chamber; Reload remains unavailable until a dedicated animation is supplied. Attachments are a disabled control pending attachment assets and behavior.

Action completion carries a revision token, so delayed completion cannot stop a newer action. Selection, separation, or Reset cancels the current action. Hidden viewports pause finite action progress and resume without replacing the camera or model. Legacy play commands remain available to the optional integration adapter.

Studio background belongs to the application shell, with validated hex colors in local storage and a theme-default option. Background selection never modifies the 3D model or camera. The GitHub destination is configured in `src/content/project.ts`; the header control stays disabled until a URL is supplied.

## Runtime ownership

- React controls selection, quality, separation targets, and animation mode. It does not receive per-frame pose updates.
- Mesh transforms and animation mixers update in the frame loop. Separation is computed from saved original positions, never accumulated offsets.
- Full-name labels project their part transforms into an overlay with leader lines and collision-free columns. Narrow viewports use rows above and below the object to keep its center visible. Their dimensions are cached until resize; position updates do not use React state or request an ongoing render loop.
- Camera configuration stays stable across control changes. Framing runs on the first model view and explicit Reset, while layout resizing retains orbit, zoom, and target. Projection adapts to available space so revealing more viewport does not enlarge and crop the current view.
- Starting animation assembles the model; pause preserves its pose. Selecting a visual group or changing separation returns to inspection. Reset clears inspection state while preserving quality.
- A resource lease owns an in-flight request and loaded GLTF. Immediate React remounts can reclaim it. The last release cancels unused work or disposes GPU resources; a late decoder result is disposed too. Consumers must ignore resolved promises after releasing their lease.
- The current pool retains zero idle models. Use a measured memory budget before increasing that limit.
- Rendering rests when unchanged. Hidden tabs, a fully off-screen viewport, and covering dialogs stop the frame loop, animation mixer, and label updates. `ViewerCanvas` combines page visibility, element visibility, and its optional `obscured` prop without unmounting the scene. Returning to the viewer invalidates a frame and resumes the existing camera, resources, and playback state. Automatic resolution responds to sustained slow frames with hysteresis; explicit quality modes retain their selected cap.
- Audio begins only after a user gesture, with an enabled preference and a visible mute control. The reusable mechanical slider emits interaction-start and detent callbacks; it never owns an AudioContext. Its pure detent policy tracks 5% boundaries with a 40ms rate limit and ignores programmatic value changes. The audio engine lazily creates one original click buffer, limits voices to four, and drops rapid ticks without a queue. Ordinary controls never play click sounds. Shooting and chamber actions use two additional original synthesized buffers, created lazily and reused under the same four-voice limit. Audio begins with the rendered action after a user gesture unlocks the context.

## Deliberate limits of this release

One showcase is included. Its broad visual groups are not a technical disassembly sequence, and its source artwork does not provide a complete interior. The Inside control is therefore absent for this model. New models with existing internal geometry can declare surface hiding through `sectionNodes`.

The current asset uses Meshopt and 1024px WebP textures. KTX2/Basis would further address GPU texture compression for future texture-heavy models; it is not yet part of the runtime decoder configuration. Measure actual texture pressure before changing this small asset.

WebGL2 is the production renderer. WebGPU, physics, accounts, a database, and multi-object scenes are future system decisions rather than dependencies of the first viewer.

## Optional browser integration

The isolated viewer-tools adapter feature-detects document.modelContext. Supporting browsers can read the current view or configure it through the same validated commands and reducer as the interface. Registration is removed on unmount. Unsupported browsers do nothing. The command contract is unit-tested; native WebMCP execution requires a supporting browser and has not been verified in this environment.
