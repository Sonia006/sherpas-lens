import './index.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// MODO MOCK: true = datos de prueba, NO llama al backend ni gasta tokens. Pon false para usar la IA real.
const MOCK = true;
// Idioma por defecto la primera vez (luego se recuerda la elección del botón ES/EN)
const DEFAULT_LANG = 'en';

const CASOS = {
  'timothy-melanie-weah': 'Timothy y Melanie Weah',
  'michael-carter': 'Michael Carter',
  'daniel-emily-johnson': 'Daniel y Emily Johnson',
  'samantha-lewis': 'Samantha Lewis'
};
// Casos de pareja: cada uno elige cómo se siente y el plan genera UN primer paso común bueno para ambos
const COUPLES = { 'timothy-melanie-weah': ['Timothy', 'Melanie'], 'daniel-emily-johnson': ['Daniel', 'Emily'] };

const saved = (() => { try { return localStorage.getItem('lang'); } catch { return null; } })();
// screen: 0 inicio · 1 cargando · 2 flashcards · 3 plan interactivo · -1 error
// m[i]: ánimo de cada persona (1 = muy agobiado ... 5 = muy confiado). Posición del selector = m - 1.
const S = { lang: ['es', 'en'].includes(saved) ? saved : DEFAULT_LANG, screen: 0, caso: 'michael-carter', persona: '', m: [3, 3], tiempo: 'corto', data: null, i: 0, flip: false, dir: '', vals: {}, msgs: [], voz: false, wait: false, err: '', opts: false };
const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
const isCouple = () => !!COUPLES[S.caso];
const eff = () => isCouple() ? Math.min(S.m[0], S.m[1]) : S.m[0];   // el tono se adapta a quien se siente peor
const pick = (es, en) => S.lang === 'en' ? en : es;

// ───── Textos de la interfaz (es / en)
const T = {
  es: {
    stepOf: (n, t) => `${t} - Paso ${n} de 3`, dx: 'Diagnóstico', plan: 'Plan interactivo', back: 'Volver',
    intro: 'Dinos cómo te sientes hoy con tus finanzas para personalizar tu viaje:',
    introCouple: 'Cada uno, decid cómo os sentís hoy con vuestras finanzas. Buscaremos un primer paso bueno para los dos:',
    moods: ['Preocupado', 'Tranquilo', 'Confiado'], moodAria: 'Cómo te sientes hoy', pos: i => `Posición ${i} de 5`,
    pace: 'Elige tu ritmo:', paceAria: 'Ritmo', direct: 'Recorrido directo y sencillo', full: 'Todo el plan completo',
    start: 'Comenzar recorrido ➔', tag: 'fácil y rápido', demo: 'Opciones de la demo', family: 'Familia',
    who: '¿Quién eres? (opcional)', whoPh: 'Por ejemplo, Melanie',
    loading: 'Preparando tu recorrido', reading: 'Estamos leyendo tu plan.',
    errTitle: 'No hemos podido cargar tu plan', errBody: a => `Comprueba que el backend está encendido en ${a} y vuelve a intentarlo.`,
    detail: 'Detalle', retry: 'Reintentar', home: 'Volver al inicio',
    goal: 'META:', saved: 'Mostramos una versión guardada de tu resumen.',
    stackAria: 'Tarjetas. Desliza hacia arriba o abajo para cambiar', prevCard: 'Tarjeta anterior', nextCard: 'Tarjeta siguiente', flipAria: 'Pulsa para girar',
    hint: 'Pulsa para girar y ver más info', goalType: 'Objetivo', stepLabel: 'PASO 1', stepBoth: 'PASO 1 · PARA LOS DOS',
    minutes: n => `Te llevará unos ${n} minutos.`, deeper: 'Para ir más a fondo',
    nextStep: 'Siguiente paso', toViz: 'Pasar a visualizarlo ↓',
    wellbeing: 'Bienestar financiero', pathTo: 'Camino hacia:', chartAria: 'Bienestar financiero de hoy a tu meta, seguir igual frente a hacer cambios',
    legStay: 'Si sigues igual', legChange: 'Con tus cambios', yAxis: 'Bienestar (0-100)', today: 'Hoy',
    moreInfo: 'Para más información:', book: 'Programar cita con asesor', nextHead: 'NEXT STEP',
    activate: 'Activar plan de ahorro →', pdf: 'Descargar informe completo (PDF)',
    assistant: 'Asistente', openAssistant: 'Hablar con la asistente', chatTitle: 'Pregunta sobre tu plan', voiceAria: 'Leer respuestas en voz alta', close: 'Cerrar',
    chatPh: 'Escribe tu duda...', mic: 'Hablar', send: 'Enviar',
    welcome: 'Pregúntame lo que quieras sobre tu plan. También puedes hablarme con el micrófono.', thinking: 'Pensando…', thinkingAria: 'La asistente está pensando',
    mockReply: 'Respuesta de prueba: aquí contestaría la IA, sin gastar tokens.', connErr: 'No consigo conectar ahora mismo. Inténtalo de nuevo en un momento.',
    talkAdvisor: 'Hablar con un asesor',
    ctxCard: (l, f) => `[Contexto de la app: el usuario está viendo la tarjeta "${l}: ${f}"] `, ctxSim: v => `[Contexto de la app: el usuario está en el simulador con ${v}] `,
    citaTitle: 'Programar cita con el asesor', citaDesc: 'Elige día y hora, y añádelo a tu calendario o envía un correo al asesor.',
    date: 'Día', time: 'Hora', gcal: 'Añadir a Google Calendar', ics: 'Descargar para Apple / Outlook (.ics)', mailBtn: 'Enviar correo al asesor',
    copyMail: 'Copiar correo', copied: 'Correo copiado ✓', pickDate: 'Elige un día primero.', mailHint: 'Si no se abre tu correo, copia la dirección del asesor y escríbele desde tu app de correo.',
    pref: 'Me vendría bien:', langAria: 'Idioma', speech: 'es-ES', scrub: 'Desliza sobre la gráfica para ver cada año'
  },
  en: {
    stepOf: (n, t) => `${t} - Step ${n} of 3`, dx: 'Diagnosis', plan: 'Interactive plan', back: 'Back',
    intro: 'Tell us how you feel about your finances today so we can personalise your journey:',
    introCouple: 'Each of you, tell us how you feel about your finances today. We\'ll find a first step that works for both:',
    moods: ['Worried', 'Calm', 'Confident'], moodAria: 'How you feel today', pos: i => `Position ${i} of 5`,
    pace: 'Choose your pace:', paceAria: 'Pace', direct: 'Quick and simple journey', full: 'The complete plan',
    start: 'Start the journey ➔', tag: 'quick and easy', demo: 'Demo options', family: 'Family',
    who: 'Who are you? (optional)', whoPh: 'For example, Melanie',
    loading: 'Preparing your journey', reading: 'We are reading your plan.',
    errTitle: 'We couldn\'t load your plan', errBody: a => `Check that the backend is running at ${a} and try again.`,
    detail: 'Details', retry: 'Try again', home: 'Back to start',
    goal: 'GOAL:', saved: 'We are showing a saved version of your summary.',
    stackAria: 'Cards. Swipe up or down to change', prevCard: 'Previous card', nextCard: 'Next card', flipAria: 'Tap to flip',
    hint: 'Tap to flip and see more', goalType: 'Goal', stepLabel: 'STEP 1', stepBoth: 'STEP 1 · FOR BOTH OF YOU',
    minutes: n => `It will take about ${n} minutes.`, deeper: 'Go deeper',
    nextStep: 'Next step', toViz: 'See it on the chart ↓',
    wellbeing: 'Financial wellbeing', pathTo: 'Path to:', chartAria: 'Financial wellbeing from today to your goal, staying the same versus making changes',
    legStay: 'If nothing changes', legChange: 'With your changes', yAxis: 'Wellbeing (0-100)', today: 'Today',
    moreInfo: 'For more information:', book: 'Book a call with an advisor', nextHead: 'NEXT STEP',
    activate: 'Start my savings plan →', pdf: 'Download full report (PDF)',
    assistant: 'Assistant', openAssistant: 'Talk to the assistant', chatTitle: 'Ask about your plan', voiceAria: 'Read answers aloud', close: 'Close',
    chatPh: 'Type your question...', mic: 'Speak', send: 'Send',
    welcome: 'Ask me anything about your plan. You can also talk to me with the microphone.', thinking: 'Thinking…', thinkingAria: 'The assistant is thinking',
    mockReply: 'Test reply: the AI would answer here, without spending tokens.', connErr: 'I can\'t connect right now. Please try again in a moment.',
    talkAdvisor: 'Talk to an advisor',
    ctxCard: (l, f) => `[App context: the user is looking at the card "${l}: ${f}"] `, ctxSim: v => `[App context: the user is in the simulator with ${v}] `,
    citaTitle: 'Book a call with the advisor', citaDesc: 'Pick a day and time, then add it to your calendar or email the advisor.',
    date: 'Day', time: 'Time', gcal: 'Add to Google Calendar', ics: 'Download for Apple / Outlook (.ics)', mailBtn: 'Email the advisor',
    copyMail: 'Copy email', copied: 'Email copied ✓', pickDate: 'Pick a day first.', mailHint: 'If your email app doesn\'t open, copy the advisor\'s address and write from your email app.',
    pref: 'My preferred time:', langAria: 'Language', speech: 'en-US', scrub: 'Slide across the chart to see each year'
  }
};
const t = (k, ...a) => { const v = T[S.lang][k]; return typeof v === 'function' ? v(...a) : v; };

