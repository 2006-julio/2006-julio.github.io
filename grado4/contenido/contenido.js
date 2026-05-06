const contenido = [
    {
        tipo: "video",
        src: "https://youtu.be/jrIBc2sbm6M",
        titulo: "Padre Nuestro de lento a rapido"
    },
    {
        tipo: "video",
        src: "youtube.com/watch?v=Z6c2aNlv4eQ",
        titulo: "ABC Song"
    },
    {
        tipo: "video",
        src: "https://youtu.be/nnB0sYRNzEw",
        titulo: "Good Morning"
    },
    {
        tipo:"video",
        src:"https://www.youtube.com/watch?v=0SQHooigF7s",
        titulo:"✏️📚 Classroom Commands Song"
    },
    {
        tipo: "texto",
        texto: "sin informacion de clases de ingles"
    },
];

// 🔥 convertidor YouTube
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


// 📦 contenedores (IMPORTANTE: coinciden con tu HTML)
const contVideos = document.getElementById("videos");
const contImagenes = document.getElementById("imagenes");
const contTextos = document.getElementById("textos");


// 🚀 render
function renderContenido() {

    contVideos.innerHTML = "";
    contImagenes.innerHTML = "";
    contTextos.innerHTML = "";

    contenido.forEach(item => {

        // 🎬 VIDEOS
        if (item.tipo === "video") {
            contVideos.innerHTML += `
                <div class="card">
                    <iframe src="${convertirYoutube(item.src)}" frameborder="0" allowfullscreen></iframe>
                    <p>${item.titulo}</p>
                </div>
            `;
        }

        //IMÁGENES
        if (item.tipo === "imagen") {
            contImagenes.innerHTML += `
                <div class="card">
                    <img src="${item.src}" alt="">
                    <p>${item.titulo}</p>
                </div>
            `;
        }

        //TEXTO
        if (item.tipo === "texto") {
            contTextos.innerHTML += `
                <div class="texto">
                    <p>${item.texto}</p>
                </div>
            `;
        }
    });
}

renderContenido();
