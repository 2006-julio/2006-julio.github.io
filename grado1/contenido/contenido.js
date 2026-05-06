const contenido = [
    {
        tipo:"video",
        src:"https://youtu.be/-lc5lKJZSGE",
        titulo:"Si Tú Tienes - If You’re Happy ♫ "
    },
    {
        tipo: "video",
        src: "https://youtu.be/jrIBc2sbm6M",
        titulo: "Padre Nuestro de lento a rapido a lento"
    },
    {
        tipo:"video",
        src:"https://youtu.be/5a-P8VfTw4s",
        titulo:"Padre Nuestro"
    },
    {
        tipo: "video",
        src: "https://youtu.be/B-BnUl1IK9I",
        titulo: "Magic Words Song "
    },
    {
        tipo: "video",
        src: "https://youtu.be/nnB0sYRNzEw",
        titulo: "Good Morning"
    },
    {
        tipo:"video",
        src:"https://youtu.be/vXXiyIGqliE?list=PLuA75Ir_S2pVePY1LjQpdsPxPIEOJzkZo",
        titulo:"Body Parts Song"
    },
    {
        tipo:"imagen",
        src:"./img/image.png",  
        titulo:"local"
    },
    {
        tipo:"imagen",
        src:"https://english4kidsonline.com/wp-content/uploads/2023/01/los-pronombres-en-ingles-768x480.jpg",  
        titulo:"web"
    },
    {
        tipo:"imagen",
        src:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRB00G6EKGO3YgqqB9yY-RkOpJ0ZwYwdb6-uw&s",
        titulo: "ingles"
    },
    {
        tipo:"imagen",
        src:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxcJrFfnSqFrgPRRQbJWQlku74rON9ugrimw&s",
        titulo:"ingless"
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
