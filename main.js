document.addEventListener("DOMContentLoaded", () => {
    inyectarHeaderYFooter();

    const rastro = window.location.pathname;

    if (rastro.includes("admin.html")) {
        inicializarPanelAdmin();
    } else if (rastro.includes("categoria.html")) {
        inicializarPlantillaCategoria();
    } else if (rastro.includes("producto.html")) {
        inicializarPlantillaProducto();
    } else if (rastro.includes("alquiler.html")) {
        inicializarPlantillaAlquiler();
    } else if (rastro.includes("productos.html")) {
        inicializarPaginaProductos();
    }
    
    // Control de enlaces activos en base a la ruta actual
    if (rastro.includes("nosotros.html")) {
        document.getElementById("nav-nosotros")?.classList.add("active");
    }
    if (rastro.includes("servicios.html")) {
        document.getElementById("nav-servicios")?.classList.add("active");
    }
    if (rastro.includes("alquiler.html")) {
        document.getElementById("nav-alquiler")?.classList.add("active");
    }
    if (rastro.includes("contacto.html")) {
    document.getElementById("nav-contacto")?.classList.add("active");
    }
});

// ==========================================================================
// A. INYECTOR DINÁMICO DE TEMPLATES (HEADER Y FOOTER)
// ==========================================================================
function inyectarHeaderYFooter() {
    const headerContainer = document.getElementById("global-header");
    if (headerContainer) {
        fetch("header.html")
            .then(res => res.text())
            .then(data => {
                headerContainer.innerHTML = data;
                
                // 1. Obtenemos el nombre del archivo actual limpio
                let currentPage = window.location.pathname.split("/").pop();
                if (currentPage === "" || currentPage === "/") {
                    currentPage = "index.html";
                }

                // 2. Motor dinámico: recorre TODOS los enlaces del menú y activa el correcto
                const navLinks = headerContainer.querySelectorAll('.nav-links a');
                navLinks.forEach(link => {
                    const linkPage = link.getAttribute('href');
                    if (linkPage === currentPage) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });

                // 3. Excepción inteligente para el catálogo
                // Si estamos dentro de una subcategoría o ficha de producto que NO está en el menú principal,
                // forzamos a que la pestaña "Productos" se quede encendida.
                if (currentPage.includes("categoria") || currentPage.includes("producto") || currentPage.includes("reck-motomed")) {
                    document.getElementById("nav-productos")?.classList.add("active");
                }
                
                // 4. Forzar sincronización si el usuario ya estaba logueado en Admin
                if (currentPage.includes("admin.html") && sessionStorage.getItem("orto_admin_logged") !== "true") {
                    headerContainer.classList.add("hidden");
                } else if (currentPage.includes("admin.html")) {
                    headerContainer.classList.remove("hidden");
                }
                
                // 👉 INICIAMOS EL BUSCADOR JUSTO AQUÍ
                configurarBuscador();
                
            }).catch(err => console.error("Error al cargar cabecera:", err));
    }
    const footerContainer = document.getElementById("global-footer");
    if (footerContainer) {
        fetch("footer.html")
            .then(res => res.text())
            .then(data => { 
                footerContainer.innerHTML = data; 
                
                // Sincronizar visibilidad inicial si estamos en el panel de gestión
                const rastro = window.location.pathname;
                if (rastro.includes("admin.html") && sessionStorage.getItem("orto_admin_logged") !== "true") {
                    footerContainer.classList.add("hidden");
                } else if (rastro.includes("admin.html")) {
                    footerContainer.classList.remove("hidden");
                }
            })
            .catch(err => console.error("Error al cargar pie:", err));
    }
}

// ==========================================================================
// B. LÓGICA DEL PANEL DE ADMINISTRACIÓN (ADMIN.HTML)
// ==========================================================================
let editandoId = null; // Guardará el ID del producto que estemos modificando

