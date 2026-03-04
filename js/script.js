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
// --- 1. VARIABLE GLOBAL NUEVA (Ponla al principio de tu script.js) ---
let documentosTemporales = []; 

// --- 2. LA NUEVA FUNCIÓN SUBIR ---
async function subir() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    // Validaciones iniciales
    if (files.length === 0) return alert("Por favor, selecciona al menos un archivo.");
    if (files.length > 3) return alert("Solo puedes analizar un máximo de 3 archivos simultáneamente para no saturar la memoria.");

    const statusDiv = document.getElementById('statusUpload');
    // Buscamos el contenedor visual para listar los archivos (lo crearemos en el HTML en el paso 2)
    const listDiv = document.getElementById('tempFilesList'); 
    
    statusDiv.innerText = "⏳ Extrayendo texto en memoria (Seguro y Privado)...";
    statusDiv.style.color = "var(--corp-primary)";
    if (listDiv) listDiv.innerHTML = "";

    // Preparamos los archivos para enviarlos al backend
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append("archivos", files[i]);
    }

    try {
        // Apuntamos al nuevo endpoint de Python que NO guarda en Blob Storage
        const res = await fetch(`${API_URL}/chat/analizar-temporales`, {
            method: 'POST',
            body: formData
        });

        if (res.status === 401) return redirigirALogin();
        
        const rawText = await res.text();
        if (!res.ok) throw new Error(rawText);

        const data = JSON.parse(rawText);
        if (data.status === "error") throw new Error(data.mensaje);

        // ✅ Guardamos el texto extraído en la variable global del navegador
        documentosTemporales = data.documentos;

        statusDiv.innerText = `✅ ${files.length} archivo(s) listo(s) para consultar en el chat.`;
        statusDiv.style.color = "green";
        
        // Dibujamos la lista de archivos para que el usuario sepa qué está leyendo la IA
        if (listDiv) {
            listDiv.innerHTML = `
                <div style="text-align: left; background-color: #f0f4f8; padding: 10px; border-radius: 5px; margin-top: 10px; border-left: 3px solid var(--corp-accent);">
                    <span style="color: var(--corp-primary); font-weight: bold; font-size: 0.9em;">
                        <i class="fa-solid fa-memory me-1"></i> Documentos temporales en contexto:
                    </span><br>
                    <span style="font-size: 0.85em; color: #333;">
                        ${documentosTemporales.map(d => `• ${d.nombre}`).join("<br>")}
                    </span>
                </div>`;
        }
        
        // Limpiamos el input para que pueda subir otros si quiere
        fileInput.value = ""; 
    } catch (e) {
        console.error("Error en extracción:", e);
        statusDiv.innerText = `❌ Error: ${e.message}`;
        statusDiv.style.color = "var(--corp-danger)";
    }
}

// --- MÓDULO 2: CHAT ESTRATÉGICO CON MEMORIA ---
async function preguntar() {
    const input = document.getElementById('pregunta');
    const texto = input.value.trim();
    if (!texto) return;

    addMessage("user", texto);
    input.value = "";
    
    const loading = document.getElementById('loadingChat');
    if (loading) loading.style.display = 'block';

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: texto, history: chatHistory,documentos_temporales: documentosTemporales })
        });

        if (res.status === 401) return redirigirALogin();
        
        // 1. BEBEMOS DEL RÍO UNA SOLA VEZ (Lo leemos todo como texto)
        const rawText = await res.text();

        // Escudo 1: Azure despertando
        if (rawText.includes("Backend call failure") || rawText.includes("502") || rawText.includes("503")) {
            throw new Error("El sistema se estaba despertando de su modo de ahorro de energía 😴. Por favor, haz clic en enviar nuevamente.");
        }

        // Escudo 2: Errores del servidor
        if (!res.ok) {
            let errorMsg = "Error del servidor.";
            try {
                errorMsg = JSON.parse(rawText).respuesta || rawText;
            } catch(e) {
                errorMsg = `Error en la conexión (HTTP ${res.status}).`;
            }
            throw new Error(errorMsg);
        }

        // 🚨 AQUÍ ESTABA EL DETALLE: 
        // Usamos JSON.parse(rawText) en lugar de await res.json()
        const data = JSON.parse(rawText);
        
        // Memoria del chat
        chatHistory.push({ role: "user", content: texto });
        chatHistory.push({ role: "assistant", content: data.respuesta });
        if (chatHistory.length > 10) chatHistory.splice(0, 2);

        // Renderizado del Markdown
        let respuestaHTML = procesarMarkdown(data.respuesta);

        // Agrupación de fuentes
        if (data.fuentes && data.fuentes.length > 0) {
            respuestaHTML += `
                <div class="sources-box" style="margin-top:15px; border-top:2px solid #0078d4; padding-top:10px; background:#f9f9f9; padding:10px; border-radius:5px;">
                    <strong style="color:#0078d4; display:block; margin-bottom:8px;">📚 Fuentes consultadas:</strong>`;
            
            let archivos_procesados = new Set();
            data.fuentes.forEach(f => {
                if (!archivos_procesados.has(f.nombre)) {
                    respuestaHTML += `
                        <div style="font-size:0.85em; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; background:#fff; padding:6px; border:1px solid #ddd; border-radius:4px;">
                            <span title="${f.nombre}">📄 ${f.nombre.length > 40 ? f.nombre.substring(0,37)+'...' : f.nombre}</span>
                            <a href="${f.link}" target="_blank" style="color:#0078d4; font-weight:bold; text-decoration:none; border:1px solid #0078d4; padding:2px 8px; border-radius:3px; font-size:0.9em;">Ver Archivo</a>
                        </div>`;
                    archivos_procesados.add(f.nombre);
                }
            });
            respuestaHTML += `</div>`;
        }

        // SISTEMA DE CALIFICACIÓN Y FEEDBACK
        const msgId = "msg_" + Date.now(); 
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
                    <textarea class="feedback-textarea" id="feedback-text-${msgId}" placeholder="Ej: No mencionó el dato del presupuesto..."></textarea>
                    <button class="feedback-btn" onclick="enviarFeedbackFinal('${msgId}')">Enviar Comentarios</button>
                </div>

                <div id="rating-thanks-${msgId}" style="display:none; color: #107c10; font-size: 0.9em; margin-top: 8px; font-weight: bold;">
                    ¡Gracias por ayudarnos a mejorar el modelo! 🚀
                </div>
            </div>
        `;

        addMessage("assistant", respuestaHTML, true);

    } catch (e) {
        addMessage("assistant", `⚠️ ${e.message}`, true);
    } finally {
        if (loading) loading.style.display = 'none';
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