import './index.css';

// ───── Dirección del backend (uvicorn main:app --reload --port 8000). Se puede cambiar con VITE_API_URL
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CASOS = {
  'timothy-melanie-weah': 'Timothy y Melanie Weah',
  'michael-carter': 'Michael Carter',
  'daniel-emily-johnson': 'Daniel y Emily Johnson',
  'samantha-lewis': 'Samantha Lewis'
};
// screen: 0 inicio · 1 cargando · 2 tarjetas · 3 visualización + next step · -1 error
// animo (backend): 1 = abrumado ... 5 = confiado. En el slider, la izquierda es "Confiado".
const S = { screen: 0, caso: 'michael-carter', persona: '', animo: 3, tiempo: 'corto', data: null, i: 0, flip: false, vals: {}, msgs: [], voz: false, err: '' };
const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');

// ───── MODO MOCK: true = datos de prueba, NO llama al backend ni gasta tokens. Pon false para usar la IA real.
const MOCK = true;
const mockResult = () => ({
  frase_inicial: S.animo <= 2 ? 'Vamos paso a paso, sin prisa.' : S.animo === 3 ? 'Tienes una base sólida, veamos qué mejorar.' : 'Vas muy bien, afinemos los detalles.',
  tarjetas: [
    { frente: 'Crear un colchón de emergencia', reverso: 'Tener 3 meses de gastos guardados te protege de imprevistos.', detalle: 'Texto largo de prueba para el desplegable "Para ir más a fondo".', meta_id: null },
    { frente: 'Reducir la deuda de la tarjeta', reverso: 'Cada mes que pasa pagas intereses de más.', detalle: '', meta_id: null },
    { frente: 'Aumentar el ahorro para la jubilación', reverso: 'Pequeñas aportaciones hoy pesan mucho al final.', detalle: '', meta_id: null },
    { frente: 'Revisar tu seguro de vida', reverso: 'Tu familia depende de tus ingresos.', detalle: '', meta_id: null },
    { frente: 'Diversificar tus inversiones', reverso: 'No pongas todo en un mismo sitio.', detalle: '', meta_id: null }
  ].slice(0, S.tiempo === 'completo' ? 5 : S.animo <= 2 ? 2 : 3),
  mapa: {
    score_base: 60,
    hitos: [{ id: 'h1', anio: 2028, titulo: 'Comprar casa' }, { id: 'h2', anio: 2040, titulo: 'Jubilarme a los 62' }],
    palancas: [
      { id: 'ahorro_mensual', etiqueta: 'Ahorro mensual extra', unidad: '$', min: 0, max: 1000, paso: 50, puntos_por_unidad: 0.01 },
      { id: 'anos_extra_trabajando', etiqueta: 'Años extra trabajando', unidad: 'años', min: 0, max: 5, paso: 1, puntos_por_unidad: 2 }
    ],
    aviso: 'Simulador ilustrativo (datos de prueba).'
  },
  siguiente_paso: { titulo: 'Automatiza tu ahorro', razon: 'Es lo que más mueve tu meta.', minutos: 15,
    pasos: ['Abre la app de tu banco', 'Programa una transferencia mensual'],
    acciones: { calendario_url: 'https://calendar.google.com', asesor_url: 'mailto:asesor@example.com' } }
});

// ───── Pantallas
function head(n, title) {
  return `<header class="hd"><button class="bk" data-a="back" aria-label="Volver">←</button>
  <div class="hc"><div class="brand">SHERPAS</div><div class="sub">${title} — paso ${n} de 3</div>
  <div class="steps">${[1, 2, 3].map(k => `<i class="${k === n ? 'cur' : k < n ? 'done' : ''}"></i>`).join('')}</div></div></header>`;
}