function inicializarPanelAdmin() {
    const USUARIO_VALIDO = "admin";
    const PASSWORD_VALIDA = "Laguna2026";

    const loginBox = document.getElementById("admin-login-box");
    const adminContent = document.getElementById("admin-content");
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");
    const btnLogout = document.getElementById("btn-logout");

    const form = document.getElementById("product-form");
    const btnCancel = document.getElementById("btn-cancel");
    const formTitle = document.getElementById("form-title");
    const accordionContainer = document.getElementById("admin-inventory-accordion");
    const searchInput = document.getElementById("admin-search-input");

    let editandoId = null;

    const traduccionCategorias = {
        aseo: { t: "Aseo y Baño", icon: "fa-shower" },
        movilidad: { t: "Movilidad", icon: "fa-wheelchair" },
        descanso: { t: "Sistemas de Descanso", icon: "fa-bed" },
        "vida-diaria": { t: "Vida Diaria", icon: "fa-kit-medical" },
        sujecciones: { t: "Sujecciones", icon: "fa-user-shield" },
        antiescaras: { t: "Productos Antiescara", icon: "fa-heart-pulse" },
        gruas: { t: "Grúas y Transferencias", icon: "fa-hands-holding" },
        motomed: { t: "RECK MOTOmed", icon: "fa-person-biking" }
    };

    // Declarar renderTable de forma segura antes de usarla
    const renderTable = () => {
        if (!accordionContainer) return;
        const productos = JSON.parse(localStorage.getItem("orto_productos")) || [];
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        
        accordionContainer.innerHTML = "";
        
        if (productos.length === 0) {
            accordionContainer.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:20px; font-size:14px;">No hay productos en el catálogo. ¡Añade el primero!</p>`;
            return;
        }

        const productosFiltrados = productos.filter(prod => {
            return (prod.name && prod.name.toLowerCase().includes(query)) || 
                   (prod.subcategory && prod.subcategory.toLowerCase().includes(query)) ||
                   (prod.category && prod.category.toLowerCase().includes(query));
        });

        if (productosFiltrados.length === 0) {
            accordionContainer.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:20px; font-size:14px;">No se encontraron artículos que coincidan con la búsqueda.</p>`;
            return;
        }

        const categoriasAgrupadas = {};
        productosFiltrados.forEach(prod => {
            if (!prod.category) return;
            if (!categoriasAgrupadas[prod.category]) {
                categoriasAgrupadas[prod.category] = [];
            }
            categoriasAgrupadas[prod.category].push(prod);
        });

        for (const catKey in categoriasAgrupadas) {
            const listaProductos = categoriasAgrupadas[catKey];
            const infoCat = traduccionCategorias[catKey] || { t: catKey, icon: "fa-box" };

            const block = document.createElement("div");
            block.className = "accordion-block";
            if (query !== "") {
                block.classList.add("open");
            }

            block.innerHTML = `
                <div class="accordion-trigger" onclick="this.parentElement.classList.toggle('open')">
                    <div class="accordion-title-content">
                        <i class="fa-solid ${infoCat.icon}"></i>
                        <span>${infoCat.t}</span>
                        <span class="product-count-badge">${listaProductos.length}</span>
                    </div>
                    <i class="fa-solid fa-chevron-down accordion-arrow"></i>
                </div>
                <div class="accordion-content">
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Vista</th>
                                    <th>Nombre</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="body-cat-${catKey}"></tbody>
                        </table>
                    </div>
                </div>
            `;
            accordionContainer.appendChild(block);

            const tbody = document.getElementById(`body-cat-${catKey}`);
            if (tbody) {
                listaProductos.forEach(prod => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><img src="${prod.img || ''}" alt="" style="width:40px; height:40px; object-fit:contain; background:#fafafa; border:1px solid #edf2f7; border-radius:4px;"></td>
                        <td><strong>${prod.name || 'Sin nombre'}</strong><small style="display:block; font-size:11px; color:#64748b; margin-top:2px;">${prod.subcategory || ''}</small></td>
                        <td>
                            <div style="display:flex; gap:6px;">
                                <button class="btn-action edit" onclick="prepararEdicion('${prod.id}')" style="background:#fef3c7; color:#d97706; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:12px;"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn-action delete" onclick="eliminarProducto('${prod.id}')" style="background:#fee2e2; color:#dc2626; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:12px;"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
    };

    // 1. COMPROBACIÓN DE SESIÓN AL CARGAR
    if (sessionStorage.getItem("orto_admin_logged") === "true") {
        if (loginBox) loginBox.classList.add("hidden");
        if (adminContent) adminContent.classList.remove("hidden");
        renderTable();
    } else {
        if (loginBox) loginBox.classList.remove("hidden");
        if (adminContent) adminContent.classList.add("hidden");
    }

    // 2. EVENTO DE LOGIN (Asegurado)
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const userInput = document.getElementById("login-user")?.value.trim() || "";
            const passInput = document.getElementById("login-pass")?.value.trim() || "";

            if (userInput === USUARIO_VALIDO && passInput === PASSWORD_VALIDA) {
                sessionStorage.setItem("orto_admin_logged", "true");
                if (loginError) loginError.style.display = "none";
                loginForm.reset();
                
                if (loginBox) loginBox.classList.add("hidden");
                if (adminContent) adminContent.classList.remove("hidden");
                renderTable();
            } else {
                if (loginError) loginError.style.display = "block";
            }
        });
    }

    // 3. LOGOUT
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            sessionStorage.removeItem("orto_admin_logged");
            if (adminContent) adminContent.classList.add("hidden");
            if (loginBox) loginBox.classList.remove("hidden");
        });
    }

    // 4. BUSCADOR EN TIEMPO REAL
    if (searchInput) {
        searchInput.addEventListener("input", renderTable);
    }

    // 5. GUARDAR / EDITAR PRODUCTO
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const productos = JSON.parse(localStorage.getItem("orto_productos")) || [];

            const nuevoProducto = {
                id: editandoId || "prod_" + Date.now(),
                name: document.getElementById("prod-name")?.value || "",
                category: document.getElementById("prod-category")?.value || "",
                subcategory: document.getElementById("prod-subcategory")?.value || "",
                isRental: document.getElementById("prod-is-rental")?.checked || false,
                desc: document.getElementById("prod-desc")?.value || "",
                img: document.getElementById("prod-img")?.value || "",
                gallery: document.getElementById("prod-gallery")?.value || "",
                video: document.getElementById("prod-video")?.value || "",
                features: document.getElementById("prod-features")?.value || "",
                specsTable: document.getElementById("prod-specs-table")?.value || "",
                referencia: document.getElementById('producto-ref')?.value || ''
            };

            if (editandoId) {
                const index = productos.findIndex(p => p.id === editandoId);
                if (index !== -1) productos[index] = nuevoProducto;
                editandoId = null;
                if (formTitle) formTitle.innerText = "Añadir Nuevo Producto";
                if (btnCancel) btnCancel.classList.add("hidden");
            } else {
                productos.push(nuevoProducto);
            }

            localStorage.setItem("orto_productos", JSON.stringify(productos));
            form.reset();
            renderTable();
        });
    }

    if (btnCancel) {
        btnCancel.addEventListener("click", () => {
            editandoId = null;
            if (form) form.reset();
            if (formTitle) formTitle.innerText = "Añadir Nuevo Producto";
            btnCancel.classList.add("hidden");
        });
    }

    window.eliminarProducto = (id) => {
        if(confirm("¿Seguro que deseas eliminar este producto?")) {
            let productos = JSON.parse(localStorage.getItem("orto_productos")) || [];
            productos = productos.filter(p => p.id !== id);
            localStorage.setItem("orto_productos", JSON.stringify(productos));
            renderTable();
        }
    };

    window.prepararEdicion = (id) => {
        const productos = JSON.parse(localStorage.getItem("orto_productos")) || [];
        const prod = productos.find(p => p.id === id);
        if (!prod) return;

        editandoId = prod.id;
        if (formTitle) formTitle.innerText = "Modificando: " + prod.name;
        if (btnCancel) btnCancel.classList.remove("hidden");

        const setVal = (elId, val) => {
            const el = document.getElementById(elId);
            if (el) el.value = val;
        };

        setVal("prod-name", prod.name);
        setVal("prod-category", prod.category);
        setVal("prod-subcategory", prod.subcategory);
        setVal("prod-desc", prod.desc);
        setVal("prod-img", prod.img);
        setVal("prod-gallery", prod.gallery || "");
        setVal("prod-video", prod.video || "");
        setVal("prod-features", prod.features || "");
        setVal("prod-specs-table", prod.specsTable || "");
        setVal("producto-ref", prod.referencia || "");
        
        const rentalEl = document.getElementById("prod-is-rental");
        if (rentalEl) rentalEl.checked = prod.isRental || false;
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

// ==========================================================================
// C. MOTOR DINÁMICO DE LA CATEGORÍA (CATEGORIA.HTML)
// ==========================================================================
function inicializarPlantillaCategoria() {
    const params = new URLSearchParams(window.location.search);
    const catId = params.get("id");
    if (!catId) return;

    const nombresCat = {
        aseo: { t: "Aseo y Baño", icon: "fa-shower", d: "Soluciones ergonómicas para la higiene diaria con seguridad." },
        movilidad: { t: "Movilidad", icon: "fa-wheelchair", d: "Sillas de ruedas, andadores y scooters de alta autonomía." },
        descanso: { t: "Sistemas de Descanso", icon: "fa-bed", d: "Camas articuladas eléctricas y colchones sanitarios avanzados." },
        "vida-diaria": { t: "Vida Diaria", icon: "fa-kit-medical", d: "Ayudas técnicas avanzadas para las tareas del hogar." },
        sujecciones: { t: "Sujecciones", icon: "fa-user-shield", d: "Sistemas de protección y arneses de máxima seguridad." },
        antiescaras: { t: "Productos Antiescara", icon: "fa-heart-pulse", d: "Cojines y colchones preventivos de flotación líquida o aire." },
        gruas: { t: "Grúas y Transferencias", icon: "fa-hands-holding", d: "Grúas de elevación domiciliaria y tablas de traslado asistido." },
        motomed: { t: "RECK MOTOmed", icon: "fa-person-biking", d: "Sistemas motorizados de cinesiterapia activa y pasiva." }
    };

    const infoActual = nombresCat[catId] || { t: catId, icon: "fa-box", d: "Catálogo de productos." };

    document.getElementById("category-title").innerHTML = `<i class="fa-solid ${infoActual.icon}"></i> Productos de ${infoActual.t}`;
    document.getElementById("category-subtitle").innerText = infoActual.d;

    const todosProductos = JSON.parse(localStorage.getItem("orto_productos")) || [];
    const filtrados = todosProductos.filter(p => p.category === catId);
    const container = document.getElementById("dynamic-subcategories-container");
    container.innerHTML = "";

    if (filtrados.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#64748b; padding:40px 0;">Actualmente no hay productos registrados en esta sección.</p>`;
        return;
    }

    const grupos = {};
    filtrados.forEach(prod => {
        if (!grupos[prod.subcategory]) grupos[prod.subcategory] = [];
        grupos[prod.subcategory].push(prod);
    });

    for (const subcat in grupos) {
        const section = document.createElement("div");
        section.className = "sub-category-section";
        
        section.innerHTML = `
            <h2 class="sub-category-title"><i class="fa-solid fa-tags"></i> ${subcat}</h2>
            <div class="specific-products-grid" id="grid-${subcat.replace(/\s+/g, '')}"></div>
        `;
        container.appendChild(section);

        const grid = document.getElementById(`grid-${subcat.replace(/\s+/g, '')}`);
        
        grupos[subcat].forEach(p => {
            const card = document.createElement("article");
            card.className = "specific-product-card";
            card.innerHTML = `
                <div class="specific-product-image">
                    <img src="${p.img}" alt="${p.name}">
                </div>
                <div class="specific-product-info">
                    <h3>${p.name}</h3>
                    <p class="product-description">${p.desc.substring(0, 95)}...</p>
                    
                    <a href="producto.html?id=${p.id}" class="btn-view-more">
                        Descúbrelo <i class="fa-solid fa-arrow-right" style="font-size: 11px; margin-left: 5px;"></i>
                    </a>
                </div>
            `;
            grid.appendChild(card);
        });
    }
}

// ==========================================================================
// D. MOTOR DINÁMICO DE LA FICHA DETALLE (PRODUCTO.HTML)
// ==========================================================================
function inicializarPlantillaProducto() {
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get("id");
    if (!prodId) return;

    const todosProductos = JSON.parse(localStorage.getItem("orto_productos")) || [];
    const prod = todosProductos.find(p => p.id === prodId);
    if (!prod) return;

    document.title = prod.name + " - Ortopedia Laguna";
    document.getElementById("detail-name").innerText = prod.name;
    document.getElementById("detail-desc").innerText = prod.desc;
    document.getElementById("detail-subcategory").innerText = prod.subcategory;
    document.getElementById("detail-category-badge").innerText = prod.category;
    
    document.getElementById("btn-back-category").href = `categoria.html?id=${prod.category}`;

    const imgElement = document.getElementById("detail-img");
    imgElement.src = prod.img;
    imgElement.alt = prod.name;

    const thumbContainer = document.getElementById("detail-thumbnails-container");
    thumbContainer.innerHTML = "";
    
    const mainThumb = document.createElement("img");
    mainThumb.src = prod.img;
    mainThumb.className = "thumb-item active";
    mainThumb.onclick = () => cambiarImagenPrincipal(prod.img, mainThumb);
    thumbContainer.appendChild(mainThumb);

    if (prod.gallery) {
        const fotos = prod.gallery.split(",");
        fotos.forEach(url => {
            const img = document.createElement("img");
            img.src = url.trim();
            img.className = "thumb-item";
            img.onclick = () => cambiarImagenPrincipal(url.trim(), img);
            thumbContainer.appendChild(img);
        });
    }

    function cambiarImagenPrincipal(url, elementoClicado) {
        document.getElementById("detail-img").src = url;
        document.querySelectorAll(".thumb-item").forEach(t => t.classList.remove("active"));
        elementoClicado.classList.add("active");
    }

    const videoContainer = document.getElementById("detail-video-container");
    if (prod.video && (prod.video.includes("youtube.com") || prod.video.includes("youtu.be"))) {
        let videoId = "";
        if (prod.video.includes("v=")) {
            videoId = prod.video.split("v=")[1].split("&")[0];
        } else {
            videoId = prod.video.split("/").pop();
        }
        videoContainer.style.display = "block";
        videoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`;
    } else {
        videoContainer.style.display = "none";
    }

    const featuresWrapper = document.getElementById("detail-features-wrapper");
    const featuresList = document.getElementById("detail-features-list");
    featuresList.innerHTML = "";
    
    if (prod.features && prod.features.trim() !== "") {
        featuresWrapper.style.display = "block";
        const ventajas = prod.features.split(",");
        ventajas.forEach(v => {
            if (v.trim() !== "") {
                const li = document.createElement("li");
                li.innerHTML = `<i class="fa-solid fa-check"></i> <span>${v.trim()}</span>`;
                featuresList.appendChild(li);
            }
        });
    } else {
        featuresWrapper.style.display = "none";
    }

    const tableBody = document.getElementById("detail-specs-table-body");
    tableBody.innerHTML = "";
    if (prod.specsTable) {
        const filas = prod.specsTable.split(",");
        filas.forEach(fila => {
            if (fila.includes("=")) {
                const partes = fila.split("=");
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${partes[0].trim()}</strong></td>
                    <td>${partes[1].trim()}</td>
                `;
                tableBody.appendChild(tr);
            }
        });
    } else {
        document.querySelector(".product-extra-info-section").style.display = "none";
    }
    // 1. Comprobamos si le pusiste referencia manual en el panel. Si no, usamos el ID por defecto.
            const refFinal = prod.referencia ? prod.referencia : prod.id;

            // 2. Armamos el mensaje con tu código de tienda física
            const mensajeWA = `Hola, estoy interesado en recibir más información sobre el producto: ${prod.name} (Ref: ${refFinal})`;

            // 3. Seleccionamos el botón
            const btnWhatsApp = document.getElementById("detail-whatsapp-btn");

            // 4. Le inyectamos el enlace y forzamos que se abra en una pestaña nueva
            btnWhatsApp.href = `https://wa.me/34922254884?text=${encodeURIComponent(mensajeWA)}`;
            btnWhatsApp.setAttribute("target", "_blank");
}

