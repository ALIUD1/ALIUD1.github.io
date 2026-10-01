Alex

## Scoring

| Criterion | Tittle (particle swarm) | Signal Path (schematic) | Blip (mascot) |
|---|---|---|---|
| First 5 s | **9**: the name assembling from dots is a real wow, but the h1 goes transparent, so the hero depends on font sampling working | **7**: degree, date and GPA land in 2 s and it reads as credible, but a drafting grid with an IC chip reads as a template to non-engineers | **8**: a huge name plus a creature landing on the i is warm and legible in one beat; small risk of reading as "cute" |
| Memorability / personality | **8**: people would call it "the dot site", but a 48-particle blob is an effect, not a creature | **6**: the packet is a 10 px square with no face, and the page has only one joke; schematic portfolios are common | **10**: the only actual character, with eyes, reactions, squash, the goldfish and the mallet |
| Truthful, specific mechanics | **8**: the DDIM caption and both batch-close rules are exact. But the "always says Blocked 1" gag is false (one watcher counts up), and it puts the unconfirmed CLAWS title in the hero | **9**: the most careful (teammate blocks drawn dashed, names withheld). It loses a point for clutter that invites mistakes (BOM auto cross-refs, boot-log claims) | **8**: RPUSH/BLPOP, 8 jobs or 200 ms, MGET/DEL and the 24 B reply are all right. But it publishes the unconfirmed title, the six-person subteam and the professor names, and relies on untagged illustrative values |
| One-pass feasibility | **3**: 1,750 particles with index-range ownership, text and path samplers, and shatter physics. The 4×8 tray Inference diagram can't be read at 750 phone particles | **6**: the right engine (SVG, everything a pure function of scroll), but it sprawls: netlist, BOM, git graph, legend, shortcuts, boot log, terminal parser, and two layouts per scene | **5**: SVG is the right medium, but path morphing, WAAPI trigger/undo pairs (they desync when you scrub mid-clip), and 12+ costumes and gag variants are too much |
| Mobile / perf / a11y / reduced motion | **5**: a full-viewport canvas redraws every frame, it needs adaptive degradation, and even the reduced-motion stills need the particle engine | **8**: only transform and dashoffset animate, and the loop stops when idle. Each scene needs a duplicate tall layout | **7**: light SVG and static posters. But the fixed-overlay spring works in screen space, so the character lags sticky stages on every scroll, and the concept doesn't address it |
| Extensibility via one data file | **8**: the constellation generic scene is solid | **9**: numbering, netlist and title blocks all come from the DOM | **8**: the "Blip builds it" generic scene builds from the article's steps and stack |
| **Total /60** | **41** | **45** | **46** |

**Verdict:** Blip wins, because the brief asks for one character with personality that reacts to the visitor, and only Blip is a character. Its weak points (engine and scope) can be fixed by taking Signal Path's engine. Signal Path's weak point (no character) can't be fixed without turning it into Blip. Tittle's best ideas come along as small additions: the DDIM closed-form caption, the "number I won't publish yet" note, the "Say hi" landing, and the forbidden-phrase self-test.

---

# FINAL BUILD SPEC: "Blip, Down the Stack"

## 0. Decisions

- **Character:** Blip, the coral gumdrop from the mascot concept. It is the only saturated warm color on the page.
- **Engine (from Signal Path):** inline SVG drawings built from a few primitives; every path uses `pathLength=1`, so a reveal is just a dashoffset; the scroll-driven state is a pure function of scroll position and runs backwards correctly; click demos run on their own layer and never touch the scroll state; teammate and context blocks are drawn dashed; classic `defer` scripts, so a local `file://` preview works.
- **Beat clock (from Tittle):** each `<li>` in a project's `ol.steps` is one animation beat, so the text and the drawing can't drift apart.
- **Honesty mechanism:** any claim waiting on Alex ships with `hidden data-confirm="…"`. To publish it, he deletes `hidden`. `?check` lists everything still pending.
- **Taken from Tittle:** the DDIM η=0 caption, the "no speedup number yet" note, Blip coming home as the dot of the i in "Say hi", and the `?check` forbidden-phrase scan.
- **Cut:** path morphing (replaced by costume crossfade), WAAPI trigger/undo pairs, the logbook costumes except Spot, the Noverwatch gag props (only the text escalates), the denoising lens, gauge spikes, the terminal input parser, keyboard shortcuts, the legend sheet, the boot log, the netlist and BOM, sessionStorage, the hidden-tab title, grain texture, the floor shadow, and the sleepy and dizzy expressions.
- **Fixes to the concepts:**
  - "Blocked n" counts up within one watcher, so it is never shown as "always 1".
  - The CLAWS title, six-person subteam, GPA and professor names are all hidden until Alex confirms them.
  - Blip's spring runs in its host's local coordinates (section 3.4), so it stays glued to sticky stages while you scroll.

## 1. Files

Create these in `C:/Users/alexl/code/portfolio/`. That folder does not exist yet. The repo is `ALIUD1/ALIUD1.github.io`, served by Pages from `main` at the root. No build step, no libraries.

| File | Contents | Budget |
|---|---|---|
| `index.html` | Every word on the site, plus the projects block, which is the one data file. Also a 1-line inline head script and a hidden SVG sprite with Blip's symbols. | ≤ 40 KB |
| `style.css` | Tokens, layout, sticky figures, Blip costumes and expressions, the `.rm`, `.no-js` and print rules. | ≤ 20 KB |
| `js/scenes.js` | `window.SCENES = {queue, denoise, telemetry, killswitch, generic}` plus the brain-image library (pure functions). | ≤ 900 lines |
| `js/core.js` | Boot, measuring, scroll to beats, the rAF loop, Blip physics and hosts, rail, captions and tips, controls, announcements, theme and motion toggles, copy-email, `?check`. | ≤ 550 lines |
| `favicon.svg` | Blip's face, with an internal `prefers-color-scheme` style. | |
| `404.html` | "Blip ran BLPOP and got None." Static Blip, a link home, inline CSS. | |
| `README.md` | 10 lines: how to add, reorder or hide a project. | |
| `.nojekyll` | Empty file. | |

- **Not created by the builder:**
  - `resume.pdf`: Alex supplies a version without his phone number. Its link stays hidden until then.
  - `og.png`: optional 1200×630 screenshot of the light-theme hero. If it is absent, leave out the `og:image` tag.
- **Load order:** `<script src="js/scenes.js" defer>` then `<script src="js/core.js" defer>`.
- **Head:**
  - `<title>Alex Liu · Michigan CS</title>` and a meta description.
  - `og:title` and `og:description`.
  - `<meta name="color-scheme" content="light dark">`.
  - Preconnect to `fonts.googleapis.com` and `fonts.gstatic.com`.
  - Google Fonts URL: `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=JetBrains+Mono:wght@400;700&display=swap`.
- **Inline head script:** set `html.className='js'`. Inside try/catch, read `localStorage.theme` (into `data-theme`) and `localStorage.motion`. Add `.rm` if motion is `'off'` or if `matchMedia('(prefers-reduced-motion: reduce)')` matches.

## 2. Data file: schema and drafted content

### 2.1 Schema (paste this comment above the projects)

```html
<!-- PROJECTS: one <article class="project"> per project. Page order = order here
     (rail order and "01 ·" kicker numbers follow automatically).
     data-scene: queue | denoise | telemetry | killswitch. Leave it off (or misspell it)
       and the project gets the generic "Blip builds it" scene. Nothing breaks.
     data-accent: signal | ok | warn | danger (default signal).
     ol.steps > li = one animation beat each: <p>plain sentence</p><code>spec line</code>.
       2-9 items. style="--beat:2" makes a beat twice as long.
       data-label="Shuffle" = short node label (≤16 chars) for the generic scene.
     Custom scenes expect a fixed beat count: queue 8, denoise 7, telemetry 6, killswitch 5.
     Anything awaiting confirmation: add  hidden data-confirm="reason". Publish = delete hidden. -->
```

Structure of each article. The order is fixed, and only the elements marked optional may be left out.

```html
<article class="project" id="slug" data-scene="…" data-accent="…">
  <div class="story">
    <header>
      <p class="kicker">…</p><h2>…</h2>
      <p class="becomes">…</p>          <!-- optional -->
      <p class="tagline">…</p><p class="summary">…</p>
      <p class="credit">…</p>           <!-- optional -->
    </header>
    <div class="figure"></div>          <!-- empty; JS fills it; CSS reserves its size -->
    <ol class="steps"><li><p>…</p><code>…</code></li>…</ol>
  </div>
  <div class="details">
    <h3>What I built</h3><ul class="built">…</ul>
    <p class="explored">…</p>            <!-- optional -->
    <aside class="fix"><h3>What I'd fix next</h3><ul>…</ul></aside>  <!-- optional -->
    <p class="note">…</p>                <!-- optional -->
    <ul class="stack"><li>…</li></ul>
    <ul class="links"><li><a href="…">…</a></li></ul>   <!-- optional -->
  </div>
</article>
```

Kicker numbers come from a CSS counter, so they also work without JS:

```css
#work { counter-reset: p }
.project { counter-increment: p }
.kicker::before { content: counter(p, decimal-leading-zero) " · " }
```

### 2.2 Hero (`<header class="hero" id="top">`)

```html
<a class="skip" href="#work">Skip to projects</a>
<nav class="topnav" aria-label="Page"><a href="#work">Work</a> <a href="#experience">Experience</a> <a href="#contact">Contact</a></nav>
<h1>Alex L<span class="i-anchor">i<svg class="blip-static" aria-hidden="true" focusable="false" viewBox="0 0 64 64"><use href="#blip-default"/><use href="#blip-face"/></svg></span>u</h1>
<p class="school">Computer Science (B.S.E.) · University of Michigan College of Engineering · Expected May 2028<span hidden data-confirm="GPA still 3.7?"> · GPA 3.7/4.0</span></p>
<p class="lede">I build the systems around models: training them on a GPU cluster, serving them through a queue, and checking whether my own numbers hold up.</p>
<p class="now">Now: BIM/VDC development intern at Miller Industries · Software engineering researcher in U-M's SOCR lab · Infrastructure team for CLAWS, a NASA SUITS student team</p>
<ul class="contact-row">
  <li><a href="https://github.com/ALIUD1">GitHub</a></li>
  <li><a href="https://www.linkedin.com/in/alex-liu-a77403408">LinkedIn</a></li>
  <li><a href="mailto:liualex639@gmail.com">liualex639@gmail.com</a></li>
  <li hidden data-confirm="add a phone-free resume.pdf"><a href="resume.pdf">Résumé (PDF)</a></li>
</ul>
<p class="cue" aria-hidden="true">scroll. Blip goes first.</p>
```

