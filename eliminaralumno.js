import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// CONFIGURACIÓN FIREBASE
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyBaP5vVIw0b_3CRepIy328KIcitXlQtwFA",
    authDomain: "sistema-alumnos-xammar.firebaseapp.com",
    projectId: "sistema-alumnos-xammar",
    storageBucket: "sistema-alumnos-xammar.firebasestorage.app",
    messagingSenderId: "286883206743",
    appId: "1:286883206743:web:bebde00cff1bc372293512"
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ==========================================
// ELEMENTOS
// ==========================================

const idBuscar = document.getElementById("idBuscar");
const btnBuscar = document.getElementById("btnBuscar");

const mensajeBusqueda = document.getElementById("mensajeBusqueda");

const seccionAlumno = document.getElementById("seccionAlumno");

const nombreAlumno = document.getElementById("nombreAlumno");
const gradoSeccionAlumno = document.getElementById("gradoSeccionAlumno");

const idAlumno = document.getElementById("idAlumno");

const datoNombre = document.getElementById("datoNombre");
const datoApellido = document.getElementById("datoApellido");
const datoGrado = document.getElementById("datoGrado");
const datoSeccion = document.getElementById("datoSeccion");
const datoTelefono = document.getElementById("datoTelefono");

const btnEliminar = document.getElementById("btnEliminar");
const btnCancelar = document.getElementById("btnCancelar");

const resultadoEliminacion =
    document.getElementById("resultadoEliminacion");

const alumnoEliminado =
    document.getElementById("alumnoEliminado");

const idEliminado =
    document.getElementById("idEliminado");


// ID del alumno que se está preparando para eliminar
let idAlumnoActual = null;


// ==========================================
// BUSCAR ALUMNO
// ==========================================

async function buscarAlumno() {

    const id = idBuscar.value.trim();

    if (!id) {

        mensajeBusqueda.textContent =
            "Ingresa el ID del alumno.";

        mensajeBusqueda.style.color = "red";

        return;
    }


    try {

        mensajeBusqueda.textContent =
            "Buscando alumno...";

        mensajeBusqueda.style.color = "";


        const referencia = doc(
            db,
            "alumnos",
            id
        );

        const documento = await getDoc(referencia);


        if (!documento.exists()) {

            seccionAlumno.style.display = "none";

            mensajeBusqueda.textContent =
                "No se encontró ningún alumno con ese ID.";

            mensajeBusqueda.style.color = "red";

            idAlumnoActual = null;

            return;
        }


        const datos = documento.data();


        // Guardar ID actual
        idAlumnoActual = documento.id;


        // Mostrar datos
        nombreAlumno.textContent =
            `${datos.nombre || ""} ${datos.apellido || ""}`;

        gradoSeccionAlumno.textContent =
            `${datos.grado || ""} - Sección ${datos.seccion || ""}`;

        idAlumno.textContent =
            documento.id;


        datoNombre.textContent =
            datos.nombre || "No registrado";

        datoApellido.textContent =
            datos.apellido || "No registrado";

        datoGrado.textContent =
            datos.grado || "No registrado";

        datoSeccion.textContent =
            datos.seccion || "No registrada";

        datoTelefono.textContent =
            datos.telefonoApoderado || "No hay número registrado";


        // Mostrar sección
        seccionAlumno.style.display = "block";

        resultadoEliminacion.style.display = "none";

        mensajeBusqueda.textContent =
            "Alumno encontrado correctamente.";

        mensajeBusqueda.style.color = "green";

    } catch (error) {

        console.error(error);

        mensajeBusqueda.textContent =
            "Ocurrió un error al buscar el alumno.";

        mensajeBusqueda.style.color = "red";
    }
}


// ==========================================
// ELIMINAR ALUMNO
// ==========================================

async function eliminarAlumno() {

    if (!idAlumnoActual) {

        alert("Primero debes buscar un alumno.");

        return;
    }


    const nombreCompleto =
        `${datoNombre.textContent} ${datoApellido.textContent}`;


    const confirmar = confirm(
        `¿Estás seguro de eliminar al alumno "${nombreCompleto}"?\n\n` +
        "Esta acción no se puede deshacer."
    );


    if (!confirmar) {
        return;
    }


    try {

        btnEliminar.disabled = true;

        btnEliminar.textContent =
            "Eliminando...";


        const referencia = doc(
            db,
            "alumnos",
            idAlumnoActual
        );


        await deleteDoc(referencia);


        // Mostrar resultado
        alumnoEliminado.textContent =
            nombreCompleto;

        idEliminado.textContent =
            idAlumnoActual;


        seccionAlumno.style.display = "none";

        resultadoEliminacion.style.display = "block";


        mensajeBusqueda.textContent = "";

        idAlumnoActual = null;

    } catch (error) {

        console.error(error);

        alert(
            "No se pudo eliminar el alumno.\n\n" +
            "Revisa la consola para obtener más información."
        );

    } finally {

        btnEliminar.disabled = false;

        btnEliminar.textContent =
            "Eliminar alumno";
    }
}


// ==========================================
// CANCELAR
// ==========================================

function cancelar() {

    idAlumnoActual = null;

    idBuscar.value = "";

    mensajeBusqueda.textContent = "";

    seccionAlumno.style.display = "none";

    resultadoEliminacion.style.display = "none";
}


// ==========================================
// EVENTOS
// ==========================================

btnBuscar.addEventListener(
    "click",
    buscarAlumno
);

btnEliminar.addEventListener(
    "click",
    eliminarAlumno
);

btnCancelar.addEventListener(
    "click",
    cancelar
);


// Buscar también al presionar Enter
idBuscar.addEventListener(
    "keydown",
    (evento) => {

        if (evento.key === "Enter") {
            buscarAlumno();
        }

    }
);


// ==========================================
// CARGAR ID DESDE LA URL
// ==========================================

const parametros =
    new URLSearchParams(window.location.search);

const idDesdeURL =
    parametros.get("id");


onAuthStateChanged(auth, (usuario) => {

    if (!usuario) {
        window.location.href = "./login.html";
        return;
    }

    if (idDesdeURL) {
        idBuscar.value = idDesdeURL;
        buscarAlumno();
    }

});
