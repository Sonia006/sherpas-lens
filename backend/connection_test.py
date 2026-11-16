import asyncio, json, os
from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client
from openai import OpenAI

# Cargamos las claves 
load_dotenv()

async def probar_todo():
    print("Conectando con el servidor MCP de Sherpas...")
    http = create_mcp_http_client(headers={"Authorization": f"Bearer {os.environ['MCP_TOKEN']}"})
    
    async with streamable_http_client(os.environ["MCP_URL"], http_client=http) as (read, write, *_):
        async with ClientSession(read, write) as mcp:
            await mcp.initialize()
            
            # Pedimos los datos del caso de Michael Carter como prueba
            r = await mcp.call_tool("get_case", {"caseId": "michael-carter", "part": "financial-health", "section": "narrative"})
            datos_plan = json.loads(r.content[0].text)["value"]
            print("¡Datos financieros recibidos con éxito! Enviando a la IA...")

            # Probamos la clave de IA del equipo
            llm = OpenAI(base_url="https://llm-hackathon.sherpaswealth.com/v1", api_key=os.environ["TEAM_KEY"])
            reply = llm.chat.completions.create(
                model="gpt-5-mini",
                messages=[
                    {"role": "system", "content": "Resume este plan financiero en dos líneas muy sencillas:\n" + json.dumps(datos_plan)},
                    {"role": "user", "content": "¿Cuál es su mayor problema económico?"}
                ]
            )
            print("\n--- ¡RESPUESTA DE LA IA RECIBIDA! ---")
            print(reply.choices[0].message.content)

asyncio.run(probar_todo())


'''
{
  "case_id": "michael-carter",
  "estado_animo": "ansioso"
}
'''