### 2.3 Project 01: Inference Server

```html
<article class="project" id="inference-server" data-scene="queue" data-accent="signal">
<div class="story"><header>
<p class="kicker">Personal project · Jun–Sep 2026</p>
<h2>Inference Server</h2>
<p class="becomes">Blip becomes a request.</p>
<p class="tagline">An async image-classification server with a Redis queue and batched workers.</p>
<p class="summary">A small model-serving system I built from scratch to learn what happens between an HTTP request and a prediction. A FastAPI server accepts each image and hands it to separate worker processes through Redis. The workers group waiting images into batches, run each batch through ResNet-18 in one pass, and send every answer back to the exact request that is waiting for it. I also wrote the load tester that drives it with up to 1,200 concurrent requests.</p>
</header><div class="figure"></div>
<ol class="steps">
<li><p>An image comes in.</p><code>POST / · multipart upload · FastAPI on Uvicorn</code></li>
<li><p>It gets a 16-byte ticket and parks on an asyncio Future. The event loop keeps serving other requests.</p><code>job_id = uuid4().bytes · pending_jobs[job_id] = Future()</code></li>
<li><p>The image waits in Redis under its ticket. Only the 16-byte id joins the line.</p><code>SET job_id &lt;image bytes&gt; · RPUSH jobs job_id</code></li>
<li><p>Worker processes (four in my tests) pull from one FIFO list. The first idle worker opens a batch.</p><code>BLPOP jobs 1 · torch.set_num_threads(1)</code></li>
<li><p>The batch closes at 8 jobs or after 200 ms, whichever comes first.</p><code>BLPOP jobs 0.05 · BATCH_SIZE = 8 · BATCH_FILL_WAIT_TIME = 0.2</code></li>
<li><p>One round trip fetches every image, and one more deletes them.</p><code>MGET id1 … id8 · DEL id1 … id8</code></li>
<li><p>One ResNet-18 forward pass labels the whole batch.</p><code>torch.stack → [8,3,224,224] → no_grad → [8,1000] → argmax</code></li>
<li><p>Each answer goes home as 24 bytes, and one reader task wakes exactly the right request.</p><code>struct.pack('&lt;16sq') · RPUSH response · BLPOP response 1 · set_result</code></li>
</ol></div>
<div class="details">
<h3>What I built</h3><ul class="built">
<li>Split serving into one async FastAPI frontend and separate worker processes that talk only through Redis, so inference never runs on the web event loop.</li>
<li>Matched responses to requests without polling: each request awaits a Future keyed by its 16-byte id, and one background reader completes the right one.</li>
<li>Replies are a fixed 24-byte binary message, struct '&lt;16sq' (UUID plus int64 class index), not JSON.</li>
<li>Dynamic batching: up to 8 jobs or 200 ms, one MGET, one DEL, and one stacked forward pass under torch.no_grad.</li>
<li>Found why the reader task died silently: redis-py 8's 5 s default socket timeout killed an unbounded BLPOP after 5 s of idle. Fixed it with a bounded 1 s BLPOP and a done-callback that prints the task's exception.</li>
<li>Wrote an asyncio + httpx load generator (10 to 1,200 concurrent requests per level, p25 to p95 latency, failures grouped by status code). I raised its read timeout to 30 s after noticing the 5 s default was dropping slow requests from the stats.</li>
<li>Capped each worker at one PyTorch thread so workers don't fight over cores, and gave the reader its own Redis connection.</li></ul>
<aside class="fix"><h3>What I'd fix next</h3><ul>
<li>Give the Future a timeout. An image that fails to decode currently leaves its request waiting forever.</li>
<li>Put a TTL on payload keys.</li>
<li>Give each frontend its own response list. One shared list means one frontend process.</li>
<li>Find the cause of the 502s that show up from 700 concurrent requests up.</li></ul></aside>
<p class="note">No speedup number yet. The same unbatched code measured about 2× apart on two different days, so batching gets a controlled, interleaved rerun before it gets a number.</p>
<ul class="stack"><li>Python</li><li>FastAPI</li><li>asyncio</li><li>Redis</li><li>PyTorch</li><li>ResNet-18</li><li>httpx</li></ul>
<ul class="links"><li hidden data-confirm="write a real README and remove HANDOFF.md first"><a href="https://github.com/ALIUD1/Inference-Server">Source on GitHub</a></li></ul>
</div></article>
```

### 2.4 Project 02: SOCR BrainGen

```html
<article class="project" id="socr-braingen" data-scene="denoise" data-accent="ok">
<div class="story"><header>
<p class="kicker">Research · SOCR lab, University of Michigan · 2026</p>
<h2>SOCR BrainGen</h2>
<p class="becomes">Blip becomes noise.</p>
<p class="tagline">Synthetic brain MRI with tumors placed by lobe, about 10 seconds per image.</p>
<p class="summary">In the University of Michigan SOCR lab I built an atlas-guided diffusion model that generates synthetic brain MRI slices. You choose where a tumor appears (which lobe, how high in the brain, how large), and about 10 seconds later you get a synthetic FLAIR image with a lesion there. I trained it on the public BraTS 2023 dataset on the university's Great Lakes cluster, added it as a sixth model to the lab's web app, and deployed its backend on Hugging Face ZeroGPU. I also built the harness that scores the lab's generator models.</p>
<p class="credit">The lab's web app and its GAN models came before me; they're my labmates' work. Mine are the conditional diffusion model, its GPU backend, and the evaluation harness. <span hidden data-confirm="confirm Simeone (not Daniel) Marino">Advisors: Profs. Ivo Dinov and Simeone Marino. </span>A manuscript is in preparation.</p>
</header><div class="figure"></div>
<ol class="steps">
<li><p>Pick a lobe and a tumor size. The real panel greys out the 7 of 18 lobe-and-height combinations the data can't support.</p><code>Tumor · Lobe (6) · Slice level (3) · Size (3)</code></li>
<li><p>One random seed drives both the tumor shape and the starting noise, so any image can be regenerated.</p><code>seed → NumPy (mask) + PyTorch (noise)</code></li>
<li><p>Anatomy comes from a held-out real scan in a conditioning bank, plus six lobe probability maps from an atlas.</p><code>T1 from a 42-slice bank · ICBM452 lobe maps</code></li>
<li><p>The tumor is drawn first, inside the chosen lobe. It's an input to the model, not a prediction.</p><code>synth_mask: atlas × compactness × smoothed noise · core = 30% of lesion</code></li>
<li><p>Generation starts from pure static.</p><code>x ~ N(0, I) · 1×1×256×256 · cond 1×8×256×256</code></li>
<li style="--beat:3"><p>Then 200 steps: the U-Net predicts the noise, and the DDIM scheduler removes a calibrated share of it.</p><code>t = 995, 990, …, 5, 0 · 85,261,185-parameter U-Net</code></li>
<li><p>About 10 seconds from click to image on Hugging Face ZeroGPU, about 6.3 s of it on the GPU.</p><code>[-1, 1] → [0, 1] · FLAIR + Tumor Mask PNGs</code></li>
</ol></div>
<div class="details">
<h3>What I built</h3><ul class="built">
<li>Added a sixth model, an atlas-guided conditional diffusion model, to the lab's brain-MRI web app. It took about 8.2k lines across backend inference, API endpoints and UI. The controls grey out the 7 of 18 lobe-by-level combinations the data can't support, so the site never quietly swaps in a different request.</li>
<li>Deployed the backend as one Hugging Face ZeroGPU Gradio Space. The five GANs run on CPU and use no GPU quota; only the diffusion loop goes to the GPU, through a single function rebinding.</li>
<li>The 85,261,185-parameter U-Net loads with strict=True plus a parameter-count check. A non-strict load can silently turn a mismatched checkpoint into random weights that still look brain-shaped.</li>
<li>Wrote an atlas-conforming tumor generator. It seeds the lesion inside the chosen lobe and sizes it to that lobe's area (small 5–12%, moderate 15–35%, large 40–60%), split into edema and an enhancing core. The code is one file kept byte-identical in the research and web repos, and it matched the original SciPy version on all 78 test cases (Dice 1.0).</li>
<li>Built the research pipeline: registered the ICBM452 lobe atlas into BraTS space with ANTs SyN, preprocessed about 1,250 BraTS 2023 patients into 163,974 nine-channel slices, and trained on U-M's Great Lakes GPUs with mixed precision and EMA weights.</li>
<li>Built an evaluation harness for all 8 lab generator checkpoints: strict loading, a common 128×128 grid, no-reference metrics with 1,000-resample bootstrap confidence intervals, and a model-to-model FID matrix. I audited it against 27 candidate measurement defects and fixed the five that were real.</li>
<li>Caught shipping bugs on the first real GPU run: an 8-vs-9-channel mismatch, a csv-vs-json manifest name, and a safetensors version conflict that would have broken every redeploy.</li></ul>
<p class="explored">I also explored CLIP text conditioning through cross-attention and a 3D (64³) diffusion pipeline. Both are experiments, not finished features.</p>
<p class="note">About the drawing: the slice is procedural and the noise schedule is illustrative. It is not model output and not patient data. With η = 0 and a perfect noise estimate, DDIM's path is exactly x_t = √ᾱ_t·x₀ + √(1−ᾱ_t)·ε, which is what the figure draws. Status: integrated on a feature branch of the lab's repo, not merged into the lab's live site yet.</p>
<ul class="stack"><li>PyTorch</li><li>Hugging Face diffusers</li><li>ANTsPy</li><li>nibabel</li><li>Gradio</li><li>Hugging Face ZeroGPU</li><li>Next.js</li><li>Slurm on Great Lakes</li></ul>
<ul class="links">
<li><a href="https://github.com/SOCR/Brain-Image-Generator/tree/feat/conddiff-brats-v1">My branch in the lab repo (not yet merged)</a></li>
<li><a href="https://brain-image-generator.vercel.app">The lab's BrainGen web app (serves the GAN models; mine is on the branch above)</a></li>
<li hidden data-confirm="lab OK: repo exposes the unpublished manuscript draft"><a href="https://github.com/ALIUD1/Socr_2026">Research code</a></li></ul>
</div></article>
```

### 2.5 Project 03: CLAWS telemetry

