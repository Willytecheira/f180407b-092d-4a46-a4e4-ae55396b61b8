// Configuración
const API_KEY = 'whatsapp-api-key-2024';
const BASE_URL = window.location.origin;

// Socket.IO
const socket = io();

// Variables globales
let sessions = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    updateServerInfo();
    refreshSessions();
    
    // Configurar Socket.IO events
    setupSocketEvents();
    
    // Configurar eventos de archivos
    setupFileEvents();
    
    // Auto-refresh cada 30 segundos
    setInterval(refreshSessions, 30000);
});

// Configurar eventos de Socket.IO
function setupSocketEvents() {
    socket.on('connect', () => {
        console.log('Conectado al servidor WebSocket');
        showNotification('Conectado al servidor', 'success');
    });

    socket.on('disconnect', () => {
        console.log('Desconectado del servidor WebSocket');
        showNotification('Desconectado del servidor', 'warning');
    });

    socket.on('qr', (data) => {
        console.log('QR recibido para sesión:', data.sessionId);
        updateSessionQR(data.sessionId, data.qr);
    });

    socket.on('connected', (data) => {
        console.log('Sesión conectada:', data.sessionId);
        showNotification(`Sesión ${data.sessionId} conectada exitosamente`, 'success');
        refreshSessions();
    });

    socket.on('disconnected', (data) => {
        console.log('Sesión desconectada:', data.sessionId);
        showNotification(`Sesión ${data.sessionId} desconectada`, 'warning');
        refreshSessions();
    });

    socket.on('message', (data) => {
        console.log('Nuevo mensaje recibido:', data);
        const message = data.message || data;
        showNotification(`Nuevo mensaje en ${message.sessionId || data.sessionId}`, 'info');
        
        // Actualizar mensajes en tiempo real si la vista está abierta
        const sessionId = message.sessionId || data.sessionId;
        const messagesContainer = document.getElementById(`messages-${sessionId}`);
        if (messagesContainer && messagesContainer.style.display !== 'none') {
            addMessageToContainer(sessionId, message);
        }
    });

    socket.on('auth_failure', (data) => {
        console.log('Error de autenticación:', data);
        showNotification(`Error de autenticación en ${data.sessionId}`, 'danger');
        refreshSessions();
    });
}

// Mostrar notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.getElementById('notifications').appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Actualizar información del servidor
function updateServerInfo() {
    document.getElementById('serverUrl').textContent = BASE_URL;
    
    // Obtener estado del servidor
    fetch(`${BASE_URL}/info`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('activeSessions').textContent = data.activeSessions;
                document.getElementById('serverStatus').textContent = 'En línea';
                document.getElementById('serverStatus').className = 'badge bg-success';
            }
        })
        .catch(error => {
            console.error('Error obteniendo info del servidor:', error);
            document.getElementById('serverStatus').textContent = 'Error';
            document.getElementById('serverStatus').className = 'badge bg-danger';
        });
}

