import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { auth, db } from "./firebase-alumnos.js";

const fechaDesde = document.getElementById("fechaDesde");
const fechaHasta = document.getElementById("fechaHasta");
const filtroGrado = document.getElementById("filtroGradoReporte");
const filtroSeccion = document.getElementById("filtroSeccionReporte");
const filtroPeriodoReiterativas = document.getElementById("filtroPeriodoReiterativas");
const vistaRegistrosReiterativas = document.getElementById("vistaRegistrosReiterativas");
const descripcionReiterativas = document.getElementById("descripcionReiterativas");
const estado = document.getElementById("estadoReporte");
const detalleGrupos = document.getElementById("detalleGrupos");
const estudiantesReiterativos = document.getElementById("estudiantesReiterativos");
const btnDescargar = document.getElementById("btnDescargarReporte");
const btnDescargarExcel = document.getElementById("btnDescargarExcel");
const btnVistaCompacta = document.getElementById("btnVistaCompacta");

let tardanzas = [];
let alumnos = [];
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
btnDescargarExcel.addEventListener("click", descargarExcel);
btnVistaCompacta.addEventListener("click", () => {
  const compacta = document.body.classList.toggle("vista-compacta");
  btnVistaCompacta.textContent = compacta ? "Vista normal" : "Vista compacta";
  btnVistaCompacta.setAttribute("aria-pressed", String(compacta));
});
fechaDesde.addEventListener("change", actualizarReporte);
fechaHasta.addEventListener("change", actualizarReporte);
filtroGrado.addEventListener("change", () => {
  actualizarSecciones();
  actualizarReporte();
});
filtroSeccion.addEventListener("change", actualizarReporte);
filtroPeriodoReiterativas.addEventListener("change", actualizarReporte);
vistaRegistrosReiterativas.addEventListener("change", actualizarReporte);

async function cargarTardanzas() {
  if (!autenticado) {
    return;
  }

  estado.textContent = "Cargando registros de tardanza...";
  estado.setAttribute("role", "status");
  btnDescargar.disabled = true;
  btnDescargarExcel.disabled = true;

  try {
    const [resultadoTardanzas, resultadoAlumnos] = await Promise.all([
      getDocs(collection(db, "tardanzas")),
      getDocs(collection(db, "alumnos"))
    ]);
    tardanzas = resultadoTardanzas.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));
    alumnos = resultadoAlumnos.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));
    cargarGrados();
    actualizarSecciones();
    actualizarReporte();
    estado.textContent = `${tardanzas.length} registro(s) y ${alumnos.length} alumno(s) de matrícula cargado(s).`;
  } catch (error) {
    console.error(error);
    estado.textContent =
      "No se pudieron leer los registros y la matrícula necesarios para el reporte. Verifica la conexión y las reglas de lectura en Firestore.";
    estado.setAttribute("role", "alert");
    detalleGrupos.replaceChildren();
    estudiantesReiterativos.replaceChildren();
    limpiarGraficos();
  }
}

function cargarGrados() {
  const seleccionado = filtroGrado.value;
  const grados = [...new Set([
    ...alumnos.map((alumno) => texto(alumno.grado) || "Sin grado"),
    ...tardanzas.map((registro) => texto(registro.grado) || "Sin grado")
  ])]
    .sort(ordenarGrados);

  filtroGrado.replaceChildren(new Option("Todos los grados", ""));
  grados.forEach((grado) => filtroGrado.add(new Option(grado, grado)));
  filtroGrado.value = grados.includes(seleccionado) ? seleccionado : "";
}

function actualizarSecciones() {
  const seleccionada = filtroSeccion.value;
  const grado = filtroGrado.value;
  const secciones = [...new Set(
    [...alumnos, ...tardanzas]
      .filter((registro) => !grado || (texto(registro.grado) || "Sin grado") === grado)
      .map((registro) => texto(registro.seccion) || "Sin sección")
  )].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));

  filtroSeccion.replaceChildren(new Option("Todas las secciones", ""));
  secciones.forEach((seccion) => filtroSeccion.add(new Option(seccion, seccion)));
  filtroSeccion.value = secciones.includes(seleccionada) ? seleccionada : "";
}

