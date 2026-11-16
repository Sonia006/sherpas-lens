import './index.css';

// ───── Configuración: dirección del backend (uvicorn main:app --port 8000)
const API = 'http://localhost:8000';

const CASOS = {
  'timothy-melanie-weah': 'Timothy y Melanie Weah',
  'michael-carter': 'Michael Carter',
  'daniel-emily-johnson': 'Daniel y Emily Johnson',
  'samantha-lewis': 'Samantha Lewis'
};
const ANIMOS = [['😟', 'Agobiado'], ['😕', 'Preocupado'], ['😐', 'Neutral'], ['🙂', 'Seguro'], ['😄', 'Confiado']];
// screen: 0 inicio · 1 cargando · 2 tarjetas · 3 simulador + siguiente paso · -1 error
const S = { screen: 0, caso: 'michael-carter', persona: '', animo: 3, tiempo: 'corto', data: null, i: 0, flip: false, vals: {}, msgs: [], voz: false };
const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');

// ───── Pantallas
function head(step, title) {
  return `<div class="top"><button class="back" data-a="back" aria-label="Volver">←</button>
  <div class="prog"><small>${title}, paso ${step} de 3</small><div class="bars">${[1, 2, 3].map(n => `<i class="${n <= step ? 'on' : ''}"></i>`).join('')}</div></div></div>`;
}

