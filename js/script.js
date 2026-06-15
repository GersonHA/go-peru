/* ============================================================
   GO PERÚ GAMING - v2.0 "Legacy Edition"
   Render de content.js + orquestación cinematográfica.
   GSAP es opcional: si falta, degrada a CSS + IntersectionObserver.
   Respeta prefers-reduced-motion en todo el motion.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var DATA = window.GOPERU_DATA || { tournaments: [], roster: { leader: null, players: [] } };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function firstChar(s) { return ((s || '?').trim().charAt(0) || '?').toUpperCase(); }

  /* -------- 0. ESTADO DE BATALLAS (auto por horario + override) -------- */
  // Devuelve 'live' | 'upcoming' | 'past' a partir del reloj del visitante.
  function computeState(t, now) {
    var ov = (t.status || 'Automático');
    if (ov === 'Forzar En Vivo') return 'live';
    if (ov === 'Forzar Finalizado' || ov === 'Historial') return 'past';
    var start = t.startISO ? new Date(t.startISO).getTime() : NaN;
    if (isNaN(start)) return 'upcoming';
    var dur = (parseInt(t.durationMin, 10) || 180) * 60000;
    var end = start + dur;
    if (now < start) return 'upcoming';
    if (now < end) return 'live';
    return 'past';
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // Formatea milisegundos -> "HH:MM:SS" (o "DD d HH:MM:SS" si pasa de un día).
  function fmtDelta(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    var core = pad(h) + ':' + pad(m) + ':' + pad(s);
    return d > 0 ? d + ' d ' + core : core;
  }
  // Texto del contador según estado (para el primer pintado y cada tick).
  function timerText(t, state, now) {
    var start = t.startISO ? new Date(t.startISO).getTime() : NaN;
    if (state === 'live') {
      if (isNaN(start)) return 'EN VIVO';
      return 'En vivo hace ' + fmtDelta(now - start);
    }
    if (state === 'upcoming') {
      if (isNaN(start)) return '';
      return 'Empieza en ' + fmtDelta(start - now);
    }
    return '';
  }

  // Marcador "2-0" / "2:0" / "2 a 0" -> { us: 2, them: 0 } (us = GO PERÚ). null si no aplica.
  function parseScore(s) {
    if (!s) return null;
    var m = String(s).trim().match(/(\d+)\s*\D+?\s*(\d+)/);
    if (!m) return null;
    return { us: parseInt(m[1], 10), them: parseInt(m[2], 10) };
  }
  // outcome: 'win' | 'lose' | 'draw' a partir de dos puntajes.
  function outcomeOf(a, b) { return a > b ? 'win' : (a < b ? 'lose' : 'draw'); }
  function teamBlock(name, score, outcome) {
    var d = el('div', 'battle__team battle__team--' + outcome);
    d.appendChild(el('span', 'battle__team-name', name));
    d.appendChild(el('span', 'battle__team-score', String(score)));
    return d;
  }

  /* -------- 0b. RENDER (batallas + roster) -------- */
  function battleCard(t, state) {
    var isLive = state === 'live', isPast = state === 'past';
    var art = el('article', 'battle' + (isPast ? ' battle--past' : '') + (isLive ? ' battle--live' : ''));

    var top = el('div', 'battle__top');
    top.appendChild(el('span', 'battle__game', t.game || ''));
    if (isLive) {
      var badge = el('span', 'live-badge');
      badge.appendChild(el('span', 'live-badge__dot'));
      badge.appendChild(el('span', null, 'EN VIVO'));
      top.appendChild(badge);
    } else {
      var when = (t.date || '') + (t.time ? ' · ' + t.time : '');
      top.appendChild(el('span', 'battle__date', when));
    }
    art.appendChild(top);

    art.appendChild(el('h3', 'battle__name', t.name || ''));

    var sc = isPast ? parseScore(t.score) : null;
    if (sc) {
      var usOut = outcomeOf(sc.us, sc.them);
      art.classList.add('battle--' + usOut);
      var vsScored = el('div', 'battle__vs battle__vs--scored');
      vsScored.appendChild(teamBlock('GO PERÚ', sc.us, usOut));
      vsScored.appendChild(el('span', 'battle__x', 'VS'));
      vsScored.appendChild(teamBlock(t.rival || '', sc.them, outcomeOf(sc.them, sc.us)));
      art.appendChild(vsScored);
      var vLabel = usOut === 'win' ? 'Victoria' : (usOut === 'lose' ? 'Derrota' : 'Empate');
      art.appendChild(el('span', 'battle__verdict battle__verdict--' + usOut, vLabel));
    } else {
      var vs = el('div', 'battle__vs');
      vs.appendChild(el('span', null, 'GO PERÚ'));
      vs.appendChild(el('span', 'battle__x', 'VS'));
      vs.appendChild(el('span', null, t.rival || ''));
      art.appendChild(vs);
    }

    // Contador en vivo / cuenta regresiva (actualizado por el tick).
    if (isLive || state === 'upcoming') {
      var now = Date.now();
      var txt = timerText(t, state, now);
      if (txt) {
        var timer = el('div', 'battle__timer' + (isLive ? ' battle__timer--live' : ''), txt);
        timer.setAttribute('data-timer', state);
        if (t.startISO) timer.setAttribute('data-start', t.startISO);
        art.appendChild(timer);
      }
    }

    if (isPast && t.result && t.result.trim()) art.appendChild(el('div', 'battle__result', t.result.trim()));
    if (t.desc && t.desc.trim()) art.appendChild(el('p', 'battle__desc', t.desc.trim()));

    var links = el('div', 'battle__links');
    var stream = (t.stream || '').trim();
    if (stream) {
      var label = isPast ? 'Ver repetición' : 'Ver en vivo';
      var a = el('a', 'battle__btn' + (isLive ? ' battle__btn--live' : ''), label);
      a.href = stream; a.target = '_blank'; a.rel = 'noopener';
      links.appendChild(a);
    }
    var ch = (t.challonge || '').trim();
    if (ch) {
      var b = el('a', 'battle__btn battle__btn--alt', 'Bracket');
      b.href = ch; b.target = '_blank'; b.rel = 'noopener';
      links.appendChild(b);
    }
    if (links.children.length) art.appendChild(links);
    return art;
  }

  // Firma del reparto de estados: si cambia entre ticks, re-renderizamos.
  var battleSig = '';
  function bucket() {
    var now = Date.now();
    var live = [], upcoming = [], past = [];
    (DATA.tournaments || []).forEach(function (t) {
      if (t.hidden) return;
      var s = computeState(t, now);
      if (s === 'live') live.push(t);
      else if (s === 'past') past.push(t);
      else upcoming.push(t);
    });
    return { live: live, upcoming: upcoming, past: past };
  }

  function renderBattles() {
    var grid = document.getElementById('v2battles');
    var hist = document.getElementById('v2history');
    var tabsBox = document.getElementById('battleTabs');
    if (!grid) return;

    var b = bucket();
    battleSig = b.live.length + '|' + b.upcoming.length + '|' + b.past.length;

    // Pestañas dinámicas: [En vivo?] Próximas, Historial.
    if (tabsBox) {
      tabsBox.innerHTML = '';
      var tabDefs = [];
      if (b.live.length) tabDefs.push({ key: 'live', label: 'En vivo', live: true });
      tabDefs.push({ key: 'prox', label: 'Próximas' });
      tabDefs.push({ key: 'hist', label: 'Historial' });
      var active = b.live.length ? 'live' : 'prox';
      tabDefs.forEach(function (d) {
        var on = d.key === active;
        var btn = el('button', 'tab' + (on ? ' is-active' : '') + (d.live ? ' tab--live' : ''));
        btn.setAttribute('data-bt', d.key);
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
        if (d.live) { var dot = el('span', 'live-badge__dot'); btn.appendChild(dot); }
        btn.appendChild(document.createTextNode(d.label));
        tabsBox.appendChild(btn);
      });
    }

    // Pestaña "En vivo" = sección destacada (brasas + badge + tarjetas grandes).
    var liveTab = document.getElementById('v2livetab');
    if (liveTab) {
      liveTab.innerHTML = '';
      if (b.live.length) {
        var box = el('div', 'battles__live');
        var canvas = document.createElement('canvas');
        canvas.id = 'embersLive'; canvas.className = 'battles__embers'; canvas.setAttribute('aria-hidden', 'true');
        box.appendChild(canvas);
        var head = el('div', 'battles__live-head');
        var hb = el('span', 'live-badge live-badge--lg');
        hb.appendChild(el('span', 'live-badge__dot'));
        hb.appendChild(el('span', null, 'EN VIVO AHORA'));
        head.appendChild(hb);
        box.appendChild(head);
        var lgrid = el('div', 'battles__grid battles__grid--live');
        b.live.forEach(function (t) { lgrid.appendChild(battleCard(t, 'live')); });
        box.appendChild(lgrid);
        liveTab.appendChild(box);
        initEmbers('embersLive');
      }
    }

    grid.innerHTML = '';
    if (!b.upcoming.length) grid.appendChild(el('p', 'battles__empty', 'No hay torneos programados'));
    else b.upcoming.forEach(function (t) { grid.appendChild(battleCard(t, 'upcoming')); });

    if (hist) {
      hist.innerHTML = '';
      if (!b.past.length) hist.appendChild(el('p', 'battles__empty', 'Sin historial todavía'));
      else b.past.forEach(function (t) { hist.appendChild(battleCard(t, 'past')); });
    }

    syncBattlePanels();
  }

  // Aplica visibilidad de paneles según la pestaña activa.
  function syncBattlePanels() {
    var active = document.querySelector('.tab[data-bt].is-active');
    var which = active ? active.getAttribute('data-bt') : 'prox';
    document.querySelectorAll('[data-bpanel]').forEach(function (p) {
      if (p.getAttribute('data-bpanel') === which) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
  }

  function initBattleTabs() {
    var box = document.getElementById('battleTabs');
    if (!box) return;
    box.addEventListener('click', function (e) {
      var tab = e.target.closest ? e.target.closest('.tab[data-bt]') : null;
      if (!tab) return;
      box.querySelectorAll('.tab[data-bt]').forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      syncBattlePanels();
    });
  }

  // Tick global: actualiza timers; si cambió el reparto, re-renderiza.
  function startBattleClock() {
    setInterval(function () {
      var b = bucket();
      var sig = b.live.length + '|' + b.upcoming.length + '|' + b.past.length;
      if (sig !== battleSig) { renderBattles(); return; }
      var now = Date.now();
      document.querySelectorAll('[data-timer]').forEach(function (node) {
        var state = node.getAttribute('data-timer');
        var iso = node.getAttribute('data-start');
        var t = { startISO: iso };
        node.textContent = timerText(t, state, now) || node.textContent;
      });
    }, 1000);
  }

  function avatarInto(container, photo, name, initial, photoClass) {
    var p = (photo || '').trim();
    if (p) {
      var img = el('img', photoClass);
      img.src = p; img.alt = 'Foto de ' + (name || '');
      container.appendChild(img);
    } else {
      container.setAttribute('data-initial', (initial || '').trim().toUpperCase() || firstChar(name));
    }
  }

  function renderRoster() {
    var r = DATA.roster || {};
    var mount = document.getElementById('v2leader');
    if (mount && r.leader) {
      mount.innerHTML = '';
      var L = r.leader;
      var wrap = el('div', 'legend');
      var card = el('div', 'legend__card');
      var av = el('div', 'legend__avatar');
      av.setAttribute('aria-label', 'Avatar de ' + (L.name || ''));
      avatarInto(av, L.photo, L.name, null, 'legend__photo');
      card.appendChild(av);
      var info = el('div', 'legend__info');
      info.appendChild(el('span', 'legend__role', L.role || ''));
      info.appendChild(el('h3', 'legend__name', L.name || ''));
      info.appendChild(el('p', 'legend__desc', L.desc || ''));
      card.appendChild(info);
      wrap.appendChild(card);
      mount.appendChild(wrap);
    }
    var rail = document.getElementById('v2roster');
    if (rail && r.players) {
      rail.innerHTML = '';
      r.players.forEach(function (p) {
        var art = el('article', 'fighter');
        var av = el('div', 'fighter__avatar');
        avatarInto(av, p.photo, p.name, p.initial, 'fighter__photo');
        art.appendChild(av);
        art.appendChild(el('h4', 'fighter__name', p.name || ''));
        var role = (p.role || '') + (p.game ? ' · ' + p.game : '');
        art.appendChild(el('span', 'fighter__role', role));
        rail.appendChild(art);
      });
    }
  }

  /* -------- 0c. FORMULARIO "ÚNETE" -> WhatsApp del líder -------- */
  function initJoinForm() {
    var form = document.getElementById('joinForm');
    if (!form) return;
    var PHONE = '51927799321'; // WhatsApp del líder (sin + ni espacios)
    function val(id) { var n = document.getElementById(id); return n ? n.value.trim() : ''; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var lines = [];
      lines.push('*Solicitud para unirse a GO PERÚ GAMING*');
      lines.push('');
      lines.push('Juego: ' + val('jfJuego'));
      lines.push('Gamertag: ' + val('jfGamer'));
      lines.push('Liga / Rango: ' + val('jfLiga'));
      lines.push('Raza principal: ' + val('jfRaza'));
      if (val('jfMmr')) lines.push('MMR aproximado: ' + val('jfMmr'));
      lines.push('Actividad: ' + val('jfActividad'));
      lines.push('Discord: ' + val('jfDiscord'));
      if (val('jfCiudad')) lines.push('Ciudad: ' + val('jfCiudad'));
      if (val('jfMsg')) { lines.push(''); lines.push('Mensaje: ' + val('jfMsg')); }
      var url = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(lines.join('\n'));
      window.open(url, '_blank', 'noopener');
    });
  }

  initBattleTabs();
  renderBattles();
  renderRoster();
  startBattleClock();
  initJoinForm();

  /* -------- 1. NAV -------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('navBurger');
  var navLinks = document.getElementById('navLinks');
  var scrollbar = document.getElementById('scrollbar');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (y > 20) nav.classList.add('is-scrolled'); else nav.classList.remove('is-scrolled');
    if (scrollbar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      scrollbar.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
  }
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  navLinks.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* scrollspy */
  if ('IntersectionObserver' in window) {
    var map = {};
    navLinks.querySelectorAll('a[href^="#"]').forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          navLinks.querySelectorAll('a').forEach(function (a) { a.classList.remove('is-active'); });
          map[en.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* -------- 2. REVEALS -------- */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (n) { n.classList.add('is-in'); });
  } else {
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (n) { ro.observe(n); });
  }

  /* -------- 3. CONTADORES -------- */
  function animateCount(node) {
    var target = parseInt(node.getAttribute('data-count'), 10) || 0;
    var suffix = node.getAttribute('data-suffix') || '';
    var plain = node.getAttribute('data-plain');
    function render(v) { node.innerHTML = v + (suffix ? '<span class="u">' + suffix + '</span>' : ''); }
    if (plain || reduced) { render(target); return; }
    var dur = 1500, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var pr = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - pr, 3);
      render(Math.round(eased * target));
      if (pr < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('.nstat__num');
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); obs.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  } else {
    counters.forEach(animateCount);
  }

  /* -------- 4. GSAP: parallax + timeline horizontal -------- */
  if (hasGSAP && !reduced) {
    try {
      window.gsap.registerPlugin(window.ScrollTrigger);
      var gsap = window.gsap, ST = window.ScrollTrigger;

      // Parallax sutil
      document.querySelectorAll('[data-parallax]').forEach(function (n) {
        var amt = parseFloat(n.getAttribute('data-parallax')) || 0.15;
        gsap.to(n, {
          yPercent: amt * 100, ease: 'none',
          scrollTrigger: { trigger: n.closest('section') || n, start: 'top top', end: 'bottom top', scrub: true }
        });
      });

      window.addEventListener('load', function () { ST.refresh(); });
      setTimeout(function () { ST.refresh(); }, 400);
    } catch (err) { /* si GSAP falla, los reveals/IO ya cubren el contenido */ }
  }

  /* -------- 5. BRASAS (canvas) -------- */
  function initEmbers(id) {
    var canvas = document.getElementById(id);
    if (!canvas || !canvas.getContext || reduced) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var host = canvas.parentElement;
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), raf = null, running = true, parts = [];
    function rand(a, b) { return a + Math.random() * (b - a); }
    function make(init) {
      return { x: rand(0, w), y: init ? rand(0, h) : h + rand(0, 40), r: rand(0.6, 2.2), vy: rand(0.25, 0.9), vx: rand(-0.25, 0.25), life: 0, ttl: rand(180, 460), alpha: rand(0.25, 0.8) };
    }
    function resize() {
      w = host.clientWidth; h = host.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(70, Math.max(20, w / 18)));
      parts = []; for (var i = 0; i < n; i++) parts.push(make(true));
    }
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i]; p.life++; p.y -= p.vy; p.x += p.vx + Math.sin(p.life * 0.02) * 0.18;
        var fade = 1 - p.life / p.ttl;
        if (p.life >= p.ttl || p.y < -10) { parts[i] = make(false); continue; }
        var a = p.alpha * Math.max(0, fade);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + (225 + Math.round(rand(-10, 25))) + ',' + Math.round(rand(25, 70)) + ',34,' + a + ')';
        ctx.shadowColor = 'rgba(225,29,34,' + a + ')'; ctx.shadowBlur = 8; ctx.fill();
      }
      ctx.shadowBlur = 0; raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf) { running = true; raf = requestAnimationFrame(tick); } }
    function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } }
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(resize, 200); }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? start() : stop(); }); }, { threshold: 0 }).observe(host);
    }
    resize(); start();
  }
  initEmbers('embers');
  initEmbers('embers2');

})();
