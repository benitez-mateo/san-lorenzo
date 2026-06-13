/* ============================================================
   supabase.js — Cliente Supabase + capa de datos
   Club Atlético San Lorenzo de Muñiz

   ⚠ CONFIGURACIÓN — reemplazá estos valores (ver README.md):
   ============================================================ */

const SUPABASE_URL = 'https://knjqwqkmenvnbrvsabfh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xEYjb12DXlb-9-LCF5B2mQ_X9aOAToH';  // anon public key
const ADMIN_EMAIL = 'admin@sanlorenzodemuniz.com'; // email del usuario admin en Supabase Auth

/* MercadoPago — links de pago (ver README.md sección 6) */
const MP_LINK_SENA = '';                            // link de pago fijo de $16.000
const MP_LINKS_TOTAL = { 1: '', 2: '', 3: '', 4: '', 5: '' }; // un link por cantidad de horas

/* Datos del negocio */
const PRECIO_HORA = 35000;
const SENA = 16000;
const HORA_APERTURA = 6;   // 06:00
const HORA_CIERRE = 24;    // 00:00 (último turno arranca 23:00)
const MAX_HORAS = 5;
const MAX_JUGADORES = 40;

/* ============================================================
   A partir de acá no hace falta tocar nada.
   Si Supabase no está configurado, el sitio funciona en MODO
   DEMO: las reservas se guardan en localStorage del navegador.
   ============================================================ */

