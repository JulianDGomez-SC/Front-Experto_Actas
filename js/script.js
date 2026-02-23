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

        // VERIFICACIÓN DE TIPO: ¿Es objeto estratégico o texto simple?
        if (typeof rawData === 'object' && rawData !== null) {
            // Caso 1: Objeto estructurado (Análisis estratégico)
            respuestaHTML += `<div style="border-left: 4px solid #0078d4; padding-left: 10px; margin-bottom: 10px; background: #f0f7ff; padding: 10px; border-radius: 0 5px 5px 0;">`;
            respuestaHTML += `<h3 style="margin: 0; color: #0078d4;">${rawData.comite || 'Información de Comité'}</h3>`;
            respuestaHTML += `<small>Fecha de sesión: ${rawData.fecha || 'N/A'}</small></div>`;
            
            // Buscamos la lista de temas bajo cualquier nombre posible (acuerdos, temas_discutidos, etc.)
            const listaTemas = rawData.acuerdos || rawData.temas_discutidos || rawData.puntos || [];
            
            if (Array.isArray(listaTemas)) {
                listaTemas.forEach(item => {
                    respuestaHTML += `<div style="margin-bottom: 15px; padding: 5px;">`;
                    respuestaHTML += `<strong style="color: #333; display: block; margin-bottom: 4px;">📌 Tema: ${item.tema || 'Sin título'}</strong>`;
                    
                    // Manejar discusión (puede ser string o array)
                    if (item.discusion) {
                        let disc = Array.isArray(item.discusion) ? item.discusion.join(". ") : item.discusion;
                        respuestaHTML += `<div style="font-size: 0.95em; color: #555; margin-bottom: 5px;"><em>Discusión:</em> ${disc}</div>`;
                    }
                    
                    // Manejar acuerdos (puede ser string o array)
                    if (item.acuerdos) {
                        let acue = Array.isArray(item.acuerdos) ? item.acuerdos.join(". ") : item.acuerdos;
                        respuestaHTML += `<div style="background: #e6f4ea; padding: 5px 8px; border-radius: 4px; font-size: 0.92em;">`;
                        respuestaHTML += `<strong style="color: #1e7e34;">✅ Acuerdos:</strong> ${acue}</div>`;
                    }
                    respuestaHTML += `</div><hr style="border: 0; border-top: 1px solid #eee;">`;
                });
            } else {
                respuestaHTML += `<p>No se encontraron detalles específicos en el formato de lista.</p>`;
            }
        } else {
            // Caso 2: Texto simple o Markdown
            let textoCrudo = String(rawData || "Sin respuesta disponible.");
            respuestaHTML = textoCrudo
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, "<br>");
        }

        // Agregar fuentes si existen
        if (data.fuentes && data.fuentes.length > 0) {
            respuestaHTML += `<div class="sources" style="margin-top: 20px; border-top: 2px solid #0078d4; padding-top: 10px;">`;
            respuestaHTML += `<strong style="color: #0078d4;">📚 Fuentes consultadas:</strong>`;
            data.fuentes.forEach(f => {
                respuestaHTML += `
                    <div class="source-item" style="margin-top: 8px; font-size: 0.85em; background: #fff; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                        <span>📄 ${f.nombre}</span>
                        <a href="${f.link}" target="_blank" class="download-link" style="margin-left: 10px; font-weight: bold; color: #0078d4; text-decoration: none;">Ver Documento</a>
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