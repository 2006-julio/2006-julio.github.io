import {
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  auth,
  db
} from "./firebase-alumnos.js";

const XLSX = window.XLSX;
const camposMapeo = [
  ["apellido", "Apellidos"],
  ["nombre", "Nombres"],
  ["combinado", "Apellidos y nombres juntos"],
  ["grado", "Grado"],
  ["seccion", "Sección"],
  ["telefono", "Teléfono del apoderado"],
  ["dni", "DNI (solo para detectar duplicados)"]
];
const gradosValidos = ["1ro", "2do", "3ro", "4to", "5to"];
const seccionesValidas = "ABCDEFGHIJKLMNOPQR".split("");
const tamanoLoteLectura = 400;
const tamanoLoteEscritura = 400;

const btnAbrir = document.getElementById("btnAbrirImportador");
const dialogo = document.getElementById("modalImportarExcel");
const btnCerrar = document.getElementById("btnCerrarImportador");
const btnCancelar = document.getElementById("btnCancelarImportacion");
const btnAnalizar = document.getElementById("btnAnalizarExcel");
const btnConfirmar = document.getElementById("btnConfirmarImportacion");
const btnReintentar = document.getElementById("btnReintentarImportacion");
const archivoInput = document.getElementById("archivoExcel");
const nombreArchivo = document.getElementById("nombreArchivoExcel");
const panelVistaPrevia = document.getElementById("panelVistaPreviaExcel");
const mapeosContainer = document.getElementById("mapeosExcel");
const filasContainer = document.getElementById("filasVistaPreviaExcel");
const elementosFila = new Map();
const resumen = document.getElementById("resumenImportacion");
const estado = document.getElementById("estadoImportacion");
const errorImportacion = document.getElementById("errorImportacion");
const progreso = document.getElementById("progresoImportacion");

let autenticado = false;
let analizando = false;
let importando = false;
let libroActual = null;
let bloques = [];
let filas = [];
let filaSiguienteId = 0;
let filasFallidas = [];
let escriturasCompletadas = 0;
let clavesAlumnosExistentes = new Set();
let duplicadosComprobados = false;

btnAbrir.disabled = true;

onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    window.location.href = "./login.html";
    return;
  }

  autenticado = true;
  btnAbrir.disabled = false;
});

btnAbrir.addEventListener("click", () => dialogo.showModal());
btnCerrar.addEventListener("click", cerrarImportador);
btnCancelar.addEventListener("click", cerrarImportador);
archivoInput.addEventListener("change", manejarSeleccionArchivo);
btnAnalizar.addEventListener("click", analizarArchivo);
btnConfirmar.addEventListener("click", confirmarImportacion);
btnReintentar.addEventListener("click", () => importarFilas(filasFallidas, true));

filasContainer.addEventListener("change", actualizarCampoFila);
filasContainer.addEventListener("change", (evento) => {
  if (evento.target.matches("[data-incluir]")) {
    const fila = buscarFila(evento.target.dataset.filaId);
    if (fila) {
      fila.incluir = evento.target.checked;
      if (evento.target.checked && (fila.duplicadoExcel || fila.duplicadoFirebase)) {
        fila.revisadaDuplicado = true;
      }
      actualizarResumen();
    }
  }
});

dialogo.addEventListener("cancel", (evento) => {
  if (importando || analizando) {
    evento.preventDefault();
  }
});

function cerrarImportador() {
  if (importando || analizando) {
    return;
  }
  dialogo.close();
}

function manejarSeleccionArchivo() {
  const archivo = archivoInput.files?.[0];
  nombreArchivo.textContent = archivo
    ? `${archivo.name} (${formatearBytes(archivo.size)})`
    : "No se ha seleccionado un archivo.";
  btnAnalizar.disabled = !archivo || !autenticado;
  panelVistaPrevia.hidden = true;
  btnConfirmar.disabled = true;
  btnReintentar.hidden = true;
  mapeosContainer.replaceChildren();
  filasContainer.replaceChildren();
  resumen.textContent = "";
  estado.textContent = "";
  errorImportacion.textContent = "";
  libroActual = null;
  bloques = [];
  filas = [];
  filasFallidas = [];
  duplicadosComprobados = false;
  clavesAlumnosExistentes = new Set();
}

