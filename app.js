import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
getFirestore,
collection,
addDoc,
getDocs,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ==========================================
// FIREBASE
// ==========================================

const firebaseConfig = {
apiKey: "AIzaSyBaP5vVIw0b_3CRepIy328KIcitXlQtwFA",
authDomain: "sistema-alumnos-xammar.firebaseapp.com",
projectId: "sistema-alumnos-xammar",
storageBucket: "sistema-alumnos-xammar.firebasestorage.app",
messagingSenderId: "286883206743",
appId: "1:286883206743:web:bebde00cff1bc372293512"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

// ==========================================
// DATOS
// ==========================================

let alumnos = [];

// ==========================================
// ELEMENTOS
// ==========================================

const btnRegistrar =
document.getElementById("btnRegistrar");

const buscar =
document.getElementById("buscar");

const filtroGrado =
document.getElementById("filtroGrado");

const filtroSeccion =
document.getElementById("filtroSeccion");

const btnLimpiarFiltros =
document.getElementById("btnLimpiarFiltros");

// ==========================================
// REGISTRAR
// ==========================================

btnRegistrar.addEventListener(
"click",
registrarAlumno
);

async function registrarAlumno() {
const nombre =
    document.getElementById("nombre")
        .value.trim();

const apellido =
    document.getElementById("apellido")
        .value.trim();

const grado =
    document.getElementById("grado")
        .value;

const seccion =
    document.getElementById("seccion")
        .value;

const telefono =
    document.getElementById("telefono")
        .value.trim();


// VALIDACIONES

if (!nombre) {
    mostrarMensaje(
        "Escribe el nombre del alumno."
    );
    return;
}

if (!apellido) {
    mostrarMensaje(
        "Escribe el apellido del alumno."
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


btnRegistrar.disabled = true;

btnRegistrar.textContent =
    "Registrando...";


try {

    const referencia =
        await addDoc(
            collection(db, "alumnos"),
            {
                nombre: nombre,
                apellido: apellido,
                grado: grado,
                seccion: seccion,

                telefonoApoderado:
                    telefono === ""
                        ? null
                        : telefono,

                fechaRegistro:
                    serverTimestamp()
            }
        );


    const idAlumno =
        referencia.id;


    // MOSTRAR RESULTADO

    document.getElementById(
        "mostrarNombre"
    ).textContent = nombre;

    document.getElementById(
        "mostrarApellido"
    ).textContent = apellido;

    document.getElementById(
        "mostrarGrado"
    ).textContent = grado;

    document.getElementById(
        "mostrarSeccion"
    ).textContent = seccion;

    document.getElementById(
        "mostrarTelefono"
    ).textContent =
        telefono === ""
            ? "No hay número registrado"
            : telefono;

    document.getElementById(
        "mostrarId"
    ).textContent = idAlumno;


    document.getElementById(
        "resultado"
    ).style.display = "block";


    // QR

    const qr =
        document.getElementById("qrcode");

    qr.innerHTML = "";

    new QRCode(qr, {
        text: idAlumno,
        width: 200,
        height: 200
    });


    // LIMPIAR

    document.getElementById(
        "nombre"
    ).value = "";

    document.getElementById(
        "apellido"
    ).value = "";

    document.getElementById(
        "grado"
    ).value = "";

    document.getElementById(
        "seccion"
    ).value = "";

    document.getElementById(
        "telefono"
    ).value = "";


    mostrarMensaje(
        "Alumno registrado correctamente."
    );


    // RECARGAR LISTA

    await cargarAlumnos();


} catch (error) {

    console.error(error);

    mostrarMensaje(
        "Error al registrar el alumno."
    );

}


btnRegistrar.disabled = false;

btnRegistrar.textContent =
    "Registrar alumno";

}

// ==========================================
// CARGAR ALUMNOS
// ==========================================

async function cargarAlumnos() {
const tabla =
    document.getElementById("tablaAlumnos");

tabla.innerHTML = `
    <tr>
        <td colspan="6">
            Cargando alumnos...
        </td>
    </tr>
`;


try {

    const consulta =
        await getDocs(
            collection(db, "alumnos")
        );


    alumnos = [];


    consulta.forEach(
        (documento) => {

            alumnos.push({
                id: documento.id,
                ...documento.data()
            });

        }
    );


    mostrarAlumnos();


} catch (error) {

    console.error(error);

    tabla.innerHTML = `
        <tr>
            <td colspan="6">
                No se pudieron cargar los alumnos.
            </td>
        </tr>
    `;

}

}

// ==========================================
// MOSTRAR / FILTRAR
// ==========================================

function mostrarAlumnos() {
const texto =
    buscar.value
        .trim()
        .toLowerCase();

const grado =
    filtroGrado.value;

const seccion =
    filtroSeccion.value;


const filtrados =
    alumnos.filter(
        (alumno) => {

            const nombreCompleto =
                `${alumno.nombre} ${alumno.apellido}`
                    .toLowerCase();

            const coincideTexto =
                nombreCompleto.includes(texto) ||
                alumno.id
                    .toLowerCase()
                    .includes(texto);

            const coincideGrado =
                !grado ||
                alumno.grado === grado;

            const coincideSeccion =
                !seccion ||
                alumno.seccion === seccion;


            return (
                coincideTexto &&
                coincideGrado &&
                coincideSeccion
            );

        }
    );


const tabla =
    document.getElementById("tablaAlumnos");


document.getElementById(
    "contador"
).textContent =
    `${filtrados.length} alumno(s) mostrado(s) de ${alumnos.length}`;


if (filtrados.length === 0) {

    tabla.innerHTML = `
        <tr>
            <td colspan="6">
                No se encontraron alumnos.
            </td>
        </tr>
    `;

    return;
}


tabla.innerHTML = "";


filtrados.forEach(
    (alumno) => {

        const fila =
            document.createElement("tr");


        const telefono =
            alumno.telefonoApoderado;


        fila.innerHTML = `

            <td>
                <div class="nombre-alumno">
                    ${escaparHTML(alumno.nombre)}
                    ${escaparHTML(alumno.apellido)}
                </div>
            </td>

            <td>
                ${escaparHTML(alumno.grado)}
            </td>

            <td>
                ${escaparHTML(alumno.seccion)}
            </td>

            <td>
                ${
                    telefono
                        ? escaparHTML(telefono)
                        : '<span class="sin-telefono">No registrado</span>'
                }
            </td>

            <td>
                <div class="id-tabla"
                     title="${escaparHTML(alumno.id)}">
                    ${escaparHTML(alumno.id)}
                </div>
            </td>

            <td>

                <div class="acciones">

                    <button class="accion" data-accion="ver" data-id="${alumno.id}">
                        Ver
                    </button>

                    <button class="accion" data-accion="qr" data-id="${alumno.id}">
                        QR
                    </button>
                    <button
                        class="accion"
                        data-accion="imprimirqr"
                        data-id="${alumno.id}"
                    >
                        Imprimir QR
                    </button>

                    <button class="accion" data-accion="editar" data-id="${alumno.id}">
                        Editar
                    </button>

                    <button class="accion accion-eliminar" data-accion="eliminar" data-id="${alumno.id}">
                        Eliminar
                    </button>

                </div>

            </td>
        `;


        tabla.appendChild(fila);

    }
);


// BOTONES DE ACCIÓN

document.querySelectorAll(
    ".accion"
).forEach(
    (boton) => {

        boton.addEventListener(
            "click",
            () => {

                const id =
                    boton.dataset.id;

                const accion =
                    boton.dataset.accion;


                const alumno =
                    alumnos.find(
                        (a) =>
                            a.id === id
                    );


                if (!alumno) {
                    return;
                }


                if (accion === "ver") {
                    verAlumno(alumno);
                }

                if (accion === "qr") {
                    mostrarQR(alumno);
                }
                if (accion === "imprimirqr") {

                    window.location.href =
                        `imprimirqr.html?id=${encodeURIComponent(alumno.id)}`;

                    return;
                }
                if (accion === "editar") {

                    window.location.href =
                        `editaralumno.html?id=${encodeURIComponent(alumno.id)}`;

                    return;
                }

                if (accion === "eliminar") {

                    window.location.href =
                        `eliminaralumno.html?id=${encodeURIComponent(alumno.id)}`;

                    return;
                }

            }
        );

    }
);

}

// ==========================================
// BUSCADOR
// ==========================================

buscar.addEventListener(
"input",
mostrarAlumnos
);

filtroGrado.addEventListener(
"change",
mostrarAlumnos
);

filtroSeccion.addEventListener(
"change",
mostrarAlumnos
);

// ==========================================
// LIMPIAR FILTROS
// ==========================================

btnLimpiarFiltros.addEventListener(
"click",
() => {
    buscar.value = "";

    filtroGrado.value = "";

    filtroSeccion.value = "";

    mostrarAlumnos();

}

);

// ==========================================
// VER ALUMNO
// ==========================================

function verAlumno(alumno) {
const telefono =
    alumno.telefonoApoderado
        ? alumno.telefonoApoderado
        : "No hay número registrado";


document.getElementById(
    "datosModal"
).innerHTML = `

    <p>
        <strong>Nombre:</strong>
        ${escaparHTML(alumno.nombre)}
    </p>

    <p>
        <strong>Apellido:</strong>
        ${escaparHTML(alumno.apellido)}
    </p>

    <p>
        <strong>Grado:</strong>
        ${escaparHTML(alumno.grado)}
    </p>

    <p>
        <strong>Sección:</strong>
        ${escaparHTML(alumno.seccion)}
    </p>

    <p>
        <strong>Apoderado:</strong>
        ${escaparHTML(telefono)}
    </p>

    <p>
        <strong>ID:</strong>
        <span class="id">
            ${escaparHTML(alumno.id)}
        </span>
    </p>

`;


abrirModal("modalVer");

}

// ==========================================
// MOSTRAR QR
// ==========================================

function mostrarQR(alumno) {
document.getElementById(
    "nombreQR"
).textContent =
    `${alumno.nombre} ${alumno.apellido} — ${alumno.grado} ${alumno.seccion}`;


document.getElementById(
    "idQR"
).textContent =
    alumno.id;


const contenedor =
    document.getElementById(
        "qrcodeModal"
    );


contenedor.innerHTML = "";


new QRCode(
    contenedor,
    {
        text: alumno.id,
        width: 220,
        height: 220
    }
);


abrirModal("modalQR");

}

// ==========================================
// MODALES
// ==========================================

function abrirModal(id) {
document.getElementById(id)
    .style.display = "flex";

}

window.cerrarModal =
function(id) {
    document.getElementById(id)
        .style.display = "none";

};

// ==========================================
// ESCAPAR HTML
// ==========================================

function escaparHTML(texto) {
if (texto === undefined || texto === null) {
    return "";
}

return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}

// ==========================================
// MENSAJES
// ==========================================

function mostrarMensaje(texto) {
document.getElementById(
    "mensaje"
).textContent = texto;

}

// ==========================================
// INICIAR
// ==========================================

onAuthStateChanged(auth, (usuario) => {

    if (!usuario) {
        window.location.href = "./login.html";
        return;
    }

    cargarAlumnos();

});

const btnCerrarSesion =
    document.getElementById("btnCerrarSesion");

if (btnCerrarSesion) {

    btnCerrarSesion.addEventListener(
        "click",
        async () => {

            const confirmar = confirm(
                "¿Deseas cerrar la sesión?"
            );

            if (!confirmar) {
                return;
            }

            try {

                await signOut(auth);

                window.location.href =
                    "./login.html";

            } catch (error) {

                console.error(error);

                alert(
                    "No se pudo cerrar la sesión."
                );

            }

        }
    );

}