// Crear nueva sesión
async function createSession() {
    const sessionId = document.getElementById('sessionIdInput').value.trim();
    
    if (!sessionId) {
        showNotification('Por favor ingresa un ID de sesión', 'warning');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/start-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({ sessionId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Sesión ${sessionId} creada exitosamente`, 'success');
            document.getElementById('sessionIdInput').value = '';
            
            // Unirse a la sala de Socket.IO para esta sesión
            socket.emit('join-session', sessionId);
            
            refreshSessions();
        } else {
            showNotification(`Error: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error creando sesión:', error);
        showNotification('Error al crear la sesión', 'danger');
    }
}

// Refrescar lista de sesiones
async function refreshSessions() {
    try {
        const response = await fetch(`${BASE_URL}/api/sessions`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });

        const data = await response.json();

        if (data.success) {
            sessions = data.sessions;
            renderSessions();
            updateSessionSelect();
            updateServerInfo();
        }
    } catch (error) {
        console.error('Error obteniendo sesiones:', error);
        showNotification('Error al obtener sesiones', 'danger');
    }
}

// Renderizar sesiones
function renderSessions() {
    const container = document.getElementById('sessionsContainer');
    
    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted p-4">
                <i class="fas fa-mobile-alt fa-3x mb-3"></i>
                <p>No hay sesiones activas. Crea una nueva sesión para comenzar.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sessions.map(session => `
        <div class="session-card" id="session-${session.sessionId}">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h6><i class="fas fa-mobile-alt"></i> ${session.sessionId}</h6>
                    <span class="status-badge status-${session.status}">${getStatusText(session.status)}</span>
                </div>
                <div class="btn-group btn-group-sm">
                    ${session.status === 'qr_ready' ? `
                        <button class="btn btn-info" onclick="showQR('${session.sessionId}')">
                            <i class="fas fa-qrcode"></i> QR
                        </button>
                    ` : ''}
                    <button class="btn btn-primary" onclick="toggleMessages('${session.sessionId}')">
                        <i class="fas fa-comments"></i> Mensajes
                    </button>
                    <button class="btn btn-danger" onclick="logoutSession('${session.sessionId}')">
                        <i class="fas fa-sign-out-alt"></i> Cerrar
                    </button>
                </div>
            </div>
            
            ${session.connectedAt ? `
                <small class="text-muted">
                    <i class="fas fa-clock"></i> Conectado: ${new Date(session.connectedAt).toLocaleString()}
                </small>
            ` : ''}
            
            <!-- Contenedor QR -->
            <div id="qr-${session.sessionId}" class="qr-container" style="display: none;"></div>
            
            <!-- Contenedor Mensajes -->
            <div id="messages-${session.sessionId}" class="message-container" style="display: none;"></div>
        </div>
    `).join('');
}

// Obtener texto del estado
function getStatusText(status) {
    const statusMap = {
        'connected': 'Conectado',
        'disconnected': 'Desconectado',
        'initializing': 'Inicializando',
        'qr_ready': 'Esperando QR',
        'authenticated': 'Autenticado',
        'auth_failure': 'Error Auth'
    };
    return statusMap[status] || status;
}

// Actualizar select de sesiones para envío
function updateSessionSelect() {
    const select = document.getElementById('sendSessionId');
    const connectedSessions = sessions.filter(s => s.status === 'connected');
    
    select.innerHTML = '<option value="">Seleccionar sesión...</option>' +
        connectedSessions.map(session => `
            <option value="${session.sessionId}">${session.sessionId}</option>
        `).join('');
}

// Mostrar código QR
async function showQR(sessionId) {
    const container = document.getElementById(`qr-${sessionId}`);
    
    try {
        const response = await fetch(`${BASE_URL}/api/qr/${sessionId}`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });

        const data = await response.json();

        if (data.success) {
            container.innerHTML = `
                <h6><i class="fas fa-qrcode"></i> Escanea este código QR con WhatsApp</h6>
                <img src="${data.qr}" alt="QR Code" class="qr-code">
                <p class="text-muted mt-2">
                    <small>Abre WhatsApp → Más opciones → Dispositivos vinculados → Vincular un dispositivo</small>
                </p>
            `;
            container.style.display = 'block';
        } else {
            showNotification(`Error obteniendo QR: ${data.error}`, 'warning');
        }
    } catch (error) {
        console.error('Error obteniendo QR:', error);
        showNotification('Error al obtener código QR', 'danger');
    }
}

// Actualizar QR en tiempo real
function updateSessionQR(sessionId, qrData) {
    const container = document.getElementById(`qr-${sessionId}`);
    if (container && container.style.display !== 'none') {
        container.innerHTML = `
            <h6><i class="fas fa-qrcode"></i> Escanea este código QR con WhatsApp</h6>
            <img src="${qrData}" alt="QR Code" class="qr-code">
            <p class="text-muted mt-2">
                <small>Abre WhatsApp → Más opciones → Dispositivos vinculados → Vincular un dispositivo</small>
            </p>
        `;
    }
}

// Toggle mensajes
function toggleMessages(sessionId) {
    const container = document.getElementById(`messages-${sessionId}`);
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        loadSessionMessages(sessionId);
    } else {
        container.style.display = 'none';
    }
}