async function analizarArchivo() {
  if (analizando || !autenticado) {
    return;
  }

  const archivo = archivoInput.files?.[0];
  if (!archivo) {
    mostrarError("Selecciona un archivo Excel.");
    return;
  }

  const extension = archivo.name.split(".").pop()?.toLowerCase();
  if (!["xlsx", "xls", "xlsb"].includes(extension)) {
    mostrarError("Formato no compatible. Selecciona un archivo .xlsx, .xls o .xlsb.");
    return;
  }
  if (typeof XLSX === "undefined") {
    mostrarError("No se pudo cargar SheetJS. Revisa tu conexión e inténtalo nuevamente.");
    return;
  }

  analizando = true;
  duplicadosComprobados = false;
  btnConfirmar.disabled = true;
  btnAnalizar.disabled = true;
  btnCancelar.disabled = true;
  btnCerrar.disabled = true;
  btnAnalizar.textContent = "Analizando...";
  errorImportacion.textContent = "";
  estado.textContent = "Leyendo el archivo localmente...";

  try {
    const contenido = await archivo.arrayBuffer();
    libroActual = XLSX.read(contenido, {
      type: "array",
      cellDates: false,
      dense: false
    });

    bloques = detectarBloques(libroActual);
    libroActual = null;
    if (bloques.length === 0) {
      throw new Error(
        "No se identificaron tablas con encabezados de alumnos. Revisa que haya una fila con columnas como apellidos, nombres, grado, sección, celular o DNI."
      );
    }

    filas = [];
    filaSiguienteId = 0;
    bloques.forEach((bloque) => {
      bloque.filas = [];
      crearFilasDeBloque(bloque);
      bloque.matriz = null;
    });

    if (filas.length === 0) {
      throw new Error("El archivo no contiene filas de alumnos debajo de los encabezados detectados.");
    }

    panelVistaPrevia.hidden = false;
    renderizarMapeos();
    renderizarFilas();
    actualizarResumen();
    estado.textContent = `Se detectaron ${filas.length} fila(s). Comprobando posibles duplicados en Firebase...`;

    const existentes = await cargarAlumnosExistentes();
    clavesAlumnosExistentes = new Set(existentes.map(claveNatural));
    analizarDuplicados(existentes);
    duplicadosComprobados = true;
    actualizarResumen();
    actualizarEstadosFilas();
    estado.textContent =
      "Revisa las columnas detectadas, los datos y las filas marcadas antes de confirmar.";
  } catch (error) {
    console.error(error);
    mostrarError(error instanceof Error
      ? error.message
      : "No se pudo leer o validar el archivo.");
    estado.textContent = "No se pudo preparar la vista previa.";
  } finally {
    analizando = false;
    btnAnalizar.disabled = !archivoInput.files?.[0];
    btnCancelar.disabled = false;
    btnCerrar.disabled = false;
    btnAnalizar.textContent = "Analizar archivo y mostrar vista previa";
  }
}

function detectarBloques(libro) {
  const detectados = [];

  libro.SheetNames.forEach((nombreHoja) => {
    const hoja = libro.Sheets[nombreHoja];
    const rangoHoja = hoja["!ref"]
      ? XLSX.utils.decode_range(hoja["!ref"])
      : { s: { r: 0, c: 0 } };
    const matriz = XLSX.utils.sheet_to_json(hoja, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: true
    });
    const filasEncabezado = [];

    matriz.forEach((fila, indice) => {
      encontrarEncabezados(fila).forEach((encabezado) => {
        filasEncabezado.push({ indice, ...encabezado });
      });
    });

    filasEncabezado.forEach((entrada, indice) => {
      const siguiente = filasEncabezado.find((candidato) => candidato.indice > entrada.indice);
      const bloque = {
        id: `${nombreHoja}-${entrada.indice}-${indice}`,
        hoja: nombreHoja,
        matriz,
        encabezadoFila: entrada.indice,
        fin: siguiente ? siguiente.indice : matriz.length,
        columnaInicio: entrada.columnaInicio,
        columnaFin: entrada.columnaFin,
        filaBase: rangoHoja.s.r,
        columnaBase: rangoHoja.s.c,
        encabezados: entrada.encabezado.encabezados,
        mapeo: entrada.encabezado.mapeo,
        gradoHoja: detectarGrado(nombreHoja),
        filas: []
      };
      detectados.push(bloque);
    });
  });

  return detectados;
}

