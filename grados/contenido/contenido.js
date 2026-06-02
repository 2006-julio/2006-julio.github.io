import { db } from "../../config-firebase.js";
import { collection,getDocs } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

let contenido = [];

//convertidor YouTube
function convertirYoutube(url) {

    if (url.includes("youtu.be")) {

        const id = url.split("/").pop();

        return `https://www.youtube.com/embed/${id}`;
    }

    if (url.includes("watch?v=")) {

        const id = url.split("v=")[1].split("&")[0];

        return `https://www.youtube.com/embed/${id}`;
    }

    return url;
}


//contenedores
const contVideos = document.getElementById("videos");
const contImagenes = document.getElementById("imagenes");
const contTextos = document.getElementById("textos");
const contAudios = document.getElementById("audios");



//render
function renderContenido() {

    contVideos.innerHTML = "";
    contImagenes.innerHTML = "";
    contTextos.innerHTML = "";
    contAudios.innerHTML = "";


    contenido.forEach(item => {
        // FILTRO
        if (item.grado !== gradoActual) {
            return;
        }

        //VIDEOS
        if (item.tipo === "video") {

            contVideos.innerHTML += `
                <div class="card">

                    <iframe 
                        src="${convertirYoutube(item.src)}" 
                        frameborder="0" 
                        allowfullscreen>
                    </iframe>

                    <p>${item.titulo}</p>

                    

                </div>
            `;
        }



        //IMAGENES
        if (item.tipo === "imagen") {

            contImagenes.innerHTML += `
                <div class="card">

                    <img src="${item.src}" alt="">

                    <p>${item.titulo}</p>

                    

                </div>
            `;
        }

        //TEXTOS
        if (item.tipo === "texto") {
            contTextos.innerHTML += `
                <div class="texto">
                    <p>${item.texto}</p>          
                </div>
            `;
        }
        //AUDIOS
        if (item.tipo === "audio") {

            contAudios.innerHTML += `
                <div class="card">
                    <audio controls>
                        <source src="${item.src}" type="audio/mpeg">
                        Tu navegador no soporta audio.
                    </audio>
                    <p>${item.titulo}</p> 
                </div>
            `;
        }
    });
}
//renderContenido();
//fire base
async function cargarContenido() {

    const querySnapshot = await getDocs(
        collection(db, "contenido")
    );

    contenido = [];

    querySnapshot.forEach((doc) => {

        contenido.push(doc.data());

    });

    renderContenido();
}
cargarContenido();