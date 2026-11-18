import { data } from './mockData';

function App() {
  const descargarRecordatorio = () => {
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Aprobar plan de ahorro Sherpas\nDESCRIPTION:Recordatorio para entrar a Sherpas y activar el traspaso para la casa.\nDTSTART:20261125T100000Z\nDTEND:20261125T103000Z\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sherpas-recordatorio.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans pb-10">
      
      {/* 1. HEADER Y BIENVENIDA */}
      <header className="p-6 text-center pt-12">
        <h2 className="text-sm font-bold text-blue-900 tracking-widest uppercase mb-6">Sherpas Lens</h2>
        <h1 className="text-4xl font-extrabold text-blue-600 mb-4">$180,000 / año</h1>
        <p className="text-xl text-gray-600 font-medium mb-10">{data.frase_inicial}</p>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-2">¿Cómo te sientes hoy con tus finanzas?</p>
          <button className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-blue-50 transition">😥 Abrumado, quiero ir paso a paso</button>
          <button className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-blue-50 transition">🤔 Tranquilo, pero con dudas</button>
          <button className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-blue-50 transition">🚀 Confiado, vamos al grano</button>
        </div>
      </header>

      {/* 2. RECORRIDO 90s (ACORDEONES) */}
      <section className="p-6 mt-8">
        <h3 className="text-lg font-bold mb-4 border-b pb-2">Tu diagnóstico en 90s</h3>
        <div className="space-y-4">
          {data.tarjetas.map((item, index) => (
            <details key={index} className="group bg-white border border-gray-200 rounded-xl shadow-sm p-4 cursor-pointer">
              <summary className="font-semibold text-lg list-none flex justify-between items-center">
                {item.frente}
                <span className="text-blue-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-gray-600 leading-relaxed border-t pt-3">
                {item.reverso}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* 3. MAPA DE VIDA */}
      <section className="p-6 mt-4">
        <h3 className="text-lg font-bold mb-6">Tu Mapa de Vida</h3>
        <div className="ml-4 border-l-2 border-blue-200 space-y-8">
          {data.map.hitos.map((hito, index) => (
            <div key={index} className="relative pl-6">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white"></div>
              <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded mb-1">{hito.anio}</span>
              <p className="font-medium">{hito.titulo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CIERRE Y NEXT STEP */}
      <section className="p-6 mt-8">
        <div className="bg-blue-50 rounded-xl p-5 mb-8">
          <h4 className="font-bold text-blue-900 mb-2">🏔️ Por qué Sherpas</h4>
          <p className="text-sm text-blue-800">{data.map.aviso}</p>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Tu primer paso</p>
          <button 
            onClick={descargarRecordatorio}
            className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-full shadow-lg hover:bg-blue-700 transition transform hover:scale-105"
          >
            🗓️ Agendar recordatorio
          </button>
          <p className="text-sm text-gray-500 mt-4 underline cursor-pointer">{data.siguiente_paso.titulo}</p>
          <p className="text-xs text-gray-400 mt-6 cursor-pointer">📥 Descargar informe completo (PDF)</p>
        </div>
      </section>

    </div>
  )
}

export default App;