function encontrarEncabezados(fila) {
  const celdasOcupadas = [];
  fila.forEach((valor, indice) => {
    if (String(valor ?? "").trim()) {
      celdasOcupadas.push(indice);
    }
  });
  if (celdasOcupadas.length === 0) {
    return [];
  }

  const rangos = [];
  let inicio = celdasOcupadas[0];
  let anterior = inicio;
  celdasOcupadas.slice(1).forEach((indice) => {
    if (indice !== anterior + 1) {
      rangos.push([inicio, anterior + 1]);
      inicio = indice;
    }
    anterior = indice;
  });
  rangos.push([inicio, anterior + 1]);

  const porSegmentos = rangos.flatMap(([columnaInicio, columnaFin]) => {
    const encabezado = detectarEncabezado(fila.slice(columnaInicio, columnaFin));
    return encabezado
      ? [{ columnaInicio, columnaFin, encabezado }]
      : [];
  });
  if (porSegmentos.length > 1) {
    return porSegmentos;
  }

  const encabezadoCompleto = detectarEncabezado(fila);
  if (encabezadoCompleto) {
    return [{
      columnaInicio: 0,
      columnaFin: fila.length,
      encabezado: encabezadoCompleto
    }];
  }
  return porSegmentos;
}

function detectarEncabezado(fila) {
  const encabezados = fila.map((valor) => String(valor ?? "").trim());
  const mapeo = {};

  encabezados.forEach((texto, indice) => {
    const campo = reconocerColumna(texto);
    if (campo && mapeo[campo] === undefined) {
      mapeo[campo] = indice;
    }
  });

  const tieneDatosIdentificativos =
    mapeo.combinado !== undefined ||
    (mapeo.apellido !== undefined && mapeo.nombre !== undefined);
  const tieneOtraColumna =
    mapeo.grado !== undefined ||
    mapeo.seccion !== undefined ||
    mapeo.telefono !== undefined ||
    mapeo.dni !== undefined;

  return tieneDatosIdentificativos && tieneOtraColumna
    ? { encabezados, mapeo }
    : null;
}

function reconocerColumna(encabezado) {
  const texto = normalizarComparacion(encabezado);
  if (!texto) {
    return null;
  }
  if (/\b(apellidos?\s*(y|,)\s*nombres?|apellidos?\s+nombres?|apellidos?\s+y\s+nombres?\s+del\s+alumno)\b/.test(texto)) {
    return "combinado";
  }
  if (/\b(dni|documento\s*nacional|doc\.?\s*identidad)\b/.test(texto)) {
    return "dni";
  }
  if (/\b(telefono|celular|movil|contacto|numero\s*(de\s*)?(celular|telefono))\b/.test(texto)) {
    return "telefono";
  }
  if (/\b(grado|ano|nivel)\b/.test(texto)) {
    return "grado";
  }
  if (/\b(seccion|secc|aula)\b/.test(texto)) {
    return "seccion";
  }
  if (/\b(apellido|apellidos)\b/.test(texto)) {
    return "apellido";
  }
  if (/\b(nombre|nombres|alumno|estudiante)\b/.test(texto)) {
    return "nombre";
  }
  return null;
}

function crearFilasDeBloque(bloque) {
  for (let indice = bloque.encabezadoFila + 1; indice < bloque.fin; indice += 1) {
    const filaCompleta = bloque.matriz[indice] || [];
    const celdas = filaCompleta.slice(bloque.columnaInicio, bloque.columnaFin);
    if (celdas.every((celda) => String(celda ?? "").trim() === "")) {
      continue;
    }
    if (encontrarEncabezados(celdas).length > 0) {
      continue;
    }
    if (pareceFilaNoAlumno(celdas)) {
      continue;
    }

    const fila = {
      id: String(filaSiguienteId++),
      bloqueId: bloque.id,
      hoja: bloque.hoja,
      filaOrigen: bloque.filaBase + indice + 1,
      celdas,
      incluido: true,
      dni: "",
      apellido: "",
      nombre: "",
      grado: "",
      seccion: "",
      telefono: "",
      razones: [],
      alertas: [],
      separacionAmbigua: false,
      apta: false,
      tipoEstado: "review",
      duplicadoExcel: false,
      duplicadoFirebase: false,
      duplicadoDni: false,
      revisadaDuplicado: false,
      importada: false,
      fallida: false,
      error: ""
    };
    aplicarMapeo(fila, bloque);
    bloque.filas.push(fila);
    filas.push(fila);
  }
}

function pareceFilaNoAlumno(celdas) {
  const textos = celdas.map((celda) => String(celda ?? "").trim()).filter(Boolean);
  if (textos.length > 2) {
    return false;
  }
  const fila = normalizarComparacion(textos.join(" "));
  return /\b(total|subtotal|observaciones|observacion|resumen|firma|director|directora|tutor|tutora|pagina|reporte|listado|alumnos\s+matriculados)\b/.test(fila);
}