// ==========================================================================
// E. MOTOR DINÁMICO DE ALQUILER (ALQUILER.HTML)
// ==========================================================================
function inicializarPlantillaAlquiler() {
    const todosProductos = JSON.parse(localStorage.getItem("orto_productos")) || [];
    const productosAlquiler = todosProductos.filter(p => p.isRental === true);
    
    const sectionWrapper = document.getElementById("rental-specific-section");
    const container = document.getElementById("dynamic-rental-specific-grid");
    
    if (!container || !sectionWrapper) return;

    // Si no hay productos marcados de alquiler, colapsamos el módulo entero
    if (productosAlquiler.length === 0) {
        sectionWrapper.style.display = "none";
        return; 
    }

    sectionWrapper.style.display = "block";
    container.innerHTML = "";

    productosAlquiler.forEach(p => {
        const article = document.createElement("article");
        article.className = "rental-card-box specific-box";
        article.innerHTML = `
            <div class="rental-img-wrapper">
                <img src="${p.img}" alt="${p.name}">
            </div>
            <a href="producto.html?id=${p.id}" class="rental-specific-link">${p.name}</a>
            <a href="producto.html?id=${p.id}" class="btn-rental-discover">¡Descúbrelo!</a>
        `;
        container.appendChild(article);
    });

    const logoArticle = document.createElement("article");
    logoArticle.className = "rental-card-box specific-box logo-box";
    logoArticle.innerHTML = `
        <div class="rental-img-wrapper default-logo">
            <img src="img/logo-laguna.png" alt="Ortopedia Laguna">
        </div>
    `;
    container.appendChild(logoArticle);
}

