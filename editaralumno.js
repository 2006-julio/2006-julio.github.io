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
updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ==========================================
// FIREBASE
// ==========================================

const firebaseConfig = {
apiKey:
    "AIzaSyBaP5vVIw0b_3CRepIy328KIcitXlQtwFA",

authDomain:
    "sistema-alumnos-xammar.firebaseapp.com",

projectId:
    "sistema-alumnos-xammar",

storageBucket:
    "sistema-alumnos-xammar.firebasestorage.app",

messagingSenderId:
    "286883206743",

appId:
    "1:286883206743:web:bebde00cff1bc372293512"

};

// Inicializar Firebase

const app =
initializeApp(firebaseConfig);

const auth =
    getAuth(app);

// Conectar Firestore

const db =
getFirestore(app);

// ==========================================
// ELEMENTOS
// ==========================================

const idBuscar =
document.getElementById("idBuscar");

const btnBuscar =
document.getElementById("btnBuscar");

const btnGuardar =
document.getElementById("btnGuardar");

const btnCancelar =
document.getElementById("btnCancelar");

const seccionEditar =
document.getElementById("seccionEditar");

const resultado =
document.getElementById("resultado");

const mensaje =
document.getElementById("mensaje");

// ==========================================
// VARIABLE DEL ALUMNO ACTUAL
// ==========================================

let idAlumnoActual = null;

// ==========================================
// BUSCAR ALUMNO
// ==========================================

btnBuscar.addEventListener(
"click",
buscarAlumno
);

async function buscarAlumno() {
const id =
    idBuscar.value.trim();


if (id === "") {

    mostrarMensaje(
        "Escribe el ID del alumno."
    );

    return;
}


btnBuscar.disabled = true;

btnBuscar.textContent =
    "Buscando...";


try {

    // Referencia al documento

    const referencia =
        doc(
            db,
            "alumnos",
            id
        );


    // Obtener documento

    const documento =
        await getDoc(
            referencia
        );


    // Comprobar existencia

    if (!documento.exists()) {

        mostrarMensaje(
            "No se encontró ningún alumno con ese ID."
        );

        seccionEditar.style.display =
            "none";

        return;
    }


    // Datos

    const alumno =
        documento.data();


    // Guardar ID actual

    idAlumnoActual =
        documento.id;


    // ==================================
    // CARGAR DATOS
    // ==================================

    document.getElementById(
        "idAlumno"
    ).textContent =
        documento.id;


    document.getElementById(
        "nombre"
    ).value =
        alumno.nombre || "";


    document.getElementById(
        "apellido"
    ).value =
        alumno.apellido || "";


    document.getElementById(
        "grado"
    ).value =
        alumno.grado || "";


    document.getElementById(
        "seccion"
    ).value =
        alumno.seccion || "";


    document.getElementById(
        "telefono"
    ).value =
        alumno.telefonoApoderado || "";


    // Mostrar formulario

    seccionEditar.style.display =
        "block";


    resultado.style.display =
        "none";


    mostrarMensaje(
        "Alumno encontrado."
    );


} catch (error) {

    console.error(error);

    mostrarMensaje(
        "Ocurrió un error al buscar el alumno."
    );

}


btnBuscar.disabled = false;

btnBuscar.textContent =
    "Buscar alumno";

}

// ==========================================
// GUARDAR CAMBIOS
// ==========================================

btnGuardar.addEventListener(
"click",
guardarCambios
);

async function guardarCambios() {
if (!idAlumnoActual) {

    mostrarMensaje(
        "Primero debes buscar un alumno."
    );

    return;
}


// ==================================
// OBTENER DATOS
// ==================================

const nombre =
    document.getElementById(
        "nombre"
    ).value.trim();


const apellido =
    document.getElementById(
        "apellido"
    ).value.trim();


const grado =
    document.getElementById(
        "grado"
    ).value;


const seccion =
    document.getElementById(
        "seccion"
    ).value;


const telefono =
    document.getElementById(
        "telefono"
    ).value.trim();


// ==================================
// VALIDACIONES
// ==================================

if (!nombre) {

    mostrarMensaje(
        "El nombre es obligatorio."
    );

    return;
}


if (!apellido) {

    mostrarMensaje(
        "El apellido es obligatorio."
    );

    return;
}


if (!grado) {

    mostrarMensaje(
        "Selecciona el grado."
    );

    return;
}


if (!seccion) {

    mostrarMensaje(
        "Selecciona la sección."
    );

    return;
}


if (
    telefono !== "" &&
    !/^\d{9}$/.test(telefono)
) {

    mostrarMensaje(
        "El número debe tener 9 dígitos."
    );

    return;
}


// ==================================
// DESACTIVAR BOTÓN
// ==================================

btnGuardar.disabled = true;

btnGuardar.textContent =
    "Guardando...";


try {

    // ==================================
    // REFERENCIA AL DOCUMENTO
    // ==================================

    const referencia =
        doc(
            db,
            "alumnos",
            idAlumnoActual
        );


    // ==================================
    // ACTUALIZAR FIRESTORE
    // ==================================

    await updateDoc(
        referencia,
        {

            nombre: nombre,

            apellido: apellido,

            grado: grado,

            seccion: seccion,

            telefonoApoderado:
                telefono === ""
                    ? null
                    : telefono

        }
    );


    // ==================================
    // MOSTRAR RESULTADO
    // ==================================

    document.getElementById(
        "resultadoNombre"
    ).textContent =
        nombre;


    document.getElementById(
        "resultadoApellido"
    ).textContent =
        apellido;


    document.getElementById(
        "resultadoGrado"
    ).textContent =
        grado;


    document.getElementById(
        "resultadoSeccion"
    ).textContent =
        seccion;


    document.getElementById(
        "resultadoTelefono"
    ).textContent =
        telefono === ""
            ? "No hay número registrado"
            : telefono;


    document.getElementById(
        "resultadoId"
    ).textContent =
        idAlumnoActual;


    resultado.style.display =
        "block";


    mostrarMensaje(
        "Cambios guardados correctamente."
    );


} catch (error) {

    console.error(error);

    mostrarMensaje(
        "No se pudieron guardar los cambios."
    );

}


btnGuardar.disabled = false;

btnGuardar.textContent =
    "Guardar cambios";

}

// ==========================================
// CANCELAR
// ==========================================

btnCancelar.addEventListener(
"click",
() => {
    seccionEditar.style.display =
        "none";

    resultado.style.display =
        "none";

    idAlumnoActual =
        null;

    idBuscar.value = "";

    mostrarMensaje("");

}

);

// ==========================================
// MENSAJES
// ==========================================

function mostrarMensaje(texto) {
mensaje.textContent =
    texto;

}

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