function aplicarMapeo(fila, bloque) {
  const valores = {};
  Object.entries(bloque.mapeo).forEach(([campo, indice]) => {
    valores[campo] = String(fila.celdas[indice] ?? "").trim();
  });

  fila.dni = valores.dni || "";
  fila.grado = normalizarGrado(valores.grado || bloque.gradoHoja || "");
  fila.seccion = normalizarSeccion(valores.seccion || "");
  fila.telefono = valores.telefono || "";

  if (bloque.mapeo.combinado !== undefined) {
    const combinado = valores.combinado || "";
    const separador = combinado.indexOf(",");
    if (separador >= 0) {
      fila.apellido = combinado.slice(0, separador).trim();
      fila.nombre = combinado.slice(separador + 1).trim();
    } else {
      fila.apellido = combinado;
      fila.nombre = "";
      fila.separacionAmbigua = Boolean(combinado);
    }
  } else {
    fila.apellido = valores.apellido || "";
    fila.nombre = valores.nombre || "";
    fila.separacionAmbigua = false;
  }

  validarFila(fila);
}

function renderizarMapeos() {
  mapeosContainer.replaceChildren();

  bloques.forEach((bloque, indiceBloque) => {
    const seccion = document.createElement("section");
    seccion.className = "mapeo-excel";

    const titulo = document.createElement("h3");
    titulo.textContent =
      `${bloque.hoja}, fila de encabezados ${bloque.encabezadoFila + 1} (tabla ${indiceBloque + 1})`;
    seccion.appendChild(titulo);

    const grid = document.createElement("div");
    grid.className = "mapeo-excel-grid";

    camposMapeo.forEach(([campo, etiqueta]) => {
      const label = document.createElement("label");
      label.textContent = etiqueta;

      const select = document.createElement("select");
      select.dataset.bloqueId = bloque.id;
      select.dataset.campoMapeo = campo;
      select.appendChild(new Option("No asignar", ""));
      bloque.encabezados.forEach((encabezado, columna) => {
        if (!String(encabezado).trim()) {
          return;
        }
        select.appendChild(
          new Option(
            `${nombreColumnaExcel(bloque.columnaBase + bloque.columnaInicio + columna)}: ${encabezado}`,
            String(columna)
          )
        );
      });

      const indice = bloque.mapeo[campo];
      if (indice !== undefined) {
        select.value = String(indice);
      }

      select.addEventListener("change", () => cambiarMapeo(bloque, campo, select.value));
      label.appendChild(select);
      grid.appendChild(label);
    });

    seccion.appendChild(grid);
    mapeosContainer.appendChild(seccion);
  });
}

function cambiarMapeo(bloque, campo, valor) {
  if (valor === "") {
    delete bloque.mapeo[campo];
  } else {
    bloque.mapeo[campo] = Number(valor);
  }

  bloque.filas.forEach((fila) => aplicarMapeo(fila, bloque));
  analizarDuplicadosLocalmente();
  renderizarFilas();
  actualizarResumen();
}

function renderizarFilas() {
  filasContainer.replaceChildren();
  elementosFila.clear();

  filas.forEach((fila) => {
    const tr = document.createElement("tr");
    tr.dataset.filaId = fila.id;
    if (fila.importada) {
      tr.classList.add("fila-importada");
    }

    const incluir = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = fila.incluido;
    checkbox.dataset.incluir = "";
    checkbox.dataset.filaId = fila.id;
    checkbox.setAttribute("aria-label", `Incluir fila ${fila.filaOrigen}`);
    incluir.appendChild(checkbox);
    tr.appendChild(incluir);

    agregarCeldaTexto(tr, `${fila.hoja} · fila ${fila.filaOrigen}`);
    agregarCeldaTexto(tr, fila.dni || "—");
    agregarCeldaEditable(tr, fila, "apellido", "Apellidos");
    agregarCeldaEditable(tr, fila, "nombre", "Nombres");
    agregarCeldaSelect(tr, fila, "grado", gradosValidos);
    agregarCeldaSelect(tr, fila, "seccion", seccionesValidas);
    agregarCeldaEditable(tr, fila, "telefono", "Teléfono");

    const celdaEstado = document.createElement("td");
    celdaEstado.dataset.estadoFila = "";
    actualizarCeldaEstado(celdaEstado, fila);
    tr.appendChild(celdaEstado);

    filasContainer.appendChild(tr);
    elementosFila.set(fila.id, tr);
  });
}

function agregarCeldaTexto(tr, texto) {
  const td = document.createElement("td");
  td.textContent = texto;
  tr.appendChild(td);
}