// ==========================================================================
// F. MOTOR DEL BUSCADOR Y PÁGINA DE PRODUCTOS
// ==========================================================================S
function configurarBuscador() {
    const formBuscador = document.querySelector('.search-bar form');
    const inputBuscador = document.querySelector('.search-bar input');
    const btnBuscador = document.querySelector('.search-bar button');

    if (!formBuscador || !inputBuscador || !btnBuscador) return;

    const ejecutarBusqueda = () => {
        const termino = inputBuscador.value.trim().toLowerCase();
        if (termino.length > 0) {
            window.location.href = `productos.html?buscar=${encodeURIComponent(termino)}`;
        }
    };

    // 1. Controlar el clic en la lupa en móviles
    btnBuscador.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!formBuscador.classList.contains('open')) {
                // Si la caja está cerrada, evitamos que busque y la abrimos
                e.preventDefault();
                formBuscador.classList.add('open');
                inputBuscador.focus(); // Despliega el teclado en el móvil
            } else if (inputBuscador.value.trim() === "") {
                // Si está abierta pero vacía y le vuelven a dar, la cerramos
                e.preventDefault();
                formBuscador.classList.remove('open');
            }
            // Si está abierta y tiene texto escrito, dejará que busque normalmente
        }
    });

    // 2. Ejecutar la búsqueda al pulsar Intro o enviar el formulario
    formBuscador.addEventListener('submit', function(e) {
        e.preventDefault();
        ejecutarBusqueda();
    });

    // 3. Cerrar el buscador si el usuario toca cualquier parte fuera de él
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && formBuscador.classList.contains('open')) {
            if (!formBuscador.contains(e.target)) {
                formBuscador.classList.remove('open');
            }
        }
    });
}
function inicializarPaginaProductos() {
    const params = new URLSearchParams(window.location.search);
    const busqueda = params.get("buscar");

    // Si no hay búsqueda, dejamos que la página cargue su catálogo normal
    if (!busqueda) return;

    // Buscamos la etiqueta <main> (que envuelve todo el contenido)
    const mainContainer = document.querySelector("main");
    if (!mainContainer) return;

    const todosProductos = JSON.parse(localStorage.getItem("orto_productos")) || [];
    const termino = busqueda.toLowerCase().trim();

    // Filtramos
    const filtrados = todosProductos.filter(p => 
        (p.name && p.name.toLowerCase().includes(termino)) ||
        (p.desc && p.desc.toLowerCase().includes(termino)) ||
        (p.category && p.category.toLowerCase().includes(termino)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(termino)) ||
        (p.referencia && p.referencia.toLowerCase().includes(termino))
    );

    // 🔴 LA CLAVE: Borramos todo lo que haya en el main para evitar choques de CSS
    mainContainer.innerHTML = `
        <div class="category-header">
            <div class="category-header-content">
                <h1 id="category-title"><i class="fa-solid fa-magnifying-glass"></i> Resultados de búsqueda</h1>
                <p id="category-subtitle">Buscando: "${busqueda}"</p>
            </div>
        </div>
        <div class="container" id="search-results-container" style="padding: 40px 20px;">
        </div>
    `;

    const resultsContainer = document.getElementById("search-results-container");

    // Si no hay resultados
    if (filtrados.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; background: var(--light-bg, #f8f9fa); border-radius: 8px;">
                <i class="fa-solid fa-box-open" style="font-size: 48px; color: #94a3b8; margin-bottom: 15px;"></i>
                <h2 style="color: #334155; margin-bottom: 10px;">No se encontraron resultados</h2>
                <p style="color: #64748b; margin-bottom: 25px;">No hay productos que coincidan con "${busqueda}".</p>
                <a href="productos.html" style="display:inline-block; padding:10px 22px; background:var(--primary-blue, #0056b3); color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Volver al catálogo</a>
            </div>
        `;
        return;
    }

    // Si hay resultados, inyectamos la cuadrícula de productos específicos
    resultsContainer.innerHTML = `
        <div class="sub-category-section">
            <div class="specific-products-grid" id="search-results-grid"></div>
        </div>
    `;

    const grid = document.getElementById("search-results-grid");

    filtrados.forEach(p => {
        const card = document.createElement("article");
        card.className = "specific-product-card";
        card.innerHTML = `
            <div class="specific-product-image">
                <img src="${p.img}" alt="${p.name}">
            </div>
            <div class="specific-product-info">
                <h3>${p.name}</h3>
                <p class="product-description">${p.desc ? (p.desc.length > 95 ? p.desc.substring(0, 95) + '...' : p.desc) : ''}</p>
                <a href="producto.html?id=${p.id}" class="btn-view-more">
                    Descúbrelo <i class="fa-solid fa-arrow-right" style="font-size: 11px; margin-left: 5px;"></i>
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- LÓGICA DEL FORMULARIO DE CONTACTO A WHATSAPP ---
document.addEventListener("DOMContentLoaded", () => {
    const whatsappForm = document.getElementById("whatsapp-form");
    
    if (whatsappForm) {
        whatsappForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Recoger los valores de los inputs
            const nombre = document.getElementById("nombre").value.trim();
            const telefono = document.getElementById("telefono").value.trim();
            const asunto = document.getElementById("asunto").value;
            const mensaje = document.getElementById("mensaje").value.trim();
            
            // TU NÚMERO DE WHATSAPP OFICIAL (Cámbialo si es necesario)
            const numeroWhatsApp = "34689746209"; // Incluye el 34 de España sin espacios ni símbolos
            
            // Construir el texto formateado
            const textoMensaje = `Hola Ortopedia Laguna,%0A%0A` +
                                 `*Nueva consulta web:*%0A` +
                                 `- *Nombre:* ${nombre}%0A` +
                                 `- *Teléfono:* ${telefono}%0A` +
                                 `- *Motivo:* ${asunto}%0A` +
                                 `- *Mensaje:* ${mensaje}`;
            
            // Abrir la URL de WhatsApp
            const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${textoMensaje}`;
            window.open(urlWhatsApp, "_blank");
        });
    }
});