# Unfold Studio · by MaXoS

An interactive 3D collection for taking a closer look at how objects are composed. The first local showcase features **Lightning**, a CC0 rifle artwork by LonesomeDucky.

## Run locally

Use a current Node.js LTS release compatible with Vite and the Cloudflare plugin, then:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. No account or cloud credentials are needed for development. The 3D model and sound generation work locally; article text is fetched from Wikipedia when its panel is visible.

## Included experience

- Black and gray studio with dark-red controls and bright-red accents
- Compact right-aligned toolbar with crisp vector icons; each panel icon shows visibility inside its matching panel segment
- Dark and light themes with a remembered preference
- Category sidebar with Firearms subcategories, large object thumbnails, and inline collection search
- Readable 16px text and thin overlay scrollbars that do not shift the layout
- Quick facts and summary text fetched from Wikipedia, with a link to the source article
- Interactive 3D orbit and zoom preserved while controls and panels change
- Six selectable visual groups with full-name labels
- Compact controller with Shoot, Reload, and Chamber action buttons, icon tools, and a separation slider
- Saved studio background presets and a custom color picker
- GitHub and attachment buttons ready for their future links and assets
- Smooth reversible separation with a charcoal slider handle, a thin rail that expands near the handle, animated ruler ticks, and mechanical detent clicks
- Animated panel reveals, category expansion, cards, selection details, dialogs, and theme controls
- One-shot shooting presentation and the source artwork’s Pump clip for chamber cycling, with speed controls
- Full-name labels with leader lines that follow their groups and avoid overlap
- Viewport-aware rendering that pauses when the viewer is off-screen or covered by a dialog, plus thumbnails loaded only when visible
- Automatic, high, and balanced display settings
- Original synthesized firearm effects and slider detents; ordinary buttons stay silent
- Responsive collection, inspector, settings, and on-screen controls
- Loading/error recovery and hardware-rendering fallback messaging

All viewer actions are available through the on-screen controls. The top-right layout buttons show or hide categories, the bottom controller, and object information. Their internal panel indicators fill when visible and empty when hidden. On phones, the side-panel buttons use the shared dialog. The collection search field is always visible. Type to match names, categories, descriptions, and part labels; clear the query to restore the category tree. The theme button switches between dark and light appearances. Motion respects the device’s reduced-motion preference. Only an explicit Reset or opening a model restores its starting view.

## Stack

React, TypeScript, Vite, Tailwind CSS, Three.js, React Three Fiber, selected Drei helpers, native Web Audio, and Cloudflare Workers Static Assets. A small Worker handles page-entry requests for request metrics and country logs; models, textures, scripts, and other matching assets are served directly. Media URLs support an R2 custom domain. Vitest verifies core and Worker logic; Playwright checks browser behavior.

## Work on the project

```sh
npm run check          # types, unit tests, production build
npm run test:browser   # desktop + mobile browser checks
npm run preview       # local production preview
npm run cf:typegen    # regenerate Cloudflare binding/runtime types
npm run assets:build  # reproduce the prepared artwork from its source GLB
```

Install Playwright Chromium once with `npx playwright install chromium`, or set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome. Node/package dependencies are locked in `package-lock.json`; installation does not deploy the project.

For Cloudflare's direct Git integration, set **Build command** to `npm run build` and **Deploy command** to `npx wrangler deploy --config dist/wrangler.json`. After a manual deployment, new page entries feed Worker request metrics and country logs; these are not unique-visitor counts. See the [deployment guide](docs/DEPLOYMENT.md#cloudflare-dashboard-git-integration-workers-builds) for the dashboard settings and a local dry run.

## Extend it

- [Architecture and adding systems](docs/ARCHITECTURE.md)
- [Asset sources and preparation](docs/ASSETS.md)
- [Performance rules and validation](docs/PERFORMANCE.md)
- [Owner-controlled Cloudflare releases](docs/DEPLOYMENT.md)

The renderer is independent of the rifle. Showcases declare presentation, visual groups, and supported capabilities through typed content records. New systems belong in focused feature modules backed by independently testable core logic.

## Current scope

This release contains one artwork, not a complete model library. Its groups are visual presentation groups, not a technical disassembly sequence. A complete interior is not included in the source asset; an Inside control is therefore not advertised. Reload is a disabled placeholder until a dedicated reload animation is supplied. Attachments are also a future feature. Shooting is a short presentation recoil, and firearm sounds are original synthesized effects rather than recordings. Physical-device performance targets still need measurements on chosen devices.

All committing, uploading, and publishing remains manual and owner-controlled. The GitHub release workflow runs only when explicitly triggered by the owner.

## Licensing

Unfold Studio's software/code is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).

Required Notice: Copyright (c) 2026 MaXoS

Our publication policy is to keep the full source code publicly available on GitHub. Anyone may view, study, fork, modify, and use the project for personal, educational, research, and other non-commercial purposes under the license.

**Commercial use requires permission.** Commercial use, resale, paid hosting, inclusion in commercial products or services, or monetization of the project requires explicit written permission from the copyright owner.

Commercial licensing: [meysamresan@voxe.group](mailto:meysamresan@voxe.group)

This is a plain-language summary; the full software license governs, including its permitted purposes. Third-party assets and dependencies retain their original licenses; see [ATTRIBUTION.md](ATTRIBUTION.md). Original project-owned assets have separate [non-commercial asset terms](ASSET_LICENSE.md).
