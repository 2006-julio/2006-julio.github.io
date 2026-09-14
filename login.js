import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


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


// ==========================================
// INICIALIZAR FIREBASE
// ==========================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);


// ==========================================
// ELEMENTOS
// ==========================================

const formLogin =
    document.getElementById("formLogin");

const correo =
    document.getElementById("correo");

const contrasena =
    document.getElementById("contrasena");

const btnLogin =
    document.getElementById("btnLogin");

const mensajeLogin =
    document.getElementById("mensajeLogin");


// ==========================================
// COMPROBAR SESIÓN
// ==========================================

onAuthStateChanged(auth, (usuario) => {

    if (usuario) {

        window.location.href = "./index.html";

    }

});


// ==========================================
// INICIAR SESIÓN
// ==========================================

formLogin.addEventListener(
    "submit",
    async (evento) => {

        evento.preventDefault();


        const email =
            correo.value.trim();

        const password =
            contrasena.value;


        if (!email || !password) {

            mensajeLogin.textContent =
                "Completa todos los campos.";

            mensajeLogin.style.color = "red";

            return;
        }


        try {

            btnLogin.disabled = true;

            btnLogin.textContent =
                "Ingresando...";

            mensajeLogin.textContent =
                "";


            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


            // La redirección se realizará
            // mediante onAuthStateChanged.


        } catch (error) {

            console.error(error);


            mensajeLogin.style.color = "red";


            if (
                error.code ===
                "auth/invalid-credential"
            ) {

                mensajeLogin.textContent =
                    "Correo o contraseña incorrectos.";

            } else if (
                error.code ===
                "auth/too-many-requests"
            ) {

                mensajeLogin.textContent =
                    "Demasiados intentos. Intenta nuevamente más tarde.";

            } else {

                mensajeLogin.textContent =
                    "No se pudo iniciar sesión.";

            }

        } finally {

            btnLogin.disabled = false;

            btnLogin.textContent =
                "Iniciar sesión";
        }

    }
);
