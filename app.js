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

// Background music, made live in the browser (no audio file): slow ambient chords with a soft
// pluck on top. Browsers only allow sound after a tap, so it is off until the visitor turns it on;
// once they have, it starts again on their first tap or key press on later visits.
function startMusic(btn) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }
  let ctx, master, playing = false, timer;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const chords = [[57, 64, 67, 71, 74], [53, 60, 64, 69, 72], [48, 55, 59, 64, 67], [55, 62, 66, 69, 74]]; // Am9 Fmaj9 Cmaj7 G6/9
  const scale = [69, 71, 72, 74, 76, 79, 81, 83];

  const build = () => {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = .4;
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = .05; depth.gain.value = 500; lfo.connect(depth).connect(lp.frequency); lfo.start();
    // Reverb from a decaying noise burst, so it sounds roomy without loading a file.
    const verb = ctx.createConvolver(), len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = .55;
    lp.connect(master); lp.connect(verb).connect(wet).connect(master); master.connect(ctx.destination);
    ctx.bus = lp;
  };

  const pad = (notes, t, dur) => notes.forEach((m, i) => [-6, 6].forEach((cents) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = i ? 'sine' : 'triangle'; o.frequency.value = hz(m); o.detune.value = cents;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 / notes.length * (i ? 1 : 1.6), t + 2.5);
    g.gain.setValueAtTime(.05 / notes.length * (i ? 1 : 1.6), t + dur - 2); g.gain.linearRampToValueAtTime(0, t + dur + 1.5);
    o.connect(g).connect(ctx.bus); o.start(t); o.stop(t + dur + 1.6);
  }));
  const pluck = (m, t) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 1.8);
    o.connect(g).connect(ctx.bus); o.start(t); o.stop(t + 1.9);
  };

  let bar = 0;
  const schedule = () => {
    const t = ctx.currentTime + .1, len = 8;
    pad(chords[bar % chords.length], t, len);
    for (let b = 0; b < 8; b++) if (Math.random() < .55) pluck(scale[(Math.random() * scale.length) | 0], t + b + (Math.random() < .3 ? .5 : 0));
    bar++;
    timer = setTimeout(schedule, len * 1000);
  };

  const set = (on) => {
    btn.setAttribute('aria-pressed', on); btn.classList.toggle('on', on);
    btn.setAttribute('aria-label', on ? 'Pause background music' : 'Play background music');
  };
  const play = async () => {
    if (!ctx) build();
    await ctx.resume();
    if (!timer) schedule();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(.9, ctx.currentTime, 1.2);
    playing = true; set(true);
  };
  const stop = () => {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, .4);
    clearTimeout(timer); timer = null;
    setTimeout(() => { if (!playing) ctx.suspend(); }, 1600);
    playing = false; set(false);
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
