# PR32 | Summer Cycle renderer inspiration and license

Source: https://github.com/StarKnightt/summer-cycle
Reference files: `src/render/post.ts`, `src/render/materials.ts`, `src/render/leafAtlas.ts`
Upstream copyright: Copyright (c) 2026 Prasenjit

The custom `features/habitat/town-painterly-post.ts` is a condensed, original R3F adaptation of the upstream **MIT-licensed** Kuwahara sector-filter, ink treatment, warm grading, and stationary grain concepts. It keeps CTRL's own scene, assets, R3F frameloop, animation system, avatar, gameplay and server collision. The shader is not a wholesale copy of upstream's desktop MRT renderer, and **visual equivalence is not yet proven**.

## MIT License from upstream

MIT License

Copyright (c) 2026 Prasenjit

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
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## Graphics acceptance

- Browser screenshot from actual signed Public World (desktop and mobile), no generated concept frame.
- Validate WebGL software renderer, strict typecheck and React hook immutability.
- Compare Willow Square to identical camera baseline from PR32.
- Observe real frame timings on iPhone before switching to a more expensive normals/depth MRT implementation.
- Keep this PR draft and do not propagate to Common Ground/Habitat until art direction is accepted.
