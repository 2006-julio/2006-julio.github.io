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

const btnGenerar = document.getElementById("btnGenerarPdf");
const btnCancelar = document.getElementById("btnCancelarPdf");
const btnImprimir = document.getElementById("btnImprimirPdf");
const estado = document.getElementById("estadoPdf");
const resumen = document.getElementById("resumenPdf");
const errorPdf = document.getElementById("errorPdf");
const progreso = document.getElementById("progresoPdf");
const hojasPdf = document.getElementById("hojasPdf");

const alumnosPorLote = 100;
let alumnosCargados = null;
let autenticado = false;
let generando = false;
let cancelarSolicitado = false;

btnGenerar.disabled = true;

onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    window.location.href = "./login.html";
    return;
  }

  autenticado = true;
  btnGenerar.disabled = false;
});

btnGenerar.addEventListener("click", iniciarGeneracion);
btnCancelar.addEventListener("click", () => {
  cancelarSolicitado = true;
  estado.textContent = "Cancelando... espera a que termine el lote actual.";
  btnCancelar.disabled = true;
});
btnImprimir.addEventListener("click", () => window.print());

async function iniciarGeneracion() {
  if (!autenticado || generando) {
    return;
  }

  const confirmado = window.confirm(
    "Se preparará un documento con el nombre, apellido y código QR de cada alumno, " +
    "agrupado por grado y sección, con un máximo de dos hojas por grupo. " +
    "La preparación puede tomar varios minutos. ¿Deseas continuar?"
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
  progreso.hidden = false;
  progreso.removeAttribute("value");
  errorPdf.textContent = "";
  hojasPdf.replaceChildren();

  try {
    if (alumnosCargados === null) {
      alumnosCargados = await cargarAlumnos();
      if (alumnosCargados === null) {
        estado.textContent = "Generación cancelada.";
        resumen.textContent = "No se preparó el documento.";
        return;
      }
    }

    if (alumnosCargados.length === 0) {
      estado.textContent = "No hay alumnos registrados.";
      resumen.textContent = "Alumnos: 0 | Grupos: 0 | Hojas: 0";
      return;
    }

    const grupos = agruparAlumnos(alumnosCargados);
    const totalHojas = grupos.reduce(
      (total, grupo) => total + Math.min(2, Math.ceil(grupo.alumnos.length / 55)),
      0
    );
    const alumnosEnGruposGrandes = grupos.filter(
      (grupo) => grupo.alumnos.length > 110
    ).length;

    progreso.max = alumnosCargados.length;
    progreso.value = 0;

    const completado = await generarPaginas(grupos);
    if (!completado) {
      hojasPdf.replaceChildren();
      estado.textContent = "Generación cancelada.";
      resumen.textContent = "No se preparó el documento.";
      return;
    }

    estado.textContent = "Documento listo. Usa “Guardar PDF / imprimir”.";
    resumen.textContent =
      `Alumnos: ${alumnosCargados.length} | Grupos: ${grupos.length} | ` +
      `Hojas: ${totalHojas} (máximo 2 por grupo).`;

    if (alumnosEnGruposGrandes > 0) {
      errorPdf.textContent =
        `${alumnosEnGruposGrandes} grupo(s) tienen más de 110 alumnos; ` +
        "los códigos de esos grupos se mostrarán más pequeños para conservar el máximo de dos hojas.";
    }

    btnImprimir.disabled = false;
  } catch (error) {
    console.error(error);
    hojasPdf.replaceChildren();
    estado.textContent = "No se pudo preparar el documento.";
    resumen.textContent = "Ocurrió un error al cargar los alumnos o crear los QR.";
    errorPdf.textContent =
      "Verifica la conexión e inténtalo nuevamente. Si el problema continúa, contacta al administrador.";
  } finally {
    generando = false;
    btnGenerar.disabled = false;
    btnCancelar.disabled = false;
    btnCancelar.hidden = true;
    progreso.hidden = true;
  }
}

async function cargarAlumnos() {
  const alumnos = [];
  const referencia = collection(db, "alumnos");
  let ultimoDocumento = null;

  estado.textContent = "Conectando con Firebase...";

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
        grado: datos.grado || "Sin grado",
        seccion: datos.seccion || "Sin sección"
      });
    });

    ultimoDocumento = resultado.docs[resultado.docs.length - 1];
    estado.textContent = `Cargando alumnos... ${alumnos.length} recibidos.`;
    await permitirRepintado();
  }

  return ordenarAlumnos(alumnos);
}

