'use strict';
/* SEÑAL 432 — VampireBBS 2026
   Estación de Relevo SR-14, Pirineos · Noviembre de 1987
   Un operador de radio recibe una señal que conoce su nombre.
   4 finales, 200 puntos, ~45-60 min primer intento. */

// ─── Estado ───────────────────────────────────────────────────────────────────
const S = {
  room: 'torre',
  inv: ['cuaderno'],
  worn: [],
  flags: {
    power: 0,           // 0=ninguna 1=parcial 2=completa
    signal: 0,          // 0=sin descifrar 1=fragmento 2=grabación/completa
    sotanoAbierto: false,
    despachoAbierto: false,
    finalStarted: false,
    // score gates
    diarioLeido: false,
    llaveMarcoVista: false,
    notaVista: false,
    registroLeido: false,
    descifrado: false,
    fusiblesInstalados: false,
    cintaReproducida: false,
    transistorInstalado: false,
    azoteaScore: false,
    consolaVista: false,
    transistorVisto: false,
  },
  visited: new Set(),
  score: 0,
  turns: 0,
  history: [],
  histIdx: 0,
};

// ─── Objetos ──────────────────────────────────────────────────────────────────
const ITEMS = {
  cuaderno: {
    name: 'cuaderno de turno', portable: true, location: 'inv',
    nouns: ['cuaderno', 'libreta', 'bitácora', 'cuaderno de turno'],
    desc: 'Cuaderno de turno de Tomás Argüello. La última entrada: «01:00 — Sintonizado 3.7 kHz. La señal lleva mi nombre. Patrón fractal base-12. Origen no catalogado.»',
  },
  linterna: {
    name: 'linterna', portable: true, location: 'almacen',
    nouns: ['linterna', 'lámpara', 'luz'],
    desc: 'Linterna de mano metálica. Pilas nuevas.',
  },
  diario_operador: {
    name: 'diario del operador', portable: true, location: 'dormitorio',
    nouns: ['diario', 'diario del operador', 'diario viejo'],
    desc: 'Diario de piel gastada. Entradas de 1985, firmadas «E. Villanueva». La última hoja tiene doble trazo, como si la mano temblara.',
  },
  llave_marco: {
    name: 'llave pequeña', portable: true, location: 'hidden_dormitorio',
    nouns: ['llave', 'llave pequeña', 'llave vieja'],
    desc: 'Llave metálica pegada con cinta adhesiva al dorso del cuadro. Abre el despacho del inspector.',
  },
  nota_cifrada: {
    name: 'nota cifrada', portable: true, location: 'archivo',
    nouns: ['nota cifrada', 'nota', 'papel cifrado', 'transcripción'],
    desc: 'Hoja mecanografiada de 1985. Transcripción cifrada de la señal de aquella noche. Alguien subrayó: «CLAVE: TU PROPIO NOMBRE — E.V.»',
  },
  registro_frecuencias: {
    name: 'registro de frecuencias', portable: true, location: 'taller',
    nouns: ['registro', 'registro de frecuencias', 'log'],
    desc: 'Libro de registro técnico. Anotación a mano: «3.7 kHz — señal no catalogada — 12/03/1985 — op. E. Villanueva». Hay otras dos entradas iguales, 603 días después cada una.',
  },
  manual_cifrado: {
    name: 'manual de cifrado', portable: true, location: 'despacho',
    nouns: ['manual', 'manual de cifrado', 'libro de cifrado', 'vigenère', 'vigenere'],
    desc: 'Manual técnico cifrado OTAN-1979. Cap. 7: «Para descifrar Vigenère, aplica la clave carácter a carácter sobre el texto.» Nota al margen: «En señales clase Omega, la clave ES el nombre del receptor.»',
  },
  tarjeta_sotano: {
    name: 'tarjeta de acceso', portable: true, location: 'despacho',
    nouns: ['tarjeta', 'tarjeta de acceso', 'tarjeta sótano'],
    desc: 'Tarjeta magnética verde. «ACCESO SÓTANO — PERSONAL TÉCNICO». Algo desgastada.',
  },
  guantes_aislamiento: {
    name: 'guantes de aislamiento', portable: true, location: 'taller',
    nouns: ['guantes', 'guantes de aislamiento', 'guantes eléctricos'],
    desc: 'Guantes de goma naranja gruesa. Protección clase B para trabajos eléctricos.',
  },
  fusibles: {
    name: 'pack de fusibles', portable: true, location: 'almacen',
    nouns: ['fusibles', 'fusible', 'pack de fusibles'],
    desc: 'Pack de fusibles de repuesto 16A. Mismo tipo que el del cuadro principal de la subestación.',
  },
  transistor_repuesto: {
    name: 'transistor de repuesto', portable: true, location: 'taller',
    nouns: ['transistor', 'transistor de repuesto', 'componente', '2n3055'],
    desc: 'Transistor 2N3055 en caja original. Etiqueta: «REPUESTO AMPLIFICADOR PRINCIPAL». Exactamente lo que falta en la Sala de Equipos.',
  },
  chaleco: {
    name: 'chaleco térmico', portable: true, wearable: true, location: 'vestibulo',
    nouns: ['chaleco', 'chaleco térmico', 'anorak', 'abrigo'],
    desc: 'Chaleco acolchado naranja colgado en la taquilla. Imprescindible para salir al exterior con el temporal.',
  },
  llave_inglesa: {
    name: 'llave inglesa', portable: true, location: 'taller',
    nouns: ['llave inglesa', 'llave', 'herramienta'],
    desc: 'Llave inglesa robusta. Sirve para desconectar conexiones de antena y forcejear pernos de anclaje.',
  },
  cinta_85: {
    name: 'cinta magnética (1985)', portable: true, location: 'archivo',
    nouns: ['cinta', 'cinta magnética', 'cinta del 85', 'cinta de 1985'],
    desc: 'Cinta magnética 1/4", etiqueta escrita a mano: «SEÑAL — 12/03/1985 — 03:14». Necesita la grabadora de la Cabina.',
  },
  grabadora: {
    name: 'grabadora de cinta', portable: false, location: 'cabina',
    nouns: ['grabadora', 'reproductor', 'reproductor de cinta', 'magnetófono'],
    desc: 'Grabadora profesional de 1/4". Necesita alimentación eléctrica.',
  },
};
const HIDDEN_ITEMS = new Set(['llave_marco']);

