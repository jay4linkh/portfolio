// Everything on the page comes from content.json, so editing that one file updates the site.
(async function () {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'style') n.style.cssText = v;
      else n.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k != null && k !== '') n.append(k);
    return n;
  };

  // Theme toggle, remembered per visitor
  const root = document.documentElement;
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('#themeBtn').addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    field.recolor();
  });

  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#yr').textContent = new Date().getFullYear();

  const field = startField($('#field'));
  startMusic($('#soundBtn'));

  let c;
  try { c = await (await fetch('/content.json', { cache: 'no-cache' })).json(); }
  catch (e) { console.error('content.json failed to load', e); return; }

  document.querySelectorAll('[data-k]').forEach((n) => { n.textContent = c[n.dataset.k] ?? ''; });
  if (c.links?.github) $('#ghBtn').href = c.links.github;

  $('#stats').append(...c.stats.map((s) => el('div', { class: 'stat' }, el('dt', {}, s.value), el('dd', {}, s.label))));

  $('#jump').append(...c.projects.map((p) => el('a', { href: '#' + p.id }, p.title)));

  const fmt = (v, ch) => (ch.decimals != null ? Number(v).toFixed(ch.decimals) : String(v)) + (ch.unit || '');
  const figure = (p) => {
    const ch = p.chart;
    const max = ch.max || Math.max(...ch.items.map((i) => i.value));
    return el('figure', { class: 'fig' },
      el('div', { class: 'fig-label' }, 'Evaluation · ' + p.title),
      el('div', { class: 'bars', role: 'list' }, ch.items.map((it, i) =>
        el('div', { class: 'bar-row' + (it.highlight ? ' hl' : ''), role: 'listitem' },
          el('div', { class: 'bar-head' }, el('span', {}, it.label), el('span', { class: 'v' }, fmt(it.value, ch))),
          el('div', { class: 'track' }, el('div', { class: 'fill', style: `--w:${Math.max(0.6, (it.value / max) * 100)}%;animation-delay:${i * 90}ms` }))
        ))),
      el('figcaption', {}, ch.caption));
  };

  $('#projectList').append(...c.projects.map((p) => el('article', { class: 'proj reveal', id: p.id, 'aria-labelledby': p.id + '-h' },
    el('div', { class: 'proj-top' },
      el('div', {}, el('p', { class: 'proj-kicker' }, p.kicker), el('h3', { id: p.id + '-h' }, p.title), el('p', { class: 'proj-summary' }, p.summary)),
      el('div', { class: 'proj-metric' }, el('b', {}, p.metric.value), el('span', {}, p.metric.label), p.note ? el('p', { class: 'hand' }, p.note) : null)),
    el('div', { class: 'proj-body' },
      el('div', { class: 'story' },
        el('div', {}, el('h4', {}, 'The problem'), el('p', {}, p.problem)),
        el('div', {}, el('h4', {}, 'What I built'), el('p', {}, p.built)),
        el('div', {}, el('h4', {}, 'Result'), el('p', {}, p.result))),
      figure(p)),
    el('div', { class: 'proj-foot' },
      el('ul', { class: 'chips', 'aria-label': 'Tech stack' }, p.stack.map((s) => el('li', {}, s))),
      el('div', { class: 'proj-links' }, p.links.length
        ? p.links.map((l) => el('a', { href: l.url, target: '_blank', rel: 'noopener' }, l.label + ' ↗'))
        : el('span', { class: 'note' }, 'Code available on request')))
  )));

  $('#approachList').append(...c.approach.map((a) => el('div', { class: 'rule' }, el('h3', {}, a.title), el('p', {}, a.text))));
  $('#skillList').append(...c.skills.map((s) => el('div', { class: 'skill' }, el('h3', {}, s.group), el('ul', {}, s.items.map((i) => el('li', {}, i))))));
  if (c.coursework) $('#course').append(el('b', {}, 'Coursework: '), c.coursework);

  const L = c.links || {}, cl = $('#contactLinks');
  if (L.email) {
    const b = el('button', { class: 'btn btn-primary', type: 'button' }, L.email);
    const note = el('span', { class: 'copy-note', 'aria-live': 'polite' });
    b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(L.email); note.textContent = 'Email copied'; }
      catch (e) { location.href = 'mailto:' + L.email; }
    });
    cl.append(b, note);
  }
  if (L.linkedin) cl.append(el('a', { class: 'btn' + (L.email ? '' : ' btn-primary'), href: L.linkedin, target: '_blank', rel: 'noopener' }, 'LinkedIn ↗'));
  if (L.github) cl.append(el('a', { class: 'btn' + (L.email || L.linkedin ? '' : ' btn-primary'), href: L.github, target: '_blank', rel: 'noopener' }, 'GitHub ↗'));
  if (L.resume) cl.append(el('a', { class: 'btn', href: L.resume, target: '_blank', rel: 'noopener' }, 'Résumé (PDF) ↗'));

  // Lift cards in as they arrive; anything already on screen stays put.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.remove('pre'); e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((n) => {
      if (n.getBoundingClientRect().top > innerHeight) n.classList.add('pre');
      io.observe(n);
    });
  } else document.querySelectorAll('.reveal').forEach((n) => n.classList.add('in'));

  startSwarm(document.querySelectorAll('.sec-head, .proj, .rule, .skill'));

  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
})();

