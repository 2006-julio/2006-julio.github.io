import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getFirestore,
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBaP5vVIw0b_3CRepIy328KIcitXlQtwFA",
  authDomain: "sistema-alumnos-xammar.firebaseapp.com",
  projectId: "sistema-alumnos-xammar",
  storageBucket: "sistema-alumnos-xammar.firebasestorage.app",
  messagingSenderId: "286883206743",
  appId: "1:286883206743:web:bebde00cff1bc372293512"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const contenedorHojasQR =
  document.getElementById("contenedorHojasQR");
const estadoCarga =
  document.getElementById("estadoCarga");
const resumen =
  document.getElementById("resumen");
const mensajeError =
  document.getElementById("mensajeError");
const btnGenerar =
  document.getElementById("btnGenerar");
const btnCancelar =
  document.getElementById("btnCancelar");
const btnImprimir =
  document.getElementById("btnImprimir");
const progresoGeneracion =
  document.getElementById("progresoGeneracion");
const filtroGradoImpresion =
  document.getElementById("filtroGradoImpresion");
const filtroSeccionImpresion =
  document.getElementById("filtroSeccionImpresion");
const btnMostrarTodos =
  document.getElementById("btnMostrarTodos");

const alumnosPorLote = 100;
let alumnosCargados = null;
let autenticado = false;
let generando = false;
let cancelarSolicitado = false;

onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    window.location.href = "./login.html";
    return;
  }

  autenticado = true;
  btnGenerar.disabled = false;
});

btnGenerar.disabled = true;
btnGenerar.addEventListener("click", iniciarGeneracion);
btnCancelar.addEventListener("click", () => {
  cancelarSolicitado = true;
  estadoCarga.textContent = "Cancelando... espera a que termine el lote actual.";
  btnCancelar.disabled = true;
});
btnImprimir.addEventListener("click", () => window.print());
btnMostrarTodos.addEventListener("click", () => {
  filtroGradoImpresion.value = "";
  filtroSeccionImpresion.value = "";
  invalidarDocumentoGenerado();
});
filtroGradoImpresion.addEventListener("change", invalidarDocumentoGenerado);
filtroSeccionImpresion.addEventListener("change", invalidarDocumentoGenerado);

function invalidarDocumentoGenerado() {
  if (generando) {
    return;
  }

  contenedorHojasQR.replaceChildren();
  btnImprimir.disabled = true;
  resumen.textContent = "Filtros actualizados. Genera nuevamente el documento.";
  estadoCarga.textContent = "Pulsa “Generar documento” para aplicar los filtros.";
  btnGenerar.textContent = "Generar documento con filtros";
  progresoGeneracion.hidden = true;
  mensajeError.textContent = "";
}

async function iniciarGeneracion() {
  if (!autenticado || generando) {
    return;
  }

  const confirmado = window.confirm(
    "Se cargarán los alumnos y se generarán 12 códigos QR por cada uno. " +
    "Este proceso puede tomar varios minutos y consumir recursos del navegador. " +
    "¿Deseas continuar?"
  );

  if (!confirmado) {
    return;
  }

  generando = true;
  cancelarSolicitado = false;
  btnGenerar.disabled = true;
  btnCancelar.disabled = false;
  btnCancelar.hidden = false;
  btnImprimir.disabled = true;
  filtroGradoImpresion.disabled = true;
  filtroSeccionImpresion.disabled = true;
  btnMostrarTodos.disabled = true;
  progresoGeneracion.hidden = false;
  progresoGeneracion.removeAttribute("value");
  mensajeError.textContent = "";
  contenedorHojasQR.replaceChildren();

  try {
    if (alumnosCargados === null) {
      alumnosCargados = await cargarTodosLosAlumnos();
      if (alumnosCargados === null) {
        estadoCarga.textContent = "Generación cancelada.";
        resumen.textContent = "No se generó el documento.";
        return;
      }
    }

    const alumnos = filtrarAlumnos(alumnosCargados);
    if (alumnos.length === 0) {
      estadoCarga.textContent = "No hay alumnos para los filtros seleccionados.";
      resumen.textContent = "Alumnos: 0 | Hojas: 0 | QR: 0";
      return;
    }

    progresoGeneracion.max = alumnos.length;
    progresoGeneracion.value = 0;

    const completado = await generarTodasLasHojas(alumnos);
    if (!completado) {
      contenedorHojasQR.replaceChildren();
      estadoCarga.textContent = "Generación cancelada.";
      resumen.textContent = "No se generó el documento.";
      return;
    }

    resumen.textContent =
      `Alumnos: ${alumnos.length} | Hojas: ${alumnos.length} | QR: ${alumnos.length * 12}`;
    estadoCarga.textContent = "Documento listo para imprimir.";
    btnImprimir.disabled = false;
    btnGenerar.textContent = "Regenerar documento";
  } catch (error) {
    console.error(error);
    contenedorHojasQR.replaceChildren();
    estadoCarga.textContent = "No se pudo completar la generación.";
    resumen.textContent = "Ocurrió un error al cargar los alumnos o crear los QR.";
    mensajeError.textContent =
      "Verifica la conexión e inténtalo nuevamente. Si el problema continúa, contacta al administrador.";
  } finally {
    generando = false;
    btnGenerar.disabled = false;
    btnCancelar.disabled = false;
    btnCancelar.hidden = true;
    filtroGradoImpresion.disabled = false;
    filtroSeccionImpresion.disabled = false;
    btnMostrarTodos.disabled = false;
    progresoGeneracion.hidden = true;
  }
}