function obtenerRegistrosFiltrados() {
  return tardanzas.filter((registro) => {
    const grado = texto(registro.grado) || "Sin grado";
    const seccion = texto(registro.seccion) || "Sin sección";
    return cumpleFiltroFechas(registro) &&
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
  const conteoPorAlumno = contarRegistrosPorAlumno(tardanzas);
  const registrosReiterativas = obtenerRegistrosReiterativas();
  const totalAlumnosFiltrados = new Set(registros.map(claveAlumno)).size;

  document.getElementById("totalRegistros").textContent = registros.length.toLocaleString("es-PE");
  document.getElementById("totalAlumnos").textContent = totalAlumnosFiltrados.toLocaleString("es-PE");
  document.getElementById("totalGrupos").textContent = grupos.length.toLocaleString("es-PE");
  document.getElementById("resumenDetalle").textContent = registros.length
    ? `Se muestran ${registros.length} registro(s) en ${grupos.length} grupo(s). “N° Tardanza” indica el total de registros del alumno en el sistema.`
    : "No hay registros que coincidan con los filtros seleccionados.";

  renderizarGrupos(grupos, conteoPorAlumno);
  renderizarReiterativas(registrosReiterativas);
  renderizarGraficos(registros, grupos);
  btnDescargar.disabled = registros.length === 0;
  btnDescargarExcel.disabled = registros.length === 0 && obtenerAlumnosFiltrados().length === 0;
}

function obtenerRegistrosReiterativas() {
  return tardanzas.filter((registro) => {
    const grado = texto(registro.grado) || "Sin grado";
    const seccion = texto(registro.seccion) || "Sin sección";
    if (filtroGrado.value && grado !== filtroGrado.value) {
      return false;
    }
    if (filtroSeccion.value && seccion !== filtroSeccion.value) {
      return false;
    }
    if (filtroPeriodoReiterativas.value !== "periodo") {
      return true;
    }
    return cumpleFiltroFechas(registro);
  });
}

function obtenerRegistrosParaContarReiterativas() {
  return filtroPeriodoReiterativas.value === "periodo"
    ? tardanzas.filter(cumpleFiltroFechas)
    : tardanzas;
}

function cumpleFiltroFechas(registro) {
  const fecha = obtenerFecha(registro);
  return (!fechaDesde.value || (fecha && fecha >= fechaDesde.value)) &&
    (!fechaHasta.value || (fecha && fecha <= fechaHasta.value));
}

function contarRegistrosPorAlumno(registros) {
  const conteos = new Map();
  registros.forEach((registro) => {
    const clave = claveAlumno(registro);
    conteos.set(clave, (conteos.get(clave) || 0) + 1);
  });
  return conteos;
}

function claveAlumno(registro) {
  return texto(registro.alumnoId) || nombreAlumno(registro);
}

function nombreNormalizado(registro) {
  return [texto(registro.apellido), texto(registro.nombre)]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function obtenerAlumnosFiltrados(padronAlumnos = alumnos) {
  return padronAlumnos.filter((alumno) =>
    (!filtroGrado.value || (texto(alumno.grado) || "Sin grado") === filtroGrado.value) &&
    (!filtroSeccion.value || (texto(alumno.seccion) || "Sin sección") === filtroSeccion.value));
}

function construirEvaluacionAulas(registros, padronAlumnos) {
  const clavePorId = new Map();
  const clavePorNombre = new Map();
  const estudiantes = obtenerAlumnosFiltrados(padronAlumnos)
    .map((alumno) => {
      const clave = texto(alumno.id) || claveAlumno(alumno);
      if (texto(alumno.id)) {
        clavePorId.set(texto(alumno.id), clave);
      }
      const nombre = nombreNormalizado(alumno);
      if (nombre && !clavePorNombre.has(nombre)) {
        clavePorNombre.set(nombre, clave);
      }
      return {
        clave,
        nombre: nombreAlumno(alumno),
        grado: texto(alumno.grado) || "Sin grado",
        seccion: texto(alumno.seccion) || "Sin sección",
        tardanzas: 0
      };
    });
  const estudiantePorClave = new Map(estudiantes.map((estudiante) => [
    estudiante.clave,
    estudiante
  ]));
  const gruposPorClave = new Map();
  estudiantes.forEach((estudiante) => {
    const claveGrupo = `${estudiante.grado}\u0000${estudiante.seccion}`;
    if (!gruposPorClave.has(claveGrupo)) {
      gruposPorClave.set(claveGrupo, {
        grado: estudiante.grado,
        seccion: estudiante.seccion,
        matriculados: 0,
        estudiantesConTardanza: 0,
        registrosTardanza: 0,
        porcentaje: 0
      });
    }
    gruposPorClave.get(claveGrupo).matriculados += 1;
  });

  let registrosSinAlumnoMatriculado = 0;
  registros.forEach((registro) => {
    const id = texto(registro.alumnoId);
    const clave = (id && clavePorId.get(id)) ||
      clavePorNombre.get(nombreNormalizado(registro));
    const estudiante = clave ? estudiantePorClave.get(clave) : null;
    if (!estudiante) {
      registrosSinAlumnoMatriculado += 1;
      return;
    }
    estudiante.tardanzas += 1;
    const claveGrupo = `${estudiante.grado}\u0000${estudiante.seccion}`;
    gruposPorClave.get(claveGrupo).registrosTardanza += 1;
  });

  estudiantes.forEach((estudiante) => {
    if (estudiante.tardanzas > 0) {
      const grupo = gruposPorClave.get(`${estudiante.grado}\u0000${estudiante.seccion}`);
      grupo.estudiantesConTardanza += 1;
    }
  });
  const grupos = [...gruposPorClave.values()].map((grupo) => ({
    ...grupo,
    porcentaje: grupo.matriculados
      ? grupo.estudiantesConTardanza / grupo.matriculados
      : 0
  }));
  grupos.sort((a, b) =>
    b.porcentaje - a.porcentaje ||
    b.estudiantesConTardanza - a.estudiantesConTardanza ||
    ordenarGradoSeccion(a, b));

  const estudiantesOrdenados = [...estudiantes].sort((a, b) =>
    ordenarGradoSeccion(a, b) ||
    b.tardanzas - a.tardanzas ||
    a.nombre.localeCompare(b.nombre, "es"));
  let aulaAnterior = "";
  let posicionEnAula = 0;
  estudiantesOrdenados.forEach((estudiante) => {
    const aula = `${estudiante.grado}\u0000${estudiante.seccion}`;
    posicionEnAula = aula === aulaAnterior ? posicionEnAula + 1 : 1;
    estudiante.posicionEnAula = posicionEnAula;
    aulaAnterior = aula;
  });

  return {
    grupos,
    estudiantes: estudiantesOrdenados,
    registrosSinAlumnoMatriculado
  };
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

function renderizarGrupos(grupos, conteoPorAlumno) {
  detalleGrupos.replaceChildren();
  grupos.forEach((grupo) => {
    const seccion = document.createElement("section");
    seccion.className = "grupo-tardanzas";
    const titulo = document.createElement("h3");
    titulo.textContent = `${grupo.grado} - Sección ${grupo.seccion}`;
    const resumen = document.createElement("p");
    const alumnos = new Set(grupo.registros.map(claveAlumno));
    resumen.textContent = `${grupo.registros.length} tardanza(s) | ${alumnos.size} alumno(s)`;

    const contenedorTabla = document.createElement("div");
    contenedorTabla.className = "tabla-reporte";
    const tabla = document.createElement("table");
    tabla.innerHTML = `<thead><tr>
      <th>Alumno</th><th>N° Tardanza</th><th>Fecha y hora</th><th>Auxiliar</th><th>Apoderado</th><th>Escaneo</th>
    </tr></thead>`;
    const cuerpo = document.createElement("tbody");
    grupo.registros.forEach((registro) => {
      const fila = document.createElement("tr");
      const escaneo = formatearFechaHora(registro.fechaHoraEscaneo);
      fila.innerHTML = `<td>${escaparHTML(nombreAlumno(registro))}</td>
        <td>${conteoPorAlumno.get(claveAlumno(registro))}</td>
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

function renderizarReiterativas(registros) {
  estudiantesReiterativos.replaceChildren();
  const reiterativos = obtenerReiterativos(
    registros,
    obtenerRegistrosParaContarReiterativas()
  );
  if (filtroPeriodoReiterativas.value === "periodo") {
    const rango = fechaDesde.value || fechaHasta.value
      ? `entre ${fechaDesde.value || "cualquier fecha"} y ${fechaHasta.value || "cualquier fecha"}`
      : "sin límites de fecha (todo el historial)";
    descripcionReiterativas.textContent =
      `Se cuentan los registros ${rango}. Aparecen estudiantes con 3 o más tardanzas; grado y sección limitan quiénes aparecen.`;
  } else {
    descripcionReiterativas.textContent =
      "Se cuentan todos los registros del historial. Aparecen estudiantes con 3 o más tardanzas; grado y sección limitan quiénes aparecen.";
  }

  if (reiterativos.length === 0) {
    const mensaje = document.createElement("p");
    mensaje.textContent = filtroPeriodoReiterativas.value === "periodo"
      ? "No hay estudiantes con 3 o más tardanzas en el período y grupo seleccionados."
      : "No hay estudiantes con 3 o más tardanzas en el historial para el grupo seleccionado.";
    estudiantesReiterativos.appendChild(mensaje);
    return;
  }

  const tabla = document.createElement("table");
  tabla.innerHTML = `<thead><tr>
    <th>Estudiante</th><th>Grado</th><th>Sección</th><th>${
      filtroPeriodoReiterativas.value === "periodo"
        ? "Tardanzas en el período"
        : "Tardanzas en el historial"
    }</th><th>Fecha y hora registrada</th>
  </tr></thead>`;
  const cuerpo = document.createElement("tbody");
  const clavesReiterativos = new Set(reiterativos.map((estudiante) => estudiante.clave));
  const registrosVisibles = obtenerRegistrosParaContarReiterativas()
    .filter((registro) => clavesReiterativos.has(claveAlumno(registro)))
    .sort(compararRegistrosAntiguoPrimero);
  const filas = vistaRegistrosReiterativas.value === "reciente"
    ? obtenerUltimoRegistroPorAlumno(registrosVisibles)
    : registrosVisibles;
  const conteosPorAlumno = new Map(
    reiterativos.map((estudiante) => [estudiante.clave, estudiante.tardanzas])
  );
  filas.forEach((registro) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `<td>${escaparHTML(nombreAlumno(registro))}</td>
      <td>${escaparHTML(texto(registro.grado) || "Sin grado")}</td>
      <td>${escaparHTML(texto(registro.seccion) || "Sin sección")}</td>
      <td><strong>${conteosPorAlumno.get(claveAlumno(registro))}</strong></td>
      <td>${escaparHTML(formatearFecha(obtenerFecha(registro)))} ${escaparHTML(texto(registro.hora) || "Sin hora")}</td>`;
    cuerpo.appendChild(fila);
  });
  tabla.appendChild(cuerpo);
  const contenedor = document.createElement("div");
  contenedor.className = "tabla-reporte tabla-reiterativas";
  contenedor.appendChild(tabla);
  estudiantesReiterativos.appendChild(contenedor);
}

function compararRegistrosAntiguoPrimero(a, b) {
  const porFecha = obtenerFecha(a).localeCompare(obtenerFecha(b));
  const porHora = texto(a.hora).localeCompare(texto(b.hora));
  if (porFecha || porHora) {
    return porFecha || porHora;
  }
  return obtenerMarcaTemporal(a) - obtenerMarcaTemporal(b);
}

function obtenerMarcaTemporal(registro) {
  const fecha = convertirFecha(registro.fechaHoraEscaneo) ||
    convertirFecha(registro.fechaHoraSincronizacion);
  return fecha ? fecha.getTime() : 0;
}

function obtenerUltimoRegistroPorAlumno(registrosOrdenados) {
  return [...new Map(registrosOrdenados.map((registro) => [
    claveAlumno(registro),
    registro
  ])).values()];
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
    const conteoPorAlumno = contarRegistrosPorAlumno(tardanzas);
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const ancho = pdf.internal.pageSize.getWidth();
    const totalAlumnos = new Set(registros.map(claveAlumno)).size;
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
        head: [["Alumno", "N° Tardanza", "Grado / sección", "Fecha / hora", "Auxiliar", "Teléfono apoderado", "Escaneo"]],
        body: grupo.registros.map((registro) => [
          nombreAlumno(registro),
          conteoPorAlumno.get(claveAlumno(registro)),
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
          1: { cellWidth: 65 },
          2: { cellWidth: 95 },
          3: { cellWidth: 90 },
          4: { cellWidth: 100 },
          5: { cellWidth: 115 },
          6: { cellWidth: "auto" }
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

async function descargarExcel() {
  const registros = obtenerRegistrosFiltrados();
  if (registros.length === 0 && obtenerAlumnosFiltrados().length === 0) {
    mostrarErrorExcel("No hay registros ni alumnos matriculados que coincidan con los filtros seleccionados.");
    return;
  }

  btnDescargarExcel.disabled = true;
  estado.textContent = "Preparando el archivo Excel...";
  estado.setAttribute("role", "status");

  try {
    const { XLSX, JSZip } = await cargarDependenciasExcel();
    const grupos = agruparPorGradoSeccion(registros);
    const registrosOrdenados = [...registros].sort((a, b) => {
      const porGrupo = ordenarGradoSeccion(a, b);
      if (porGrupo) {
        return porGrupo;
      }
      const porAlumno = nombreAlumno(a).localeCompare(nombreAlumno(b), "es");
      if (porAlumno) {
        return porAlumno;
      }
      const porFecha = obtenerFecha(a).localeCompare(obtenerFecha(b));
      return porFecha || texto(a.hora).localeCompare(texto(b.hora));
    });
    const tardanzasPorAlumno = contarRegistrosPorAlumno(registros);
    const tardanzasEnElSistema = contarRegistrosPorAlumno(tardanzas);
    const registrosReiterativas = obtenerRegistrosReiterativas();
    const reiterativos = obtenerReiterativos(
      registrosReiterativas,
      obtenerRegistrosParaContarReiterativas()
    ).sort((a, b) => ordenarGradoSeccion(a, b) || a.nombre.localeCompare(b.nombre, "es"));
    const metricasAulas = construirEvaluacionAulas(registros, alumnos);
    const porFecha = new Map();
    registros.forEach((registro) => {
      const fecha = obtenerFecha(registro) || "Sin fecha";
      porFecha.set(fecha, (porFecha.get(fecha) || 0) + 1);
    });

    const filasGrupos = grupos.length
      ? grupos.map((grupo) => [`${grupo.grado} - ${grupo.seccion}`, grupo.registros.length])
      : [["Sin tardanzas en los filtros", 0]];
    const filasFechas = porFecha.size
      ? [...porFecha.entries()]
      .sort(([fechaA], [fechaB]) => fechaA.localeCompare(fechaB))
      .map(([fecha, cantidad]) => [
        fecha === "Sin fecha" ? fecha : formatearFecha(fecha),
        cantidad
      ])
      : [["Sin tardanzas en los filtros", 0]];
    const filasEstadisticas = [
      ["REPORTE DE TARDANZAS"],
      ["Generado", new Intl.DateTimeFormat("es-PE", {
        dateStyle: "long",
        timeStyle: "short"
      }).format(new Date())],
      ["Registros", registros.length],
      ["Estudiantes", new Set(registros.map(claveAlumno)).size],
      ["Grupos", grupos.length],
      ["Desde", fechaDesde.value || "Sin límite"],
      ["Hasta", fechaHasta.value || "Sin límite"],
      ["Grado", filtroGrado.value || "Todos"],
      ["Sección", filtroSeccion.value || "Todas"],
      ["Tardanzas reiterativas", filtroPeriodoReiterativas.value === "periodo"
        ? "Período seleccionado (Desde y Hasta)"
        : "Todo el historial"],
      ["Registros reiterativos visibles", vistaRegistrosReiterativas.value === "reciente"
        ? "Solo el más reciente por estudiante"
        : "Todos los registros de los estudiantes reiterativos"],
      ["TARDANZAS POR GRADO Y SECCIÓN"],
      ["Grado - sección", "Tardanzas"]
    ];
    const filaInicioGrupos = filasEstadisticas.length + 1;
    filasGrupos.forEach((fila) => filasEstadisticas.push(fila));
    const filaFinGrupos = filasEstadisticas.length;
    filasEstadisticas.push(["TARDANZAS POR FECHA"], ["Fecha", "Tardanzas"]);
    const filaInicioFechas = filasEstadisticas.length + 1;
    filasFechas.forEach((fila) => filasEstadisticas.push(fila));
    const filaFinFechas = filasEstadisticas.length;

    const hojaEstadisticas = XLSX.utils.aoa_to_sheet(filasEstadisticas);
    hojaEstadisticas["!cols"] = [
      { wch: 30 }, { wch: 18 }
    ];

    const filasRegistros = [[
      "Estudiante", "Grado", "Sección", "Fecha", "Hora",
      "Tardanzas en el período", "Tardanzas en el sistema", "Auxiliar",
      "Teléfono del apoderado", "Fecha y hora de escaneo"
    ]];
    registrosOrdenados.forEach((registro) => {
      filasRegistros.push([
        nombreAlumno(registro),
        texto(registro.grado) || "Sin grado",
        texto(registro.seccion) || "Sin sección",
        formatearFecha(obtenerFecha(registro)) || "Sin fecha",
        texto(registro.hora) || "Sin hora",
        tardanzasPorAlumno.get(claveAlumno(registro)),
        tardanzasEnElSistema.get(claveAlumno(registro)) || 0,
        texto(registro.auxiliarNombre) || "No registrado",
        texto(registro.telefonoApoderado) || "No registrado",
        formatearFechaHora(registro.fechaHoraEscaneo) || "No disponible"
      ]);
    });
    const hojaRegistros = XLSX.utils.aoa_to_sheet(filasRegistros);
    hojaRegistros["!cols"] = [
      { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
      { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 24 }, { wch: 24 }
    ];
    hojaRegistros["!autofilter"] = {
      ref: `A1:J${filasRegistros.length}`
    };

    const filasReiterativas = [[
      "Estudiante", "Grado", "Sección",
      filtroPeriodoReiterativas.value === "periodo"
        ? "Tardanzas en el período seleccionado"
        : "Tardanzas en todo el historial",
      "Fecha y hora registrada"
    ]];
    const clavesReiterativos = new Set(reiterativos.map((estudiante) => estudiante.clave));
    const registrosReiterativosOrdenados = obtenerRegistrosParaContarReiterativas()
      .filter((registro) => clavesReiterativos.has(claveAlumno(registro)))
      .sort((a, b) =>
        nombreAlumno(a).localeCompare(nombreAlumno(b), "es") ||
        compararRegistrosAntiguoPrimero(a, b));
    const filasReiterativasVisibles = vistaRegistrosReiterativas.value === "reciente"
      ? obtenerUltimoRegistroPorAlumno(registrosReiterativosOrdenados)
      : registrosReiterativosOrdenados;
    const conteoReiterativoPorAlumno = new Map(
      reiterativos.map((estudiante) => [estudiante.clave, estudiante.tardanzas])
    );
    filasReiterativasVisibles.forEach((registro) => filasReiterativas.push([
      nombreAlumno(registro),
      texto(registro.grado) || "Sin grado",
      texto(registro.seccion) || "Sin sección",
      conteoReiterativoPorAlumno.get(claveAlumno(registro)),
      `${formatearFecha(obtenerFecha(registro))} ${texto(registro.hora) || "Sin hora"}`
    ]));
    if (reiterativos.length === 0) {
      filasReiterativas.push([
        filtroPeriodoReiterativas.value === "periodo"
          ? "No hay estudiantes con 3 o más tardanzas en el período y grupo seleccionados."
          : "No hay estudiantes con 3 o más tardanzas en el historial para el grupo seleccionado.",
        "No aplica",
        "No aplica",
        0,
        "No aplica"
      ]);
    }
    const hojaReiterativas = XLSX.utils.aoa_to_sheet(filasReiterativas);
    hojaReiterativas["!cols"] = [
      { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 26 }
    ];
    if (reiterativos.length) {
      hojaReiterativas["!autofilter"] = {
        ref: `A1:E${filasReiterativas.length}`
      };
    }

    const filasEvaluacion = [
      ["EVALUACIÓN POR GRADOS Y SECCIONES"],
      ["Generado", new Intl.DateTimeFormat("es-PE", {
        dateStyle: "long",
        timeStyle: "short"
      }).format(new Date())],
      ["Período", `${fechaDesde.value || "Sin límite"} a ${fechaHasta.value || "Sin límite"}`],
      ["Grado", filtroGrado.value || "Todos"],
      ["Sección", filtroSeccion.value || "Todas"],
      ["El porcentaje es estudiantes con tardanzas dividido entre alumnos matriculados del aula."]
    ];
    while (filasEvaluacion.length < 44) {
      filasEvaluacion.push([]);
    }
    filasEvaluacion.push(["RANKING DE AULAS"]);
    filasEvaluacion.push([
      "Aula", "Posición", "Grado", "Sección", "Matrícula",
      "Estudiantes con tardanzas", "Porcentaje con tardanzas", "Registros"
    ]);
    const filaInicioRankingAulas = filasEvaluacion.length + 1;
    const aulasEvaluadas = metricasAulas.grupos.length
      ? metricasAulas.grupos
      : [{ grado: "Sin aulas matriculadas", seccion: "", matriculados: 0, estudiantesConTardanza: 0, porcentaje: 0, registrosTardanza: 0 }];
    aulasEvaluadas.forEach((aula, indice) => filasEvaluacion.push([
      aula.seccion ? `${aula.grado} - ${aula.seccion}` : aula.grado,
      indice + 1,
      aula.grado,
      aula.seccion || "No aplica",
      aula.matriculados,
      aula.estudiantesConTardanza,
      aula.porcentaje,
      aula.registrosTardanza
    ]));
    const filaFinRankingAulas = filasEvaluacion.length;
    filasEvaluacion.push(["RANKING DE ESTUDIANTES POR AULA"]);
    filasEvaluacion.push([
      "Grado", "Sección", "Posición en aula", "Estudiante", "Tardanzas en el período"
    ]);
    const estudiantesEvaluados = metricasAulas.estudiantes
      .filter((estudiante) => estudiante.tardanzas > 0);
    estudiantesEvaluados.forEach((estudiante) => filasEvaluacion.push([
      estudiante.grado,
      estudiante.seccion || "No aplica",
      estudiante.posicionEnAula,
      estudiante.nombre,
      estudiante.tardanzas
    ]));
    filasEvaluacion.push([
      "Registros de tardanza sin coincidencia en la matrícula",
      metricasAulas.registrosSinAlumnoMatriculado
    ]);
    filasEvaluacion.push(["TOP 10 ESTUDIANTES CON MÁS TARDANZAS"]);
    filasEvaluacion.push(["Estudiante", "Aula", "Tardanzas"]);
    const filaInicioTopAlumnos = filasEvaluacion.length + 1;
    const topAlumnos = metricasAulas.estudiantes
      .filter((estudiante) => estudiante.tardanzas > 0)
      .sort((a, b) =>
        b.tardanzas - a.tardanzas ||
        ordenarGradoSeccion(a, b) ||
        a.nombre.localeCompare(b.nombre, "es"))
      .slice(0, 10);
    topAlumnos.forEach((estudiante) => filasEvaluacion.push([
      estudiante.nombre,
      estudiante.grado && estudiante.seccion
        ? `${estudiante.grado} - ${estudiante.seccion}`
        : "No aplica",
      estudiante.tardanzas
    ]));
    const filaFinTopAlumnos = filasEvaluacion.length;
    const hojaEvaluacion = XLSX.utils.aoa_to_sheet(filasEvaluacion);
    hojaEvaluacion["!cols"] = [
      { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
      { wch: 14 }, { wch: 25 }, { wch: 24 }, { wch: 14 }
    ];
    for (let fila = filaInicioRankingAulas; fila <= filaFinRankingAulas; fila += 1) {
      const celdaPorcentaje = hojaEvaluacion[XLSX.utils.encode_cell({
        r: fila - 1,
        c: 6
      })];
      if (celdaPorcentaje) {
        celdaPorcentaje.z = "0%";
      }
    }

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hojaEstadisticas, "Estadísticas");
    XLSX.utils.book_append_sheet(libro, hojaRegistros, "Registros");
    XLSX.utils.book_append_sheet(libro, hojaReiterativas, "Tardanzas reiterativas");
    XLSX.utils.book_append_sheet(libro, hojaEvaluacion, "Evaluación por aulas");

    const contenido = XLSX.write(libro, { bookType: "xlsx", type: "array" });
    const zip = await JSZip.loadAsync(contenido);
    await agregarGraficosExcel(zip, filasGrupos, filasFechas, {
      filaInicioGrupos,
      filaFinGrupos,
      filaInicioFechas,
      filaFinFechas
    });
    await agregarGraficosEvaluacion(zip, metricasAulas, {
      filaInicioRankingAulas,
      filaFinRankingAulas,
      filaInicioTopAlumnos,
      filaFinTopAlumnos
    });
    const contenidoFinal = await zip.generateAsync({ type: "uint8array" });
    validarContenidoExcel(XLSX, contenidoFinal, registros.length);
    const archivo = new Blob([contenidoFinal], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `reporte-tardanzas-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    estado.textContent = "Archivo Excel generado y descargado correctamente.";
    estado.setAttribute("role", "status");
  } catch (error) {
    console.error("Error al generar el Excel del reporte de tardanzas:", error);
    mostrarErrorExcel(error instanceof Error
      ? error.message
      : "No se pudo generar el archivo Excel. Revisa la consola del navegador para ver el detalle del error.");
  } finally {
    btnDescargarExcel.disabled =
      obtenerRegistrosFiltrados().length === 0 && obtenerAlumnosFiltrados().length === 0;
  }
}

function obtenerReiterativos(registros, registrosParaContar = registros) {
  const estudiantes = new Map();
  registros.forEach((registro) => {
    const clave = claveAlumno(registro);
    if (!estudiantes.has(clave)) {
      estudiantes.set(clave, {
        nombre: nombreAlumno(registro),
        grado: texto(registro.grado) || "Sin grado",
        seccion: texto(registro.seccion) || "Sin sección",
        tardanzas: 0,
        clave
      });
    }
  });
  registrosParaContar.forEach((registro) => {
    const estudiante = estudiantes.get(claveAlumno(registro));
    if (estudiante) {
      estudiante.tardanzas += 1;
    }
  });
  return [...estudiantes.values()]
    .filter((estudiante) => estudiante.tardanzas >= 3)
    .sort((a, b) => b.tardanzas - a.tardanzas || a.nombre.localeCompare(b.nombre, "es"));
}

async function cargarDependenciasExcel() {
  if (typeof window.XLSX?.utils?.aoa_to_sheet !== "function") {
    await cargarScriptExcel(
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
    );
  }
  if (typeof window.JSZip !== "function") {
    await cargarScriptExcel(
      "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
    );
  }
  if (typeof window.XLSX?.utils?.aoa_to_sheet !== "function" ||
      typeof window.JSZip !== "function") {
    throw new Error("No se pudieron cargar las librerías para generar el Excel. Revisa tu conexión a internet y vuelve a intentarlo.");
  }
  return { XLSX: window.XLSX, JSZip: window.JSZip };
}

function cargarScriptExcel(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(new Error("No se pudieron cargar las librerías para generar el Excel. Revisa tu conexión a internet y vuelve a intentarlo."));
    };
    document.head.appendChild(script);
  });
}

async function agregarGraficosExcel(zip, filasGrupos, filasFechas, rangos) {
  const nombresGrupos = filasGrupos.map(([nombre]) => nombre);
  const cantidadesGrupos = filasGrupos.map(([, cantidad]) => cantidad);
  const nombresFechas = filasFechas.map(([fecha]) => fecha);
  const cantidadesFechas = filasFechas.map(([, cantidad]) => cantidad);
  const { filaInicioGrupos, filaFinGrupos, filaInicioFechas, filaFinFechas } = rangos;
  let xmlHoja = await zip.file("xl/worksheets/sheet1.xml").async("string");
  if (!xmlHoja.includes("xmlns:r=")) {
    xmlHoja = xmlHoja.replace(
      /<worksheet\b/,
      '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    );
  }
  const xmlHojaConDibujo = xmlHoja.replace("</worksheet>", '<drawing r:id="rId1"/></worksheet>');
  zip.file("xl/worksheets/sheet1.xml", xmlHojaConDibujo);

  zip.file("xl/worksheets/_rels/sheet1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`);
  zip.file("xl/drawings/drawing1.xml", crearXmlDibujoGraficos());
  zip.file("xl/drawings/_rels/drawing1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart2.xml"/>
</Relationships>`);
  zip.file("xl/charts/chart1.xml", crearXmlGrafico({
    tipo: "bar",
    titulo: "Tardanzas por grado y sección",
    categories: nombresGrupos,
    values: cantidadesGrupos,
    formulaCategorias: `'Estadísticas'!$A$${filaInicioGrupos}:$A$${filaFinGrupos}`,
    formulaValores: `'Estadísticas'!$B$${filaInicioGrupos}:$B$${filaFinGrupos}`
  }));
  zip.file("xl/charts/chart2.xml", crearXmlGrafico({
    tipo: "line",
    titulo: "Tardanzas por fecha",
    categories: nombresFechas,
    values: cantidadesFechas,
    formulaCategorias: `'Estadísticas'!$A$${filaInicioFechas}:$A$${filaFinFechas}`,
    formulaValores: `'Estadísticas'!$B$${filaInicioFechas}:$B$${filaFinFechas}`
  }));

  const tipos = await zip.file("[Content_Types].xml").async("string");
  zip.file("[Content_Types].xml", tipos.replace(
    "</Types>",
    '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' +
    '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>' +
    '<Override PartName="/xl/charts/chart2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>' +
    "</Types>"
  ));
}

async function agregarGraficosEvaluacion(zip, metricas, rangos) {
  const { filaInicioRankingAulas, filaFinRankingAulas, filaInicioTopAlumnos, filaFinTopAlumnos } = rangos;
  const aulas = metricas.grupos.length
    ? metricas.grupos
    : [{ grado: "Sin aulas matriculadas", seccion: "", porcentaje: 0 }];
  const topAlumnos = metricas.estudiantes
    .filter((estudiante) => estudiante.tardanzas > 0)
    .sort((a, b) =>
      b.tardanzas - a.tardanzas ||
      ordenarGradoSeccion(a, b) ||
      a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, 10);
  const ultimaFilaAulas = Math.max(filaFinRankingAulas, filaInicioRankingAulas);
  const ultimaFilaAlumnos = Math.max(
    filaFinTopAlumnos,
    filaInicioTopAlumnos
  );
  const rutaHoja = "xl/worksheets/sheet4.xml";
  let xmlHoja = await zip.file(rutaHoja).async("string");
  if (!xmlHoja.includes("xmlns:r=")) {
    xmlHoja = xmlHoja.replace(
      /<worksheet\b/,
      '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    );
  }
  zip.file(rutaHoja, xmlHoja.replace("</worksheet>", '<drawing r:id="rId1"/></worksheet>'));
  zip.file("xl/worksheets/_rels/sheet4.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing2.xml"/>
</Relationships>`);
  zip.file("xl/drawings/drawing2.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  ${crearAnclaGrafico(4, "Chart 3", "rId1", 6, 24, 0, 13)}
  ${crearAnclaGrafico(5, "Chart 4", "rId2", 6, 24, 14, 27)}
  ${crearAnclaGrafico(6, "Chart 5", "rId3", 25, 43, 0, 13)}
  ${crearAnclaGrafico(7, "Chart 6", "rId4", 25, 43, 14, 27)}
</xdr:wsDr>`);
  zip.file("xl/drawings/_rels/drawing2.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart3.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart4.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart5.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart6.xml"/>
</Relationships>`);
  zip.file("xl/charts/chart3.xml", crearXmlGrafico({
    tipo: "bar",
    titulo: "Porcentaje de estudiantes con tardanzas por aula",
    categories: aulas.map((aula) => aula.seccion
      ? `${aula.grado} - ${aula.seccion}`
      : aula.grado),
    values: aulas.map((aula) => aula.porcentaje),
    formulaCategorias: `'Evaluación por aulas'!$A$${filaInicioRankingAulas}:$A$${ultimaFilaAulas}`,
    formulaValores: `'Evaluación por aulas'!$G$${filaInicioRankingAulas}:$G$${ultimaFilaAulas}`,
    formatoNumero: "0%"
  }));
  zip.file("xl/charts/chart4.xml", crearXmlGrafico({
    tipo: "bar",
    titulo: "Estudiantes con tardanzas por aula",
    categories: aulas.map((aula) => aula.seccion
      ? `${aula.grado} - ${aula.seccion}`
      : aula.grado),
    values: aulas.map((aula) => aula.estudiantesConTardanza || 0),
    formulaCategorias: `'Evaluación por aulas'!$A$${filaInicioRankingAulas}:$A$${ultimaFilaAulas}`,
    formulaValores: `'Evaluación por aulas'!$F$${filaInicioRankingAulas}:$F$${ultimaFilaAulas}`
  }));
  zip.file("xl/charts/chart5.xml", crearXmlGrafico({
    tipo: "bar",
    titulo: "Registros de tardanza por aula",
    categories: aulas.map((aula) => aula.seccion
      ? `${aula.grado} - ${aula.seccion}`
      : aula.grado),
    values: aulas.map((aula) => aula.registrosTardanza || 0),
    formulaCategorias: `'Evaluación por aulas'!$A$${filaInicioRankingAulas}:$A$${ultimaFilaAulas}`,
    formulaValores: `'Evaluación por aulas'!$H$${filaInicioRankingAulas}:$H$${ultimaFilaAulas}`
  }));
  zip.file("xl/charts/chart6.xml", crearXmlGrafico({
    tipo: "bar",
    titulo: "Estudiantes con más tardanzas (top 10)",
    categories: topAlumnos.map((estudiante) => estudiante.nombre),
    values: topAlumnos.map((estudiante) => estudiante.tardanzas),
    formulaCategorias: `'Evaluación por aulas'!$A$${filaInicioTopAlumnos}:$A$${ultimaFilaAlumnos}`,
    formulaValores: `'Evaluación por aulas'!$C$${filaInicioTopAlumnos}:$C$${ultimaFilaAlumnos}`
  }));

  const tipos = await zip.file("[Content_Types].xml").async("string");
  zip.file("[Content_Types].xml", tipos.replace(
    "</Types>",
    '<Override PartName="/xl/drawings/drawing2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' +
    '<Override PartName="/xl/charts/chart3.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>' +
    '<Override PartName="/xl/charts/chart4.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>' +
    '<Override PartName="/xl/charts/chart5.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>' +
    '<Override PartName="/xl/charts/chart6.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>' +
    "</Types>"
  ));
}

function validarContenidoExcel(XLSX, archivo, totalRegistros) {
  const libro = XLSX.read(archivo, { type: "array" });
  const hojasRequeridas = [
    "Estadísticas",
    "Registros",
    "Tardanzas reiterativas",
    "Evaluación por aulas"
  ];
  const faltantes = hojasRequeridas.filter((nombre) => !libro.SheetNames.includes(nombre));
  if (faltantes.length) {
    throw new Error(`El archivo Excel quedó incompleto. Faltan estas hojas: ${faltantes.join(", ")}.`);
  }

  const registrosEnExcel = XLSX.utils.sheet_to_json(libro.Sheets.Registros, {
    header: 1,
    blankrows: false
  });
  if (registrosEnExcel.length < totalRegistros + 1) {
    throw new Error("El archivo Excel no contiene todos los registros. No se descargó para evitar un reporte vacío o incompleto.");
  }

  const estadisticas = XLSX.utils.sheet_to_json(libro.Sheets["Estadísticas"], {
    header: 1,
    blankrows: false
  });
  if (estadisticas.length === 0 || !estadisticas[0]?.[0]) {
    throw new Error("El archivo Excel no contiene las estadísticas esperadas. No se descargó para evitar un reporte vacío.");
  }

  const evaluacion = XLSX.utils.sheet_to_json(libro.Sheets["Evaluación por aulas"], {
    header: 1,
    blankrows: false
  });
  if (evaluacion.length < 2 || !String(evaluacion[0]?.[0] || "").includes("EVALUACIÓN")) {
    throw new Error("El archivo Excel no contiene la evaluación de aulas esperada. No se descargó el reporte incompleto.");
  }
}

function crearXmlDibujoGraficos() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  ${crearAnclaGrafico(2, "Chart 1", "rId1", 0, 18)}
  ${crearAnclaGrafico(3, "Chart 2", "rId2", 19, 37)}
</xdr:wsDr>`;
}

function crearAnclaGrafico(id, nombre, relacion, filaInicio, filaFin, columnaInicio = 3, columnaFin = 15) {
  return `<xdr:twoCellAnchor editAs="oneCell">
    <xdr:from><xdr:col>${columnaInicio}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${filaInicio}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>${columnaFin}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${filaFin}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="${nombre}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${relacion}"/></a:graphicData></a:graphic>
    </xdr:graphicFrame><xdr:clientData/>
  </xdr:twoCellAnchor>`;
}

function crearXmlGrafico({
  tipo,
  titulo,
  categories,
  values,
  formulaCategorias,
  formulaValores,
  formatoNumero = "0"
}) {
  const categoriasCache = categories.map((valor, indice) =>
    `<c:pt idx="${indice}"><c:v>${escaparXml(valor)}</c:v></c:pt>`).join("");
  const valoresCache = values.map((valor, indice) =>
    `<c:pt idx="${indice}"><c:v>${Number(valor)}</c:v></c:pt>`).join("");
  const idCategoria = "48650112";
  const idValor = "48672768";
  const estiloSerie = tipo === "bar"
    ? '<c:spPr><a:solidFill><a:srgbClr val="38BDF8"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>'
    : '<c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="0284C7"/></a:solidFill></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker>';
  const serie = `<c:ser><c:idx val="0"/><c:order val="0"/>
    <c:tx><c:v>Tardanzas</c:v></c:tx>
    ${estiloSerie}
    <c:cat><c:strRef><c:f>${escaparXml(formulaCategorias)}</c:f><c:strCache><c:ptCount val="${categories.length}"/>${categoriasCache}</c:strCache></c:strRef></c:cat>
    <c:val><c:numRef><c:f>${escaparXml(formulaValores)}</c:f><c:numCache><c:formatCode>${escaparXml(formatoNumero)}</c:formatCode><c:ptCount val="${values.length}"/>${valoresCache}</c:numCache></c:numRef></c:val>
  </c:ser>`;
  const tipoGrafico = tipo === "bar"
    ? `<c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="0"/>${serie}<c:gapWidth val="80"/><c:overlap val="0"/><c:axId val="${idCategoria}"/><c:axId val="${idValor}"/></c:barChart>`
    : `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${serie}<c:marker val="1"/><c:smooth val="0"/><c:axId val="${idCategoria}"/><c:axId val="${idValor}"/></c:lineChart>`;
  const ejeCategoria = `<c:catAx><c:axId val="${idCategoria}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${tipo === "bar" ? "l" : "b"}"/><c:tickLblPos val="nextTo"/><c:crossAx val="${idValor}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx>`;
  const ejeValor = `<c:valAx><c:axId val="${idValor}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${tipo === "bar" ? "b" : "l"}"/><c:majorGridlines/><c:numFmt formatCode="${escaparXml(formatoNumero)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${idCategoria}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <c:lang val="es-PE"/><c:roundedCorners val="0"/><c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr/></a:pPr><a:r><a:rPr lang="es-PE" sz="1400" b="1"/><a:t>${titulo}</a:t></a:r><a:endParaRPr lang="es-PE"/></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
    <c:plotArea><c:layout/>${tipoGrafico}${ejeCategoria}${ejeValor}</c:plotArea><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/>
  </c:chart><c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings>
</c:chartSpace>`;
}

function escaparXml(valor) {
  return String(valor).replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  })[caracter]);
}

function mostrarErrorExcel(mensaje) {
  estado.textContent = mensaje;
  estado.setAttribute("role", "alert");
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

function ordenarGradoSeccion(a, b) {
  const porGrado = ordenarGrados(texto(a.grado) || "Sin grado", texto(b.grado) || "Sin grado");
  const seccionA = texto(a.seccion) || "Sin sección";
  const seccionB = texto(b.seccion) || "Sin sección";
  return porGrado || seccionA.localeCompare(seccionB, "es", { numeric: true });
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