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

        // COMPONENTE DE CALIFICACIÓN (RÚBRICA Y ESTRELLAS)
        const msgId = "msg_" + Date.now(); // Genera un ID único para la interacción
        // Reemplazamos comillas en la pregunta para que no rompa el atributo HTML
        const preguntaSegura = texto.replace(/"/g, '&quot;'); 

        respuestaHTML += `
            <div class="rating-box" id="rating-box-${msgId}" data-pregunta="${preguntaSegura}">
                <div class="rating-rubric">
                    <strong>¿Qué tan útil y precisa fue esta respuesta?</strong><br>
                    <span style="font-size: 0.9em; color: #666;">(1 = 😞 Pobre, errónea | 3 = 😐 Aceptable, parcial | 5 = 🤩 Excelente, exacta)</span>
                </div>
                <div class="stars-container" id="stars-${msgId}">
                    <span class="star-btn" onclick="seleccionarCalificacion(5, '${msgId}', this)">★</span>
                    <span class="star-btn" onclick="seleccionarCalificacion(4, '${msgId}', this)">★</span>
                    <span class="star-btn" onclick="seleccionarCalificacion(3, '${msgId}', this)">★</span>
                    <span class="star-btn" onclick="seleccionarCalificacion(2, '${msgId}', this)">★</span>
                    <span class="star-btn" onclick="seleccionarCalificacion(1, '${msgId}', this)">★</span>
                </div>

                <div class="feedback-box" id="feedback-box-${msgId}">
                    <span style="font-size:0.85em; font-weight:bold; color:#d13438; margin-bottom:5px;">¿En qué podemos mejorar esta respuesta?</span>
                    <textarea class="feedback-textarea" id="feedback-text-${msgId}" placeholder="Ej: No mencionó la el acuerdo..., el dato del CAPEX está equivocado..."></textarea>
                    <button class="feedback-btn" onclick="enviarFeedbackFinal('${msgId}')">Enviar Comentarios</button>
                </div>

                <div id="rating-thanks-${msgId}" style="display:none; color: #107c10; font-size: 0.9em; margin-top: 5px; font-weight: bold;">
                    ¡Gracias por ayudarnos a mejorar el modelo! 🚀
                </div>
            </div>
        `;

        addMessage("assistant", respuestaHTML, true);

    } catch (e) {
        console.error("Error en chat:", e);
        addMessage("assistant", `⚠️ Ocurrió un problema: ${e.message}`);
    } finally {
        loading.style.display = 'none';
    }
}

// --- MÓDULO 5: SISTEMA DE CALIFICACIONES CON FEEDBACK ---
let currentRatings = {}; // Memoria temporal para saber cuántas estrellas eligió antes de escribir

function seleccionarCalificacion(estrellas, msgId, starElement) {
    // 1. Limpiamos selecciones previas y marcamos la actual
    const allStars = document.querySelectorAll(`#stars-${msgId} .star-btn`);
    allStars.forEach(s => s.classList.remove('selected'));
    starElement.classList.add('selected');
    
    // Guardamos la elección temporalmente
    currentRatings[msgId] = estrellas;
    
    const feedbackBox = document.getElementById(`feedback-box-${msgId}`);
    
    // 2. Lógica de decisión: ¿Muestra caja o envía directo?
    if (estrellas <= 3) {
        feedbackBox.style.display = 'flex'; // Mostrar textarea
    } else {
        feedbackBox.style.display = 'none'; // Ocultar textarea si se arrepintió y subió a 4 o 5
        bloquearEstrellas(msgId);
        ejecutarEnvioBackend(msgId, estrellas, ""); // Enviar sin feedback
    }
}

function enviarFeedbackFinal(msgId) {
    const feedbackText = document.getElementById(`feedback-text-${msgId}`).value.trim();
    const estrellas = currentRatings[msgId];
    
    if (!feedbackText) {
        alert("Por favor, déjanos un breve comentario para saber qué falló.");
        document.getElementById(`feedback-text-${msgId}`).focus();
        return;
    }
    
    document.getElementById(`feedback-box-${msgId}`).style.display = 'none';
    bloquearEstrellas(msgId);
    ejecutarEnvioBackend(msgId, estrellas, feedbackText);
}

function bloquearEstrellas(msgId) {
    const allStars = document.querySelectorAll(`#stars-${msgId} .star-btn`);
    allStars.forEach(s => s.style.pointerEvents = 'none'); // Desactiva clics
}

async function ejecutarEnvioBackend(msgId, estrellas, feedback) {
    const container = document.getElementById(`rating-box-${msgId}`);
    if (!container) return;
    
    const pregunta = container.getAttribute('data-pregunta');
    
    // Mostrar agradecimiento
    document.getElementById(`rating-thanks-${msgId}`).style.display = 'block';
    
    try {
        const res = await fetch(`${API_URL}/chat/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                pregunta: pregunta, 
                estrellas: estrellas,
                feedback: feedback
            })
        });
        
        if(res.ok) {
            console.log(`✅ Guardado en Azure: ${estrellas} estrellas. Feedback: "${feedback}"`);
        }
    } catch (e) {
        console.error("❌ Error enviando calificación:", e);
    }
}

// --- MÓDULO 3: LIMPIEZA DE MARKDOWN DE LA IA ---
function procesarMarkdown(texto) {
    if (typeof texto !== 'string') return "Respuesta no disponible.";
    
    return texto
        // 1. ELIMINADOR DE '#' SUELTOS: Borra si hay uno o varios '#' solos en una línea
        .replace(/^#+\s*$/gm, '') 
        
        // 2. TÍTULOS DINÁMICOS (¡LA SOLUCIÓN!): 
        // Atrapa desde 1 hasta 6 '#' seguidos de un espacio y les aplica el mismo estilo azul
        .replace(/^#{1,6}\s+(.*$)/gm, '<h4 style="color:#0078d4; margin-top:15px; margin-bottom:5px; font-size:1.1em; font-weight:bold;">$1</h4>')
        
        // 3. Negritas e itálicas
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        // 4. Listas limpias
        .replace(/^- (.*$)/gm, '<li style="margin-left:15px; margin-bottom:5px;">$1</li>')
        
        // 5. Saltos de línea
        .replace(/\n/g, "<br>")
        
        // 6. Limpieza visual (compacta los espacios en blanco múltiples)
        .replace(/(<br>\s*){3,}/g, '<br><br>');
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