```html
<article class="project" id="claws" data-scene="telemetry" data-accent="warn">
<div class="story"><header>
<p class="kicker">Student team · NASA SUITS · 2026</p>
<h2>CLAWS telemetry</h2>
<p class="becomes">Blip grows an antenna.</p>
<p class="tagline">A live spacesuit telemetry screen and an onboarding simulator for a NASA SUITS team.</p>
<p class="summary">CLAWS is a University of Michigan student team in NASA SUITS (Spacesuit User Interface Technologies for Students), a challenge to design displays for astronauts on spacewalks. I built the team's EVA telemetry screen: a React page that shows two astronauts' life-support readings live and raises alerts when a value leaves its safe range or changes too fast. I also built and published a mock of NASA's telemetry server, with a Unity client and tests, so new teammates can learn the whole data path on their own laptops.</p>
<p class="credit">Teammates built the Flask/Socket.IO backend, the Unity headset client, and the map and rover pages. The EVA screen, its alert rules, and the onboarding simulator are mine.</p>
</header><div class="figure"></div>
<ol class="steps">
<li><p>NASA's Telemetry Stream Server answers an 8-byte question.</p><code>UDP · [uint32 timestamp][uint32 command = 1 (EVA)] → JSON</code></li>
<li><p>The team's backend broadcasts each feed to every screen, about every 6 seconds.</p><code>socketio.emit('eva-telemetry') → React + Unity</code></li>
<li><p>My EVA page checks 22 suit readings for each of two astronauts on every update.</p><code>checkRanges() · 22 ranges · 10 rate limits</code></li>
<li><p>Out of range is danger. Off nominal is a warning. Changing too fast gets flagged.</p><code>&lt; min or &gt; max → danger · ≠ nominal → warn · |Δ|/Δt &gt; limit → fast</code></li>
<li><p>Alerts are deduped by id, sorted danger-first, and tint the matching gauges.</p><code>dedupe by id · danger first · newest 5</code></li>
<li><p>For new teammates, I built a fake NASA that runs on a laptop at 5 Hz.</p><code>mock_tss.py · FastAPI /ws · panel.py · TssClient.cs · pytest</code></li>
</ol></div>
<div class="details">
<h3>What I built</h3><ul class="built">
<li>Built the team's EVA telemetry screen. 699 of the 762 lines in the original page are mine, and the live /eva route is a teammate's copy of it, with 705 of its 753 lines tracing back to me.</li>
<li>Wrote a client-side caution and warning engine: 22 suit fields with min, max and nominal values plus 10 per-second rate limits, checked for both astronauts on every update. Alerts are deduped, sorted danger-first, and color the matching gauges.</li>
<li>Built a FastAPI mock of NASA's Telemetry Stream Server. It simulates suit O2, pressure, battery, heart rate, the UIA/DCU switches and an astronaut walking between points of interest, and streams the state at 5 Hz over a WebSocket. It comes with a CLI control panel and a Unity C# client.</li>
<li>Wrote a pytest that runs the NASA SUITS egress procedure against the simulator by stepping simulated time by hand instead of waiting.</li>
<li>New members have already started branches on the onboarding repo.</li>
<li>Added Git LFS rules for Unity and media assets, a Node .gitignore, and the team repo's first GitHub Actions workflow.</li></ul>
<p class="note">The team's live feed refreshes each stream about every 6 s. The 5 Hz pulses in the drawing come from the onboarding mock. The gauges are an illustration with demo values, not the team's UI.</p>
<ul class="stack"><li>React</li><li>TypeScript</li><li>Socket.IO</li><li>FastAPI</li><li>WebSockets</li><li>Unity C#</li><li>pytest</li><li>GitHub Actions</li></ul>
<ul class="links"><li><a href="https://github.com/ALIUD1/Infra-2026-2027-onboarding">Onboarding simulator repo</a></li></ul>
</div></article>
```

### 2.6 Project 04: Noverwatch

```html
<article class="project" id="noverwatch" data-scene="killswitch" data-accent="danger">
<div class="story"><header>
<p class="kicker">Solo project · Windows service · Feb–Mar 2026</p>
<h2>Noverwatch</h2>
<p class="becomes">Blip tries to play Overwatch.</p>
<p class="tagline">A Windows service that kills Overwatch the moment it launches.</p>
<p class="summary">I wrote a small Windows service to keep myself off Overwatch. It runs quietly in the background, and the moment Windows reports that Overwatch has started, it writes the attempt to a log and shuts the game down. It works: its log shows 8 kills, all during testing in March 2026.</p>
<p class="pull">The game launches. Then it doesn't.</p>
</header><div class="figure"></div>
<ol class="steps">
<li><p>I wrote a Windows service to keep me off Overwatch.</p><code>.NET 10 worker service · runs as LocalSystem</code></li>
<li><p>I press Play. Windows creates the game's process first; nothing stops the launch itself.</p><code>Overwatch.exe · PID 12400 (example)</code></li>
<li><p>Windows announces every new process. The service is subscribed to those announcements, so it isn't polling.</p><code>SELECT * FROM Win32_ProcessStartTrace · name == config["Games"]</code></li>
<li><p>It logs the attempt, then kills the process.</p><code>append log.txt · Process.Kill() · LogCritical</code></li>
<li><p>Then it goes back to listening.</p><code>heartbeat: "The Noverwatch system is online" every 100 s</code></li>
</ol></div>
<div class="details">
<h3>How it works</h3><ul class="built">
<li>Event-driven: it subscribes to Windows process-start events through WMI instead of scanning the process list.</li>
<li>The target game is read from appsettings.json, not hard-coded.</li>
<li>On a match it appends the name, PID and time to a log file, ends the process with Process.Kill(), and logs at Critical level.</li>
<li>It runs as an installed Windows service. The hosting follows Microsoft's BackgroundService tutorial; the detector is mine.</li>
<li>It ships as one self-contained, single-file exe of about 89.5 MB that needs no .NET install. That's 89.5 MB to close one game.</li>
<li>42 publish attempts, 14 of them failed. Then it worked.</li></ul>
<aside class="fix"><h3>What I'd fix next</h3><ul>
<li>Every 100 s heartbeat creates a new watcher without disposing the old one.</li>
<li>Detection only starts if Information-level logging is on, so raising the log level would silently switch it off.</li>
<li>"Blocked n" counts per watcher, not over the service's lifetime.</li>
<li>Process objects are never disposed.</li></ul></aside>
<p class="note">Not on GitHub; it was never under version control. Happy to walk through the source.</p>
<ul class="stack"><li>C#</li><li>.NET 10 Worker Service</li><li>WMI (System.Management)</li><li>Windows Service</li></ul>
</div></article>
```

### 2.7 Project 05: Distributed MapReduce (generic scene; proves the data-only path)

```html
<article class="project" id="mapreduce">
<div class="story"><header>
<p class="kicker">Project · Python</p>
<h2>Distributed MapReduce</h2>
<p class="becomes">Blip builds it.</p>
<p class="tagline">A manager/worker MapReduce framework over raw TCP and HTTP sockets.</p>
<p class="summary">A manager process partitions the input, hands map and reduce tasks to six worker processes, and coordinates the shuffle between them. Heartbeat monitoring catches workers that go silent, and their tasks are reassigned, so a job recovers within roughly one to two seconds under injected faults with no finished work lost.</p>
</header><div class="figure"></div>
<ol class="steps">
<li data-label="Partition"><p>The manager splits the input into partitions.</p><code>manager · TCP</code></li>
<li data-label="Map ×6"><p>Map tasks run across six worker processes.</p><code>6 workers</code></li>
<li data-label="Shuffle"><p>Intermediate output is shuffled to the right reducers.</p><code>shuffle</code></li>
<li data-label="Reduce"><p>Reduce tasks write the final output.</p><code>reduce</code></li>
<li data-label="Heartbeats"><p>Heartbeats reveal a worker that went silent.</p><code>heartbeat monitoring</code></li>
<li data-label="Reassign"><p>Its tasks are reassigned, and finished work is kept.</p><code>recovers in ~1–2 s under injected faults</code></li>
</ol></div>
<div class="details">
<h3>What I built</h3><ul class="built">
<li>A Manager/Worker MapReduce framework over raw TCP and HTTP sockets that partitions input, coordinates the intermediate shuffle, and distributes map and reduce tasks across six worker processes.</li>
<li>Heartbeat monitoring and task reassignment, so the manager detects silent workers and restores full job progress within roughly one to two seconds under injected faults, with no loss of finished work.</li></ul>
<p class="note">Described, not linked.</p>
<ul class="stack"><li>Python</li><li>TCP/HTTP sockets</li><li>Concurrency</li><li>Fault tolerance</li></ul>
</div></article>
```

### 2.8 Experience, skills, about, contact

