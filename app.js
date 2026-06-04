document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("contenedor-productos");

    function buildImageSources(imagePath) {
        const lastDot = imagePath.lastIndexOf(".");
        if (lastDot === -1) {
            return {
                avif: imagePath,
                webp: imagePath,
                fallback: imagePath
            };
        }

        const basePath = imagePath.slice(0, lastDot);
        return {
            avif: `${basePath}.avif`,
            webp: `${basePath}.webp`,
            fallback: imagePath
        };
    }

    // Hacemos el fetch al archivo JSON. 
    // Asegúrate de guardar tu JSON con el nombre 'productos.json' en la misma carpeta.
    fetch("productos.json")
        .then(respuesta => respuesta.json())
        .then(productos => {
            productos.forEach(producto => {
                // Creamos el elemento principal de la tarjeta
                const card = document.createElement("article");
                card.className = "card";

                // Validamos si hay precio sugerido para no mostrar un espacio en blanco roto
                const precioSugeridoHtml = producto.precioSugerido
                    ? `<span class="suggested-price">${producto.precioSugerido}</span>`
                    : ``;

                // Preparamos el link de WhatsApp (¡Recuerda cambiar el número!)
                // Formato internacional sin símbolos, ej: 5491123456789
                const telefono = "5491153133329"; 
                const mensaje = encodeURIComponent(`Hola, me interesa tu publicación de la mudanza: ${producto.titulo} a ${producto.precioVenta}.`);
                const linkWhatsapp = `https://wa.me/${telefono}?text=${mensaje}`;
                const imagenes = buildImageSources(producto.imagen);

                // Insertamos el HTML interno de la tarjeta mapeando las variables
                card.innerHTML = `
                    <picture>
                        <source srcset="${imagenes.avif}" type="image/avif">
                        <source srcset="${imagenes.webp}" type="image/webp">
                        <img src="${imagenes.fallback}" alt="${producto.titulo}" loading="lazy">
                    </picture>
                    <div class="card-content">
                        <h2>${producto.titulo}</h2>
                        <p class="description">${producto.descripcion}</p>
                        <div class="price-box">
                            ${precioSugeridoHtml}
                            <span class="sale-price">${producto.precioVenta}</span>
                        </div>
                        <a href="${linkWhatsapp}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
                            Consultar
                        </a>
                    </div>
                `;

                // Añadimos la tarjeta completa al contenedor en el DOM
                contenedor.appendChild(card);
            });
        })
        .catch(error => {
            console.error("Hubo un error cargando los productos:", error);
            contenedor.innerHTML = "<p style='text-align:center; padding: 2rem;'>Hubo un problema al cargar los artículos. Por favor, recarga la página.</p>";
        });
});