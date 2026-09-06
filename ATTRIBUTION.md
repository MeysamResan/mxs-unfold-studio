# Attribution and third-party licenses

The software license in [LICENSE](LICENSE) applies to project-owned software/code. It does not relicense third-party code, 3D models, animations, textures, sounds, images, icons, fonts, or other third-party materials.

**Third-party assets retain their original licenses.** Neither the software license nor [ASSET_LICENSE.md](ASSET_LICENSE.md) adds non-commercial restrictions to those materials. Use of each third-party item is governed by its original terms, including any rights those terms grant for commercial use. Permission to use a third-party asset does not grant commercial rights to Unfold Studio's separately licensed code or original assets.

## Lightning Pump Action Rifle

- **Creator:** LonesomeDucky
- **Source:** [Lightning Pump Action Rifle on OpenGameArt](https://opengameart.org/content/lightning-pump-action-rifle)
- **Original archive:** [lightning_pump_action_0.zip](https://opengameart.org/sites/default/files/lightning_pump_action_0.zip)
- **Original license:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) ([legal text](https://creativecommons.org/publicdomain/zero/1.0/legalcode))
- **Bundled file:** `public/media/models/lightning-226462e0eb86.glb`
- **Contents:** 3D geometry, embedded PBR textures, skinning, and the retained Pump animation
- **Source and license verified:** 2026-09-06

The prepared file adds six visual groups, resizes textures to 1024px WebP, retains the Pump clip, removes unused data, and applies Meshopt compression. The included prepared artwork remains provided under CC0; no project non-commercial restriction is added to it. See [asset preparation documentation](docs/ASSETS.md) for provenance and reproduction instructions.

The Lightning collection thumbnail in `public/media/thumbnails/` is a locally rendered still of the included Lightning GLB. It preserves the original artwork's CC0 license and is not covered by the project's software or original-asset licenses.

## Wikipedia article text

The object information panel fetches the selected article's plain-text summary from [Wikipedia's Page Content Service](https://www.mediawiki.org/wiki/Page_Content_Service#JSON_endpoints) and quick facts from its lead-section infobox through the [MediaWiki Parse API](https://www.mediawiki.org/wiki/API:Parsing_wikitext). Article titles, facts, and summary text come from Wikipedia; the panel does not substitute locally written historical descriptions.

- **Authors:** Wikipedia contributors, credited through the linked source article and its revision history.
- **Current article:** [Colt Lightning rifle](https://en.wikipedia.org/wiki/Colt_Lightning_rifle).
- **Text license:** [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/), subject to any additional notices on the source article.
- **Presentation:** The API's plain-text summary is displayed without editorial rewriting. Selected infobox fields are presented as quick facts with simplified labels and citation markers removed. Article HTML is parsed into text, never inserted into the interface; images and other article media are not embedded.
- **Reuse policy:** [Wikimedia Terms of Use, section 7](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use#7._Licensing_of_Content).

Wikipedia text retains its original license. The project's PolyForm Noncommercial software license and original-asset license do not restrict that text or replace its attribution and share-alike requirements. Future article references must preserve their applicable source notices. The panel links to the source article; contributor and license notices are recorded here.

## GitHub icon

- **Source:** [Simple Icons GitHub mark](https://github.com/simple-icons/simple-icons/blob/develop/icons/github.svg).
- **License:** [CC0 1.0 Universal](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md).
- **Bundled rendering:** `src/shared/GitHubIcon.tsx`, adapted only for React and current-color rendering.
- The icon retains its source license. GitHub branding remains subject to the owner's trademark rights.

## Lucide and Feather icons

Interface icons are supplied by `lucide-react` (version 1.41.0 in the current lockfile), including icons used in the application header. They are third-party artwork, even when displayed alongside the Unfold Studio name.

- **Project:** [Lucide](https://lucide.dev/)
- **Source and license:** [Lucide repository license](https://github.com/lucide-icons/lucide/blob/main/LICENSE)
- **License:** ISC, with the package's listed Feather-derived icons under MIT
- **Copyright holders:** Lucide Icons and Contributors; Cole Bemis for the specified Feather-derived icons

The complete notice from the installed package's `LICENSE` is reproduced below. These notices apply to the icons and package material described in them, not to Unfold Studio's original software.

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Other dependencies and future assets

Third-party software dependencies retain the licenses and notices supplied by their respective authors. This repository's software and original-asset licenses do not replace dependency licenses. Preserve applicable dependency notices when redistributing the project or its build output.

There are currently no separate third-party sound files, bundled font files, or standalone image/texture packs. The model's textures are included in its GLB, the font stack uses fonts available on the user's device, and slider detents and synthesized firearm effects are generated by project code.

For each future third-party asset, record its file path, creator, source, original license, and any adaptations here before redistribution. An asset's presence in the repository does not establish project ownership or automatically place it under either project license.

Original project-owned assets are identified and licensed separately in [ASSET_LICENSE.md](ASSET_LICENSE.md).