```html
<section id="experience" aria-labelledby="exp-h"><h2 id="exp-h">Experience</h2>
<ol class="log">
<li class="row"><h3>Miller Industries <span class="role">BIM/VDC Development Intern · Fenton, MI</span></h3><p class="dates">Sept 2026 – present</p><ul>
<li>Automated a Python reality-capture pipeline that pulls scan archives from Autodesk Construction Cloud, drives ReCap Pro to index them, and emits production RCS deliverables, replacing a manual per-file workflow.</li>
<li>Building multi-scan alignment that registers separate field captures of one job site into a single shared coordinate frame.</li></ul></li>
<li class="row"><h3>SOCR, University of Michigan <span class="role">Software Engineering Researcher · Ann Arbor, MI</span></h3><p class="dates">Dec 2025 – present</p><ul>
<li>Lead the lab's brain image generation team<span hidden data-confirm="confirm Simeone Marino"> under Profs. Ivo Dinov and Simeone Marino</span>. I built the conditional diffusion model above, its GPU backend, and the evaluation harness.</li>
<li>Cut the lab's recurring cloud spend by over $230/month administering AWS Lightsail, Supabase, and Vercel.</li></ul></li>
<li class="row" data-blip="legs"><h3>Field AI <span class="role">Field Application Engineer Intern · Detroit, MI</span></h3><p class="dates">Mar – Jul 2026</p><ul>
<li>Deployed a Boston Dynamics Spot with an Ouster LiDAR payload to autonomously map an industrial facility as 3D point clouds, running missions end to end and checking coverage against site plans.</li></ul></li>
<li class="row"><h3>CLAWS, NASA SUITS 2026–27 team <span class="role">Infrastructure team<span hidden data-confirm="confirm title + subteam size">: Director of Infrastructure, leading a six-person subteam</span></span></h3><p class="dates">Mar 2026 – present</p><ul>
<li>Built the EVA telemetry screen and its alert engine, the onboarding simulator new members learn on, and the team repo's Git LFS rules and first GitHub Actions workflow.</li></ul></li>
</ol>
<h3>Also built</h3><ul class="also">
<li>A C++ graph optimization engine computing minimum spanning trees and approximate and optimal TSP tours over 10,000-node graphs.</li>
<li>A cycle-accurate five-stage MIPS pipeline simulator in C with forwarding and hazard detection.</li></ul>
<div class="skills">
<p><b>Languages</b> Python, C++, C, C#, JavaScript, TypeScript, SQL (PostgreSQL), Java, R, Bash, MIPS Assembly</p>
<p><b>Frameworks</b> PyTorch, Hugging Face Diffusers, NumPy, OpenCV, FastAPI, Flask, React, Next.js, Node.js, Unity</p>
<p><b>Tools</b> Linux, Git, Docker, Redis, GitHub Actions, AWS, Vercel, Supabase, Slurm/HPC, WebSockets</p></div>
</section>
<section id="about" aria-labelledby="about-h"><h2 id="about-h">About</h2>
<p>I like the unglamorous parts: queues, checkpoints, CI, cloud bills. I audited my own evaluation harness for 27 ways it could be lying to me; five were real, and I fixed them. I've run a Boston Dynamics Spot through LiDAR mapping missions in an industrial facility, built an offline LeetCode kit with tiered hints so flights count as practice, and wrote a Windows service to keep me off Overwatch. You saw how that went.</p></section>
<footer id="contact">
<h2>Say h<span class="i-anchor">i<svg class="blip-static" aria-hidden="true" focusable="false" viewBox="0 0 64 64"><use href="#blip-default"/><use href="#blip-face"/></svg></span></h2>
<p class="email"><a href="mailto:liualex639@gmail.com">liualex639@gmail.com</a> <button type="button" class="copy" hidden>Copy</button></p>
<ul class="contact-row"><li><a href="https://github.com/ALIUD1">GitHub</a></li><li><a href="https://www.linkedin.com/in/alex-liu-a77403408">LinkedIn</a></li><li hidden data-confirm="add a phone-free resume.pdf"><a href="resume.pdf">Résumé (PDF)</a></li></ul>
<p class="fine">Hand-built with HTML, CSS, and vanilla JS. No frameworks, no trackers, no build step. <button type="button" class="theme" hidden>Theme</button> <button type="button" class="motion" hidden>Motion: on</button></p>
</footer>
<p id="live" class="sr-only" aria-live="polite"></p>
<button class="blip" type="button" aria-label="Poke Blip"><!-- overlay SVG, §3 --></button>
```

## 3. Blip

### 3.1 Anatomy (sprite symbols in a hidden `<svg>` at the top of `<body>`, viewBox `0 0 64 64`, feet at (32,58))

- `#blip-default`:
  - Body: `M8 50C8 24 19 8 32 8C45 8 56 24 56 50C56 56 52 58 32 58C12 58 8 56 8 50Z`, fill `var(--blip)`.
  - Belly crescent: `M12 52C16 57 48 57 52 52C50 56 44 58 32 58C20 58 14 56 12 52Z`, fill `var(--blip-deep)`.
  - Highlight: `M17 26C19 18 24 14 29 13`, stroke `var(--paper)` 3, round cap, opacity .55.
  - Cheeks: ellipses at (19,42) and (45,42), rx 3.5, ry 2, fill `var(--blip-cheek)` at .45.
  - Sprout: line from (32,8) to (32,2), stroke `var(--pupil)` 2; dot r 2.2 at (32,2), fill `var(--blip-deep)`.
- `#blip-face`: whites at (25,33) and (39,33), rx 5, ry 6, fill `var(--eye)`; pupils r 2.6, fill `var(--pupil)`. Both colors are fixed, so the face reads in either theme.
- The overlay button inlines the face (pupils must move) and `<use>`s each costume.

Sizes:

| Where | Size |
|---|---|
| Stage and rail | 44 px |
| Below 960 px | 36 px |
| Hero and footer | `max(24px, var(--tittle-size) × font-size)`, taken from the `.blip-static` box |

### 3.2 Costumes (`data-form`, crossfade 160 ms opacity + scale .85→1 with `--ease-pop`)

| Form | Drawing | Used by |
|---|---|---|
| `default` | gumdrop | everywhere |
| `ticket` | rect x2 y24 w60 h30 rx6 in `--blip`, white strip at y44 h6 | Inference queue |
| `pill` | rect x2 y30 w60 h22 rx11 in `--blip` | Inference reply |
| `eyes` | body, cheeks and sprout hidden; face only | BrainGen noise |
| `ping` | body at .5 scale + 2 CSS rings (r 0→22, opacity .35→0, 1.2 s loop) | CLAWS |
| `antenna` | sprout `scaleY(3.2)` from its base, tip `--signal`, blinking 1.2 Hz | CLAWS |
| `headset` | ink arc over the top + 2 ear cups | Noverwatch |
| `flat` | ellipse cx32 cy55 rx30 ry5 + X eyes at y52 + 3 four-point stars rotating 1.6 s | Noverwatch |
| `legs` | 4 rects 4×8 under the body, CSS trot (alternating translateY 2 px, 240 ms) | Field AI row |
| `hardhat` | half-ellipse cap, `--paper` fill, ink stroke | generic scene |

### 3.3 Expressions and idle life

- **Expressions (`data-expr`):**
  - `open`
  - `happy`: ^ arcs replace the eyes
  - `x`: crossed lines
  - `offended`: open eyes with two 2-unit brows angled inward
  - `wide`: eye group at 1.25 scale
- **Blink:** CSS keyframes on the eye group, scaleY .1 for 110 ms. Two animations with periods of 4.6 s and 7.3 s, so the rhythm is irregular.
- **Breathe:** CSS on the inner group, scale 1→1.02, 2.4 s alternate.
- **Shiver:** class `.shiver`, translateX ±1.5 px, `steps(2)` at 80 ms.
- **Pupils:** JS translate of up to 2 units toward the look target. The look target is the scene's `look` if it sets one; otherwise the pointer when `(pointer: fine)` matches; otherwise straight ahead.

### 3.4 Physics and hosts (core.js)

- **Host-local spring.** Blip's position and velocity are stored relative to the current host's origin, and that origin is re-read every frame. This keeps Blip glued to sticky stages and hero text during scroll, with zero lag.
- **Host change:** set `local = screenPos − newOrigin`, so there is no jump. Then crouch (scaleY .92 for 80 ms) and hop: `v.y −= 420` px/s.
- **Spring:** `a = 170·(target − p) − 20·v`, semi-implicit Euler, `dt = min(frameDt, 1/30)`.
- **Stretch:**
  - `s = clamp(1 + |v|·0.0007, 1, 1.4)`
  - `scaleY = s`, `scaleX = 1/s`
  - transform origin at the feet
- **Landing:**
  - Applies after any travel longer than 24 px.
  - Triggers when `|target − p| < 2` and the previous speed was above 250.
  - Then `w' += 5` on the wobble spring: `w'' = −420w − 14w'`.
  - Apply `scaleY·(1−w)` and `scaleX·(1+w)`.
  - Clamp the total to 0.55–1.45 (the `flat` form is exempt).
- **Scene overrides:**
  - `sy` and `rot`: Noverwatch reinflation and the dazed tilt.
  - `opacity`: BrainGen eye fade.
- **Host selection each frame (first match wins):**
  1. Footer top < 0.8·H: the footer `.blip-static` box.
  2. Hero `.blip-static` bottom > 0.15·H: the hero box.
  3. A `.story` spans the read line: its stage (or the DOM element the scene returns as `el`).
  4. `#experience` spans the read line and the rail is visible: the hovered or focused row, else the row nearest the read line. Target point: `row.left − 30, row.top + 24`. A row with `data-blip="legs"` sets form `legs` for 1.2 s on hover.
  5. Rail visible (≥ 1200 px): rail point `(24, 0.5·H)`.
  6. None: Blip fades out (`visibility: hidden` after a 160 ms opacity transition, which also takes it out of tab order).
- **Hero entry:**
  - Waits for `document.fonts.ready` (2 s timeout).
  - Blip starts at `(heroX, −80)`. The spring overshoot plus the landing wobble reads as a drop and two bounces.
  - It then looks at "Alex" for 600 ms, then at the cursor.
  - After 5 s with no scroll it looks at the cue and hops once.
- **Poke (any host):**
  - The scene's `poke` result applies first, if any.
  - Default: hop (−360) and the `happy` expression for 600 ms.

## 4. Engine (core.js)

### 4.1 Boot

1. Wire the theme and motion buttons (unhide them) and the copy button. Copy uses `navigator.clipboard`; on success the label reads "Copied" for 2 s and the live region says "Email copied". Print the console line `Blip says hi. Source is readable on purpose: github.com/ALIUD1/ALIUD1.github.io`.
2. For each `article.project`:
   - Resolve the scene: `SCENES[data-scene] || SCENES.generic`.
   - Set `--accent: var(--<data-accent>)`.
   - Insert `.figure` if it is missing.
   - Build a rail item: `<a href="#id">` with the 2-digit index; the name shows on hover and focus.
3. An IntersectionObserver with rootMargin `100% 0px` mounts each scene about one screen early.
   - Mount builds the figure: `.fig-tag`, `svg.stage[aria-hidden][focusable=false][viewBox="0 0 800 560"]`, an optional `.panel` (DOM extras), `.cap[aria-hidden]` and `.controls` (real buttons).
   - Then it calls `setup`.
   - If `setup` throws: `console.warn`, then fall back to generic. If generic throws too, remove the figure.
   - If the li count differs from `scene.beats`: `console.warn`, and map `T × beats/N`.
4. Run `measure()` on `fonts.ready`, on width change, and on height change greater than 120 px. It caches:
   - `H` and the read line: `0.5·H` at ≥ 960 px, `0.72·H` below that.
   - For each story: its document-space top and bottom, each li's document top, and the steps list's bottom.
   - For each stage: the viewBox mapping.
5. Run `?check` if the URL has it (§11).

### 4.2 Beat clock (pure)

- `y = scrollY + readLine`.
- `i` = the last li whose top ≤ y.
- `u = (y − top_i) / (next_top − top_i)`, where `next_top` is li i+1, or the steps bottom for the last li.
- `T = clamp(i + u, 0, N)`.
- Above the first li, T = 0; below the steps, T = N.
- Each visible stage calls `render(state, T, now)` only when `|ΔT| > 0.0005` or while `state.live` is true.
- The active li gets `aria-current="step"` and the `.on` class, written only when it changes.
- The rail item for the section containing the read line gets `aria-current="true"`.

### 4.3 Loop