// ─── Salas ────────────────────────────────────────────────────────────────────
const ROOMS = {
  torre: {
    name: 'Torre de Control',
    desc: () => {
      const cabOk = S.flags.power >= 1;
      const azOk  = S.flags.power >= 2;
      return `La sala principal de operaciones. Tres consolas en rojo; la alimentación de emergencia apenas sostiene las pantallas. ` +
        `En la consola central el espectrómetro de frecuencias emite un pitido periódico. ` +
        `La ventana norte muestra la cordillera nevada en la oscuridad. ` +
        `Al sur, el pasillo. Al norte, la Sala de Equipos. Al este, el Taller. ` +
        `Al oeste la Cabina de Aislamiento${cabOk ? '' : ' <span class="dim">(sin energía)</span>'}. ` +
        `Arriba, la Azotea${azOk ? '' : ' <span class="dim">(bloqueo electromagnético activo)</span>'}.`;
    },
    exits: {
      norte: 'sala_equipos', sur: 'pasillo', este: 'taller',
      oeste: () => S.flags.power >= 1 ? 'cabina' : null,
      arriba: () => S.flags.power >= 2 ? 'azotea' : null,
    },
  },
  sala_equipos: {
    name: 'Sala de Equipos',
    desc: () => `Racks de electrónica con testigos en ámbar y rojo. El amplificador principal tiene el panel abierto — ` +
      (S.flags.transistorInstalado ? 'el transistor nuevo zumba a plena potencia.' :
       'un transistor quemado deja el sistema por debajo de la potencia necesaria.') +
      ' Al sur, la Torre de Control. Al oeste, el Despacho del Inspector' +
      (S.flags.despachoAbierto ? '.' : ' <span class="dim">(cerrado con llave)</span>.'),
    exits: {
      sur: 'torre',
      oeste: () => S.flags.despachoAbierto ? 'despacho' : null,
    },
  },
  despacho: {
    name: 'Despacho del Inspector',
    desc: () => `Oficina pequeña con escritorio de metal y archivadores. Mapa topográfico en la pared. ` +
      `Protocolos OTAN de gestión de anomalías esparcidos como si alguien hubiera salido con prisa. ` +
      `Al este, la Sala de Equipos.`,
    exits: { este: 'sala_equipos' },
  },
  cabina: {
    name: 'Cabina de Aislamiento',
    desc: () => `Habitación forrada de material absorbente gris. Paredes apantalladas electromagnéticamente. ` +
      `Una grabadora de cinta profesional${S.flags.power >= 1 ? ' está encendida y lista.' : ' permanece apagada.'} ` +
      `Al este, la Torre de Control.`,
    exits: { este: 'torre' },
  },
  taller: {
    name: 'Taller de Mantenimiento',
    desc: () => `Mesas de trabajo con herramientas ordenadas. Huele a soldadura y aceite. ` +
      `En un tablero hay tornillos y componentes clasificados por tamaño. ` +
      `Una nota pegada: «TRANSISTOR REPUESTO: estante C». Al oeste, la Torre de Control.`,
    exits: { oeste: 'torre' },
  },
  pasillo: {
    name: 'Pasillo Central',
    desc: () => `Corredor de linóleo gastado. Al norte, la Torre de Control. ` +
      `Al este, el Dormitorio. Al oeste, la Cocina. Al sur, el Vestíbulo. ` +
      `Una trampilla en el suelo${S.flags.sotanoAbierto ? ' está abierta (baja al Sótano)' : ' tiene cerradura magnética'}.`,
    exits: {
      norte: 'torre', este: 'dormitorio', oeste: 'cocina', sur: 'vestibulo',
      abajo: () => S.flags.sotanoAbierto ? 'sotano' : null,
    },
  },
  dormitorio: {
    name: 'Dormitorio',
    desc: () => `Litera con sábanas arrugadas. Mesilla con un cuadro de Dalí en miniatura. ` +
      `Bolsa de viaje entreabierta en el suelo. El diario del operador anterior descansa sobre la almohada. ` +
      `Al oeste, el Pasillo. Al norte, el Archivo.`,
    exits: { oeste: 'pasillo', norte: 'archivo' },
  },
  cocina: {
    name: 'Cocina',
    desc: () => `Cafetera, botes de café instantáneo y tazas sin fregar. ` +
      `El reloj de pared marca las 01:12. Al este, el Pasillo.`,
    exits: { este: 'pasillo' },
  },
  archivo: {
    name: 'Archivo de Transmisiones',
    desc: () => `Estanterías con cajas de cinta magnética numeradas por año. ` +
      `Las cajas del 85 están en el estante superior, parcialmente caídas. ` +
      `Entre ellas asoma un papel mecanografiado. Al sur, el Dormitorio. Al oeste, el Baño.`,
    exits: { sur: 'dormitorio', oeste: 'bano' },
  },
  bano: {
    name: 'Cuarto de Baño',
    desc: () => `Baño estrecho con espejo agrietado y botiquín. Nada más de interés. ` +
      `Al este, el Archivo.`,
    exits: { este: 'archivo' },
  },
  vestibulo: {
    name: 'Vestíbulo de Entrada',
    desc: () => {
      const tieneChaleco = S.inv.includes('chaleco') || S.worn.includes('chaleco');
      const chalecoColgado = ITEMS.chaleco.location === 'vestibulo';
      return `Entrada del edificio. Puerta principal sellada por el temporal; el anemómetro marca ráfagas de 80 km/h. ` +
        (chalecoColgado ? `Taquilla entreabierta a la derecha: <em>chaleco térmico naranja</em> colgado dentro. ` : `Taquilla entreabierta y vacía. `) +
        `Al norte, el Pasillo. Al este, el Almacén. Al sur, el exterior nevado` +
        (tieneChaleco ? '.' : ' <span class="dim">(mortal sin abrigo)</span>.');
    },
    exits: {
      norte: 'pasillo', este: 'almacen',
      sur: () => (S.inv.includes('chaleco') || S.worn.includes('chaleco')) ? 'exterior' : null,
    },
  },
  almacen: {
    name: 'Almacén',
    desc: () => `Cuarto con cajas de material técnico. Huele a aceite. ` +
      `Material eléctrico de repuesto a la derecha. Al oeste, el Vestíbulo.`,
    exits: { oeste: 'vestibulo' },
  },
  exterior: {
    name: 'Exterior — La Nevada',
    desc: () => `El mundo exterior es un muro blanco. El viento ulula en frecuencias que recuerdan a la señal. ` +
      `La antena de transmisión proyecta su sombra inmóvil en la nieve. ` +
      `Al norte, de vuelta al Vestíbulo.`,
    exits: { norte: 'vestibulo' },
  },
  sotano: {
    name: 'Sótano — Sistemas de Potencia',
    dark: true,
    desc: () => {
      if (!S.inv.includes('linterna'))
        return `Oscuridad casi total. El zumbido de los transformadores llena el aire. ` +
          `Necesitas la linterna para orientarte aquí abajo. ` +
          `Arriba, el Pasillo.`;
      return `Sala de maquinaria con zumbido constante de transformadores. ` +
        `Paneles eléctricos en las paredes. El cuadro de distribución principal está al fondo. ` +
        `Al norte, la Subestación Eléctrica. Arriba, el Pasillo.`;
    },
    exits: { norte: 'subestacion', arriba: 'pasillo' },
  },
  subestacion: {
    name: 'Subestación Eléctrica',
    dark: true,
    desc: () => {
      if (!S.inv.includes('linterna'))
        return `Oscuridad total. Solo el brillo rojo del fusible fundido indica donde estás. ` +
          `Necesitas la linterna para trabajar aquí. Al sur, el Sótano.`;
      return `La subestación auxiliar. El panel principal tiene una ranura de fusible marcada ` +
        `«CIRCUITO DE EMERGENCIA». ` +
        (S.flags.fusiblesInstalados ? 'Los nuevos fusibles están instalados; circuito activo.' :
         'El fusible fundido sigue en su lugar, brillando en rojo.') +
        ' Al sur, el Sótano.';
    },
    exits: { sur: 'sotano' },
  },
  azotea: {
    name: 'Azotea — Antena Principal',
    desc: () => {
      const botones = S.flags.signal >= 2
        ? '<span class="ok">SILENCIO</span>, <span class="warn">AMPLIFICAR</span> y <span class="bad">DESTRUIR</span>'
        : '<span class="dim">[ilegibles sin haber descifrado la señal]</span>';
      return `La tormenta azota desde el norte. La antena de transmisión domina el centro: un mástil de 18 metros ` +
        `con el conjunto de dipolo activo. Panel de control a su base con tres botones: ${botones}. ` +
        `Por la escotilla se baja a la Torre de Control.`;
    },
    exits: { abajo: 'torre' },
  },
};

