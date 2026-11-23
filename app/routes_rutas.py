import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.models import Ruta
from app.database import redis_client

router = APIRouter(prefix="/rutas", tags=["Rutas"])


@router.post("", status_code=201)
def crear_ruta(ruta: Ruta):
    clave = f"ruta:{ruta.id}"
    if redis_client.exists(clave):
        raise HTTPException(status_code=409, detail="La ruta ya existe")
    redis_client.set(clave, ruta.model_dump_json())
    return {"mensaje": "Ruta creada", "id": ruta.id}


@router.get("")
def listar_rutas():
    claves = list(redis_client.scan_iter(match="ruta:*"))
    rutas = []
    if claves:
        for dato in redis_client.mget(claves):
            if dato:
                rutas.append(json.loads(dato))
    rutas.sort(key=lambda r: r["nombre"])
    return {"total": len(rutas), "rutas": rutas}


@router.get("/{ruta_id}")
def obtener_ruta(ruta_id: str):
    datos = redis_client.get(f"ruta:{ruta_id}")
    if not datos:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return json.loads(datos)


@router.put("/{ruta_id}")
def actualizar_ruta(ruta_id: str, ruta: Ruta):
    clave = f"ruta:{ruta_id}"
    datos = redis_client.get(clave)
    if not datos:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    ruta.id = ruta_id
    ruta.creado_en = datetime.fromisoformat(json.loads(datos)["creado_en"].replace("Z", "+00:00"))
    redis_client.set(clave, ruta.model_dump_json())
    return {"mensaje": "Ruta actualizada", "ruta": ruta}


def _paradas_de_ruta(ruta_id: str):
    claves = list(redis_client.scan_iter(match="parada:*"))
    paradas = []
    if claves:
        for dato in redis_client.mget(claves):
            if dato:
                parada = json.loads(dato)
                if ruta_id in parada.get("rutas", []):
                    paradas.append(parada)
    return paradas


@router.get("/{ruta_id}/paradas")
def paradas_de_la_ruta(ruta_id: str):
    if not redis_client.exists(f"ruta:{ruta_id}"):
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    paradas = _paradas_de_ruta(ruta_id)
    return {"ruta": ruta_id, "total": len(paradas), "paradas": paradas}


@router.delete("/{ruta_id}")
def eliminar_ruta(ruta_id: str):
    clave = f"ruta:{ruta_id}"
    if not redis_client.exists(clave):
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    # quitar la ruta de las paradas que la usan
    for parada in _paradas_de_ruta(ruta_id):
        parada["rutas"].remove(ruta_id)
        redis_client.set(f"parada:{parada['id']}", json.dumps(parada, ensure_ascii=False))
    redis_client.delete(clave)
    return {"mensaje": "Ruta eliminada", "id": ruta_id}
