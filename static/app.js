// ============================================
// Mapa (Leaflet). Si el CDN no carga, el resto de la app sigue funcionando.
// ============================================
const hayMapa = typeof L !== "undefined";
let mapa = null;
let capaParadas = null;
const marcadores = {};

if (hayMapa) {
  mapa = L.map("mapa").setView([19.0414, -98.2063], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(mapa);
  capaParadas = L.layerGroup().addTo(mapa);
}

// ============================================
// Elementos y utilidades compartidas
// ============================================
const API = "/paradas";
const form = document.getElementById("form-parada");
const lista = document.getElementById("lista-paradas");
const btnCancelar = document.getElementById("btn-cancelar");
const btnGuardar = document.getElementById("btn-guardar");
const titulo = document.getElementById("titulo-formulario");
const selectRuta = document.getElementById("select-ruta");
const chips = document.getElementById("chips");
const buscador = document.getElementById("buscador");

let catalogoRutas = [];   // rutas registradas (vienen de /rutas)
let rutasElegidas = [];   // IDs de rutas marcadas en el formulario
let todasParadas = [];

function esc(texto) {
  const d = document.createElement("div");
  d.textContent = texto;
  return d.innerHTML;
}

// ----- Mensajes (toast) -----
const toast = document.getElementById("toast");
let toastTimer;
function aviso(texto, tipo = "exito") {
  toast.textContent = texto;
  toast.className = `toast ${tipo}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("oculto"), 3500);
}

function textoError(error) {
  if (typeof error.detail === "string") return error.detail;
  if (Array.isArray(error.detail) && error.detail.length) {
    return error.detail[0].msg.replace("Value error, ", "");
  }
  return "Error al guardar";
}

// ----- Confirmación (modal) -----
const modal = document.getElementById("modal");
const modalTexto = document.getElementById("modal-texto");
const modalSi = document.getElementById("modal-si");
const modalNo = document.getElementById("modal-no");

function confirmar(texto) {
  return new Promise(resolver => {
    modalTexto.textContent = texto;
    modal.classList.remove("oculto");
    modalNo.focus();
    const cerrar = valor => {
      modal.classList.add("oculto");
      modalSi.onclick = modalNo.onclick = modal.onclick = null;
      document.removeEventListener("keydown", tecla);
      resolver(valor);
    };
    const tecla = e => { if (e.key === "Escape") cerrar(false); };
    modalSi.onclick = () => cerrar(true);
    modalNo.onclick = () => cerrar(false);
    modal.onclick = e => { if (e.target === modal) cerrar(false); };
    document.addEventListener("keydown", tecla);
  });
}

// ----- Navegación entre vistas -----
const TITULOS = { paradas: "Paradas", rutas: "Rutas", mapa: "Mapa de paradas" };

async function mostrarVista(nombre) {
  Object.keys(TITULOS).forEach(v => {
    document.getElementById(`vista-${v}`).classList.toggle("oculto", v !== nombre);
  });
  document.querySelectorAll(".nav-item").forEach(b =>
    b.classList.toggle("activo", b.dataset.vista === nombre)
  );
  document.getElementById("titulo-vista").textContent = TITULOS[nombre];

  if (nombre === "rutas") {
    await cargarRutas();
  } else {
    await cargarParadas();
    if (nombre === "mapa" && hayMapa) mapa.invalidateSize();
  }
  verificarRedis();
}

document.querySelectorAll(".nav-item").forEach(b =>
  b.addEventListener("click", () => mostrarVista(b.dataset.vista))
);

async function verificarRedis() {
  const estado = document.getElementById("estado-redis");
  try {
    const r = await (await fetch("/estado")).json();
    estado.textContent = r.redis_conectado ? "● Redis conectado" : "● Sin conexión a Redis";
    estado.className = `estado ${r.redis_conectado ? "ok" : "fallo"}`;
  } catch {
    estado.textContent = "● Servidor no disponible";
    estado.className = "estado fallo";
  }
}

// ============================================
// Selección de rutas ya registradas
// ============================================
function nombreRuta(id) {
  const ruta = catalogoRutas.find(r => r.id === id);
  return ruta ? ruta.nombre : id;
}

function nombresRutas(ids) {
  return ids.length > 0 ? ids.map(i => esc(nombreRuta(i))).join(", ") : "Sin rutas";
}

async function cargarCatalogoRutas() {
  try {
    const respuesta = await fetch("/rutas");
    if (!respuesta.ok) throw new Error();
    catalogoRutas = (await respuesta.json()).rutas;
  } catch {
    catalogoRutas = [];
  }
  dibujarSelector();
}

function dibujarSelector() {
  const disponibles = catalogoRutas.filter(r => !rutasElegidas.includes(r.id));

  if (catalogoRutas.length === 0) {
    selectRuta.innerHTML = '<option value="">No hay rutas registradas</option>';
  } else if (disponibles.length === 0) {
    selectRuta.innerHTML = '<option value="">Ya agregaste todas las rutas</option>';
  } else {
    selectRuta.innerHTML =
      '<option value="">Selecciona una ruta registrada…</option>' +
      disponibles.map(r =>
        `<option value="${esc(r.id)}">${esc(r.nombre)} · ${esc(r.origen)} ➜ ${esc(r.destino)}</option>`
      ).join("");
  }
  selectRuta.disabled = disponibles.length === 0;

  if (rutasElegidas.length > 0) {
    chips.innerHTML = rutasElegidas.map(id => `
      <span class="chip">${esc(nombreRuta(id))}
        <button type="button" class="chip-x" data-quitar="${esc(id)}" aria-label="Quitar ruta">✕</button>
      </span>`).join("");
  } else if (catalogoRutas.length === 0) {
    chips.innerHTML = '<p class="nota">Primero crea rutas en la sección <a id="ir-rutas">Rutas</a>.</p>';
  } else {
    chips.innerHTML = '<p class="nota">Ninguna ruta seleccionada.</p>';
  }
}

selectRuta.addEventListener("change", () => {
  if (selectRuta.value) {
    rutasElegidas.push(selectRuta.value);
    dibujarSelector();
  }
});

chips.addEventListener("click", evento => {
  const quitar = evento.target.dataset.quitar;
  if (quitar) {
    rutasElegidas = rutasElegidas.filter(id => id !== quitar);
    dibujarSelector();
  }
  if (evento.target.id === "ir-rutas") mostrarVista("rutas");
});

// ============================================
// Lista de paradas y marcadores
// ============================================
function limpiarFormulario() {
  form.reset();
  document.getElementById("parada-id").value = "";
  rutasElegidas = [];
  dibujarSelector();
  btnCancelar.classList.add("oculto");
  btnGuardar.textContent = "Registrar parada";
  titulo.textContent = "Registrar parada";
}

function dibujarParadas() {
  const q = buscador.value.trim().toLowerCase();
  const filtradas = todasParadas.filter(p => {
    const rutas = p.rutas.map(nombreRuta).join(" ");
    return `${p.nombre} ${p.colonia} ${rutas}`.toLowerCase().includes(q);
  });

  lista.innerHTML = "";
  if (filtradas.length === 0) {
    lista.innerHTML = '<p class="nota">No hay paradas para mostrar.</p>';
  }

  filtradas.forEach(parada => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "parada";
    tarjeta.innerHTML = `
      <div class="cabecera-tarjeta">
        <span class="icono">🚌</span>
        <h3>${esc(parada.nombre)}</h3>
        <span class="insignia ${parada.activa ? "on" : "off"}">${parada.activa ? "Activa" : "Inactiva"}</span>
      </div>
      <p><strong>ID:</strong> ${esc(parada.id)}</p>
      <p><strong>Colonia:</strong> ${esc(parada.colonia)}, ${esc(parada.municipio)}</p>
      <p><strong>Coordenadas:</strong> ${parada.latitud}, ${parada.longitud}</p>
      <p><strong>Rutas:</strong> ${nombresRutas(parada.rutas)}</p>
      <div class="acciones">
        <button type="button" class="btn-editar" data-id="${esc(parada.id)}">Editar</button>
        <button type="button" class="btn-ubicar" data-id="${esc(parada.id)}">Ver en mapa</button>
        <button type="button" class="btn-eliminar" data-id="${esc(parada.id)}">Eliminar</button>
      </div>
    `;
    lista.appendChild(tarjeta);
  });
}

function dibujarMarcadores() {
  if (!hayMapa) return;
  capaParadas.clearLayers();
  Object.keys(marcadores).forEach(k => delete marcadores[k]);

  todasParadas.forEach(parada => {
    const marcador = L.marker([parada.latitud, parada.longitud]).addTo(capaParadas);
    marcador.bindPopup(`
      <strong>${esc(parada.nombre)}</strong><br>
      ${esc(parada.colonia)}<br>
      Rutas: ${nombresRutas(parada.rutas)}
    `);
    marcador.bindTooltip(parada.nombre);
    marcadores[parada.id] = marcador;
  });
}

async function cargarParadas() {
  try {
    await cargarCatalogoRutas();
    const respuesta = await fetch(API);
    if (!respuesta.ok) throw new Error("No se pudo obtener la lista de paradas");
    todasParadas = (await respuesta.json()).paradas;
    dibujarParadas();
    dibujarMarcadores();
  } catch (error) {
    aviso(error.message, "error");
  }
}

async function cargarParadaParaEditar(id) {
  try {
    const respuesta = await fetch(`${API}/${id}`);
    if (!respuesta.ok) throw new Error("No se encontró la parada");
    const parada = await respuesta.json();

    document.getElementById("parada-id").value = parada.id;
    document.getElementById("nombre").value = parada.nombre;
    document.getElementById("colonia").value = parada.colonia;
    document.getElementById("latitud").value = parada.latitud;
    document.getElementById("longitud").value = parada.longitud;
    document.getElementById("activa").value = parada.activa.toString();
    rutasElegidas = [...parada.rutas];
    dibujarSelector();

    btnCancelar.classList.remove("oculto");
    btnGuardar.textContent = "Guardar cambios";
    titulo.textContent = "Actualizar parada";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    aviso(error.message, "error");
  }
}

async function eliminarParada(id) {
  if (!(await confirmar("¿Deseas eliminar esta parada?"))) return;
  try {
    const respuesta = await fetch(`${API}/${id}`, { method: "DELETE" });
    if (!respuesta.ok) throw new Error("No se pudo eliminar la parada.");
    if (document.getElementById("parada-id").value === id) limpiarFormulario();
    aviso("¡Parada eliminada!");
    cargarParadas();
  } catch (error) {
    aviso(error.message, "error");
  }
}

async function ubicarParadaEnMapa(id) {
  await mostrarVista("mapa");
  const parada = todasParadas.find(p => p.id === id);
  if (!parada) return aviso("No se encontró la parada", "error");
  if (!hayMapa) return aviso("El mapa no está disponible (revisa tu conexión a internet).", "error");
  mapa.setView([parada.latitud, parada.longitud], 16);
  marcadores[id].openPopup();
}

// ============================================
// Eventos
// ============================================
form.addEventListener("submit", async evento => {
  evento.preventDefault();
  const id = document.getElementById("parada-id").value;

  const datos = {
    nombre: document.getElementById("nombre").value.trim(),
    colonia: document.getElementById("colonia").value.trim(),
    municipio: "Puebla",
    latitud: parseFloat(document.getElementById("latitud").value),
    longitud: parseFloat(document.getElementById("longitud").value),
    rutas: rutasElegidas,
    activa: document.getElementById("activa").value === "true"
  };

  try {
    const respuesta = await fetch(id ? `${API}/${id}` : API, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });
    if (!respuesta.ok) throw new Error(textoError(await respuesta.json()));

    aviso(id ? "¡Parada actualizada correctamente!" : "¡Parada creada con éxito!");
    limpiarFormulario();
    cargarParadas();
  } catch (error) {
    aviso(error.message, "error");
  }
});

lista.addEventListener("click", evento => {
  const boton = evento.target.closest("button");
  const id = boton && boton.dataset.id;
  if (!id) return;

  if (boton.classList.contains("btn-editar")) cargarParadaParaEditar(id);
  if (boton.classList.contains("btn-eliminar")) eliminarParada(id);
  if (boton.classList.contains("btn-ubicar")) ubicarParadaEnMapa(id);
});

buscador.addEventListener("input", dibujarParadas);
btnCancelar.addEventListener("click", limpiarFormulario);
document.getElementById("btn-recargar").addEventListener("click", async () => {
  await cargarParadas();
  aviso("Lista actualizada");
});

cargarParadas();
verificarRedis();
