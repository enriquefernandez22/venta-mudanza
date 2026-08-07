document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("contenedor-productos");
  const NEW_PRODUCT_DAYS = 7;
  // Cotización usada SOLO para ordenar productos en USD junto a los de pesos.
  // Se intenta obtener el dólar blue en vivo; si falla, se usa este valor de respaldo.
  let cotizacionDolarBlue = 1460;

  async function obtenerCotizacionDolar() {
    try {
      const respuesta = await fetch("https://dolarapi.com/v1/dolares/blue");
      const datos = await respuesta.json();
      if (datos && typeof datos.venta === "number" && datos.venta > 0) {
        cotizacionDolarBlue = datos.venta;
      }
    } catch (error) {
      console.warn(
        "No se pudo obtener el dólar en vivo, usando cotización por defecto.",
        error,
      );
    }
  }

  // Creamos el elemento del contador dinámicamente
  const contadorElemento = document.createElement("p");
  contadorElemento.className = "catalog-counter";

  // Creamos la barra de filtros dinámicamente con estilos que combinan con tu CSS
  const barraFiltros = document.createElement("div");
  barraFiltros.className = "filters-bar";

  // Creamos la barra de búsqueda por texto
  const barraBusqueda = document.createElement("div");
  barraBusqueda.className = "search-bar";

  // Creamos la barra de categorías (se llena sola con las categorías del JSON)
  const barraCategorias = document.createElement("div");
  barraCategorias.className = "category-bar";

  // Insertamos el contador y los filtros justo arriba del contenedor de productos
  contenedor.parentNode.insertBefore(contadorElemento, contenedor);
  contenedor.parentNode.insertBefore(barraBusqueda, contenedor);
  contenedor.parentNode.insertBefore(barraFiltros, contenedor);
  contenedor.parentNode.insertBefore(barraCategorias, contenedor);

  let todosLosProductos = [];
  let filtroActivo = "todos";
  let categoriaActiva = "todas";
  let textoBusqueda = "";

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
      .map((segment, index) =>
        index === segments.length - 1 ? slugifySegment(segment) : segment,
      )
      .join("/");
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function esPrecioEnDolares(priceValue) {
    return /u\$s|u\$d|usd|d[oó]lar/i.test(String(priceValue || ""));
  }

  function parsePriceToNumber(priceValue) {
    if (typeof priceValue === "number") return priceValue;
    if (!priceValue) return 0;

    const numero = Number(String(priceValue).replace(/[^\d]/g, "")) || 0;

    // Si el precio está en dólares (ej: "U$S 380"), lo convertimos a pesos
    // solo para poder compararlo/ordenarlo con el resto del catálogo.
    return esPrecioEnDolares(priceValue)
      ? numero * cotizacionDolarBlue
      : numero;
  }

  function isSoldProduct(producto) {
    return producto.vendido === true || producto.estado === "vendido";
  }

  function isRecentProduct(producto) {
    if (!producto.nuevo) return false;

    const fechaProducto = new Date(producto.nuevo).getTime();
    if (Number.isNaN(fechaProducto)) return false;

    const fechaActual = new Date().getTime();
    const diasDiferencia =
      (fechaActual - fechaProducto) / (1000 * 60 * 60 * 24);
    return diasDiferencia >= 0 && diasDiferencia <= NEW_PRODUCT_DAYS;
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
      imagePath,
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

    // Si hay una categoría seleccionada, lo aclaramos en el contador
    if (categoriaActiva !== "todas") {
      contadorElemento.textContent += ` · ${categoriaActiva}`;
    }

    if (textoBusqueda) {
      contadorElemento.textContent += ` · Busqueda: ${textoBusqueda}`;
    }

    productosFiltrados.forEach((producto) => {
      const card = document.createElement("article");
      const isSold = isSoldProduct(producto);
      card.className = isSold ? "card card-sold" : "card";

      const precioSugeridoHtml = producto.precioSugerido
        ? `<span class="suggested-price">${producto.precioSugerido}</span>`
        : ``;

      const fechaHtml = producto.fecha
        ? `<p class="date">📅 ${producto.fecha}</p>`
        : ``;

      const esReciente = isRecentProduct(producto);

      // Etiqueta visual "NUEVO" (solo si es reciente y NO está vendido)
      const badgeNuevo =
        esReciente && !isSold ? `<span class="new-badge">¡NUEVO!</span>` : ``;

      const telefono = "5491153133329";
      const mensaje = encodeURIComponent(
        `Hola, me interesa tu publicación: ${producto.titulo} a ${producto.precioVenta}.`,
      );
      const linkWhatsapp = `https://wa.me/${telefono}?text=${mensaje}`;

      const imagenes = buildImageSources(producto.imagen);
      const encodedFallbacks = encodeURIComponent(JSON.stringify(imagenes));

      card.innerHTML = `
                <div class="image-wrapper">
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
                    ${
                      isSold
                        ? '<span class="btn-whatsapp btn-disabled">Vendido</span>'
                        : `<a href="${linkWhatsapp}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">Consultar</a>`
                    }
                </div>
            `;

      const img = card.querySelector("img");
      const fallbacks = JSON.parse(
        decodeURIComponent(img.dataset.fallbacks || "[]"),
      );
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
      { id: "disponibles", texto: "🏷️ Disponibles (Sin Vender)" },
    ];

    barraFiltros.innerHTML = "";

    botones.forEach((btn) => {
      const boton = document.createElement("button");
      boton.textContent = btn.texto;
      boton.className = "filter-btn";

      // Resaltado del botón activo
      if (filtroActivo === btn.id) {
        boton.classList.add("is-active");
      }

      boton.addEventListener("click", () => {
        filtroActivo = btn.id;
        crearBotonesFiltros(); // Redibujar botones para actualizar el estado activo
        aplicarFiltros();
      });

      barraFiltros.appendChild(boton);
    });
  }

  function crearBuscador() {
    barraBusqueda.innerHTML = "";

    const input = document.createElement("input");
    input.type = "search";
    input.className = "search-input";
    input.placeholder = "Buscar por nombre, categoria o descripcion";
    input.setAttribute("aria-label", "Buscar productos");
    input.value = textoBusqueda;

    input.addEventListener("input", () => {
      textoBusqueda = input.value;
      aplicarFiltros();
    });

    barraBusqueda.appendChild(input);
  }

  // Aplica AMBOS filtros a la vez: estado (todos/nuevos/disponibles) + categoría
  function aplicarFiltros() {
    let productosFiltrados = [...todosLosProductos];

    if (filtroActivo === "nuevos") {
      productosFiltrados = productosFiltrados.filter(
        (p) => isRecentProduct(p) && !isSoldProduct(p),
      );
    } else if (filtroActivo === "disponibles") {
      productosFiltrados = productosFiltrados.filter((p) => !isSoldProduct(p));
    }

    if (categoriaActiva !== "todas") {
      productosFiltrados = productosFiltrados.filter(
        (p) => (p.categoria || "") === categoriaActiva,
      );
    }

    if (textoBusqueda.trim() !== "") {
      const termino = normalizeText(textoBusqueda);
      productosFiltrados = productosFiltrados.filter((producto) => {
        const textoCatalogo = normalizeText(
          [
            producto.titulo,
            producto.descripcion,
            producto.categoria,
            producto.precioVenta,
            producto.precioSugerido,
          ].join(" "),
        );

        return textoCatalogo.includes(termino);
      });
    }

    renderizarProductos(productosFiltrados);
  }

  // Crea el dropdown de categorías a partir de las categorías presentes en el JSON
  function crearBotonesCategorias() {
    // Sacamos las categorías únicas y las ordenamos alfabéticamente
    const categorias = unique(todosLosProductos.map((p) => p.categoria)).sort(
      (a, b) => a.localeCompare(b, "es"),
    );

    barraCategorias.innerHTML = "";

    const etiqueta = document.createElement("label");
    etiqueta.textContent = "Categoría:";
    etiqueta.htmlFor = "select-categoria";
    etiqueta.className = "category-label";

    const select = document.createElement("select");
    select.id = "select-categoria";
    select.className = "category-select";

    // Opción inicial + una opción por cada categoría
    const opciones = [{ id: "todas", texto: "Todas las categorías" }].concat(
      categorias.map((c) => ({ id: c, texto: c })),
    );

    opciones.forEach((opcion) => {
      const option = document.createElement("option");
      option.value = opcion.id;
      option.textContent = opcion.texto;
      if (categoriaActiva === opcion.id) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      categoriaActiva = select.value;
      aplicarFiltros();
    });

    barraCategorias.appendChild(etiqueta);
    barraCategorias.appendChild(select);
  }

  // Pedimos la cotización y el catálogo EN PARALELO, pero esperamos a tener
  // ambos antes de ordenar (el orden depende de la cotización).
  Promise.all([
    obtenerCotizacionDolar(),
    fetch("productos.json").then((respuesta) => respuesta.json()),
  ])
    .then(([, productos]) => {
      // Orden recomendado:
      // 1) Disponibles arriba y vendidos al final
      // 2) Precio de venta mas alto
      productos.sort((a, b) => {
        const aVendido = isSoldProduct(a);
        const bVendido = isSoldProduct(b);
        if (aVendido !== bVendido) return aVendido ? 1 : -1;

        const aPrecio = parsePriceToNumber(a.precioVenta);
        const bPrecio = parsePriceToNumber(b.precioVenta);
        if (aPrecio !== bPrecio) return bPrecio - aPrecio;

        return Number(b.id || 0) - Number(a.id || 0);
      });

      todosLosProductos = productos;

      // Inicializar interfaz
      crearBuscador();
      crearBotonesFiltros();
      crearBotonesCategorias();
      renderizarProductos(todosLosProductos);
    })
    .catch((error) => {
      console.error("Error cargando el catálogo:", error);
      contenedor.innerHTML =
        "<p class='error-message'>Hubo un problema al cargar los artículos. Por favor, recarga la página.</p>";
    });
});
