import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { auth, db } from "./firebase-alumnos.js";

const fechaDesde = document.getElementById("fechaDesde");
const fechaHasta = document.getElementById("fechaHasta");
const filtroGrado = document.getElementById("filtroGradoReporte");
const filtroSeccion = document.getElementById("filtroSeccionReporte");
const estado = document.getElementById("estadoReporte");
const detalleGrupos = document.getElementById("detalleGrupos");
const btnDescargar = document.getElementById("btnDescargarReporte");

let tardanzas = [];
let chartGrupos = null;
let chartFechas = null;
let autenticado = false;

onAuthStateChanged(auth, async (usuario) => {
  if (!usuario) {
    window.location.href = "./login.html";
    return;
  }

  autenticado = true;
  await cargarTardanzas();
});

document.getElementById("btnActualizarReporte").addEventListener("click", cargarTardanzas);
btnDescargar.addEventListener("click", descargarPdf);
fechaDesde.addEventListener("change", actualizarReporte);
fechaHasta.addEventListener("change", actualizarReporte);
filtroGrado.addEventListener("change", () => {
  actualizarSecciones();
  actualizarReporte();
});
filtroSeccion.addEventListener("change", actualizarReporte);

async function cargarTardanzas() {
  if (!autenticado) {
    return;
  }

  estado.textContent = "Cargando registros de tardanza...";
  estado.setAttribute("role", "status");
  btnDescargar.disabled = true;

  try {
    const resultado = await getDocs(collection(db, "tardanzas"));
    tardanzas = resultado.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));
    cargarGrados();
    actualizarSecciones();
    actualizarReporte();
    estado.textContent = `${tardanzas.length} registro(s) cargado(s).`;
  } catch (error) {
    console.error(error);
    estado.textContent =
      "No se pudieron leer las tardanzas. Verifica la conexión y las reglas de lectura de la colección en Firestore.";
    estado.setAttribute("role", "alert");
    detalleGrupos.replaceChildren();
    limpiarGraficos();
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
  return tardanzas.filter((registro) => {
    const fecha = obtenerFecha(registro);
    const grado = texto(registro.grado) || "Sin grado";
    const seccion = texto(registro.seccion) || "Sin sección";
    return (!fechaDesde.value || (fecha && fecha >= fechaDesde.value)) &&
      (!fechaHasta.value || (fecha && fecha <= fechaHasta.value)) &&
      (!filtroGrado.value || grado === filtroGrado.value) &&
      (!filtroSeccion.value || seccion === filtroSeccion.value);
  }).sort((a, b) => {
    const porFecha = obtenerFecha(a).localeCompare(obtenerFecha(b));
    return porFecha || texto(a.hora).localeCompare(texto(b.hora)) || nombreAlumno(a).localeCompare(nombreAlumno(b), "es");
  });
}

function actualizarReporte() {
  const registros = obtenerRegistrosFiltrados();
  const grupos = agruparPorGradoSeccion(registros);
  const alumnos = new Set(registros.map((registro) => texto(registro.alumnoId) || nombreAlumno(registro)));

  document.getElementById("totalRegistros").textContent = registros.length.toLocaleString("es-PE");
  document.getElementById("totalAlumnos").textContent = alumnos.size.toLocaleString("es-PE");
  document.getElementById("totalGrupos").textContent = grupos.length.toLocaleString("es-PE");
  document.getElementById("resumenDetalle").textContent = registros.length
    ? `Se muestran ${registros.length} registro(s) en ${grupos.length} grupo(s).`
    : "No hay registros que coincidan con los filtros seleccionados.";

  renderizarGrupos(grupos);
  renderizarGraficos(registros, grupos);
  btnDescargar.disabled = registros.length === 0;
}

function agruparPorGradoSeccion(registros) {
  const grupos = new Map();
  registros.forEach((registro) => {
    const grado = texto(registro.grado) || "Sin grado";
    const seccion = texto(registro.seccion) || "Sin sección";
    const clave = `${grado}\u0000${seccion}`;
    if (!grupos.has(clave)) {
      grupos.set(clave, { grado, seccion, registros: [] });
    }
    grupos.get(clave).registros.push(registro);
  });

  return [...grupos.values()].sort((a, b) => {
    const porGrado = ordenarGrados(a.grado, b.grado);
    return porGrado || a.seccion.localeCompare(b.seccion, "es", { numeric: true });
  });
}

