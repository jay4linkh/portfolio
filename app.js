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
      el('div', { class: 'proj-metric' }, el('b', {}, p.metric.value), el('span', {}, p.metric.label))),
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

  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
})();

// Hero: a slowly turning embedding cloud — four clusters, one per project. The pointer links nearby points.
function startField(cv) {
  const ctx = cv.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, rgb = '47,75,255', mouse = null, t = 0;
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const centres = [[-0.55, -0.2, 0.2], [0.45, -0.35, -0.3], [0.2, 0.45, 0.35], [-0.35, 0.4, -0.4]];
  const pts = [];
  centres.forEach((c, k) => { for (let i = 0; i < 70; i++) pts.push({ x: c[0] + gauss() * 0.16, y: c[1] + gauss() * 0.16, z: c[2] + gauss() * 0.16, k }); });
  for (let i = 0; i < 60; i++) pts.push({ x: (rnd() - 0.5) * 2, y: (rnd() - 0.5) * 1.6, z: (rnd() - 0.5) * 2, k: -1 });

  const recolor = () => { rgb = getComputedStyle(document.documentElement).getPropertyValue('--dot').trim() || rgb; if (still) draw(); };
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (still) draw();
  };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const a = t * 0.00012, ca = Math.cos(a), sa = Math.sin(a);
    const wide = W > 760, cx = wide ? W * 0.68 : W * 0.88, cy = wide ? H * 0.42 : H * 0.2, sc = Math.min(W, H) * (wide ? 0.42 : 0.55), fade = wide ? 1 : 0.55;
    const proj = pts.map((p) => {
      const x = p.x * ca - p.z * sa, z = p.x * sa + p.z * ca, f = 1.8 / (2.6 + z);
      return { X: cx + x * sc * f, Y: cy + p.y * sc * f, d: f, k: p.k };
    });
    if (mouse) {
      ctx.lineWidth = 1;
      for (const q of proj) {
        const dx = q.X - mouse.x, dy = q.Y - mouse.y, dd = dx * dx + dy * dy;
        if (dd < 140 * 140) { ctx.strokeStyle = `rgba(${rgb},${0.35 * (1 - Math.sqrt(dd) / 140)})`; ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(q.X, q.Y); ctx.stroke(); }
      }
    }
    for (const q of proj) {
      const r = (q.k < 0 ? 1.1 : 1.9) * q.d * 1.25;
      ctx.fillStyle = `rgba(${rgb},${fade * (q.k < 0 ? 0.22 : 0.3 + q.d * 0.35)})`;
      ctx.beginPath(); ctx.arc(q.X, q.Y, r, 0, Math.PI * 2); ctx.fill();
    }
  };
  const loop = (ts) => { t = ts; draw(); requestAnimationFrame(loop); };
  addEventListener('resize', size);
  cv.parentElement.addEventListener('pointermove', (e) => { const b = cv.getBoundingClientRect(); mouse = { x: e.clientX - b.left, y: e.clientY - b.top }; });
  cv.parentElement.addEventListener('pointerleave', () => { mouse = null; });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', recolor);
  size(); recolor();
  if (still) { t = 4000; draw(); } else requestAnimationFrame(loop);
  return { recolor };
}
