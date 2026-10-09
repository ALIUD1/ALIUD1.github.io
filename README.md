# aliud1.github.io

Alex Liu's portfolio: plain HTML, CSS and vanilla JS. No frameworks, no build step. Live at https://aliud1.github.io.

- **Add a project:** paste a new `<article class="project">` inside `<section id="work">` in `index.html`. The comment above the projects explains every attribute. Without a `data-scene`, it gets the generic "Blip builds it" scene. Then add one row to the hero `<nav class="index">`, same order and same h2 text; `index.html?check` fails if they drift.
- **Reorder:** move the `<article>` blocks. Kicker numbers and the side rail follow page order.
- **Hide a project:** delete the block (or keep it on a private branch). An HTML comment (`<!-- … -->`) only hides it on screen; the text is still public in view-source and in this repo.
- **Publish a pending item:** anything marked `hidden data-confirm="…"` is waiting on a confirmation. Delete `hidden` to publish it. Open the page with `?check` to list what is still pending. Hidden text and its `data-confirm` note are still in the page source, so keep notes generic and leave out anything private.
- **Add a custom scene:** add one file under `js/scenes/` and one `<script defer>` tag before `js/core.js`.
- **Preview locally:** double-click `index.html`, or run `python -m http.server` in this folder and open http://localhost:8000.

## Two pages

`about.html` shares these with `index.html`: the `<head>` (apart from the title, the description and the URLs), the boot `<script>` inside it, the Blip sprite block, the top nav (apart from the hrefs and `aria-current`) and the footer. That is the keep-in-sync list. Change one, change the other.

- **Photo slots:** each slot on `about.html` is a `<li hidden data-confirm="photo: name">` around a `<figure>`. To publish one: add the file under `img/` (strip the EXIF location data, keep it under about 300 KB, crop it to 4:3, make the `width`/`height` attributes match the file), write the alt text and caption in your own words, and delete `hidden`.
- **Before pushing:** open `index.html?check` and `about.html?check`. The food sentence on About ("Those go below…") is a hidden slot that ships with the first food photo.