function renderizarGrupos(grupos) {
  detalleGrupos.replaceChildren();
  grupos.forEach((grupo) => {
    const seccion = document.createElement("section");
    seccion.className = "grupo-tardanzas";
    const titulo = document.createElement("h3");
    titulo.textContent = `${grupo.grado} - Sección ${grupo.seccion}`;
    const resumen = document.createElement("p");
    const alumnos = new Set(grupo.registros.map((registro) => texto(registro.alumnoId) || nombreAlumno(registro)));
    resumen.textContent = `${grupo.registros.length} tardanza(s) | ${alumnos.size} alumno(s)`;

    const contenedorTabla = document.createElement("div");
    contenedorTabla.className = "tabla-reporte";
    const tabla = document.createElement("table");
    tabla.innerHTML = `<thead><tr>
      <th>Alumno</th><th>Fecha y hora</th><th>Auxiliar</th><th>Apoderado</th><th>Escaneo</th>
    </tr></thead>`;
    const cuerpo = document.createElement("tbody");
    grupo.registros.forEach((registro) => {
      const fila = document.createElement("tr");
      const escaneo = formatearFechaHora(registro.fechaHoraEscaneo);
      fila.innerHTML = `<td>${escaparHTML(nombreAlumno(registro))}</td>
        <td>${escaparHTML(formatearFecha(obtenerFecha(registro)))}<span class="dato-secundario">${escaparHTML(texto(registro.hora) || "Sin hora")}</span></td>
        <td>${escaparHTML(texto(registro.auxiliarNombre) || "Sin auxiliar")}</td>
        <td>${escaparHTML(texto(registro.telefonoApoderado) || "Sin número registrado")}</td>
        <td>${escaparHTML(escaneo || "No disponible")}</td>`;
      cuerpo.appendChild(fila);
    });
    tabla.appendChild(cuerpo);
    contenedorTabla.appendChild(tabla);
    seccion.append(titulo, resumen, contenedorTabla);
    detalleGrupos.appendChild(seccion);
  });
}

