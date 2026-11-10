# How jaygupta.vercel.app was built

This file is the recipe for the site: the prompts, the design rules, and how each creative piece works.
Use it to rebuild the site, restyle another project the same way, or hand it to an AI as context.

- Live: https://jaygupta.vercel.app
- Code: https://github.com/jay4linkh/portfolio
- Stack: plain HTML + CSS + JavaScript, no framework, no build step. Hosted on Vercel; every push to `main` redeploys.

---

## 1. The master prompt (copy and paste this)

Give this to an AI to build a site in the same style for any project. Swap the parts in [brackets].

```
Build a single-page portfolio for [NAME], [ONE-LINE ROLE].
Plain HTML, CSS and vanilla JS, no framework or build step, deployable to Vercel as static files.
All text lives in content.json; app.js renders it, so editing content never touches code.

Look and feel:
- Anthropic-website calm: warm ivory paper (#F4F3EE), near-black ink, lots of space, one reading column.
- Apple-style typography: Inter Tight 600 for display text with tight tracking (-0.045em), Geist for body.
- A little robotic: Geist Mono for labels and a terminal "boot line" with a blinking cursor above the name.
- A little playful: one hand-written note per project in Comic Neue, rotated -2.5deg, in the accent colour.
- Accent is blue (#2563EB) in light mode and green (#4ADE80) in dark mode. Light/dark follows the system,
  with a toggle that is remembered in localStorage.
- Minimal. Every animation must be small, purposeful and respect prefers-reduced-motion.

Hero:
- Big name, then a two-line tagline a size smaller with a grey-to-accent gradient:
  "[NAME] / thinks sideways. / ships straight."
- At the end of the tagline, a tiny ocean-liner ship (inline SVG, same height as a lowercase letter)
  that zaps in like a Tesla coil (flicker + lightning arcs), floats on glowing rippling water,
  sits under a small faint storm cloud with four thin raindrops, and a lightning bolt strikes it as it
  appears and disappears. Loop every ~5.5s. Keep it glued to the last word so it never wraps alone.
- Beside the text, in its own framed window (never overlapping the text), a canvas showing a slowly
  rotating 3D "embedding space": one cluster of points per project, each point linked to its 2 nearest
  neighbours. Hovering a cluster makes it glow brighter (thicker lines, bigger points, label with "→");
  clicking or tapping it smooth-scrolls to that project's section and updates the URL hash.
- Below: a row of 4 big stats.

Projects, written like ML paper results ("model cards"):
- Kicker, title, one-line summary, then Problem / What I built / Result.
- A big headline metric, the hand-written note, a bar-chart figure with a caption comparing against
  baselines (highlight the project's own bar), a tech-stack chip list, and links.
- A jump bar at the top of the section linking to each project.

Then sections: Approach (4 rules I keep), Skills (4 groups), Contact, footer.
Must work at 375px phone width with no sideways scroll. Accessible: real headings, alt text, focus states.
```

---

## 2. Design system

### Colours (CSS tokens on `:root`)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--paper` | `#F4F3EE` | `#141413` | page background |
| `--panel` | `#FBFAF7` | `#1B1B19` | cards, the animation window |
| `--ink` | `#161614` | `#F0EEE6` | main text |
| `--muted` | `#6A6862` | `#A19E95` | secondary text, cloud, rain |
| `--line` | `#E2E0D7` | `#2C2B27` | borders |
| `--accent` | `#2563EB` blue | `#4ADE80` green | links, highlights, ship, glow |
| `--accent-soft` | `#E3EAF9` | `#1C2B21` | tinted backgrounds |
| `--dot` | `37,99,235` | `74,222,128` | canvas points (RGB, used with alpha) |

Dark mode is defined twice: under `@media (prefers-color-scheme: dark)` guarded by
`:root:not([data-theme="light"])`, and under `:root[data-theme="dark"]`, so both the system setting
and the toggle work.

### Type

| Role | Font | Notes |
|---|---|---|
| Display (name, headings) | Inter Tight 600 | `letter-spacing: -.045em`, line-height ~.98 |
| Body | Geist 400/500 | |
| Robot labels | Geist Mono | boot line, window bar, chart labels |
| Hand notes | Comic Neue 700 | rotated -2.5deg, prefixed with "↳" |

Name size: `clamp(46px, 8.4vw, 104px)`. Tagline: `.74em` of that, two lines.

### Layout