// ───── Iconos
const svg = (p, w = 24, extra = '') => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
const I = {
  back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', 30),
  up: svg('<path d="M6 15l6-6 6 6"/>', 30), dn: svg('<path d="M6 9l6 6 6-6"/>', 30),
  bolt: svg('<path d="M13 3L5 14h6l-1 7 8-11h-6z" fill="currentColor"/>', 32),
  lines: svg('<path d="M5 7h14M8 12h11M5 17h14"/>', 32),
  hand: svg('<path d="M9 11V5a1.5 1.5 0 0 1 3 0v5m0-1a1.5 1.5 0 0 1 3 0v2m0-1a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L9 15"/>', 22),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', 16),
  dl: svg('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', 16),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>', 22),
  target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>', 26),
  shield: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 8v5M12 16v.5"/>', 26),
  flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', 24),
  flagS: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', 18),
  chart: svg('<path d="M4 19V5M4 19h16M8 15l4-5 3 3 5-6"/>', 22),
  coin: svg('<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2-.5-2.5-1.5M12 6.5V8m0 8v1.5"/>', 20),
  card: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>', 20),
  cut: svg('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5L20 18M8 16.5L20 6"/>', 20),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 20),
  bot: `<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="14" r="5.5"/><path d="M6 29c1-6 5-8 10-8s9 2 10 8"/><path d="M7.5 14a8.5 8.5 0 0 1 17 0"/><rect x="5" y="13" width="3" height="6" rx="1.5"/><rect x="24" y="13" width="3" height="6" rx="1.5"/><path d="M25.5 19c0 3-3 4-6 4"/></svg>`
};
const KI = { goal: I.target, risk: I.shield, step: I.flag };   // icono por tipo de tarjeta
const LS = { ahorro_mensual: [I.coin, '#2f9a8a'], pago_deuda_extra: [I.card, '#f08c3c'], gasto_menos: [I.cut, '#5b6ee1'], anos_extra_trabajando: [I.clock, '#8b5cf6'] };
const face = k => `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><circle cx="32" cy="32" r="26"/><circle cx="23" cy="27" r="2.6" fill="currentColor" stroke="none"/><circle cx="41" cy="27" r="2.6" fill="currentColor" stroke="none"/>${k === 'sad' ? '<path d="M22 44q10-9 20 0"/>' : k === 'neu' ? '<path d="M23 42h18"/>' : '<path d="M21 38q11 11 22 0"/>'}</svg>`;

