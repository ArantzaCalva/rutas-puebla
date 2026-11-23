from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
import uuid


class Parada(BaseModel):
    id: str = Field(default_factory=lambda: f"pue-{uuid.uuid4().hex[:8]}")
    nombre: str
    colonia: str
    municipio: str = "Puebla"
    latitud: float
    longitud: float
    rutas: List[str] = []   # IDs de rutas ya registradas (ej. "ruta-001")
    activa: bool = True
    creado_en: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


import re
from pydantic import field_validator

HORA_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class Ruta(BaseModel):
    id: str = Field(default_factory=lambda: f"ruta-{uuid.uuid4().hex[:8]}")
    nombre: str
    origen: str
    destino: str
    horarios: List[str] = []   # formato HH:MM, ej. "06:30"
    activa: bool = True
    creado_en: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("horarios")
    @classmethod
    def validar_horarios(cls, valores):
        for h in valores:
            if not HORA_RE.match(h):
                raise ValueError(f"Horario inválido '{h}'. Usa el formato HH:MM (ej. 06:30)")
        return sorted(set(valores))
