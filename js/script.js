/* ============================================================
   GO PERÚ - script.js (vanilla, sin dependencias)
   - Canvas de brasas en el hero
   - Navbar: estado scrolled + scrollspy + menú móvil
   - Scroll-reveal (IntersectionObserver)
   - Contadores animados
   Respeta prefers-reduced-motion en todo el motion.
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     0. RENDER DE CONTENIDO (torneos + roster) desde content.js
     Se ejecuta ANTES de configurar reveal/scrollspy para que
     las tarjetas generadas también reciban las animaciones.
     --------------------------------------------------------- */
  var DATA = window.GOPERU_DATA || { tournaments: [], roster: { leader: null, players: [] } };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* Estado de un torneo segun reloj + override (igual que en v2). */
  function computeState(t, now) {
    var ov = (t.status || 'Automático');
    if (ov === 'Forzar En Vivo') return 'live';
    if (ov === 'Forzar Finalizado' || ov === 'Historial') return 'past';
    var start = t.startISO ? new Date(t.startISO).getTime() : NaN;
    if (isNaN(start)) return 'upcoming';
    var dur = (parseInt(t.durationMin, 10) || 180) * 60000;
    if (now < start) return 'upcoming';
    if (now < start + dur) return 'live';
    return 'past';
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDelta(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    var core = pad2(h) + ':' + pad2(m) + ':' + pad2(s);
    return d > 0 ? d + ' d ' + core : core;
  }
  function timerText(t, state, now) {
    var start = t.startISO ? new Date(t.startISO).getTime() : NaN;
    if (state === 'live') return isNaN(start) ? 'EN VIVO' : 'En vivo hace ' + fmtDelta(now - start);
    if (state === 'upcoming') return isNaN(start) ? '' : 'Empieza en ' + fmtDelta(start - now);
    return '';
  }

  function renderTournaments() {
    var grid = document.getElementById('torneosGrid');
    if (!grid) return;
    grid.innerHTML = '';
    var now = Date.now();
    var list = (DATA.tournaments || []).filter(function (t) {
      return !t.hidden && computeState(t, now) !== 'past';
    });
    list.forEach(function (t) {
      var state = computeState(t, now);
      var isLive = state === 'live';
      var art = el('article', 'match reveal' + (isLive ? ' match--live' : ''));
      var top = el('div', 'match__top');
      top.appendChild(el('span', 'match__game', t.game || ''));
      if (isLive) {
        var badge = el('span', 'match__live');
        badge.appendChild(el('span', 'match__live-dot'));
        badge.appendChild(el('span', null, 'EN VIVO'));
        top.appendChild(badge);
      } else {
        top.appendChild(el('span', 'match__date', (t.date || '') + (t.time ? ' · ' + t.time : '')));
      }
      art.appendChild(top);
      art.appendChild(el('h3', 'match__name', t.name || ''));
      var vs = el('div', 'match__vs');
      vs.appendChild(el('span', null, 'GO PERÚ'));
      vs.appendChild(el('span', 'match__x', 'VS'));
      vs.appendChild(el('span', null, t.rival || ''));
      art.appendChild(vs);
      var ttxt = timerText(t, state, now);
      if (ttxt) {
        var timer = el('div', 'match__timer' + (isLive ? ' match__timer--live' : ''), ttxt);
        timer.setAttribute('data-timer', state);
        if (t.startISO) timer.setAttribute('data-start', t.startISO);
        art.appendChild(timer);
      }
      if (t.desc && t.desc.trim()) art.appendChild(el('p', 'match__desc', t.desc.trim()));
      var links = el('div', 'match__links');
      var url = (t.stream || '').trim();
      if (url) { var a = el('a', 'match__btn', isLive ? 'Ver en vivo' : 'Ver transmisión'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; links.appendChild(a); }
      var ch = (t.challonge || '').trim();
      if (ch) { var b = el('a', 'match__btn match__btn--alt', 'Bracket'); b.href = ch; b.target = '_blank'; b.rel = 'noopener'; links.appendChild(b); }
      if (!links.children.length) { var c = el('a', 'match__btn', 'Ver transmisión'); c.href = '#'; c.setAttribute('data-stream', ''); links.appendChild(c); }
      art.appendChild(links);
      grid.appendChild(art);
    });
  }

  // Actualiza contadores cada segundo; re-renderiza si cambia el reparto.
  var matchSig = '';
  function matchSignature() {
    var now = Date.now();
    return (DATA.tournaments || []).filter(function (t) { return !t.hidden; })
      .map(function (t) { return computeState(t, now); }).join('|');
  }
  function startMatchClock() {
    matchSig = matchSignature();
    setInterval(function () {
      var sig = matchSignature();
      if (sig !== matchSig) { matchSig = sig; renderTournaments(); return; }
      var now = Date.now();
      document.querySelectorAll('#torneosGrid [data-timer]').forEach(function (node) {
        var t = { startISO: node.getAttribute('data-start') };
        var txt = timerText(t, node.getAttribute('data-timer'), now);
        if (txt) node.textContent = txt;
      });
    }, 1000);
  }

  function firstChar(s) { return (s || '?').trim().charAt(0).toUpperCase() || '?'; }

  function renderRoster() {
    var r = DATA.roster || {};
    var mount = document.getElementById('leaderMount');
    if (mount && r.leader) {
      mount.innerHTML = '';
      var L = r.leader;
      var art = el('article', 'leader reveal');
      var av = el('div', 'leader__avatar');
      av.setAttribute('data-initial', firstChar(L.name));
      av.setAttribute('aria-label', 'Avatar de ' + (L.name || ''));
      var img = el('img', 'leader__photo');
      var photo = (L.photo || '').trim();
      if (photo) { img.src = photo; img.alt = 'Foto de ' + (L.name || ''); }
      else { img.alt = ''; img.hidden = true; }
      av.appendChild(img);
      art.appendChild(av);
      var info = el('div', 'leader__info');
      info.appendChild(el('span', 'leader__role', L.role || ''));
      info.appendChild(el('h3', 'leader__name', L.name || ''));
      info.appendChild(el('p', 'leader__desc', L.desc || ''));
      art.appendChild(info);
      mount.appendChild(art);
    }
    var grid = document.getElementById('rosterGrid');
    if (grid && r.players) {
      grid.innerHTML = '';
      r.players.forEach(function (p) {
        var art = el('article', 'player reveal');
        var av = el('div', 'player__avatar');
        var photo = (p.photo || '').trim();
        if (photo) {
          var img = el('img', 'player__photo');
          img.src = photo;
          img.alt = 'Foto de ' + (p.name || '');
          av.appendChild(img);
        } else {
          av.setAttribute('data-initial', (p.initial || '').trim().toUpperCase() || firstChar(p.name));
        }
        art.appendChild(av);
        art.appendChild(el('h4', 'player__name', p.name || ''));
        var role = (p.role || '') + (p.game ? ' · ' + p.game : '');
        art.appendChild(el('span', 'player__role', role));
        grid.appendChild(art);
      });
    }
  }

  renderTournaments();
  renderRoster();
  startMatchClock();

  /* ---------------------------------------------------------
     1. NAVBAR: scrolled + menú móvil
     --------------------------------------------------------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('navBurger');
  var navLinks = document.getElementById('navLinks');

  function onScrollNav() {
    if (window.scrollY > 20) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  }
  // Listener pasivo solo para el estilo de la navbar (barato, no calcula layout pesado)
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

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
  navLinks.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------------------------------------------------------
     2. SCROLLSPY (link activo) con IntersectionObserver
     --------------------------------------------------------- */
  var sections = document.querySelectorAll('main section[id]');
  var linkMap = {};
  navLinks.querySelectorAll('a').forEach(function (a) {
    var id = a.getAttribute('href').replace('#', '');
    linkMap[id] = a;
  });

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          navLinks.querySelectorAll('a').forEach(function (a) { a.classList.remove('is-active'); });
          if (linkMap[id]) linkMap[id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------------------------------------------------------
     3. SCROLL-REVEAL
     --------------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { revObserver.observe(el); });
  }

  /* ---------------------------------------------------------
     4. CONTADORES ANIMADOS
     --------------------------------------------------------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (prefersReduced) {
      el.innerHTML = target + (suffix ? '<span class="u">' + suffix + '</span>' : '');
      return;
    }
    var duration = 1500;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      var val = Math.round(eased * target);
      el.innerHTML = val + (suffix ? '<span class="u">' + suffix + '</span>' : '');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll('.stat__num');
  if ('IntersectionObserver' in window) {
    var countObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { countObs.observe(c); });
  } else {
    counters.forEach(animateCount);
  }

  /* ---------------------------------------------------------
     5. CANVAS DE BRASAS (hero)
     --------------------------------------------------------- */
  var canvas = document.getElementById('embers');
  if (canvas && canvas.getContext && !prefersReduced) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return; // canvas no disponible: el hero sigue funcionando sin brasas
    var hero = canvas.parentElement;
    var particles = [];
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rafId = null;
    var running = true;

    function resize() {
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // densidad adaptada al ancho (menos partículas en móvil)
      var count = Math.round(Math.min(70, Math.max(22, w / 18)));
      particles = [];
      for (var i = 0; i < count; i++) particles.push(makeParticle(true));
    }

    function rand(a, b) { return a + Math.random() * (b - a); }

    function makeParticle(initial) {
      return {
        x: rand(0, w),
        y: initial ? rand(0, h) : h + rand(0, 40),
        r: rand(0.6, 2.2),
        vy: rand(0.25, 0.9),
        vx: rand(-0.25, 0.25),
        life: 0,
        ttl: rand(180, 460),
        alpha: rand(0.25, 0.8)
      };
    }

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.life++;
        p.y -= p.vy;
        p.x += p.vx + Math.sin(p.life * 0.02) * 0.18;
        var fade = 1 - p.life / p.ttl;
        if (p.life >= p.ttl || p.y < -10) { particles[i] = makeParticle(false); continue; }
        var a = p.alpha * Math.max(0, fade);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + (225 + Math.round(rand(-10, 25))) + ',' + Math.round(rand(25, 70)) + ',34,' + a + ')';
        ctx.shadowColor = 'rgba(225,29,34,' + a + ')';
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      rafId = requestAnimationFrame(tick);
    }

    function startLoop() { if (!rafId) { running = true; rafId = requestAnimationFrame(tick); } }
    function stopLoop() { running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    }, { passive: true });

    // Pausa cuando la pestaña no está visible (ahorra batería/CPU)
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopLoop(); else startLoop();
    });

    // Pausa cuando el hero sale de pantalla
    if ('IntersectionObserver' in window) {
      var heroObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) startLoop(); else stopLoop(); });
      }, { threshold: 0 });
      heroObs.observe(hero);
    }

    resize();
    startLoop();
  }

})();