// ───── Datos de prueba (solo se usan con MOCK = true). Cada familia tiene su propia meta y sus propias palancas.
// [etiqueta es/en, unidad (o es/en), min, max, paso, puntos por unidad]
const LEVERS = {
  ahorro_mensual: [['Ahorro mensual extra', 'Extra monthly savings'], '$', 0, 1000, 50, 0.01],
  pago_deuda_extra: [['Pago extra de deuda al mes', 'Extra monthly debt payment'], '$', 0, 1000, 50, 0.008],
  gasto_menos: [['Gasto mensual que recortas', 'Monthly spending you cut'], '$', 0, 500, 25, 0.012],
  anos_extra_trabajando: [['Años extra trabajando', 'Extra years working'], ['años', 'years'], 0, 5, 1, 2]
};
const MC = {
  'michael-carter': { hitos: [[2028, 'Liquidar la tarjeta', 'Pay off the credit card'], [2040, 'Jubilarme a los 62', 'Retire at 62']], pal: ['pago_deuda_extra', 'gasto_menos'], paso: ['Automatiza el pago extra de tu deuda', 'Automate your extra debt payment'] },
  'timothy-melanie-weah': { hitos: [[2029, 'Entrada de la casa', 'House down payment'], [2042, 'Universidad de los hijos', 'The kids\' college']], pal: ['ahorro_mensual', 'gasto_menos'], paso: ['Abrid una cuenta de ahorro conjunta', 'Open a joint savings account'] },
  'daniel-emily-johnson': { hitos: [[2030, 'Fondo de emergencia', 'Emergency fund'], [2045, 'Jubilarnos a los 65', 'Retire at 65']], pal: ['ahorro_mensual', 'anos_extra_trabajando'], paso: ['Subid la aportación a vuestro plan', 'Raise your plan contribution'] },
  'samantha-lewis': { hitos: [[2027, 'Matrícula de agosto', 'August tuition'], [2038, 'Primera vivienda', 'First home']], pal: ['ahorro_mensual', 'pago_deuda_extra'], paso: ['Separa ahora el dinero de la matrícula', 'Set aside the tuition money now'] }
};
const mockResult = () => {
  const c = MC[S.caso], mood = eff(), n = S.tiempo === 'completo' ? 5 : mood <= 2 ? 2 : 3, L = S.lang === 'en' ? 1 : 0;
  const goalT = pick('Objetivo', 'Goal'), vulT = pick('Vulnerabilidad', 'Vulnerability');
  return {
    frase_inicial: mood <= 2 ? pick('Vamos paso a paso, sin prisa.', 'Let\'s take it step by step, no rush.') : mood === 3 ? pick('Tienes una base sólida, veamos qué mejorar.', 'You have a solid base, let\'s see what to improve.') : pick('Vas muy bien, afinemos los detalles.', 'You\'re doing great, let\'s fine-tune the details.'),
    tarjetas: [
      { tipo: goalT, frente: pick('Crear un colchón de emergencia', 'Build an emergency cushion'), reverso: pick('Tener 3 meses de gastos guardados te protege de imprevistos.', 'Having 3 months of expenses saved protects you from surprises.'), detalle: pick('Texto largo de prueba para el desplegable "Para ir más a fondo".', 'Long test text for the "Go deeper" dropdown.') },
      { tipo: vulT, frente: pick('Dependes de un solo ingreso', 'You depend on a single income'), reverso: pick('Si ese ingreso falla, el plan entero se resiente.', 'If that income fails, the whole plan suffers.'), detalle: '' },
      { tipo: goalT, frente: pick('Aumentar el ahorro para tu meta', 'Increase savings for your goal'), reverso: pick('Pequeñas aportaciones hoy pesan mucho al final.', 'Small contributions today add up a lot in the end.'), detalle: '' },
      { tipo: vulT, frente: pick('Poca protección para tu familia', 'Little protection for your family'), reverso: pick('Revisa tu seguro de vida y de invalidez.', 'Review your life and disability insurance.'), detalle: '' },
      { tipo: goalT, frente: pick('Diversificar tus inversiones', 'Diversify your investments'), reverso: pick('No pongas todo en un mismo sitio.', 'Don\'t put everything in one place.'), detalle: '' }
    ].slice(0, n),
    mapa: {
      score_base: 60, hitos: c.hitos.map(([anio, es, en], k) => ({ id: 'h' + k, anio, titulo: L ? en : es })),
      palancas: c.pal.map(id => { const l = LEVERS[id]; return { id, etiqueta: l[0][L], unidad: Array.isArray(l[1]) ? l[1][L] : l[1], min: l[2], max: l[3], paso: l[4], puntos_por_unidad: l[5] }; }),
      aviso: pick('Simulador ilustrativo (datos de prueba).', 'Illustrative simulator (test data).')
    },
    siguiente_paso: { titulo: c.paso[L], razon: pick('Es lo que más acerca tu meta con el menor esfuerzo hoy.', 'It brings your goal closest with the least effort today.'), minutos: 15,
      pasos: [pick('Abre la app de tu banco', 'Open your bank app'), pick('Programa una transferencia mensual', 'Schedule a monthly transfer')],
      acciones: { calendario_url: 'https://calendar.google.com', asesor_url: 'mailto:asesor@example.com?subject=' + encodeURIComponent(pick('Quiero hablar de mi plan', 'I\'d like to talk about my plan')) + '&body=' + encodeURIComponent(pick('Hola, he visto mi plan y quiero ayuda con este paso: ', 'Hi, I\'ve seen my plan and I\'d like help with this step: ') + c.paso[L]) } }
  };
};

// ───── Pantallas
const head = (n, title, round) => `<header class="hd ${round ? 'round' : ''}"><button class="bk" data-a="back" aria-label="${t('back')}">${I.back}</button><h1 class="brand">SHERPAS</h1><p class="sub">${t('stepOf', n, title)}</p>
  <div class="steps">${[1, 2, 3].map(k => `<i class="${k === n ? 'cur' : k < n ? 'done' : ''}"></i>`).join('<b></b>')}</div></header>`;
const deck = () => {
  const d = S.data, n = d.siguiente_paso;
  return [...d.tarjetas.map((c, k) => ({ kind: /vulner|risk/i.test(c.tipo || '') ? 'risk' : 'goal', label: `${(c.tipo || t('goalType')).toUpperCase()} ${k + 1}`, front: c.frente, back: c.reverso, more: c.detalle })),
    { kind: 'step', label: isCouple() ? t('stepBoth') : t('stepLabel'), front: n.titulo, back: n.razon, steps: n.pasos, min: n.minutos }];
};
const goal = () => { const h = S.data.mapa.hitos.at(-1); return h ? `${h.titulo} (${h.anio})` : S.data.frase_inicial; };
const FACE = [0, 0, 1, 2, 2];  // posición del selector → cara más cercana (se usa solo para el mock)

