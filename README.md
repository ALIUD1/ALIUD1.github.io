# aliud1.github.io

Alex Liu's portfolio: plain HTML, CSS and vanilla JS. No frameworks, no build step. Live at https://aliud1.github.io.

- **Add a project:** paste a new `<article class="project">` inside `<section id="work">` in `index.html`. The comment above the projects explains every attribute. Without a `data-scene`, it gets the generic "Blip builds it" scene.
- **Reorder:** move the `<article>` blocks. Kicker numbers and the side rail follow page order.
- **Hide a project:** delete the block (or keep it on a private branch). An HTML comment (`<!-- … -->`) only hides it on screen; the text is still public in view-source and in this repo.
- **Publish a pending item:** anything marked `hidden data-confirm="…"` is waiting on a confirmation. Delete `hidden` to publish it. Open the page with `?check` to list what is still pending. Hidden text and its `data-confirm` note are still in the page source, so keep notes generic and leave out anything private.
- **Add a custom scene:** add one file under `js/scenes/` and one `<script defer>` tag before `js/core.js`.
- **Preview locally:** double-click `index.html`, or run `python -m http.server` in this folder and open http://localhost:8000.