function agregarCeldaEditable(tr, fila, campo, etiqueta) {
  const td = document.createElement("td");
  const input = document.createElement("input");
  input.type = "text";
  input.value = fila[campo];
  input.dataset.campoFila = campo;
  input.dataset.filaId = fila.id;
  input.setAttribute("aria-label", etiqueta);
  if (campo === "telefono") {
    input.inputMode = "numeric";
    input.maxLength = 20;
  }
  td.appendChild(input);
  tr.appendChild(td);
}

function agregarCeldaSelect(tr, fila, campo, opciones) {
  const td = document.createElement("td");
  const select = document.createElement("select");
  select.dataset.campoFila = campo;
  select.dataset.filaId = fila.id;
  select.appendChild(new Option("Seleccionar", ""));

  const opcionesCompletas = fila[campo] && !opciones.includes(fila[campo])
    ? [...opciones, fila[campo]]
    : opciones;
  opcionesCompletas.forEach((opcion) => {
    select.appendChild(new Option(opcion, opcion));
  });

  select.value = fila[campo];
  td.appendChild(select);
  tr.appendChild(td);
}

function actualizarCampoFila(evento) {
  const control = evento.target;
  const campo = control.dataset.campoFila;
  const fila = buscarFila(control.dataset.filaId);
  if (!campo || !fila) {
    return;
  }

  fila[campo] = campo === "grado"
    ? normalizarGrado(control.value)
    : campo === "seccion"
      ? normalizarSeccion(control.value)
      : control.value.trim();

  if (
    (campo === "apellido" || campo === "nombre") &&
    fila.apellido.trim() &&
    fila.nombre.trim()
  ) {
    fila.separacionAmbigua = false;
  }

  validarFila(fila);
  analizarDuplicadosLocalmente();
  actualizarEstadosFilas();
  actualizarResumen();
}

function buscarFila(id) {
  return filas.find((fila) => fila.id === id);
}

function validarFila(fila) {
  const razones = [];

  if (fila.separacionAmbigua) {
    razones.push("El campo unido no contiene coma; revisa la separación entre apellidos y nombres.");
  }

  if (!fila.apellido.trim()) {
    razones.push("Faltan los apellidos.");
  }
  if (!fila.nombre.trim()) {
    razones.push("Faltan los nombres.");
  }
  if (!gradosValidos.includes(fila.grado)) {
    razones.push("Selecciona un grado válido (1ro a 5to).");
  }
  if (!seccionesValidas.includes(fila.seccion)) {
    razones.push("Selecciona una sección válida (A a R).");
  }
  if (fila.telefono && !/^\d{9}$/.test(fila.telefono)) {
    razones.push("El teléfono debe tener 9 dígitos o dejarse vacío.");
  }

  fila.razones = [...new Set(razones)];
  fila.apta = fila.razones.length === 0;
  if (fila.razones.length > 0) {
    fila.tipoEstado = fila.separacionAmbigua ? "review" : "incompleto";
  } else if (fila.duplicadoExcel || fila.duplicadoFirebase) {
    fila.tipoEstado = "duplicado";
  } else {
    fila.tipoEstado = "valido";
  }
}

function analizarDuplicados(existentes) {
  const clavesExistentes = new Set();
  existentes.forEach((alumno) => {
    clavesExistentes.add(claveNatural(alumno));
  });

  const vistosNaturales = new Set();
  const vistosDni = new Set();

  filas.forEach((fila) => {
    fila.duplicadoExcel = false;
    fila.duplicadoFirebase = false;
    fila.duplicadoDni = false;
    fila.alertas = [];
    validarFila(fila);
    if (!fila.apta) {
      return;
    }

    const dni = normalizarComparacion(fila.dni);
    const claveNaturalAlumno = claveNatural(fila);
    const repetidoDni = dni && vistosDni.has(dni);
    const repetidoNatural = vistosNaturales.has(claveNaturalAlumno);
    if (repetidoDni || repetidoNatural) {
      fila.duplicadoExcel = true;
      fila.duplicadoDni = Boolean(dni);
      fila.incluido = false;
      fila.alertas.push(
        repetidoDni
          ? "Este DNI ya aparece en otra fila del archivo."
          : "Los apellidos, nombres, grado y sección se repiten en el archivo."
      );
    }
    vistosNaturales.add(claveNaturalAlumno);
    if (dni) {
      vistosDni.add(dni);
    }

    if (clavesExistentes.has(claveNatural(fila))) {
      fila.duplicadoFirebase = true;
      fila.incluido = false;
      fila.alertas.push(
        "Coincide con apellidos, nombres, grado y sección de un registro existente; confirma si es el mismo alumno."
      );
    }
    validarFila(fila);
    if (fila.duplicadoExcel || fila.duplicadoFirebase) {
      fila.tipoEstado = "duplicado";
    }
  });
}