// Un selector de ánimo (una persona). La cara solo se ilumina cuando el selector está sobre su propio círculo (posiciones 1, 3 y 5).
const moodBlock = (who, name) => {
  const pos = S.m[who] - 1, lit = pos % 2 === 0 ? pos / 2 : -1, L = t('moods');
  return `<div class="mood" data-who="${who}">${name ? `<p class="who">${esc(name)}</p>` : ''}
    <div class="g5">${[['sad', 1], ['neu', 3], ['smi', 5]].map(([k, c], j) => `<button class="face-b ${lit === j ? 'on' : ''}" data-k="${k}" style="grid-column:${c}" data-a="mood" data-v="${c - 1}" aria-label="${L[j]}">${face(k)}</button>`).join('')}</div>
    <div class="g5 track" role="radiogroup" aria-label="${t('moodAria')}${name ? ': ' + esc(name) : ''}">${[0, 1, 2, 3, 4].map(i => `<button class="dp ${i % 2 === 0 ? 'big' : ''} ${i === pos ? 'on' : ''}" role="radio" aria-checked="${i === pos}" data-a="mood" data-v="${i}" aria-label="${t('pos', i + 1)}"></button>`).join('')}</div>
    <div class="g5 mlab">${[1, 3, 5].map((c, j) => `<span style="grid-column:${c}" class="${lit === j ? 'on' : ''}">${L[j]}</span>`).join('')}</div>
  </div>`;
};