- One column, max ~72rem, side gutter at least 20px (and safe-area aware for notched phones).
- Hero is a 2-column grid (1.2fr text / .8fr animation) that stacks into 1 column at 900px or narrower.
- Scroll reveal only lifts content (`translateY`), it never hides it with opacity, so nothing stays
  invisible if JS or the observer is slow.

---

## 3. The creative pieces, and the prompt behind each

### Boot line (robot touch)
Prompt: *"use anthropic website type robotic a lil"*
`● jay.load() · 4 systems ready` in Geist Mono, a green/blue dot, and a block cursor blinking with
`steps(1)`.

### Hand-written notes (comic touch)
Prompt: *"then comic sans an style font"*
One line per project in Comic Neue, rotated, accent colour, e.g. "yes, I published the miss. that's the point".
They live in `content.json` as `"note"`.

### Embedding-space hero (`startField` in app.js)
Prompts: *"this animation is mixing with our written part"* → moved into its own window;
*"make this a lil brighter when i hover, tapping it takes me to that particular reading part"*.
- 4 clusters × 46 points + 40 noise points, seeded random so it looks the same every load.
- Each point links to its 2 nearest neighbours in the same cluster.
- Rotates with a tilt and gentle bob; drawn on a canvas sized by a ResizeObserver at device pixel ratio.
- Hover: nearest point within 38px picks the cluster; glow eases in (lerp 0.15): thicker lines,
  bigger points, `shadowBlur`, and the label gets "→".
- Click/tap: `scrollIntoView({behavior:'smooth'})` to the project + `history.replaceState('#id')`.
- To reuse: change `names` and `targets` arrays to your sections' titles and ids.

### Tagline + Tesla-coil ship with storm (index.html + end of styles.css)
Prompts: *"unconventional thinking, engineering beyond the obvious"* → *"add some spice"* →
*"thinks sideways. ships straight. with a ship appearing/disappearing at the end like a Nikola Tesla coil"*
→ *"g is going down, fix alignment"* → *"add zappy water below the ship"* → *"make it look like a ship,
not a boat"* → *"same size only"* → *"add a storm"* → *"minimalism also matters"*.

One inline SVG (`viewBox="-10 0 64 44"`, `overflow: visible`), layered back to front:
1. `.storm` — cloud (3 circles + a rounded rect, `--muted` at 38%) and 4 thin raindrops falling at a slant.
2. `.water` — two dashed wave lines flowing in opposite directions (`stroke-dashoffset` animation).
3. `.arcs` — small zig-zag lightning arcs around the ship and on the water, flickering.
4. `.hull` — ocean liner: long hull with raked bow, two decks, bridge, two funnels, mast;
   portholes and windows are drawn in `--paper` so they read as cut-outs.
5. `.bolt` — one lightning bolt from the cloud to the funnel.

All parts share one 5.5s timeline (1s delay) so they move together:
- `zap` (ship): scales in from .4 with flickers at 5–13%, bobs ±3°, flickers out at 70–82%.
- `arc` (arcs + bolt): flashes only during the zap-in and zap-out moments.
- `tide` (water + storm): fades in with the ship, breathes, fades out.
Fixes worth copying:
- Wrap the last word and the ship in `white-space: nowrap` so the ship never wraps alone.
- `background-clip: text` gradients clip descenders; add `padding-bottom: .16em` (and a matching
  negative margin) so letters like "g" keep their tails.
- Reduced motion: hide arcs, bolt and rain; show the still ship and cloud.

### Agent swarm on scroll (`startSwarm` in app.js)
Prompts: *"multiple mouse pointers placing things as we scroll down"* (reference: califa.github.io/swarm-site)
→ *"only one color, different for night and light mode"*.
- An absolutely positioned overlay over the page (`overflow: hidden`, height = `scrollHeight`) so stray
  cursors never cause sideways scroll.
- An IntersectionObserver watches section heads, project cards, rules and skill groups. The first time
  one enters view, a few cursors named `agent-01`…`agent-05` glide in, draw a box with corner handles and
  a `W×H` size badge plus a guide line, then "type" the heading in.
- One colour only: cursors, boxes and labels all use `var(--accent)` (blue in light, green in dark).
- Runs once per block; skipped entirely under `prefers-reduced-motion`.

### Zapper sea at the page end (`.sea` in index.html + styles.css)
Prompts: *"a zapper boat on a zapper ocean, flowing a little fast"* → *"jetty water thrown backward"*
→ *"it should be sparking"* → *"slow it down by 0.1"* (10% slower).
- A 96px strip above the footer. Waves are one SVG on a fixed 4800px track that slides
  `translateX(-1200px)` forever; every wave period divides 1200 so the loop is seamless.