- **Frame order:** read `scrollY`, then at most 3 rects (the host plus visible stages), then compute, then write. No reads after writes.
- **The loop runs only while** one of these holds:
  - a scroll event fired within the last 150 ms;
  - Blip is unsettled (`|v| > 0.5`, `|Δ| > 0.5`, or `|w| > 0.001`);
  - a visible scene is `live`;
  - the pointer moved within the last 100 ms.
- Otherwise it stops; scroll, pointer, resize or an action restarts it. It also pauses while `document.hidden`.

### 4.4 Stage mapping and pan

- At ≥ 960 px: viewBox `0 0 800 560` with `xMidYMid meet`.
- Below 960 px: viewBox is `panX 0 vbW 560`.
  - `vbW = clamp(560·w/h, 420, 800)`.
  - `panX` eases toward Blip's stage-local x with `k = 1 − e^(−6dt)`, clamped to `[0, 800 − vbW]`.
  - A scene with `pan:'center'` stays fixed at center.
- `api.place(el, x, y, w, h)` positions a DOM element over a viewBox rect. Only BrainGen's canvas uses it.

### 4.5 Captions, tips, controls

- **Caption:** `.cap` shows the active li's `<code>`.
- **Tips:**
  - Hovering (or, on touch, tapping) an SVG node with `data-tip` shows the tip text in the caption and points Blip's look at that node.
  - The caption restores on `pointerleave`, or after 4 s on touch.
  - Rule: every tip's content must also exist in the article text, so nothing is hover-only.
- **Controls:**
  - `setup` returns `controls: [{label, action, pressed?, from?}]`.
  - Core renders `<button type="button" data-action>`; toggles get `aria-pressed`.
  - A control with `from` is `hidden` while `T < from`.
  - A click calls `action(state, name, btn)`, which may return `{announce, caption}`.
  - Announcements go to `#live` and only ever follow a user action.

### 4.6 Scene contract

```js
SCENES.x = {
  beats: 8, poster: 5, pan: 'follow'|'center', tag: 'fig. 0N · …',
  setup(api, svg, article) -> state,               // build nodes once; state.controls
  render(state, T, now) -> {x, y, form, expr, look?, el?, sy?, rot?, opacity?},
  action?(state, name, btn) -> {announce?, caption?},
  poke?(state) -> {caption?, impulse?:{x, y}}
}
```

`api` provides:

- `el(tag, attrs, parent)` and `text(x, y, str, cls, parent)`
- `path(d, cls, parent)`, which always sets `pathLength=1`; a reveal is `strokeDashoffset = 1 − t`
- `seg(T, a, b)`, `lerp`, `clamp`, `easeInOut`, `easeOutBack`
- `rng(seed)`, a mulberry32 generator
- `tip(node, text)`, `place`, `announce`, and `figure` (the container)

All colors are CSS classes using `var(--…)`, so a theme change needs no re-render.

SVG text classes:

| Class | Size | Font | Visibility |
|---|---|---|---|
| `.t-big` | 20u | Bricolage 650 | always |
| `.t-mid` | 16u | mono | always |
| `.t-small` | 13u | mono | hidden below 960 px |

## 5. Scenes

All coordinates are in viewBox units (800×560). "bN" is beat N (0-based), and u is progress within that beat.

### 5.1 `queue` (Inference Server): 8 beats, `tag "fig. 01 · drawing, not a benchmark"`, poster T=5, pan follow

**Layout:**
- Client door: (16,230,56,100).
- Frontend box: (88,40,184,480), title "FastAPI · main.py".
  - `pending_jobs` bench: 8 seats, r 9, at x 180, y 110+36k.
  - `response_reader` box: (104,440,152,64), small text "own Redis connection".
- Redis box: (292,40,232,480).
  - Lockers: 8 at (308+27k, 84), 22×22, plus 2 more at (308+27k, 112) for W4.
  - `jobs` rail at y 250, tail x 312 to head x 500, 24-unit slots. Labels "tail · RPUSH" and "BLPOP · head".
  - `response` rail at y 450, running right to left with an arrowhead.
- Worker lanes W1–W4: (540, 40+96k, 244, 88).
  - Each has an 8-slot tray (18 px slots, x 552+21k, y lane+40), a ring timer (r 14 at (752, lane+48), dashoffset), and small text "1 torch thread".
  - In the scroll-driven state, W1 and W3 are filled and labeled "busy".
- Ghost tickets: 20×12 rounded rects in ink outline with two dot eyes.

**Beats (scroll):**

| Beat | li | Stage | Blip |
|---|---|---|---|
| b0 | image in | 7 ghost tickets fade in at the client (x 20–70, y 60–200). A 24×20 image tile rides beside Blip. | `default` walks (44,280)→(104,280) over u 0–.6 |
| b1 | ticket + Future | Label `job_id 7f3a…c21e` above Blip (4+4 hex from `crypto.getRandomValues`, new each visit). Seat 3 gets a rotating dashed ring (CSS), labeled "Future" with "await future · loop free". | `ticket` at (150,182) |
| b2 | SET + RPUSH | u 0–.5: tile arcs (control (240,20)) into locker 1, which fills; "SET" flashes. Two ghosts already sit in the two head slots. u .8–1: 5 ghosts slide into the slots behind Blip (staggered .04). | u .5–.8: hops to slot 3 (440,250) |
| b3 | BLPOP | W2 and W4 pulse "BLPOP jobs 1". W2 pops the head ghost at u .2 and the next at u .55; the queue shifts forward with easing. W2's ring = `seg(T, 3.2, 4.75)·0.7`. | reaches the head (488,250) |
| b4 | 8 or 200 ms | u .2–.7: 5 ghosts pop into W2 slots 4–8. At u .75 the lid slides shut, the ring stops at 70%, and "closed: full (8)" shows. At u .78 and .84, 2 late ghosts RPUSH and pop to W4, whose ring fills over `seg(T, 4.8, 5)`. At T=5 W4's lid closes: "closed: 200 ms (2)". | u .1: pops into W2 and sits on the tray above slot 3 |
| b5 | MGET + DEL | u 0–.6: 8 tiles travel as one braided bundle (offsets 3k,2k; delays .03k) along one curve from the lockers to the W2 tray, labeled "MGET ×8 · one round trip". u .6–1: lockers 1–8 empty, "DEL ×8" flashes. | rides on the tray |
| b6 | forward pass | u 0–.15: everything else dims to .25 and an inset fades in at (300,150,480,250), titled "inside W2 · ResNet-18". u .15–.4: tiles stack into 8 offset rects, "[8,3,224,224]". u .4–.7: the stack slides through 5 bars (heights 120/96/72/48/30) under "torch.no_grad()"; each bar lights as the stack passes. u .7–1: 8 rows, "[8,1000] → argmax"; one dot per row pops, and row 3's dot is `--blip`. | rides the stack, then sits by the rows |
| b7 | reply + wake | u 0–.12: inset out. Byte map beside Blip: 16 `--signal` cells + 8 `--ok` cells, labeled `<16sq = 24 B`. u .12–.45: rides W2 → (508,450) → (308,450) behind 2 ghost pills. u .45–.6: to the reader, "BLPOP response 1" flashes. u .6–.8: hops to seat 3; the seat fills `--ok`, label "set_result", ring stops. u .8–1: to the client with the bubble `{"Category_Number": 1, "Server_Rate": …}` tagged "example". From u .9: "ImageNet class 1 is goldfish." | `pill`, then `default` + `happy`; from u .9 `offended`, looking at the camera |

**Live layers (`state.live`):**
- **"Send requests" (button; clicking the W1 lane does the same):**
  - W1 drops its "busy" look and is labeled "you · 6× slower than real".
  - The first click opens a batch and starts the ring (1,200 ms = 200 ms × 6). Each click adds a ticket.
  - The batch closes at 8, or when the ring completes. Labels: "closed: full (8 of 8)" or "closed: 200 ms deadline (k of 8)".
  - Announce: "Batch closed: 3 of 8, 200 millisecond deadline". Reset 1.5 s after closing.
- **"Replay the hang" (button text becomes "Stop replay" while it runs):**

  | Time | What happens |
  |---|---|
  | 0–5 s | Reader label `BLPOP response 0 (blocks forever)`, countdown 5→0 labeled "socket_timeout 5 s (redis-py 8 default)" |
  | 5–7.5 s | Reader tilts 10° at .35 opacity, "task died · nothing logged". 3 pills stop on the response rail, seats pulse hollow. Caption: "No error. No log. Just a hang." |
  | 7.5–10 s | Reader rights itself, label `BLPOP response 1 + add_done_callback → prints the exception`. Pills drain to the seats. Caption: "Bounded pop, plus a callback so a dying task can't die quietly." |

  Announcements at start and end.

**Tips:**
- Lanes: "four workers compete on one FIFO list; torch.set_num_threads(1) so they don't fight over cores"
- Jobs rail: "FIFO: RPUSH at the tail, BLPOP at the head"
- Lockers: "only the 16-byte id rides the queue; the image waits under its key"
- Seats: "pending_jobs[id]: matched by id, no polling"
- Reader: "its own Redis connection, separate from the request pool"
- Byte map: "16s = uuid4 bytes, q = int64 class index: 24 bytes, not JSON"
- ResNet: "one stacked forward pass per batch, on CPU"

**Poke:** while 2 ≤ T < 4.1, impulse `{x: +60}`, caption "FIFO. No cutting.", `offended` for 600 ms.

### 5.2 `denoise` (SOCR BrainGen): 7 beats, `tag "fig. 02 · illustration: procedural slice, not model output, no patient data"`, poster T=7, pan center

**Layout:**
- Plate: `--viewer` rect (250,70,300,300) rx 8. The canvas (128×128 internal) is placed over (256,76,288,288).
- Labels: `seed NNNNN` at (250,58); `t = 995 · step 1/200` right-aligned at (550,58).
- Progress bar: (256,382,288,8) on `--rule`, fill `--ok`.
- Bank card: (40,120,170,170), hatched, labeled "T1" with small text "held-out real slice · not shown".
- 9 channel cards: 44×56 at (590+18k, 110+4k), labeled "1 × 9 × 256 × 256".
- U-Net glyph at (600,300)–(760,420), labeled "U-Net · 85,261,185 params".

**Brain library (pure functions in scenes.js, 128 grid):**