function render() {
  const d = S.data;
  if (S.screen === 0) {
    const cp = COUPLES[S.caso];
    app.innerHTML = `<h1 class="brand big">SHERPAS</h1>
    <p class="intro ${cp ? 'cpl' : ''}">${cp ? t('introCouple') : t('intro')}</p>
    <div class="${cp ? 'couple' : ''}">${cp ? cp.map((n, i) => moodBlock(i, n)).join('') : moodBlock(0, '')}</div>
    <p class="lab">${t('pace')}</p>
    <div role="radiogroup" aria-label="${t('paceAria')}">
      <button class="rit ${S.tiempo === 'corto' ? 'on' : ''}" role="radio" aria-checked="${S.tiempo === 'corto'}" data-a="tiempo" data-v="corto"><span class="rd"></span>${t('direct')} ${I.bolt}</button>
      <button class="rit ${S.tiempo === 'completo' ? 'on' : ''}" role="radio" aria-checked="${S.tiempo === 'completo'}" data-a="tiempo" data-v="completo"><span class="rd"></span>${t('full')} ${I.lines}</button>
    </div>
    <div class="spacer"></div>
    <button class="cta" data-a="go">${t('start')}</button>
    <p class="tag">${t('tag')}</p>
    <details class="opts" ${S.opts ? 'open' : ''}><summary>${t('demo')}</summary>
      <label for="caso">${t('family')}</label>
      <select id="caso">${Object.entries(CASOS).map(([k, v]) => `<option value="${k}" ${k === S.caso ? 'selected' : ''}>${v}</option>`).join('')}</select>
      ${cp ? '' : `<label for="persona">${t('who')}</label>
      <input type="text" id="persona" maxlength="40" placeholder="${t('whoPh')}" value="${esc(S.persona)}">`}
    </details>`;
  } else if (S.screen === 1) {
    app.innerHTML = `<div class="center"><div class="spin"></div><h2>${t('loading')}</h2><p class="lead">${t('reading')}</p></div>`;
  } else if (S.screen === -1) {
    app.innerHTML = `<div class="center"><h2>${t('errTitle')}</h2><p class="lead">${t('errBody', esc(API))}</p><p class="note">${t('detail')}: ${esc(S.err)}</p><button class="cta sm" data-a="go">${t('retry')}</button><button class="cta sm alt" data-a="back">${t('home')}</button></div>`;
  } else if (S.screen === 2) {
    const cs = deck(), c = cs[S.i];
    const back = `<h3>${esc(c.label)}</h3><p>${esc(c.back)}</p>${c.steps?.length ? `<ol>${c.steps.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}${c.min ? `<p class="mut">${t('minutes', c.min)}</p>` : ''}${c.more ? `<details><summary>${t('deeper')}</summary><p>${esc(c.more)}</p></details>` : ''}`;
    app.innerHTML = `${head(2, t('dx'))}
    <div class="meta"><span class="mi">${I.flag}</span><div><small>${t('goal')}</small><b>${esc(goal())}</b></div></div>
    ${S.fallback ? `<div class="warn">${t('saved')}</div>` : ''}
    <div class="stack" aria-label="${t('stackAria')}">
      ${S.i > 0 ? `<button class="peek up k-${cs[S.i - 1].kind}" data-a="prev" aria-label="${t('prevCard')}">${I.up}</button>` : ''}
      <div class="fc ${S.flip ? 'flip' : ''} ${S.dir ? 'in-' + S.dir : ''}" data-a="flip" tabindex="0" role="button" aria-label="${esc(c.label)}. ${t('flipAria')}"><div class="inner">
        <div class="face k-${c.kind}"><span class="ic">${KI[c.kind]}</span><h3>${esc(c.label)}</h3><p class="ft">${esc(c.front)}</p><div class="hint">${I.hand} ${t('hint')}</div></div>
        <div class="face back k-${c.kind}">${back}</div></div></div>
      ${S.i < cs.length - 1 ? `<button class="peek dn k-${cs[S.i + 1].kind}" data-a="next" aria-label="${t('nextCard')}"><span>${esc(cs[S.i + 1].label)}</span>${I.dn}</button>` : ''}
    </div>
    <div class="foot"><button class="cta2" data-a="sim"><b>${t('nextStep')}</b><span>${t('toViz')}</span></button></div>`;
    S.dir = '';
  } else if (S.screen === 3) {
    const m = d.mapa, n = d.siguiente_paso;
    app.innerHTML = `${head(3, t('plan'), true)}
    <section class="panel"><h2 class="ptitle"><span class="pi">${I.chart}</span>${t('wellbeing')}</h2><p class="psub">${t('pathTo')} ${esc(goal())}</p>
      <svg class="chart" id="chart" viewBox="0 0 340 210" role="img" aria-label="${t('chartAria')}"></svg>
      <div class="leg"><span>${t('legStay')}</span><span class="imp">${t('legChange')}</span></div>
      <p class="scrub">${t('scrub')}</p>
      ${m.hitos.length ? `<ul class="chips">${m.hitos.map((h, k) => `<li><i class="num">${k + 1}</i><b>${h.anio}</b>${esc(h.titulo)}</li>`).join('')}</ul>` : ''}
      <hr>
      ${m.palancas.map(p => `<div class="lev" style="--c:${(LS[p.id] || LS.ahorro_mensual)[1]}"><div class="lrow"><label for="r_${p.id}"><span class="li">${(LS[p.id] || LS.ahorro_mensual)[0]}</span>${esc(p.etiqueta)}</label><output id="v_${p.id}" for="r_${p.id}"></output></div>
        <input class="rng" type="range" id="r_${p.id}" data-id="${p.id}" min="${p.min}" max="${p.max}" step="${p.paso}" value="${S.vals[p.id] || 0}" style="--p:${pct(p, S.vals[p.id] || 0)}%"></div>`).join('')}
    </section>
    <p class="note">${esc(m.aviso)}</p>
    <p class="info">${t('moreInfo')} <button class="lnk" data-a="cita">${t('book')}</button> ${I.mail}</p>
    <section class="panel next"><h3>${t('nextHead')}</h3><p class="nt">${esc(n.titulo)}</p>
      <div class="chk">${n.pasos.map(p => `<label><input type="checkbox"> ${esc(p)}</label>`).join('')}</div>
      <a class="cta sm" href="${esc(n.acciones.calendario_url)}" target="_blank" rel="noopener">${t('activate')}</a>
      <button class="dl" data-a="pdf">${t('pdf')} ${I.dl}</button></section>`;
    updSim();
  }
}

// ───── Gráfico: eje X = años (de hoy a tu meta), eje Y = bienestar financiero. Los coeficientes son ilustrativos (vienen del backend).
const fmt = (p, v) => p.unidad === '$' ? '$' + v : v + ' ' + p.unidad;
const pct = (p, v) => p.max === p.min ? 0 : Math.round((v - p.min) / (p.max - p.min) * 100);
const delta = () => S.data.mapa.palancas.reduce((s, p) => s + (S.vals[p.id] || 0) * p.puntos_por_unidad, 0);
const PL = 44, PR = 290, W = PR - PL;
function updSim() {
  const m = S.data.mapa, dl = Math.round(delta() * 10) / 10, b = m.score_base ?? 50, up = dl > 0.05;
  m.palancas.forEach(p => { $('#v_' + p.id).textContent = fmt(p, S.vals[p.id] || 0); });
  const y0 = new Date().getFullYear(), y1 = Math.max(y0 + 1, ...m.hitos.map(h => h.anio), m.hitos.length ? 0 : y0 + 10);
  const lo = Math.max(0, Math.min(b - 15, 50)), hi = lo + 50, nb = Math.min(hi - 3, b + dl);
  const X = y => PL + (y - y0) / (y1 - y0) * W, Y = s => 170 - (s - lo) / (hi - lo) * 120;
  const f = x => { const k = (x - PL) / W; return Y(b) + (Y(nb) - Y(b)) * k * k * (3 - 2 * k); };
  const pts = Array.from({ length: 41 }, (_, i) => { const x = PL + i * W / 40; return x.toFixed(1) + ',' + f(x).toFixed(1); }).join(' ');
  const fy = f(PR), by = Y(b), iy = up ? Math.min(fy, by - 22) : fy;
  const badge = (y, txt, col) => `<g><rect x="${PR + 6}" y="${y - 11}" width="40" height="22" rx="11" fill="${col}"/><text x="${PR + 26}" y="${y + 4}" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">${txt}</text></g>`;
  let cur = '';
  if (S.cur != null) {
    const x = Math.max(PL, Math.min(PR, S.cur)), kk = (x - PL) / W, sc = b + (nb - b) * kk * kk * (3 - 2 * kk), yr = Math.round(y0 + (x - PL) / W * (y1 - y0)), vi = f(x);
    const tw = up ? 96 : 64, tx = Math.max(2, Math.min(338 - tw, x - tw / 2));
    cur = `<line x1="${x}" y1="50" x2="${x}" y2="170" stroke="#1f2937" stroke-width="1.5" stroke-opacity=".5"/>
      <circle cx="${x}" cy="${by}" r="5" fill="#2d4a4f" stroke="#fff" stroke-width="2"/>${up ? `<circle cx="${x}" cy="${vi}" r="6" fill="#2f9a8a" stroke="#fff" stroke-width="2"/>` : ''}
      <rect x="${tx}" y="1" width="${tw}" height="29" rx="9" fill="#1f2937"/>
      <text x="${tx + 9}" y="13" font-size="10" font-weight="800" fill="#fff">${yr}</text>
      <circle cx="${tx + 12}" cy="22" r="3.5" fill="#9ca3af"/><text x="${tx + 20}" y="25" font-size="10" fill="#fff">${Math.round(b)}</text>
      ${up ? `<circle cx="${tx + 54}" cy="22" r="3.5" fill="#2f9a8a"/><text x="${tx + 62}" y="25" font-size="10" font-weight="800" fill="#fff">${Math.round(sc)}</text>` : ''}`;
  }
  $('#chart').innerHTML = `<defs>
      <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f9a8a" stop-opacity=".5"/><stop offset="1" stop-color="#2f9a8a" stop-opacity=".06"/></linearGradient>
      <linearGradient id="gL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f9a8a"/><stop offset="1" stop-color="#27b39b"/></linearGradient>
      <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dbe9ee"/><stop offset="1" stop-color="#f1f6f8"/></linearGradient></defs>
    <rect x="${PL}" y="50" width="${W}" height="120" rx="6" fill="#fafcfd"/>
    <polygon points="${PL},170 ${PL},112 80,88 105,110 150,64 190,102 225,82 262,104 ${PR},78 ${PR},170" fill="url(#gM)"/>
    ${[lo, lo + 25, hi].map(s => `<line x1="${PL}" y1="${Y(s)}" x2="${PR}" y2="${Y(s)}" stroke="#d9e2e7" stroke-dasharray="3 4"/><text x="${PL - 6}" y="${Y(s) + 4}" font-size="10" fill="#6b7280" text-anchor="end">${Math.round(s)}</text>`).join('')}
    <text x="9" y="110" font-size="11" fill="#6b7280" text-anchor="middle" transform="rotate(-90 9 110)">${t('yAxis')}</text>
    ${up ? `<polygon points="${pts} ${PR},${by} ${PL},${by}" fill="url(#gA)"/>` : ''}
    <line x1="${PL}" y1="${by}" x2="${PR}" y2="${by}" stroke="#2d4a4f" stroke-width="2.4"/>
    ${up ? `<polyline points="${pts}" fill="none" stroke="url(#gL)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    <line x1="${PL}" y1="170" x2="${PR}" y2="170" stroke="#9ca3af"/>
    <text x="${PL}" y="192" font-size="11" fill="#374151" font-weight="700">${t('today')} ${y0}</text>
    ${m.hitos.map((h, k) => { const x = Math.min(PR, X(h.anio)), last = x > PR - 22, hide = x < 90;
      return `<line x1="${x}" y1="50" x2="${x}" y2="170" stroke="#f08c3c" stroke-dasharray="2 3" stroke-opacity=".75"/>
      <circle cx="${x}" cy="40" r="9" fill="#f08c3c" stroke="#fff" stroke-width="2"/><text x="${x}" y="44" font-size="11" font-weight="800" fill="#fff" text-anchor="middle">${k + 1}</text>
      <circle cx="${x}" cy="${by}" r="4.5" fill="#2d4a4f" stroke="#fff" stroke-width="1.5"/>${up ? `<circle cx="${x}" cy="${f(x)}" r="6" fill="#f08c3c" stroke="#fff" stroke-width="2.2"/>` : ''}
      ${hide ? '' : `<text x="${x}" y="192" font-size="11" fill="#374151" font-weight="700" text-anchor="${last ? 'end' : 'middle'}">${h.anio}</text>`}`; }).join('')}
    ${badge(by, Math.round(b), '#2d4a4f')}${up ? badge(iy, Math.round(nb), '#2f9a8a') : ''}
    ${cur}
    <rect x="${PL}" y="30" width="${W}" height="150" fill="transparent"/>`;
}

// ───── Carga del resumen. keep = true (o un estado guardado) vuelve a la misma pantalla/tarjeta, p. ej. al cambiar de idioma
async function load(keep) {
  const prev = keep && keep !== true ? keep : keep === true ? { screen: S.screen, i: S.i, vals: { ...S.vals } } : null;
  const lang = S.lang;
  S.screen = 1; render();
  try {
    let j;
    if (MOCK) { await new Promise(r => setTimeout(r, 500)); j = { status: 'success', resultado: mockResult() }; }
    else {
      const couple = isCouple();
      const r = await fetch(API + '/generar-resumen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: S.caso, animo: S.m[0], animo_pareja: couple ? S.m[1] : null, nombres: couple ? COUPLES[S.caso] : null,
          tiempo: S.tiempo, persona: couple ? null : (S.persona.trim() || null), idioma: lang
        })
      });
      if (!r.ok) throw new Error('El backend respondió ' + r.status + ' ' + (await r.text()).slice(0, 200));
      j = await r.json();
    }
    if (lang !== S.lang) return load(prev || undefined);   // cambiaron de idioma mientras cargaba
    S.data = j.resultado; S.fallback = j.status === 'fallback'; S.flip = false;
    S.i = prev ? Math.min(prev.i, deck().length - 1) : 0;
    S.vals = {}; S.data.mapa.palancas.forEach(p => S.vals[p.id] = prev?.vals?.[p.id] ?? 0);
    S.screen = prev ? prev.screen : 2;
  } catch (e) { console.error(e); S.err = e.message || String(e); S.screen = -1; }
  render();
}

// ───── Eventos
function setMoodPos(block, v) {
  const who = +block.dataset.who; S.m[who] = v + 1;
  const lit = v % 2 === 0 ? v / 2 : -1;
  block.querySelectorAll('.dp').forEach((d, i) => { d.classList.toggle('on', i === v); d.setAttribute('aria-checked', i === v); });
  block.querySelectorAll('.face-b').forEach((d, j) => d.classList.toggle('on', j === lit));
  block.querySelectorAll('.mlab span').forEach((d, j) => d.classList.toggle('on', j === lit));
}
const act = {
  mood: b => setMoodPos(b.closest('.mood'), +b.dataset.v),
  tiempo: b => { S.tiempo = b.dataset.v; document.querySelectorAll('.rit').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); },
  go: () => load(),
  back: () => { if (S.screen === 0) return; S.screen = S.screen === 3 ? 2 : 0; S.flip = false; render(); },
  flip: b => { S.flip = !S.flip; b.classList.toggle('flip', S.flip); },
  next: () => { if (S.screen === 2 && S.i < deck().length - 1) { S.i++; S.flip = false; S.dir = 'up'; render(); } },
  prev: () => { if (S.screen === 2 && S.i > 0) { S.i--; S.flip = false; S.dir = 'dn'; render(); } },
  sim: () => { S.screen = 3; render(); window.scrollTo(0, 0); },
  cita: () => openCita(S.data.siguiente_paso.acciones.asesor_url),
  pdf: () => window.print()
};
app.addEventListener('click', e => {
  if (S.swipe || e.target.closest('details') || e.target.closest('a')) return;
  const b = e.target.closest('[data-a]'); if (b) act[b.dataset.a](b);
});
app.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.a === 'flip') { e.preventDefault(); act.flip(e.target); }
  const blk = e.target.closest?.('.mood');
  if (blk && S.screen === 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault(); const v = Math.max(0, Math.min(4, S.m[+blk.dataset.who] - 1 + (e.key === 'ArrowRight' ? 1 : -1)));
    setMoodPos(blk, v); blk.querySelectorAll('.dp')[v].focus();
  }
});
app.addEventListener('input', e => {
  if (e.target.id === 'persona') S.persona = e.target.value;
  if (e.target.classList.contains('rng')) {   // barra deslizante: mueve la gráfica al instante
    const p = S.data.mapa.palancas.find(x => x.id === e.target.dataset.id), v = +e.target.value;
    S.vals[p.id] = v; e.target.style.setProperty('--p', pct(p, v) + '%'); updSim();
  }
});
app.addEventListener('change', e => {
  if (e.target.id === 'caso') { S.caso = e.target.value; S.opts = true; render(); $('#caso')?.focus(); }   // cambia entre 1 y 2 selectores
});
app.addEventListener('toggle', e => { if (e.target.matches?.('details.opts')) S.opts = e.target.open; }, true);

// Deslizar el selector de ánimo (táctil o ratón) + deslizar tarjetas hacia arriba/abajo
let py = null, lock = false, mdrag = null;
function moodFromX(block, x) {
  const r = block.querySelector('.track').getBoundingClientRect();
  setMoodPos(block, Math.max(0, Math.min(4, Math.floor((x - r.left) / r.width * 5))));
}
const scrub = e => {
  const sv = e.target.closest?.('#chart'); if (!sv || !S.data) return false;
  const r = sv.getBoundingClientRect(); S.cur = Math.max(PL, Math.min(PR, (e.clientX - r.left) / r.width * 340)); updSim(); return true;
};
app.addEventListener('pointerdown', e => {
  if (S.screen === 3 && !scrub(e) && S.cur != null) { S.cur = null; updSim(); }
  py = S.screen === 2 && e.target.closest('.stack') ? e.clientY : null;
  const blk = S.screen === 0 && e.target.closest('.mood');
  if (blk) { mdrag = blk; try { blk.setPointerCapture(e.pointerId); } catch { } moodFromX(blk, e.clientX); }
});
app.addEventListener('pointermove', e => {
  if (mdrag) moodFromX(mdrag, e.clientX);
  if (S.screen === 3 && (e.pointerType === 'mouse' || e.buttons)) scrub(e);
});
app.addEventListener('pointerout', e => {
  if (S.screen === 3 && e.pointerType === 'mouse' && e.target.closest?.('#chart') && !e.relatedTarget?.closest?.('#chart')) { S.cur = null; updSim(); }
});
app.addEventListener('pointercancel', () => { py = null; mdrag = null; });
app.addEventListener('pointerup', e => {
  mdrag = null;
  if (py == null) return;
  const dy = e.clientY - py; py = null;
  if (Math.abs(dy) > 45) { S.swipe = true; setTimeout(() => S.swipe = false, 80); dy < 0 ? act.next() : act.prev(); }
});
app.addEventListener('wheel', e => {
  if (S.screen !== 2 || lock || !e.target.closest('.stack') || Math.abs(e.deltaY) < 20) return;
  lock = true; setTimeout(() => lock = false, 450); e.deltaY > 0 ? act.next() : act.prev();
}, { passive: true });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeChat();
  if (S.screen === 2 && !/INPUT|SELECT/.test(e.target.tagName) && !$('#chat').classList.contains('open')) {
    if (e.key === 'ArrowDown') act.next(); if (e.key === 'ArrowUp') act.prev();
  }
});

// ───── Cita con el asesor (ventana con día/hora + Google Calendar, .ics o correo)
const dlg = $('#cita');
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const stamp = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
function parseMail(url) {
  const [a, q = ''] = String(url || '').replace(/^mailto:/i, '').split('?'), qp = new URLSearchParams(q);
  return { to: decodeURIComponent(a), subject: qp.get('subject') || '', body: qp.get('body') || '' };
}
function openCita(url) {
  const mail = parseMail(url), d0 = new Date(); d0.setDate(d0.getDate() + 2); while ([0, 6].includes(d0.getDay())) d0.setDate(d0.getDate() + 1);
  const times = []; for (let h = 9; h <= 17; h++) { times.push(pad(h) + ':00'); if (h < 17) times.push(pad(h) + ':30'); }
  dlg.innerHTML = `<div class="cd"><div class="chd"><h2 id="ctit">${t('citaTitle')}</h2><button class="ib" id="ccl" aria-label="${t('close')}">${I.x}</button></div>
    <p class="mut">${t('citaDesc')}</p>
    <label for="cdate">${t('date')}</label><input type="date" id="cdate" value="${isoDate(d0)}" min="${isoDate(new Date())}">
    <label for="ctime">${t('time')}</label><select id="ctime">${times.map(x => `<option ${x === '10:00' ? 'selected' : ''}>${x}</option>`).join('')}</select>
    <button class="cta sm" data-c="gcal">${t('gcal')}</button>
    <button class="cta sm alt" data-c="ics">${t('ics')}</button>
    <button class="cta sm alt" data-c="mail">${t('mailBtn')} ${I.mail}</button>
    <button class="dl" data-c="copy">${t('copyMail')}: ${esc(mail.to)}</button>
    <p class="note" id="cmsg" role="status"></p></div>`;
  dlg._mail = mail; if (!dlg.open) dlg.showModal();
}
dlg.addEventListener('click', e => {
  if (e.target === dlg || e.target.closest('#ccl')) return dlg.close();
  const b = e.target.closest('[data-c]'); if (!b) return;
  const msg = $('#cmsg'), mail = dlg._mail, v = b.dataset.c;
  if (v === 'copy') {
    navigator.clipboard?.writeText(mail.to).then(() => msg.textContent = t('copied'), () => msg.textContent = mail.to);
    return;
  }
  if (!$('#cdate').value) { msg.textContent = t('pickDate'); return; }
  const [y, mo, d] = $('#cdate').value.split('-').map(Number), [h, mi] = $('#ctime').value.split(':').map(Number);
  const s = new Date(y, mo - 1, d, h, mi), e2 = new Date(s.getTime() + 30 * 60000);
  if (v === 'gcal') {
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(mail.subject || t('citaTitle'))}&dates=${stamp(s)}/${stamp(e2)}&details=${encodeURIComponent(mail.body)}&add=${encodeURIComponent(mail.to)}`, '_blank', 'noopener');
  } else if (v === 'ics') {
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sherpas Lens//EN', 'BEGIN:VEVENT', 'UID:' + Date.now() + '@sherpas-lens', 'DTSTAMP:' + stamp(new Date()),
      'DTSTART:' + stamp(s), 'DTEND:' + stamp(e2), 'SUMMARY:' + (mail.subject || t('citaTitle')).replace(/[\r\n,;]/g, ' '), 'DESCRIPTION:' + mail.body.replace(/[\r\n,;]/g, ' '),
      'ATTENDEE:mailto:' + mail.to, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'sherpas-cita.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } else if (v === 'mail') {
    const body = mail.body + '\n\n' + t('pref') + ' ' + $('#cdate').value + ' ' + $('#ctime').value;
    msg.textContent = t('mailHint');
    location.href = `mailto:${mail.to}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(body)}`;
  }
});