function analizarDuplicadosLocalmente() {
  const vistosNaturales = new Set();
  const vistosDni = new Set();
  filas.forEach((fila) => {
    fila.duplicadoExcel = false;
    fila.duplicadoDni = false;
    fila.duplicadoFirebase = clavesAlumnosExistentes.has(claveNatural(fila));
    fila.alertas = [];
    validarFila(fila);
    if (!fila.apta) {
      return;
    }
    const dni = normalizarComparacion(fila.dni);
    const clave = claveNatural(fila);
    const repetidoDni = dni && vistosDni.has(dni);
    const repetidoNatural = vistosNaturales.has(clave);
    if (repetidoDni || repetidoNatural) {
      fila.duplicadoExcel = true;
      fila.duplicadoDni = Boolean(dni);
      fila.incluido = false;
      fila.alertas.push(repetidoDni
        ? "Este DNI ya aparece en otra fila del archivo."
        : "Los apellidos, nombres, grado y sección se repiten en el archivo.");
      fila.tipoEstado = "duplicado";
    }
    vistosNaturales.add(clave);
    if (dni) {
      vistosDni.add(dni);
    }
    if (fila.duplicadoFirebase) {
      fila.incluido = false;
      fila.alertas.push(
        "Coincide con apellidos, nombres, grado y sección de un registro existente; confirma si es el mismo alumno."
      );
      fila.tipoEstado = "duplicado";
    }
  });
}

function claveNatural(alumno) {
  return [
    alumno.apellido,
    alumno.nombre,
    alumno.grado,
    alumno.seccion
  ].map(normalizarComparacion).join("|");
}

async function cargarAlumnosExistentes() {
  const alumnos = [];
  const referencia = collection(db, "alumnos");
  let ultimoDocumento = null;

  while (true) {
    const restricciones = [orderBy(documentId()), limit(tamanoLoteLectura)];
    if (ultimoDocumento) {
      restricciones.push(startAfter(ultimoDocumento));
    }
    const resultado = await getDocs(query(referencia, ...restricciones));
    resultado.forEach((documento) => alumnos.push(documento.data()));
    if (resultado.empty || resultado.size < tamanoLoteLectura) {
      break;
    }
    ultimoDocumento = resultado.docs[resultado.docs.length - 1];
  }

  return alumnos;
}

function actualizarEstadosFilas() {
  filas.forEach((fila) => {
    const tr = elementosFila.get(fila.id);
    const celda = tr?.querySelector("[data-estado-fila]");
    if (celda) {
      actualizarCeldaEstado(celda, fila);
    }
    if (tr) {
      tr.classList.toggle("fila-importada", fila.importada);
      tr.classList.toggle("fila-fallida", fila.fallida);
    }
  });
}

function actualizarCeldaEstado(celda, fila) {
  if (fila.importada) {
    celda.textContent = "Guardado";
    celda.className = "estado-fila estado-fila-valido";
    celda.title = "Registro guardado correctamente.";
    return;
  }
  if (fila.fallida) {
    celda.replaceChildren();
    const etiqueta = document.createElement("strong");
    etiqueta.textContent = "Error al guardar";
    const detalle = document.createElement("small");
    detalle.textContent = fila.error;
    celda.append(etiqueta, detalle);
    celda.className = "estado-fila estado-fila-error";
    celda.title = fila.error;
    return;
  }

  validarFila(fila);
  const etiquetas = {
    valido: "Válido",
    incompleto: "Incompleto",
    review: "Revisar",
    duplicado: "Posible duplicado"
  };
  celda.replaceChildren();
  const etiqueta = document.createElement("strong");
  etiqueta.textContent = etiquetas[fila.tipoEstado];
  celda.appendChild(etiqueta);
  const detalle = [...fila.razones, ...fila.alertas, fila.error]
    .filter(Boolean)
    .join(" ");
  if (detalle) {
    const descripcion = document.createElement("small");
    descripcion.textContent = detalle;
    celda.appendChild(descripcion);
  }
  celda.className = `estado-fila estado-fila-${fila.tipoEstado}`;
  celda.title = detalle;
}

