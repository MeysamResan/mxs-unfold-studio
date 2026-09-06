# Performance contract

## Workload

A large catalogue with one active detailed showcase. Target reference desktop/laptop and mid-range phone devices. A large catalogue must not become a large simultaneously resident 3D scene.

## Implemented controls

- The interface and 3D viewer are separate JavaScript chunks.
- Wikipedia summaries are fetched only while their reference is visible, with cancellation, a ten-second timeout, explicit retry, and a bounded five-minute cache. No article images or HTML are loaded.
- The catalogue does not load extra model files. Thumbnail image elements and requests wait until their reserved cards enter the visible scroll area; loaded images remain available for return scrolling. Fixed aspect ratios prevent image-load layout shifts, and `content-visibility: auto` skips eligible off-screen thumbnail layout and paint.
- GLTF fetches can be cancelled and have a 30-second timeout.
- Shared resource leases avoid duplicate in-flight work during immediate remounts.
- Last release disposes owned geometry, materials, textures, and skeleton resources.
- Meshopt reduces geometry transfer; the bundled artwork uses resized WebP textures.
- Demand rendering stops when interaction settles. A hidden tab, fully off-screen viewer, or covering dialog suspends the frame loop, animation mixer, and label updates. A pooled IntersectionObserver tracks actual visibility, including scroll-container clipping. The canvas, camera, and loaded resources survive suspension.
- Automatic quality samples 90 rendered frame intervals, ignores idle gaps, and changes pixel density only after sustained evidence with a five-second cooldown. Explicit quality modes are available.
- UI state is separate from per-frame transforms. No per-frame React state dispatches. Memoized catalogue and inspector features use stable callbacks to avoid unrelated control updates.
- Lighting uses a small local generated environment. There is no remote HDR download, real-time shadow pass, or postprocessing chain.
- Audio unlocks only after a user gesture. All audio voices are capped at four; ordinary UI clicks are silent. Firearm effects reuse two lazily generated buffers, and finite object actions return rendering to idle after completion; mechanical detents reuse one 36ms buffer and are limited to one every 40ms, without queued playback.
- Panel and controller toggles keep the existing canvas and model resident. Camera framing is independent of routine UI updates; projection resizing preserves apparent scale when the viewport grows.
- Interface motion uses bounded CSS transitions and animations with reduced-motion support. There is no continuous decorative animation or animation-library dependency. Theme changes reuse the existing scene.
- Full labels update only on rendered frames and rest with the scene; their dimensions are measured only on mount and resize.

## Goals, not measured hardware guarantees

Target 60 FPS on the reference desktop and stable 30 FPS or better on the reference mid-range phone. Lower resolution automatically where useful. Choose and record actual devices before claiming those targets are met.

Measure cold and warm loads separately. Keep interface readiness, model download/decode, and first rendered frame separate. Dev tools expose `unfold:model-load` and `unfold:model-first-frame` performance entries. Development builds also expose `window.__UNFOLD_DEBUG__` with frame counts, draw calls, triangles, geometry/texture counts, DPR, and camera pose. These counts are not exact GPU-byte measurements and are not sent anywhere.

## Verification

1. Run unit checks for transitions, resource lifetime, URL resolution, quality policy, and audio races.
2. Run browser checks at desktop and mobile viewports. These cover actual model loading, selection, separation, labels, pause/resume, reset, settings, search, and idle rendering. Camera regressions orbit and zoom before operating controls, toggling panels, and entering fullscreen.
3. Test the production build on named physical devices. Browser mobile emulation tests layout and touch-sized interactions; it does not reproduce a phone GPU.
4. Before expanding the catalogue, repeat model switching and inspect memory after resources settle. Before accepting a heavier asset, measure decoding and shader stalls, frame-time percentiles, draw calls, and texture pressure.

KTX2 decoding, multiple model quality variants, real-device frame-rate benchmarks, and network-throttled production budgets remain future measured work. Do not describe this prototype as already validated on physical phones.

## Local validation — 2026-09-06

The production build was measured in local Chrome at 1440 × 1000, DPR 1, with a warm cache, no network throttling, and no CPU throttling. These results describe this local run, not cold-load or physical-phone performance.

| Load measurement           | Result |
| -------------------------- | ------ |
| First contentful paint     | 88 ms  |
| Largest contentful paint   | 580 ms |
| First rendered model frame | 495 ms |
| Cumulative layout shift    | 0.00   |

A separate production check at 1024 × 600 counted native WebGL draw calls in equal 500 ms windows while changing viewer visibility:

| Viewer state                     | Draw calls |
| -------------------------------- | ---------- |
| Visible, animation playing       | 45         |
| Fully off-screen                 | 0          |
| Visible again, animation resumed | 45         |
| Covered by a dialog              | 0          |
| Dialog closed, animation resumed | 46         |
| Paused and idle                  | 0          |

The same canvas survived these transitions and no additional model requests occurred. Development-only diagnostics were absent from the production build.

Validation passed 20 unit tests, TypeScript, formatting, the production build, and 29 browser tests; one desktop-only fullscreen/sidebar test is intentionally skipped on mobile. Visibility tests verify preserved camera and playback state, no off-screen frames, and recovery when a model finishes loading behind a dialog. A test-only 40-object catalogue verifies that jumping to the bottom requests the visible thumbnail without fetching skipped objects, and that returning to loaded cards adds no image requests.

The slider and toolbar were also checked at 1440, 393, and 320 px widths in dark and light themes; toolbar checks included DPR 1 and 2. Mouse, touch, keyboard range adjustment, detent sound, and mute behavior passed. No dependencies were added for these changes.

This implementation keeps lightweight catalogue card markup mounted; it defers images and skips eligible off-screen thumbnail rendering rather than virtualizing the entire list. Revisit list virtualization if measured catalogue size or DOM cost warrants it.