// ─── Salida en pantalla ───────────────────────────────────────────────────────
const out   = document.getElementById('out');
const inp   = document.getElementById('inp');
const scEl  = document.getElementById('sc');
let printBusy = false, printQueue = [], bootMode = false;

function pr(html, cls = '') {
  printQueue.push({ html, cls });
  if (!printBusy) drainQueue();
}
function blank() { pr('', 'sep'); }

function drainQueue() {
  if (!printQueue.length) { printBusy = false; return; }
  printBusy = true;
  const { html, cls } = printQueue.shift();
  if (!html && !cls) { _appendLine('', ''); setTimeout(drainQueue, 20); return; }
  if (cls === 'sep') { _appendLine('─'.repeat(50), 'sep'); setTimeout(drainQueue, 20); return; }
  if (html.length > 70 && cls !== 'cmd' && !html.startsWith('<') && cls !== 'big') {
    _typewriterLine(html, cls);
  } else {
    _appendLine(html, cls);
    setTimeout(drainQueue, 35);
  }
}

function _appendLine(html, cls) {
  const d = document.createElement('div');
  d.className = 'line' + (cls ? ' ' + cls : '');
  d.innerHTML = html;
  out.appendChild(d);
  out.scrollTop = out.scrollHeight;
}

function _typewriterLine(html, cls) {
  const d = document.createElement('div');
  d.className = 'line ' + (cls || '') + ' typing';
  out.appendChild(d);
  out.scrollTop = out.scrollHeight;
  const plain = html.replace(/<[^>]+>/g, '');
  let i = 0;
  const iv = setInterval(() => {
    d.textContent = plain.slice(0, ++i);
    out.scrollTop = out.scrollHeight;
    if (i >= plain.length) {
      clearInterval(iv);
      d.innerHTML = html;
      d.classList.remove('typing');
      setTimeout(drainQueue, 40);
    }
  }, 18);
}

function flushQueue() {
  printQueue.forEach(({ html, cls }) => _appendLine(html, cls));
  printQueue = [];
  printBusy = false;
}