function renderizarGraficos(registros, grupos) {
  limpiarGraficos();
  if (typeof Chart === "undefined") {
    estado.textContent = "Los gráficos no están disponibles. Revisa la conexión a internet y actualiza la página.";
    return;
  }

  chartGrupos = new Chart(document.getElementById("graficoGrupos"), {
    type: "bar",
    data: {
      labels: grupos.map((grupo) => `${grupo.grado} - ${grupo.seccion}`),
      datasets: [{
        label: "Tardanzas",
        data: grupos.map((grupo) => grupo.registros.length),
        backgroundColor: "#38bdf8",
        borderRadius: 3
      }]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });

  const porFecha = new Map();
  registros.forEach((registro) => {
    const fecha = obtenerFecha(registro) || "Sin fecha";
    porFecha.set(fecha, (porFecha.get(fecha) || 0) + 1);
  });
  const fechasOrdenadas = [...porFecha.keys()].sort();
  chartFechas = new Chart(document.getElementById("graficoFechas"), {
    type: "line",
    data: {
      labels: fechasOrdenadas.map((fecha) => fecha === "Sin fecha" ? fecha : formatearFecha(fecha)),
      datasets: [{
        label: "Tardanzas",
        data: fechasOrdenadas.map((fecha) => porFecha.get(fecha)),
        borderColor: "#0284c7",
        backgroundColor: "rgba(2, 132, 199, 0.14)",
        fill: true,
        tension: 0.25
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function limpiarGraficos() {
  chartGrupos?.destroy();
  chartFechas?.destroy();
  chartGrupos = null;
  chartFechas = null;
}

async function descargarPdf() {
  const registros = obtenerRegistrosFiltrados();
  if (registros.length === 0) {
    mostrarErrorPdf("No hay registros que coincidan con los filtros seleccionados.");
    return;
  }

  btnDescargar.disabled = true;
  estado.textContent = "Preparando el PDF...";
  estado.setAttribute("role", "status");
  try {
    const jsPDF = await cargarDependenciasPdf();
    const grupos = agruparPorGradoSeccion(registros);
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const ancho = pdf.internal.pageSize.getWidth();
    const totalAlumnos = new Set(registros.map((registro) => texto(registro.alumnoId) || nombreAlumno(registro))).size;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Reporte detallado de tardanzas", 36, 38);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`Generado: ${new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`, 36, 56);
    pdf.text(`Periodo: ${fechaDesde.value || "Inicio"} a ${fechaHasta.value || "Actualidad"} | Grado: ${filtroGrado.value || "Todos"} | Sección: ${filtroSeccion.value || "Todas"}`, 36, 72);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Tardanzas: ${registros.length}     Alumnos: ${totalAlumnos}     Grupos: ${grupos.length}`, 36, 91);

    let inicioTabla = 108;
    const canvasGrupo = document.getElementById("graficoGrupos");
    const canvasFechas = document.getElementById("graficoFechas");
    if (canvasGrupo && canvasFechas && grupos.length) {
      const chartAncho = (ancho - 90) / 2;
      pdf.addImage(canvasGrupo.toDataURL("image/png"), "PNG", 36, 103, chartAncho, 150);
      pdf.addImage(canvasFechas.toDataURL("image/png"), "PNG", 54 + chartAncho, 103, chartAncho, 150);
      inicioTabla = 270;
    }

    grupos.forEach((grupo) => {
      if (inicioTabla > pdf.internal.pageSize.getHeight() - 70) {
        pdf.addPage();
        inicioTabla = 42;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(`${grupo.grado} - Sección ${grupo.seccion} | ${grupo.registros.length} tardanza(s)`, 36, inicioTabla);
      pdf.autoTable({
        startY: inicioTabla + 7,
        margin: { left: 36, right: 36 },
        head: [["Alumno", "Grado / sección", "Fecha / hora", "Auxiliar", "Teléfono apoderado", "Escaneo"]],
        body: grupo.registros.map((registro) => [
          nombreAlumno(registro),
          `${texto(registro.grado) || "Sin grado"} / ${texto(registro.seccion) || "Sin sección"}`,
          `${formatearFecha(obtenerFecha(registro))} ${texto(registro.hora) || ""}`,
          texto(registro.auxiliarNombre) || "Sin auxiliar",
          texto(registro.telefonoApoderado) || "Sin número registrado",
          formatearFechaHora(registro.fechaHoraEscaneo) || "No disponible"
        ]),
        styles: { fontSize: 7, cellPadding: 4, overflow: "linebreak" },
        headStyles: { fillColor: [30, 64, 81] },
        columnStyles: {
          0: { cellWidth: 130 },
          1: { cellWidth: 95 },
          2: { cellWidth: 90 },
          3: { cellWidth: 100 },
          4: { cellWidth: 115 },
          5: { cellWidth: "auto" }
        },
        didDrawPage: () => {
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.text("Sistema de registro | Reporte de tardanzas", 36, pdf.internal.pageSize.getHeight() - 18);
        }
      });
      inicioTabla = pdf.lastAutoTable.finalY + 24;
    });

    const sufijoFecha = new Date().toISOString().slice(0, 10);
    pdf.save(`reporte-tardanzas-${sufijoFecha}.pdf`);
    estado.textContent = "PDF generado y descargado correctamente.";
    estado.setAttribute("role", "status");
  } catch (error) {
    console.error("Error al generar el PDF del reporte de tardanzas:", error);
    mostrarErrorPdf(error instanceof Error
      ? error.message
      : "No se pudo generar el PDF. Revisa la consola del navegador para ver el detalle del error.");
  } finally {
    btnDescargar.disabled = obtenerRegistrosFiltrados().length === 0;
  }
}

async function cargarDependenciasPdf() {
  if (typeof window.jspdf?.jsPDF !== "function") {
    await cargarScriptPdf(
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"
    );
  }

  const jsPDF = window.jspdf?.jsPDF;
  if (typeof jsPDF !== "function") {
    throw new Error("No se pudo cargar jsPDF. Revisa tu conexión a internet y vuelve a intentarlo.");
  }

  const documento = new jsPDF();
  if (typeof documento.autoTable !== "function") {
    await cargarScriptPdf(
      "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js"
    );
  }

  if (typeof new jsPDF().autoTable !== "function") {
    throw new Error("No se pudo cargar AutoTable. Revisa tu conexión a internet y vuelve a intentarlo.");
  }

  return jsPDF;
}

function cargarScriptPdf(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(new Error("No se pudieron cargar las librerías para generar el PDF. Revisa tu conexión a internet y vuelve a intentarlo."));
    };
    document.head.appendChild(script);
  });
}

function mostrarErrorPdf(mensaje) {
  estado.textContent = mensaje;
  estado.setAttribute("role", "alert");
}

function obtenerFecha(registro) {
  const fecha = texto(registro.fecha);
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    return fecha.slice(0, 10);
  }
  return fechaAISO(registro.fechaHoraEscaneo) || fechaAISO(registro.fechaHoraSincronizacion);
}

function fechaAISO(valor) {
  const fecha = convertirFecha(valor);
  if (!fecha || Number.isNaN(fecha.getTime())) {
    return "";
  }
  const ano = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function convertirFecha(valor) {
  if (!valor) {
    return null;
  }
  if (typeof valor.toDate === "function") {
    return valor.toDate();
  }
  if (typeof valor === "object" && Number.isFinite(valor.seconds)) {
    return new Date(valor.seconds * 1000);
  }
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function formatearFechaHora(valor) {
  const fecha = convertirFecha(valor);
  return fecha
    ? new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(fecha)
    : texto(valor);
}

function formatearFecha(fecha) {
  if (!fecha) {
    return "Sin fecha";
  }
  const [ano, mes, dia] = fecha.split("-").map(Number);
  const fechaLocal = new Date(ano, mes - 1, dia);
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(fechaLocal);
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
  return [texto(registro.apellido), texto(registro.nombre)].filter(Boolean).join(", ") || "Alumno sin nombre";
}

function texto(valor) {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

function escaparHTML(valor) {
  return String(valor).replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caracter]);
}