/* ============================================================
   GO PERÚ - admin.js
   Panel local para administrar torneos y roster.
   No usa servidor: edita en memoria y genera data/content.js
   para que lo reemplaces y despliegues.
   ============================================================ */
(function () {
  'use strict';

  var GAMES = ['StarCraft II', 'Left 4 Dead 2', 'League of Legends', 'Otro'];
  // El estado es un override del calculo automatico por horario.
  var OVERRIDE = ['Automático', 'Forzar En Vivo', 'Forzar Finalizado'];
  var MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  /* "2026-07-14T20:00" -> { date: "14 JUL 2026", time: "20:00" } */
  function isoToDisplay(iso) {
    if (!iso || iso.indexOf('T') === -1) return { date: '', time: '' };
    var parts = iso.split('T');
    var dmy = parts[0].split('-'); // [YYYY, MM, DD]
    if (dmy.length !== 3) return { date: '', time: '' };
    var mi = parseInt(dmy[1], 10) - 1;
    var mon = (mi >= 0 && mi < 12) ? MONTHS[mi] : dmy[1];
    return {
      date: String(parseInt(dmy[2], 10)) + ' ' + mon + ' ' + dmy[0],
      time: (parts[1] || '').slice(0, 5)
    };
  }
  /* "14 JUL 2026" + "20:00" -> "2026-07-14T20:00" (para precargar el campo) */
  function displayToIso(date, time) {
    if (!date) return '';
    var m = String(date).trim().match(/^(\d{1,2})\s+([A-Za-zÁÉÍÓÚñÑ]+)\s+(\d{4})$/);
    if (!m) return '';
    var idx = MONTHS.indexOf(m[2].toUpperCase());
    if (idx === -1) return '';
    var t = (time && /^\d{1,2}:\d{2}/.test(time)) ? time.slice(0, 5) : '00:00';
    if (t.length === 4) t = '0' + t;
    return m[3] + '-' + ('0' + (idx + 1)).slice(-2) + '-' + ('0' + parseInt(m[1], 10)).slice(-2) + 'T' + t;
  }

  /* Interruptor (switch) reutilizable; deja un checkbox data-k que lee collect() */
  function switchField(labelText, key, checked) {
    var wrap = document.createElement('div');
    wrap.className = 'adm-field full adm-switch';
    var label = document.createElement('label');
    label.className = 'adm-switch__label';
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('data-k', key);
    input.checked = !!checked;
    var track = document.createElement('span');
    track.className = 'adm-switch__track';
    var txt = document.createElement('span');
    txt.textContent = labelText;
    label.appendChild(input);
    label.appendChild(track);
    label.appendChild(txt);
    wrap.appendChild(label);
    return wrap;
  }

  // Copia inicial de los datos cargados desde content.js
  var data = window.GOPERU_DATA
    ? JSON.parse(JSON.stringify(window.GOPERU_DATA))
    : { tournaments: [], roster: { leader: {}, players: [] } };
  data.roster = data.roster || { leader: {}, players: [] };
  data.roster.leader = data.roster.leader || {};
  data.roster.players = data.roster.players || [];
  data.tournaments = data.tournaments || [];

  var $ = function (id) { return document.getElementById(id); };

  function firstChar(s) { return ((s || '?').trim().charAt(0) || '?').toUpperCase(); }

  /* Lee una imagen, la recorta/optimiza a 320px y devuelve un data URL */
  function processImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var size = 320;
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        if (!ctx) { cb(String(e.target.result)); return; }
        var scale = Math.max(size / img.width, size / img.height);
        var w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        try { cb(canvas.toDataURL('image/jpeg', 0.82)); }
        catch (err) { toast('No se pudo procesar la imagen.'); }
      };
      img.onerror = function () { toast('Archivo de imagen no válido.'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* Control reutilizable de avatar: preview + subir + quitar + ruta manual.
     Devuelve { wrap } y deja un input oculto data-k="photo" que lee collect(). */
  function avatarControl(initialFn, value) {
    var wrap = document.createElement('div');
    wrap.className = 'adm-avatar-ctl';

    var prev = document.createElement('div');
    prev.className = 'adm-avatar';

    var hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.setAttribute('data-k', 'photo');
    hidden.value = value || '';

    var pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.className = 'adm-path';
    pathInput.placeholder = 'o pega una ruta/URL (ej. assets/img/ayax.jpg)';
    if (value && value.indexOf('data:') !== 0) pathInput.value = value;

    function refresh() {
      prev.innerHTML = '';
      var v = hidden.value.trim();
      if (v) {
        var img = document.createElement('img');
        img.src = v; img.alt = '';
        prev.appendChild(img);
      } else {
        prev.textContent = initialFn ? initialFn() : '?';
      }
    }

    var fileLbl = document.createElement('label');
    fileLbl.className = 'adm-mini';
    fileLbl.textContent = 'Subir foto';
    var file = document.createElement('input');
    file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    file.addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      processImage(f, function (dataUrl) { hidden.value = dataUrl; pathInput.value = ''; refresh(); });
      e.target.value = '';
    });
    fileLbl.appendChild(file);

    var rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'adm-mini'; rm.textContent = 'Quitar';
    rm.addEventListener('click', function () { hidden.value = ''; pathInput.value = ''; refresh(); });

    pathInput.addEventListener('input', function () { hidden.value = pathInput.value.trim(); refresh(); });

    var btns = document.createElement('div');
    btns.className = 'adm-avatar-btns';
    btns.appendChild(fileLbl);
    btns.appendChild(rm);

    var right = document.createElement('div');
    right.className = 'adm-avatar-right';
    right.appendChild(btns);
    right.appendChild(pathInput);
    var hint = document.createElement('div');
    hint.className = 'adm-hint';
    hint.textContent = 'La foto se optimiza a 320px y se guarda dentro de content.js. No subes archivos por separado.';
    right.appendChild(hint);
    right.appendChild(hidden);

    wrap.appendChild(prev);
    wrap.appendChild(right);

    refresh();
    return { wrap: wrap, hidden: hidden };
  }

  function field(labelText, key, value, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'adm-field' + (opts.full ? ' full' : '');
    var label = document.createElement('label');
    label.textContent = labelText;
    wrap.appendChild(label);

    var input;
    if (opts.type === 'select') {
      input = document.createElement('select');
      (opts.options || []).forEach(function (o) {
        var op = document.createElement('option');
        op.value = o; op.textContent = o;
        if (o === value) op.selected = true;
        input.appendChild(op);
      });
    } else if (opts.type === 'textarea') {
      input = document.createElement('textarea');
      input.value = value || '';
    } else if (opts.type === 'datetime-local') {
      input = document.createElement('input');
      input.type = 'datetime-local';
      input.value = value || '';
    } else if (opts.type === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      input.value = (value === 0 || value) ? value : '';
      if (opts.min != null) input.min = opts.min;
      if (opts.step != null) input.step = opts.step;
      if (opts.placeholder) input.placeholder = opts.placeholder;
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = value || '';
      if (opts.placeholder) input.placeholder = opts.placeholder;
    }
    input.setAttribute('data-k', key);
    wrap.appendChild(input);
    return wrap;
  }

  /* ---------- TORNEOS ---------- */
  function torneoCard(t) {
    var card = document.createElement('div');
    card.className = 'adm-card';
    card.setAttribute('data-row', 'torneo');

    var del = document.createElement('button');
    del.className = 'adm-card__del';
    del.textContent = 'Eliminar';
    del.addEventListener('click', function () { card.remove(); });
    card.appendChild(del);

    var grid = document.createElement('div');
    grid.className = 'adm-grid';
    var iso = t.startISO || displayToIso(t.date, t.time);
    grid.appendChild(field('Juego', 'game', t.game, { type: 'select', options: GAMES }));
    grid.appendChild(field('Estado', 'status', t.status || 'Automático', { type: 'select', options: OVERRIDE }));
    grid.appendChild(field('Fecha y hora de inicio', 'startISO', iso, { type: 'datetime-local' }));
    grid.appendChild(field('Duración estimada (min)', 'durationMin', (t.durationMin || 180), { type: 'number', min: 1, step: 5, placeholder: '180' }));
    grid.appendChild(field('Nombre del torneo', 'name', t.name));
    grid.appendChild(field('Rival', 'rival', t.rival));
    grid.appendChild(field('Resultado (opcional)', 'result', t.result, { placeholder: 'Campeones, Top 4...' }));
    grid.appendChild(field('Marcador final (opcional)', 'score', t.score, { placeholder: '2-0  (GO PERÚ - rival)' }));
    grid.appendChild(field('Twitch / Stream (opcional)', 'stream', t.stream, { placeholder: 'https://twitch.tv/...' }));
    grid.appendChild(field('Challonge (opcional)', 'challonge', t.challonge, { placeholder: 'https://challonge.com/...' }));
    grid.appendChild(field('Descripción (opcional)', 'desc', t.desc, { type: 'textarea', full: true }));
    grid.appendChild(switchField('Ocultar este torneo del sitio', 'hidden', t.hidden));
    var hint = document.createElement('div');
    hint.className = 'adm-hint adm-field full';
    hint.textContent = 'Con "Automático" el sitio pone En Vivo solo a la hora de inicio y lo pasa a Historial al cumplir la duración. Usa "Forzar En Vivo" o "Forzar Finalizado" solo para casos puntuales.';
    grid.appendChild(hint);
    card.appendChild(grid);
    return card;
  }

  function renderTorneos() {
    var c = $('admTorneos');
    c.innerHTML = '';
    data.tournaments.forEach(function (t) { c.appendChild(torneoCard(t)); });
  }

  /* ---------- JUGADORES ---------- */
  function playerCard(p) {
    var card = document.createElement('div');
    card.className = 'adm-card';
    card.setAttribute('data-row', 'player');

    var del = document.createElement('button');
    del.className = 'adm-card__del';
    del.textContent = 'Eliminar';
    del.addEventListener('click', function () { card.remove(); });
    card.appendChild(del);

    var grid = document.createElement('div');
    grid.className = 'adm-grid';

    var avField = document.createElement('div');
    avField.className = 'adm-field full';
    var avLbl = document.createElement('label');
    avLbl.textContent = 'Foto del jugador (opcional)';
    avField.appendChild(avLbl);
    avField.appendChild(avatarControl(function () { return firstChar(p.initial || p.name); }, p.photo).wrap);
    grid.appendChild(avField);

    grid.appendChild(field('Nombre / Gamertag', 'name', p.name));
    grid.appendChild(field('Rol', 'role', p.role, { placeholder: 'Capitán, Zerg, Soporte...' }));
    grid.appendChild(field('Juego', 'game', p.game, { type: 'select', options: GAMES }));
    grid.appendChild(field('Inicial (si no hay foto)', 'initial', p.initial, { placeholder: 'K' }));
    card.appendChild(grid);
    return card;
  }

  function renderPlayers() {
    var c = $('admPlayers');
    c.innerHTML = '';
    data.roster.players.forEach(function (p) { c.appendChild(playerCard(p)); });
  }

  /* ---------- LÍDER ---------- */
  function renderLeader() {
    var box = $('admLeader');
    box.innerHTML = '';
    var L = data.roster.leader || {};
    var card = document.createElement('div');
    card.className = 'adm-card';

    var grid = document.createElement('div');
    grid.className = 'adm-grid';

    var avField = document.createElement('div');
    avField.className = 'adm-field full';
    var avLbl = document.createElement('label');
    avLbl.textContent = 'Foto del líder (opcional)';
    avField.appendChild(avLbl);
    avField.appendChild(avatarControl(function () { return firstChar(L.name || 'A'); }, L.photo).wrap);
    grid.appendChild(avField);

    grid.appendChild(field('Nombre / Gamertag', 'name', L.name));
    grid.appendChild(field('Rol', 'role', L.role));
    grid.appendChild(field('Descripción', 'desc', L.desc, { type: 'textarea', full: true }));
    card.appendChild(grid);
    box.appendChild(card);
  }

  /* ---------- Leer DOM -> objeto ---------- */
  function readRow(card) {
    var obj = {};
    card.querySelectorAll('[data-k]').forEach(function (inp) {
      var k = inp.getAttribute('data-k');
      if (inp.type === 'checkbox') obj[k] = inp.checked;
      else obj[k] = inp.value.trim();
    });
    return obj;
  }

  function collect() {
    var out = { tournaments: [], roster: { leader: {}, players: [] } };

    $('admTorneos').querySelectorAll('[data-row="torneo"]').forEach(function (card) {
      var o = readRow(card);
      // Deriva fecha/hora visibles desde startISO; normaliza duración.
      var disp = isoToDisplay(o.startISO || '');
      o.date = disp.date;
      o.time = disp.time;
      o.durationMin = parseInt(o.durationMin, 10) || 180;
      if (!o.status) o.status = 'Automático';
      if (o.name || o.rival) out.tournaments.push(o);
    });

    var L = {};
    $('admLeader').querySelectorAll('[data-k]').forEach(function (inp) {
      L[inp.getAttribute('data-k')] = inp.value.trim();
    });
    out.roster.leader = L;

    $('admPlayers').querySelectorAll('[data-row="player"]').forEach(function (card) {
      var o = readRow(card);
      if (o.name) {
        if (!o.initial) o.initial = (o.name.charAt(0) || '').toUpperCase();
        out.roster.players.push(o);
      }
    });

    return out;
  }

  /* ---------- Descargar content.js ---------- */
  function download() {
    var obj = collect();
    var header = '/* ============================================================\n' +
      '   GO PERÚ - Datos editables del sitio\n' +
      '   Generado por el panel admin.html. Reemplaza data/content.js\n' +
      '   con este archivo y despliega para aplicar los cambios.\n' +
      '   ============================================================ */\n';
    var body = 'window.GOPERU_DATA = ' + JSON.stringify(obj, null, 2) + ';\n';
    var blob = new Blob([header + body], { type: 'text/javascript;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'content.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('content.js descargado. Reemplázalo en data/ y despliega.');
  }

  /* ---------- Importar content.js ---------- */
  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var text = String(e.target.result);
        var start = text.indexOf('{');
        var end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('formato');
        var obj = JSON.parse(text.slice(start, end + 1));
        data = obj;
        data.roster = data.roster || { leader: {}, players: [] };
        data.roster.leader = data.roster.leader || {};
        data.roster.players = data.roster.players || [];
        data.tournaments = data.tournaments || [];
        renderTorneos(); renderPlayers(); renderLeader();
        toast('Datos importados correctamente.');
      } catch (err) {
        toast('No se pudo leer el archivo. ¿Es un content.js válido?');
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  /* ---------- Init ---------- */
  renderTorneos();
  renderPlayers();
  renderLeader();

  $('addTorneo').addEventListener('click', function () {
    $('admTorneos').appendChild(torneoCard({ game: 'StarCraft II', status: 'Automático', startISO: '', durationMin: 180, date: '', time: '', name: '', rival: '', result: '', score: '', stream: '', challonge: '', desc: '', hidden: false }));
  });
  $('addPlayer').addEventListener('click', function () {
    $('admPlayers').appendChild(playerCard({ name: '', role: '', game: 'StarCraft II', initial: '', photo: '' }));
  });
  $('btnDownload').addEventListener('click', download);
  $('btnPreview').addEventListener('click', function () { window.open('index.html', '_blank'); });
  $('fileImport').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) importFile(e.target.files[0]);
    e.target.value = '';
  });

})();