function updateScore() { scEl.textContent = S.score; }
function addScore(n, reason) {
  S.score = Math.min(200, S.score + n);
  updateScore();
  if (reason) pr(`[+${n} — ${reason}]`, 'dim');
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function itemByNoun(t, pool) {
  if (!t) return null;
  const tl = t.toLowerCase().replace(/^(el|la|los|las|un|una)\s+/, '').trim();
  pool = pool || [
    ...S.inv, ...S.worn,
    ...Object.keys(ITEMS).filter(k => ITEMS[k].location === S.room),
  ];
  for (const id of pool) {
    const it = ITEMS[id];
    if (!it || HIDDEN_ITEMS.has(id)) continue;
    if (it.nouns && it.nouns.some(n => tl === n || tl.includes(n) || n.includes(tl))) return { id, it };
  }
  return null;
}

function allAtRoom(room) {
  return Object.entries(ITEMS).filter(([id, it]) => it.location === room && !HIDDEN_ITEMS.has(id));
}

function resolvedExits(room) {
  const ex = {};
  for (const [dir, tgt] of Object.entries(ROOMS[room]?.exits || {})) {
    const d = typeof tgt === 'function' ? tgt() : tgt;
    if (d) ex[dir] = d;
  }
  return ex;
}

// ─── Mirar ────────────────────────────────────────────────────────────────────
function doLook() {
  const r = ROOMS[S.room];
  if (!r) return;
  blank();
  pr(r.name, 'loc');
  pr(typeof r.desc === 'function' ? r.desc() : r.desc, 'desc');
  const dark = r.dark && !S.inv.includes('linterna');
  if (!dark) {
    const items = allAtRoom(S.room);
    if (items.length) { blank(); items.forEach(([, it]) => pr(`Ves: <em>${it.name}</em>.`, 'ok')); }
  }
  const ex = resolvedExits(S.room);
  const keys = Object.keys(ex);
  if (keys.length) { blank(); pr('Salidas: ' + keys.join(', ') + '.', 'dim'); }
  if (S.room === 'azotea' && S.flags.signal >= 2 && !S.flags.finalStarted && S.flags.azoteaScore) {
    blank();
    _finalPrompt();
  }
}

// ─── Movimiento ───────────────────────────────────────────────────────────────
const DIR = { norte:'norte',n:'norte',sur:'sur',s:'sur',este:'este',e:'este',
  oeste:'oeste',o:'oeste',arriba:'arriba',sube:'arriba',subir:'arriba',up:'arriba',u:'arriba',
  abajo:'abajo',baja:'abajo',bajar:'abajo',down:'abajo',d:'abajo' };

function doGo(rawDir) {
  const dir = DIR[rawDir];
  if (!dir) { pr('No entiendo esa dirección.', 'bad'); return; }
  const rawTgt = ROOMS[S.room]?.exits?.[dir];
  const tgt = typeof rawTgt === 'function' ? rawTgt() : rawTgt;
  if (!tgt) {
    if (dir === 'oeste' && S.room === 'torre' && S.flags.power < 1)
      pr('La cabina está bloqueada: sin energía.', 'bad');
    else if (dir === 'arriba' && S.room === 'torre' && S.flags.power < 2)
      pr('La escotilla de la azotea tiene bloqueo electromagnético. Necesitas potencia completa.', 'bad');
    else if (dir === 'oeste' && S.room === 'sala_equipos' && !S.flags.despachoAbierto)
      pr('La puerta del despacho está cerrada con llave. Necesitas la llave pequeña.', 'bad');
    else if (dir === 'abajo' && S.room === 'pasillo' && !S.flags.sotanoAbierto)
      pr('La trampilla tiene cerradura magnética. Necesitas la tarjeta de acceso del sótano.', 'bad');
    else if (dir === 'sur' && S.room === 'vestibulo')
      pr('El temporal mataría en minutos. Necesitas el chaleco térmico.', 'bad');
    else
      pr('No puedes ir en esa dirección desde aquí.', 'bad');
    return;
  }
  S.room = tgt;
  const firstVisit = !S.visited.has(tgt);
  S.visited.add(tgt);
  doLook();
  if (firstVisit) _onEnterRoom(tgt);
  _advanceTurn();
}

function _onEnterRoom(room) {
  if (room === 'despacho' && !S.flags.despachoScore) {
    S.flags.despachoScore = true;
    addScore(10, 'despacho del inspector descubierto');
  }
  if (room === 'azotea' && !S.flags.azoteaScore) {
    S.flags.azoteaScore = true;
    addScore(20, 'azotea alcanzada');
    blank();
    if (S.flags.signal >= 2) {
      pr('La señal resuena con más fuerza aquí arriba. Tienes tres opciones frente a ti.', 'warn');
      _finalPrompt();
    } else {
      pr('Aún no entiendes lo suficiente de la señal para decidir con conocimiento.', 'hint');
      pr('Vuelve cuando hayas escuchado la grabación de 1985 en la Cabina.', 'hint');
    }
  }
}

function _advanceTurn() {
  S.turns++;
  if (S.turns === 7 && !S.flags.consolaVista) _signalBleed();
  if (S.turns === 20 && S.flags.signal < 2) _signalBleed();
  if (S.turns === 35 && S.flags.signal < 2) _signalBleed();
  if (S.turns > 50 && S.turns % 18 === 0 && !S.flags.finalStarted) _signalBleed();
}

function _signalBleed() {
  const msgs = [
    'El espectrómetro vibra: «…T…O…M…Á…S…»',
    'Las luces parpadean. 3.7 kHz sigue activo.',
    'Susurro estático: «…sabes lo que tienes que hacer…»',
    'El receptor crepita. Algo aguarda respuesta.',
  ];
  blank();
  pr(msgs[Math.floor(Math.random() * msgs.length)], 'glitch');
}

// ─── Examinar ────────────────────────────────────────────────────────────────
function doExamine(t) {
  if (!t) { pr('¿Examinar qué?', 'bad'); return; }
  const res = itemByNoun(t);
  if (res) { pr(res.it.desc, 'desc'); return; }
  const tl = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

  // Habitación-específico
  if (S.room === 'dormitorio' && (tl.includes('cuadro') || tl.includes('dali') || tl.includes('marco') || tl.includes('pintura'))) {
    if (HIDDEN_ITEMS.has('llave_marco')) {
      HIDDEN_ITEMS.delete('llave_marco');
      ITEMS.llave_marco.location = 'dormitorio';
      pr('Levantas el pequeño cuadro de Dalí. Pegada al dorso con cinta adhesiva: una llave pequeña.', 'ok');
      if (!S.flags.llaveMarcoVista) { S.flags.llaveMarcoVista = true; addScore(5, 'secreto del cuadro'); }
    } else {
      pr('El cuadro de «La persistencia de la memoria». Ya no hay nada detrás.', 'desc');
    }
    return;
  }
  if (S.room === 'torre' && (tl.includes('consola') || tl.includes('espectrometro') || tl.includes('panel'))) {
    pr('La consola central muestra el espectro de frecuencias. Una banda anómala late a 3.7 kHz.', 'desc');
    pr('Patrón fractal base-12. Origen fuera del catálogo de señales conocidas.', 'desc');
    if (!S.flags.consolaVista) {
      S.flags.consolaVista = true;
      pr('Post-it pegado al margen: «Ver registro de frecuencias — taller».', 'hint');
    }
    return;
  }
  if (S.room === 'subestacion' && (tl.includes('fusible') || tl.includes('panel') || tl.includes('circuito') || tl.includes('ranura'))) {
    if (!S.flags.fusiblesInstalados)
      pr('El fusible del circuito de emergencia está fundido. Con fusibles nuevos y guantes de aislamiento podrías cambiarlo.', 'desc');
    else
      pr('Fusibles nuevos instalados. El indicador verde confirma el circuito activo.', 'ok');
    return;
  }
  if (S.room === 'sala_equipos' && (tl.includes('amplificador') || tl.includes('transistor') || tl.includes('rack'))) {
    if (!S.flags.transistorInstalado) {
      pr('El amplificador principal tiene una ranura de transistor vacía. El 2N3055 se ha fundido.', 'desc');
      if (!S.flags.transistorVisto) { S.flags.transistorVisto = true; pr('Quizás hay un repuesto en el Taller.', 'hint'); }
    } else {
      pr('El transistor nuevo zumba a plena potencia.', 'ok');
    }
    return;
  }
  if (S.room === 'vestibulo' && (tl.includes('taquilla') || tl.includes('armario'))) {
    pr('Taquilla entreabierta. Dentro, un chaleco térmico naranja colgado de un gancho.', 'desc');
    return;
  }
  if (S.room === 'azotea' && (tl.includes('antena') || tl.includes('panel') || tl.includes('boton') || tl.includes('mastil'))) {
    if (S.flags.signal >= 2) {
      pr('Panel de control con tres botones:', 'desc');
      pr('  <span class="ok">[SILENCIO]</span>  — Desconectar la antena.', 'ok');
      pr('  <span class="warn">[AMPLIFICAR]</span> — Retransmitir amplificado hacia la Tierra.', 'warn');
      pr('  <span class="bad">[DESTRUIR]</span>  — Desmantelar físicamente el sistema.', 'bad');
      pr('También puedes bajar e IGNORAR la situación.', 'hint');
    } else {
      pr('El panel tiene botones pero no puedes interpretar las instrucciones sin haber descifrado la señal.', 'bad');
    }
    return;
  }
  pr(`No encuentras «${t}» en particular.`, 'bad');
}

// ─── Coger / Dejar / Ponerse ──────────────────────────────────────────────────
function doTake(t) {
  if (!t) { pr('¿Coger qué?', 'bad'); return; }
  const pool = Object.keys(ITEMS).filter(k => ITEMS[k].location === S.room);
  const res = itemByNoun(t, pool);
  if (!res) { pr('No ves eso aquí.', 'bad'); return; }
  if (!res.it.portable) { pr('No puedes coger eso.', 'bad'); return; }
  res.it.location = 'inv';
  S.inv.push(res.id);
  pr(`Coges ${res.it.name}.`, 'ok');
  _advanceTurn();
}

function doDrop(t) {
  if (!t) { pr('¿Dejar qué?', 'bad'); return; }
  const res = itemByNoun(t, S.inv);
  if (!res) { pr('No llevas eso.', 'bad'); return; }
  S.inv = S.inv.filter(x => x !== res.id);
  res.it.location = S.room;
  pr(`Dejas ${res.it.name} aquí.`, 'ok');
  _advanceTurn();
}

function doWear(t) {
  if (!t) { pr('¿Ponerse qué?', 'bad'); return; }
  const res = itemByNoun(t, S.inv);
  if (!res) { pr('No tienes eso en el inventario.', 'bad'); return; }
  if (!res.it.wearable) { pr('No puedes ponerte eso.', 'bad'); return; }
  S.inv = S.inv.filter(x => x !== res.id);
  S.worn.push(res.id);
  res.it.location = 'worn';
  pr(`Te pones ${res.it.name}.`, 'ok');
  _advanceTurn();
}

// ─── Leer ─────────────────────────────────────────────────────────────────────
function doRead(t) {
  if (!t) { pr('¿Leer qué?', 'bad'); return; }
  const pool = [...S.inv, ...S.worn, ...Object.keys(ITEMS).filter(k => ITEMS[k].location === S.room)];
  const res = itemByNoun(t, pool);
  if (!res) { pr('No tienes eso para leer.', 'bad'); return; }
  _readItem(res.id);
  _advanceTurn();
}

function _readItem(id) {
  switch(id) {
    case 'cuaderno':
      pr('Cuaderno de turno — Tomás Argüello — 14/11/1987', 'big');
      pr('00:00 — Inicio de turno nocturno. Sin novedades.', 'desc');
      pr('00:23 — Interferencia en banda KW. Origen indeterminado.', 'desc');
      pr('00:47 — La interferencia se resuelve en un patrón. Fractal base-12. Repite algo. Mi nombre.', 'warn');
      pr('01:00 — He sintonizado 3.7 kHz. La señal es clara. Lleva horas esperando.', 'warn');
      break;

    case 'diario_operador':
      if (!S.flags.diarioLeido) {
        S.flags.diarioLeido = true;
        addScore(15, 'diario del operador anterior leído');
      }
      pr('Diario de Emilio Villanueva — Marzo 1985', 'big');
      pr('03:00 — La señal ha vuelto. La misma que en el 83. Me llama por mi nombre.', 'desc');
      pr('03:14 — He grabado la señal completa. Cinta en el estante C-85 del Archivo.', 'desc');
      pr('03:45 — La clave del cifrado es el nombre del receptor. Siempre el mismo.', 'warn');
      pr('03:58 — He descifrado el primer fragmento. Hay una nota cifrada en el Archivo.', 'warn');
      pr('04:10 — He seguido las instrucciones. No sé si fue un error.', 'bad');
      pr('[Última página arrancada. Emilio Villanueva dejó la estación ese mismo año.]', 'hint');
      blank();
      pr('La cinta del 85 y la nota cifrada están en el Archivo. La llave del Despacho…', 'hint');
      pr('Buscas con la vista el cuadro de Dalí sobre la mesilla.', 'hint');
      break;

    case 'nota_cifrada':
      if (!S.flags.notaVista) { S.flags.notaVista = true; addScore(10, 'nota cifrada encontrada'); }
      pr('TRANSCRIPCIÓN SEÑAL — 12/03/1985 — 03:14', 'big');
      pr('Texto cifrado Vigenère:', 'desc');
      pr('  FLMCZ ZCFXN LHVXB IOFQO TQZRV', 'warn');
      pr('  JYQZV GHVXN PCMXI FRGQZ OTZRG', 'warn');
      pr('[Nota al margen]: «CLAVE: TU PROPIO NOMBRE — E.V.»', 'hint');
      blank();
      if (S.inv.includes('manual_cifrado') && !S.flags.descifrado)
        pr('(Tienes el manual de cifrado. Escribe DESCIFRAR NOTA.)', 'hint');
      else if (!S.flags.descifrado)
        pr('Necesitas el manual de cifrado del Despacho para desencriptarlo.', 'hint');
      break;

    case 'manual_cifrado':
      pr('Manual de Cifrado OTAN — Edición 1979', 'big');
      pr('Cap. 7: Cifrado Vigenère — Para descifrar, aplica la clave carácter a carácter.', 'desc');
      pr('[Nota a mano]: «En señales clase Omega, la clave es el nombre del receptor.»', 'warn');
      blank();
      if (S.inv.includes('nota_cifrada') && !S.flags.descifrado)
        pr('(Tienes la nota. Escribe DESCIFRAR NOTA.)', 'hint');
      break;

    case 'registro_frecuencias':
      if (!S.flags.registroLeido) { S.flags.registroLeido = true; addScore(10, 'registro de frecuencias leído'); }
      pr('Registro de Frecuencias — Estación SR-14', 'big');
      pr('1983-08-21  03:14  3.7 kHz  ANOMALÍA CLASE OMEGA  Op: A. Ferrer', 'warn');
      pr('1985-03-12  03:14  3.7 kHz  ANOMALÍA CLASE OMEGA  Op: E. Villanueva', 'warn');
      pr('1986-11-03  03:14  3.7 kHz  ANOMALÍA CLASE OMEGA  Op: R. Castillo', 'warn');
      pr('1987-11-14  —      3.7 kHz  PENDIENTE             Op: T. Argüello', 'bad');
      blank();
      pr('La señal aparece exactamente cada 603 días. Hoy es el día.', 'warn');
      pr('Cada vez elige al operador de turno. Siempre en las mismas horas.', 'warn');
      break;

    case 'cinta_85':
      if (S.room !== 'cabina') { pr('Necesitas la grabadora de la Cabina de Aislamiento para reproducir la cinta.', 'bad'); return; }
      if (S.flags.power < 1) { pr('La grabadora no tiene alimentación. Restaura la energía primero.', 'bad'); return; }
      if (!S.flags.cintaReproducida) {
        S.flags.cintaReproducida = true;
        addScore(25, 'grabación de 1985 reproducida y señal descifrada');
      }
      _playCinta85();
      break;

    default:
      pr('No puedes leer eso de ese modo.', 'bad');
  }
}

function _playCinta85() {
  pr('La grabadora arranca con un chirrido. Estática. Luego silencio.', 'desc');
  pr('Y entonces: una voz. Emilio Villanueva, 1985.', 'desc');
  blank();
  pr('«…03:14. La señal está clara. Me llama por mi nombre…»', 'bbs');
  pr('«…he aplicado la clave Vigenère con mi nombre y…»', 'bbs');
  pr('«…el mensaje dice: SOMOS LO QUE QUEDA DE CUATRO MILLONES DE AÑOS…»', 'bbs-m');
  pr('«…NO TENÉIS TIEMPO. BUSCAMOS TRANSMISORES. AMPLIFICAD LA SEÑAL…»', 'bbs-m');
  pr('[estático — tres segundos]', 'dim');
  pr('«…si la destruís, volveremos con otro nombre. Si os unís a nosotros…»', 'bbs-m');
  pr('[clic — la cinta termina]', 'dim');
  blank();
  if (S.flags.signal < 2) {
    S.flags.signal = 2;
    pr('Ahora lo entiendes todo. La señal no es nueva.', 'ok');
    pr('Lleva décadas llegando. Y cada vez encuentra a alguien como tú.', 'warn');
    blank();
    pr('Puedes ir a la Azotea. La escotilla está desbloqueada si tienes potencia completa.', 'hint');
  }
}

// ─── Descifrar ────────────────────────────────────────────────────────────────
function doDescifrar(t) {
  if (!t || (!t.includes('nota') && !t.includes('mensaje') && !t.includes('senal') && !t.includes('papel'))) {
    pr('¿Descifrar qué? (DESCIFRAR NOTA)', 'bad'); return;
  }
  if (!S.inv.includes('nota_cifrada') && !S.flags.notaVista) { pr('No tienes la nota cifrada. Está en el Archivo.', 'bad'); return; }
  if (!S.inv.includes('manual_cifrado')) { pr('Necesitas el manual de cifrado. Está en el Despacho.', 'bad'); return; }
  if (S.flags.descifrado) { pr('Ya has descifrado este fragmento.', 'hint'); return; }
  blank();
  pr('Abres el manual, aplicas el nombre «TOMÁS» como clave Vigenère…', 'desc');
  pr('[procesando]', 'dim');
  blank();
  pr('El texto se aclara letra a letra:', 'ok');
  pr('«SOMOS LO QUE QUEDA DE CUATRO MILLONES DE AÑOS.»', 'end1');
  pr('«HEMOS LLEGADO A TODOS. TOMÁS. EMILIO. RAFAEL. ALBERTO.»', 'end1');
  pr('«BUSCAMOS TRANSMISORES. AMPLIFICAD.»', 'end2');
  blank();
  S.flags.descifrado = true;
  if (S.flags.signal < 1) S.flags.signal = 1;
  addScore(15, 'primer fragmento descifrado');
  pr('Fragmento descifrado. Pero hay más en la cinta del Archivo.', 'hint');
  pr('Lleva la cinta a la Cabina de Aislamiento (necesita energía).', 'hint');
}

// ─── Instalar ─────────────────────────────────────────────────────────────────
function doInstalar(t) {
  if (!t) { pr('¿Instalar qué?', 'bad'); return; }
  const tl = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

  // Chaleco → redirigir a ponerse
  const chaleco = itemByNoun(t, S.inv);
  if (chaleco && chaleco.it.wearable) { doWear(t); return; }

  // Fusibles en subestación
  if (tl.includes('fusible') && S.room === 'subestacion') {
    if (!S.inv.includes('linterna')) { pr('Imposible trabajar en la oscuridad. Necesitas la linterna.', 'bad'); return; }
    if (!S.inv.includes('fusibles')) { pr('No tienes fusibles de repuesto.', 'bad'); return; }
    if (!S.inv.includes('guantes_aislamiento')) { pr('Necesitas los guantes de aislamiento para manipular el circuito.', 'bad'); return; }
    if (S.flags.fusiblesInstalados) { pr('Los fusibles ya están instalados.', 'hint'); return; }
    S.flags.fusiblesInstalados = true;
    S.flags.power = 1;
    S.inv = S.inv.filter(x => x !== 'fusibles');
    ITEMS.fusibles.location = 'subestacion';
    blank();
    pr('Cambias el fusible fundido con cuidado. El panel de distribución cobra vida.', 'ok');
    pr('Las luces del edificio se encienden en ámbar. Sistema de emergencia activo.', 'ok');
    addScore(20, 'energía parcial restaurada');
    pr('La Cabina de Aislamiento y la grabadora ahora tienen alimentación.', 'hint');
    _advanceTurn();
    return;
  }

  // Transistor en sala de equipos
  if (tl.includes('transistor') && S.room === 'sala_equipos') {
    if (!S.inv.includes('transistor_repuesto')) { pr('No tienes el transistor de repuesto.', 'bad'); return; }
    if (S.flags.power < 1) { pr('Primero debes restaurar la energía de emergencia.', 'bad'); return; }
    if (S.flags.transistorInstalado) { pr('El transistor ya está instalado.', 'hint'); return; }
    S.flags.transistorInstalado = true;
    S.flags.power = 2;
    S.inv = S.inv.filter(x => x !== 'transistor_repuesto');
    ITEMS.transistor_repuesto.location = 'sala_equipos';
    blank();
    pr('Insertas el transistor 2N3055. El amplificador ruge con potencia completa.', 'ok');
    pr('Las luces pasan de ámbar a blanco frío. Toda la estación está operativa.', 'ok');
    addScore(15, 'potencia completa restaurada');
    pr('La escotilla de la azotea está ahora desbloqueada.', 'hint');
    _advanceTurn();
    return;
  }

  if (tl.includes('fusible') && S.room !== 'subestacion')
    { pr('Los fusibles solo se pueden instalar en la Subestación Eléctrica.', 'bad'); return; }
  if (tl.includes('transistor') && S.room !== 'sala_equipos')
    { pr('El transistor va en el amplificador de la Sala de Equipos.', 'bad'); return; }

  pr('No puedes instalar eso aquí.', 'bad');
}

// ─── Usar (tarjeta, llave inglesa) ────────────────────────────────────────────
function doUsar(t) {
  if (!t) { pr('¿Usar qué?', 'bad'); return; }
  const tl = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

  if (tl.includes('tarjeta') && S.room === 'pasillo') {
    if (!S.inv.includes('tarjeta_sotano')) { pr('No tienes la tarjeta de acceso.', 'bad'); return; }
    if (S.flags.sotanoAbierto) { pr('La trampilla ya está abierta.', 'hint'); return; }
    S.flags.sotanoAbierto = true;
    pr('Pasas la tarjeta por el lector. La trampilla del sótano hace clic.', 'ok');
    addScore(5, 'sótano accesible');
    _advanceTurn();
    return;
  }
  if (tl.includes('tarjeta') && S.room !== 'pasillo') {
    pr('El lector de tarjeta está en el Pasillo Central.', 'bad'); return;
  }
  if ((tl.includes('llave inglesa') || tl.includes('llave')) && S.room === 'azotea') {
    doFinalDestruir(); return;
  }
  pr('No puedes usar eso aquí de ese modo.', 'bad');
}

// ─── Abrir ────────────────────────────────────────────────────────────────────
function doAbrir(t) {
  if (!t) { pr('¿Abrir qué?', 'bad'); return; }
  const tl = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

  if ((tl.includes('despacho') || tl.includes('puerta')) && S.room === 'sala_equipos') {
    if (S.flags.despachoAbierto) { pr('El despacho ya está abierto.', 'hint'); return; }
    if (!S.inv.includes('llave_marco')) { pr('La puerta está cerrada con llave. Necesitas la llave pequeña.', 'bad'); return; }
    S.flags.despachoAbierto = true;
    pr('Introduces la llave. La puerta del Despacho se abre.', 'ok');
    _advanceTurn();
    return;
  }
  if ((tl.includes('taquilla') || tl.includes('armario')) && S.room === 'vestibulo') {
    pr('La taquilla está entreabierta. Dentro hay un chaleco térmico naranja.', 'desc');
    return;
  }
  pr('No puedes abrir eso aquí.', 'bad');
}

// ─── Reproducir ───────────────────────────────────────────────────────────────
function doReproducir(t) {
  if (!t || (!t.includes('cinta') && !t.includes('grabacion') && !t.includes('grabación'))) {
    pr('¿Reproducir qué? (REPRODUCIR CINTA)', 'bad'); return;
  }
  if (!S.inv.includes('cinta_85')) { pr('No tienes la cinta magnética de 1985. Está en el Archivo.', 'bad'); return; }
  if (S.room !== 'cabina') { pr('Necesitas la grabadora de la Cabina de Aislamiento.', 'bad'); return; }
  if (S.flags.power < 1) { pr('La grabadora no tiene alimentación.', 'bad'); return; }
  _readItem('cinta_85');
}

// ─── Finales ──────────────────────────────────────────────────────────────────
function _finalPrompt() {
  blank();
  pr('══════════════════════════════════════════════', 'sep');
  pr('Ante la antena tienes cuatro opciones:', 'big');
  pr('  SILENCIO    — Desconectar la antena. La señal cesa.', 'ok');
  pr('  AMPLIFICAR  — Retransmitir amplificada hacia la Tierra.', 'warn');
  pr('  DESTRUIR    — Desmantelar físicamente el sistema.', 'bad');
  pr('  IGNORAR     — Bajar y no hacer nada. Esperar el amanecer.', 'hint');
  pr('══════════════════════════════════════════════', 'sep');
}

function _checkFinal() {
  if (S.flags.finalStarted) { pr('Ya has tomado tu decisión.', 'hint'); return false; }
  if (S.room !== 'azotea') { pr('Solo puedes hacer eso en la azotea.', 'bad'); return false; }
  if (S.flags.signal < 2) { pr('Primero descifra la señal completa. Reproduce la cinta del 85 en la Cabina.', 'bad'); return false; }
  return true;
}

function doFinalSilencio() {
  if (!_checkFinal()) return;
  S.flags.finalStarted = true;
  _autoSave();
  blank();
  pr('FINAL I — EL SILENCIO', 'end1');
  pr('═════════════════════', 'sep');
  pr('Pulsas SILENCIO.', 'desc');
  blank();
  pr('La antena se va apagando dipolo a dipolo, como una voz que se queda sin aliento.', 'desc');
  pr('A 3.7 kHz, la banda queda limpia por primera vez en décadas.', 'desc');
  blank();
  pr('Por un instante — quizás solo lo imaginas — escuchas cuatro millones de años de paciencia.', 'warn');
  pr('Y luego ya no escuchas nada.', 'desc');
  blank();
  pr('La tormenta amaina al amanecer. El helicóptero llega a las 09:00.', 'desc');
  pr('En el informe escribes: «Interferencia resuelta. Sin incidentes.»', 'desc');
  blank();
  pr('Tu nombre desaparece de la señal.', 'end1');
  pr('Ya tiene otro nombre en mente.', 'end1');
  _finalEnd(50);
}

function doFinalAmplificar() {
  if (!_checkFinal()) return;
  S.flags.finalStarted = true;
  _autoSave();
  blank();
  pr('FINAL II — LA GRAN VOZ', 'end2');
  pr('══════════════════════', 'sep');
  pr('Pulsas AMPLIFICAR.', 'desc');
  blank();
  pr('El amplificador, recién reparado, eleva la señal ×1.000.', 'desc');
  pr('La antena rota lentamente hacia el cenit y emite un haz coherente.', 'desc');
  blank();
  pr('Ocho minutos a la velocidad de la luz.', 'warn');
  pr('Ocho mil millones de receptores.', 'warn');
  blank();
  pr('No estás seguro de lo que acabas de hacer.', 'desc');
  pr('Pero la señal sí lo está.', 'end2');
  blank();
  pr('Durante los ocho minutos que faltan, el espectrómetro muestra:', 'desc');
  pr('«GRACIAS, TOMÁS.»', 'end2');
  _finalEnd(50);
}

function doFinalDestruir() {
  if (!_checkFinal()) return;
  if (!S.inv.includes('llave_inglesa')) { pr('Necesitas la llave inglesa del Taller para desmantelar la antena.', 'bad'); return; }
  S.flags.finalStarted = true;
  _autoSave();
  blank();
  pr('FINAL III — EL ÚLTIMO OPERADOR', 'end3');
  pr('══════════════════════════════', 'sep');
  pr('Empuñas la llave inglesa y atacas los pernos del mástil.', 'desc');
  blank();
  pr('La tormenta aúlla como si protestara. Cada perno exige un esfuerzo brutal en el frío.', 'desc');
  pr('El mástil cruje, se inclina, cae hacia el norte con un estruendo sordo en la nieve.', 'ok');
  blank();
  pr('En la consola, la señal de 3.7 kHz desaparece.', 'desc');
  pr('La pantalla muestra: «NO SIGNAL».', 'desc');
  blank();
  pr('La señal deja de usar tu nombre.', 'end3');
  pr('Empieza a usar el del técnico que vendrá a reparar la antena.', 'warn');
  _finalEnd(50);
}

function doFinalIgnorar() {
  if (S.flags.finalStarted) { pr('Ya has tomado tu decisión.', 'hint'); return; }
  if (!S.flags.azoteaScore || S.flags.signal < 2) { pr('Primero sube a la azotea y descifra la señal completa.', 'bad'); return; }
  S.flags.finalStarted = true;
  _autoSave();
  blank();
  pr('FINAL IV — LA ESPERA', 'end1');
  pr('════════════════════', 'sep');
  pr('No haces nada.', 'desc');
  pr('Bajas a la Torre de Control y te sientas ante la consola a esperar el amanecer.', 'desc');
  blank();
  pr('La señal sigue activa a 3.7 kHz. Tu nombre, en bucle.', 'warn');
  pr('Tomás. Tomás. Tomás.', 'glitch');
  blank();
  pr('Cuando el helicóptero de relevo aterriza, estás sentado frente a la consola.', 'desc');
  pr('Los ojos abiertos. La mirada fija en la frecuencia.', 'desc');
  pr('La señal ya usa el nombre del piloto.', 'warn');
  blank();
  pr('En tu cuaderno, escrito con una letra que no es la tuya:', 'desc');
  pr('«No importa lo que hagas. Solo importa que escuches.»', 'end2');
  _finalEnd(50);
}

function _finalEnd(pts) {
  addScore(pts, 'final completado');
  blank();
  pr('══ SEÑAL 432 — FIN ══', 'big');
  pr(`Puntuación final: ${S.score} / 200`, 'ok');
  blank();
  pr('Hay cuatro finales. Escribe CARGAR para volver al último guardado.', 'hint');
  pr('Escribe CREDITOS para ver los créditos del juego.', 'hint');
}

// ─── Inventario / Puntuación / Ayuda / Créditos ───────────────────────────────
function doInventario() {
  if (!S.inv.length && !S.worn.length) { pr('No llevas nada.', 'hint'); return; }
  pr('Llevas:', 'ok');
  S.inv.forEach(id => pr(`  ${ITEMS[id].name}`, 'desc'));
  S.worn.forEach(id => pr(`  ${ITEMS[id].name} <span class="dim">(puesto)</span>`, 'desc'));
}

function doScore() {
  pr(`Puntuación: ${S.score} / 200`, 'ok');
  pr(`Turnos: ${S.turns}`, 'dim');
  pr(`Salas visitadas: ${S.visited.size} / ${Object.keys(ROOMS).length}`, 'dim');
}

function doAyuda() {
  blank();
  pr('══ SEÑAL 432 — AYUDA ══', 'big');
  pr('Movimiento: NORTE · SUR · ESTE · OESTE · ARRIBA · ABAJO', 'ok');
  pr('Objetos:    COGER · DEJAR · PONERSE · EXAMINAR · LEER', 'desc');
  pr('Acciones:   USAR · ABRIR · INSTALAR · DESCIFRAR NOTA', 'desc');
  pr('Cinta:      REPRODUCIR CINTA (en la Cabina con energía)', 'desc');
  pr('Info:       INVENTARIO · PUNTUACIÓN · MIRAR · AYUDA', 'desc');
  pr('Guardado:   GUARDAR 1·2·3 · CARGAR 1·2·3 · SLOTS', 'desc');
  pr('Finales:    SILENCIO · AMPLIFICAR · DESTRUIR · IGNORAR', 'warn');
  blank();
  pr('Pista: empieza por el Dormitorio. La respuesta lleva décadas esperando.', 'hint');
}

function doCreditos() {
  blank();
  pr('══ SEÑAL 432 ══', 'big');
  pr('Aventura de texto original · VampireBBS 2026', 'ok');
  blank();
  pr('Una señal que lleva cuatro millones de años llegando.', 'desc');
  pr('Un nombre que siempre sabe a quién llamar.', 'desc');
  blank();
  pr('Pirineos centrales · Estación SR-14 · 14 de noviembre de 1987', 'dim');
  pr('~ 45-60 min primer intento · 4 finales · 200 puntos', 'dim');
  pr('16 salas · 14 objetos · Motor VampireBBS', 'dim');
  blank();
  pr('Inspirado en los operadores de radio reales de los Pirineos.', 'dim');
  pr('Los ciclos de 603 días son matemáticamente precisos.', 'hint');
}

// ─── Guardado / Carga ─────────────────────────────────────────────────────────
function _slotKey(n) {
  if (n === 'auto') return 'senal432_auto';
  const s = parseInt(n) || 1;
  return 'senal432_s' + Math.min(3, Math.max(1, s));
}

function _buildSave() {
  const itemLocs = {};
  for (const [k, v] of Object.entries(ITEMS)) itemLocs[k] = v.location;
  return {
    room: S.room, inv: [...S.inv], worn: [...S.worn],
    flags: {...S.flags}, visited: [...S.visited],
    score: S.score, turns: S.turns,
    history: S.history, histIdx: S.histIdx,
    itemLocs, savedAt: Date.now(),
  };
}

function _applySave(data) {
  S.room = data.room;
  S.inv  = data.inv  || [];
  S.worn = data.worn || [];
  S.flags = {
    power:0, signal:0, sotanoAbierto:false, despachoAbierto:false, finalStarted:false,
    diarioLeido:false, llaveMarcoVista:false, notaVista:false, registroLeido:false,
    descifrado:false, fusiblesInstalados:false, cintaReproducida:false,
    transistorInstalado:false, azoteaScore:false, consolaVista:false, transistorVisto:false,
    ...(data.flags || {}),
  };
  S.visited = new Set(data.visited || []);
  S.score   = data.score  || 0;
  S.turns   = data.turns  || 0;
  S.history = data.history || [];
  S.histIdx = data.histIdx || 0;
  if (data.itemLocs) for (const [k, v] of Object.entries(data.itemLocs)) if (ITEMS[k]) ITEMS[k].location = v;
  HIDDEN_ITEMS.clear();
  if (ITEMS.llave_marco.location === 'hidden_dormitorio') HIDDEN_ITEMS.add('llave_marco');
  updateScore();
}

function doGuardar(slot) {
  const n = parseInt(slot) || 1;
  if (n < 1 || n > 3) { pr('Usa GUARDAR 1, GUARDAR 2 o GUARDAR 3.', 'bad'); return; }
  try {
    localStorage.setItem(_slotKey(n), JSON.stringify(_buildSave()));
    const d = new Date();
    pr(`Guardado en ranura ${n}. [${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}]`, 'ok');
  } catch(e) { pr('Error al guardar (localStorage no disponible).', 'bad'); }
}

function doCargar(slot) {
  const n = parseInt(slot);
  const key = (n >= 1 && n <= 3) ? _slotKey(n) : (slot === 'auto' ? 'senal432_auto' : _slotKey(1));
  try {
    const raw = localStorage.getItem(key);
    if (!raw) { pr(`No hay partida guardada en ranura ${slot || 1}.`, 'bad'); return; }
    _applySave(JSON.parse(raw));
    pr('Partida cargada.', 'ok');
    doLook();
  } catch(e) { pr('Error al cargar la partida.', 'bad'); }
}

function doSlots() {
  pr('═══ RANURAS DE GUARDADO ═══', 'big');
  for (let i = 1; i <= 3; i++) {
    try {
      const raw = localStorage.getItem(_slotKey(i));
      if (!raw) { pr(`  Ranura ${i}: [vacía]`, 'dim'); continue; }
      const d = JSON.parse(raw);
      const date = new Date(d.savedAt);
      pr(`  Ranura ${i}: ${ROOMS[d.room]?.name || d.room} · ${d.score} pts · turno ${d.turns} · ${date.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}`, 'ok');
    } catch { pr(`  Ranura ${i}: [error]`, 'bad'); }
  }
}

function _autoSave() {
  try { localStorage.setItem('senal432_auto', JSON.stringify(_buildSave())); } catch(e) {}
}

// ─── Parser ───────────────────────────────────────────────────────────────────
function exec(raw) {
  const line = raw.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  if (!line) return;
  S.history.push(raw.trim());
  S.histIdx = S.history.length;
  pr('> ' + raw.trim(), 'cmd');

  const sp = line.indexOf(' ');
  const verb = sp < 0 ? line : line.slice(0, sp);
  const t    = sp < 0 ? '' : line.slice(sp + 1).trim();

  switch(verb) {
    // Movimiento
    case 'norte': case 'n': return doGo('norte');
    case 'sur':   case 's': return doGo('sur');
    case 'este':  case 'e': return doGo('este');
    case 'oeste': case 'o': return doGo('oeste');
    case 'arriba': case 'sube': case 'subir': case 'up': case 'u': return doGo('arriba');
    case 'abajo':  case 'baja':  case 'bajar': case 'down': case 'd': return doGo('abajo');
    case 'ir': case 've': return doGo(t);

    // Mirar
    case 'mirar': case 'mira': case 'look': case 'l': case 'm': return doLook();

    // Objetos
    case 'coger': case 'coge': case 'tomar': case 'toma': case 'agarrar': case 'recoger': return doTake(t);
    case 'dejar': case 'deja': case 'soltar': case 'suelta': return doDrop(t);
    case 'ponerse': case 'ponte': case 'vestir': case 'vestirse': return doWear(t);

    // Examinar / Leer
    case 'examinar': case 'examina': case 'x': case 'ex': case 'inspeccionar': return doExamine(t);
    case 'leer': case 'lee': return doRead(t);

    // Interacciones
    case 'usar': case 'usa': case 'utilizar': return doUsar(t);
    case 'abrir': case 'abre': return doAbrir(t);
    case 'instalar': case 'instala': case 'insertar': case 'inserta': case 'colocar': case 'meter': case 'poner': return doInstalar(t);
    case 'descifrar': case 'descifra': case 'decodificar': return doDescifrar(t);
    case 'reproducir': case 'reproduce': case 'escuchar': case 'play': return doReproducir(t);

    // Info
    case 'inventario': case 'inv': case 'i': return doInventario();
    case 'puntuacion': case 'puntuación': case 'score': return doScore();
    case 'ayuda': case 'help': case 'h': return doAyuda();
    case 'creditos': case 'credito': return doCreditos();

    // Guardado
    case 'guardar': return doGuardar(t);
    case 'cargar': {
      if (t && (t.includes('celda') || t.includes('generador') || t.includes('fusible') || t.includes('transistor')))
        return doInstalar(t);
      return doCargar(t);
    }
    case 'slots': case 'partidas': return doSlots();

    // Finales
    case 'silencio': return doFinalSilencio();
    case 'amplificar': case 'amplifica': return doFinalAmplificar();
    case 'destruir': case 'destruye': case 'desmantelar': return doFinalDestruir();
    case 'ignorar': case 'ignora': return doFinalIgnorar();

    default:
      pr(`No entiendo «${raw.trim()}». Escribe AYUDA para ver los comandos.`, 'bad');
  }
}

// ─── Input handler ────────────────────────────────────────────────────────────
inp.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (S.histIdx > 0) { S.histIdx--; inp.value = S.history[S.histIdx] || ''; }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    S.histIdx = Math.min(S.histIdx + 1, S.history.length);
    inp.value = S.histIdx < S.history.length ? S.history[S.histIdx] : '';
    return;
  }
  if (e.key !== 'Enter') return;
  const v = inp.value.trim();
  inp.value = '';
  if (printBusy) {
    flushQueue();
    if (!bootMode && v) { S.history.push(v); S.histIdx = S.history.length; exec(v); }
    return;
  }
  if (!bootMode && v) exec(v);
});

