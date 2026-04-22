const contenidop = [
    {
        tipo: "video",
        src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        titulo: "Video educativo"
    },
    {
        tipo: "imagen",
        src: "https://via.placeholder.com/300",
        titulo: "Imagen ejemplo"
    },
    {
        tipo: "texto",
        texto: "Este es un contenido de ejemplo para primer grado."
    },
    {
        tipo: "texto",
        texto: "Este es un contenido de ejemplo para primer grado."
    },
    {
        tipo: "texto",
        texto: "Este es un contenido de ejemplo para primer grado."
    },
    {
        tipo: "texto",
        texto: "Este es un contenido de ejemplo para primer grado."
    }
];

const contenedor = document.getElementById("contenedor-contenido");

contenido.forEach(item => {
    const card = document.createElement("div");
    card.classList.add("card-contenido");

    if (item.tipo === "video") {
        card.innerHTML = `
            <iframe src="${item.src}" frameborder="0" allowfullscreen></iframe>
            <p>${item.titulo}</p>
        `;
    }

    if (item.tipo === "imagen") {
        card.innerHTML = `
            <img src="${item.src}" alt="">
            <p>${item.titulo}</p>
        `;
    }

    if (item.tipo === "texto") {
        card.innerHTML = `<p>${item.texto}</p>`;
    }

    contenedor.appendChild(card);
});