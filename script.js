/* ============================================================
   script.js — sitio público
   Club Atlético San Lorenzo de Muñiz
   ============================================================ */

(function () {
  'use strict';

  const C = window.SLM;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));

  const fmt = n => '$' + n.toLocaleString('es-AR');
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const hh = h => String(h).padStart(2, '0') + ':00';

  const DOW = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DOW_MIN = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const DEPORTES = { futbol5: 'Fútbol 5', voley: 'Vóley', basquet: 'Básquet' };
  const CANCHAS = {
    pasto: { nombre: 'Pasto Sintético', sub: 'Solo Fútbol 5', deportes: ['futbol5'] },
    cemento: { nombre: 'Cemento', sub: 'Fútbol 5 · Vóley · Básquet', deportes: ['futbol5', 'voley', 'basquet'] }
  };
  const PASOS = ['Cancha y deporte', 'Fecha y horario', 'Duración', 'Tus datos y pago'];

  function fechaLarga(iso) {
    const p = iso.split('-');
    const d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DOW[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  }

  /* ============================================================
     Config editable (config.js) — teléfono, fotos, badges, etc.
     ============================================================ */
  const CFG = window.SLM_CONFIG || {};

  (function aplicarConfig() {
    /* teléfono real (mientras tenga X queda el placeholder) */
    if (CFG.TELEFONO && CFG.TELEFONO.indexOf('X') === -1) {
      $$('[data-config="telefono"]').forEach(el => { el.textContent = CFG.TELEFONO; });
    }
    if (CFG.TELEFONO_LINK && CFG.TELEFONO_LINK.indexOf('X') === -1) {
      $$('[data-config="telefono-link"]').forEach(el => { el.href = 'tel:' + CFG.TELEFONO_LINK; });
    }

    /* prueba social del hero: se calcula sola con las reservas reales de la
       semana (lunes a domingo). CFG.RESERVAS_SEMANA se muestra solo mientras
       carga o si la consulta falla; con menos de 3 reservas se oculta. */
    if (CFG.RESERVAS_SEMANA) {
      $('#heroProofNum').textContent = '+' + CFG.RESERVAS_SEMANA;
      $('#heroProof').hidden = false;
    }
    C.db.getReservasSemanaCount().then(function (n) {
      $('#heroProofNum').textContent = '+' + n;
      $('#heroProof').hidden = n < 3;
    }).catch(function () {});

    /* avisos push (primera visita): banner arriba, sin tapar nada */
    if (C.push) {
      C.push.init({
        texto: '🔔 ¿Querés que te avisemos cuando se acerque tu turno reservado?',
        boton: 'Activar avisos'
      });
    }

    /* video de fondo del hero */
    if (CFG.HERO_VIDEO) {
      const v = document.createElement('video');
      v.src = CFG.HERO_VIDEO;
      v.autoplay = true;
      v.muted = true;
      v.loop = true;
      v.preload = 'metadata';
      v.setAttribute('playsinline', '');
      $('#heroMedia').appendChild(v);
    }

    /* fotos reales y etiquetas de las cards de cancha */
    const fotos = { pasto: CFG.FOTO_PASTO, cemento: CFG.FOTO_CEMENTO };
    const flags = { pasto: CFG.BADGE_PASTO, cemento: CFG.BADGE_CEMENTO };
    $$('.court-photo').forEach(ph => {
      const grad = ph.querySelector('.photo-grad');
      const key = grad.classList.contains('pasto') ? 'pasto' : 'cemento';
      if (fotos[key]) {
        const img = document.createElement('img');
        img.className = 'court-img img-' + key;
        img.alt = grad.getAttribute('aria-label') || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        /* si la foto carga, reemplaza al placeholder; si no existe, no pasa nada */
        img.addEventListener('load', () => {
          grad.removeAttribute('role');
          grad.setAttribute('aria-hidden', 'true');
        });
        img.addEventListener('error', () => img.remove());
        img.src = fotos[key];
        grad.insertAdjacentElement('afterend', img);
      }
      if (flags[key]) {
        const f = document.createElement('span');
        f.className = 'court-flag';
        f.textContent = flags[key];
        ph.appendChild(f);
      }
    });
  })();

  /* ============================================================
     Tema claro / oscuro
     ============================================================ */
  const themeBtn = $('#themeToggle');

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('slm-theme', t); } catch (e) {}
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
  themeBtn.addEventListener('click', () => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
  themeBtn.setAttribute('aria-label',
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');

  /* ============================================================
     Nav: burger + scroll
     ============================================================ */
  const burger = $('#navBurger');
  const mobileMenu = $('#mobileMenu');

  function closeMenu() {
    mobileMenu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
  }
  burger.addEventListener('click', () => {
    const open = !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  $$('a', mobileMenu).forEach(a => a.addEventListener('click', closeMenu));

  function goTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* CTA flotante: aparece pasado el hero, se oculta sobre el wizard y el footer */
  (function () {
    const fab = $('#fabReservar');
    if (!fab || !('IntersectionObserver' in window)) return;
    const zonas = { hero: true, reservas: false, footer: false };
    function update() {
      const show = !zonas.hero && !zonas.reservas && !zonas.footer;
      fab.classList.toggle('show', show);
      document.body.classList.toggle('fab-visible', show);
    }
    function vigilar(sel, clave, opts) {
      const el = $(sel);
      if (!el) return;
      new IntersectionObserver(es => { zonas[clave] = es[0].isIntersecting; update(); }, opts).observe(el);
    }
    vigilar('.hero', 'hero', { threshold: 0.2 });
    vigilar('#reservas', 'reservas', { rootMargin: '-25% 0px -25% 0px' });
    vigilar('.footer', 'footer', { rootMargin: '60px 0px 0px 0px' });
  })();

  /* sombra del nav al despegarse del tope */
  let navTick = false;
  window.addEventListener('scroll', () => {
    if (navTick) return;
    navTick = true;
    requestAnimationFrame(() => {
      document.getElementById('siteNav').classList.toggle('scrolled', window.scrollY > 70);
      navTick = false;
    });
  }, { passive: true });

  document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { goTo(go.getAttribute('data-go')); return; }
    const res = e.target.closest('[data-reservar]');
    if (res) {
      closeMenu();
      if (S.done) { resetState(); render(0, true); } // reserva anterior completada: arrancar una nueva
      const cancha = res.getAttribute('data-reservar');
      if (cancha === 'pasto' || cancha === 'cemento') {
        setCancha(cancha);
        S.step = 1;
        render(0);
      }
      goTo('reservas');
    }
  });

  /* ============================================================
     Banner offline + toast
     ============================================================ */
  const offlineBanner = $('#offlineBanner');
  window.addEventListener('offline', () => offlineBanner.classList.add('show'));
  window.addEventListener('online', () => {
    offlineBanner.classList.remove('show');
    toast('Volviste a tener conexión.');
  });
  if (!navigator.onLine) offlineBanner.classList.add('show');

  const toastEl = $('#toast');
  let toastTimer = null;
  function toast(msg, type) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('err', type === 'err');
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 5000);
  }

  /* Resultado del pago (vuelta de MercadoPago) */
  (function () {
    const r = new URLSearchParams(window.location.search).get('reserva');
    if (r === 'confirmada') toast('¡Pago acreditado! Tu reserva quedó confirmada.');
    if (r === 'error') toast('El pago no se completó. Volvé a intentar o escribinos.', 'err');
    if (r) history.replaceState(null, '', window.location.pathname);
  })();

  /* ============================================================
     Animaciones (GSAP + ScrollTrigger)
     El sitio funciona igual si el CDN no carga: todo es visible
     por defecto y el movimiento solo se agrega desde acá.
     ============================================================ */
  (function () {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    /* la barra de URL de los navegadores móviles dispara resizes al scrollear:
       ignorarlos evita refreshes (y carreras de revert) innecesarios */
    ScrollTrigger.config({ ignoreMobileResize: true });
    gsap.defaults({ ease: 'power3.out', duration: 0.7 });

    /* única condición reactiva: reduced-motion. El modo mobile se lee una
       sola vez; así un resize nunca destruye y recrea las animaciones. */
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {

      const mobile = window.matchMedia('(max-width: 767px)').matches;
      const dist = mobile ? 22 : 36; /* reveals cortos y sutiles, sobre todo en mobile */

      /* --- entrada del hero: tipografía por líneas + franja tricolor --- */
      const tlHero = gsap.timeline();
      tlHero
        .from('.hero .line-in', { yPercent: 115, duration: 0.85, stagger: 0.14, ease: 'expo.out' })
        /* sin fade: hero-desc es el elemento LCP y debe pintar en el primer frame */
        .from('.hero-desc', { y: 22, duration: 0.55 }, '-=0.45');
      if (!$('#heroProof').hidden) {
        tlHero.from('#heroProof', { autoAlpha: 0, y: 14, duration: 0.45 }, '-=0.3');
      }
      tlHero
        .from('.hero-cta .btn', { autoAlpha: 0, y: 16, stagger: 0.08, duration: 0.45 }, '-=0.25')
        .from('.hero-stripe .tricolor', { scaleX: 0, transformOrigin: 'left center', duration: 0.7, ease: 'expo.out' }, '-=0.25');

      /* --- parallax sutil de las líneas de cancha del fondo --- */
      gsap.to('.hero-pitch', {
        yPercent: mobile ? 10 : 18,
        rotation: 4,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });

      /* --- reveals por sección (cada uno según lo que muestra) --- */
      /* duraciones unificadas: 0.55 textos · 0.65 bloques grandes */
      gsap.utils.toArray('.section-title').forEach(el => {
        gsap.from(el, { y: 20, autoAlpha: 0, duration: 0.55, scrollTrigger: { trigger: el, start: 'top 88%' } });
      });

      gsap.utils.toArray('.court-card').forEach((el, i) => {
        gsap.from(el, {
          y: dist, autoAlpha: 0, duration: 0.65, delay: mobile ? 0 : i * 0.1,
          scrollTrigger: { trigger: el, start: 'top 86%' }
        });
      });

      gsap.from('.wizard', {
        y: dist, autoAlpha: 0, duration: 0.65,
        scrollTrigger: { trigger: '.wizard', start: 'top 86%' }
      });

      gsap.utils.toArray('.info-card').forEach((el, i) => {
        gsap.from(el, {
          x: mobile ? -16 : -26, autoAlpha: 0, duration: 0.55, delay: i * 0.07,
          scrollTrigger: { trigger: '.info-col', start: 'top 86%' }
        });
      });

      gsap.from('.map-col', {
        autoAlpha: 0, scale: 0.97, duration: 0.65,
        scrollTrigger: { trigger: '.map-col', start: 'top 86%' }
      });

      gsap.from('.footer .tricolor', {
        scaleX: 0, transformOrigin: 'left center', duration: 0.7, ease: 'expo.out',
        scrollTrigger: { trigger: '.footer', start: 'top 96%' }
      });

      gsap.from('.footer-body > *', {
        y: 16, autoAlpha: 0, duration: 0.55, stagger: 0.06,
        scrollTrigger: { trigger: '.footer-body', start: 'top 92%' }
      });
    });
  })();

  /* ============================================================
     WIZARD DE RESERVA — 4 pasos
     ============================================================ */
  const wizBody = $('#wizBody');
  const wizNav = $('#wizNav');
  const wizStepInfo = $('#wizStepInfo');

  const hoyDate = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

  const S = {
    step: 1,
    cancha: null,
    deporte: null,
    fecha: null,                 // 'YYYY-MM-DD'
    viewY: hoyDate().getFullYear(),
    viewM: hoyDate().getMonth(),
    hora: null,                  // int (hora de inicio)
    occupied: null,              // Set | null mientras carga
    loadErr: false,
    horas: 1,
    nombre: '',
    telefono: '',
    jugadores: 10,
    pago: null,                  // 'sena' | 'completo'
    medio: null,                 // 'mp' | 'alias' (solo si hay alias configurado)
    touched: {},
    sending: false,
    done: null                   // fila guardada tras confirmar
  };

  /* alias para transferencias: si no está configurado, la opción no existe
     y todo el flujo queda igual que siempre (solo MercadoPago) */
  const aliasCfg = () => (CFG.ALIAS_TRANSFERENCIA || '').trim();

  function setCancha(c) {
    if (S.cancha === c) return;
    S.cancha = c;
    S.deporte = c === 'pasto' ? 'futbol5' : null;
    S.hora = null;
    S.occupied = null;
  }

  /* máximo de horas reservables desde S.hora (corte: ocupado o cierre) */
  function maxHoras() {
    if (S.hora === null || !S.occupied) return C.MAX_HORAS;
    let m = 0;
    for (let h = S.hora; h < C.HORA_CIERRE && m < C.MAX_HORAS; h++) {
      if (S.occupied.has(h)) break;
      m++;
    }
    return Math.max(m, 1);
  }

  function canNext() {
    if (S.step === 1) return !!(S.cancha && S.deporte);
    if (S.step === 2) return !!(S.fecha && S.hora !== null);
    return true;
  }

  /* ---------- carga de horarios ocupados ---------- */
  function loadOccupied() {
    if (!S.fecha || !S.cancha) return;
    const fecha = S.fecha, cancha = S.cancha;
    S.occupied = null;
    S.loadErr = false;
    C.db.getHorasOcupadas(fecha, cancha)
      .then(set => {
        if (S.fecha !== fecha || S.cancha !== cancha) return;
        S.occupied = set;
        if (S.step === 2) render(0, true);
      })
      .catch(() => {
        if (S.fecha !== fecha || S.cancha !== cancha) return;
        S.loadErr = true;
        if (S.step === 2) render(0, true);
      });
  }

  /* ---------- plantillas por paso ---------- */

  function stepCanchaHTML() {
    const opt = key => {
      const c = CANCHAS[key];
      const sel = S.cancha === key;
      return '<button type="button" class="court-opt' + (sel ? ' selected' : '') + '" data-cancha="' + key + '" role="radio" aria-checked="' + sel + '">' +
        '<span class="co-name">' + c.nombre + '</span>' +
        '<span class="co-sub" style="display:block">' + c.sub + '</span>' +
        '<span class="co-price" style="display:block">' + fmt(C.PRECIO_HORA) + ' / hora</span>' +
        '<span class="co-radio" aria-hidden="true"></span>' +
        '</button>';
    };

    let chips = '';
    if (S.cancha) {
      const locked = S.cancha === 'pasto';
      chips = '<h4 class="slots-title" style="margin-top:22px">Deporte</h4>' +
        '<div class="chip-row" role="radiogroup" aria-label="Deporte">' +
        CANCHAS[S.cancha].deportes.map(d => {
          const sel = S.deporte === d;
          return '<button type="button" class="chip' + (sel ? ' selected' : '') + (locked ? ' locked' : '') + '" data-deporte="' + d + '" role="radio" aria-checked="' + sel + '"' + (locked ? ' aria-disabled="true"' : '') + '>' +
            (locked ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' : '') +
            DEPORTES[d] + '</button>';
        }).join('') +
        '</div>' +
        (locked ? '<p class="field-hint">En pasto sintético se juega Fútbol 5.</p>'
                : '<p class="field-hint">La cancha de cemento es multiuso: elegí tu deporte.</p>');
    }

    return '<h3 class="wiz-h" tabindex="-1">¿Dónde jugás?</h3>' +
      '<div class="court-select" role="radiogroup" aria-label="Cancha">' + opt('pasto') + opt('cemento') + '</div>' +
      chips;
  }

  function calHTML() {
    const hoy = hoyDate();
    const max = new Date(hoy); max.setDate(max.getDate() + 60);
    const first = new Date(S.viewY, S.viewM, 1);
    const prevOk = first > new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const nextOk = new Date(S.viewY, S.viewM + 1, 1) <= max;
    const offset = (first.getDay() + 6) % 7; // semana inicia lunes
    const dias = new Date(S.viewY, S.viewM + 1, 0).getDate();

    let cells = DOW_MIN.map(d => '<span class="cal-dow" aria-hidden="true">' + d + '</span>').join('');
    for (let i = 0; i < offset; i++) cells += '<span></span>';
    for (let d = 1; d <= dias; d++) {
      const dt = new Date(S.viewY, S.viewM, d);
      const iso = C.toISO(dt);
      const dis = dt < hoy || dt > max;
      const cl = ['cal-day'];
      if (iso === C.toISO(hoy)) cl.push('today');
      if (iso === S.fecha) cl.push('selected');
      cells += '<button type="button" class="' + cl.join(' ') + '" data-fecha="' + iso + '"' + (dis ? ' disabled' : '') +
        ' aria-label="' + DOW[dt.getDay()] + ' ' + d + ' de ' + MESES[S.viewM] + '"' +
        (iso === S.fecha ? ' aria-pressed="true"' : '') + '>' + d + '</button>';
    }

    return '<div class="cal">' +
      '<div class="cal-head">' +
      '<button type="button" class="cal-nav" data-mes="-1" aria-label="Mes anterior"' + (prevOk ? '' : ' disabled') + '><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<span class="cal-month">' + MESES[S.viewM] + ' ' + S.viewY + '</span>' +
      '<button type="button" class="cal-nav" data-mes="1" aria-label="Mes siguiente"' + (nextOk ? '' : ' disabled') + '><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '</div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '</div>';
  }

  function slotsHTML() {
    if (!S.fecha) return '<p class="slots-note">Elegí una fecha en el calendario para ver los horarios disponibles.</p>';

    if (S.loadErr) {
      return '<p class="slots-note">No pudimos cargar la disponibilidad. ' +
        '<button type="button" class="btn btn-outline" data-retry style="margin-top:10px">Reintentar</button></p>';
    }

    let grid = '';
    let libres = 0;
    let hayPend = false;
    if (!S.occupied) {
      for (let h = C.HORA_APERTURA; h < C.HORA_CIERRE; h++) grid += '<button type="button" class="slot skel" disabled>' + hh(h) + '</button>';
      libres = 1; // mientras carga no mostramos el aviso de "sin horarios"
    } else {
      const esHoy = S.fecha === C.toISO(hoyDate());
      const ahora = new Date().getHours();
      const pendSet = S.occupied.aConfirmar;
      for (let h = C.HORA_APERTURA; h < C.HORA_CIERRE; h++) {
        const pasada = esHoy && h <= ahora;
        const busy = S.occupied.has(h) || pasada;
        /* hora tomada por una reserva sin verificar: bloquea, pero se avisa
           que puede volver a liberarse si el pago nunca se confirma */
        const pend = !pasada && pendSet && pendSet.has(h);
        if (!busy) libres++;
        if (pend) hayPend = true;
        const sel = S.hora === h;
        grid += '<button type="button" class="slot' + (busy ? ' busy' : '') + (pend ? ' pend' : '') + (sel ? ' selected' : '') + '" data-hora="' + h + '"' +
          (busy
            ? ' disabled aria-label="' + hh(h) + (pend ? ', reservado a confirmar: puede liberarse si el pago no se concreta' : ', ocupado') + '"'
            : ' aria-label="' + hh(h) + ', disponible"') +
          (sel ? ' aria-pressed="true"' : '') + '>' +
          (pend ? '<span class="h">' + hh(h) + '</span><span class="sub">A confirmar</span>' : hh(h)) +
          '</button>';
      }
    }
    const sinHorarios = libres === 0 ? '<p class="slots-note">No hay horarios disponibles este día. Probá con otra fecha.</p>' : '';
    const notaPend = hayPend ? '<p class="slots-note">Los horarios <strong>a confirmar</strong> tienen una reserva esperando el pago: si no se confirma, vuelven a quedar libres. Volvé a chequear más tarde.</p>' : '';

    return '<h4 class="slots-title">Horarios del ' + fechaLarga(S.fecha) + '</h4>' +
      '<div class="legend" aria-hidden="true">' +
      '<span><span class="dot"></span>Disponible</span>' +
      '<span><span class="dot busy"></span>Ocupado</span>' +
      (hayPend ? '<span><span class="dot pend"></span>A confirmar</span>' : '') +
      '<span><span class="dot sel"></span>Tu elección</span>' +
      '</div>' +
      '<div class="slot-grid">' + grid + '</div>' + sinHorarios + notaPend;
  }

  function stepFechaHTML() {
    return '<h3 class="wiz-h" tabindex="-1">¿Cuándo jugás?</h3>' +
      '<div class="step2-grid"><div>' + calHTML() + '</div><div id="slotsBox">' + slotsHTML() + '</div></div>';
  }

  function stepDuracionHTML() {
    const max = maxHoras();
    if (S.horas > max) S.horas = max;
    const total = S.horas * C.PRECIO_HORA;
    const porPersona = Math.ceil(total / S.jugadores);
    const fin = S.hora + S.horas;

    return '<h3 class="wiz-h" tabindex="-1">¿Cuántas horas?</h3>' +
      '<div class="dur-box">' +
      '<p class="field-hint">' + fechaLarga(S.fecha) + ' · desde las ' + hh(S.hora) + '</p>' +
      '<div class="stepper">' +
      '<button type="button" data-horas="-1" aria-label="Una hora menos"' + (S.horas <= 1 ? ' disabled' : '') + '>−</button>' +
      '<span class="val" aria-live="polite">' + S.horas + '</span>' +
      '<button type="button" data-horas="1" aria-label="Una hora más"' + (S.horas >= max ? ' disabled' : '') + '>+</button>' +
      '</div>' +
      '<p class="stepper-unit">' + (S.horas === 1 ? 'hora' : 'horas') + ' · ' + hh(S.hora) + ' a ' + hh(fin === 24 ? 0 : fin) + '</p>' +
      (max < C.MAX_HORAS ? '<p class="field-hint">Máximo ' + max + ' h en este horario (por disponibilidad o cierre).</p>' : '') +
      '<p class="price-total" aria-live="polite">' + fmt(total) + '</p>' +
      '<p class="price-cap">Precio total</p>' +
      '<div class="split-box">Dividido entre <strong>' + S.jugadores + ' jugadores</strong>: <strong>' + fmt(porPersona) + '</strong> por persona <span style="display:block;font-size:13px;color:var(--color-text-muted)">Ajustá la cantidad en el próximo paso.</span></div>' +
      '</div>';
  }

  function liveSplitHTML() {
    const total = S.horas * C.PRECIO_HORA;
    return 'Dividido entre <strong>' + S.jugadores + (S.jugadores === 1 ? ' jugador' : ' jugadores') + '</strong>: <strong>' + fmt(Math.ceil(total / S.jugadores)) + '</strong> por persona';
  }

  function stepDatosHTML() {
    const total = S.horas * C.PRECIO_HORA;
    const errN = S.touched.nombre && !nombreOk();
    const errT = S.touched.telefono && !telefonoOk();
    const errP = S.touched.pago && !S.pago;

    return '<h3 class="wiz-h" tabindex="-1">Tus datos y pago</h3>' +
      '<div class="form-grid">' +

      '<div class="field' + (errN ? ' has-err' : '') + '" data-field="nombre">' +
      '<label for="fNombre">Nombre completo</label>' +
      '<input class="input" id="fNombre" type="text" autocomplete="name" placeholder="Juan Pérez" value="' + esc(S.nombre) + '" />' +
      '<p class="field-err" id="errNombre">Ingresá tu nombre completo.</p>' +
      '</div>' +

      '<div class="field' + (errT ? ' has-err' : '') + '" data-field="telefono">' +
      '<label for="fTelefono">Teléfono (WhatsApp)</label>' +
      '<div class="phone-wrap"><span class="phone-prefix" aria-hidden="true">+54</span>' +
      '<input class="input" id="fTelefono" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="11 2345-6789" value="' + esc(S.telefono) + '" /></div>' +
      '<p class="field-err" id="errTelefono">Ingresá un teléfono válido (8 a 12 números, sin 0 ni 15).</p>' +
      '</div>' +

      '<div class="field" data-field="jugadores">' +
      '<label for="fJugadores">Cantidad de jugadores</label>' +
      '<div class="players-row">' +
      '<button type="button" class="mini-step" data-jug="-1" aria-label="Un jugador menos"' + (S.jugadores <= 1 ? ' disabled' : '') + '>−</button>' +
      '<input class="input" id="fJugadores" type="number" inputmode="numeric" min="1" max="' + C.MAX_JUGADORES + '" value="' + S.jugadores + '" aria-label="Cantidad de jugadores" />' +
      '<button type="button" class="mini-step" data-jug="1" aria-label="Un jugador más"' + (S.jugadores >= C.MAX_JUGADORES ? ' disabled' : '') + '>+</button>' +
      '</div></div>' +

      '<div class="live-split" id="liveSplit" aria-live="polite">' + liveSplitHTML() + '</div>' +

      '<div class="field' + (errP ? ' has-err' : '') + '" data-field="pago">' +
      '<label id="pagoLabel">' + (aliasCfg() ? '¿Cuánto pagás ahora?' : '¿Cómo querés pagar?') + '</label>' +
      '<div class="pay-grid" role="radiogroup" aria-labelledby="pagoLabel">' +
      '<button type="button" class="pay-opt' + (S.pago === 'sena' ? ' selected' : '') + '" data-pago="sena" role="radio" aria-checked="' + (S.pago === 'sena') + '">' +
      '<span class="po-title">Señá tu reserva</span>' +
      '<span class="po-amount" style="display:block">' + fmt(C.SENA) + '</span>' +
      '<span class="po-sub" style="display:block">El resto (' + fmt(total - C.SENA) + ') lo pagás en el club.</span>' +
      '<span class="co-radio" aria-hidden="true"></span></button>' +
      '<button type="button" class="pay-opt' + (S.pago === 'completo' ? ' selected' : '') + '" data-pago="completo" role="radio" aria-checked="' + (S.pago === 'completo') + '">' +
      '<span class="po-title">Pagá el total ahora</span>' +
      '<span class="po-amount" style="display:block">' + fmt(total) + '</span>' +
      '<span class="po-sub" style="display:block">Llegás y jugás, sin vueltas.</span>' +
      '<span class="co-radio" aria-hidden="true"></span></button>' +
      '</div>' +
      '<p class="field-err">Elegí cómo querés pagar.</p>' +
      '</div>' +

      (aliasCfg() ? medioFieldHTML() : '') +

      '<p class="mp-badge"><svg width="20" height="14" viewBox="0 0 32 22" fill="none" aria-hidden="true"><rect x="1" y="1" width="30" height="20" rx="4" stroke="currentColor" stroke-width="2"/><ellipse cx="16" cy="11" rx="7" ry="5.5" stroke="currentColor" stroke-width="2"/></svg>' +
      (aliasCfg() ? 'Pagás seguro: MercadoPago o transferencia desde tu billetera' : 'Pagás seguro con MercadoPago') + '</p>' +
      '</div>';
  }

  function medioFieldHTML() {
    const errM = S.touched.medio && !S.medio;
    return '<div class="field' + (errM ? ' has-err' : '') + '" data-field="medio">' +
      '<label id="medioLabel">¿Con qué pagás?</label>' +
      '<div class="pay-grid" role="radiogroup" aria-labelledby="medioLabel">' +
      '<button type="button" class="pay-opt' + (S.medio === 'mp' ? ' selected' : '') + '" data-medio="mp" role="radio" aria-checked="' + (S.medio === 'mp') + '">' +
      '<span class="po-title">MercadoPago</span>' +
      '<span class="po-sub" style="display:block">Te llevamos al link de pago seguro.</span>' +
      '<span class="co-radio" aria-hidden="true"></span></button>' +
      '<button type="button" class="pay-opt' + (S.medio === 'alias' ? ' selected' : '') + '" data-medio="alias" role="radio" aria-checked="' + (S.medio === 'alias') + '">' +
      '<span class="po-title">Transferencia o billetera</span>' +
      '<span class="po-sub" style="display:block">Ualá, Brubank, tu banco… te pasamos el alias del club.</span>' +
      '<span class="co-radio" aria-hidden="true"></span></button>' +
      '</div>' +
      '<p class="field-err">Elegí con qué vas a pagar.</p>' +
      '</div>';
  }

  function aliasCardHTML(r) {
    const monto = fmt(r.monto_pagado);
    const titular = (CFG.ALIAS_TITULAR || '').trim();
    const wa = (CFG.TELEFONO_LINK || '').replace(/\D/g, '');
    const msg = 'Hola! Hice una reserva en ' + CANCHAS[r.cancha].nombre + ' el ' + fechaLarga(r.fecha) +
      ' a las ' + hh(C.horaInt(r.hora_inicio)) + ' a nombre de ' + r.nombre +
      '. Les mando el comprobante de la transferencia de ' + monto + '.';
    return '<div class="alias-card">' +
      '<p class="ac-paso">Último paso: transferí <strong>' + monto + '</strong> al alias del club</p>' +
      '<p class="ac-alias" id="aliasValor">' + esc(aliasCfg()) + '</p>' +
      (titular ? '<p class="ac-titular">Titular: ' + esc(titular) + '</p>' : '') +
      '<div class="ac-acciones">' +
      '<button type="button" class="btn btn-outline" data-copy-alias>Copiar alias</button>' +
      (wa ? '<a class="btn btn-primary" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">Mandar comprobante</a>' : '') +
      '</div>' +
      '<p class="ac-nota">Funciona desde cualquier billetera o banco. Cuando el club verifique que llegó, te avisa por WhatsApp y el turno queda asegurado. Mientras tanto el horario figura como "a confirmar".</p>' +
      '</div>';
  }

  function successHTML() {
    const r = S.done;
    const fin = C.horaInt(r.hora_inicio) + r.duracion_horas;
    const saldo = r.monto_total - r.monto_pagado;
    const transfer = r.medio_pago === 'transferencia';
    return '<div class="success">' +
      '<div class="confetti" aria-hidden="true">' + new Array(12).fill('<i></i>').join('') + '</div>' +
      '<div class="succ-ic" aria-hidden="true"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path class="succ-path" d="M5 13l4 4L19 7"/></svg></div>' +
      '<h3 class="wiz-h succ-title" tabindex="-1">' + (transfer ? '¡Reserva registrada!' : '¡Reserva confirmada!') + '</h3>' +
      '<p class="succ-sub">' + (transfer
        ? (r.tipo_pago === 'sena'
          ? 'Te guardamos el turno. Transferí la seña de ' + fmt(r.monto_pagado) + ' para confirmarlo; el saldo de ' + fmt(saldo) + ' lo abonás en el club.'
          : 'Te guardamos el turno. Transferí el total de ' + fmt(r.monto_pagado) + ' para confirmarlo.')
        : (r.tipo_pago === 'sena'
          ? 'Quedó señada con ' + fmt(r.monto_pagado) + '. El día del partido abonás el saldo de ' + fmt(saldo) + ' en el club.'
          : 'Pago total registrado. Llegás y jugás.')) + '</p>' +
      (transfer ? aliasCardHTML(r) : '') +
      '<dl class="summary">' +
      '<div class="sum-row"><dt class="k">Cancha</dt><dd class="v" style="margin:0">' + CANCHAS[r.cancha].nombre + '</dd></div>' +
      '<div class="sum-row"><dt class="k">Deporte</dt><dd class="v" style="margin:0">' + DEPORTES[r.deporte] + '</dd></div>' +
      '<div class="sum-row"><dt class="k">Fecha</dt><dd class="v" style="margin:0">' + fechaLarga(r.fecha) + '</dd></div>' +
      '<div class="sum-row"><dt class="k">Horario</dt><dd class="v" style="margin:0">' + hh(C.horaInt(r.hora_inicio)) + ' a ' + hh(fin === 24 ? 0 : fin) + '</dd></div>' +
      '<div class="sum-row"><dt class="k">Jugadores</dt><dd class="v" style="margin:0">' + r.jugadores + '</dd></div>' +
      '<div class="sum-row"><dt class="k">A nombre de</dt><dd class="v" style="margin:0">' + esc(r.nombre) + '</dd></div>' +
      '<div class="sum-row"><dt class="k">Pago</dt><dd class="v" style="margin:0">' + (transfer ? 'Transferencia (alias)' : 'MercadoPago') + '</dd></div>' +
      '<div class="sum-row total"><dt class="k">' + (r.tipo_pago === 'sena'
        ? (transfer ? 'Seña a transferir' : 'Seña pagada')
        : (transfer ? 'Total a transferir' : 'Total pagado')) + '</dt><dd class="v" style="margin:0">' + fmt(r.monto_pagado) + '</dd></div>' +
      '</dl>' +
      '</div>';
  }

  /* ---------- validación paso 4 ---------- */
  const nombreOk = () => S.nombre.trim().length >= 3;
  const telDigits = () => S.telefono.replace(/\D/g, '');
  const telefonoOk = () => { const d = telDigits(); return d.length >= 8 && d.length <= 12; };

  function syncFieldErr(name, ok) {
    const f = $('[data-field="' + name + '"]', wizBody);
    if (f) f.classList.toggle('has-err', S.touched[name] && !ok);
  }

  /* ---------- render principal ---------- */
  function render(dir, noAnim) {
    /* progreso */
    $$('.wp-seg').forEach(seg => {
      const n = +seg.getAttribute('data-seg');
      seg.classList.toggle('active', !S.done && n === S.step);
      seg.classList.toggle('done', !!S.done || n < S.step);
    });
    wizStepInfo.innerHTML = S.done
      ? '<strong>¡Listo!</strong> Reserva guardada'
      : 'Paso <strong>' + S.step + ' de 4</strong> · ' + PASOS[S.step - 1];

    /* cuerpo */
    const html = S.done ? successHTML()
      : S.step === 1 ? stepCanchaHTML()
      : S.step === 2 ? stepFechaHTML()
      : S.step === 3 ? stepDuracionHTML()
      : stepDatosHTML();

    wizBody.classList.remove('anim-fwd', 'anim-back');
    wizBody.innerHTML = html;
    if (!noAnim && dir !== 0) {
      void wizBody.offsetWidth; // reinicia la animación
      wizBody.classList.add(dir > 0 ? 'anim-fwd' : 'anim-back');
    }

    /* navegación */
    if (S.done) {
      wizNav.innerHTML = '<button type="button" class="btn btn-outline btn-full" data-nav="reset">Hacer otra reserva</button>';
    } else {
      const atras = S.step > 1 ? '<button type="button" class="btn btn-outline btn-full" data-nav="back">← Atrás</button>' : '';
      const sig = S.step < 4
        ? '<button type="button" class="btn btn-primary btn-full" data-nav="next"' + (canNext() ? '' : ' disabled') + '>Siguiente →</button>'
        : '<button type="button" class="btn btn-primary btn-full" data-nav="confirm"' + (S.sending ? ' disabled' : '') + '>' + (S.sending ? 'Guardando…' : 'Confirmar reserva →') + '</button>';
      wizNav.innerHTML = atras + sig;
    }

    /* foco al título del paso (lectores de pantalla) */
    if (dir !== 0) {
      const h = $('.wiz-h', wizBody);
      if (h) h.focus({ preventScroll: true });
    }
  }

  function refreshNextBtn() {
    const b = $('[data-nav="next"]', wizNav);
    if (b) b.disabled = !canNext();
  }

  /* ---------- confirmar ---------- */
  async function confirmar() {
    S.touched.nombre = S.touched.telefono = S.touched.pago = true;
    if (aliasCfg()) S.touched.medio = true;
    syncFieldErr('nombre', nombreOk());
    syncFieldErr('telefono', telefonoOk());
    syncFieldErr('pago', !!S.pago);
    if (aliasCfg()) syncFieldErr('medio', !!S.medio);

    if (!nombreOk()) { $('#fNombre', wizBody).focus(); return; }
    if (!telefonoOk()) { $('#fTelefono', wizBody).focus(); return; }
    if (!S.pago) { const p = $('.pay-opt', wizBody); if (p) p.focus(); return; }
    if (aliasCfg() && !S.medio) { const m = $('[data-medio]', wizBody); if (m) m.focus(); return; }
    if (!navigator.onLine) { toast('Estás sin conexión. Conectate para confirmar la reserva.', 'err'); return; }

    const porAlias = aliasCfg() && S.medio === 'alias';

    S.sending = true;
    render(0, true);

    try {
      const row = await C.db.createReserva({
        cancha: S.cancha,
        deporte: S.deporte,
        fecha: S.fecha,
        hora_inicio: S.hora,
        duracion_horas: S.horas,
        nombre: S.nombre.trim(),
        telefono: '+54 ' + S.telefono.trim(),
        jugadores: S.jugadores,
        tipo_pago: S.pago,
        medio_pago: porAlias ? 'transferencia' : 'mercadopago'
      });

      /* con transferencia no hay redirección: el alias se muestra en pantalla */
      const link = porAlias ? '' : C.mp.link(S.pago, S.horas);
      if (link) { window.location.href = link; return; }

      S.sending = false;
      S.done = row;
      render(1);
      /* si activó los avisos, atamos su teléfono a la suscripción para que
         le lleguen los recordatorios de este turno */
      if (C.push) C.push.asegurar('cliente', '+54 ' + S.telefono.trim());
      if (!C.configured) toast('Reserva guardada en modo demo (configurá Supabase y MercadoPago para producción).');
    } catch (e) {
      S.sending = false;
      render(0, true);
      /* el detalle del error va al toast y a la consola: sin esto es
         imposible diagnosticar fallas que solo pasan en producción */
      console.error('[reserva] createReserva falló:', e);
      const det = e && (e.code || e.message) ? ' (' + String(e.code || e.message).slice(0, 60) + ')' : '';
      toast('No pudimos guardar la reserva. Probá de nuevo en unos segundos.' + det, 'err');
    }
  }

  function resetState() {
    S.step = 1; S.cancha = null; S.deporte = null; S.fecha = null; S.hora = null;
    S.occupied = null; S.horas = 1; S.nombre = ''; S.telefono = ''; S.jugadores = 10;
    S.pago = null; S.medio = null; S.touched = {}; S.sending = false; S.done = null;
    S.viewY = hoyDate().getFullYear(); S.viewM = hoyDate().getMonth();
  }

  function resetWizard() {
    resetState();
    render(0);
    goTo('reservas');
  }

  /* ---------- eventos delegados ---------- */
  wizNav.addEventListener('click', e => {
    const b = e.target.closest('[data-nav]');
    if (!b || b.disabled) return;
    const a = b.getAttribute('data-nav');
    if (a === 'back') { S.step--; render(-1); }
    if (a === 'next' && canNext()) {
      S.step++;
      if (S.step === 2 && S.fecha && !S.occupied) loadOccupied();
      render(1);
    }
    if (a === 'confirm') confirmar();
    if (a === 'reset') resetWizard();
  });

  wizBody.addEventListener('click', e => {
    const t = e.target;

    const cancha = t.closest('[data-cancha]');
    if (cancha) { setCancha(cancha.getAttribute('data-cancha')); render(0, true); refreshNextBtn(); return; }

    const dep = t.closest('[data-deporte]');
    if (dep) { S.deporte = dep.getAttribute('data-deporte'); render(0, true); refreshNextBtn(); return; }

    const mes = t.closest('[data-mes]');
    if (mes && !mes.disabled) {
      S.viewM += +mes.getAttribute('data-mes');
      if (S.viewM < 0) { S.viewM = 11; S.viewY--; }
      if (S.viewM > 11) { S.viewM = 0; S.viewY++; }
      render(0, true);
      return;
    }

    const dia = t.closest('[data-fecha]');
    if (dia && !dia.disabled) {
      S.fecha = dia.getAttribute('data-fecha');
      S.hora = null;
      loadOccupied();
      render(0, true);
      refreshNextBtn();
      return;
    }

    if (t.closest('[data-retry]')) { loadOccupied(); render(0, true); return; }

    const slot = t.closest('[data-hora]');
    if (slot && !slot.disabled) {
      S.hora = +slot.getAttribute('data-hora');
      S.horas = 1;
      render(0, true);
      refreshNextBtn();
      return;
    }

    const hb = t.closest('[data-horas]');
    if (hb && !hb.disabled) {
      S.horas = Math.min(Math.max(S.horas + +hb.getAttribute('data-horas'), 1), maxHoras());
      render(0, true);
      return;
    }

    const jb = t.closest('[data-jug]');
    if (jb && !jb.disabled) {
      S.jugadores = Math.min(Math.max(S.jugadores + +jb.getAttribute('data-jug'), 1), C.MAX_JUGADORES);
      const inp = $('#fJugadores', wizBody);
      if (inp) inp.value = S.jugadores;
      const ls = $('#liveSplit', wizBody);
      if (ls) ls.innerHTML = liveSplitHTML();
      jb.parentElement.querySelectorAll('.mini-step').forEach(btn => {
        btn.disabled = btn.getAttribute('data-jug') === '-1' ? S.jugadores <= 1 : S.jugadores >= C.MAX_JUGADORES;
      });
      return;
    }

    const pago = t.closest('[data-pago]');
    if (pago) {
      S.pago = pago.getAttribute('data-pago');
      S.touched.pago = true;
      $$('[data-pago]', wizBody).forEach(p => {
        const sel = p.getAttribute('data-pago') === S.pago;
        p.classList.toggle('selected', sel);
        p.setAttribute('aria-checked', String(sel));
      });
      syncFieldErr('pago', true);
      return;
    }

    const medio = t.closest('[data-medio]');
    if (medio) {
      S.medio = medio.getAttribute('data-medio');
      S.touched.medio = true;
      $$('[data-medio]', wizBody).forEach(m => {
        const sel = m.getAttribute('data-medio') === S.medio;
        m.classList.toggle('selected', sel);
        m.setAttribute('aria-checked', String(sel));
      });
      syncFieldErr('medio', true);
      return;
    }

    const copyBtn = t.closest('[data-copy-alias]');
    if (copyBtn) {
      const alias = aliasCfg();
      const ok = () => {
        copyBtn.textContent = '¡Copiado!';
        toast('Alias copiado. Pegalo en tu billetera.');
        setTimeout(() => { copyBtn.textContent = 'Copiar alias'; }, 2500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(alias).then(ok).catch(() => toast('No se pudo copiar. Anotalo: ' + alias, 'err'));
      } else {
        toast('Copialo a mano: ' + alias);
      }
      return;
    }
  });

  /* inputs de texto: actualizan estado sin re-render (no pierden el foco) */
  wizBody.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'fNombre') {
      S.nombre = e.target.value;
      S.touched.nombre = true;
      syncFieldErr('nombre', nombreOk());
    }
    if (id === 'fTelefono') {
      S.telefono = e.target.value;
      S.touched.telefono = true;
      syncFieldErr('telefono', telefonoOk());
    }
    if (id === 'fJugadores') {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v)) {
        S.jugadores = Math.min(Math.max(v, 1), C.MAX_JUGADORES);
        const ls = $('#liveSplit', wizBody);
        if (ls) ls.innerHTML = liveSplitHTML();
        $$('.mini-step', wizBody).forEach(btn => {
          btn.disabled = btn.getAttribute('data-jug') === '-1' ? S.jugadores <= 1 : S.jugadores >= C.MAX_JUGADORES;
        });
      }
    }
  });

  wizBody.addEventListener('blur', e => {
    if (e.target.id === 'fJugadores') e.target.value = S.jugadores;
  }, true);

  /* ---------- arranque ---------- */
  render(0, true);
})();
