import json, os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client
from openai import OpenAI

# Cargamos las claves 
load_dotenv()

# Creamos servidor web de FastAPI para visualizar los resultados
app = FastAPI(title="Sherpas Lens API", version="1.0")

# Permitimos conexiones desde el Frontend (CORS) para evitar bloqueos
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializamos el cliente de IA apuntando al proxy del hackathon
llm = OpenAI(
    base_url="https://llm-hackathon.sherpaswealth.com/v1",
    api_key=os.environ["TEAM_KEY"]
)

# Función auxiliar para extraer datos del servidor MCP de Sherpas
async def leer_caso_mcp(case_id: str, part: str, section: str = None):
    http = create_mcp_http_client(headers={"Authorization": f"Bearer {os.environ['MCP_TOKEN']}"})
    async with streamable_http_client(os.environ["MCP_URL"], http_client=http) as (read, write, *_):
        async with ClientSession(read, write) as mcp:
            await mcp.initialize()
            args = {"caseId": case_id, "part": part}
            if section:
                args["section"] = section
            r = await mcp.call_tool("get_case", args)
            
            texto_respuesta = r.content[0].text
            # Intentamos leerlo como JSON; si falla (porque es texto plano), devolvemos el texto directamente
            try:
                datos_json = json.loads(texto_respuesta)
                return datos_json.get("value", datos_json)
            except json.JSONDecodeError:
                return texto_respuesta

# Estructura de los datos que enviará tu compañera desde el Frontend móvil
class MinitestRequest(BaseModel):
    case_id: str          # Ej: "michael-carter"
    estado_animo: str     # Ej: "ansioso", "confiado", "perdido"
    tiempo_disponible: str # Ej: "90s" o "completo"

# Funcion para generar el resumen de IA
@app.post("/generar-resumen")
async def generar_resumen(datos: MinitestRequest):
    # Obtenemos los datos financieros y el perfil psicológico del caso desde Sherpas
    salud_financiera = await leer_caso_mcp(datos.case_id, "financial-health", "narrative")
    perfil_persona = await leer_caso_mcp(datos.case_id, "persona")
    
    # Ejemplo de Prompt adaptado al estado de ánimo del usuario
    prompt_sistema = f"""
    Eres el motor de 'Sherpas Lens', un asesor financiero empático y visual.
    El usuario ha indicado que se siente '{datos.estado_animo}' y tiene un nivel de disponibilidad '{datos.tiempo_disponible}'.
    Adapta el tono de tu respuesta a su estado emocional.
    
    Usa la siguiente información del cliente:
    - PERFIL: {json.dumps(perfil_persona)}
    - SALUD FINANCIERA: {json.dumps(salud_financiera)}
    
    Devuelve la respuesta estructurada que cubra:
    1. Una frase de enganche empática.
    2. Un resumen claro y sin tecnicismos.
    3. Su 'Next Step' (una única acción inmediata recomendada para hoy).
    """
    
    # Llamada al modelo de IA a través del proxy
    respuesta = llm.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "system", "content": prompt_sistema}]
    )
    
    # Datos que enviamos al frontend
    return {
        "status": "success",
        "case_id": datos.case_id,
        "resultado_ia": respuesta.choices[0].message.content
    }