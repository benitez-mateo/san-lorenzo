/* ============================================================
   admin.js — panel del dueño
   Club Atlético San Lorenzo de Muñiz
   Vistas: agenda del día (timeline) y calendario (bloqueos)
   ============================================================ */

(function () {
  'use strict';

  const C = window.SLM;
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.prototype.slice.call(document.querySelectorAll(sel));

  const fmt = n => '$' + n.toLocaleString('es-AR');
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const hh = h => String(h).padStart(2, '0') + ':00';

  const DOW = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const DOW_MIN = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DEPORTES = { futbol5: 'Fútbol 5', voley: 'Vóley', basquet: 'Básquet' };

  const IC = {
    deporte: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6.5l3.4 2.5-1.3 4h-4.2L8.6 9z" fill="currentColor" stroke="none"/></svg>',
    tel: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/></svg>',
    warn: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>',
    lock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    unlock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.9-.9"/></svg>',
    chevL: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    chevR: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'
  };

  /* ---------- guardia de sesión ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    C.auth.getSession().then(function (s) {
      if (!s) { window.location.replace('admin-login.html'); return; }
      init();
    }).catch(function () {
      window.location.replace('admin-login.html');
    });
  });

  /* ---------- estado ---------- */
  let fecha = new Date();          // día seleccionado (compartido por ambas vistas)
  let vista = 'agenda';            // 'agenda' | 'calendario'
  let scopeBloq = 'ambas';         // qué se bloquea: 'ambas' | 'pasto' | 'cemento'
  let calY = fecha.getFullYear();  // mes visible del calendario
  let calM = fecha.getMonth();
  let bloqueosMes = [];            // bloqueos del mes visible (indicadores)
  let reservasDia = [];            // reservas del día seleccionado
  let bloqueosDia = [];            // bloqueos del día seleccionado
  let reservasHoy = [];            // cache de HOY (para notificaciones)
  const notifVistas = new Set();

  const hoy0 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const esHoy = () => C.toISO(fecha) === C.toISO(new Date());

  function init() {
    $('#logoutBtn').addEventListener('click', function () {
      C.auth.signOut().then(function () { window.location.replace('admin-login.html'); });
    });

    $('#prevDay').addEventListener('click', function () { moveDay(-1); });
    $('#nextDay').addEventListener('click', function () { moveDay(1); });

    $$('.ag-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.ag-tab').forEach(function (t) {
          const sel = t === tab;
          t.classList.toggle('active', sel);
          t.setAttribute('aria-selected', String(sel));
        });
        $('#agenda').setAttribute('data-show', tab.getAttribute('data-tab'));
      });
    });

    /* selector de vista */
    $$('.vt-btn').forEach(function (b) {
      b.addEventListener('click', function () { setVista(b.getAttribute('data-vista')); });
    });

    /* calendario: navegación de mes y selección de día (delegado) */
    $('#admCal').addEventListener('click', function (e) {
      const mes = e.target.closest('[data-cmes]');
      if (mes && !mes.disabled) {
        calM += +mes.getAttribute('data-cmes');
        if (calM < 0) { calM = 11; calY--; }
        if (calM > 11) { calM = 0; calY++; }
        loadMes();
        return;
      }
      const dia = e.target.closest('[data-cdia]');
      if (dia && !dia.disabled) {
        const p = dia.getAttribute('data-cdia').split('-');
        fecha = new Date(+p[0], +p[1] - 1, +p[2]);
        renderCal();
        loadDia();
      }
    });

    /* panel del día: alcance, bloquear día completo / horas (delegado) */
    $('#dayPanel').addEventListener('click', function (e) {
      const sc = e.target.closest('[data-scope]');
      if (sc) { scopeBloq = sc.getAttribute('data-scope'); renderDayPanel(); return; }
      if (e.target.closest('#blockDayBtn')) { toggleDia(); return; }
      const hb = e.target.closest('[data-bh]');
      if (hb && !hb.disabled) toggleHora(+hb.getAttribute('data-bh'));
    });

    /* agenda: verificar / liberar reservas por transferencia (delegado) */
    $('#vistaAgenda').addEventListener('click', function (e) {
      const v = e.target.closest('[data-verif]');
      if (v) { verificarPago(v.getAttribute('data-verif')); return; }
      const l = e.target.closest('[data-liberar]');
      if (l) liberarReserva(l.getAttribute('data-liberar'));
    });

    $('#notifClose').addEventListener('click', function () {
      $('#notif').classList.remove('show');
    });

    let v = 'agenda';
    try { if (localStorage.getItem('slm-admin-vista') === 'calendario') v = 'calendario'; } catch (err) {}
    setVista(v);

    checkNotifs();
    setInterval(checkNotifs, 60 * 1000);
    setInterval(function () { if (esHoy()) loadDia(); }, 5 * 60 * 1000);

    /* tiempo real: cuando alguien reserva (o cambia una reserva) se refresca
       la vista sola, sin tocar nada. Debounce por si llegan varios cambios. */
    let rtTimer = null;
    C.db.onReservasChange(function () {
      clearTimeout(rtTimer);
      rtTimer = setTimeout(function () {
        loadDia();
        if (vista === 'calendario') loadMes();
      }, 400);
    });
  }

  /* ---------- vistas ---------- */
  function setVista(v) {
    vista = v;
    try { localStorage.setItem('slm-admin-vista', v); } catch (err) {}
    $$('.vt-btn').forEach(function (b) {
      const sel = b.getAttribute('data-vista') === v;
      b.classList.toggle('active', sel);
      b.setAttribute('aria-selected', String(sel));
    });
    $('#vistaAgenda').hidden = v !== 'agenda';
    $('#vistaCal').hidden = v !== 'calendario';
    if (v === 'calendario') {
      calY = fecha.getFullYear();
      calM = fecha.getMonth();
      loadMes();
    }
    loadDia();
  }

  function moveDay(d) {
    fecha.setDate(fecha.getDate() + d);
    loadDia();
  }

  /* ---------- carga del día seleccionado ---------- */
  function loadDia() {
    const iso = C.toISO(fecha);

    $('#dateTitle').textContent = DOW[fecha.getDay()] + ' ' + fecha.getDate() + ' de ' + MESES[fecha.getMonth()] + ' · ' + fecha.getFullYear();
    $('#hoyPill').hidden = !esHoy();

    Promise.all([C.db.getReservas(iso), C.db.getBloqueos(iso, iso)]).then(function (res) {
      if (C.toISO(fecha) !== iso) return; // el usuario ya cambió de día
      reservasDia = res[0];
      bloqueosDia = res[1];
      if (esHoy()) reservasHoy = reservasDia;
      renderSummary(reservasDia);
      if (vista === 'agenda') {
        renderTimeline('pasto', 'tlPasto');
        renderTimeline('cemento', 'tlCemento');
      } else {
        renderDayPanel();
      }
    }).catch(function () {
      $('#sumTotal').textContent = '—';
      $('#sumCanchas').textContent = 'No se pudo cargar la agenda';
      $('#sumPlata').textContent = '—';
    });
  }

  function renderSummary(rows) {
    const pasto = rows.filter(r => r.cancha === 'pasto').length;
    const cemento = rows.filter(r => r.cancha === 'cemento').length;
    /* la plata pendiente de verificar no se cuenta como cobrada */
    const plata = rows.reduce((acc, r) => acc + (r.estado === 'pendiente' ? 0 : (r.monto_pagado || 0)), 0);

    $('#sumTotal').textContent = rows.length;
    $('#sumTotalLabel').textContent = (rows.length === 1 ? 'reserva' : 'reservas') + (esHoy() ? ' hoy' : '');
    $('#sumCanchas').innerHTML = '<strong>' + pasto + '</strong> en Pasto · <strong>' + cemento + '</strong> en Cemento';
    $('#sumPlata').textContent = fmt(plata);
  }

  function badgeHTML(r) {
    if (r.estado === 'pendiente') return '<span class="pay-badge amber">' + IC.warn + ' A CONFIRMAR</span>';
    return r.tipo_pago === 'sena'
      ? '<span class="pay-badge amber">' + IC.warn + ' SEÑA ' + fmt(r.monto_pagado) + '</span>'
      : '<span class="pay-badge green">' + IC.check + ' PAGO COMPLETO</span>';
  }

  /* ---------- helpers de bloqueos ---------- */
  const NOMBRE_CANCHA = { pasto: 'Pasto Sintético', cemento: 'Cemento', ambas: 'Ambas canchas' };
  const cbq = b => b.cancha || 'ambas'; // bloqueos viejos sin columna = club entero

  /** ¿La cancha `court` está bloqueada a la hora `h`? (incluye bloqueos de día completo) */
  function canchaBloqueadaEn(h, court) {
    return bloqueosDia.some(function (b) {
      const bc = cbq(b);
      if (bc !== 'ambas' && bc !== court) return false;
      return !b.hora_inicio || C.horaInt(b.hora_inicio) === h;
    });
  }

  /** ¿La hora está bloqueada para el alcance elegido? */
  function horaBloqueadaScope(h, scope) {
    if (scope === 'ambas') return canchaBloqueadaEn(h, 'pasto') && canchaBloqueadaEn(h, 'cemento');
    return canchaBloqueadaEn(h, scope);
  }

  function bloqueosFullDia() { return bloqueosDia.filter(b => !b.hora_inicio); }

  /** ¿El día completo está bloqueado para el alcance elegido? */
  function diaBloqueadoScope(scope) {
    const fulls = bloqueosFullDia();
    const has = c => fulls.some(b => cbq(b) === c);
    if (scope === 'ambas') return has('ambas') || (has('pasto') && has('cemento'));
    return has(scope) || has('ambas');
  }

  /* ---------- vista agenda (timeline) ---------- */

  /** Horas bloqueadas de una cancha como tramos contiguos [desde, hasta). */
  function tramosBloqueados(court) {
    const tramos = [];
    for (let h = C.HORA_APERTURA; h < C.HORA_CIERRE; h++) {
      if (!canchaBloqueadaEn(h, court)) continue;
      const ult = tramos[tramos.length - 1];
      if (ult && ult[1] === h) ult[1] = h + 1;
      else tramos.push([h, h + 1]);
    }
    return tramos;
  }

  function renderTimeline(court, mountId) {
    const START = C.HORA_APERTURA, END = C.HORA_CIERRE;
    let html = '';
    for (let h = START; h <= END; h++) {
      html += '<div class="ag-row"><span class="ag-time">' + hh(h === 24 ? 0 : h) + '</span><span class="ag-track"></span></div>';
    }

    /* tramos bloqueados de esta cancha (debajo de las reservas) */
    const grises = tramosBloqueados(court).map(function (t) {
      const top = 'calc(var(--ag-row) * ' + (t[0] - START) + ' + 4px)';
      const height = 'calc(var(--ag-row) * ' + (t[1] - t[0]) + ' - 8px)';
      return '<div class="ag-booking gris" style="top:' + top + ';height:' + height + '">' +
        '<div class="ag-bk-top"><div>' +
        '<p class="ag-bk-name">' + IC.lock + ' Bloqueado</p>' +
        '<p class="ag-bk-time">' + hh(t[0]) + ' – ' + hh(t[1] === 24 ? 0 : t[1]) + '</p>' +
        '</div></div></div>';
    }).join('');

    const propias = reservasDia.filter(r => r.cancha === court);
    const bloques = propias.map(function (r) {
      const ini = C.horaInt(r.hora_inicio);
      const fin = ini + r.duracion_horas;
      const pend = r.estado === 'pendiente';
      const top = 'calc(var(--ag-row) * ' + (ini - START) + ' + 4px)';
      const height = 'calc(var(--ag-row) * ' + r.duracion_horas + ' - 8px)';
      return '<div class="ag-booking ' + (court === 'pasto' ? 'red' : 'navy') + (pend ? ' pendiente' : '') +
        '" style="top:' + top + ';height:' + height + ';min-height:' + (pend ? 200 : 104) + 'px">' +
        '<div class="ag-bk-top"><div>' +
        '<p class="ag-bk-name">' + esc(r.nombre) + '</p>' +
        '<p class="ag-bk-time">' + hh(ini) + ' – ' + hh(fin === 24 ? 0 : fin) + '</p>' +
        '</div>' + badgeHTML(r) + '</div>' +
        '<div class="ag-bk-meta">' +
        '<span class="r">' + IC.deporte + ' ' + DEPORTES[r.deporte] + ' · ' + r.jugadores + ' jugadores</span>' +
        '<span class="r">' + IC.tel + ' ' + esc(r.telefono) + '</span>' +
        '<span class="r">' + (r.medio_pago === 'transferencia'
          ? (pend ? '⇄ Transferencia al alias — esperando que entre ' + fmt(r.monto_pagado) : '⇄ Transferencia verificada')
          : '✓ MercadoPago') + '</span>' +
        '</div>' +
        (pend
          ? '<div class="ag-actions">' +
            '<button type="button" class="ag-btn primario" data-verif="' + r.id + '">✓ Pago recibido</button>' +
            '<button type="button" class="ag-btn" data-liberar="' + r.id + '">Liberar horario</button>' +
            '</div>'
          : '') +
        '</div>';
    }).join('');

    document.getElementById(mountId).innerHTML =
      html +
      '<div class="ag-bookings">' + grises + bloques + '</div>' +
      (propias.length === 0 && grises === '' ? '<p class="ag-empty">Sin reservas este día.</p>' : '');
  }

  /* ---------- vista calendario ---------- */
  function loadMes() {
    const desde = C.toISO(new Date(calY, calM, 1));
    const hasta = C.toISO(new Date(calY, calM + 1, 0));
    C.db.getBloqueos(desde, hasta).then(function (list) {
      bloqueosMes = list;
      renderCal();
    }).catch(function () {
      bloqueosMes = [];
      renderCal();
    });
  }

  function renderCal() {
    const hoy = hoy0();
    const max = new Date(hoy); max.setDate(max.getDate() + 365);
    const first = new Date(calY, calM, 1);
    const prevOk = first > new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const nextOk = new Date(calY, calM + 1, 1) <= max;
    const offset = (first.getDay() + 6) % 7; // semana inicia lunes
    const dias = new Date(calY, calM + 1, 0).getDate();
    const selISO = C.toISO(fecha);

    /* por día: ¿club cerrado entero, o bloqueos parciales/de una cancha? */
    const fullCanchas = {}, partial = {};
    bloqueosMes.forEach(function (b) {
      partial[b.fecha] = true;
      if (!b.hora_inicio) (fullCanchas[b.fecha] = fullCanchas[b.fecha] || {})[cbq(b)] = true;
    });
    const full = {};
    Object.keys(fullCanchas).forEach(function (iso) {
      const f = fullCanchas[iso];
      if (f.ambas || (f.pasto && f.cemento)) full[iso] = true;
    });

    let cells = DOW_MIN.map(d => '<span class="cal-dow" aria-hidden="true">' + d + '</span>').join('');
    for (let i = 0; i < offset; i++) cells += '<span></span>';
    for (let d = 1; d <= dias; d++) {
      const dt = new Date(calY, calM, d);
      const iso = C.toISO(dt);
      const dis = dt < hoy || dt > max;
      const cl = ['cal-day'];
      if (iso === C.toISO(hoy)) cl.push('today');
      if (iso === selISO) cl.push('selected');
      if (full[iso]) cl.push('full-block', 'dot-block');
      else if (partial[iso]) cl.push('dot-block');
      let aria = DOW[dt.getDay()] + ' ' + d + ' de ' + MESES[calM];
      if (full[iso]) aria += ', día bloqueado';
      else if (partial[iso]) aria += ', con bloqueos';
      cells += '<button type="button" class="' + cl.join(' ') + '" data-cdia="' + iso + '"' + (dis ? ' disabled' : '') +
        ' aria-label="' + aria + '"' + (iso === selISO ? ' aria-pressed="true"' : '') + '>' + d + '</button>';
    }

    $('#admCal').innerHTML =
      '<div class="cal-head">' +
      '<button type="button" class="cal-nav" data-cmes="-1" aria-label="Mes anterior"' + (prevOk ? '' : ' disabled') + '>' + IC.chevL + '</button>' +
      '<span class="cal-month">' + MESES[calM] + ' ' + calY + '</span>' +
      '<button type="button" class="cal-nav" data-cmes="1" aria-label="Mes siguiente"' + (nextOk ? '' : ' disabled') + '>' + IC.chevR + '</button>' +
      '</div>' +
      '<div class="cal-grid">' + cells + '</div>';
  }

  function renderDayPanel() {
    const fullScope = diaBloqueadoScope(scopeBloq);

    /* banners: estado de bloqueos de día completo */
    let banners = '';
    if (diaBloqueadoScope('ambas')) {
      banners = '<p class="dp-banner">' + IC.lock + ' Día bloqueado: el público no puede reservar.</p>';
    } else {
      ['pasto', 'cemento'].forEach(function (c) {
        if (diaBloqueadoScope(c)) banners += '<p class="dp-banner warn">' + IC.lock + ' ' + NOMBRE_CANCHA[c] + ': bloqueada todo el día.</p>';
      });
    }

    /* alcance: club entero o una sola cancha */
    const chips = ['ambas', 'pasto', 'cemento'].map(function (s) {
      return '<button type="button" class="chip' + (scopeBloq === s ? ' selected' : '') + '" data-scope="' + s + '" role="radio" aria-checked="' + (scopeBloq === s) + '">' + NOMBRE_CANCHA[s] + '</button>';
    }).join('');

    /* reservas por hora, según el alcance */
    const resPorHora = {};
    reservasDia.forEach(function (r) {
      if (scopeBloq !== 'ambas' && r.cancha !== scopeBloq) return;
      const ini = C.horaInt(r.hora_inicio);
      for (let h = ini; h < ini + r.duracion_horas; h++) resPorHora[h] = (resPorHora[h] || 0) + 1;
    });

    let grid = '';
    for (let h = C.HORA_APERTURA; h < C.HORA_CIERRE; h++) {
      const blq = horaBloqueadaScope(h, scopeBloq);
      let mixto = '';
      if (!blq && scopeBloq === 'ambas') {
        if (canchaBloqueadaEn(h, 'pasto')) mixto = 'Pasto bloq.';
        else if (canchaBloqueadaEn(h, 'cemento')) mixto = 'Cemento bloq.';
      }
      const nres = resPorHora[h] || 0;
      const cl = ['slot'];
      if (blq) cl.push('bloq');
      else if (mixto) cl.push('mixto');
      else if (nres > 0) cl.push('conres');
      let sub = '';
      if (blq) sub = 'Bloqueada';
      else if (mixto) sub = mixto;
      else if (nres > 0) sub = scopeBloq === 'ambas' ? nres + (nres === 1 ? ' reserva' : ' reservas') : 'Reservada';
      const aria = hh(h) + (blq ? ', bloqueada — tocá para desbloquear' : ', tocá para bloquear') +
        (mixto ? ' (' + mixto + ')' : '') + (nres ? ' (' + nres + ' reserva' + (nres > 1 ? 's' : '') + ')' : '');
      grid += '<button type="button" class="' + cl.join(' ') + '" data-bh="' + h + '"' + (fullScope ? ' disabled' : '') +
        ' aria-label="' + aria + '" aria-pressed="' + blq + '">' +
        '<span class="h">' + hh(h) + '</span>' + (sub ? '<span class="sub">' + sub + '</span>' : '') +
        '</button>';
    }

    const sufijo = scopeBloq === 'ambas' ? '' : ' (' + NOMBRE_CANCHA[scopeBloq] + ')';

    $('#dayPanel').innerHTML =
      '<h2 class="dp-title">' + DOW[fecha.getDay()] + ' ' + fecha.getDate() + ' de ' + MESES[fecha.getMonth()] + '</h2>' +
      banners +
      '<div class="chip-row dp-scope" role="radiogroup" aria-label="Qué bloquear">' + chips + '</div>' +
      '<button type="button" id="blockDayBtn" class="btn btn-full dp-block-btn ' + (fullScope ? 'btn-outline' : 'btn-primary') + '">' +
      (fullScope ? IC.unlock + ' Desbloquear día completo' + sufijo : IC.lock + ' Bloquear día completo' + sufijo) +
      '</button>' +
      '<div class="legend">' +
      '<span><span class="dot"></span>Libre</span>' +
      '<span><span class="dot busy"></span>Con reservas</span>' +
      '<span><span class="dot blq"></span>Bloqueada</span>' +
      '</div>' +
      '<div class="slot-grid">' + grid + '</div>' +
      '<p class="cal-hint">Elegí si bloqueás el club entero o una sola cancha, y tocá una hora para bloquearla o desbloquearla. Las reservas ya hechas se mantienen: el bloqueo solo evita reservas nuevas.</p>';
  }

  /* ---------- acciones de bloqueo ---------- */
  function refrescarBloqueos() {
    loadDia();
    loadMes();
  }

  function correrOps(ops) {
    Promise.all(ops).then(refrescarBloqueos).catch(function () {
      alert('No se pudo guardar el cambio. Revisá la conexión y probá de nuevo.');
      refrescarBloqueos();
    });
  }

  function toggleHora(h) {
    const iso = C.toISO(fecha);
    const enHora = bloqueosDia.filter(b => b.hora_inicio && C.horaInt(b.hora_inicio) === h);
    const otra = scopeBloq === 'pasto' ? 'cemento' : 'pasto';
    const ops = [];

    if (horaBloqueadaScope(h, scopeBloq)) {
      /* desbloquear según alcance */
      enHora.forEach(function (b) {
        const bc = cbq(b);
        if (scopeBloq === 'ambas') {
          ops.push(C.db.removeBloqueo(b.id));
        } else if (bc === scopeBloq) {
          ops.push(C.db.removeBloqueo(b.id));
        } else if (bc === 'ambas') {
          /* el club entero estaba bloqueado: libero esta cancha, la otra sigue bloqueada */
          ops.push(C.db.removeBloqueo(b.id));
          ops.push(C.db.addBloqueo(iso, h, otra));
        }
      });
    } else {
      if (scopeBloq === 'ambas') {
        enHora.forEach(b => ops.push(C.db.removeBloqueo(b.id))); // limpia sueltos de una cancha
        ops.push(C.db.addBloqueo(iso, h, 'ambas'));
      } else {
        ops.push(C.db.addBloqueo(iso, h, scopeBloq));
      }
    }
    if (ops.length) correrOps(ops);
  }

  function toggleDia() {
    const iso = C.toISO(fecha);
    const fulls = bloqueosFullDia();
    const otra = scopeBloq === 'pasto' ? 'cemento' : 'pasto';
    const ops = [];

    if (diaBloqueadoScope(scopeBloq)) {
      /* desbloquear el día según alcance */
      fulls.forEach(function (b) {
        const bc = cbq(b);
        if (scopeBloq === 'ambas') {
          ops.push(C.db.removeBloqueo(b.id));
        } else if (bc === scopeBloq) {
          ops.push(C.db.removeBloqueo(b.id));
        } else if (bc === 'ambas') {
          ops.push(C.db.removeBloqueo(b.id));
          ops.push(C.db.addBloqueo(iso, null, otra));
        }
      });
    } else {
      const afectadas = scopeBloq === 'ambas' ? reservasDia : reservasDia.filter(r => r.cancha === scopeBloq);
      if (afectadas.length > 0) {
        const donde = scopeBloq === 'ambas' ? 'Este día' : NOMBRE_CANCHA[scopeBloq] + ' este día';
        const ok = window.confirm(donde + ' tiene ' + afectadas.length + ' reserva' + (afectadas.length > 1 ? 's' : '') +
          '. Se mantienen, pero el público no podrá hacer reservas nuevas. ¿Bloquear igual?');
        if (!ok) return;
      }
      if (scopeBloq === 'ambas') fulls.forEach(b => ops.push(C.db.removeBloqueo(b.id))); // limpia los de una sola cancha
      ops.push(C.db.addBloqueo(iso, null, scopeBloq));
    }
    if (ops.length) correrOps(ops);
  }

  /* ---------- transferencias: verificar pago / liberar horario ---------- */

  function fechaCortaISO(iso) {
    const p = String(iso).split('-');
    return +p[2] + ' de ' + MESES[+p[1] - 1];
  }

  /* arma el link de WhatsApp del cliente (agrega el 9 de celular si falta) */
  function waLink(tel, texto) {
    let d = String(tel).replace(/\D/g, '');
    if (d.indexOf('549') !== 0) d = d.indexOf('54') === 0 ? '549' + d.slice(2) : '549' + d;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(texto);
  }

  function verificarPago(id) {
    const r = reservasDia.find(x => String(x.id) === String(id));
    if (!r) return;
    if (!window.confirm('¿Confirmás que la transferencia de ' + r.nombre + ' (' + fmt(r.monto_pagado) + ') ya entró en la cuenta?')) return;
    C.db.updateEstado(r.id, 'confirmada').then(function () {
      loadDia();
      showNotif({
        titulo: 'Reserva confirmada',
        badge: '<span class="pay-badge green">' + IC.check + ' VERIFICADA</span>',
        sub: esc(r.nombre) + ' · ' + NOMBRE_CANCHA[r.cancha] + ' · ' + hh(C.horaInt(r.hora_inicio)) + '. Se abrió WhatsApp para avisarle.',
        foot: 'El horario ya figura confirmado en el sitio.'
      });
      const msg = '✅ ¡Hola ' + r.nombre + '! Recibimos tu transferencia: la reserva de ' + NOMBRE_CANCHA[r.cancha] +
        ' del ' + fechaCortaISO(r.fecha) + ' a las ' + hh(C.horaInt(r.hora_inicio)) + ' quedó confirmada. ¡Te esperamos!';
      window.open(waLink(r.telefono, msg), '_blank', 'noopener');
    }).catch(function () {
      alert('No se pudo actualizar la reserva. Revisá la conexión y probá de nuevo.');
    });
  }

  function liberarReserva(id) {
    const r = reservasDia.find(x => String(x.id) === String(id));
    if (!r) return;
    if (!window.confirm('¿Liberar el horario de ' + r.nombre + ' (' + hh(C.horaInt(r.hora_inicio)) + ')? La reserva se cancela y esas horas vuelven a ofrecerse en el sitio.')) return;
    C.db.updateEstado(r.id, 'cancelada').then(function () {
      loadDia();
      showNotif({
        titulo: 'Horario liberado',
        badge: '<span class="pay-badge amber">' + IC.warn + ' CANCELADA</span>',
        sub: 'La reserva de ' + esc(r.nombre) + ' a las ' + hh(C.horaInt(r.hora_inicio)) + ' se canceló.',
        foot: 'Esas horas ya se pueden volver a reservar.'
      });
    }).catch(function () {
      alert('No se pudo actualizar la reserva. Revisá la conexión y probá de nuevo.');
    });
  }

  /* ---------- notificaciones (30 min / 10 min con seña) ---------- */
  function checkNotifs() {
    if (reservasHoy.length === 0) return;
    const now = new Date();

    for (const r of reservasHoy) {
      const ini = C.horaInt(r.hora_inicio);
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ini, 0, 0);
      const minFaltan = Math.round((start - now) / 60000);

      if (r.tipo_pago === 'sena' && minFaltan > 0 && minFaltan <= 10 && !notifVistas.has(r.id + ':10')) {
        notifVistas.add(r.id + ':10');
        showNotif({
          titulo: 'Próxima en ' + minFaltan + ' min · Saldo pendiente',
          badge: '<span class="pay-badge amber">' + IC.warn + ' Seña</span>',
          sub: (r.cancha === 'pasto' ? 'Pasto Sintético' : 'Cemento') + ' · ' + esc(r.nombre),
          foot: 'Recordatorio enviado por WhatsApp · Saldo: ' + fmt(r.monto_total - r.monto_pagado)
        });
        return;
      }

      if (minFaltan > 10 && minFaltan <= 30 && !notifVistas.has(r.id + ':30')) {
        notifVistas.add(r.id + ':30');
        showNotif({
          titulo: 'Próxima reserva en ' + minFaltan + ' min',
          badge: badgeHTML(r),
          sub: (r.cancha === 'pasto' ? 'Pasto Sintético' : 'Cemento') + ' · ' + esc(r.nombre),
          foot: hh(ini) + ' · ' + DEPORTES[r.deporte] + ' · ' + r.jugadores + ' jugadores'
        });
        return;
      }
    }
  }

  function showNotif(d) {
    $('#notifTitleText').textContent = d.titulo;
    $('#notifBadge').innerHTML = d.badge;
    $('#notifSub').innerHTML = d.sub;
    $('#notifFoot').textContent = d.foot;
    $('#notif').classList.add('show');
  }
})();
