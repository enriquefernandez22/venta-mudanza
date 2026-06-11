document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("contenedor-productos");

    // Creamos el elemento del contador dinámicamente
    const contadorElemento = document.createElement("p");
    contadorElemento.style = "text-align: center; font-size: 1.2rem; font-weight: 600; color: #1A2530; margin-bottom: 1.5rem;";
    
    // Creamos la barra de filtros dinámicamente con estilos que combinan con tu CSS
    const barraFiltros = document.createElement("div");
    barraFiltros.style = "text-align: center; margin-bottom: 2rem; display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; padding: 0 1rem;";
    
    // Insertamos el contador y los filtros justo arriba del contenedor de productos
    contenedor.parentNode.insertBefore(contadorElemento, contenedor);
    contenedor.parentNode.insertBefore(barraFiltros, contenedor);

    let todosLosProductos = [];
    let filtroActivo = "todos";

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

    // Función principal para renderizar las tarjetas según el filtro seleccionado
    function renderizarProductos(productosFiltrados) {
        contenedor.innerHTML = "";
        
        // Actualiza el texto del contador según la cantidad actual en pantalla
        if (filtroActivo === "todos") {
            contadorElemento.textContent = `Total: ${productosFiltrados.length} artículos en catálogo`;
        } else if (filtroActivo === "nuevos") {
            contadorElemento.textContent = `Encontrados: ${productosFiltrados.length} artículos nuevos`;
        } else if (filtroActivo === "disponibles") {
            contadorElemento.textContent = `Disponibles: ${productosFiltrados.length} artículos sin vender`;
        }

        productosFiltrados.forEach(producto => {
            const card = document.createElement("article");
            const isSold = producto.vendido === true || producto.estado === "vendido";
            card.className = isSold ? "card card-sold" : "card";

            const precioSugeridoHtml = producto.precioSugerido
                ? `<span class="suggested-price">${producto.precioSugerido}</span>`
                : ``;
            
            const fechaHtml = producto.fecha 
                ? `<p class="date">📅 ${producto.fecha}</p>` 
                : ``;

            // Calculamos si el producto es reciente (menos de 4 días de antigüedad)
            let esReciente = false;
            if (producto.nuevo && producto.nuevo !== "") {
                const fechaProducto = new Date(producto.nuevo).getTime();
                const fechaActual = new Date().getTime();
                // Convertimos la diferencia de milisegundos a días
                const diasDiferencia = (fechaActual - fechaProducto) / (1000 * 60 * 60 * 24);
                
                // Si pasaron 4 días o menos, es reciente
                esReciente = diasDiferencia <= 2; 
            }
            console.log(esReciente, producto.titulo, producto.nuevo);
            // Etiqueta visual "NUEVO" (solo si es reciente y NO está vendido)
            const badgeNuevo = (esReciente && !isSold)
                ? `<span style="position: absolute; top: 10px; right: 10px; background: #E65A5A; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 2;">¡NUEVO!</span>`
                : ``;

            const telefono = "5491153133329"; 
            const mensaje = encodeURIComponent(`Hola, me interesa tu publicación: ${producto.titulo} a ${producto.precioVenta}.`);
            const linkWhatsapp = `https://wa.me/${telefono}?text=${mensaje}`;
            
            const imagenes = buildImageSources(producto.imagen);
            const encodedFallbacks = encodeURIComponent(JSON.stringify(imagenes));

            card.innerHTML = `
                <div class="image-wrapper" style="position: relative;">
                    ${isSold ? '<span class="sold-badge">VENDIDO</span>' : ""}
                    ${badgeNuevo}
                    <img src="${imagenes[0]}" data-fallbacks="${encodedFallbacks}" alt="${producto.titulo}" loading="lazy">
                </div>
                <div class="card-content">
                    <h2>${producto.titulo}</h2>
                    <p class="description">${producto.descripcion}</p>
                    ${fechaHtml}
                    <div class="price-box">
                        ${precioSugeridoHtml}
                        <span class="sale-price">${producto.precioVenta}</span>
                    </div>
                    <p class="opportunity">¡Excelente oportunidad por viaje!</p>
                    ${isSold
                        ? '<span class="btn-whatsapp btn-disabled">Vendido</span>'
                        : `<a href="${linkWhatsapp}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">Consultar</a>`}
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
    }

    // Función para crear los botones de filtro con feedback visual
    function crearBotonesFiltros() {
        const botones = [
            { id: "todos", texto: "Ver Todos" },
            { id: "nuevos", texto: "✨ Recién Agregados" },
            { id: "disponibles", texto: "🏷️ Disponibles (Sin Vender)" }
        ];

        barraFiltros.innerHTML = "";

        botones.forEach(btn => {
            const boton = document.createElement("button");
            boton.textContent = btn.texto;
            
            // Estilos base para los botones
            boton.style = "padding: 0.6rem 1.2rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 2px solid #1A2530; transition: all 0.2s ease;";
            
            // Resaltado del botón activo
            if (filtroActivo === btn.id) {
                boton.style.backgroundColor = "#1A2530";
                boton.style.color = "#ffffff";
            } else {
                boton.style.backgroundColor = "transparent";
                boton.style.color = "#1A2530";
            }

            boton.addEventListener("click", () => {
                filtroActivo = btn.id;
                crearBotonesFiltros(); // Redibujar botones para actualizar el estado activo
                
                let productosFiltrados = [...todosLosProductos];
                if (filtroActivo === "nuevos") {
                    productosFiltrados = productosFiltrados.filter(p => (p.nuevo || "") !== "");
                } else if (filtroActivo === "disponibles") {
                    productosFiltrados = productosFiltrados.filter(p => p.vendido !== true && p.estado !== "vendido");
                }
                
                renderizarProductos(productosFiltrados);
            });

            barraFiltros.appendChild(boton);
        });
    }

    fetch("productos.json")
        .then(respuesta => respuesta.json())
        .then(productos => {
            // 1. Invertimos para que lo último del Excel quede arriba
            productos.reverse();

            // 2. Orden inicial: Forzar que los que tienen datos en "nuevo" vayan primero en la carga inicial
            productos.sort((a, b) => {
                const aNuevo = a.nuevo || "";
                const bNuevo = b.nuevo || "";
                if (aNuevo !== "" && bNuevo === "") return -1;
                if (aNuevo === "" && bNuevo !== "") return 1;
                return 0;
            });

            todosLosProductos = productos;
            
            // Inicializar interfaz
            crearBotonesFiltros();
            renderizarProductos(todosLosProductos);
        })
        .catch(error => {
            console.error("Error cargando el catálogo:", error);
            contenedor.innerHTML = "<p style='text-align:center; padding: 2rem;'>Hubo un problema al cargar los artículos. Por favor, recarga la página.</p>";
        });
});