1. **`slice()`**, centered at (64,66):
   - `rx = 44·(1 − 0.06·max(0, (66−y)/54))`, `ry = 54`.
   - `r` = normalized ellipse radius.
   - Intensities by region:

     | Region | Value |
     |---|---|
     | `r > 1.13` (outside) | 0 |
     | scalp, `1.06 < r ≤ 1.13` | 0.42 |
     | gap, `1.0 < r ≤ 1.06` | 0.06 |
     | white matter | 0.46 |
     | cortex, `r > 0.84` | 0.66 |
     | 30 jittered radial sulci (r 1.0 → 0.78–0.84, width 1.2) | 0.12 |
     | midline, `abs(x−64) < 0.8` and (y < 46 or y > 92) | 0.12 |
     | ventricles: ellipses at (57,64) and (71,64), radii (4.5,15), rotated ∓18° | 0.08 |

   - Then 2 passes of a 3×3 box blur.
2. **Toy lobes** (brain pixels minus ventricles):
   - Frontal: `y < 54`
   - Occipital: `y ≥ 96`
   - Temporal: `54 ≤ y < 96` and `abs(x−64) ≥ 30`
   - Parietal: the rest
3. **`synthMask(lobe, size, rng)`:**
   - Candidate pixels: the lobe minus a 2 px border.
   - `frac` drawn from the size bin: S .05–.12, M .15–.35, L .40–.60.
   - `N = round(frac·A)`, where A is the lobe's pixel count.
   - Seed pixel: uniform within the lobe. `σ = sqrt(N/π)·1.1`.
   - `score = exp(−d²/2σ²)·(0.6 + 0.4·valueNoise8x8)`.
   - The top N pixels form the lesion (label 2, edema); the top `round(.3N)` of those are the core (label 3).
4. **FLAIR x0:** edema = `max(img, .86)`, core = .78, then one blur pass. **Mask view:** background 0, edema .5, core 1.
5. **Schedule (cosine, s = .008):**
   - `ᾱ(t) = f(t)/f(0)`, with `f(t) = cos²(((t/1000 + s)/(1 + s))·π/2)`.
   - ε comes from Box-Muller on `rng(seed)`.
   - Each pixel: `v = √ᾱ·(2·x0 − 1) + √(1−ᾱ)·ε`, displayed as `clamp((v+1)/2)·255`.
   - `putImageData` runs only when the step changes.

**Beats:**

| Beat | Stage | Blip |
|---|---|---|
| b0 pick | Plate black | Host = the active Lobe button (`el`), hops onto it |
| b1 seed | The seed label scales in; two traces reveal: "NumPy → mask" (to the bank) and "PyTorch → noise" (to the plate) | (250,40), holding the seed |
| b2 anatomy | Ghost slice at .3 fades in (u 0–.4); the 4 lobes tint in turn in cobalt at .35, each over `.4 + .15k`; the bank card reveals | (230,385), looking at the plate |
| b3 tumor | Ghost slice + chosen lobe at .2. Lesion pixels appear in score order: `n = easeOut(seg(u,.1,.8))·N` (mask-view greys). Channel cards slide in (u .5–1); "1 × 8 × 256 × 256 conditioning" shows | looking |
| b4 noise | At u .5 the canvas cuts to t=995 and the counter appears | u 0–.4 `.shiver`; u .4–.7 hops to (400,230), form `eyes` |
| b5 denoise ×200 (`--beat:3`) | `k = min(199, floor(u·200))`, `t = 995 − 5k`. Counter and bar update; the U-Net glyph's opacity alternates by k's parity | `eyes`; from k ≥ 80 `happy`; opacity `1 − seg(k, 90, 120)` |
| b6 decode | t=0. A border flash (stroke 3→0) over u 0–.2. View tabs appear (`from: 6`). Label "[-1,1] → [0,1]" | reappears at (560,60), `default` + `happy`, holding the seed tag |

**Controls:**
- Lobe: Frontal / Parietal / Temporal / Occipital (`aria-pressed`, default Frontal), with the note "Showing 4 of the model's 6 lobes."
- Size: S / M / L (default M).
- "↻ New seed".
- View: FLAIR / Tumor Mask (`from: 6`).
- Any change regenerates x0 and the mask (and ε, on reseed) and re-renders at the current T. Announce: "Frontal lobe, moderate tumor, seed 48213".
- Scrolling back below T=6 resets the view to FLAIR.

**Tips:**
- Cards: "x: the noisy FLAIR channel being denoised" / "T1: anatomy from a held-out real slice, not shown here" / "mask: drawn from the atlas before denoising" / "6 lobe probability maps from the ICBM452 atlas"
- U-Net: "85,261,185 parameters, loaded strict=True plus a parameter-count check"
- Seed: "one integer seeds the mask (NumPy) and the starting noise (PyTorch)"
- Plate: the fig tag text

**Reduced motion:** the poster adds a strip canvas at (256,400,288,96) with thumbnails at t = 995, 500 and 0, labeled.

### 5.3 `telemetry` (CLAWS): 6 beats, `tag "fig. 03 · illustration with demo values"`, poster T=5, pan follow

**Act A:**
- Top row:
  - TSS: (24,40,130,90), dashed `--ghost`, "NASA TSS", small "UDP · not mine".
  - Backend: (210,40,170,90), dashed, "team backend", small "Flask-SocketIO".
  - Junction at (430,85).
  - "my /eva page": (480,30,170,60), solid ink with a `--signal` .12 band.
  - "Unity headset": (480,110,170,60), dashed.
  - Wires revealed with `pathLength=1`.
- Cards: EVA-1 (24,200,360,250) and EVA-2 (416,200,360,250).
  - Each has 4 horizontal gauges at y+50+44k: O2, suit pressure, battery, heart rate.
  - Each gauge: a track, a safe band in `--ok` at .18, a nominal tick, and a 4×18 value marker in ink / `--warn` / `--danger`.
  - Footer text: "4 of 22 fields shown · demo values".
- Alerts: a DOM `.panel` list under the SVG, aria-hidden, showing the newest 5 chips. Each chip has a text label (DANGER, WARN or FAST plus the field), never color alone.

**Act B:**
- Laptop: (60,180,220,150), "mock_tss.py", small "FastAPI · sim_loop 5 Hz".
- `/ws` line to three clients:
  - Terminal (440,60,320,150), "panel.py watch", 5 lines.
  - Unity map (440,240,200,170): 6×6 grid, 4 POI crosses, a 14 px EV marker, and an O2 HUD bar at (440,420,200,10).
  - pytest chip (660,250,120,40).
- Switch glyph "uia o2_vent" at (100,360,140,40).

**Beats:**

| Beat | Stage | Blip |
|---|---|---|
| b0 | An 8-cell datagram labeled `[uint32 ts][uint32 cmd=1]` rides with Blip backend → TSS (u .1–.5) and returns as `{…}` (u .55–.95) | `ping` |
| b1 | At the junction, a clone (`<use>` of the ping) appears at u .3. Double-take at u .3–.5: Blip looks at the clone. At u .5–1 the clone goes to Unity and fades. Small label "≈ every 6 s per feed" | `ping` → the React box (565,60) |
| b2 | A sweep line `x = 24 + u·752` crosses both cards. Label "22 fields × 2 astronauts · 10 rate limits". Markers jitter by `0.01·sin(T·40 + k)` | `antenna` at (370,215) |
| b3 | u .2: EVA-1 heart rate goes off nominal → WARN. u .5: EVA-2 suit pressure crosses max → DANGER. u .8: EVA-1 O2 jumps → FAST (marker `.strobe` at 1 Hz) | `wide` during u .5–.65 |
| b4 | u 0–.4: chips reorder danger-first (y eased). u .5–.8: a duplicate WARN slides in, merges into the original (which pulses to 1.06), "dedupe by id". Matching gauges tint | `antenna`, happy at the end |
| b5 | u 0–.25: act A fades out and act B fades in. From u .25 the live 5 Hz loop runs. The pytest chip appears at u .5 | `antenna` at (170,160) |

**Live 5 Hz loop:** runs only while T ≥ 5, the stage is visible, and motion is on. Every 200 ms:
- A dot travels the `/ws` line to both clients (600 ms).
- The terminal appends `frame #n · o2 NN%` and keeps the last 5 lines.
- The EV marker eases toward the next POI at 30 u/s and rotates to its heading.
- If the vent is open: `o2 = max(0, o2 − 0.8)`. At 0 the terminal prints `o2 0% · (a mock of a mock)`.

**Control:** "uia o2_vent: open / close" (`aria-pressed`, `from: 5`).
- The label `POST /uia/o2_vent {"value": true}` travels from the switch to the laptop over 400 ms.
- Announce "o2_vent open: O2 draining in the mock" (or "closed: drain stopped").
- Act B state resets when it re-enters.

**Tips:**
- TSS: "NASA's telemetry server, not mine"
- Dashed boxes: "built by teammates; drawn dashed on purpose"
- My page: "my EVA page: 699 of the original 762 lines"
- Gauges: "danger: below min or above max · warn: in range but off nominal · fast: change per second over its limit"
- Laptop: "full state JSON pushed to every /ws client each tick"
- Unity: "TssClient.cs parks the newest frame on a background thread and parses it on the main thread"
- pytest: "steps simulated time by hand to fast-forward the egress procedure"

**Poke:** a ring expands from Blip, plus `happy`.

### 5.4 `killswitch` (Noverwatch): 5 beats, `tag "fig. 04 · reenactment"`, poster T=3.9, pan follow

**Layout:**
- Floor: y 470.
- Watchtower: (40,300,90,170), with a lamp at (85,315) r 7 in `--danger`, blinking 1 Hz. Small text "service · LocalSystem".
- Tripwire: dashed `--danger` line from (140,450) to (780,450), small text "WMI · Win32_ProcessStartTrace".
- PLAY: (310,300,180,64) rx 32, text "PLAY" in Bricolage 800. Generic: no logo, no brand colors.
- Window card: (320,130,160,96), ink title bar "Overwatch.exe", body "PID 12400", launch bar (336,196,128,8).
- Mallet group: head 120×44 labeled `Process.Kill()`, parked at y −120.
- Terminal: DOM `.panel` under the SVG, mono, 4 lines (3 on mobile).

**Beats:**

| Beat | Stage | Blip |
|---|---|---|
| b0 | (none) | walks (−40,440)→(200,440); at u .55 `headset` drops on; `happy` |
| b1 | u .4: PLAY squashes (scaleY .9 from the bottom) and the window pops in (easeOutBack over u .4–.6); the bar fills 0→3% | hops onto PLAY (400,300), bobs `6·abs(sin(u·3π))` |
| b2 | u 0–.5: an event dot runs from the window down to the wire and left to the tower. u .5–.7: the lamp brightens and the match card reads `Overwatch.exe == config["Games"] · ignores case` with a tick. u .6–1: the mallet lowers to y −20 | looking at the tower |
| b3 | u 0–.45: the mallet lowers to hover at y 150; u .45–.5: winds up to 130; at u ≥ .5 it is down (y 270). The window collapses: scaleY→.04 over u .5–.52, then scaleX→0 over .52–.55. Terminal: `Overwatch PID: 12400 blocked at {local time}`, `crit: Overwatch has been killed(stopped)! at {time}`, `crit: Blocked 1` | `flat` + `x` + stars |
| b4 | u .3–.6: the mallet retracts. u .6: the lamp blinks and a toast reads `warn: The Noverwatch system is online` with "(every 100 s; sped up here)" | sy steps .5/.8/1 over u .1–.3, `rot` 8° over u .3–.6, headset off at u .7 |