function actualizarResumen() {
  const validos = filas.filter((fila) =>
    fila.tipoEstado === "valido" && fila.incluido && !fila.importada
  ).length;
  const incompletos = filas.filter((fila) => fila.tipoEstado === "incompleto").length;
  const revisar = filas.filter((fila) => fila.tipoEstado === "review").length;
  const duplicados = filas.filter((fila) => fila.tipoEstado === "duplicado").length;
  const fallidos = filas.filter((fila) => fila.fallida).length;
  const seleccionados = filas.filter((fila) =>
    fila.incluido && fila.apta && !fila.importada
  ).length;

  resumen.textContent =
    `Detectados: ${filas.length} | Válidos incluidos: ${validos} | ` +
    `Incompletos: ${incompletos} | Revisar: ${revisar} | ` +
    `Posibles duplicados: ${duplicados} | Fallidos: ${fallidos} | ` +
    `Listos para importar: ${seleccionados} | Omitidos: ${filas.length - seleccionados - filas.filter((fila) => fila.importada).length}`;

  btnConfirmar.disabled =
    importando || !autenticado || !duplicadosComprobados || seleccionados === 0;
  btnReintentar.hidden = importando || filasFallidas.length === 0;
}

async function confirmarImportacion() {
  if (importando) {
    return;
  }

  const candidatos = filas.filter((fila) =>
    fila.incluido && fila.apta && !fila.importada
  );
  if (candidatos.length === 0) {
    mostrarError("No hay filas válidas seleccionadas para importar.");
    return;
  }

  const omitir = filas.length - candidatos.length -
    filas.filter((fila) => fila.importada).length;
  const duplicadosIncluidos = candidatos.filter((fila) =>
    fila.duplicadoExcel || fila.duplicadoFirebase
  ).length;
  const confirmado = window.confirm(
    `Se intentará importar ${candidatos.length} alumno(s). ` +
    `Se omitirán ${omitir} fila(s) incompletas, excluidas o duplicadas. ` +
    `${duplicadosIncluidos} posible(s) duplicado(s) fueron seleccionados manualmente. ` +
    "El DNI no se guardará en Firestore porque no está en el modelo actual. ¿Continuar?"
  );
  if (!confirmado) {
    return;
  }

  await importarFilas(candidatos, false);
}

async function importarFilas(candidatos, esReintento) {
  if (importando || !autenticado || candidatos.length === 0) {
    return;
  }

  importando = true;
  filasFallidas = [];
  escriturasCompletadas = 0;
  btnConfirmar.disabled = true;
  btnReintentar.hidden = true;
  btnCancelar.disabled = true;
  btnCerrar.disabled = true;
  progreso.hidden = false;
  progreso.max = candidatos.length;
  progreso.value = 0;
  errorImportacion.textContent = "";
  estado.textContent = esReintento
    ? "Revisando nuevamente los registros fallidos..."
    : "Comenzando la importación...";

  try {
    const existentes = await cargarAlumnosExistentes();
    const clavesExistentes = new Set(existentes.map(claveNatural));
    const clavesIntentadas = new Set();
    const dniIntentados = new Set();
    const pendientes = [];

    candidatos.forEach((fila) => {
      const clave = claveNatural(fila);
      const dni = normalizarComparacion(fila.dni);
      const yaExiste = clavesExistentes.has(clave);
      const repetidoPorDni = dni && dniIntentados.has(dni);
      const repetidoPorDatos = clavesIntentadas.has(clave);
      const repetidoEnArchivo = repetidoPorDni || repetidoPorDatos;
      clavesIntentadas.add(clave);
      if (dni) {
        dniIntentados.add(dni);
      }
      const omitirExistente = yaExiste && (!fila.revisadaDuplicado || esReintento);
      if (omitirExistente || repetidoEnArchivo) {
        fila.duplicadoFirebase = yaExiste;
        fila.fallida = false;
        fila.error = "";
        fila.incluido = false;
        fila.alertas = [
          omitirExistente
            ? "Omitido: ya existe en Firebase."
            : repetidoPorDni
              ? "Omitido: el DNI ya se procesó en otra fila."
              : "Omitido: se importará una sola fila con esos datos."
        ];
        fila.tipoEstado = "duplicado";
      } else {
        pendientes.push(fila);
      }
    });

    for (let inicio = 0; inicio < pendientes.length; inicio += tamanoLoteEscritura) {
      const loteFilas = pendientes.slice(inicio, inicio + tamanoLoteEscritura);
      const lote = writeBatch(db);

      loteFilas.forEach((fila) => {
        const nuevoAlumno = {
          nombre: fila.nombre.trim(),
          apellido: fila.apellido.trim(),
          grado: fila.grado,
          seccion: fila.seccion,
          telefonoApoderado: fila.telefono.trim() || null,
          fechaRegistro: serverTimestamp()
        };
        const referencia = docAutoId();
        lote.set(referencia, nuevoAlumno);
        fila._referenciaCreada = referencia;
      });

      try {
        await lote.commit();
        loteFilas.forEach((fila) => {
          fila.importada = true;
          fila.fallida = false;
          fila.error = "";
          fila.incluido = false;
          fila._referenciaCreada = null;
        });
      } catch (error) {
        console.error(error);
        loteFilas.forEach((fila) => {
          fila.fallida = true;
          fila.error = mensajeErrorFirestore(error);
          filasFallidas.push(fila);
        });
      }

      escriturasCompletadas += loteFilas.length;
      progreso.value = escriturasCompletadas;
      estado.textContent =
        `Procesados ${escriturasCompletadas} de ${candidatos.length}; ` +
        `${candidatos.length - escriturasCompletadas} pendientes.`;
      actualizarEstadosFilas();
      actualizarResumen();
      await permitirRepintado();
    }

    const guardados = filas.filter((fila) => fila.importada).length;
    const fallidos = filasFallidas.length;
    const omitidos = candidatos.length - pendientes.length;
    estado.textContent = fallidos === 0
      ? `Importación finalizada: ${guardados} alumno(s) guardado(s), ${omitidos} omitido(s).`
      : `Importación parcial: ${guardados} guardado(s), ${omitidos} omitido(s), ${fallidos} fallido(s).`;
    errorImportacion.textContent = fallidos > 0
      ? "Los registros fallidos están identificados por hoja y fila. Corrige los problemas de conexión o permisos y pulsa “Reintentar filas fallidas”."
      : "";
  } catch (error) {
    console.error(error);
    estado.textContent = "No se pudo completar la comprobación de duplicados.";
    mostrarError(
      `${mensajeErrorFirestore(error)} No se escribieron alumnos porque no fue posible comprobar Firebase.`
    );
  } finally {
    importando = false;
    btnCancelar.disabled = false;
    btnCerrar.disabled = false;
    progreso.hidden = true;
    actualizarEstadosFilas();
    actualizarResumen();
  }
}