// ───── Asistente (chat con indicador de "pensando")
function ctxNote() {
  const d = S.data; if (!d) return '';
  if (S.screen === 2) { const c = deck()[S.i]; return t('ctxCard', c.label, c.front); }
  if (S.screen === 3) return t('ctxSim', d.mapa.palancas.map(p => `${p.etiqueta} = ${fmt(p, S.vals[p.id] || 0)}`).join(', '));
  return '';
}
const bubble = m => m.role === 'user' ? `<div class="m user">${esc(m.content)}</div>`
  : `<div class="row-a"><span class="av">${I.bot}</span><div class="m assistant">${esc(m.content)}${m.url ? `<button class="lnkb" data-url="${esc(m.url)}">${t('talkAdvisor')}</button>` : ''}</div></div>`;
function renderChat() {
  const box = $('#msgs');
  box.innerHTML = (S.msgs.length ? S.msgs.map(bubble).join('') : bubble({ role: 'assistant', content: t('welcome') }))
    + (S.wait ? `<div class="row-a"><span class="av">${I.bot}</span><div class="m assistant typing" role="status" aria-label="${t('thinkingAria')}"><i></i><i></i><i></i><em>${t('thinking')}</em></div></div>` : '');
  box.scrollTop = box.scrollHeight; $('#snd').disabled = S.wait;
}
$('#msgs').addEventListener('click', e => { const b = e.target.closest('[data-url]'); if (b) openCita(b.dataset.url); });
async function send(text) {
  text = text.trim(); if (!text || S.wait) return;
  S.msgs.push({ role: 'user', content: text }); S.wait = true; renderChat();
  try {
    let j;
    if (MOCK) { await new Promise(r => setTimeout(r, 1800)); j = { respuesta: t('mockReply'), derivar_asesor: false }; }
    else {
      const hist = S.msgs.slice(-12).map(m => ({ role: m.role, content: m.content }));
      hist[hist.length - 1].content = (ctxNote() + text).slice(0, 2000);
      const couple = isCouple();
      const r = await fetch(API + '/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: S.caso, animo: S.m[0], animo_pareja: couple ? S.m[1] : null, nombres: couple ? COUPLES[S.caso] : null, persona: couple ? null : (S.persona.trim() || null), idioma: S.lang, mensajes: hist })
      });
      if (!r.ok) throw new Error(r.status);
      j = await r.json();
    }
    S.msgs.push({ role: 'assistant', content: j.respuesta, url: j.derivar_asesor ? j.asesor_url : null });
    if (S.voz) speak(j.respuesta);
  } catch (e) { S.msgs.push({ role: 'assistant', content: t('connErr') }); }
  S.wait = false; renderChat();
}
const speak = txt => { if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = t('speech'); speechSynthesis.speak(u); };
const setVoz = v => { S.voz = v; $('#vozbtn').classList.toggle('mute', !v); if (!v && 'speechSynthesis' in window) speechSynthesis.cancel(); };
function openChat() {
  $('#chat').inert = false; $('#chat').classList.add('open'); $('#scrim').classList.add('open'); document.body.classList.add('chat-open');
  renderChat(); setTimeout(() => $('#cinp').focus({ preventScroll: true }), 380);
}
function closeChat() {
  $('#chat').classList.remove('open'); $('#scrim').classList.remove('open'); document.body.classList.remove('chat-open'); $('#chat').inert = true;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
$('#scrim').onclick = $('#cx').onclick = closeChat;
$('#vozbtn').onclick = () => setVoz(!S.voz);
$('#snd').onclick = () => { send($('#cinp').value); $('#cinp').value = ''; };
$('#cinp').onkeydown = e => { if (e.key === 'Enter') $('#snd').click(); };

// Botón de la asistente: se puede arrastrar por la pantalla; un toque abre el chat
const fab = $('#fab');
const colL = (innerWidth + Math.min(440, innerWidth)) / 2;
fab.style.left = Math.min(innerWidth - 74, colL - 76) + 'px'; fab.style.top = (innerHeight - 230) + 'px';
let drag = null;
fab.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, l: fab.offsetLeft, t: fab.offsetTop, m: false }; fab.setPointerCapture(e.pointerId); });
fab.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 6) drag.m = true;
  if (drag.m) {
    fab.style.left = Math.max(4, Math.min(innerWidth - fab.offsetWidth - 4, drag.l + dx)) + 'px';
    fab.style.top = Math.max(4, Math.min(innerHeight - fab.offsetHeight - 4, drag.t + dy)) + 'px';
  }
});
fab.addEventListener('pointerup', () => { if (drag && !drag.m) openChat(); drag = null; });
fab.addEventListener('click', e => { if (e.detail === 0) openChat(); });