(function () {
  'use strict';

  const DEMO_KEY = 'slm-demo-reservas-v3'; // v3: re-seed con reserva pendiente de ejemplo (mañana)
  const configured =
    SUPABASE_URL.indexOf('supabase.co') !== -1 &&
    SUPABASE_ANON_KEY.length > 40 &&
    typeof window.supabase !== 'undefined';

  let client = null;
  function sb() {
    if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return client;
  }

  /* ---------- helpers ---------- */

  function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function horaInt(horaStr) {
    return parseInt(String(horaStr).split(':')[0], 10);
  }

  /* ---------- modo demo (localStorage) ---------- */

  function demoRead() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; }
    catch (e) { return []; }
  }

  function demoWrite(list) {
    localStorage.setItem(DEMO_KEY, JSON.stringify(list));
  }

  function demoSeed() {
    if (localStorage.getItem(DEMO_KEY) !== null) return;
    const hoy = toISO(new Date());
    const man = new Date(); man.setDate(man.getDate() + 1);
    const maniana = toISO(man);
    demoWrite([
      {
        id: 'demo-1', created_at: new Date().toISOString(), cancha: 'pasto', deporte: 'futbol5',
        fecha: hoy, hora_inicio: '16:00', duracion_horas: 2, nombre: 'Grupo Ramírez',
        telefono: '11 5555-0001', jugadores: 6, tipo_pago: 'sena',
        monto_pagado: SENA, monto_total: 2 * PRECIO_HORA, estado: 'confirmada',
        notificacion_30min_enviada: false, notificacion_10min_enviada: false
      },
      {
        id: 'demo-2', created_at: new Date().toISOString(), cancha: 'cemento', deporte: 'voley',
        fecha: hoy, hora_inicio: '19:00', duracion_horas: 1, nombre: 'Grupo Fernández',
        telefono: '11 5555-0002', jugadores: 8, tipo_pago: 'completo',
        monto_pagado: PRECIO_HORA, monto_total: PRECIO_HORA, estado: 'confirmada',
        notificacion_30min_enviada: false, notificacion_10min_enviada: false
      },
      {
        id: 'demo-3', created_at: new Date().toISOString(), cancha: 'pasto', deporte: 'futbol5',
        fecha: hoy, hora_inicio: '21:00', duracion_horas: 1, nombre: 'Los Pibes del Barrio',
        telefono: '11 5555-0003', jugadores: 10, tipo_pago: 'completo',
        monto_pagado: PRECIO_HORA, monto_total: PRECIO_HORA, estado: 'confirmada',
        notificacion_30min_enviada: false, notificacion_10min_enviada: false
      },
      {
        id: 'demo-4', created_at: new Date().toISOString(), cancha: 'pasto', deporte: 'futbol5',
        fecha: maniana, hora_inicio: '18:00', duracion_horas: 1, nombre: 'Grupo López',
        telefono: '+54 11 5555-0004', jugadores: 12, tipo_pago: 'sena',
        medio_pago: 'transferencia',
        monto_pagado: SENA, monto_total: PRECIO_HORA, estado: 'pendiente',
        notificacion_30min_enviada: false, notificacion_10min_enviada: false
      }
    ]);
  }

  const DEMO_BLQ_KEY = 'slm-demo-bloqueos';

  function demoBloqueosRead() {
    try { return JSON.parse(localStorage.getItem(DEMO_BLQ_KEY)) || []; }
    catch (e) { return []; }
  }

  function demoBloqueosWrite(list) {
    localStorage.setItem(DEMO_BLQ_KEY, JSON.stringify(list));
  }

  /* Horarios ocupados "de relleno" para que el demo se sienta real:
     deterministas por fecha+cancha, así no cambian al recargar. */
  function demoFillerOccupied(fechaISO, cancha) {
    let seed = 0;
    const s = fechaISO + cancha;
    for (let i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0;
    const rnd = function () { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
    const occ = [];
    for (let h = HORA_APERTURA; h < HORA_CIERRE; h++) {
      if (rnd() < 0.22) occ.push(h);
    }
    return occ;
  }

  /* ---------- API de datos ---------- */

  /** Reservas activas de una fecha (todas las canchas, o una). */
  async function getReservas(fechaISO, cancha) {
    if (configured) {
      let q = sb().from('reservas').select('*')
        .eq('fecha', fechaISO).neq('estado', 'cancelada')
        .order('hora_inicio', { ascending: true });
      if (cancha) q = q.eq('cancha', cancha);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
    demoSeed();
    return demoRead()
      .filter(r => r.fecha === fechaISO && r.estado !== 'cancelada' && (!cancha || r.cancha === cancha))
      .sort((a, b) => horaInt(a.hora_inicio) - horaInt(b.hora_inicio));
  }

  /** Set de horas (int) ocupadas para fecha+cancha (reservas + bloqueos del club).
      El Set lleva además una propiedad `aConfirmar` (Set) con las horas tomadas
      por reservas pendientes de verificación (transferencias sin confirmar):
      bloquean igual, pero el sitio público las muestra como "a confirmar". */
  async function getHorasOcupadas(fechaISO, cancha) {
    const [reservas, bloqueos] = await Promise.all([
      getReservas(fechaISO, cancha),
      getBloqueos(fechaISO, fechaISO)
    ]);
    const occ = new Set();
    const pend = new Set();
    reservas.forEach(r => {
      const ini = horaInt(r.hora_inicio);
      for (let h = ini; h < ini + r.duracion_horas; h++) {
        occ.add(h);
        if (r.estado === 'pendiente') pend.add(h);
      }
    });
    bloqueos.forEach(b => {
      const bc = b.cancha || 'ambas';
      if (bc !== 'ambas' && bc !== cancha) return; // bloqueo de la otra cancha
      if (b.hora_inicio === null || b.hora_inicio === undefined) {
        for (let h = HORA_APERTURA; h < HORA_CIERRE; h++) occ.add(h); // día completo
      } else {
        occ.add(horaInt(b.hora_inicio));
      }
    });
    if (!configured) demoFillerOccupied(fechaISO, cancha).forEach(h => occ.add(h));
    occ.aConfirmar = pend;
    return occ;
  }

  /** Cantidad de reservas activas de la semana en curso (lunes a domingo).
      La usa el hero del sitio público como prueba social real. */
  async function getReservasSemanaCount() {
    const d = new Date();
    const lunes = new Date(d); lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    const desde = toISO(lunes), hasta = toISO(domingo);
    if (configured) {
      const { count, error } = await sb().from('reservas')
        .select('id', { count: 'exact', head: true })
        .gte('fecha', desde).lte('fecha', hasta)
        .neq('estado', 'cancelada');
      if (error) throw error;
      return count || 0;
    }
    demoSeed();
    return demoRead().filter(r =>
      r.fecha >= desde && r.fecha <= hasta && r.estado !== 'cancelada'
    ).length;
  }

  /** Avisa cuando cambia cualquier reserva (alta, verificación, cancelación).
      Lo usa el panel para refrescarse en tiempo real. Devuelve una función
      para desuscribirse. Requiere que la tabla esté en la publicación
      `supabase_realtime` (ver README sección 3.1). */
  function onReservasChange(cb) {
    if (configured) {
      const ch = sb().channel('reservas-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, function () { cb(); })
        .subscribe();
      return function () { sb().removeChannel(ch); };
    }
    /* demo: cambios hechos desde otra pestaña del mismo navegador */
    const h = function (e) { if (e.key === DEMO_KEY) cb(); };
    window.addEventListener('storage', h);
    return function () { window.removeEventListener('storage', h); };
  }

  /** Guarda una suscripción de notificaciones push (tabla push_subs).
      rol 'duenio': upsert (requiere sesión del panel; re-asienta el rol).
      rol 'cliente': insert que ignora duplicados (el teléfono solo se ata
      la primera vez; alcanza para matchear los recordatorios). */
  async function savePushSub(subJson, rol, telefono) {
    if (!configured) return null; // modo demo: no hay backend que envíe push
    /* Pasamos por una función SECURITY DEFINER (save_push_sub en la base)
       en lugar de un INSERT directo: con los nuevos sb_publishable_* keys,
       PostgREST a veces no reconoce la sesión y RLS rechaza el insert
       como anónimo. La función bypassa eso de forma controlada. */
    const { error } = await sb().rpc('save_push_sub', {
      p_endpoint: subJson.endpoint,
      p_sub: subJson,
      p_rol: rol === 'duenio' ? 'duenio' : 'cliente',
      p_telefono: telefono || null
    });
    if (error) throw error;
    return true;
  }

  /** Registra que se cobró el saldo: deja la reserva como pago completo.
      Lo usa el panel cuando el cliente termina de pagar (en persona o por
      transferencia del saldo). */
  async function updateMontoPagado(id, monto) {
    if (configured) {
      const { data, error } = await sb().from('reservas')
        .update({ monto_pagado: monto, tipo_pago: 'completo' }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const list = demoRead();
    const r = list.find(x => x.id === id);
    if (r) { r.monto_pagado = monto; r.tipo_pago = 'completo'; demoWrite(list); }
    return r;
  }

  /** Reservas por lista de IDs (las que guardó el navegador del cliente).
      La policy anon de SELECT ya permite leerlas; sirve para "Mis reservas". */
  async function getReservasByIds(ids) {
    if (!ids || !ids.length) return [];
    if (configured) {
      const { data, error } = await sb().from('reservas').select('*').in('id', ids);
      if (error) throw error;
      return data || [];
    }
    demoSeed();
    return demoRead().filter(r => ids.indexOf(r.id) !== -1);
  }

  /** Cambia el estado de una reserva ('confirmada' | 'pendiente' | 'cancelada').
      Lo usa el panel: verificar una transferencia o liberar el horario. */
  async function updateEstado(id, estado) {
    if (configured) {
      const { data, error } = await sb().from('reservas')
        .update({ estado: estado }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const list = demoRead();
    const r = list.find(x => x.id === id);
    if (r) { r.estado = estado; demoWrite(list); }
    return r;
  }

  /* ---------- bloqueos del club (feriados, días sin trabajar) ---------- */

  /** Bloqueos en un rango de fechas (incluyente). hora_inicio null = día completo. */
  async function getBloqueos(desdeISO, hastaISO) {
    if (configured) {
      const { data, error } = await sb().from('bloqueos').select('*')
        .gte('fecha', desdeISO).lte('fecha', hastaISO);
      if (error) throw error;
      return data || [];
    }
    return demoBloqueosRead().filter(b => b.fecha >= desdeISO && b.fecha <= hastaISO);
  }

  /** Bloquea un día completo (hora = null) o una hora puntual (int),
      para una cancha ('pasto' | 'cemento') o todo el club ('ambas'). */
  async function addBloqueo(fechaISO, hora, cancha) {
    const fila = {
      fecha: fechaISO,
      hora_inicio: (hora === null || hora === undefined) ? null : String(hora).padStart(2, '0') + ':00',
      cancha: cancha || 'ambas'
    };
    if (configured) {
      const { data, error } = await sb().from('bloqueos').insert(fila).select().single();
      if (error) throw error;
      return data;
    }
    fila.id = 'blq-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    fila.created_at = new Date().toISOString();
    const list = demoBloqueosRead();
    list.push(fila);
    demoBloqueosWrite(list);
    return fila;
  }

  async function removeBloqueo(id) {
    if (configured) {
      const { error } = await sb().from('bloqueos').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    demoBloqueosWrite(demoBloqueosRead().filter(b => b.id !== id));
  }

  /** Crea una reserva. Devuelve la fila creada. */
  async function createReserva(r) {
    const fila = {
      cancha: r.cancha,
      deporte: r.deporte,
      fecha: r.fecha,
      hora_inicio: String(r.hora_inicio).padStart(2, '0') + ':00',
      duracion_horas: r.duracion_horas,
      nombre: r.nombre,
      telefono: r.telefono,
      jugadores: r.jugadores,
      tipo_pago: r.tipo_pago,
      medio_pago: r.medio_pago || 'mercadopago', // 'mercadopago' | 'transferencia'
      monto_pagado: r.tipo_pago === 'sena' ? SENA : r.duracion_horas * PRECIO_HORA,
      monto_total: r.duracion_horas * PRECIO_HORA,
      /* por transferencia queda PENDIENTE hasta que el dueño verifique que
         la plata entró (botón en el panel); evita reservas fantasma */
      estado: (r.medio_pago === 'transferencia') ? 'pendiente' : 'confirmada'
    };
    if (configured) {
      const { data, error } = await sb().from('reservas').insert(fila).select().single();
      if (error) throw error;
      return data;
    }
    demoSeed();
    fila.id = 'demo-' + Date.now();
    fila.created_at = new Date().toISOString();
    fila.notificacion_30min_enviada = false;
    fila.notificacion_10min_enviada = false;
    const list = demoRead();
    list.push(fila);
    demoWrite(list);
    return fila;
  }

  /* ---------- auth (panel admin) ---------- */

  async function signIn(password) {
    if (configured) {
      const { data, error } = await sb().auth.signInWithPassword({ email: ADMIN_EMAIL, password: password });
      if (error) return { ok: false, message: 'Contraseña incorrecta.' };
      return { ok: true, session: data.session };
    }
    /* Modo demo: sin Supabase no hay datos reales que proteger;
       cualquier contraseña no vacía entra (se avisa en pantalla). */
    if (!password) return { ok: false, message: 'Ingresá una contraseña.' };
    sessionStorage.setItem('slm-admin', '1');
    return { ok: true, session: { demo: true } };
  }

  async function getSession() {
    if (configured) {
      const { data } = await sb().auth.getSession();
      return data.session || null;
    }
    return sessionStorage.getItem('slm-admin') === '1' ? { demo: true } : null;
  }

  async function signOut() {
    if (configured) await sb().auth.signOut();
    sessionStorage.removeItem('slm-admin');
  }

  /* ---------- MercadoPago ---------- */

  /** Link de pago según tipo y horas. Devuelve '' si no está configurado. */
  function mpLink(tipoPago, horas) {
    if (tipoPago === 'sena') return MP_LINK_SENA || '';
    return MP_LINKS_TOTAL[horas] || '';
  }

  /* ---------- export ---------- */

  window.SLM = {
    configured: configured,
    PRECIO_HORA: PRECIO_HORA,
    SENA: SENA,
    HORA_APERTURA: HORA_APERTURA,
    HORA_CIERRE: HORA_CIERRE,
    MAX_HORAS: MAX_HORAS,
    MAX_JUGADORES: MAX_JUGADORES,
    toISO: toISO,
    horaInt: horaInt,
    db: {
      getReservas: getReservas,
      getHorasOcupadas: getHorasOcupadas,
      getReservasSemanaCount: getReservasSemanaCount,
      getReservasByIds: getReservasByIds,
      onReservasChange: onReservasChange,
      savePushSub: savePushSub,
      updateMontoPagado: updateMontoPagado,
      createReserva: createReserva,
      updateEstado: updateEstado,
      getBloqueos: getBloqueos,
      addBloqueo: addBloqueo,
      removeBloqueo: removeBloqueo
    },
    auth: { signIn: signIn, signOut: signOut, getSession: getSession },
    mp: { link: mpLink }
  };
})();
