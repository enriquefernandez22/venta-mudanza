document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("contenedor-productos");

    function slugifySegment(value) {
        return value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();
    }

    function slugifyImageBasePath(basePath) {
        const segments = basePath.split("/");
        return segments
            .map((segment, index) => (index === segments.length - 1 ? slugifySegment(segment) : segment))
            .join("/");
    }

    function unique(values) {
        return [...new Set(values.filter(Boolean))];
    }

    function buildImageSources(imagePath) {
        const lastDot = imagePath.lastIndexOf(".");
        if (lastDot === -1) {
            return [imagePath];
        }

        const legacyBasePath = imagePath.slice(0, lastDot);
        const slugBasePath = slugifyImageBasePath(legacyBasePath);

        return unique([
            `${slugBasePath}.avif`,
            `${slugBasePath}.webp`,
            `${legacyBasePath}.avif`,
            `${legacyBasePath}.webp`,
            imagePath
        ]);
    }

    // Hacemos el fetch al archivo JSON. 
    // Asegúrate de guardar tu JSON con el nombre 'productos.json' en la misma carpeta.
    fetch("productos.json")
        .then(respuesta => respuesta.json())
        .then(productos => {
            productos.forEach(producto => {
                const card = document.createElement("article");
                card.className = "card";

                // Validaciones para no romper el layout si falta algún dato
                const precioSugeridoHtml = producto.precioSugerido
                    ? `<span class="suggested-price">${producto.precioSugerido}</span>`
                    : ``;
                
                // Nueva validación para la fecha
                const fechaHtml = producto.fecha 
                    ? `<p class="date">📅 ${producto.fecha}</p>` 
                    : ``;

                const telefono = "5491153133329"; 
                const mensaje = encodeURIComponent(`Hola, me interesa tu publicación: ${producto.titulo} a ${producto.precioVenta}.`);
                const linkWhatsapp = `https://wa.me/${telefono}?text=${mensaje}`;
                const imagenes = buildImageSources(producto.imagen);
                const encodedFallbacks = encodeURIComponent(JSON.stringify(imagenes));

                // Inyectamos el texto de la oportunidad directamente en el HTML
                card.innerHTML = `
                    <img src="${imagenes[0]}" data-fallbacks="${encodedFallbacks}" alt="${producto.titulo}" loading="lazy">
                    <div class="card-content">
                        <h2>${producto.titulo}</h2>
                        <p class="description">${producto.descripcion}</p>
                        ${fechaHtml}
                        <div class="price-box">
                        ${precioSugeridoHtml}
                        <span class="sale-price">${producto.precioVenta}</span>
                        </div>
                        <p class="opportunity">¡Excelente oportunidad por viaje!</p>
                        <a href="${linkWhatsapp}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
                            Consultar
                        </a>
                    </div>
                `;

                const img = card.querySelector("img");
                const fallbacks = JSON.parse(decodeURIComponent(img.dataset.fallbacks || "[]"));
                let currentIndex = 0;

                img.addEventListener("error", () => {
                    currentIndex += 1;
                    if (currentIndex < fallbacks.length) {
                        img.src = fallbacks[currentIndex];
                        return;
                    }

                    img.alt = `${producto.titulo} (imagen no disponible)`;
                });

                contenedor.appendChild(card);
            });
        })
        .catch(error => {
            console.error("Error cargando el catálogo:", error);
            contenedor.innerHTML = "<p style='text-align:center; padding: 2rem;'>Hubo un problema al cargar los artículos. Por favor, recarga la página.</p>";
        });
});