function ordenarAlumnos(alumnos) {
  return alumnos.sort((a, b) => {
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

function agruparAlumnos(alumnos) {
  const grupos = new Map();

  alumnos.forEach((alumno) => {
    const clave = `${alumno.grado}\u0000${alumno.seccion}`;
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        grado: alumno.grado,
        seccion: alumno.seccion,
        alumnos: []
      });
    }
    grupos.get(clave).alumnos.push(alumno);
  });

  return [...grupos.values()];
}

async function generarPaginas(grupos) {
  let alumnosProcesados = 0;

  for (const grupo of grupos) {
    const cantidadPaginas = Math.min(2, Math.ceil(grupo.alumnos.length / 55));
    let indiceAlumno = 0;

    for (let indicePagina = 0; indicePagina < cantidadPaginas; indicePagina += 1) {
      if (cancelarSolicitado) {
        return false;
      }

      const paginasRestantes = cantidadPaginas - indicePagina;
      const alumnosRestantes = grupo.alumnos.length - indiceAlumno;
      const cantidadEnPagina = Math.ceil(alumnosRestantes / paginasRestantes);
      const alumnosPagina = grupo.alumnos.slice(
        indiceAlumno,
        indiceAlumno + cantidadEnPagina
      );
      const hoja = crearHoja(grupo, indicePagina + 1, cantidadPaginas, alumnosPagina.length);

      for (const alumno of alumnosPagina) {
        if (cancelarSolicitado) {
          return false;
        }

        agregarAlumno(hoja, alumno);
        alumnosProcesados += 1;
        progreso.value = alumnosProcesados;
        estado.textContent =
          `Generando códigos QR... alumno ${alumnosProcesados} de ${alumnosCargados.length}.`;

        if (alumnosProcesados % 5 === 0) {
          await permitirRepintado();
        }
      }

      hojasPdf.appendChild(hoja);
      indiceAlumno += cantidadEnPagina;
      await permitirRepintado();
    }
  }

  return !cancelarSolicitado;
}

function crearHoja(grupo, numeroPagina, totalPaginas, cantidadAlumnos) {
  const hoja = document.createElement("section");
  hoja.className = "hoja-listado-pdf";

  const columnas = Math.max(1, Math.ceil(Math.sqrt(cantidadAlumnos * 0.72)));
  const filas = Math.ceil(cantidadAlumnos / columnas);
  const anchoCelda = 194 / columnas;
  const altoCelda = 275 / filas;
  const tamanoQR = Math.max(3, Math.min(24, anchoCelda - 2, altoCelda - 8));
  const tamanoNombre = Math.max(3, Math.min(9, tamanoQR * 0.32));

  hoja.style.setProperty("--columnas-alumnos", columnas);
  hoja.style.setProperty("--filas-alumnos", filas);
  hoja.style.setProperty("--tamano-qr", `${tamanoQR}mm`);
  hoja.style.setProperty("--tamano-nombre", `${tamanoNombre}pt`);

  const encabezado = document.createElement("header");
  encabezado.className = "encabezado-hoja-pdf";

  const titulo = document.createElement("h2");
  titulo.textContent = `${grupo.grado} - Sección ${grupo.seccion}`;

  const pagina = document.createElement("span");
  pagina.textContent = `Hoja ${numeroPagina} de ${totalPaginas}`;

  encabezado.append(titulo, pagina);
  hoja.appendChild(encabezado);

  const lista = document.createElement("div");
  lista.className = "rejilla-alumnos-pdf";
  hoja.appendChild(lista);

  return hoja;
}

function agregarAlumno(hoja, alumno) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta-alumno-pdf";

  const nombre = document.createElement("strong");
  nombre.className = "nombre-alumno-pdf";
  nombre.textContent = `${alumno.apellido}, ${alumno.nombre}`;

  const codigoQR = document.createElement("div");
  codigoQR.className = "codigo-alumno-pdf";
  new QRCode(codigoQR, {
    text: alumno.id,
    width: 120,
    height: 120,
    correctLevel: QRCode.CorrectLevel.M
  });

  tarjeta.append(nombre, codigoQR);
  if (Number.parseFloat(hoja.style.getPropertyValue("--tamano-qr")) >= 14) {
    const identificador = document.createElement("span");
    identificador.className = "identificador-alumno-pdf";
    identificador.textContent = `ID: ${alumno.id}`;
    tarjeta.appendChild(identificador);
  }

  hoja.querySelector(".rejilla-alumnos-pdf").appendChild(tarjeta);
}

function convertirGrado(grado) {
  const numero = Number.parseInt(String(grado), 10);
  return Number.isNaN(numero) ? 99 : numero;
}

function permitirRepintado() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}