- Three wave lines: a wide faint glow (`sw0`), a main line, and a fast dashed line (`sw2`), plus sparks.
- The same ship SVG as the tagline sails across (9.9s) with a spray SVG behind it: two wake curves and
  drops / tiny zig-zags that flicker so the wash looks electric. The storm is hidden on this ship.
- Avoid `filter: drop-shadow` on the wide wave; it makes rendering slow. Use a wide low-opacity stroke.

### Synthwave music (`startMusic` in app.js)
Prompts: *"suitable music when someone opens my portfolio"* → *"this is not a spa website, add something
AI-related"*.
- Generated live with the Web Audio API, no audio files. 104 BPM, Am–F–C–Em.
- Kick every beat, noise-buffer hi-hats, a saw-bass arpeggio with a filter envelope, a sidechained pad,
  random FM "data blips", a delay echo and a compressor on the master.
- A lookahead scheduler (25ms timer, 0.12s ahead) keeps timing tight.
- Off by default because browsers block autoplay; the speaker button in the nav turns it on, and the
  choice is remembered in `localStorage.music` so later visits start on the first tap. Pauses when the
  tab is hidden.

### Theme toggle
A tiny inline script in `<head>` reads `localStorage.theme` before paint (no flash).
The button flips `data-theme` and calls `field.recolor()` so the canvas picks up the new accent.

### Cache busting
CSS and JS are linked as `styles.css?v=N` / `app.js?v=N`. Bump N on every change so phones don't
show a stale version. `vercel.json` also sends `content.json` with `max-age=0`.

---

## 4. Content model (`content.json`)

```json
{
  "name": "", "school": "", "headline": "", "intro": "",
  "links": { "github": "", "linkedin": "", "email": "", "resume": "" },
  "stats": [{ "value": "", "label": "" }],
  "projects": [{
    "id": "used-in-urls", "title": "", "kicker": "", "summary": "",
    "problem": "", "built": "", "result": "",
    "metric": { "value": "", "label": "" },
    "note": "hand-written line",
    "chart": { "type": "bars", "unit": "%", "max": 100, "decimals": 1, "caption": "",
               "items": [{ "label": "", "value": 0, "highlight": true }] },
    "stack": [""], "links": [{ "label": "", "url": "" }]
  }],
  "approach": [{ "title": "", "text": "" }],
  "skills": [{ "group": "", "items": [""] }],
  "coursework": ""
}
```
Empty link fields are hidden automatically. A project with no links shows "Code available on request".

---

## 5. Hosting

1. Repo on GitHub (`jay4linkh/portfolio`), public.
2. Vercel project `jaygupta`, connected to the repo, no build command, output = repo root.
3. Deployment protection set to previews only, so the production URL is public.
4. Edit → commit → push to `main` → live in about 20 seconds.

---

## 6. Reusing it in another project

- **Just the look:** copy the `:root` tokens, the font link from `index.html`, and the type rules.
- **The ship:** copy the `<span class="ship">…</span>` SVG and the CSS block that starts with
  `/* Tesla-coil ship` through the end of `styles.css`. Put it after any heading's last word.
- **The embedding hero:** copy `startField` from `app.js` plus the `.viz` CSS, then change `names`
  and `targets` to your own sections.
- **The content pattern:** keep text in a JSON file and render it, so non-coders can edit safely.

---

## 7. How it evolved (the request trail)

1. A private dashboard to view projects from the phone with the laptop off.
2. A public site for the LinkedIn bio, on a non-GitHub domain (Vercel), easy to edit.
3. Opening line about me, internship line removed.
4. Anthropic-style calm + robotic labels + comic notes + Apple-like typography.
5. Green accent in dark mode, blue in light.
6. Hero animation moved into its own window so it stops overlapping the text.
7. Brighter hover glow; tap a cluster to jump to its project.
8. New tagline "thinks sideways. ships straight." with a Tesla-coil ship.
9. Fixed the clipped "g", two-line tagline, zappy water.
10. Sailboat → ocean liner, same size.
11. A small storm, kept minimal.
12. Agent-swarm cursors that build each section as you scroll, in the theme's accent only.
13. A zapper ship on a zapper sea at the end of the page, with sparking spray behind it.
14. Background music: ambient first, then replaced with a dark synthwave loop.