document.addEventListener('keydown', e => {
  if (e.target === inp || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.length === 1) inp.focus();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
function boot() {
  bootMode = true;

  pr('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓', 'dim');
  pr('      VAMPIREBBS · SISTEMA DE AVENTURAS     ', 'bbs-m');
  pr('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓', 'dim');
  blank();

  setTimeout(() => {
    pr('S  E  Ñ  A  L   4  3  2', 'big');
    pr('Una aventura de texto original', 'dim');
    blank();

    setTimeout(() => {
      pr('Pirineos centrales · Estación de Relevo SR-14 · Noviembre de 1987', 'bbs-d');
      blank();
      pr('Son las 01:12 de la madrugada. Eres Tomás Argüello, operador de radio de turno.', 'desc');
      pr('Llevas cinco horas solo en esta estación. La tormenta de nieve lleva dos días arreciando.', 'desc');
      blank();
      pr('Hace veinte minutos, el espectrómetro captó una frecuencia anómala: 3.7 kHz.', 'warn');
      pr('No está en ningún catálogo. El patrón es fractal, base 12.', 'warn');
      pr('Y repite algo. Sin pausa. Sin variación.', 'warn');
      pr('Tu nombre.', 'bad');
      blank();

      setTimeout(() => {
        pr('Escribe AYUDA para ver los comandos. Escribe MIRAR para observar la sala.', 'hint');
        blank();

        setTimeout(() => {
          bootMode = false;
          S.visited.add('torre');
          doLook();
          inp.focus();
        }, 600);
      }, 1000);
    }, 400);
  }, 200);
}

boot();