// Cargar mensajes de la sesión
async function loadSessionMessages(sessionId) {
    const container = document.getElementById(`messages-${sessionId}`);
    
    try {
        const response = await fetch(`${BASE_URL}/api/messages/${sessionId}?limit=50`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });

        const data = await response.json();

        if (data.success) {
            if (data.messages.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-muted p-3">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <p>No hay mensajes aún</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <h6><i class="fas fa-comments"></i> Mensajes recientes (${data.messages.length})</h6>
                    <div id="messages-list-${sessionId}" class="messages-list">
                        ${data.messages.map(msg => renderMessage(msg)).join('')}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error cargando mensajes:', error);
        container.innerHTML = '<div class="alert alert-danger">Error cargando mensajes</div>';
    }
}

// Renderizar un mensaje individual
function renderMessage(msg) {
    const isIncoming = msg.from && msg.from.includes('@c.us');
    const time = new Date(msg.timestamp * 1000).toLocaleString();
    const contactName = msg.contact?.name || msg.from || 'Desconocido';
    
    let mediaContent = '';
    if (msg.isMedia && msg.media) {
        const { mimetype, data, filename } = msg.media;
        
        if (mimetype.startsWith('image/')) {
            mediaContent = `
                <div class="media-preview">
                    <img src="data:${mimetype};base64,${data}" alt="${filename}" 
                         class="img-thumbnail" style="max-width: 200px; max-height: 200px;">
                </div>
            `;
        } else if (mimetype.startsWith('audio/')) {
            mediaContent = `
                <div class="media-preview">
                    <audio controls class="w-100">
                        <source src="data:${mimetype};base64,${data}" type="${mimetype}">
                    </audio>
                </div>
            `;
        } else {
            mediaContent = `
                <div class="media-preview">
                    <div class="file-attachment">
                        <i class="fas fa-file"></i>
                        <span>${filename}</span>
                        <a href="data:${mimetype};base64,${data}" download="${filename}" 
                           class="btn btn-sm btn-outline-primary ms-2">
                            <i class="fas fa-download"></i> Descargar
                        </a>
                    </div>
                </div>
            `;
        }
    }
    
    return `
        <div class="message-item ${isIncoming ? 'incoming' : 'outgoing'}">
            <div class="message-header">
                <strong>${contactName}</strong>
                <small class="text-muted float-end">${time}</small>
            </div>
            ${msg.body ? `<p class="message-body">${msg.body}</p>` : ''}
            ${mediaContent}
        </div>
    `;
}

// Agregar mensaje en tiempo real
function addMessageToContainer(sessionId, message) {
    const listContainer = document.getElementById(`messages-list-${sessionId}`);
    if (listContainer) {
        const messageHtml = renderMessage(message);
        listContainer.insertAdjacentHTML('beforeend', messageHtml);
        
        // Scroll hacia abajo
        const container = document.getElementById(`messages-${sessionId}`);
        container.scrollTop = container.scrollHeight;
    }
}

// Enviar mensaje de prueba
async function sendMessage() {
    const sessionId = document.getElementById('sendSessionId').value;
    const number = document.getElementById('phoneNumber').value.trim();
    const message = document.getElementById('messageText').value.trim();
    
    if (!sessionId || !number || !message) {
        showNotification('Por favor completa todos los campos', 'warning');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({
                sessionId,
                number,
                message
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Mensaje enviado exitosamente a ${number}`, 'success');
            document.getElementById('messageText').value = '';
        } else {
            showNotification(`Error enviando mensaje: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        showNotification('Error al enviar mensaje', 'danger');
    }
}

// Configurar eventos de archivos
function setupFileEvents() {
    const mediaFile = document.getElementById('mediaFile');
    const mediaPreview = document.getElementById('mediaPreview');
    const previewContent = document.getElementById('previewContent');
    
    if (mediaFile) {
        mediaFile.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                showFilePreview(file, previewContent);
                mediaPreview.style.display = 'block';
            } else {
                mediaPreview.style.display = 'none';
            }
        });
    }
}

// Mostrar vista previa del archivo
function showFilePreview(file, container) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        let previewHtml = '';
        
        if (file.type.startsWith('image/')) {
            previewHtml = `
                <img src="${e.target.result}" alt="Preview" 
                     class="img-thumbnail" style="max-width: 200px; max-height: 200px;">
            `;
        } else if (file.type.startsWith('audio/')) {
            previewHtml = `
                <audio controls class="w-100">
                    <source src="${e.target.result}" type="${file.type}">
                </audio>
            `;
        } else {
            previewHtml = `
                <div class="file-info">
                    <i class="fas fa-file fa-2x"></i>
                    <p><strong>${file.name}</strong></p>
                    <p>Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p>Tipo: ${file.type || 'Desconocido'}</p>
                </div>
            `;
        }
        
        container.innerHTML = previewHtml;
    };
    
    reader.readAsDataURL(file);
}

// Enviar archivo multimedia
async function sendMedia() {
    const sessionId = document.getElementById('sendSessionId').value;
    const number = document.getElementById('phoneNumber').value.trim();
    const mediaFile = document.getElementById('mediaFile').files[0];
    const caption = document.getElementById('mediaCaption').value.trim();
    
    if (!sessionId || !number || !mediaFile) {
        showNotification('Por favor completa todos los campos y selecciona un archivo', 'warning');
        return;
    }

    // Verificar tamaño del archivo (50MB máximo)
    if (mediaFile.size > 50 * 1024 * 1024) {
        showNotification('El archivo es demasiado grande. Máximo 50MB permitido.', 'warning');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('sessionId', sessionId);
        formData.append('number', number);
        formData.append('media', mediaFile);
        if (caption) {
            formData.append('caption', caption);
        }

        showNotification('Enviando archivo...', 'info');

        const response = await fetch(`${BASE_URL}/api/send-media`, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Archivo enviado exitosamente a ${number}`, 'success');
            document.getElementById('mediaFile').value = '';
            document.getElementById('mediaCaption').value = '';
            document.getElementById('mediaPreview').style.display = 'none';
        } else {
            showNotification(`Error enviando archivo: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error enviando archivo:', error);
        showNotification('Error al enviar archivo', 'danger');
    }
}

// Cerrar sesión
async function logoutSession(sessionId) {
    if (!confirm(`¿Estás seguro de que quieres cerrar la sesión ${sessionId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/logout/${sessionId}`, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Sesión ${sessionId} cerrada exitosamente`, 'success');
            refreshSessions();
        } else {
            showNotification(`Error cerrando sesión: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        showNotification('Error al cerrar sesión', 'danger');
    }
}