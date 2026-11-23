# Rutas Puebla

API CRUD de paradas de transporte público de Puebla (FastAPI + Redis Cloud) con frontend HTML/CSS/JS y mapa Leaflet.

## Instalación
```bash
python -m venv venv
# Windows:  venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

## Configuración
Copia `.env.example` a `.env` y pon tu cadena de Redis Cloud (plan Free, sin TLS):
```
REDIS_URL=redis://default:TU_PASSWORD@TU_HOST:PUERTO
```

## Ejecución
```bash
uvicorn app.main:app --reload
```
- App: http://127.0.0.1:8000/ (menú lateral: Paradas, Rutas y Mapa; si ves la versión anterior, recarga con Ctrl + F5)
- Swagger: http://127.0.0.1:8000/docs
- Estado de Redis: http://127.0.0.1:8000/estado

## Datos de ejemplo
```bash
python seed.py
```
Crea 3 rutas (`ruta:ruta-001`...) y 3 paradas (`parada:pue-001`...) en Redis. Cada parada guarda en `rutas` los IDs de las rutas que pasan por ella.

## Ver los datos en Redis
En Redis Cloud abre tu base de datos y pulsa **Connect > Redis Insight** (o el navegador de datos en la consola web). Filtra por `parada:*` o `ruta:*`.

## Endpoints
| Método | Ruta | Acción |
|---|---|---|
| POST | /paradas | Crear parada |
| GET | /paradas | Listar paradas |
| GET | /paradas/{id} | Obtener una parada |
| PUT | /paradas/{id} | Actualizar parada |
| DELETE | /paradas/{id} | Eliminar parada |

| POST | /rutas | Crear ruta |
| GET | /rutas | Listar rutas |
| GET | /rutas/{id} | Obtener una ruta |
| PUT | /rutas/{id} | Actualizar ruta |
| DELETE | /rutas/{id} | Eliminar ruta |
| GET | /rutas/{id}/paradas | Paradas que usan una ruta |
