// --- CONFIGURACIÓN OPTIMIZADA ---
const API_URL = "/api";
let chatHistory = [];

window.onload = function () {
    console.log("Sistema SierraCol listo. Backend vinculado y seguro.");
};

function redirigirALogin() {
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
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: texto })
        });

        if (res.status === 401) return redirigirALogin();

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error del servidor (${res.status}): ${errorText}`);
        }

        const data = await res.json();
        console.log("Datos recibidos:", data); 

        let respuestaHTML = "";
        const rawData = data.respuesta;

        // VERIFICACIÓN DE TIPO: ¿Es objeto (SCT 46) o texto simple?
        if (typeof rawData === 'object' && rawData !== null) {
            // Caso 1: Objeto estructurado (Análisis estratégico)
            respuestaHTML += `<div style="border-left: 4px solid #0078d4; padding-left: 10px; margin-bottom: 10px;">`;
            respuestaHTML += `<h3 style="margin: 0; color: #0078d4;">${rawData.comite || 'Información de Comité'}</h3>`;
            respuestaHTML += `<small>Fecha de sesión: ${rawData.fecha || 'N/A'}</small></div>`;
            
            if (Array.isArray(rawData.temas_discutidos)) {
                rawData.temas_discutidos.forEach(item => {
                    respuestaHTML += `<div style="margin-bottom: 15px;">`;
                    respuestaHTML += `<strong>📌 Tema: ${item.tema}</strong><br>`;
                    
                    // Manejar si discusion es array o string
                    let disc = Array.isArray(item.discusion) ? item.discusion.join(". ") : item.discusion;
                    respuestaHTML += `<span style="font-size: 0.95em;">${disc}</span><br>`;
                    
                    if (item.acuerdos) {
                        let acue = Array.isArray(item.acuerdos) ? item.acuerdos.join(". ") : item.acuerdos;
                        respuestaHTML += `<strong style="color: #28a745;">✅ Acuerdos:</strong> <span style="font-size: 0.95em;">${acue}</span>`;
                    }
                    respuestaHTML += `</div><hr style="border: 0; border-top: 1px solid #eee;">`;
                });
            }
        } else {
            // Caso 2: Texto simple o Markdown (Evita el error .replace)
            let textoCrudo = String(rawData || "Sin respuesta disponible.");
            respuestaHTML = textoCrudo
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, "<br>");
        }

        // Agregar fuentes si existen
        if (data.fuentes && data.fuentes.length > 0) {
            respuestaHTML += `<div class="sources" style="margin-top: 20px; border-top: 2px solid #0078d4; padding-top: 10px;">`;
            respuestaHTML += `<strong>📚 Fuentes consultadas:</strong>`;
            data.fuentes.forEach(f => {
                respuestaHTML += `
                    <div class="source-item" style="margin-top: 8px; font-size: 0.85em;">
                        <span>📄 ${f.nombre}</span>
                        <a href="${f.link}" target="_blank" class="download-link" style="margin-left: 10px;">Ver Documento</a>
                    </div>`;
            });
            respuestaHTML += `</div>`;
        }

        addMessage("assistant", respuestaHTML, true);

    } catch (e) {
        console.error("Error en el chat:", e);
        addMessage("assistant", `⚠️ Error de procesamiento: ${e.message}`);
    } finally {
        loading.style.display = 'none';
    }
}

function addMessage(role, text, isHTML = false) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    if (isHTML) div.innerHTML = text;
    else div.textContent = text;

    const chatWindow = document.getElementById('chat-window');
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}