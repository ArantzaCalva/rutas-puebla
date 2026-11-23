"""Carga datos de ejemplo en Redis. Ejecutar desde la raíz: python seed.py"""
from app.database import redis_client
from app.models import Parada, Ruta

rutas = [
    Ruta(id="ruta-001", nombre="Ruta 1", origen="CAPU", destino="Zócalo", horarios=["06:00", "06:30", "07:00", "07:30", "08:00"]),
    Ruta(id="ruta-002", nombre="Ruta 4", origen="CAPU", destino="BUAP", horarios=["06:15", "07:15", "08:15"]),
    Ruta(id="ruta-003", nombre="Ruta 72", origen="Zócalo", destino="Angelópolis", horarios=["07:00", "09:00", "11:00"]),
]

# parada.rutas guarda los IDs de las rutas que pasan por ella
paradas = [
    Parada(id="pue-001", nombre="Parada Zócalo", colonia="Centro", latitud=19.0431, longitud=-98.1937, rutas=["ruta-001", "ruta-003"]),
    Parada(id="pue-002", nombre="Parada BUAP", colonia="Los Volcanes", latitud=19.0467, longitud=-98.2065, rutas=["ruta-002"]),
    Parada(id="pue-003", nombre="Parada CAPU", colonia="Amalucan", latitud=19.0715, longitud=-98.1633, rutas=["ruta-001", "ruta-002"]),
]

for r in rutas:
    redis_client.set(f"ruta:{r.id}", r.model_dump_json())
for p in paradas:
    redis_client.set(f"parada:{p.id}", p.model_dump_json())

print(f"Listo: {len(rutas)} rutas y {len(paradas)} paradas guardadas en Redis.")
