// ==========================================
// 1. VARIABLES GLOBALES
// ==========================================
// Asegúrate de que esta sea tu URL real de Python
const API_URL = "https://tu-url-del-backend.azurewebsites.net"; 
let chatHistory = [];

// ==========================================
// 2. LA FUNCIÓN FALTANTE: DIBUJAR MENSAJES
// ==========================================
function addMessage(role, content, isHtml = false) {
    const chatBox = document.getElementById('chatBox'); // Asegúrate de que el div de tu chat se llame id="chatBox"
    if (!chatBox) return; // Si no encuentra el chatBox, se detiene para no dar error

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`; // Asigna la clase 'user' o 'assistant'
    
    if (isHtml) {
        msgDiv.innerHTML = content;
    } else {
        msgDiv.textContent = content;
    }
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Hace scroll automático hacia abajo
}

// ==========================================
// 3. PROCESADOR DE MARKDOWN (Limpia textos)
// ==========================================
function procesarMarkdown(texto) {
    if (typeof texto !== 'string') return "Respuesta no disponible.";
    return texto
        .replace(/(^|\n|<br>)\s*#\s*(<br>|$|\n)/g, '') 
        .replace(/### (.*?)(<br>|$|\n)/g, '<h3 style="color:#0078d4; margin-top:10px; margin-bottom:5px;">$1</h3>')
        .replace(/## (.*?)(<br>|$|\n)/g, '<h4 style="color:#0078d4; margin-top:10px; margin-bottom:5px;">$1</h4>')
        .replace(/# (.*?)(<br>|$|\n)/g, '<strong style="color:#0078d4; display:block; margin-top:10px;">$1</strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, "<br>")
        .replace(/(<br>)- (.*?)(?=<br>|$)/g, '<li style="margin-left:15px;">$2</li>');
}

// ==========================================
// 4. FUNCIÓN PRINCIPAL DE PREGUNTAR
// ==========================================
async function preguntar() {
    const input = document.getElementById('pregunta'); // Asegúrate de que tu input tenga id="pregunta"
    if (!input) return;
    
    const texto = input.value.trim();
    if (!texto) return;

    // Mostrar mensaje del usuario en la interfaz
    addMessage("user", texto);
    input.value = "";
    
    const loading = document.getElementById('loadingChat'); // Tu animación de carga
    if (loading) loading.style.display = 'block';

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question: texto, 
                history: chatHistory 
            })
        });

        // Si tienes función de login y expira el token
        if (res.status === 401 && typeof redirigirALogin === "function") {
            return redirigirALogin();
        }
        
        // Manejo de errores blindado
        if (!res.ok) {
            const errorText = await res.text();
            let errorMsg = "Error desconocido en el chat.";
            try {
                const errorJson = JSON.parse(errorText);
                errorMsg = errorJson.respuesta || errorText;
            } catch(e) {
                if (errorText.includes("Backend") || errorText.includes("502") || errorText.includes("504")) {
                    errorMsg = "Intermitencia temporal en la conexión con el servidor. Por favor, intenta de nuevo.";
                } else {
                    errorMsg = "Error del servidor. Por favor, recarga la página.";
                }
            }
            throw new Error(errorMsg);
        }

        const data = await res.json();
        
        // Guardar historial
        chatHistory.push({ role: "user", content: texto });
        chatHistory.push({ role: "assistant", content: data.respuesta });
        if (chatHistory.length > 10) chatHistory.splice(0, 2);

        // Renderizar respuesta
        let respuestaHTML = procesarMarkdown(data.respuesta);

        // Dibujar botones de referencias sin duplicados
        if (data.fuentes && data.fuentes.length > 0) {
            respuestaHTML += `
                <div class="sources-box" style="margin-top:15px; border-top:2px solid #0078d4; padding-top:10px; background:#f9f9f9; padding:10px; border-radius:5px;">
                    <strong style="color:#0078d4; display:block; margin-bottom:8px;">📚 Fuentes consultadas:</strong>`;
            
            data.fuentes.forEach(f => {
                respuestaHTML += `
                    <div class="source-link-item" style="font-size:0.85em; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; background:#fff; padding:6px; border:1px solid #ddd; border-radius:4px;">
                        <span title="${f.nombre}">📄 ${f.nombre.length > 40 ? f.nombre.substring(0,37)+'...' : f.nombre}</span>
                        <a href="${f.link}" target="_blank" style="color:#0078d4; font-weight:bold; text-decoration:none; border:1px solid #0078d4; padding:2px 8px; border-radius:3px; font-size:0.9em;">Ver Archivo</a>
                    </div>`;
            });
            respuestaHTML += `</div>`;
        }

        // Enviar al HTML
        addMessage("assistant", respuestaHTML, true);

    } catch (e) {
        console.error("Error en chat:", e);
        addMessage("assistant", `⚠️ ${e.message}`, false);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}