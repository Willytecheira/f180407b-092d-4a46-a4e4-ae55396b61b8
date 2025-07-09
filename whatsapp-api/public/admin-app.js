// Configuración
const API_KEY = 'whatsapp-api-key-2024';
const BASE_URL = window.location.origin;

// Socket.IO
const socket = io();

// Variables globales
let sessions = [];

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si está logueado
    if (localStorage.getItem('whatsapp_api_logged_in') !== 'true') {
        window.location.href = '/login.html';
        return;
    }

    // Mostrar usuario actual
    const currentUser = localStorage.getItem('whatsapp_api_user') || 'admin';
    document.getElementById('currentUser').textContent = currentUser;

    // Inicializar la aplicación
    initializeApp();
});

function initializeApp() {
    setupSocketEvents();
    refreshSessions();
    refreshWebhooks();
    
    // Auto-refresh cada 30 segundos
    setInterval(refreshSessions, 30000);
}

// Logout
function logout() {
    localStorage.removeItem('whatsapp_api_logged_in');
    localStorage.removeItem('whatsapp_api_user');
    window.location.href = '/login.html';
}

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
        refreshWebhooks();
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
            refreshWebhooks();
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
            updateSessionSelects();
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

// Actualizar selects de sesiones
function updateSessionSelects() {
    const webhookSelect = document.getElementById('webhookSessionId');
    const sendSelect = document.getElementById('sendSessionId');
    
    const allSessionsOptions = '<option value="">Seleccionar sesión...</option>' +
        sessions.map(session => `
            <option value="${session.sessionId}">${session.sessionId} (${getStatusText(session.status)})</option>
        `).join('');
        
    const connectedSessionsOptions = '<option value="">Seleccionar sesión...</option>' +
        sessions.filter(s => s.status === 'connected').map(session => `
            <option value="${session.sessionId}">${session.sessionId}</option>
        `).join('');
    
    webhookSelect.innerHTML = allSessionsOptions;
    sendSelect.innerHTML = connectedSessionsOptions;
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
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; margin-top: 15px;">
                    <h6><i class="fas fa-qrcode"></i> Escanea este código QR con WhatsApp</h6>
                    <img src="${data.qr}" alt="QR Code" style="max-width: 250px; border: 2px solid #25D366; border-radius: 10px;">
                    <p class="text-muted mt-2">
                        <small>Abre WhatsApp → Más opciones → Dispositivos vinculados → Vincular un dispositivo</small>
                    </p>
                </div>
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
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; margin-top: 15px;">
                <h6><i class="fas fa-qrcode"></i> Escanea este código QR con WhatsApp</h6>
                <img src="${qrData}" alt="QR Code" style="max-width: 250px; border: 2px solid #25D366; border-radius: 10px;">
                <p class="text-muted mt-2">
                    <small>Abre WhatsApp → Más opciones → Dispositivos vinculados → Vincular un dispositivo</small>
                </p>
            </div>
        `;
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
            refreshWebhooks();
        } else {
            showNotification(`Error cerrando sesión: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        showNotification('Error al cerrar sesión', 'danger');
    }
}

// Configurar webhook
async function configureWebhook() {
    const sessionId = document.getElementById('webhookSessionId').value;
    const webhookUrl = document.getElementById('webhookUrl').value.trim();
    
    if (!sessionId) {
        showNotification('Por favor selecciona una sesión', 'warning');
        return;
    }
    
    if (!webhookUrl) {
        showNotification('Por favor ingresa una URL para el webhook', 'warning');
        return;
    }

    // Obtener eventos seleccionados
    const events = [];
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes.forEach(cb => events.push(cb.value));

    if (events.length === 0) {
        events.push('all');
    }

    try {
        const response = await fetch(`${BASE_URL}/api/${sessionId}/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({
                url: webhookUrl,
                events: events
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Webhook configurado exitosamente para ${sessionId}`, 'success');
            document.getElementById('webhookUrl').value = '';
            refreshWebhooks();
        } else {
            showNotification(`Error configurando webhook: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error configurando webhook:', error);
        showNotification('Error al configurar webhook', 'danger');
    }
}

// Eliminar webhook
async function removeWebhook() {
    const sessionId = document.getElementById('webhookSessionId').value;
    
    if (!sessionId) {
        showNotification('Por favor selecciona una sesión', 'warning');
        return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar el webhook de la sesión ${sessionId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/${sessionId}/webhook`, {
            method: 'DELETE',
            headers: {
                'X-API-Key': API_KEY
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Webhook eliminado exitosamente de ${sessionId}`, 'success');
            refreshWebhooks();
        } else {
            showNotification(`Error eliminando webhook: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error eliminando webhook:', error);
        showNotification('Error al eliminar webhook', 'danger');
    }
}

// Refrescar webhooks configurados
async function refreshWebhooks() {
    const container = document.getElementById('webhooksContainer');
    
    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted p-4">
                <i class="fas fa-webhook fa-3x mb-3"></i>
                <p>No hay sesiones disponibles</p>
            </div>
        `;
        return;
    }

    let webhooksHtml = '';
    let hasWebhooks = false;

    for (const session of sessions) {
        try {
            const response = await fetch(`${BASE_URL}/api/${session.sessionId}/webhook`, {
                headers: {
                    'X-API-Key': API_KEY
                }
            });

            const data = await response.json();

            if (data.success && data.configured) {
                hasWebhooks = true;
                webhooksHtml += `
                    <div class="webhook-card">
                        <div class="webhook-status">
                            <i class="fas fa-mobile-alt text-primary"></i>
                            <strong>${session.sessionId}</strong>
                            <span class="badge bg-success ms-2">Activo</span>
                        </div>
                        <p class="mb-2">
                            <strong>URL:</strong><br>
                            <small class="text-muted">${data.webhookUrl}</small>
                        </p>
                        <p class="mb-2">
                            <strong>Eventos:</strong> 
                            <span class="badge bg-info">${data.events.join(', ')}</span>
                        </p>
                        <p class="mb-0">
                            <strong>Configurado:</strong> 
                            <small class="text-muted">${new Date(data.configuredAt).toLocaleString()}</small>
                        </p>
                    </div>
                `;
            }
        } catch (error) {
            console.error(`Error obteniendo webhook para ${session.sessionId}:`, error);
        }
    }

    if (!hasWebhooks) {
        container.innerHTML = `
            <div class="text-center text-muted p-4">
                <i class="fas fa-webhook fa-3x mb-3"></i>
                <p>No hay webhooks configurados</p>
            </div>
        `;
    } else {
        container.innerHTML = webhooksHtml;
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