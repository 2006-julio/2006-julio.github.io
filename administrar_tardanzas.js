import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { auth, db } from "./firebase-alumnos.js";

const fechaDesde = document.getElementById("fechaDesde");
const fechaHasta = document.getElementById("fechaHasta");
const filtroGrado = document.getElementById("filtroGrado");
const filtroSeccion = document.getElementById("filtroSeccion");
const buscarNombre = document.getElementById("buscarNombre");
const estado = document.getElementById("estadoTardanzas");
const resumen = document.getElementById("resumenTardanzas");
const lista = document.getElementById("listaTardanzas");
const btnActualizar = document.getElementById("btnActualizarTardanzas");

let tardanzas = [];
let autenticado = false;
const eliminando = new Set();

onAuthStateChanged(auth, async (usuario) => {
  if (!usuario) {
    window.location.href = "./login.html";
    return;
  }

  autenticado = true;
  await cargarTardanzas();
});

btnActualizar.addEventListener("click", cargarTardanzas);
fechaDesde.addEventListener("change", renderizarTardanzas);
fechaHasta.addEventListener("change", renderizarTardanzas);
filtroGrado.addEventListener("change", () => {
  actualizarSecciones();
  renderizarTardanzas();
});
filtroSeccion.addEventListener("change", renderizarTardanzas);
buscarNombre.addEventListener("input", renderizarTardanzas);
lista.addEventListener("click", eliminarTardanza);

async function cargarTardanzas() {
  if (!autenticado) {
    return;
  }

  estado.textContent = "Cargando registros de tardanza...";
  estado.setAttribute("role", "status");
  btnActualizar.disabled = true;

  try {
    const resultado = await getDocs(collection(db, "tardanzas"));
    tardanzas = resultado.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));
    cargarGrados();
    actualizarSecciones();
    renderizarTardanzas();
    estado.textContent = `${tardanzas.length} registro(s) cargado(s).`;
  } catch (error) {
    console.error("No se pudieron cargar las tardanzas:", error);
    estado.textContent =
      "No se pudieron leer las tardanzas. Verifica la conexión y las reglas de lectura de Firestore.";
    estado.setAttribute("role", "alert");
    resumen.textContent = "No se pudieron cargar los registros.";
    lista.replaceChildren();
  } finally {
    btnActualizar.disabled = false;
  }
}

function cargarGrados() {
  const seleccionado = filtroGrado.value;
  const grados = [...new Set(tardanzas.map((registro) => texto(registro.grado) || "Sin grado"))]
    .sort(ordenarGrados);

  filtroGrado.replaceChildren(new Option("Todos los grados", ""));
  grados.forEach((grado) => filtroGrado.add(new Option(grado, grado)));
  filtroGrado.value = grados.includes(seleccionado) ? seleccionado : "";
}

function actualizarSecciones() {
  const seleccionada = filtroSeccion.value;
  const grado = filtroGrado.value;
  const secciones = [...new Set(
    tardanzas
      .filter((registro) => !grado || (texto(registro.grado) || "Sin grado") === grado)
      .map((registro) => texto(registro.seccion) || "Sin sección")
  )].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));

  filtroSeccion.replaceChildren(new Option("Todas las secciones", ""));
  secciones.forEach((seccion) => filtroSeccion.add(new Option(seccion, seccion)));
  filtroSeccion.value = secciones.includes(seleccionada) ? seleccionada : "";
}

function obtenerRegistrosFiltrados() {
  const busqueda = normalizar(buscarNombre.value);
  return tardanzas.filter((registro) => {
    const fecha = obtenerFecha(registro);
    const grado = texto(registro.grado) || "Sin grado";
    const seccion = texto(registro.seccion) || "Sin sección";
    const nombre = normalizar(`${texto(registro.nombre)} ${texto(registro.apellido)}`);
    return (!fechaDesde.value || (fecha && fecha >= fechaDesde.value)) &&
      (!fechaHasta.value || (fecha && fecha <= fechaHasta.value)) &&
      (!filtroGrado.value || grado === filtroGrado.value) &&
      (!filtroSeccion.value || seccion === filtroSeccion.value) &&
      (!busqueda || nombre.includes(busqueda));
  }).sort((a, b) => {
    const porFecha = obtenerFecha(b).localeCompare(obtenerFecha(a));
    return porFecha || texto(b.hora).localeCompare(texto(a.hora)) ||
      nombreAlumno(a).localeCompare(nombreAlumno(b), "es");
  });
}