function render() {
  const d = S.data;
  if (S.screen === 0) {
    const idx = 5 - S.animo;
    app.innerHTML = `<h1 class="title">SHERPAS LENS</h1>
    <p class="lead">Un recorrido de 90 segundos por tu plan financiero, adaptado a cómo te sientes hoy.</p>
    <p class="ask">Dinos cómo te sientes hoy con tus finanzas para personalizar tu viaje:</p>
    <div class="mood">
      <div class="g5 faces"><span style="grid-column:1">😄</span><span style="grid-column:3">😐</span><span style="grid-column:5">😟</span></div>
      <div class="g5 track" role="radiogroup" aria-label="Cómo te sientes hoy">${[0, 1, 2, 3, 4].map(i => `<button class="dot ${i === idx ? 'on' : ''}" role="radio" aria-checked="${i === idx}" data-a="mood" data-v="${i}" aria-label="Posición ${i + 1} de 5"></button>`).join('')}</div>
      <div class="g5 mlab"><span style="grid-column:1">Confiado</span><span style="grid-column:3">Tranquilo</span><span style="grid-column:5">Abrumado</span></div>
    </div>
    <button class="cta" data-a="go">Comenzar recorrido →</button>
    <p class="cap">Guiado y rápido</p>
    <details class="opts"><summary>Opciones de la demo</summary>
      <label for="caso">Familia</label>
      <select id="caso">${Object.entries(CASOS).map(([k, v]) => `<option value="${k}" ${k === S.caso ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <label for="persona">¿Quién eres? (opcional)</label>
      <input type="text" id="persona" maxlength="40" placeholder="Por ejemplo, Melanie" value="${esc(S.persona)}">
      <label>Tiempo</label>
      <div class="seg"><button data-a="tiempo" data-v="corto" class="${S.tiempo === 'corto' ? 'on' : ''}">90 segundos</button><button data-a="tiempo" data-v="completo" class="${S.tiempo === 'completo' ? 'on' : ''}">Todo el plan</button></div>
    </details>`;
  } else if (S.screen === 1) {
    app.innerHTML = `<div class="center"><div class="spin"></div><h2>Preparando tu recorrido</h2><p class="lead">Estamos leyendo tu plan.</p></div>`;
  } else if (S.screen === -1) {
    app.innerHTML = `<div class="center"><h2>No hemos podido cargar tu plan</h2><p class="lead">Comprueba que el backend está encendido en ${esc(API)} y vuelve a intentarlo.</p><p class="note">Detalle: ${esc(S.err)}</p><button class="cta" data-a="go">Reintentar</button><button class="cta alt" data-a="back">Volver al inicio</button></div>`;
  } else if (S.screen === 2) {
    const n = d.tarjetas.length, t = d.tarjetas[S.i], goal = d.mapa.hitos.at(-1);
    const paso = d.siguiente_paso.pasos[0] || d.siguiente_paso.titulo;
    app.innerHTML = `${head(2, 'Diagnóstico')}
    <div class="meta"><b>META:</b><p>${esc(goal ? `${goal.titulo} (${goal.anio})` : d.frase_inicial)}</p></div>
    ${S.fallback ? '<div class="warn">Mostramos una versión guardada de tu resumen.</div>' : ''}
    ${S.i === 0 && goal ? `<p class="lead">${esc(d.frase_inicial)}</p>` : ''}
    <div class="card ${S.flip ? 'flip' : ''}" data-a="flip" tabindex="0" role="button" aria-label="Girar tarjeta"><div class="inner">
      <div class="face front"><div class="tab">OBJETIVO ${S.i + 1}</div><div class="body"><h2>${esc(t.frente)}</h2></div><small>(Pulsa para ver más info)</small></div>
      <div class="face back"><div class="tab">OBJETIVO ${S.i + 1}</div><div class="body"><p>${esc(t.reverso)}</p>${t.detalle ? `<details><summary>Para ir más a fondo</summary><p>${esc(t.detalle)}</p></details>` : ''}</div></div>
    </div></div>
    <div class="nav"><button data-a="prev" aria-label="Anterior" ${S.i === 0 ? 'disabled' : ''}>‹</button><span>${S.i + 1} de ${n}</span><button data-a="next" aria-label="Siguiente" ${S.i === n - 1 ? 'disabled' : ''}>›</button></div>
    <div class="paso"><b>PASO 1</b><span>${esc(paso)}</span></div>
    <p class="cap">Siguiente paso</p>
    <button class="cta" data-a="sim">Pasar a visualizarlo →</button>`;
  } else if (S.screen === 3) {
    const m = d.mapa, n = d.siguiente_paso;
    app.innerHTML = `${head(3, 'Visualización')}
    <div class="sim"><div class="score" id="score"></div>
      <svg class="chart" id="chart" viewBox="0 0 340 200" role="img" aria-label="Comparación entre seguir igual y hacer cambios"></svg>
      ${m.hitos.length ? `<ul class="h">${m.hitos.map(h => `<li><b>${h.anio}</b>${esc(h.titulo)}</li>`).join('')}</ul>` : ''}</div>
    <div class="ctl">${m.palancas.map(p => `<div class="row"><span>${esc(p.etiqueta)}</span>
      <div class="val"><output id="v_${p.id}"></output><div class="pm"><button data-a="lv" data-id="${p.id}" data-d="1" aria-label="Más ${esc(p.etiqueta)}">+</button><button data-a="lv" data-id="${p.id}" data-d="-1" aria-label="Menos ${esc(p.etiqueta)}">−</button></div></div></div>`).join('')}
      <p class="note">${esc(m.aviso)}</p></div>
    <p class="info">Para más información: <a href="${esc(n.acciones.asesor_url)}">Programar cita con asesor ✉</a></p>
    <div class="next"><h3>NEXT STEP</h3>
      <p><b>${esc(n.titulo)}</b>${n.razon ? ' ' + esc(n.razon) : ''}${n.minutos ? ` (unos ${n.minutos} min)` : ''}</p>
      ${n.pasos.map(p => `<label><input type="checkbox"> ${esc(p)}</label>`).join('')}
      <a class="cta amber" href="${esc(n.acciones.calendario_url)}" target="_blank" rel="noopener">Activar plan de ahorro →</a>
      <button class="dl" data-a="pdf">Descargar informe completo (PDF) ⬇</button></div>`;
    updSim();
  }
}

// ───── Simulador (los coeficientes son ilustrativos y vienen del backend)
const fmt = (p, v) => p.unidad === '$' ? '$' + v : v + ' ' + p.unidad;
function delta() { return S.data.mapa.palancas.reduce((s, p) => s + (S.vals[p.id] || 0) * p.puntos_por_unidad, 0); }
function updSim() {
  const m = S.data.mapa, base = m.score_base, dl = Math.round(delta() * 10) / 10;
  const b = base ?? 50, nb = Math.min(100, b + dl);
  m.palancas.forEach(p => { $('#v_' + p.id).textContent = fmt(p, S.vals[p.id] || 0); });
  $('#score').innerHTML = base != null
    ? `<span>Puntuación estimada</span><span>${Math.round(b)} → <b>${Math.round(nb)}</b></span>`
    : `<span>Mejora estimada</span><b>+${dl}</b>`;
  const y0 = new Date().getFullYear(), y1 = Math.max(y0 + 1, ...m.hitos.map(h => h.anio));
  const X = y => 20 + (y - y0) / (y1 - y0) * 300, Y = s => 165 - s / 100 * 125;
  const f = x => { const t = (x - 20) / 300, k = t * t * (3 - 2 * t); return Y(b) + (Y(nb) - Y(b)) * k; };
  const pts = Array.from({ length: 31 }, (_, i) => { const x = 20 + i * 10; return x + ',' + f(x).toFixed(1); }).join(' ');
  const fy = f(320);
  $('#chart').innerHTML = `<polygon points="0,175 0,120 45,80 80,112 140,48 200,108 250,78 300,104 340,86 340,175" fill="#dfeaea"/>
    <polygon points="0,175 0,142 60,112 120,140 190,94 260,137 340,114 340,175" fill="#cfe0e0"/>
    <g fill="#fff"><circle cx="276" cy="34" r="10"/><circle cx="291" cy="30" r="13"/><circle cx="306" cy="36" r="9"/></g>
    <line x1="20" y1="${Y(b)}" x2="320" y2="${Y(b)}" stroke="#7d8d98" stroke-dasharray="5 4" stroke-width="2"/>
    <text x="22" y="${Y(b) + 15}" font-size="11" fill="#3e4c57">Si sigues igual</text>
    <polyline points="${pts}" fill="none" stroke="#23867a" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="320" y1="${fy}" x2="320" y2="${fy - 24}" stroke="#17283a" stroke-width="2"/><polygon points="320,${fy - 24} 336,${fy - 18} 320,${fy - 12}" fill="#e3a02f"/>
    <line x1="20" y1="175" x2="320" y2="175" stroke="#9fb2b2"/>
    <text x="20" y="193" font-size="11" fill="#5d6b76">${y0}</text>
    ${m.hitos.map(h => { const x = X(h.anio); return `<circle cx="${x}" cy="${f(x)}" r="5.5" fill="#e3a02f" stroke="#fff" stroke-width="2"/><text x="${x}" y="193" font-size="11" fill="#12202c" text-anchor="middle">${h.anio}</text>`; }).join('')}`;
}

// ───── Carga del resumen (el backend espera: case_id, animo, tiempo, persona, idioma)
async function load() {
  S.screen = 1; render();
  try {
    let j;
    if (MOCK) { await new Promise(r => setTimeout(r, 400)); j = { status: 'success', resultado: mockResult() }; }
    else {
      const r = await fetch(API + '/generar-resumen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: S.caso, animo: S.animo, tiempo: S.tiempo, persona: S.persona.trim() || null, idioma: 'es' })
      });
      if (!r.ok) throw new Error('El backend respondió ' + r.status + ' ' + (await r.text()).slice(0, 200));
      j = await r.json();
    }
    S.data = j.resultado; S.fallback = j.status === 'fallback'; S.i = 0; S.flip = false; S.vals = {};
    S.data.mapa.palancas.forEach(p => S.vals[p.id] = 0);
    S.screen = 2;
  } catch (e) { console.error(e); S.err = e.message || String(e); S.screen = -1; }
  render();
}

// ───── Eventos
const act = {
  mood: b => {
    const v = +b.dataset.v; S.animo = 5 - v;
    document.querySelectorAll('.dot').forEach((d, i) => { d.classList.toggle('on', i === v); d.setAttribute('aria-checked', i === v); });
  },
  tiempo: b => { S.tiempo = b.dataset.v; document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); },
  go: load,
  back: () => { if (S.screen === 0) return; S.screen = S.screen === 3 ? 2 : 0; S.flip = false; render(); },
  flip: b => { S.flip = !S.flip; b.classList.toggle('flip', S.flip); },
  next: () => { if (S.i < S.data.tarjetas.length - 1) { S.i++; S.flip = false; render(); } },
  prev: () => { if (S.i > 0) { S.i--; S.flip = false; render(); } },
  sim: () => { S.screen = 3; render(); window.scrollTo(0, 0); },
  lv: b => {
    const p = S.data.mapa.palancas.find(x => x.id === b.dataset.id);
    S.vals[p.id] = Math.max(p.min, Math.min(p.max, (S.vals[p.id] || 0) + p.paso * +b.dataset.d));
    updSim();
  },
  pdf: () => window.print()
};
app.addEventListener('click', e => {
  if (e.target.closest('details')) return;
  const b = e.target.closest('[data-a]'); if (b) act[b.dataset.a](b);
});
app.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.a === 'flip') { e.preventDefault(); act.flip(e.target); } });
app.addEventListener('input', e => { if (e.target.id === 'persona') S.persona = e.target.value; });
app.addEventListener('change', e => { if (e.target.id === 'caso') S.caso = e.target.value; });
let tx = 0;  // deslizar para cambiar de tarjeta
app.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
app.addEventListener('touchend', e => {
  if (S.screen !== 2 || !e.target.closest('.card')) return;
  const dx = e.changedTouches[0].clientX - tx;
  if (dx < -50) act.next(); else if (dx > 50) act.prev();
});

// ───── Chat con IA
function ctxNote() {
  const d = S.data; if (!d) return '';
  if (S.screen === 2) return `[Contexto de la app: el usuario está viendo la tarjeta "${d.tarjetas[S.i].frente}"] `;
  if (S.screen === 3) return '[Contexto de la app: el usuario está en el simulador con ' + d.mapa.palancas.map(p => `${p.etiqueta} = ${fmt(p, S.vals[p.id] || 0)}`).join(', ') + '] ';
  return '';
}
function renderChat() {
  $('#msgs').innerHTML = S.msgs.length ? S.msgs.map(m => `<div class="m ${m.role}">${esc(m.content)}${m.url ? `<a href="${esc(m.url)}">Hablar con un asesor</a>` : ''}</div>`).join('')
    : '<div class="m assistant">Pregúntame lo que quieras sobre tu plan. También puedes hablarme con el micrófono.</div>';
  $('#msgs').scrollTop = 1e6;
}
async function send(text) {
  text = text.trim(); if (!text) return;
  S.msgs.push({ role: 'user', content: text }); renderChat();
  if (MOCK) { S.msgs.push({ role: 'assistant', content: 'Respuesta de prueba: aquí contestaría la IA, sin gastar tokens.' }); renderChat(); return; }
  const hist = S.msgs.slice(-12).map(m => ({ role: m.role, content: m.content }));
  hist[hist.length - 1].content = (ctxNote() + text).slice(0, 2000);
  try {
    const r = await fetch(API + '/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: S.caso, animo: S.animo, persona: S.persona.trim() || null, idioma: 'es', mensajes: hist })
    });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    S.msgs.push({ role: 'assistant', content: j.respuesta, url: j.derivar_asesor ? j.asesor_url : null });
    if (S.voz) speak(j.respuesta);
  } catch (e) { S.msgs.push({ role: 'assistant', content: 'No consigo conectar ahora mismo. Inténtalo de nuevo en un momento.' }); }
  renderChat();
}
function speak(t) { if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'es-ES'; speechSynthesis.speak(u); }
function setVoz(v) { S.voz = v; $('#vozbtn').textContent = v ? '🔊' : '🔇'; if (!v && 'speechSynthesis' in window) speechSynthesis.cancel(); }

$('#fab').onclick = () => { $('#chat').hidden = false; renderChat(); $('#cinp').focus(); };
$('#cx').onclick = () => { $('#chat').hidden = true; speechSynthesis.cancel(); };
$('#vozbtn').onclick = () => setVoz(!S.voz);
$('#snd').onclick = () => { send($('#cinp').value); $('#cinp').value = ''; };
$('#cinp').onkeydown = e => { if (e.key === 'Enter') $('#snd').click(); };

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) $('#mic').hidden = true;
else {
  const rec = new SR(); rec.lang = 'es-ES'; rec.interimResults = false;
  rec.onresult = e => { setVoz(true); send(e.results[0][0].transcript); };
  rec.onend = () => $('#mic').classList.remove('rec');
  $('#mic').onclick = () => { $('#mic').classList.add('rec'); try { rec.start(); } catch (e) { rec.stop(); } };
}

render();