function render() {
  const d = S.data;
  if (S.screen === 0) {
    app.innerHTML = `<svg class="ridge" viewBox="0 0 440 90" aria-hidden="true"><polygon fill="#17283a" points="0,90 0,60 70,20 120,55 190,10 270,62 340,30 440,70 440,90"/><polygon fill="#23867a" points="0,90 0,75 90,48 170,72 260,40 350,70 440,52 440,90"/><polygon fill="#e3a02f" points="190,10 181,26 190,22 199,27"/></svg>
    <h1>Sherpas Lens</h1>
    <p class="lead">Dinos cómo te sientes hoy con tus finanzas para personalizar tu viaje.</p>
    <label for="caso">Familia</label>
    <select id="caso">${Object.entries(CASOS).map(([k, v]) => `<option value="${k}" ${k === S.caso ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label for="persona">¿Quién eres? (opcional)</label>
    <input type="text" id="persona" maxlength="40" placeholder="Por ejemplo, Melanie" value="${esc(S.persona)}">
    <label>Hoy me siento…</label>
    <div class="moods">${ANIMOS.map((a, i) => `<button data-a="mood" data-v="${i + 1}" class="${S.animo === i + 1 ? 'on' : ''}"><span>${a[0]}</span>${a[1]}</button>`).join('')}</div>
    <label>Cuánto tiempo tienes</label>
    <div class="seg"><button data-a="tiempo" data-v="corto" class="${S.tiempo === 'corto' ? 'on' : ''}">90 segundos</button><button data-a="tiempo" data-v="completo" class="${S.tiempo === 'completo' ? 'on' : ''}">Todo el plan</button></div>
    <button class="cta" data-a="go">Comenzar recorrido</button>`;
  } else if (S.screen === 1) {
    app.innerHTML = `<div class="center"><div class="spin"></div><h2>Preparando tu recorrido</h2><p class="lead">Estamos leyendo tu plan.</p></div>`;
  } else if (S.screen === -1) {
    app.innerHTML = `<div class="center"><h2>No hemos podido cargar tu plan</h2><p class="lead">Comprueba que el backend está encendido en ${esc(API)} y vuelve a intentarlo.</p><button class="cta" data-a="go">Reintentar</button><button class="cta alt" data-a="back">Volver al inicio</button></div>`;
  } else if (S.screen === 2) {
    const t = d.tarjetas[S.i], h = d.mapa.hitos.find(x => x.id === t.meta_id), last = S.i === d.tarjetas.length - 1;
    app.innerHTML = `${head(2, 'Diagnóstico')}
    ${S.fallback ? '<div class="warn">Mostramos una versión guardada de tu resumen.</div>' : ''}
    <p class="lead">${esc(d.frase_inicial)}</p>
    <div class="card ${S.flip ? 'flip' : ''}" data-a="flip" tabindex="0" role="button" aria-label="Girar tarjeta"><div class="inner">
      <div class="face front">${h ? `<span class="chip">Hacia: ${esc(h.titulo)} (${h.anio})</span>` : ''}<h2>${esc(t.frente)}</h2><small>Toca la tarjeta para ver más</small></div>
      <div class="face back"><p>${esc(t.reverso)}</p>${t.detalle ? `<details><summary>Para ir más a fondo</summary><p>${esc(t.detalle)}</p></details>` : ''}</div>
    </div></div>
    <div class="nav"><button data-a="prev" ${S.i === 0 ? 'disabled' : ''}>Anterior</button><span>${S.i + 1} de ${d.tarjetas.length}</span>
    <button data-a="${last ? 'sim' : 'next'}">${last ? 'Ver mi futuro' : 'Siguiente'}</button></div>`;
  } else if (S.screen === 3) {
    const m = d.mapa, n = d.siguiente_paso;
    app.innerHTML = `${head(3, 'Visualización')}
    <h2>¿Y si cambias algo hoy?</h2>
    <div class="sim"><div class="score" id="score"></div><svg class="chart" id="chart" viewBox="0 0 340 190" role="img" aria-label="Comparación entre seguir igual y hacer cambios"></svg>
    ${m.palancas.map(p => `<div class="lev"><div><label for="lv_${p.id}" style="margin:0">${esc(p.etiqueta)}</label><b id="v_${p.id}"></b></div>
      <input type="range" id="lv_${p.id}" data-lv="${p.id}" min="${p.min}" max="${p.max}" step="${p.paso}" value="${S.vals[p.id] || 0}"></div>`).join('')}
    ${m.hitos.length ? `<ul class="h">${m.hitos.map(h => `<li><b>${h.anio}</b>${esc(h.titulo)}</li>`).join('')}</ul>` : ''}
    <p class="note">${esc(m.aviso)}</p></div>
    <div class="next"><h3>${esc(n.titulo)}</h3>
      <p>${esc(n.razon)}${n.minutos ? ` Te llevará unos ${n.minutos} minutos.` : ''}</p>
      ${n.pasos.map(p => `<label><input type="checkbox"> ${esc(p)}</label>`).join('')}
      <a class="cta amber" href="${esc(n.acciones.calendario_url)}" target="_blank" rel="noopener">Añadir a mi calendario</a>
      <a class="cta alt" href="${esc(n.acciones.asesor_url)}">Hablar con un asesor</a>
      <button class="cta alt" data-a="pdf">Guardar mi informe (PDF)</button></div>`;
    updSim();
  }
}

// ───── Simulador
const fmt = (p, v) => p.unidad === '$' ? '$' + v : v + ' ' + p.unidad;
function delta() { return S.data.mapa.palancas.reduce((s, p) => s + (S.vals[p.id] || 0) * p.puntos_por_unidad, 0); }
function updSim() {
  const m = S.data.mapa, base = m.score_base, dl = Math.round(delta() * 10) / 10;
  const b = base ?? 50, nb = Math.min(100, b + dl);
  m.palancas.forEach(p => { $('#v_' + p.id).textContent = fmt(p, S.vals[p.id] || 0); });
  $('#score').innerHTML = base != null
    ? `<span>Puntuación estimada</span><span>${Math.round(b)} → <b>${Math.round(nb)}</b></span>`
    : `<span>Mejora estimada</span><b>+${dl}</b>`;
  const y0 = new Date().getFullYear(), ys = m.hitos.map(h => h.anio), y1 = Math.max(y0 + 1, ...ys);
  const X = y => 20 + (y - y0) / (y1 - y0) * 300, Y = s => 150 - s / 100 * 120;
  const f = x => { const t = (x - 20) / 300, k = t * t * (3 - 2 * t); return Y(b) + (Y(nb) - Y(b)) * k; };
  const pts = Array.from({ length: 31 }, (_, i) => { const x = 20 + i * 10; return x + ',' + f(x).toFixed(1); }).join(' ');
  $('#chart').innerHTML = `<line x1="20" y1="${Y(b)}" x2="320" y2="${Y(b)}" stroke="#9aa9b3" stroke-dasharray="5 4" stroke-width="2"/>
    <text x="22" y="${Y(b) + 16}" font-size="11" fill="#5d6b76">Si sigues igual</text>
    <polyline points="${pts}" fill="none" stroke="#23867a" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="20" y1="165" x2="320" y2="165" stroke="#c5d3d3"/>
    <text x="20" y="182" font-size="11" fill="#5d6b76">${y0}</text>
    ${m.hitos.map(h => { const x = X(h.anio); return `<line x1="${x}" y1="${f(x) + 4}" x2="${x}" y2="165" stroke="#e3a02f" stroke-dasharray="2 3"/><circle cx="${x}" cy="${f(x)}" r="5.5" fill="#e3a02f"/><text x="${x}" y="182" font-size="11" fill="#12202c" text-anchor="middle">${h.anio}</text>`; }).join('')}`;
}

// ───── Carga del resumen
async function load() {
  S.screen = 1; render();
  try {
    const r = await fetch(API + '/generar-resumen', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: S.caso, estado_animo: String(S.animo), tiempo_disponible: S.tiempo, persona: S.persona.trim() || null, idioma: 'es' })
    });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    S.data = j.resultado; S.fallback = j.status === 'fallback'; S.i = 0; S.flip = false; S.vals = {};
    S.data.mapa.palancas.forEach(p => S.vals[p.id] = 0);
    S.screen = 2;
  } catch (e) { console.error(e); S.screen = -1; }
  render();
}

// ───── Eventos
const act = {
  mood: b => { S.animo = +b.dataset.v; render(); },
  tiempo: b => { S.tiempo = b.dataset.v; render(); },
  go: load,
  back: () => { S.screen = S.screen === 3 ? 2 : 0; S.flip = false; render(); },
  flip: b => { S.flip = !S.flip; b.classList.toggle('flip', S.flip); },
  next: () => { S.i++; S.flip = false; render(); },
  prev: () => { S.i--; S.flip = false; render(); },
  sim: () => { S.screen = 3; render(); window.scrollTo(0, 0); },
  pdf: () => window.print()
};
app.addEventListener('click', e => {
  if (e.target.closest('details')) return;
  const b = e.target.closest('[data-a]'); if (b) act[b.dataset.a](b);
});
app.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.a === 'flip') { e.preventDefault(); act.flip(e.target); } });
app.addEventListener('input', e => {
  if (e.target.id === 'persona') S.persona = e.target.value;
  if (e.target.dataset.lv) { S.vals[e.target.dataset.lv] = +e.target.value; updSim(); }
});
app.addEventListener('change', e => { if (e.target.id === 'caso') S.caso = e.target.value; });

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
  const hist = S.msgs.slice(-12).map(m => ({ role: m.role, content: m.content }));
  hist[hist.length - 1].content = (ctxNote() + text).slice(0, 2000);
  try {
    const r = await fetch(API + '/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: S.caso, estado_animo: String(S.animo), persona: S.persona.trim() || null, idioma: 'es', mensajes: hist })
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