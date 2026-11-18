"""Datos que recibe la API (el contrato con el frontend)."""
from typing import Literal

from pydantic import BaseModel, Field

from config import CASE_PATTERN


class SummaryRequest(BaseModel):
    case_id: str = Field(pattern=CASE_PATTERN)          # "michael-carter"
    animo: int = Field(ge=1, le=5)                      # 1 = agobiado ... 5 = confiado
    tiempo: Literal["corto", "completo"] = "corto"      # "corto" ~90 s, "completo" = todo
    persona: str | None = Field(default=None, max_length=40)  # "Melanie" en parejas
    idioma: Literal["es", "en"] = "en"
    regenerar: bool = False                             # ignora la cache
    animo_pareja: int | None = Field(default=None, ge=1, le=5)
    nombres: list[str] | None = Field(default=None, max_length=2)
    @property
    def animo_efectivo(self) -> int:
        """El tono y el numero de tarjetas se adaptan a quien se siente peor."""
        return min(self.animo, self.animo_pareja) if self.animo_pareja else self.animo

# clase para el chatbot
class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class ChatRequest(BaseModel):
    case_id: str = Field(pattern=CASE_PATTERN)
    animo: int = Field(default=3, ge=1, le=5)
    persona: str | None = Field(default=None, max_length=40)
    idioma: Literal["es", "en"] = "en"
    mensajes: list[Message] = Field(min_length=1, max_length=30)
    animo_pareja: int | None = Field(default=None, ge=1, le=5)
    nombres: list[str] | None = Field(default=None, max_length=2)
    @property
    def animo_efectivo(self) -> int:
        return min(self.animo, self.animo_pareja) if self.animo_pareja else self.animo
