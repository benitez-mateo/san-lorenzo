/* ============================================================
   config.js — Datos editables del sitio
   Club Atlético San Lorenzo de Muñiz

   Completá estos valores y listo: no hace falta tocar ningún
   otro archivo. Si un valor queda vacío ('' o null), el sitio
   usa el placeholder correspondiente.
   ============================================================ */

window.SLM_CONFIG = {

  /* --- Contacto --- */
  // Teléfono como se muestra en pantalla (sección Contacto).
  TELEFONO: '+54 9 11 2651-0106',
  // Teléfono en formato para marcar (href tel:), sin espacios ni guiones.
  TELEFONO_LINK: '+5491126510106',

  /* --- Pago por transferencia (cualquier billetera virtual o banco) --- */
  // Alias de la cuenta del club (CBU/CVU). El que reserva lo copia y
  // transfiere desde Ualá, Brubank, MercadoPago, su banco, etc.
  // ⚠ Reemplazá por el alias REAL antes de publicar. Vacío ('') = la
  //   opción de transferencia no aparece y solo se ofrece MercadoPago.
  ALIAS_TRANSFERENCIA: 'club.slm.demo',
  // Nombre del titular tal como figura en la cuenta (para verificar
  // que la transferencia va a la cuenta correcta).
  ALIAS_TITULAR: 'Club Atlético San Lorenzo de Muñiz',

  /* --- Hero --- */
  // Prueba social: "+N reservas esta semana". Poné null para ocultarla.
  RESERVAS_SEMANA: 27,
  // Video de fondo en loop (ej: 'video/cancha.mp4'). Vacío = gradiente animado.
  HERO_VIDEO: '',

  /* --- Cards de canchas --- */
  // Fotos reales: guardá los archivos con estos nombres en la carpeta img/.
  // Si el archivo no existe todavía, se muestra el placeholder automáticamente.
  FOTO_PASTO: 'img/pasto.jpg',
  FOTO_CEMENTO: 'img/cemento.jpg',
  // Etiqueta destacada de cada card ('' = sin etiqueta).
  BADGE_PASTO: 'Más reservada',
  BADGE_CEMENTO: 'Disponible hoy'
};
