import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs
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

const btnImprimir =
  document.getElementById("btnImprimir");

const filtroGradoImpresion =
  document.getElementById("filtroGradoImpresion");

const filtroSeccionImpresion =
  document.getElementById("filtroSeccionImpresion");

const btnMostrarTodos =
  document.getElementById("btnMostrarTodos");

let alumnosCargados = [];


/*
  Verificar autenticación
*/
onAuthStateChanged(auth, (usuario) => {

  if (!usuario) {

    window.location.href = "./login.html";

    return;
  }

  cargarTodosLosAlumnos();

});


/*
  Obtener todos los alumnos
*/
async function cargarTodosLosAlumnos() {

  try {

    estadoCarga.textContent =
      "Cargando alumnos desde Firebase...";


    const referencia =
      collection(db, "alumnos");


    const resultado =
      await getDocs(referencia);


    const alumnos = [];


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


    /*
      Ordenar alumnos:

      1. grado
      2. sección
      3. apellido
      4. nombre
    */
    alumnos.sort((a, b) => {

      const gradoA = convertirGrado(a.grado);
      const gradoB = convertirGrado(b.grado);

      if (gradoA !== gradoB) {
        return gradoA - gradoB;
      }


      const seccionA =
        a.seccion.toUpperCase();

      const seccionB =
        b.seccion.toUpperCase();


      if (seccionA !== seccionB) {

        return seccionA.localeCompare(seccionB);

      }


      const apellidoA =
        a.apellido.toLowerCase();

      const apellidoB =
        b.apellido.toLowerCase();


      if (apellidoA !== apellidoB) {

        return apellidoA.localeCompare(apellidoB);

      }


      return a.nombre
        .toLowerCase()
        .localeCompare(
          b.nombre.toLowerCase()
        );

    });


    alumnosCargados = alumnos;

    if (alumnos.length === 0) {

      estadoCarga.textContent =
        "No hay alumnos registrados.";

      resumen.textContent =
        "Alumnos: 0 | Hojas: 0 | QR: 0";

      return;
    }


    /*
      Actualizar resumen
    */
    estadoCarga.textContent =
      "Alumnos cargados correctamente.";

    actualizarImpresion();


  } catch (error) {

    console.error(error);


    estadoCarga.textContent =
      "Ocurrió un error al cargar los alumnos.";


    mostrarError(
      "No se pudieron cargar los alumnos desde Firebase."
    );

  }

}


/*
  Generar una hoja A4 por alumno
*/
function generarTodasLasHojas(alumnos) {

  contenedorHojasQR.innerHTML = "";


  alumnos.forEach((alumno) => {

    generarHojaAlumno(alumno);

  });

}


function actualizarImpresion() {

  const grado = filtroGradoImpresion.value;
  const seccion = filtroSeccionImpresion.value;

  const alumnosFiltrados = alumnosCargados.filter((alumno) => {
    return (!grado || alumno.grado === grado) &&
      (!seccion || alumno.seccion === seccion);
  });

  const cantidadAlumnos = alumnosFiltrados.length;
  const cantidadHojas = alumnosFiltrados.length;
  const cantidadQR = cantidadAlumnos * 12;

  resumen.textContent =
    `Alumnos: ${cantidadAlumnos} | ` +
    `Hojas: ${cantidadHojas} | ` +
    `QR: ${cantidadQR}`;

  generarTodasLasHojas(alumnosFiltrados);

  if (cantidadAlumnos === 0) {
    estadoCarga.textContent =
      "No hay alumnos para los filtros seleccionados.";
    return;
  }

  estadoCarga.textContent =
    "Bloque listo para imprimir.";
}


/*
  Crear una hoja para un alumno
*/
function generarHojaAlumno(alumno) {

  /*
    Contenedor de la página A4
  */
  const hoja =
    document.createElement("section");

  hoja.className = "hoja-qr hoja-qr-todos";


  /* Información del alumno que también aparecerá en la hoja impresa. */
  const informacionAdmin =
    document.createElement("div");

  informacionAdmin.className =
    "informacion-admin";


  informacionAdmin.textContent =
    `${alumno.grado} - Sección ${alumno.seccion} | ` +
    `${alumno.apellido}, ${alumno.nombre}`;


  hoja.appendChild(informacionAdmin);


  /*
    Crear los 12 QR
  */
  for (let i = 1; i <= 12; i++) {

    const tarjeta =
      document.createElement("div");

    tarjeta.className =
      "tarjeta-qr";


    /*
      Nombre de la institución
    */
    const institucion =
      document.createElement("div");

    institucion.className =
      "institucion-qr";

    institucion.textContent =
      "I.E. LUIS FABIO XAMMAR JURADO";


    /*
      Contenedor del QR
    */
    const contenedorQR =
      document.createElement("div");

    contenedorQR.className =
      "codigo-qr";


    tarjeta.appendChild(institucion);

    tarjeta.appendChild(contenedorQR);

    hoja.appendChild(tarjeta);


    /*
      El contenido del QR es SOLO
      el ID del documento Firebase.
    */
    new QRCode(contenedorQR, {

      text: alumno.id,

      width: 120,

      height: 120,

      correctLevel: QRCode.CorrectLevel.M

    });

  }


  /*
    Agregar la hoja al documento
  */
  contenedorHojasQR.appendChild(hoja);

}


/*
  Convertir grado a número
*/
function convertirGrado(grado) {

  const texto =
    String(grado).toLowerCase();


  if (texto.includes("1")) {
    return 1;
  }

  if (texto.includes("2")) {
    return 2;
  }

  if (texto.includes("3")) {
    return 3;
  }

  if (texto.includes("4")) {
    return 4;
  }

  if (texto.includes("5")) {
    return 5;
  }


  return 99;

}


/*
  Mostrar error
*/
function mostrarError(mensaje) {

  mensajeError.textContent = mensaje;

}


/*
  Botón imprimir
*/
btnImprimir.addEventListener("click", () => {

  window.print();

});


filtroGradoImpresion.addEventListener(
  "change",
  actualizarImpresion
);

filtroSeccionImpresion.addEventListener(
  "change",
  actualizarImpresion
);

btnMostrarTodos.addEventListener(
  "click",
  () => {
    filtroGradoImpresion.value = "";
    filtroSeccionImpresion.value = "";
    actualizarImpresion();
  }
);