**Slam (time-based, fired once on a forward crossing of T=3.5):**
- Stage shake: `6·e^(−t/80)·sin(t·0.12)` px for 250 ms.
- 90 ms hit-stop on Blip.
- The time string is captured at that first crossing: `toLocaleString('en-US')` with the comma removed.
- Crossing backward restores the pre-slam state instantly.

**Control: "Launch Overwatch"** (always visible). Runs a 1.6 s live clip that overrides the render while it plays:

| Time | What happens |
|---|---|
| 0–400 ms | The window forms; Blip goes to PLAY |
| 400–700 ms | The event dot runs |
| 700 ms | Slam, shake, and a log entry: random PID (multiple of 4, 1000–40000), current time, then `Blocked n`. n counts up from 2, because each replay is the same watcher |
| 700–1600 ms | Flat, then reinflate |

The caption escalates by attempt:

| Attempt | Caption |
|---|---|
| 1 | "nice try." |
| 2 | "the service is very consistent." |
| 3 | "'Blocked n' counts per watcher, and the service starts a new watcher every 100 s heartbeat, so it's not a lifetime total. It's on the fix list." |
| 5 | "have you considered going outside?" |
| 8 | "That matches the 8 kills in Alex's log from testing in March 2026." |
| 12 | "ok. log.txt is getting long." |

Announce: "Overwatch PID 18352 killed. Attempt 3."

**Tips:**
- Tripwire: "event-driven: Windows pushes every new process start; no polling"
- Tower: "installed Windows service, LocalSystem, manual start"
- Mallet: "Process.Kill() ends the matching PID only"
- Window: "the process exists before Noverwatch reacts; the launch itself isn't stopped"
- PLAY: "generic button, no game art"

### 5.5 `generic` (any article without a known `data-scene`)

- **Beats:** N = li count, clamped to 2..9. **Pan:** follow. **Tag:** `fig. 0N`.
- **Node labels:** `li.dataset.label`, or the li's first 3 words truncated to 16 characters with "…".
- **Layout:**
  - N ≤ 4: one row at y 280, x evenly spaced from 120 to 680.
  - N ≥ 5: row 1 at y 190 with `ceil(N/2)` nodes left to right; row 2 at y 390 right to left, starting at x 680.
  - Nodes: 150×60, rx 10, `--paper-2` fill, ink 1.5 stroke, `.t-big` 17u label, small "0i" index.
  - Wires: horizontal within a row, vertical at the row turn.
- **Beat i:**
  - u 0–.4: wire i draws (i ≥ 1).
  - u .4–.6: node i's outline draws and its label fades in.
  - u 0–.6: Blip hops from node i−1 to node i on a parabola (`y −= 60·sin(π·s)`). In b0 it enters from x −40.
  - u .6–1: node fills with the accent at .15.
- **Blip:** `hardhat`; `happy` at T = N. **Tips:** each node shows its li's plain sentence. **Poster:** T = N.

## 6. Visual system

### Palette (`:root`)

Dark tokens apply under `@media (prefers-color-scheme: dark){:root:not([data-theme=light])}` and again under `:root[data-theme=dark]`. `body{background:var(--paper);color:var(--ink)}`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#F4F0E6` | `#111216` | page |
| `--paper-2` | `#EAE4D6` | `#191B21` | stages, nodes |
| `--paper-3` | `#DDD5C3` | `#23262E` | pressed buttons, empty slots |
| `--ink` | `#16171B` | `#EFEAE0` | text, line art |
| `--ink-2` | `#4B4D57` (7.4:1) | `#A9ABB5` (8.3:1) | secondary text |
| `--ink-3` | `#7C7E88` | `#6E717C` | decoration only, never text |
| `--rule` | `#CBC2AE` | `#2E313A` | hairlines, rail, tracks |
| `--ghost` | `#A9A291` | `#4A4D57` | dashed teammate and context blocks |
| `--blip` | `#FF5B37` | `#FF6B47` | Blip body only |
| `--blip-deep` | `#D9411F` (3.9:1 edge) | `#E8532F` | Blip shading |
| `--blip-text` | `#C2381A` (4.8:1) | `#FF8A66` | "becomes" lines |
| `--blip-cheek` | `#FF9A80` | `#FF9F87` | cheeks |
| `--signal` | `#2D5BFF` (4.6:1) | `#7D9BFF` (7.2:1) | data, wires, links, focus |
| `--ok` | `#0E8A62` (3.8:1, graphics only) | `#3DD598` | nominal, set_result, progress |
| `--warn` | `#9A6A00` (4.2:1, graphics/large) | `#F2B632` | WARN |
| `--danger` | `#C2253A` (5.1:1) | `#FF5468` | DANGER, kill |
| `--viewer` | `#0B0C0F` | `#07080A` | MRI plate (dark in both themes) |
| `--grid` | `rgba(22,23,27,.07)` | `rgba(239,234,224,.06)` | dot grid |
| `--eye` / `--pupil` | `#FFFFFF` / `#16171B` | same | Blip face (fixed in both themes) |

Rules:
- Blip is the only saturated warm color on the page.
- A scene accent tints only the kicker number, the active-step rule and the progress fill.
- No gradients, glass, blur, drop shadows or purple.
- Status is never shown by color alone.

### Type

- **Families:** Bricolage Grotesque for everything human-voiced; JetBrains Mono for anything the machine says (ops, structs, logs, captions, dates, kickers).

| Element | Spec |
|---|---|
| h1 | `clamp(4.5rem, 17vw, 13rem)`, wght 800, `font-stretch: 82%`, opsz 96, letter-spacing −.045em, line-height .82 |
| h2 | `clamp(2.5rem, 6vw, 5rem)`, wght 760, stretch 85%, letter-spacing −.03em, line-height .95 |
| `.becomes` | 1.375rem, wght 520, `--blip-text` |
| `.tagline` | 1.25rem/1.4, wght 500 |
| body | 1.0625rem/1.6, wght 400, opsz 14, max 62ch |
| mono | .8125rem/1.45, `tabular-nums` |
| kicker | .75rem mono, uppercase, letter-spacing .08em |
| `.pull` | 2.25rem, wght 650 |

### Space

- 4 px base; scale 4/8/12/16/24/32/48/72/112.
- Gutters: 16 px below 768, 32 px from 768 to 1199, 48 px from 1200.
- Max width 1320 px. Touch targets at least 44×44.

### Texture

- Body: a 1.2 px dot every 24 px in `--grid` (radial-gradient, scrolls with the page).
- Figures: `--paper-2`, 1 px `--rule` border, 16 px radius, `.fig-tag` top-left in mono .75rem.
- SVG strokes 1.5 with round caps and joins; `vector-effect: non-scaling-stroke`.
- Links: ink text with a 2 px `--signal` underline, offset 4 px; 3 px on hover.
- Focus: 2 px `--signal` outline, offset 3 px.

### Motion tokens

| Token | Value | Use |
|---|---|---|
| `--ease-pop` | `cubic-bezier(.34,1.56,.64,1)`, 380 ms | appear, costumes |
| `--ease-out` | `cubic-bezier(.16,1,.3,1)`, 600 ms | text, panels |
| `--ease-io` | `cubic-bezier(.65,0,.35,1)` | travel inside scenes |

- Springs: position k 170 / c 20; wobble k 420 / c 14.
- Hit-stop 90 ms, blink 110 ms, shake 6 px over 250 ms, crossfade 160 ms.
- Text never moves more than a 12 px fade-up.
- In the DOM, only `transform`, `opacity` and SVG `stroke-dashoffset` animate.

## 7. Layout

