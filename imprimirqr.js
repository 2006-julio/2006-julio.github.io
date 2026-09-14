import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


// ==========================================
// CONFIGURACIÓN FIREBASE
// ==========================================

const firebaseConfig = {

    apiKey: "AIzaSyBaP5vVIw0b_3CRepIy328KIcitXlQtwFA",

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


// ==========================================
// INICIALIZAR FIREBASE
// ==========================================

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);


// ==========================================
// ELEMENTOS
// ==========================================

const nombreAlumno =
    document.getElementById("nombreAlumno");

const gradoSeccion =
    document.getElementById("gradoSeccion");

const nombreImpresion =
    document.getElementById("nombreImpresion");

const apellidoImpresion =
    document.getElementById("apellidoImpresion");

const gradoImpresion =
    document.getElementById("gradoImpresion");

const seccionImpresion =
    document.getElementById("seccionImpresion");

const hojaQR =
    document.getElementById("hojaQR");

const mensajeError =
    document.getElementById("mensajeError");

const btnImprimir =
    document.getElementById("btnImprimir");


// ==========================================
// PROTEGER LA PÁGINA
// ==========================================

onAuthStateChanged(auth, (usuario) => {

    if (!usuario) {

        window.location.href =
            "./login.html";

        return;
    }


    cargarAlumno();

});


// ==========================================
// OBTENER ID DESDE LA URL
// ==========================================

const parametros =
    new URLSearchParams(
        window.location.search
    );

const idAlumno =
    parametros.get("id");


// ==========================================
// CARGAR ALUMNO
// ==========================================

async function cargarAlumno() {

    if (!idAlumno) {

        mostrarError(
            "No se recibió el ID del alumno."
        );

        return;
    }


    try {

        const referencia =
            doc(
                db,
                "alumnos",
                idAlumno
            );


        const documento =
            await getDoc(referencia);


        if (!documento.exists()) {

            mostrarError(
                "No se encontró el alumno."
            );

            return;
        }


        const datos =
            documento.data();


        const nombre =
            `${datos.nombre || ""} ${datos.apellido || ""}`
                .trim();

        nombreImpresion.textContent =
            datos.nombre || "No registrado";

        apellidoImpresion.textContent =
            datos.apellido || "No registrado";

        gradoImpresion.textContent =
            datos.grado || "No registrado";

        seccionImpresion.textContent =
            datos.seccion || "No registrada";


        // Mostrar información
        nombreAlumno.textContent =
            nombre || "Alumno";


        gradoSeccion.textContent =
            `${datos.grado || ""} - Sección ${datos.seccion || ""}`;


        // Generar los 12 QR
        generarQR();


    } catch (error) {

        console.error(error);

        mostrarError(
            "No se pudo cargar la información del alumno."
        );

    }

}


// ==========================================
// GENERAR LOS 12 QR
// ==========================================

function generarQR() {

    hojaQR.innerHTML = "";

    for (let i = 1; i <= 12; i++) {

        const tarjeta =
            document.createElement("div");

        tarjeta.className =
            "tarjeta-qr";


        // ==================================
        // NOMBRE DE LA INSTITUCIÓN
        // ==================================

        const institucion =
            document.createElement("div");

        institucion.className =
            "institucion-qr";

        institucion.textContent =
            "I.E. LUIS FABIO XAMMAR JURADO";


        // ==================================
        // CONTENEDOR DEL QR
        // ==================================

        const contenedorQR =
            document.createElement("div");

        contenedorQR.className =
            "codigo-qr";


        // ==================================
        // ARMAR TARJETA
        // ==================================

        tarjeta.appendChild(
            institucion
        );

        tarjeta.appendChild(
            contenedorQR
        );


        hojaQR.appendChild(
            tarjeta
        );


        // ==================================
        // GENERAR QR
        // ==================================

        new QRCode(
            contenedorQR,
            {
                // SOLO EL ID DE FIRESTORE
                text: idAlumno,

                width: 120,

                height: 120,

                correctLevel:
                    QRCode.CorrectLevel.M
            }
        );

    }
}



// ==========================================
// MOSTRAR ERROR
// ==========================================

function mostrarError(mensaje) {

    mensajeError.textContent =
        mensaje;

}


// ==========================================
// IMPRIMIR
// ==========================================

btnImprimir.addEventListener(
    "click",
    () => {

        window.print();

    }
);