// Hero: a slowly turning embedding space in its own window — one cluster per project, each point
// linked to its nearest neighbours. Hovering (or tapping) a cluster lights it up and names it.
function startField(cv) {
  const ctx = cv.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, rgb = '37,99,235', ink = '22,22,20', mouse = null, t = 0, hot = -1, ease = [0, 0, 0, 0];
  const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const names = ['SmartCross', 'Cosmic Watch', 'SharpeShooter', 'PulseAI'];
  const targets = ['smartcross', 'cosmic', 'sharpe', 'pulse'];
  const centres = [[-0.5, -0.32, 0.25], [0.5, -0.3, -0.25], [0.42, 0.42, 0.3], [-0.42, 0.38, -0.3]];
  const pts = [];
  centres.forEach((c, k) => { for (let i = 0; i < 46; i++) pts.push({ x: c[0] + gauss() * 0.13, y: c[1] + gauss() * 0.13, z: c[2] + gauss() * 0.13, k, ph: rnd() * 6.28 }); });
  for (let i = 0; i < 40; i++) pts.push({ x: (rnd() - 0.5) * 1.9, y: (rnd() - 0.5) * 1.7, z: (rnd() - 0.5) * 1.9, k: -1, ph: rnd() * 6.28 });
  // two nearest neighbours inside each cluster, found once
  const edges = [];
  pts.forEach((p, i) => {
    if (p.k < 0) return;
    const near = pts.map((q, j) => [j, q.k === p.k && j !== i ? (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 : Infinity]).sort((a, b) => a[1] - b[1]).slice(0, 2);
    near.forEach(([j]) => { if (i < j || !edges.some((e) => e[0] === j && e[1] === i)) edges.push([i, j, p.k]); });
  });

  const recolor = () => {
    const cs = getComputedStyle(document.documentElement);
    rgb = cs.getPropertyValue('--dot').trim() || rgb;
    const m = cs.getPropertyValue('--ink').trim().match(/^#(..)(..)(..)$/);
    if (m) ink = m.slice(1).map((h) => parseInt(h, 16)).join(',');
    if (still) draw();
  };
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (still) draw();
  };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const a = t * 0.00014, ca = Math.cos(a), sa = Math.sin(a), tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
    const cx = W / 2, cy = H / 2, sc = Math.min(W, H) * 0.62;
    const P = pts.map((p) => {
      const bob = Math.sin(t * 0.0012 + p.ph) * 0.012;
      let x = p.x * ca - p.z * sa, z = p.x * sa + p.z * ca, y = p.y + bob;
      const y2 = y * ct - z * st; z = y * st + z * ct;
      const f = 2 / (3 + z);
      return { X: cx + x * sc * f, Y: cy + y2 * sc * f, d: f, k: p.k };
    });
    // which cluster is under the pointer
    hot = -1;
    if (mouse) {
      let best = 38 * 38;
      for (const q of P) if (q.k >= 0) { const dd = (q.X - mouse.x) ** 2 + (q.Y - mouse.y) ** 2; if (dd < best) { best = dd; hot = q.k; } }
    }
    ease = ease.map((e, k) => e + ((k === hot ? 1 : 0) - e) * 0.15);
    cv.style.cursor = hot >= 0 ? 'pointer' : 'crosshair';
    const lit = (k) => (k < 0 ? 0 : ease[k]);
    const dim = hot >= 0 ? 0.45 : 1;
    for (const [i, j, k] of edges) {
      const p = P[i], q = P[j], l = lit(k);
      ctx.lineWidth = 1 + l * 0.8;
      ctx.strokeStyle = `rgba(${rgb},${Math.min(1, (0.13 + l * 0.7) * (l > 0.05 ? 1 : dim) * Math.min(p.d, 1))})`;
      ctx.beginPath(); ctx.moveTo(p.X, p.Y); ctx.lineTo(q.X, q.Y); ctx.stroke();
    }
    for (const q of P) {
      const l = lit(q.k);
      const r = (q.k < 0 ? 1.2 : 2.1 + l * 2) * q.d;
      const al = q.k < 0 ? 0.25 : (0.35 + q.d * 0.4 + l * 0.6) * (l > 0.05 ? 1 : dim);
      ctx.shadowBlur = l * 14; ctx.shadowColor = `rgba(${rgb},${l})`;
      ctx.fillStyle = `rgba(${rgb},${Math.min(1, al)})`;
      ctx.beginPath(); ctx.arc(q.X, q.Y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // cluster labels at each centroid
    ctx.font = '500 11px "Geist Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    for (let k = 0; k < 4; k++) {
      let sx = 0, sy = 0, n = 0;
      for (const q of P) if (q.k === k) { sx += q.X; sy += q.Y; n++; }
      const l = ease[k], x = sx / n, y = sy / n - 34 - l * 6;
      const w = ctx.measureText(names[k]).width + 14;
      ctx.fillStyle = `rgba(${l > 0.05 ? rgb : ink},${0.08 + l * 0.22})`;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - 11, w, 20, 10) : ctx.rect(x - w / 2, y - 11, w, 20); ctx.fill();
      ctx.fillStyle = `rgba(${l > 0.05 ? rgb : ink},${0.55 + l * 0.45})`;
      ctx.fillText(names[k] + (l > 0.5 ? '  →' : ''), x, y + 3);
    }
  };
  const loop = (ts) => { t = ts; draw(); requestAnimationFrame(loop); };
  new ResizeObserver(size).observe(cv);
  const at = (e) => { const b = cv.getBoundingClientRect(); mouse = { x: e.clientX - b.left, y: e.clientY - b.top }; if (still) draw(); };
  cv.addEventListener('pointermove', at);
  cv.addEventListener('pointerdown', at);
  // tap or click a cluster to jump to that project's write-up
  cv.addEventListener('click', (e) => {
    at(e); draw();
    if (hot < 0) return;
    const el = document.getElementById(targets[hot]);
    if (el) { el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' }); history.replaceState(null, '', '#' + targets[hot]); }
  });
  cv.addEventListener('pointerleave', () => { mouse = null; if (still) draw(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', recolor);
  size(); recolor();
  if (still) { t = 4000; draw(); } else requestAnimationFrame(loop);
  return { recolor };
}

// Agent swarm (in the theme's accent): as each block scrolls in, a few cursors fly over, draw a selection box with its size,
// type the heading in, then leave. Runs once per block and never when reduced motion is on.
function startSwarm(nodes) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const layer = document.createElement('div');
  layer.className = 'swarm';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  const names = ['agent-01', 'agent-02', 'agent-03', 'agent-04', 'agent-05'];
  const arrow = (c) => `<svg viewBox="0 0 14 20" width="14" height="20"><path d="M1 1v15l4-3.6 2.8 6.4 2.4-1-2.8-6.3H13z" fill="${c}" stroke="var(--paper)" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let k = 0;

  const run = async (node) => {
    const r = node.getBoundingClientRect();
    const x = r.left + scrollX, y = r.top + scrollY;
    const n = innerWidth < 640 ? 2 : 3;
    layer.style.height = document.documentElement.scrollHeight + 'px';
    const box = Object.assign(document.createElement('div'), { className: 'swarm-box' });
    box.style.cssText = `left:${x}px;top:${y}px;width:${r.width}px;height:${r.height}px`;
    box.innerHTML = `<i></i><i></i><i></i><i></i><b>${Math.round(r.width)} × ${Math.round(r.height)}</b>`;
    const guide = Object.assign(document.createElement('div'), { className: 'swarm-guide' });
    guide.style.cssText = `left:0;right:0;top:${y}px`;
    const spots = [[x, y], [x + r.width, y + r.height * .5], [x + r.width * .4, y + r.height]];
    const cursors = [];
    for (let i = 0; i < n; i++) {
      const j = (k + i) % names.length, c = document.createElement('div');
      c.className = 'swarm-cur';
      c.innerHTML = arrow('var(--accent)') + `<span>${names[j]}</span>`;
      const side = Math.random() < .5 ? -60 : innerWidth + 60;
      c.style.transform = `translate(${side + scrollX}px, ${y + (Math.random() - .5) * 300}px)`;
      layer.append(c); cursors.push(c);
    }
    k += n;

    // Type the heading in while the box is up.
    const h = node.querySelector('h2, h3');
    const text = h ? h.textContent : '';
    if (h) { h.style.minHeight = h.offsetHeight + 'px'; h.textContent = ''; h.classList.add('typing'); }

    await wait(30);
    cursors.forEach((c, i) => { const [sx, sy] = spots[i]; c.style.transform = `translate(${sx}px, ${sy}px)`; });
    await wait(620);
    layer.append(box, guide);
    requestAnimationFrame(() => { box.classList.add('on'); guide.classList.add('on'); });
    if (h) {
      for (let i = 1; i <= text.length; i++) { h.textContent = text.slice(0, i); await wait(Math.max(12, 520 / text.length)); }
      h.classList.remove('typing'); h.style.minHeight = '';
    } else await wait(500);
    await wait(260);
    box.classList.remove('on'); guide.classList.remove('on');
    cursors.forEach((c) => { c.style.transform += ' translate(' + (Math.random() < .5 ? -1 : 1) * innerWidth + 'px, -120px)'; c.classList.add('off'); });
    await wait(700);
    [box, guide, ...cursors].forEach((e) => e.remove());
  };

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { io.unobserve(e.target); run(e.target); }
  }), { rootMargin: '0px 0px -18% 0px' });
  nodes.forEach((n) => { if (n.getBoundingClientRect().top > innerHeight * .8) io.observe(n); });
}

// Background music, made live in the browser (no audio file): a dark synthwave loop at 104 BPM —
// kick, hats, a pulsing saw-bass arpeggio, a sidechained pad and random "data" blips.
// Browsers only allow sound after a tap, so it is off until the visitor turns it on;
// once they have, it starts again on their first tap or key press on later visits.
function startMusic(btn) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }
  let ctx, master, bus, padBus, noise, playing = false, timer = null, step = 0, next = 0;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const STEP = 60 / 104 / 4;                                   // one 16th note
  const prog = [                                               // Am, F, C, Em — two bars each
    { bass: 33, pad: [57, 60, 64, 71] }, { bass: 29, pad: [53, 57, 60, 67] },
    { bass: 36, pad: [55, 60, 64, 71] }, { bass: 28, pad: [52, 55, 59, 67] }];
  const arp = [0, 12, 7, 12, 0, 12, 10, 12, 0, 12, 7, 15, 0, 12, 7, 19];
  const blipNotes = [81, 84, 86, 88, 91, 93, 96];

  const build = () => {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    bus = ctx.createGain();
    const delay = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    delay.delayTime.value = STEP * 3; fb.gain.value = .32; wet.gain.value = .22;
    delay.connect(fb).connect(delay); delay.connect(wet).connect(bus);
    bus.connect(comp).connect(master).connect(ctx.destination);
    ctx.echo = delay;
    // Pad sits behind its own filter, which slowly opens and closes.
    padBus = ctx.createGain(); padBus.gain.value = .9;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 2;
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = .07; depth.gain.value = 600; lfo.connect(depth).connect(lp.frequency); lfo.start();
    padBus.connect(lp).connect(bus);
    noise = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };

  const kick = (t) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
    g.gain.setValueAtTime(.55, t); g.gain.exponentialRampToValueAtTime(.001, t + .32);
    o.connect(g).connect(bus); o.start(t); o.stop(t + .34);
    padBus.gain.setValueAtTime(.25, t); padBus.gain.linearRampToValueAtTime(.9, t + .3);  // sidechain pump
  };
  const hat = (t, v) => {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = 'highpass'; f.frequency.value = 7500;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .05);
    s.connect(f).connect(g).connect(bus); s.start(t); s.stop(t + .06);
  };
  const bass = (m, t) => {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = hz(m);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(220, t + .13);
    g.gain.setValueAtTime(.07, t); g.gain.exponentialRampToValueAtTime(.001, t + STEP * .95);
    o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + STEP);
  };
  const pad = (notes, t, dur) => notes.forEach((m) => [-9, 9].forEach((c) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = c;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.012, t + .6);
    g.gain.setValueAtTime(.012, t + dur - .3); g.gain.linearRampToValueAtTime(0, t + dur + .4);
    o.connect(g).connect(padBus); o.start(t); o.stop(t + dur + .5);
  }));
  const blip = (t) => {                                        // a short FM chirp, like a model thinking
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    const f = hz(blipNotes[(Math.random() * blipNotes.length) | 0]);
    car.type = 'square'; car.frequency.value = f; mod.frequency.value = f * 2.01; mg.gain.value = f * .8;
    mod.connect(mg).connect(car.frequency);
    if (pan.pan) pan.pan.value = Math.random() * 1.6 - .8;
    g.gain.setValueAtTime(.018, t); g.gain.exponentialRampToValueAtTime(.001, t + .09);
    car.connect(g).connect(pan); pan.connect(bus); pan.connect(ctx.echo);
    car.start(t); mod.start(t); car.stop(t + .1); mod.stop(t + .1);
  };

  const tick = () => {
    while (next < ctx.currentTime + .12) {
      const s = step % 16, bar = (step / 16) | 0, ch = prog[((bar / 2) | 0) % prog.length];
      if (s % 4 === 0) kick(next);
      if (s % 4 === 2) hat(next, .05); else if (Math.random() < .35) hat(next, .015);
      if (bar >= 1) bass(ch.bass + arp[s], next);                // bass comes in after the first bar
      if (s === 0 && bar % 2 === 0) pad(ch.pad, next, STEP * 32);
      if (bar >= 2 && Math.random() < .16) blip(next);
      next += STEP; step++;
    }
  };

  const set = (on) => {
    btn.setAttribute('aria-pressed', on); btn.classList.toggle('on', on);
    btn.setAttribute('aria-label', on ? 'Pause background music' : 'Play background music');
  };
  const play = async () => {
    if (!ctx) build();
    await ctx.resume();
    if (!timer) { step = 0; next = ctx.currentTime + .08; timer = setInterval(tick, 25); }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(.8, ctx.currentTime, .8);
    playing = true; set(true);
  };
  const stop = () => {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, .3);
    playing = false; set(false);
    setTimeout(() => { if (!playing) { clearInterval(timer); timer = null; ctx.suspend(); } }, 1200);
  };
  const remember = (v) => { try { localStorage.setItem('music', v); } catch (e) {} };
  btn.addEventListener('click', (e) => { e.stopPropagation(); if (playing) { stop(); remember('off'); } else { play(); remember('on'); } });

  let wanted = false; try { wanted = localStorage.getItem('music') === 'on'; } catch (e) {}
  if (wanted) {
    const first = (e) => { if (btn.contains(e.target)) return; removeEventListener('pointerdown', first); removeEventListener('keydown', first); if (!playing) play(); };
    addEventListener('pointerdown', first); addEventListener('keydown', first);
  }
  document.addEventListener('visibilitychange', () => { if (ctx && playing) document.hidden ? ctx.suspend() : ctx.resume(); });
}
