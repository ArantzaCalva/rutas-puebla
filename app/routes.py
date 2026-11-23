import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.models import Parada
from app.database import redis_client

router = APIRouter(prefix="/paradas", tags=["Paradas"])


def validar_rutas(ids):
    """Cada ruta de la parada debe existir previamente en Redis (clave ruta:{id})."""
    faltantes = [i for i in ids if not redis_client.exists(f"ruta:{i}")]
    if faltantes:
        raise HTTPException(
            status_code=400,
            detail=f"Rutas no registradas: {', '.join(faltantes)}"
        )


@router.post("", status_code=201)
def crear_parada(parada: Parada):
    validar_rutas(parada.rutas)
    clave = f"parada:{parada.id}"
    if redis_client.exists(clave):
        raise HTTPException(status_code=409, detail="La parada ya existe")
    redis_client.set(clave, parada.model_dump_json())
    return {"mensaje": "Parada creada", "id": parada.id}


@router.get("")
def listar_paradas():
    claves = list(redis_client.scan_iter(match="parada:*"))
    paradas = []
    if claves:
        for dato in redis_client.mget(claves):
            if dato:
                paradas.append(json.loads(dato))
    return {"total": len(paradas), "paradas": paradas}


@router.get("/{parada_id}")
def obtener_parada(parada_id: str):
    datos = redis_client.get(f"parada:{parada_id}")
    if not datos:
        raise HTTPException(status_code=404, detail="Parada no encontrada")
    return json.loads(datos)


@router.put("/{parada_id}")
def actualizar_parada(parada_id: str, parada: Parada):
    clave = f"parada:{parada_id}"
    datos = redis_client.get(clave)
    if not datos:
        raise HTTPException(status_code=404, detail="Parada no encontrada")
    validar_rutas(parada.rutas)
    parada.id = parada_id
    # conservar la fecha de creación original
    parada.creado_en = datetime.fromisoformat(json.loads(datos)["creado_en"].replace("Z", "+00:00"))
    redis_client.set(clave, parada.model_dump_json())
    return {"mensaje": "Parada actualizada", "parada": parada}


@router.delete("/{parada_id}")
def eliminar_parada(parada_id: str):
    clave = f"parada:{parada_id}"
    if not redis_client.exists(clave):
        raise HTTPException(status_code=404, detail="Parada no encontrada")
    redis_client.delete(clave)
    return {"mensaje": "Parada eliminada", "id": parada_id}