function renderizarTardanzas() {
  const registros = obtenerRegistrosFiltrados();
  resumen.textContent = registros.length
    ? `Se muestran ${registros.length} de ${tardanzas.length} registro(s).`
    : "No hay registros que coincidan con los filtros seleccionados.";
  lista.replaceChildren();

  if (!registros.length) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");
    celda.colSpan = 6;
    celda.textContent = "No se encontraron tardanzas.";
    fila.appendChild(celda);
    lista.appendChild(fila);
    return;
  }

  registros.forEach((registro) => {
    const fila = document.createElement("tr");
    agregarCelda(fila, nombreAlumno(registro));
    agregarCelda(fila, texto(registro.grado) || "Sin grado");
    agregarCelda(fila, texto(registro.seccion) || "Sin sección");
    const celdaFecha = agregarCelda(fila, formatearFecha(obtenerFecha(registro)));
    const hora = document.createElement("span");
    hora.className = "dato-secundario";
    hora.textContent = texto(registro.hora) || "Sin hora";
    celdaFecha.appendChild(hora);
    agregarCelda(fila, texto(registro.auxiliarNombre) || "Sin auxiliar");

    const celdaAccion = document.createElement("td");
    celdaAccion.className = "no-imprimir";
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-eliminar-tardanza";
    boton.dataset.id = registro.id;
    boton.textContent = eliminando.has(registro.id) ? "Eliminando..." : "Eliminar";
    boton.disabled = eliminando.has(registro.id);
    celdaAccion.appendChild(boton);
    fila.appendChild(celdaAccion);
    lista.appendChild(fila);
  });
}

function agregarCelda(fila, contenido) {
  const celda = document.createElement("td");
  celda.textContent = contenido;
  fila.appendChild(celda);
  return celda;
}

async function eliminarTardanza(evento) {
  const boton = evento.target.closest("button[data-id]");
  if (!boton || eliminando.has(boton.dataset.id)) {
    return;
  }

  const registro = tardanzas.find((item) => item.id === boton.dataset.id);
  if (!registro) {
    return;
  }

  const confirmado = window.confirm(
    `¿Eliminar la tardanza de ${nombreAlumno(registro)} del ${formatearFecha(obtenerFecha(registro))}? Esta acción no se puede deshacer.`
  );
  if (!confirmado) {
    return;
  }

  eliminando.add(registro.id);
  renderizarTardanzas();
  estado.textContent = `Eliminando la tardanza de ${nombreAlumno(registro)}...`;
  estado.setAttribute("role", "status");

  try {
    await deleteDoc(doc(db, "tardanzas", registro.id));
    tardanzas = tardanzas.filter((item) => item.id !== registro.id);
    cargarGrados();
    actualizarSecciones();
    renderizarTardanzas();
    estado.textContent = "La tardanza se eliminó correctamente.";
  } catch (error) {
    console.error("No se pudo eliminar la tardanza:", error);
    estado.textContent = "No se pudo eliminar la tardanza. Verifica la conexión y los permisos de Firestore.";
    estado.setAttribute("role", "alert");
  } finally {
    eliminando.delete(registro.id);
    renderizarTardanzas();
  }
}

function obtenerFecha(registro) {
  const fecha = texto(registro.fecha);
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    return fecha.slice(0, 10);
  }
  return fechaAISO(registro.fechaHoraEscaneo) || fechaAISO(registro.fechaHoraSincronizacion);
}

function fechaAISO(valor) {
  if (!valor) {
    return "";
  }
  const fecha = typeof valor.toDate === "function"
    ? valor.toDate()
    : typeof valor === "object" && Number.isFinite(valor.seconds)
      ? new Date(valor.seconds * 1000)
      : new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return "";
  }
  const ano = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatearFecha(fecha) {
  if (!fecha) {
    return "Sin fecha";
  }
  const [ano, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" })
    .format(new Date(ano, mes - 1, dia));
}

function ordenarGrados(a, b) {
  const numeroA = Number((a.match(/\d+/) || [])[0]);
  const numeroB = Number((b.match(/\d+/) || [])[0]);
  if (numeroA && numeroB && numeroA !== numeroB) {
    return numeroA - numeroB;
  }
  return a.localeCompare(b, "es", { numeric: true });
}

function nombreAlumno(registro) {
  return [texto(registro.apellido), texto(registro.nombre)].filter(Boolean).join(", ") ||
    "Alumno sin nombre";
}

function normalizar(valor) {
  return texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function texto(valor) {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}
