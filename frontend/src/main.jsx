import './index.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// MODO MOCK: true = datos de prueba, NO llama al backend ni gasta tokens. Pon false para usar la IA real.
const MOCK = false;
// Voz de la IA con ElevenLabs a través del backend (/tts). Si falla o no está configurado, usa la voz del navegador.
const USE_ELEVEN = true;
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
// screen: -2 bienvenida · 0 ánimo · 4 ritmo · 1 cargando ...
// (antes) 0 inicio · 1 cargando · 2 flashcards · 3 plan interactivo · -1 error
// m[i]: ánimo de cada persona (1 = muy agobiado ... 5 = muy confiado). Posición del selector = m - 1.
const S = { lang: ['es', 'en'].includes(saved) ? saved : DEFAULT_LANG, screen: -2, caso: 'michael-carter', persona: '', mode: null, who: null, m: [3, 3], tiempo: 'corto', data: null, i: 0, flip: false, dir: '', vals: {}, msgs: [], voz: false, wait: false, err: '', opts: false };
const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
const hasPair = () => !!COUPLES[S.caso];                                   // el enlace es de una pareja
const isCouple = () => hasPair() && S.mode === 'together';                 // pareja que lo hace junta (dos selectores)
const soloName = () => hasPair() && S.mode === 'solo' && S.who != null ? COUPLES[S.caso][S.who] : '';   // quien lo hace solo, dentro de una pareja
const persona = () => soloName() || (hasPair() ? null : S.persona.trim() || null);
const resetMood = () => { S.m = [3, 3]; S.touched = false; };
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
    start: 'Comenzar recorrido ➔', demo: 'Opciones de la demo', family: 'Familia',
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
    moreInfo: 'Para más información:', book: 'Programar cita con asesor', nextHead: '¿Qué hacer ahora?',
    activate: 'Activar plan de ahorro →', pdf: 'Descargar informe completo (PDF)',
    assistant: 'Asistente', openAssistant: 'Hablar con la asistente', chatTitle: 'Pregunta sobre tu plan', voiceAria: 'Leer respuestas en voz alta', close: 'Cerrar',
    chatPh: 'Escribe tu duda...', mic: 'Hablar', send: 'Enviar',
    welcome: 'Pregúntame lo que quieras sobre tu plan.', thinking: 'Pensando…', thinkingAria: 'La asistente está pensando',
    mockReply: 'Respuesta de prueba: aquí contestaría la IA, sin gastar tokens.', connErr: 'No consigo conectar ahora mismo. Inténtalo de nuevo en un momento.',
    talkAdvisor: 'Hablar con un asesor',
    wTitle: 'Tu plan financiero, paso a paso', wBody: 'Dos preguntas rápidas y verás lo más importante de tu plan.', wStart: 'Empezar', next: 'Continuar',
    slide: 'Desliza el círculo o toca una opción', sideF: 'delante', sideB: 'detrás', optional: '¿Prefieres hablar con una persona?',
    ctxCard: (l, f) => `[Contexto de la app: el usuario está viendo la tarjeta "${l}: ${f}"] `, ctxSim: v => `[Contexto de la app: el usuario está en el simulador con ${v}] `,
    citaTitle: 'Programar cita con el asesor', citaDesc: 'Elige día y hora, y añádelo a tu calendario o envía un correo al asesor.',
    date: 'Día', time: 'Hora', gcal: 'Añadir a Google Calendar', ics: 'Descargar para Apple / Outlook (.ics)', mailBtn: 'Enviar correo al asesor',
    copyMail: 'Copiar correo', copied: 'Correo copiado ✓', pickDate: 'Elige un día primero.', mailHint: 'Si no se abre tu correo, copia la dirección del asesor y escríbele desde tu app de correo.',
    pref: 'Me vendría bien:', langAria: 'Idioma', menuAria: 'Menú', menuLang: 'Idioma', menuAsk: 'Asistente IA', menuDark: 'Modo oscuro', speech: 'es-ES', scrub: 'Desliza sobre la gráfica para ver cada año',
    ctxCouple: (a, la, b, lb, st) => `Somos pareja: ${a} se siente ${la} y ${b} se siente ${lb}. Queremos ver juntos un primer paso común (${st}).`, ctxSingle: l => `Hoy me siento ${l}.`, ctxWho: n => `Soy ${n}, de una pareja, y lo hago por mi cuenta.`,
    welcomeLead: 'Entiende tu plan financiero, paso a paso y sin prisa.', wsteps: ['Cuéntanos cómo te sientes', 'Descubre tu diagnóstico en tarjetas', 'Prueba cambios sobre tu plan'], paceQ: 'Elige tu ritmo', stepQ: (n, tot) => `Pregunta ${n} de ${tot}`,
    modeQ: '¿Lo hacéis juntos o solo uno de vosotros?', modeAria: 'Cómo lo vais a hacer', modeBoth: 'Los dos juntos', modeSolo: 'Solo yo', whoAreYou: '¿Quién eres?',
    loadMsgs: ['Estamos leyendo tu plan.', 'Buscando lo más importante para ti…', 'Ordenando tus metas y tus riesgos.', 'Poniéndolo en palabras sencillas.', 'Preparando tus tarjetas una a una.', 'Ya casi está, gracias por tu paciencia.']
  },
  en: {
    stepOf: (n, t) => `${t} - Step ${n} of 3`, dx: 'Diagnosis', plan: 'Interactive plan', back: 'Back',
    intro: 'Tell us how you feel about your finances today so we can personalise your journey:',
    introCouple: 'Each of you, tell us how you feel about your finances today. We\'ll find a first step that works for both:',
    moods: ['Worried', 'Calm', 'Confident'], moodAria: 'How you feel today', pos: i => `Position ${i} of 5`,
    pace: 'Choose your pace:', paceAria: 'Pace', direct: 'Quick and simple journey', full: 'The complete plan',
    start: 'Start the journey ➔', demo: 'Demo options', family: 'Family',
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
    moreInfo: 'For more information:', book: 'Book a call with an advisor', nextHead: 'What to do now?',
    activate: 'Start my savings plan →', pdf: 'Download full report (PDF)',
    assistant: 'Assistant', openAssistant: 'Talk to the assistant', chatTitle: 'Ask about your plan', voiceAria: 'Read answers aloud', close: 'Close',
    chatPh: 'Type your question...', mic: 'Speak', send: 'Send',
    welcome: 'Ask me anything about your plan.', thinking: 'Thinking…', thinkingAria: 'The assistant is thinking',
    mockReply: 'Test reply: the AI would answer here, without spending tokens.', connErr: 'I can\'t connect right now. Please try again in a moment.',
    talkAdvisor: 'Talk to an advisor',
    wTitle: 'Your financial plan, step by step', wBody: 'Two quick questions, then you\'ll see what matters most in your plan.', wStart: 'Let\'s start', next: 'Continue',
    slide: 'Slide the dot or tap an option', sideF: 'front', sideB: 'back', optional: 'Prefer to talk to a person?',
    ctxCard: (l, f) => `[App context: the user is looking at the card "${l}: ${f}"] `, ctxSim: v => `[App context: the user is in the simulator with ${v}] `,
    citaTitle: 'Book a call with the advisor', citaDesc: 'Pick a day and time, then add it to your calendar or email the advisor.',
    date: 'Day', time: 'Time', gcal: 'Add to Google Calendar', ics: 'Download for Apple / Outlook (.ics)', mailBtn: 'Email the advisor',
    copyMail: 'Copy email', copied: 'Email copied ✓', pickDate: 'Pick a day first.', mailHint: 'If your email app doesn\'t open, copy the advisor\'s address and write from your email app.',
    pref: 'My preferred time:', langAria: 'Language', menuAria: 'Menu', menuLang: 'Language', menuAsk: 'AI assistant', menuDark: 'Dark mode', speech: 'en-US', scrub: 'Slide across the chart to see each year',
    ctxCouple: (a, la, b, lb, st) => `We are a couple: ${a} feels ${la} and ${b} feels ${lb}. We'd like to look at a common first step together (${st}).`, ctxSingle: l => `Today I feel ${l}.`, ctxWho: n => `I'm ${n}, part of a couple, doing this on my own.`,
    welcomeLead: 'Understand your financial plan, one step at a time and with no rush.', wsteps: ['Tell us how you feel', 'Discover your diagnosis in cards', 'Try changes on your plan'], paceQ: 'Choose your pace', stepQ: (n, tot) => `Question ${n} of ${tot}`,
    modeQ: 'Are you doing this together, or just one of you?', modeAria: 'How you are doing it', modeBoth: 'Both of us together', modeSolo: 'Just me', whoAreYou: 'Who are you?',
    loadMsgs: ['We are reading your plan.', 'Looking for what matters most to you…', 'Sorting your goals and your risks.', 'Putting it into plain words.', 'Preparing your cards one by one.', 'Almost there, thanks for your patience.']
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
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6"/>', 32),
  users: svg('<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.8"/><path d="M2.5 20c.8-4 3.5-5.5 6.5-5.5s5.7 1.5 6.5 5.5M16 14.5c2.6 0 4.8 1.2 5.5 4.5"/>', 32),
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
const face = k => `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><circle class="halo" cx="32" cy="32" r="31" fill="currentColor" stroke="none"/><circle class="fb" cx="32" cy="32" r="26"/><circle cx="23" cy="27" r="2.6" fill="currentColor" stroke="none"/><circle cx="41" cy="27" r="2.6" fill="currentColor" stroke="none"/>${k === 'sad' ? '<path d="M22 44q10-9 20 0"/>' : k === 'neu' ? '<path d="M23 42h18"/>' : '<path d="M21 38q11 11 22 0"/>'}</svg>`;

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
  const c = MC[S.caso], mood = eff(), n = 5, L = S.lang === 'en' ? 1 : 0;
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
// La flecha de volver ya no va dentro de cada pantalla: es el botón fijo #back (mismo eje que el menú de las tres rayitas)
const pre = (n, tot = 2) => `<div class="pre"><div class="pdots" role="img" aria-label="${t('stepQ', n, tot)}">${Array.from({ length: tot }, (_, k) => `<i class="${k + 1 === n ? 'cur' : k + 1 < n ? 'done' : ''}"></i>`).join('')}</div></div>`;
const arrow = d => svg(`<path d="${d}"/>`, 22);
const head = (n, title, round) => `<header class="hd ${round ? 'round' : ''}"><h1 class="brand">SHERPAS</h1><p class="sub">${t('stepOf', n, title)}</p>
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
  return `<div class="mood ${S.touched ? 'touched' : ''}" data-who="${who}">${name ? `<p class="who">${esc(name)}</p>` : ''}
    <div class="g5">${[['sad', 1], ['neu', 3], ['smi', 5]].map(([k, c], j) => `<button class="face-b ${lit === j ? 'on' : ''}" data-k="${k}" style="grid-column:${c}" data-a="mood" data-v="${c - 1}" aria-label="${L[j]}">${face(k)}</button>`).join('')}</div>
    <div class="g5 track" role="radiogroup" aria-label="${t('moodAria')}${name ? ': ' + esc(name) : ''}">${[0, 1, 2, 3, 4].map(i => `<button class="dp ${i % 2 === 0 ? 'big' : ''} ${i === pos ? 'on' : ''}" role="radio" aria-checked="${i === pos}" data-a="mood" data-v="${i}" aria-label="${t('pos', i + 1)}"></button>`).join('')}</div>
    <div class="g5 mlab">${[1, 3, 5].map((c, j) => `<span style="grid-column:${c}" class="${lit === j ? 'on' : ''}">${L[j]}</span>`).join('')}</div>
  </div>`;
};

// Frases de la pantalla de carga: cambian cada 4 s (con fundido) para entretener sin agobiar; la última se queda fija
let loadTimer = null;
function stopLoadMsgs() { clearInterval(loadTimer); loadTimer = null; }
function startLoadMsgs() {
  stopLoadMsgs(); let k = 0;
  loadTimer = setInterval(() => {
    const e = $('#lmsg'); if (!e) return stopLoadMsgs();
    const list = t('loadMsgs'); if (k >= list.length - 1) return stopLoadMsgs();
    e.classList.add('swap');
    setTimeout(() => { const e2 = $('#lmsg'); if (!e2) return; k++; e2.textContent = t('loadMsgs')[Math.min(k, t('loadMsgs').length - 1)]; e2.classList.remove('swap'); }, 350);
  }, 4000);
}

function render() {
  const d = S.data;
  const ORD = { '-2': 0, 5: 1, 0: 2, 4: 3, 1: 4, '-1': 4, 2: 5, 3: 6 };
  if (S.screen !== S.shown) {   // cambio de pantalla: entra con fundido y deslizamiento (adelante o atrás)
    const fwd = (ORD[S.screen] ?? 0) >= (ORD[S.shown] ?? 0);
    app.classList.remove('go-f', 'go-b'); void app.offsetWidth; app.classList.add(fwd ? 'go-f' : 'go-b');
    clearTimeout(S.goT); S.goT = setTimeout(() => app.classList.remove('go-f', 'go-b'), 700); S.shown = S.screen;
  }
  const fit = [-2, 5, 0, 4, 2].includes(S.screen);
  $('#back').hidden = ![5, 0, 4, 2, 3].includes(S.screen);
  app.classList.toggle('fit', fit); app.classList.toggle('s2', S.screen === 2);
  if (S.screen !== 1) stopLoadMsgs();
  if (S.screen === -2) {
    const cp = COUPLES[S.caso];
    app.innerHTML = `<h1 class="brand big">SHERPAS</h1>
      <p class="wlead">${t('welcomeLead')}</p>
      <ol class="wsteps">${t('wsteps').map((x, i) => `<li><span class="wn">${i + 1}</span>${x}</li>`).join('')}</ol>
      <div class="spacer"></div>
      <button class="cta" data-a="begin">${t('wStart')}</button>
      <details class="opts" ${S.opts ? 'open' : ''}><summary>${t('demo')}</summary>
        <label for="caso">${t('family')}</label>
        <select id="caso">${Object.entries(CASOS).map(([k, v]) => `<option value="${k}" ${k === S.caso ? 'selected' : ''}>${v}</option>`).join('')}</select>
        ${cp ? '' : `<label for="persona">${t('who')}</label>
        <input type="text" id="persona" maxlength="40" placeholder="${t('whoPh')}" value="${esc(S.persona)}">`}
      </details>`;
  } else if (S.screen === 0) {
    const cp = isCouple() ? COUPLES[S.caso] : null, n = hasPair() ? 2 : 1, tot = hasPair() ? 3 : 2;
    app.innerHTML = `${pre(n, tot)}
      <p class="intro ${cp ? 'cpl' : ''}">${cp ? t('introCouple') : t('intro')}</p>
      <div class="${cp ? 'couple' : ''}">${cp ? cp.map((x, i) => moodBlock(i, x)).join('') : moodBlock(0, soloName())}</div>
      <p class="shint ${S.touched ? 'touched' : ''}"><span class="l">${arrow('M15 6l-6 6 6 6')}</span>${t('slide')}<span class="r">${arrow('M9 6l6 6-6 6')}</span></p>
      <div class="spacer"></div>
      <button class="cta" data-a="toPace">${t('next')}</button>`;
  } else if (S.screen === 5) {   // solo en enlaces de pareja: ¿los dos juntos o solo uno? y, si es uno, ¿quién?
    const nm = COUPLES[S.caso] || [], ok = S.mode === 'together' || (S.mode === 'solo' && S.who != null);
    app.innerHTML = `${pre(1, 3)}
      <p class="intro">${t('modeQ')}</p>
      <div role="radiogroup" aria-label="${t('modeAria')}">
        <button class="rit ${S.mode === 'together' ? 'on' : ''}" role="radio" aria-checked="${S.mode === 'together'}" data-a="mode" data-v="together"><span class="rd"></span>${t('modeBoth')} ${I.users}</button>
        <button class="rit ${S.mode === 'solo' ? 'on' : ''}" role="radio" aria-checked="${S.mode === 'solo'}" data-a="mode" data-v="solo"><span class="rd"></span>${t('modeSolo')} ${I.user}</button>
      </div>
      ${S.mode === 'solo' ? `<p class="lab2">${t('whoAreYou')}</p>
      <div role="radiogroup" aria-label="${t('whoAreYou')}">${nm.map((x, i) => `<button class="rit sm ${S.who === i ? 'on' : ''}" role="radio" aria-checked="${S.who === i}" data-a="who" data-v="${i}"><span class="rd"></span>${esc(x)} ${I.user}</button>`).join('')}</div>` : ''}
      <div class="spacer"></div>
      <button class="cta" data-a="toMood" ${ok ? '' : 'disabled'}>${t('next')}</button>`;
  } else if (S.screen === 4) {
    app.innerHTML = `${pre(hasPair() ? 3 : 2, hasPair() ? 3 : 2)}
      <p class="intro">${t('paceQ')}</p>
      <div role="radiogroup" aria-label="${t('paceAria')}">
        <button class="rit ${S.tiempo === 'corto' ? 'on' : ''}" role="radio" aria-checked="${S.tiempo === 'corto'}" data-a="tiempo" data-v="corto"><span class="rd"></span>${t('direct')} ${I.bolt}</button>
        <button class="rit ${S.tiempo === 'completo' ? 'on' : ''}" role="radio" aria-checked="${S.tiempo === 'completo'}" data-a="tiempo" data-v="completo"><span class="rd"></span>${t('full')} ${I.lines}</button>
      </div>
      <div class="spacer"></div>
      <button class="cta" data-a="go">${t('start')}</button>`;
  } else if (S.screen === 1) {
    app.innerHTML = `<div class="center"><div class="spin"></div><h2>${t('loading')}</h2><p class="lead" id="lmsg" aria-live="polite">${t('loadMsgs')[0]}</p></div>`;
    startLoadMsgs();
  } else if (S.screen === -1) {
    app.innerHTML = `<div class="center"><h2>${t('errTitle')}</h2><p class="lead">${t('errBody', esc(API))}</p><p class="note">${t('detail')}: ${esc(S.err)}</p><button class="cta sm" data-a="go">${t('retry')}</button><button class="cta sm alt" data-a="back">${t('home')}</button></div>`;
  } else if (S.screen === 2) {
    const cs = deck(), c = cs[S.i];
    const back = `<div class="bi"><p class="bt">${esc(c.back)}</p>${c.steps?.length ? `<ol>${c.steps.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}${c.min ? `<p class="mut">${t('minutes', c.min)}</p>` : ''}${c.more ? `<details><summary>${t('deeper')}</summary><p>${esc(c.more)}</p></details>` : ''}</div>`;
    app.innerHTML = `${head(2, t('dx'))}
    <p class="lede">${esc(d.frase_inicial)}</p>
    ${S.fallback ? `<div class="warn">${t('saved')}</div>` : ''}
    <div class="stack" aria-label="${t('stackAria')}">
      ${S.i > 0 ? `<button class="peek up k-${cs[S.i - 1].kind}" data-a="prev" aria-label="${t('prevCard')}">${I.up}</button>` : ''}
      <div class="fc ${S.flip ? 'flip' : ''} ${S.dir ? 'in-' + S.dir : ''}" data-a="flip" tabindex="0" role="button" aria-label="${esc(c.label)}. ${t('flipAria')}"><div class="inner">
        <div class="face front k-${c.kind}"><span class="side">${t('sideF')}</span><div class="fh"><span class="ic">${KI[c.kind]}</span><h3>${esc(c.label)}</h3></div><p class="ft">${esc(c.front)}</p><div class="hint">${I.hand} ${t('hint')}</div></div>
        <div class="face back k-${c.kind}"><span class="side">${t('sideB')}</span>${back}</div></div></div>
      ${S.i < cs.length - 1 ? `<button class="peek dn k-${cs[S.i + 1].kind}" data-a="next" aria-label="${t('nextCard')}">${I.dn}</button>` : ''}
    </div>
    <div class="foot"><button class="cta2" data-a="sim"><b>${t('toViz')}</b></button></div>`;
    S.dir = '';
  } else if (S.screen === 3) {
    const m = d.mapa, n = d.siguiente_paso;
    app.innerHTML = `${head(3, t('plan'), true)}
    <section class="panel"><h2 class="ptitle"><span class="pi">${I.chart}</span>${t('wellbeing')}</h2>
      <svg class="chart" id="chart" viewBox="0 0 340 210" role="img" aria-label="${t('chartAria')}"></svg>
      <div class="leg"><span>${t('legStay')}</span><span class="imp">${t('legChange')}</span></div>
      <p class="scrub">${t('scrub')}</p>
      ${m.hitos.length ? `<ul class="chips">${m.hitos.map((h, k) => `<li><i class="num">${k + 1}</i><b>${h.anio}</b>${esc(h.titulo)}</li>`).join('')}</ul>` : ''}
      <hr>
      ${m.palancas.map(p => `<div class="lev" style="--c:${(LS[p.id] || LS.ahorro_mensual)[1]}"><div class="lrow"><label for="r_${p.id}"><span class="li">${(LS[p.id] || LS.ahorro_mensual)[0]}</span>${esc(p.etiqueta)}</label><output id="v_${p.id}" for="r_${p.id}"></output></div>
        <input class="rng" type="range" id="r_${p.id}" data-id="${p.id}" min="${p.min}" max="${p.max}" step="${p.paso}" value="${S.vals[p.id] || 0}" style="--p:${pct(p, S.vals[p.id] || 0)}%"></div>`).join('')}
    </section>
    <p class="note">${esc(m.aviso)}</p>
    <section class="panel next"><h3>${t('nextHead')}</h3><p class="nt">${esc(n.titulo)}</p>
      <div class="chk">${n.pasos.map(p => `<label><input type="checkbox"> ${esc(p)}</label>`).join('')}</div>
      <a class="cta sm" href="${esc(n.acciones.calendario_url)}" target="_blank" rel="noopener">${t('activate')}</a>
      <button class="dl" data-a="pdf">${t('pdf')} ${I.dl}</button></section>
    <div class="opt"><p>${t('optional')}</p><button class="cta sm alt" data-a="cita">${t('book')} ${I.mail}</button></div>`;
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
  // Hitos: los que caen en el mismo año (o casi) se juntan en una sola cápsula numerada sobre la misma línea
  const hp = m.hitos.map((h, k) => ({ h, k, x: Math.max(PL, Math.min(PR, X(h.anio))) })).sort((a, c) => a.x - c.x || a.k - c.k), grp = [];
  hp.forEach((p, i) => { if (i && p.x - hp[i - 1].x < 22) grp.at(-1).push(p); else grp.push([p]); });
  const lines = [...new Set(hp.map(p => p.x.toFixed(1)))].map(Number).map(x => `<line x1="${x}" y1="50" x2="${x}" y2="176" stroke="#f08c3c" stroke-dasharray="2 3" stroke-opacity=".75"/>
      <circle cx="${x}" cy="${by}" r="4.5" fill="var(--ch-base)" stroke="var(--ch-ring)" stroke-width="1.5"/>${up ? `<circle cx="${x}" cy="${f(x)}" r="6" fill="#f08c3c" stroke="var(--ch-ring)" stroke-width="2.2"/>` : ''}`).join('');
  const caps = grp.map(g => {
    const n = g.length, w = n === 1 ? 18 : 22 * n, mid = g.reduce((q, p) => q + p.x, 0) / n, cx = Math.max(PL, Math.min(337 - w / 2, mid));
    const box = n === 1 ? `<circle cx="${cx}" cy="40" r="9" fill="#f08c3c" stroke="var(--ch-ring)" stroke-width="2"/>` : `<rect x="${cx - w / 2}" y="29" width="${w}" height="22" rx="11" fill="#f08c3c" stroke="var(--ch-ring)" stroke-width="2"/>`;
    return box + g.map((p, j) => `<text x="${cx - w / 2 + (n === 1 ? 9 : 11) + j * 22}" y="44" font-size="11" font-weight="800" fill="#fff" text-anchor="middle">${p.k + 1}</text>`).join('');
  }).join('');
  // Eje de años: solo el año (sin "Hoy"), con una marca en el eje bajo cada uno
  // Se priorizan los años de las metas; el año de partida solo se muestra si no estorba
  let lastLab = -99;
  const yrs = hp.map(p => ({ x: p.x, y: p.h.anio, c: '#d9721c' })).filter(q => { if (q.x - lastLab < 34) return false; lastLab = q.x; return true; });
  if (!yrs.some(q => q.x - PL < 34)) yrs.unshift({ x: PL, y: y0, c: 'var(--ch-txt)' });
  const axis = yrs.map(q => `<line x1="${q.x}" y1="170" x2="${q.x}" y2="176" stroke="var(--ch-txt)" stroke-width="1.5"/><text x="${q.x}" y="190" font-size="11" fill="${q.c}" font-weight="700" text-anchor="middle">${q.y}</text>`).join('');
  const hitosSvg = lines + caps + axis;
  const badge = (y, txt, col) => `<g><rect x="${PR + 6}" y="${y - 11}" width="40" height="22" rx="11" fill="${col}"/><text x="${PR + 26}" y="${y + 4}" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">${txt}</text></g>`;
  let cur = '';
  if (S.cur != null) {
    const x = Math.max(PL, Math.min(PR, S.cur)), kk = (x - PL) / W, sc = b + (nb - b) * kk * kk * (3 - 2 * kk), yr = Math.round(y0 + (x - PL) / W * (y1 - y0)), vi = f(x);
    const tw = up ? 96 : 64, tx = Math.max(2, Math.min(338 - tw, x - tw / 2));
    cur = `<line x1="${x}" y1="50" x2="${x}" y2="170" stroke="var(--ch-cur)" stroke-width="1.5" stroke-opacity=".5"/>
      <circle cx="${x}" cy="${by}" r="5" fill="var(--ch-base)" stroke="var(--ch-ring)" stroke-width="2"/>${up ? `<circle cx="${x}" cy="${vi}" r="6" fill="#2f9a8a" stroke="var(--ch-ring)" stroke-width="2"/>` : ''}
      <rect x="${tx}" y="1" width="${tw}" height="29" rx="9" fill="var(--ch-tip)"/>
      <text x="${tx + 9}" y="13" font-size="10" font-weight="800" fill="#fff">${yr}</text>
      <circle cx="${tx + 12}" cy="22" r="3.5" fill="#9ca3af"/><text x="${tx + 20}" y="25" font-size="10" fill="#fff">${Math.round(b)}</text>
      ${up ? `<circle cx="${tx + 54}" cy="22" r="3.5" fill="#2f9a8a"/><text x="${tx + 62}" y="25" font-size="10" font-weight="800" fill="#fff">${Math.round(sc)}</text>` : ''}`;
  }
  $('#chart').innerHTML = `<defs>
      <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f9a8a" stop-opacity=".5"/><stop offset="1" stop-color="#2f9a8a" stop-opacity=".06"/></linearGradient>
      <linearGradient id="gL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f9a8a"/><stop offset="1" stop-color="#27b39b"/></linearGradient>
      <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ch-m1)"/><stop offset="1" stop-color="var(--ch-m2)"/></linearGradient></defs>
    <rect x="${PL}" y="50" width="${W}" height="120" rx="6" fill="var(--ch-bg)"/>
    <polygon points="${PL},170 ${PL},112 80,88 105,110 150,64 190,102 225,82 262,104 ${PR},78 ${PR},170" fill="url(#gM)"/>
    ${[lo, lo + 25, hi].map(s => `<line x1="${PL}" y1="${Y(s)}" x2="${PR}" y2="${Y(s)}" stroke="var(--ch-grid)" stroke-dasharray="3 4"/><text x="${PL - 6}" y="${Y(s) + 4}" font-size="10" fill="#6b7280" text-anchor="end">${Math.round(s)}</text>`).join('')}
    <text x="9" y="110" font-size="11" fill="#6b7280" text-anchor="middle" transform="rotate(-90 9 110)">${t('yAxis')}</text>
    ${up ? `<polygon points="${pts} ${PR},${by} ${PL},${by}" fill="url(#gA)"/>` : ''}
    <line x1="${PL}" y1="${by}" x2="${PR}" y2="${by}" stroke="var(--ch-base)" stroke-width="2.4"/>
    ${up ? `<polyline points="${pts}" fill="none" stroke="url(#gL)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    <line x1="${PL}" y1="170" x2="${PR}" y2="170" stroke="#9ca3af"/>
    ${hitosSvg}
    ${badge(by, Math.round(b), 'var(--ch-base)')}${up ? badge(iy, Math.round(nb), '#2f9a8a') : ''}
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
          tiempo: S.tiempo, persona: persona(), idioma: lang
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
  const who = +block.dataset.who; S.m[who] = v + 1; S.touched = true; document.querySelectorAll('.mood,.shint').forEach(x => x.classList.add('touched'));
  const lit = v % 2 === 0 ? v / 2 : -1;
  block.querySelectorAll('.dp').forEach((d, i) => { d.classList.toggle('on', i === v); d.setAttribute('aria-checked', i === v); });
  block.querySelectorAll('.face-b').forEach((d, j) => d.classList.toggle('on', j === lit));
  block.querySelectorAll('.mlab span').forEach((d, j) => d.classList.toggle('on', j === lit));
}
const act = {
  mood: b => setMoodPos(b.closest('.mood'), +b.dataset.v),
  tiempo: b => { S.tiempo = b.dataset.v; document.querySelectorAll('.rit').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); },
  begin: () => { S.screen = hasPair() ? 5 : 0; render(); },
  mode: b => { if (S.mode !== b.dataset.v) { S.mode = b.dataset.v; S.who = null; resetMood(); } render(); },
  who: b => { if (S.who !== +b.dataset.v) { S.who = +b.dataset.v; resetMood(); } render(); },
  toMood: () => { if (!S.mode || (S.mode === 'solo' && S.who == null)) return; S.screen = 0; render(); },
  toPace: () => { S.screen = 4; render(); },
  go: () => load(),
  back: () => { const to = { 5: -2, 0: hasPair() ? 5 : -2, 4: 0, 3: 2, 2: 4, '-1': 4 }[S.screen]; if (to == null) return; S.screen = to; S.flip = false; render(); },
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
$('#back').addEventListener('click', () => act.back());
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
  if (e.target.id === 'caso') { S.caso = e.target.value; S.mode = null; S.who = null; resetMood(); S.opts = true; render(); $('#caso')?.focus(); }   // cambia entre 1 y 2 selectores
});
app.addEventListener('toggle', e => {
  if (e.target.matches?.('details.opts')) S.opts = e.target.open;
  else if (e.target.closest?.('.face.back') && e.target.open) setTimeout(() => e.target.scrollIntoView({ block: 'nearest', behavior: reduceMo ? 'auto' : 'smooth' }), 60);
}, true);
const reduceMo = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
const advisorCtx = () => {   // lo que el asesor necesita saber: si son pareja y cómo se sienten
  const L = t('moods'), lab = v => `${L[FACE[v - 1]].toLowerCase()} (${v}/5)`, cp = isCouple() ? COUPLES[S.caso] : null, st = S.data?.siguiente_paso?.titulo || '';
  return cp ? t('ctxCouple', cp[0], lab(S.m[0]), cp[1], lab(S.m[1]), st) : (soloName() ? t('ctxWho', soloName()) + ' ' : '') + t('ctxSingle', lab(S.m[0]));
};
function openCita(url) {
  const mail = parseMail(url); mail.body = (mail.body + '\n\n' + advisorCtx()).trim();
  const d0 = new Date(); d0.setDate(d0.getDate() + 2); while ([0, 6].includes(d0.getDay())) d0.setDate(d0.getDate() + 1);
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
        body: JSON.stringify({ case_id: S.caso, animo: S.m[0], animo_pareja: couple ? S.m[1] : null, nombres: couple ? COUPLES[S.caso] : null, persona: persona(), idioma: S.lang, mensajes: hist })
      });
      if (!r.ok) throw new Error(r.status);
      j = await r.json();
    }
    S.msgs.push({ role: 'assistant', content: j.respuesta, url: j.derivar_asesor ? j.asesor_url : null });
    if (S.voz) speak(j.respuesta);
  } catch (e) { S.msgs.push({ role: 'assistant', content: t('connErr') }); }
  S.wait = false; renderChat();
}
let audio = null;
const stopVoice = () => { if (audio) { audio.pause(); audio = null; } if ('speechSynthesis' in window) speechSynthesis.cancel(); $('#vozbtn').classList.remove('busy'); };
// Plan B si el servidor de voz no responde: la voz más natural que tenga el navegador para el idioma
function bestVoice() {
  if (!('speechSynthesis' in window)) return null;
  const lang = t('speech'), score = v => (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google|microsoft|apple|siri|premium|enhanced/i.test(v.name) ? 2 : 0) + (v.lang === lang ? 1 : 0);
  return speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith(lang.slice(0, 2))).sort((x, y) => score(y) - score(x))[0] || null;
}
const browserSpeak = txt => { if (!('speechSynthesis' in window)) return; const u = new SpeechSynthesisUtterance(txt); u.lang = t('speech'); u.rate = .96; const v = bestVoice(); if (v) u.voice = v; speechSynthesis.speak(u); };
async function speak(txt) {
  stopVoice();
  if (USE_ELEVEN && !MOCK) {
    $('#vozbtn').classList.add('busy');
    try {
      const r = await fetch(API + '/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: txt.slice(0, 1000), idioma: S.lang }) });
      if (!r.ok) throw new Error(r.status);
      const blob = await r.blob(); if (!S.voz) return;       // se silenció mientras llegaba el audio
      const url = URL.createObjectURL(blob), a = new Audio(url); audio = a;
      a.onended = () => { URL.revokeObjectURL(url); if (audio === a) audio = null; };
      $('#vozbtn').classList.remove('busy');
      await a.play(); return;
    } catch (e) { audio = null; console.warn('Voz natural no disponible, uso la del navegador', e); }
    $('#vozbtn').classList.remove('busy');
  }
  if (S.voz) browserSpeak(txt);
}
const setVoz = v => { S.voz = v; $('#vozbtn').classList.toggle('mute', !v); if (!v) stopVoice(); };
const lastAnswer = () => [...S.msgs].reverse().find(m => m.role === 'assistant')?.content || t('welcome');
function openChat() {
  $('#chat').inert = false; $('#chat').classList.add('open'); $('#scrim').classList.add('open'); document.body.classList.add('chat-open');
  renderChat(); setTimeout(() => $('#cinp').focus({ preventScroll: true }), 380);
}
function closeChat() {
  $('#chat').classList.remove('open'); $('#scrim').classList.remove('open'); document.body.classList.remove('chat-open'); $('#chat').inert = true;
  stopVoice();
}
$('#scrim').onclick = $('#cx').onclick = closeChat;
$('#vozbtn').onclick = () => { if (S.voz) return setVoz(false); setVoz(true); speak(lastAnswer()); };   // al activarlo lee ya la última respuesta; las siguientes también
$('#snd').onclick = () => { send($('#cinp').value); $('#cinp').value = ''; };
$('#cinp').onkeydown = e => { if (e.key === 'Enter') $('#snd').click(); };

// Botón de la asistente: fijo (arriba, junto a ES/EN); un toque abre el chat
// Menú (tres rayitas): idioma, asistente y modo oscuro
const mpanel = $('#mpanel'), menuBtn = $('#menu');
const setMenu = o => { mpanel.hidden = !o; menuBtn.setAttribute('aria-expanded', o); };
menuBtn.addEventListener('click', e => { e.stopPropagation(); setMenu(mpanel.hidden); });
document.addEventListener('click', e => { if (!mpanel.hidden && !mpanel.contains(e.target)) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mpanel.hidden) { setMenu(false); menuBtn.focus(); } });
$('#ask').addEventListener('click', () => { setMenu(false); openChat(); });
const setTheme = d => { document.documentElement.dataset.theme = d ? 'dark' : 'light'; $('#dark').setAttribute('aria-checked', d); try { localStorage.setItem('theme', d ? 'dark' : 'light'); } catch { } };
$('#dark').addEventListener('click', () => setTheme($('#dark').getAttribute('aria-checked') !== 'true'));
{ let th = 'light'; try { th = localStorage.getItem('theme') || 'light'; } catch { } setTheme(th === 'dark'); }

// ───── Idioma (interfaz + textos que genera la IA)
function applyStatic() {
  document.documentElement.lang = S.lang;
  $('.chead h2').textContent = t('chatTitle');
  $('#chat').setAttribute('aria-label', t('assistant'));
  $('#back').setAttribute('aria-label', t('back'));
  menuBtn.setAttribute('aria-label', t('menuAria')); $('#mlang').textContent = t('menuLang'); $('#mask').textContent = t('menuAsk'); $('#mdark').textContent = t('menuDark'); $('#ask').setAttribute('aria-label', t('openAssistant'));
  $('#vozbtn').setAttribute('aria-label', t('voiceAria'));
  $('#cx').setAttribute('aria-label', t('close'));
  $('#cinp').placeholder = t('chatPh'); $('#cinp').setAttribute('aria-label', t('chatPh'));
  $('#snd').setAttribute('aria-label', t('send'));
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
