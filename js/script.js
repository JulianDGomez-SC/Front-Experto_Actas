// --- CONFIGURACIÓN OPTIMIZADA ---
// Al estar vinculado en el Portal de Azure, usamos la ruta relativa
const API_URL = "/api";
let chatHistory = [];

window.onload = function () {
    console.log("Sistema SierraCol listo. Backend vinculado y seguro.");
};

function redirigirALogin() {
    // Usamos la ruta nativa de la SWA para el login
    // Esto evita que el botón 'Return to website' falle
    window.location.href = "/.auth/login/aad?post_login_redirect_uri=/";
}

// --- SUBIDA DE ARCHIVOS ---
async function subir() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return alert("Selecciona un archivo primero.");

    const statusDiv = document.getElementById('statusUpload');
    statusDiv.innerText = "⏳ Procesando en Azure Intelligence...";
    statusDiv.style.color = "blue";

    const formData = new FormData();
    formData.append("file_transcripcion", file);
    formData.append("file_presentacion", file);

    try {
        // El fetch ahora es mucho más simple y seguro
        const res = await fetch(`${API_URL}/automatizacion/generar-acta-comite-dual`, {
            method: 'POST',
            body: formData
        });

        if (res.status === 401) return redirigirALogin();
        if (!res.ok) throw new Error("Fallo en la extracción de datos.");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Acta_SierraCol_${new Date().getTime()}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        statusDiv.innerText = "✅ Acta generada exitosamente.";
        statusDiv.style.color = "green";
    } catch (e) {
        statusDiv.innerText = "❌ Error: Sesión expirada o problema en el servidor.";
        statusDiv.style.color = "red";
    }
}

// --- CHAT ESTRATÉGICO ---
async function preguntar() {
    const input = document.getElementById('pregunta');
    const texto = input.value.trim();
    if (!texto) return;

    addMessage("user", texto);
    input.value = "";
    const loading = document.getElementById('loadingChat');
    loading.style.display = 'block';

    try {
        console.log("Enviando pregunta:", texto); // 1. Log para depurar

        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: texto })
        });

        console.log("Status respuesta:", res.status); // 2. Ver status

        if (res.status === 401) return redirigirALogin();

        if (!res.ok) {
            // Si el backend falla, leemos el error real
            const errorText = await res.text();
            throw new Error(`Error del servidor (${res.status}): ${errorText}`);
        }

        const data = await res.json();
        console.log("Datos recibidos:", data); // 3. Ver qué llegó realmente

        // Visualizar respuesta
        let textoCrudo = data.respuesta || "Sin respuesta";

        // 1. Convertir negritas (**texto**) a HTML (<strong>texto</strong>)
        let respuestaHTML = textoCrudo.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 2. Convertir saltos de línea a <br>
        respuestaHTML = respuestaHTML.replace(/\n/g, "<br>");

        // Agregar fuentes si existen
        if (data.fuentes && data.fuentes.length > 0) {
            respuestaHTML += `<div class="sources"><strong>📚 Fuentes consultadas:</strong>`;
            data.fuentes.forEach(f => {
                // Creamos un link seguro al blob
                respuestaHTML += `
                    <div class="source-item">
                        <span>📄 ${f.nombre}</span>
                        <a href="${f.link}" target="_blank" class="download-link">Ver Documento</a>
                    </div>`;
            });
            respuestaHTML += `</div>`;
        }

        addMessage("assistant", respuestaHTML, true);

    } catch (e) {
        console.error("Error en el chat:", e); // ¡Aquí veremos el error real en la consola!
        addMessage("assistant", `⚠️ Ocurrió un error al procesar la respuesta: ${e.message}`);
    } finally {
        loading.style.display = 'none';
    }
}

function addMessage(role, text, isHTML = false) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    // Usamos innerHTML con cuidado
    if (isHTML) div.innerHTML = text;
    else div.textContent = text;

    const chatWindow = document.getElementById('chat-window');
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}