// --- CONFIGURACIÓN DEL SISTEMA SIERRACOL ---
const API_URL = "/api";
let chatHistory = [];

window.onload = function () {
    console.log("Sistema SierraCol listo. Interfaz vinculada al backend estratégico.");
};

function redirigirALogin() {
    window.location.href = "/.auth/login/aad?post_login_redirect_uri=/";
}

// --- MÓDULO DE GENERACIÓN DE ACTAS (DUAL) ---
async function subir() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return alert("Por favor, selecciona un archivo (Transcripción o PDF).");

    const statusDiv = document.getElementById('statusUpload');
    statusDiv.innerText = "⏳ Procesando acta de alta fidelidad...";
    statusDiv.style.color = "#0078d4";

    const formData = new FormData();
    // Enviamos el mismo archivo a ambos campos si el usuario solo sube uno, 
    // o puedes ajustar tu HTML para tener dos inputs.
    formData.append("file_transcripcion", file);
    formData.append("file_presentacion", file);

    try {
        const res = await fetch(`${API_URL}/automatizacion/generar-acta-comite-dual`, {
            method: 'POST',
            body: formData
        });

        if (res.status === 401) return redirigirALogin();
        if (!res.ok) throw new Error("Error en el servidor al generar el documento.");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Nombre dinámico con timestamp para evitar colisiones
        a.download = `Acta_Borrador_SierraCol_${new Date().toISOString().slice(0,10)}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        statusDiv.innerText = "✅ Acta generada y descargada correctamente.";
        statusDiv.style.color = "green";
    } catch (e) {
        console.error(e);
        statusDiv.innerText = "❌ Error: No se pudo completar el proceso.";
        statusDiv.style.color = "red";
    }
}

// --- MÓDULO DE CHAT ESTRATÉGICO ---
async function preguntar() {
    const input = document.getElementById('pregunta');
    const texto = input.value.trim();
    if (!texto) return;

    // Agregar mensaje del usuario a la interfaz
    addMessage("user", texto);
    input.value = "";
    
    const loading = document.getElementById('loadingChat');
    loading.style.display = 'block';

    try {
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
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        console.log("Respuesta del experto:", data);

        // Procesar la respuesta (que ahora siempre es un String de Markdown)
        let respuestaHTML = procesarMarkdown(data.respuesta || "No se obtuvo respuesta del analista.");

        // Agregar sección de fuentes si el backend las envió
        if (data.fuentes && data.fuentes.length > 0) {
            respuestaHTML += `<div class="sources-container" style="margin-top: 20px; border-top: 2px solid #0078d4; padding-top: 10px;">`;
            respuestaHTML += `<strong style="color: #0078d4; display: block; margin-bottom: 10px;">📚 Fuentes consultadas:</strong>`;
            
            data.fuentes.forEach(f => {
                respuestaHTML += `
                    <div class="source-card" style="display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #ddd; padding: 8px; margin-bottom: 6px; border-radius: 4px; font-size: 0.85em;">
                        <span>📄 ${f.nombre}</span>
                        <a href="${f.link}" target="_blank" style="color: #0078d4; font-weight: bold; text-decoration: none; border: 1px solid #0078d4; padding: 2px 8px; border-radius: 3px;">Ver Documento</a>
                    </div>`;
            });
            respuestaHTML += `</div>`;
        }

        // Mostrar en el chat
        addMessage("assistant", respuestaHTML, true);
        
        // Actualizar historial local (opcional)
        chatHistory.push({ role: "user", content: texto });
        chatHistory.push({ role: "assistant", content: data.respuesta });

    } catch (e) {
        console.error("Error en flujo de chat:", e);
        addMessage("assistant", `⚠️ Error: ${e.message}`);
    } finally {
        loading.style.display = 'none';
    }
}

// --- UTILIDADES DE RENDERIZADO ---

function procesarMarkdown(texto) {
    if (typeof texto !== 'string') return "Error: Formato de respuesta no válido.";

    return texto
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negritas
        .replace(/\*(.*?)\*/g, '<em>$1</em>')           // Cursivas
        .replace(/\n/g, "<br>")                          // Saltos de línea
        .replace(/### (.*?)(<br>|$)/g, '<h3 style="color:#0078d4; margin-top:10px;">$1</h3>') // Títulos
        .replace(/- (.*?)(<br>|$)/g, '<li>$1</li>');     // Listas simples
}

function addMessage(role, text, isHTML = false) {
    const chatWindow = document.getElementById('chat-window');
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    
    // Contenedor interno para estilo de burbuja
    const bubble = document.createElement('div');
    bubble.className = "bubble";
    
    if (isHTML) {
        bubble.innerHTML = text;
    } else {
        bubble.textContent = text;
    }
    
    div.appendChild(bubble);
    chatWindow.appendChild(div);
    
    // Auto-scroll al final
    chatWindow.scrollTop = chatWindow.scrollHeight;
}