async function cargarTodosLosAlumnos() {
  const alumnos = [];
  const referencia = collection(db, "alumnos");
  let ultimoDocumento = null;

  estadoCarga.textContent = "Conectando con Firebase...";

  while (true) {
    if (cancelarSolicitado) {
      return null;
    }

    const restricciones = [
      orderBy(documentId()),
      limit(alumnosPorLote)
    ];
    if (ultimoDocumento) {
      restricciones.push(startAfter(ultimoDocumento));
    }

    const resultado = await getDocs(query(referencia, ...restricciones));
    if (resultado.empty) {
      break;
    }

    resultado.forEach((documento) => {
      const datos = documento.data();
      alumnos.push({
        id: documento.id,
        nombre: datos.nombre || "",
        apellido: datos.apellido || "",
        grado: datos.grado || "",
        seccion: datos.seccion || ""
      });
    });

    ultimoDocumento = resultado.docs[resultado.docs.length - 1];
    estadoCarga.textContent = `Cargando alumnos... ${alumnos.length} recibidos.`;
    await permitirRepintado();
  }

  return alumnos;
}

function filtrarAlumnos(alumnos) {
  const grado = filtroGradoImpresion.value;
  const seccion = filtroSeccionImpresion.value;

  return alumnos
    .filter((alumno) =>
      (!grado || alumno.grado === grado) &&
      (!seccion || alumno.seccion === seccion)
    )
    .sort((a, b) => {
      const gradoA = convertirGrado(a.grado);
      const gradoB = convertirGrado(b.grado);
      if (gradoA !== gradoB) {
        return gradoA - gradoB;
      }

      const porSeccion = a.seccion.localeCompare(b.seccion);
      if (porSeccion !== 0) {
        return porSeccion;
      }

      const porApellido = a.apellido.localeCompare(b.apellido);
      return porApellido || a.nombre.localeCompare(b.nombre);
    });
}

async function generarTodasLasHojas(alumnos) {
  for (let indice = 0; indice < alumnos.length; indice += 1) {
    if (cancelarSolicitado) {
      return false;
    }

    generarHojaAlumno(alumnos[indice]);
    progresoGeneracion.value = indice + 1;
    estadoCarga.textContent =
      `Generando códigos QR... alumno ${indice + 1} de ${alumnos.length}.`;
    await permitirRepintado();
  }

  return true;
}

function generarHojaAlumno(alumno) {
  const hoja = document.createElement("section");
  hoja.className = "hoja-qr hoja-qr-todos";

  const informacionAdmin = document.createElement("div");
  informacionAdmin.className = "informacion-admin";
  informacionAdmin.textContent =
    `${alumno.grado} - Sección ${alumno.seccion} | ${alumno.apellido}, ${alumno.nombre}`;
  hoja.appendChild(informacionAdmin);

  for (let indice = 0; indice < 12; indice += 1) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-qr";

    const institucion = document.createElement("div");
    institucion.className = "institucion-qr";
    institucion.textContent = "I.E. LUIS FABIO XAMMAR JURADO";

    const contenedorQR = document.createElement("div");
    contenedorQR.className = "codigo-qr";

    tarjeta.append(institucion, contenedorQR);
    hoja.appendChild(tarjeta);

    new QRCode(contenedorQR, {
      text: alumno.id,
      width: 120,
      height: 120,
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  contenedorHojasQR.appendChild(hoja);
}

function convertirGrado(grado) {
  const numero = Number.parseInt(String(grado), 10);
  return Number.isNaN(numero) ? 99 : numero;
}

function permitirRepintado() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}
