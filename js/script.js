// --- CONFIGURACIÓN GLOBAL Y MEMORIA ---
const API_URL = "/api";
let chatHistory = []; // Variable que mantiene el hilo de la conversación

window.onload = function () {
    console.log("Sistema SierraCol con Memoria Dinámica e Historial Completo Listo.");
};

function redirigirALogin() {
    // Manejo de autenticación para Azure Static Web Apps
    window.location.href = "/.auth/login/aad?post_login_redirect_uri=/";
}

// --- MÓDULO 1: GENERACIÓN DE ACTAS (DUAL) ---
async function subir() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) return alert("Por favor, selecciona un archivo (Transcripción o PDF).");

    const statusDiv = document.getElementById('statusUpload');
    statusDiv.innerText = "⏳ Procesando en Azure Intelligence (Extrayendo Datos)...";
    statusDiv.style.color = "#0078d4";

    const formData = new FormData();
    // Enviamos el archivo para ambos procesos (Transcripción y Layout)
    formData.append("file_transcripcion", file);
    formData.append("file_presentacion", file);

    try {
        const res = await fetch(`${API_URL}/automatizacion/generar-acta-comite-dual`, {
            method: 'POST',
            body: formData
        });

        if (res.status === 401) return redirigirALogin();
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error en el servidor: ${errorText}`);
        }

        // Recuperar el nombre del archivo desde los headers o asignar uno por defecto
        const contentDisposition = res.headers.get('Content-Disposition');
        let filename = `Acta_Borrador_${new Date().getTime()}.docx`;
        if (contentDisposition && contentDisposition.includes('filename=')) {
            filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        statusDiv.innerText = "✅ Acta generada y descargada exitosamente.";
        statusDiv.style.color = "green";
        
        // Limpiar input
        fileInput.value = "";
    } catch (e) {
        console.error("Error en subida:", e);
        statusDiv.innerText = `❌ Error: ${e.message}`;
        statusDiv.style.color = "red";
    }
}

// Función mejorada para renderizar la respuesta de la IA (limpia símbolos y arregla títulos)
function procesarMarkdown(texto) {
    if (typeof texto !== 'string') return "Respuesta no disponible.";
    return texto
        // 1. Elimina el símbolo '#' cuando la IA lo deja solo en una línea
        .replace(/(^|\n|<br>)\s*#\s*(<br>|$|\n)/g, '') 
        // 2. Convierte títulos correctamente
        .replace(/### (.*?)(<br>|$|\n)/g, '<h3 style="color:#0078d4; margin-top:10px; margin-bottom:5px;">$1</h3>')
        .replace(/## (.*?)(<br>|$|\n)/g, '<h4 style="color:#0078d4; margin-top:10px; margin-bottom:5px;">$1</h4>')
        .replace(/# (.*?)(<br>|$|\n)/g, '<strong style="color:#0078d4; display:block; margin-top:10px;">$1</strong>')
        // 3. Negritas e itálicas
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 4. Saltos de línea y listas
        .replace(/\n/g, "<br>")
        .replace(/(<br>)- (.*?)(?=<br>|$)/g, '<li style="margin-left:15px;">$2</li>');
}

// Módulo 2 preguntando
async function preguntar() {
    const input = document.getElementById('pregunta');
    const texto = input.value.trim();
    if (!texto) return;

    // 1. Mostrar mensaje del usuario en la interfaz
    addMessage("user", texto);
    input.value = "";
    
    const loading = document.getElementById('loadingChat');
    loading.style.display = 'block';

    try {
        // 2. Enviar pregunta E HISTORIAL al backend para mantener contexto
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question: texto, 
                history: chatHistory 
            })
        });

        if (res.status === 401) return redirigirALogin();
        
        // --- MANEJO DE ERRORES BLINDADO ---
        if (!res.ok) {
            const errorText = await res.text(); // Leemos como texto primero
            let errorMsg = "Error desconocido en el chat.";
            try {
                // Intentamos parsear a JSON si el error viene de Python
                const errorJson = JSON.parse(errorText);
                errorMsg = errorJson.respuesta || errorText;
            } catch(e) {
                // Si falla, es un error de Azure (HTML/Gateway 502/504)
                if (errorText.includes("Backend") || errorText.includes("502") || errorText.includes("504")) {
                    errorMsg = "Intermitencia temporal en la conexión con el servidor. Por favor, intenta de nuevo.";
                } else {
                    errorMsg = "Error del servidor. Por favor, recarga la página.";
                }
            }
            throw new Error(errorMsg);
        }

        const data = await res.json();
        
        // 3. Persistir en el historial local (Punto clave para la memoria)
        chatHistory.push({ role: "user", content: texto });
        chatHistory.push({ role: "assistant", content: data.respuesta });
        
        // Mantener el historial ligero (últimas 5 interacciones = 10 mensajes)
        if (chatHistory.length > 10) chatHistory.splice(0, 2);

        // 4. Renderizado de la respuesta (Markdown a HTML)
        let respuestaHTML = procesarMarkdown(data.respuesta);

        // 5. Renderizado de Fuentes con Links SAS
        if (data.fuentes && data.fuentes.length > 0) {
            respuestaHTML += `
                <div class="sources-box" style="margin-top:15px; border-top:2px solid #0078d4; padding-top:10px; background:#f9f9f9; padding:10px; border-radius:5px;">
                    <strong style="color:#0078d4; display:block; margin-bottom:8px;">📚 Fuentes consultadas de Azure Search:</strong>`;
            
            data.fuentes.forEach(f => {
                respuestaHTML += `
                    <div class="source-link-item" style="font-size:0.85em; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; background:#fff; padding:6px; border:1px solid #ddd; border-radius:4px;">
                        <span title="${f.nombre}">📄 ${f.nombre.length > 40 ? f.nombre.substring(0,37)+'...' : f.nombre}</span>
                        <a href="${f.link}" target="_blank" style="color:#0078d4; font-weight:bold; text-decoration:none; border:1px solid #0078d4; padding:2px 8px; border-radius:3px; font-size:0.9em;">Ver Archivo</a>
                    </div>`;
            });
            respuestaHTML += `</div>`;
        }

        addMessage("assistant", respuestaHTML, true);

    } catch (e) {
        console.error("Error en chat:", e);
        // Ahora el error no romperá la UI, sino que mostrará un mensaje amigable
        addMessage("assistant", `⚠️ Ocurrió un problema: ${e.message}`);
    } finally {
        loading.style.display = 'none';
    }
}