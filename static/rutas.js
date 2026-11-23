// ============================================
// CRUD de rutas (usa utilidades de app.js)
// ============================================
const API_RUTAS = "/rutas";
const formRuta = document.getElementById("form-ruta");
const listaRutas = document.getElementById("lista-rutas");
const btnCancelarRuta = document.getElementById("btn-cancelar-ruta");
const btnGuardarRuta = document.getElementById("btn-guardar-ruta");
const tituloRuta = document.getElementById("titulo-form-ruta");

function limpiarFormRuta() {
  formRuta.reset();
  document.getElementById("ruta-id").value = "";
  btnCancelarRuta.classList.add("oculto");
  btnGuardarRuta.textContent = "Registrar ruta";
  tituloRuta.textContent = "Registrar ruta";
}

async function cargarRutas() {
  try {
    const respuesta = await fetch(API_RUTAS);
    if (!respuesta.ok) throw new Error("No se pudo obtener la lista de rutas");
    const datos = await respuesta.json();

    let paradas = [];
    try {
      paradas = (await (await fetch("/paradas")).json()).paradas;
    } catch { /* se muestran las rutas sin paradas */ }

    listaRutas.innerHTML = "";
    if (datos.rutas.length === 0) {
      listaRutas.innerHTML = '<p class="nota">No hay rutas registradas.</p>';
      return;
    }

    datos.rutas.forEach(ruta => {
      const horas = ruta.horarios.length
        ? ruta.horarios.map(h => `<span class="etiqueta">${esc(h)}</span>`).join("")
        : '<span class="nota">Sin horarios</span>';
      const susParadas = paradas.filter(p => p.rutas.includes(ruta.id));
      const paradasTxt = susParadas.length
        ? susParadas.map(p => esc(p.nombre)).join(", ")
        : "Ninguna parada asignada";

      const tarjeta = document.createElement("article");
      tarjeta.className = "parada";
      tarjeta.innerHTML = `
        <div class="cabecera-tarjeta">
          <span class="icono">🚌</span>
          <h3>${esc(ruta.nombre)}</h3>
          <span class="insignia ${ruta.activa ? "on" : "off"}">${ruta.activa ? "Activa" : "Inactiva"}</span>
        </div>
        <p><strong>ID:</strong> ${esc(ruta.id)}</p>
        <p><strong>Trayecto:</strong> ${esc(ruta.origen)} ➜ ${esc(ruta.destino)}</p>
        <p><strong>Horarios:</strong></p>
        <div class="etiquetas">${horas}</div>
        <p><strong>Paradas:</strong> ${paradasTxt}</p>
        <div class="acciones">
          <button type="button" class="btn-editar" data-id="${esc(ruta.id)}">Editar</button>
          <button type="button" class="btn-eliminar" data-id="${esc(ruta.id)}">Eliminar</button>
        </div>
      `;
      listaRutas.appendChild(tarjeta);
    });
  } catch (error) {
    aviso(error.message, "error");
  }
}

formRuta.addEventListener("submit", async evento => {
  evento.preventDefault();
  const id = document.getElementById("ruta-id").value;

  const horarios = document.getElementById("ruta-horarios").value
    .split(",")
    .map(h => h.trim())
    .filter(h => h !== "");

  const datos = {
    nombre: document.getElementById("ruta-nombre").value.trim(),
    origen: document.getElementById("ruta-origen").value.trim(),
    destino: document.getElementById("ruta-destino").value.trim(),
    horarios,
    activa: document.getElementById("ruta-activa").value === "true"
  };

  try {
    const respuesta = await fetch(id ? `${API_RUTAS}/${id}` : API_RUTAS, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });
    if (!respuesta.ok) throw new Error(textoError(await respuesta.json()));

    aviso(id ? "¡Ruta actualizada correctamente!" : "¡Ruta creada con éxito!");
    limpiarFormRuta();
    cargarRutas();
  } catch (error) {
    aviso(error.message, "error");
  }
});

listaRutas.addEventListener("click", async evento => {
  const boton = evento.target.closest("button");
  const id = boton && boton.dataset.id;
  if (!id) return;

  if (boton.classList.contains("btn-editar")) {
    try {
      const respuesta = await fetch(`${API_RUTAS}/${id}`);
      if (!respuesta.ok) throw new Error("No se encontró la ruta");
      const ruta = await respuesta.json();

      document.getElementById("ruta-id").value = ruta.id;
      document.getElementById("ruta-nombre").value = ruta.nombre;
      document.getElementById("ruta-origen").value = ruta.origen;
      document.getElementById("ruta-destino").value = ruta.destino;
      document.getElementById("ruta-horarios").value = ruta.horarios.join(", ");
      document.getElementById("ruta-activa").value = ruta.activa.toString();

      btnCancelarRuta.classList.remove("oculto");
      btnGuardarRuta.textContent = "Guardar cambios";
      tituloRuta.textContent = "Actualizar ruta";
      formRuta.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      aviso(error.message, "error");
    }
  }

  if (boton.classList.contains("btn-eliminar")) {
    if (!(await confirmar("¿Deseas eliminar esta ruta? También se quitará de las paradas que la usan."))) return;
    try {
      const respuesta = await fetch(`${API_RUTAS}/${id}`, { method: "DELETE" });
      if (!respuesta.ok) throw new Error("No se pudo eliminar la ruta.");
      if (document.getElementById("ruta-id").value === id) limpiarFormRuta();
      aviso("¡Ruta eliminada!");
      cargarRutas();
    } catch (error) {
      aviso(error.message, "error");
    }
  }
});

btnCancelarRuta.addEventListener("click", limpiarFormRuta);
document.getElementById("btn-recargar-rutas").addEventListener("click", async () => {
  await cargarRutas();
  aviso("Lista actualizada");
});