function docAutoId() {
  return doc(collection(db, "alumnos"));
}

function mensajeErrorFirestore(error) {
  if (error?.code === "permission-denied") {
    return "Firebase denegó el acceso. Revisa la sesión y las reglas de seguridad de Firestore.";
  }
  if (error?.code === "unavailable" || error?.code === "deadline-exceeded") {
    return "Firebase no está disponible o la conexión se interrumpió.";
  }
  return error?.message || "Error desconocido durante la operación en Firebase.";
}

function normalizarGrado(valor) {
  const texto = normalizarComparacion(valor);
  const gradosTexto = [
    [/\b(1|1ro|1ero|primer|primero)\b/, "1ro"],
    [/\b(2|2do|segundo)\b/, "2do"],
    [/\b(3|3ro|3ero|tercero)\b/, "3ro"],
    [/\b(4|4to|cuarto)\b/, "4to"],
    [/\b(5|5to|quinto)\b/, "5to"]
  ];
  const grado = gradosTexto.find(([expresion]) => expresion.test(texto))?.[1];
  if (grado) {
    return grado;
  }

  const numero = texto.match(/\b([1-5])(?:°|º)?\b/)?.[1];
  if (!numero) {
    return "";
  }
  return `${numero}${numero === "1" || numero === "3" ? "ro" : numero === "2" ? "do" : "to"}`;
}

function normalizarSeccion(valor) {
  const texto = String(valor ?? "").trim().toUpperCase();
  const coincidencia = texto.match(/\b([A-R])\b/);
  return coincidencia ? coincidencia[1] : "";
}

function detectarGrado(nombreHoja) {
  const texto = normalizarComparacion(nombreHoja);
  const expresiones = [
    [/\b(1|1ro|1ero|primero|primer)\b/, "1ro"],
    [/\b(2|2do|segundo)\b/, "2do"],
    [/\b(3|3ro|3ero|tercero)\b/, "3ro"],
    [/\b(4|4to|cuarto)\b/, "4to"],
    [/\b(5|5to|quinto)\b/, "5to"]
  ];
  return expresiones.find(([expresion]) => expresion.test(texto))?.[1] || "";
}

function normalizarComparacion(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function mostrarError(texto) {
  panelVistaPrevia.hidden = false;
  errorImportacion.textContent = texto;
}

function formatearBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function nombreColumnaExcel(indiceCero) {
  let numero = indiceCero + 1;
  let nombre = "";
  while (numero > 0) {
    const resto = (numero - 1) % 26;
    nombre = String.fromCharCode(65 + resto) + nombre;
    numero = Math.floor((numero - 1) / 26);
  }
  return nombre;
}

function permitirRepintado() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}
