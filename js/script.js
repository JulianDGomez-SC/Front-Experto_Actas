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

// --- MÓDULO 2: CHAT ESTRATÉGICO CON MEMORIA ---
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
        
        if (!res.ok) {
            const errorBody = await res.json();
            throw new Error(errorBody.respuesta || "Error desconocido en el chat.");
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
                        <a href="${f.link}" target="_blank" style="color:#0078d4; font-weight:bold; text-decoration:none; border:1px solid #0078d4; padding:2px 8px; border-radius:3px; font-size:0.9em;">Ver PDF</a>
                    </div>`;
            });
            respuestaHTML += `</div>`;
        }

        addMessage("assistant", respuestaHTML, true);

    } catch (e) {
        console.error("Error en chat:", e);
        addMessage("assistant", `⚠️ Ocurrió un problema: ${e.message}`);
    } finally {
        loading.style.display = 'none';
    }
}

// --- UTILIDADES DE RENDERIZADO ---

function procesarMarkdown(texto) {
    if (typeof texto !== 'string') return "Respuesta no disponible.";
    
    // Procesador básico para asegurar que el replace funcione siempre
    return texto
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negritas
        .replace(/### (.*?)(<br>|$|\n)/g, '<h3 style="color:#0078d4; margin-bottom:5px;">$1</h3>') // Títulos
        .replace(/\n/g, "<br>") // Saltos de línea
        .replace(/- (.*?)(<br>|$)/g, '<li style="margin-left:15px;">$1</li>'); // Listas
}

function addMessage(role, text, isHTML = false) {
    const chatWindow = document.getElementById('chat-window');
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    
    const bubble = document.createElement('div');
    bubble.className = "bubble";
    
    if (isHTML) {
        bubble.innerHTML = text;
    } else {
        bubble.textContent = text;
    }
    
    div.appendChild(bubble);
    chatWindow.appendChild(div);
    
    // Scroll automático al último mensaje
    chatWindow.scrollTop = chatWindow.scrollHeight;
}