/* ============================================================
   push.js — Notificaciones del navegador (Web Push)
   Plantilla de reservas de canchas

   Compartido por el sitio público y el panel admin:
   - registra el service worker (sw.js)
   - muestra un banner arriba (sin tapar nada) pidiendo permiso,
     solo la primera vez y recordando si el usuario dijo que no
   - suscribe y guarda la suscripción en Supabase (push_subs)

   La clave pública VAPID se genera junto con la privada
   (ver README sección 5). La privada va como secret de las
   Edge Functions; esta es pública por diseño.
   ============================================================ */

(function () {
  'use strict';

  const VAPID_PUBLIC_KEY = 'BME1YGLiO2np2Kpt3piI8vc-9BE8XoqqOb35ahsRkOHMwcO4LYn3PXYU4wtpdvhfblOI42TgfQ1MW1F5-0RUhhk';

  const C = window.SLM;
  const soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const KEY = 'slm-push-banner'; // 'no' = no volver a mostrar el banner

  function b64ToBytes(b64) {
    const pad = '='.repeat((4 - b64.length % 4) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function registrar() {
    return navigator.serviceWorker.register('sw.js');
  }

  async function subscribe() {
    const r = await registrar();
    let sub = await r.pushManager.getSubscription();
    if (!sub) {
      sub = await r.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY)
      });
    }
    return sub;
  }

  /** Guarda la suscripción en la base (no hace nada en modo demo). */
  function guardar(sub, rol, telefono) {
    if (!sub) return Promise.resolve(null);
    const json = sub.toJSON ? sub.toJSON() : sub;
    return C.db.savePushSub(json, rol, telefono || null);
  }

  /** Si ya hay permiso: asegura la suscripción y la guarda.
      La llama el panel en cada carga (rol duenio) y el sitio público
      al confirmar una reserva (rol cliente + teléfono, para que le
      lleguen los recordatorios de su turno). */
  async function asegurar(rol, telefono) {
    if (!soporta || Notification.permission !== 'granted') return null;
    try {
      const sub = await subscribe();
      await guardar(sub, rol, telefono);
      return sub;
    } catch (e) { return null; }
  }

  /** Banner superior de permiso: en flujo (empuja el contenido, no tapa).
      Solo si el navegador soporta push y el usuario todavía no decidió.
      opts.temporal: el "Ahora no" vale solo por esta sesión (lo usa el
      panel: el dueño no debería perder los avisos para siempre por un toque). */
  function init(opts) {
    if (!soporta || !C) return;
    registrar().catch(function () {});
    if (Notification.permission !== 'default') return; // ya decidió antes
    const store = opts.temporal ? sessionStorage : localStorage;
    try { if (store.getItem(KEY) === 'no') return; } catch (e) {}

    const bar = document.createElement('div');
    bar.className = 'push-banner';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Activar avisos');
    bar.innerHTML =
      '<span class="pb-txt">' + opts.texto + '</span>' +
      '<span class="pb-acts">' +
      '<button type="button" class="pb-si">' + (opts.boton || 'Activar avisos') + '</button>' +
      '<button type="button" class="pb-no">Ahora no</button>' +
      '</span>';
    document.body.prepend(bar);

    function cerrar() { bar.remove(); }

    bar.querySelector('.pb-no').addEventListener('click', function () {
      try { store.setItem(KEY, 'no'); } catch (e) {}
      cerrar();
    });

    bar.querySelector('.pb-si').addEventListener('click', async function () {
      cerrar();
      try {
        const p = await Notification.requestPermission();
        if (p !== 'granted') return;
        const sub = await subscribe();
        if (opts.onSub) opts.onSub(sub);
      } catch (e) { /* sin permiso o sin push service */ }
    });
  }

  function registrarSW() {
    if (soporta) registrar().catch(function () {});
  }

  window.SLM.push = {
    soporta: soporta,
    init: init,
    registrarSW: registrarSW,
    subscribe: subscribe,
    guardar: guardar,
    asegurar: asegurar
  };
})();