- **Hero:**
  - `min-height: 100svh`, with the name on the lower third and the meta lines below it.
  - The meta lines fade up (0/70/140 ms delays, 600 ms `--ease-out`), but only under `.js:not(.rm)`.
  - The cue appears at 3 s, bottom-right on desktop and centered on mobile.
  - `.blip-static`: absolute, `left: 50%`, `top: calc(var(--tittle-y, .19) * 1em)`, `width: calc(var(--tittle-size, .22) * 1em)`, `translate(-50%, -78%)`. It is `visibility: hidden` when JS motion is on (so it still has a rect: it is the animated Blip's target) and visible under `.no-js` and `.rm`. Calibrate both vars once against Bricolage 800 so it covers the tittle.
- **≥ 960 px, `.story`:**
  - `grid-template-columns: 5fr 7fr`, gap 48 px.
  - Header: column 1, row 1. Steps: column 1, row 2.
  - Figure: column 2, rows 1–2, `position: sticky; top: 10svh; height: 80svh; align-self: start`. Its layout is a flex column: tag, SVG (flex 1), panel, caption, controls.
  - `li`: `min-height: calc(var(--beat, 1) * 44svh)`.
  - Active li: 3 px left rule in `--accent`, `--ink` text; other li in `--ink-2`.
  - `.details`: grid 7fr/5fr. Left: built, explored, fix. Right: credit/note, stack chips, links.
- **< 960 px:**
  - Single column in DOM order: header, figure, steps, details.
  - Figure: `position: sticky; top: 0; height: 58svh; background: var(--paper); z-index: 2`, bottom rule. Panel max 2 lines. The controls are one horizontally scrollable row of 44 px buttons.
  - `li`: `min-height: calc(var(--beat, 1) * 40svh)`.
  - Read line at `0.72·H`. Small SVG labels are hidden. The rail is hidden, so Blip has no host between stages.
- **≥ 1200 px rail:** `position: fixed; left: 12px; top: 50%`. Numbered links; the name shows on hover or focus; `aria-current` on the active one.
- **Experience:** a centered column, max 46rem; dates right-aligned in mono.
- **Contact:** `min-height: 70svh`, centered, "Say hi" at `clamp(3rem, 9vw, 6rem)`.
- **Print:** hide figures, rail and Blip.

## 8. Reduced motion and no-JS

- **`.rm`** (OS setting or the Motion toggle, switched live):
  - No rAF loop, no springs, no 5 Hz loop, no shake, no CSS keyframes (`.rm *{animation:none!important;transition:none!important}`).
  - `li` min-height is auto; figures are `position: static`.
  - Each scene renders `render(state, poster)` once when mounted, and again on resize. A static Blip `<use>` group (body + face + the costume symbol the poster returns) is drawn in the SVG at the poster target.
  - The overlay Blip is hidden. The hero and footer show `.blip-static`.
  - Buttons still work and jump straight to their end state: the batch closes immediately with its message, the hang replay shows its three caption lines as a list, Launch shows the flattened frame plus the log line, and the vent toggles the terminal state.
  - Turning motion back on re-measures and resumes the loop.
- **`.no-js`** (the class stays if the head script never runs):
  - `.figure`, the cue, the rail and the overlay Blip are `display: none`; `li` min-height is auto.
  - What's left is an editorial long-read: numbered steps with mono spec lines, and the static Blip on both i's (the sprite is inline, so `<use>` works).
  - The theme follows `prefers-color-scheme`. Every link works.

## 9. Performance budget

| Item | Budget |
|---|---|
| First load | ≤ 230 KB transferred (HTML ≤ 40 KB raw, CSS ≤ 20 KB, JS ≤ 70 KB raw / ≤ 22 KB gzip, fonts ≤ 140 KB) |
| Images at load | None, apart from the favicon |
| LCP | the h1 text: ≤ 1.2 s desktop, ≤ 2.5 s Lighthouse mobile |
| CLS | ≤ 0.02 (`.figure` size is reserved in CSS) |
| TBT | ≤ 100 ms |
| Lighthouse | performance ≥ 95 desktop and ≥ 90 mobile; accessibility 100; best practices 100; SEO ≥ 95 |
| Script per frame while scrolling | ≤ 4 ms on a mid laptop; ≤ 12 ms at 4× CPU throttle |
| Idle | 0 rAF callbacks after 1 s with no input (excluding a visible 5 Hz act B or a running clip) |

Also: at most 3 layout reads per frame; at most 400 SVG nodes per stage; only visible stages render; `putImageData` only on a step change; no SVG filters; `will-change` only on Blip.

## 10. Accessibility

- **Landmarks and headings:**
  - Skip link first: "Skip to projects" → `#work`.
  - `header`, `nav` (topnav and rail, both labeled), `main`, `footer`.
  - Headings in order: h1, then h2 (projects, Experience, About, Say hi), then h3.
- **Stages:** `aria-hidden="true" focusable="false"`. The article text carries all their meaning, and every tip's content also appears in that text.
- **Controls:** every control is a real `<button type="button">` with visible text and `aria-pressed` where it toggles. Focus is always visible. Targets are at least 44 px.
- **Announcements:** `#live` (`aria-live="polite"`) updates only after user actions.
- **Blip:** a `<button aria-label="Poke Blip">`, last in the DOM. When it has no host it is `visibility: hidden`, which also removes it from tab order. It never covers text: it only sits on stages, gutters and the dots of i's.
- **Contrast:** all text tokens meet 4.5:1 in both themes, and `--ok`, `--warn` and `--danger` are used only for graphics or large text. Alerts always carry a text label.
- **No flashing:** the 5 Hz rings are thin and at most .35 alpha.

## 11. `?check` (one runnable self-test in core.js)

`?check` logs each failure with `console.error` and ends with `console.log('check: N failures')`.

1. **Structure:** each `.project` has a unique id, an h2, a `.summary` and at least 2 `ol.steps li`. Custom scenes have li count equal to `beats`. Every `data-scene` resolves or is absent.
2. **Forbidden phrases** in `document.body.textContent`, the title and the meta description. Hidden elements are included.
   - **Global:** `1.63`, `51 req`, `1.55`, `1.47x`, `1.58x`, `31 req`, `self-healing`, `failover`, `live demo`, `free plan`, `free tier`, `free-tier`, `genotype`, `Daniel Marino`, `Collaborative Lab`, `@umich.edu`, `Alex-M-Liu`, `C:\Users`, `HANDOFF`, `pgiff`, `/\b172\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/`, `/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/`, `/manuscript[^.]{0,60}\b(published|submitted|accepted)\b/i` and its reverse.
   - **`#inference-server`:** `LPUSH`, `heartbeat`, `Docker`, `fault tolerant`, `fault-tolerant`, `production`, `GPU`, `scalable`, `guaranteed`, `versioning`.
   - **`#socr-braingen`:** `/FID\s*[=:]?\s*\d/`, `PSNR`, `SSIM`, `per image in 1`, `A10G`, `a10g`, `RTX`, `from scratch`.
   - **`#claws`:** `predictive`, `gates every merge`, `tests pass`, `passed`, `INFRA lead`, `competition`, `test week`.
   - **`#noverwatch`:** `prevent`, `polls every`, `at boot`, `Battle.net`, `github.com`.
3. **Privacy:** every email-shaped string must be `liualex639@gmail.com`; no `tel:` links; no visible (non-hidden) link to `stilettocode`, `huggingface.co/spaces` or `Socr_2026`.
4. **Pending list:** `console.info` lists every `[data-confirm]` still hidden.
5. **Logic:**
   - The batch sim, given fake times, closes at 8 clicks as `full` and with 3 clicks after 1,200 ms as `deadline`.
   - `synthMask` area/lobe stays inside its bin for 4 lobes × 3 sizes × 10 seeds.
   - ᾱ strictly decreases over t; ᾱ(995) < 1e-3; ᾱ(0) > 0.999.
   - The same seed gives an identical `Float32Array`.
   - Generic layout: for N = 2..9, all nodes sit inside 800×560 and none overlap.
   - Every scene's `render` at T ∈ {0, .5, …, beats} returns finite x and y in [−100, 900] × [−200, 700].

## 12. Hidden until Alex confirms (shipped as `hidden data-confirm`)

- GPA 3.7/4.0.
- Résumé link: needs a phone-free `resume.pdf`.
- Inference-Server GitHub link: needs a real README and HANDOFF.md removed from the repo.
- Socr_2026 link: needs lab approval, because the repo exposes the manuscript draft.
- Advisor names: confirm Simeone vs Daniel Marino (two places).
- The CLAWS "Director of Infrastructure" title and the six-person subteam.
- Click-test the LinkedIn URL once; it is visible, but the bot check couldn't verify it.
- Alex approves publishing the "What I'd fix" lists and the 2× variance note. Both are visible by default and both are true.

## 13. Acceptance checklist

**Truth and privacy**
1. `?check` reports 0 failures and lists exactly the §12 pending items.
2. No throughput, latency, FID, PSNR or SSIM number appears anywhere.
3. BrainGen is described as on a feature branch (not merged into the lab's live site), with "manuscript in preparation" and no title or author list, and the fig. 02 illustration tag is visible in every state.
4. CLAWS never expands its acronym. Teammate blocks are drawn dashed. The team repo is not linked. The note explaining 6 s vs 5 Hz is present.
5. Noverwatch never says "prevent"; the replay counter increments ("Blocked 2", "Blocked 3", …); the log uses the visitor's clock; there is no game art.
6. The only email on the site is liualex639@gmail.com; there is no phone number, local path, IP address or teammate name, including in HTML comments and the console line.

**Data-driven**
7. Moving the MapReduce article above Noverwatch reorders the page, the rail and the kicker numbers, with no JS edits.
8. Deleting `data-scene` from any custom article gives a working generic scene, with a console.warn only if the li counts mismatch.
9. A new pasted article with 3 li and no `data-scene` renders a 3-node generic scene with Blip in a hard hat.
10. Removing `hidden` from a `data-confirm` element publishes it with no other change.

**Behavior**
11. On desktop, Blip drops onto the i within 1.5 s of `fonts.ready`, covers the tittle, bounces and tracks the cursor; scrolling back to the top returns it to the i.
12. While scrolling at any speed through a sticky stage, Blip stays glued to its stage position (no visible lag relative to the stage).
13. Each scene, scrubbed forwards and then backwards through every beat, returns to identical visuals (screenshot diff at T = 0, mid and end).
14. Inference: scrubbing shows "closed: full (8)" in W2 and "closed: 200 ms (2)" in W4. Eight fast "Send requests" clicks close the batch as full; one click closes on the deadline after about 1.2 s, and the screen reader hears it. "Replay the hang" plays and restores. Poke while queued shows "FIFO. No cutting."
15. BrainGen: the denoise beat shows exactly 200 distinct t values, from 995 down to 0. Lobe, size and seed changes re-render at the current t. The same seed reproduces an identical image. The Tumor Mask tab shows black, grey and white.
16. CLAWS: the alerts appear WARN, then DANGER, then FAST, and re-sort danger-first; the duplicate merges. The vent toggle drains O2 in the act B terminal and HUD, and the loop stops when the stage scrolls offscreen.
17. Noverwatch: the slam fires once on the forward crossing, with shake and hit-stop; scrubbing back restores everything; "Launch Overwatch" works at any scroll position, and the attempt-3 footnote is the per-watcher explanation.
18. Hovering the Field AI row (≥ 1200 px) gives Blip legs for 1.2 s. In the footer, Blip lands on the i of "Say hi". Copy shows "Copied".

**Reduced motion / no-JS / mobile**
19. With OS reduced motion on: no rAF after load (Performance panel), a static poster per project (BrainGen includes the 3-thumbnail strip), and Blip static on both i's. Every button still works and jumps to its end state. The Motion toggle switches modes live.
20. With JS disabled: the whole page reads cleanly, figures are hidden, both i's show a static Blip, and there are no console errors.
21. At 375×812: no horizontal page scroll; 16 px gutters; the sticky figure is 58svh with an opaque background; steps scroll under it; the pan follows Blip; controls are at least 44 px; mono labels are at least 12 px.
22. Light, dark, system dark and the manual toggle all render correct tokens with no unreadable text; the toggle persists across reloads.

**Performance and accessibility**
23. The Lighthouse and budget numbers in §9 are met (desktop and mobile emulation).
24. At 4× CPU throttle, a scroll through the whole page has no long task over 50 ms after load.
25. axe reports zero violations. Keyboard-only users can reach every link, control and toggle, in order, with visible focus. Screen readers read the h1 as "Alex Liu" and announce `aria-current` on steps.
26. A local `file://` double-click preview works (classic scripts), and GitHub Pages serves it from the repo root with `.nojekyll`.

**Build order (one pass):** content and CSS until the no-JS page is complete, then core (hosts, Blip, beat clock), then generic, then killswitch, queue, telemetry and denoise in that order, then reduced motion and no-JS, then mobile, then `?check` and the performance pass.