let rec = null;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) $('#mic').hidden = true;
else {
  rec = new SR(); rec.interimResults = false;
  rec.onresult = e => { setVoz(true); send(e.results[0][0].transcript); };
  rec.onend = () => $('#mic').classList.remove('rec');
  $('#mic').onclick = () => { rec.lang = t('speech'); $('#mic').classList.add('rec'); try { rec.start(); } catch (e) { rec.stop(); } };
}

// ───── Idioma (interfaz + textos que genera la IA)
function applyStatic() {
  document.documentElement.lang = S.lang;
  $('.chead h2').textContent = t('chatTitle');
  $('#chat').setAttribute('aria-label', t('assistant'));
  $('#fab').setAttribute('aria-label', t('openAssistant'));
  $('#vozbtn').setAttribute('aria-label', t('voiceAria'));
  $('#cx').setAttribute('aria-label', t('close'));
  $('#cinp').placeholder = t('chatPh'); $('#cinp').setAttribute('aria-label', t('chatPh'));
  $('#mic').setAttribute('aria-label', t('mic')); $('#snd').setAttribute('aria-label', t('send'));
  $('#lang').setAttribute('aria-label', t('langAria'));
  document.querySelectorAll('#lang [data-l]').forEach(b => b.setAttribute('aria-pressed', b.dataset.l === S.lang));
}
function setLang(l) {
  if (l === S.lang) return;
  S.lang = l; try { localStorage.setItem('lang', l); } catch { }
  applyStatic();
  if (dlg.open) dlg.close();
  if (S.data && (S.screen === 2 || S.screen === 3)) load(true);   // la IA vuelve a generar los textos en el nuevo idioma
  else render();
  if ($('#chat').classList.contains('open')) renderChat();
}
$('#lang').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b) setLang(b.dataset.l); });

applyStatic();
render();
