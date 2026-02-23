// --- CONFIGURACIÓN GLOBAL ---
const API_URL = "/api";
let chatHistory = []; // Variable crítica para la memoria

window.onload = function () {
    console.log("Sistema SierraCol con Memoria Dinámica Listo.");
};

function redirigirALogin() {
    window.location.href = "/.auth/login/aad?post_login_redirect_uri=/";
}

// --- GENERACIÓN DE ACTAS ---
async function subir() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return alert("Selecciona un archivo primero.");

    const statusDiv = document.getElementById('statusUpload');
    statusDiv.innerText = "⏳ Procesando acta dual...";
    
    const formData = new FormData();
    formData.append("file_transcripcion", file);
    formData.append("file_presentacion", file);

    try {
        const res = await fetch(`${API_URL}/automatizacion/generar-acta-comite-dual`, {
            method: 'POST',
            body: formData
        });

        if (res.status === 401) return redirigirALogin();
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Acta_SierraCol_${new Date().getTime()}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        statusDiv.innerText = "✅ Acta generada.";
    } catch (e) {
        statusDiv.innerText = "❌ Error en el proceso.";
    }
}

// --- CHAT CON MEMORIA ---
async function preguntar() {
    const input = document.getElementById('pregunta');
    const texto = input.value.trim();
    if (!texto) return;

    // 1. Mostrar mensaje del usuario
    addMessage("user", texto);
    input.value = "";
    
    const loading = document.getElementById('loadingChat');
    loading.style.display = 'block';

    try {
        // 2. Enviar pregunta E HISTORIAL al backend
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question: texto,
                history: chatHistory 
            })
        });

        if (res.status === 401) return redirigirALogin();
        if (!res.ok) throw new Error("Error en la comunicación con el experto.");

        const data = await res.json();
        
        // 3. Guardar en el historial local para la siguiente pregunta
        chatHistory.push({ role: "user", content: texto });
        chatHistory.push({ role: "assistant", content: data.respuesta });

        // 4. Renderizar respuesta
        let respuestaHTML = procesarMarkdown(data.respuesta);

        if (data.fuentes && data.fuentes.length > 0) {
            respuestaHTML += `<div style="margin-top:15px; border-top:1px solid #0078d4; padding-top:10px;">
                                <strong style="color:#0078d4;">📚 Fuentes Consultadas:</strong>`;
            data.fuentes.forEach(f => {
                respuestaHTML += `
                    <div style="font-size:0.85em; margin-top:5px; display:flex; justify-content:space-between; background:#fff; padding:5px; border:1px solid #ddd;">
                        <span>📄 ${f.nombre}</span>
                        <a href="${f.link}" target="_blank" style="color:#0078d4; font-weight:bold;">Ver</a>
                    </div>`;
            });
            respuestaHTML += `</div>`;
        }

        addMessage("assistant", respuestaHTML, true);

    } catch (e) {
        addMessage("assistant", `⚠️ Error: ${e.message}`);
    } finally {
        loading.style.display = 'none';
    }
}

// --- UTILIDADES ---
function procesarMarkdown(texto) {
    if (typeof texto !== 'string') return "Error de formato.";
    return texto
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (.*?)(<br>|$)/g, '<h3 style="color:#0078d4;">$1</h3>')
        .replace(/\n/g, "<br>");
}

function addMessage(role, text, isHTML = false) {
    const chatWindow = document.getElementById('chat-window');
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    const bubble = document.createElement('div');
    bubble.className = "bubble";
    if (isHTML) bubble.innerHTML = text;
    else bubble.textContent = text;
    div.appendChild(bubble);
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}