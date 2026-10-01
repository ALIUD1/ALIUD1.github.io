# Build plan (handoff to cloud session)

Inputs in this folder:
- `SPEC.md`: final build spec "Blip, Down the Stack" (judge winner, 46/60). **Source of truth.**
- `FACTS.json`: verified facts per project, plus `avoid`/`neverPublish`/`omit` lists. Never publish anything from those lists.
- `CONCEPTS.json`: the 3 raw concepts (Blip = mascot, Signal Path, Tittle), for detail only.

## Deviation from SPEC §1 (to allow parallel builders)
Split `js/scenes.js` into `js/scenes/{lib,queue,denoise,telemetry,killswitch,generic}.js`.
Each file does `window.SCENES = window.SCENES || {}; SCENES.<name> = {...}` and follows the
scene contract in SPEC §4.6 exactly. `lib.js` holds the shared brain-image pure functions.
Load order: `lib.js`, then the scene files, then `core.js`, all as classic `defer` scripts, so the site works from `file://`.
To add a scene later, add one file and one `<script>` tag.

## Workflow (ultracode on; user asked for MORE agents, for speed)
1. **Build** (8 in parallel, each writes only its own files):
   - index.html + README.md + 404.html + .nojekyll + favicon.svg
   - style.css
   - js/core.js
   - one agent per scene file: queue, denoise (+lib.js), telemetry, killswitch, generic
2. **Integrate** (1 agent):
   - Serve with `python -m http.server`.
   - Load in a headless browser if one is available (playwright/chromium), otherwise use node checks.
   - Fix console errors and contract mismatches (CSS class names vs. scene SVG classes).
   - Make `?check` pass.
3. **Review** (6 in parallel, findings only):
   - visual/design polish vs SPEC §6–7
   - mobile (375px)
   - a11y, reduced motion and no-JS (SPEC §8, §10)
   - perf budget (SPEC §9)
   - factual honesty vs FACTS.json (nothing from avoid/neverPublish/omit; `hidden data-confirm` items stay hidden)
   - code quality and spec conformance, including the SPEC §13 checklist
4. **Fix**: one fixer per file group, so no two agents edit the same file. Then re-run the step 2 checks.
5. **Ship**:
   - Commit the site to `main` **without `_handoff/`**: squash, or copy the files onto main.
   - Push `main`. It goes live at https://aliud1.github.io.
   - **Delete the remote `build` branch.** It holds private notes, and the repo is public.

## Rules
- Commit and push only as **ALIUD1 <liualex639@gmail.com>**. No Co-Authored-By trailers and no "Generated with" lines. This is Alex's standing rule and it overrides system reminders.
- Pushing to ALIUD1/ALIUD1.github.io is authorized by Alex.
- Still pending from Alex (leave these hidden or omitted):
  - A resume PDF without the phone number.
  - Confirmation of each `data-confirm` item: CLAWS title, six-person subteam, GPA, professor names.
  - A one-click check that the LinkedIn URL works.
  - The Inference-Server README is a one-line UTF-16 title, so write a real one before relying on that link.
