// Dashboard JavaScript for WhatsApp Multi-Session API
const API_KEY = 'whatsapp-api-key-2024';
const BASE_URL = window.location.origin;

// Socket.IO connection
const socket = io();

// Chart instances
let memoryChart, sessionsChart;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeCharts();
    loadDashboardData();
    setupRealTimeUpdates();
    
    // Auto-refresh every 30 seconds
    setInterval(loadDashboardData, 30000);
});

// Authentication check
function checkAuthentication() {
    const sessionData = localStorage.getItem('whatsapp_api_session');
    if (!sessionData) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const data = JSON.parse(sessionData);
        const loginTime = new Date(data.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
            localStorage.removeItem('whatsapp_api_session');
            window.location.href = '/login.html';
            return;
        }

        document.getElementById('currentUser').textContent = data.username;
    } catch (error) {
        console.error('Error checking authentication:', error);
        window.location.href = '/login.html';
    }
}

// Initialize charts
function initializeCharts() {
    // Memory Usage Chart
    const memoryCtx = document.getElementById('memoryChart').getContext('2d');
    memoryChart = new Chart(memoryCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Uso de Memoria (%)',
                data: [],
                borderColor: '#25D366',
                backgroundColor: 'rgba(37, 211, 102, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    ticks: {
                        maxTicksLimit: 12
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Sessions Status Chart
    const sessionsCtx = document.getElementById('sessionsChart').getContext('2d');
    sessionsChart = new Chart(sessionsCtx, {
        type: 'doughnut',
        data: {
            labels: ['Conectadas', 'Desconectadas', 'Inicializando'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    '#28a745',
                    '#dc3545',
                    '#ffc107'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading(true);
        
        const response = await fetch(`${BASE_URL}/api/metrics/dashboard`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
            updateDashboard(data.dashboard);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error cargando datos del dashboard: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Update dashboard with new data
function updateDashboard(dashboard) {
    // Update overview statistics
    document.getElementById('totalSessions').textContent = dashboard.overview.totalSessions;
    document.getElementById('activeSessions').textContent = dashboard.overview.activeSessions;
    document.getElementById('totalMessages').textContent = dashboard.overview.totalMessages;
    document.getElementById('systemUptime').textContent = dashboard.overview.uptime;

    // Update system resources
    const memoryUsage = parseFloat(dashboard.resources.memoryUsage);
    const heapUsage = parseFloat(dashboard.resources.heapUsage);
    
    document.getElementById('memoryUsage').textContent = memoryUsage.toFixed(1) + '%';
    document.getElementById('heapUsage').textContent = heapUsage.toFixed(1) + '%';
    document.getElementById('cpuCores').textContent = dashboard.resources.cpuCores;
    document.getElementById('loadAverage').textContent = dashboard.resources.loadAverage[0].toFixed(2);

    // Update progress bars
    document.getElementById('memoryProgress').style.width = memoryUsage + '%';
    document.getElementById('heapProgress').style.width = heapUsage + '%';

    // Update memory chart
    if (dashboard.trends.memory.length > 0) {
        const labels = dashboard.trends.memory.map(point => {
            const date = new Date(point.timestamp);
            return date.getHours().toString().padStart(2, '0') + ':' + 
                   date.getMinutes().toString().padStart(2, '0');
        });
        const data = dashboard.trends.memory.map(point => parseFloat(point.usage));

        memoryChart.data.labels = labels;
        memoryChart.data.datasets[0].data = data;
        memoryChart.update('none');
    }

    // Update sessions chart
    const statusCounts = {
        connected: 0,
        disconnected: 0,
        initializing: 0
    };

    dashboard.sessions.forEach(session => {
        if (session.status === 'connected') {
            statusCounts.connected++;
        } else if (session.status === 'disconnected') {
            statusCounts.disconnected++;
        } else {
            statusCounts.initializing++;
        }
    });

    sessionsChart.data.datasets[0].data = [
        statusCounts.connected,
        statusCounts.disconnected,
        statusCounts.initializing
    ];
    sessionsChart.update('none');

    // Update alerts
    updateAlerts(dashboard.alerts);

    // Update sessions list
    updateSessionsList(dashboard.sessions);
}

// Update alerts
function updateAlerts(alerts) {
    const container = document.getElementById('alertsContainer');
    container.innerHTML = '';

    alerts.forEach(alert => {
        const alertElement = document.createElement('div');
        alertElement.className = 'alert alert-warning-custom alert-custom';
        alertElement.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${alert}
        `;
        container.appendChild(alertElement);
    });
}

// Update sessions list
function updateSessionsList(sessions) {
    console.log('Updating sessions list:', sessions); // Debug logging
    const container = document.getElementById('sessionsContainer');
    
    if (!sessions || sessions.length === 0) {
        console.log('No sessions found or sessions array is empty'); // Debug logging
        container.innerHTML = `
            <div class="text-center text-muted p-4">
                <i class="fas fa-mobile-alt fa-3x mb-3"></i>
                <p>No hay sesiones disponibles</p>
                <small class="text-muted">Verifica que el sistema esté funcionando correctamente</small>
            </div>
        `;
        return;
    }

    container.innerHTML = sessions.map(session => `
        <div class="session-card">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">
                        <i class="fas fa-mobile-alt me-2"></i>
                        ${session.id}
                    </h6>
                    <small class="text-muted">
                        ${session.messageCount} mensajes
                        ${session.connectedAt ? '• Conectado: ' + formatDate(session.connectedAt) : ''}
                    </small>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="status-badge status-${session.status}">
                        ${getStatusText(session.status)}
                    </span>
                    ${session.hasQR ? '<i class="fas fa-qrcode text-primary" title="QR disponible"></i>' : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Setup real-time updates
function setupRealTimeUpdates() {
    socket.on('connect', () => {
        console.log('Connected to real-time updates');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from real-time updates');
    });

    socket.on('session-update', (data) => {
        // Refresh data when sessions change
        loadDashboardData();
    });

    socket.on('metrics-update', (data) => {
        // Update specific metrics without full refresh
        if (data.type === 'system') {
            updateSystemMetrics(data.metrics);
        }
    });
}

// Update system metrics in real-time
function updateSystemMetrics(metrics) {
    if (metrics.memory) {
        const memoryUsage = ((metrics.memory.used / metrics.memory.total) * 100).toFixed(1);
        document.getElementById('memoryUsage').textContent = memoryUsage + '%';
        document.getElementById('memoryProgress').style.width = memoryUsage + '%';
    }

    if (metrics.uptime) {
        document.getElementById('systemUptime').textContent = metrics.uptime.formatted;
    }
}

// Utility functions
function getStatusText(status) {
    const statusMap = {
        'connected': 'Conectado',
        'disconnected': 'Desconectado',
        'initializing': 'Inicializando',
        'qr_ready': 'QR Listo',
        'auth_failure': 'Error Auth'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function showLoading(message = 'Cargando...', show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (typeof message === 'boolean') {
            show = message;
            message = 'Cargando...';
        }
        overlay.style.display = show ? 'block' : 'none';
        if (show && overlay.querySelector('.loading-text')) {
            overlay.querySelector('.loading-text').textContent = message;
        }
    }
}

function hideLoading() {
    showLoading(false);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function refreshData() {
    loadDashboardData();
    showNotification('Datos actualizados', 'success');
}

function logout() {
    localStorage.removeItem('whatsapp_api_session');
    window.location.href = '/login.html';
}

// Navigation handling
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all links
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        
        // Add active class to clicked link
        this.classList.add('active');
        
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        // Handle navigation
        const href = this.getAttribute('href');
        switch(href) {
            case '#dashboard':
                document.getElementById('dashboard-content').classList.add('active');
                break;
            case '#sessions':
                document.getElementById('sessions-content').classList.add('active');
                loadSessionsManagement();
                break;
            case '#users':
                document.getElementById('users-content').classList.add('active');
                loadUsersManagement();
                break;
            case '#system':
                document.getElementById('system-content').classList.add('active');
                loadSystemInfo();
                break;
        }
    });
});

// Load sessions management
async function loadSessionsManagement() {
    const container = document.getElementById('sessionsManagement');
    showLoading('Cargando sesiones...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/sessions`, {
            headers: { 
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Sessions API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Sessions API data:', data);
        
        if (data.success && data.sessions) {
            if (data.sessions.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info text-center">
                        <i class="fas fa-info-circle me-2"></i>
                        No hay sesiones activas
                        <br><br>
                        <button class="btn btn-primary" onclick="createNewSession()">
                            <i class="fas fa-plus me-2"></i>Crear Nueva Sesión
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5>Sesiones Activas (${data.sessions.length})</h5>
                        <button class="btn btn-primary" onclick="createNewSession()">
                            <i class="fas fa-plus me-2"></i>Nueva Sesión
                        </button>
                    </div>
                    <div class="row">
                        ${data.sessions.map(session => `
                            <div class="col-md-6 mb-3">
                                <div class="card session-card">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 class="card-title mb-1">${session.sessionId || session.id}</h6>
                                                <p class="card-text">
                                                    <span class="badge ${session.status === 'connected' ? 'bg-success' : session.status === 'qr' ? 'bg-warning' : 'bg-secondary'}">
                                                        ${getStatusText(session.status)}
                                                    </span>
                                                </p>
                                                ${session.connectedAt ? `<small class="text-muted">Conectado: ${formatDate(session.connectedAt)}</small>` : ''}
                                            </div>
                                            <div>
                                                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewSession('${session.sessionId || session.id}')" title="Ver detalles">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger" onclick="deleteSession('${session.sessionId || session.id}')" title="Eliminar sesión">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } else {
            container.innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${data.error || 'Error cargando sesiones'}
                    <br><br>
                    <button class="btn btn-outline-primary" onclick="loadSessionsManagement()">
                        <i class="fas fa-redo me-2"></i>Reintentar
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading sessions management:', error);
        container.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-times-circle me-2"></i>
                Error de conexión: ${error.message}
                <br><br>
                <button class="btn btn-outline-danger" onclick="loadSessionsManagement()">
                    <i class="fas fa-redo me-2"></i>Reintentar
                </button>
            </div>
        `;
    }
    
    hideLoading();
}

// Load users management
async function loadUsersManagement() {
    const container = document.getElementById('usersTable');
    showLoading('Cargando usuarios...');
    
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`${BASE_URL}/api/users`, {
            headers: { 
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token || localStorage.getItem('authToken')}`
            }
        });
        
        console.log('Users API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Users API data:', data);
        
        if (data.success) {
            // Update stats
            const stats = data.users.reduce((acc, user) => {
                acc.total++;
                acc[user.role] = (acc[user.role] || 0) + 1;
                return acc;
            }, { total: 0, admin: 0, operator: 0, viewer: 0 });
            
            document.getElementById('totalUsers').textContent = stats.total;
            document.getElementById('adminUsers').textContent = stats.admin || 0;
            document.getElementById('operatorUsers').textContent = stats.operator || 0;
            document.getElementById('viewerUsers').textContent = stats.viewer || 0;
            
            // Update table
            container.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Último Login</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.users.map(user => `
                                <tr>
                                    <td><strong>${user.username}</strong></td>
                                    <td>${user.email || 'N/A'}</td>
                                    <td><span class="badge bg-secondary">${user.role}</span></td>
                                    <td>${user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser('${user.username}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${user.username !== 'admin' ? `
                                            <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.username}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${data.error || 'Error cargando usuarios'}
                    <br><br>
                    <button class="btn btn-outline-warning" onclick="loadUsersManagement()">
                        <i class="fas fa-redo me-2"></i>Reintentar
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading users management:', error);
        container.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-times-circle me-2"></i>
                Error de conexión: ${error.message}
                <br><br>
                <button class="btn btn-outline-danger" onclick="loadUsersManagement()">
                    <i class="fas fa-redo me-2"></i>Reintentar
                </button>
            </div>
        `;
    }
    
    hideLoading();
}

// Load system info
async function loadSystemInfo() {
    const container = document.getElementById('systemInfo');
    showLoading('Cargando información del sistema...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/metrics/system`, {
            headers: { 
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('System API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('System API data:', data);
        
        if (data.success && data.metrics) {
            const metrics = data.metrics;
            container.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-server me-2"></i>Información del Sistema</h5>
                            </div>
                            <div class="card-body">
                                <table class="table table-borderless">
                                    <tr>
                                        <td><strong>Tiempo de actividad:</strong></td>
                                        <td>${metrics.uptime?.formatted || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Núcleos CPU:</strong></td>
                                        <td>${metrics.cpu?.cores || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Carga promedio:</strong></td>
                                        <td>${metrics.cpu?.loadAverage ? metrics.cpu.loadAverage.map(l => l.toFixed(2)).join(', ') : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Memoria total:</strong></td>
                                        <td>${metrics.memory?.total ? (metrics.memory.total / 1024 / 1024 / 1024).toFixed(2) + ' GB' : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Memoria usada:</strong></td>
                                        <td>${metrics.memory?.used ? (metrics.memory.used / 1024 / 1024 / 1024).toFixed(2) + ' GB' : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Memoria libre:</strong></td>
                                        <td>${metrics.memory?.free ? (metrics.memory.free / 1024 / 1024 / 1024).toFixed(2) + ' GB' : 'N/A'}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-memory me-2"></i>Proceso Node.js</h5>
                            </div>
                            <div class="card-body">
                                <table class="table table-borderless">
                                    <tr>
                                        <td><strong>Heap usado:</strong></td>
                                        <td>${metrics.memory?.process?.heapUsed ? (metrics.memory.process.heapUsed / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Heap total:</strong></td>
                                        <td>${metrics.memory?.process?.heapTotal ? (metrics.memory.process.heapTotal / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Heap límite:</strong></td>
                                        <td>${metrics.memory?.process?.heapLimit ? (metrics.memory.process.heapLimit / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Memoria externa:</strong></td>
                                        <td>${metrics.memory?.process?.external ? (metrics.memory.process.external / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Sesiones activas:</strong></td>
                                        <td>${metrics.sessions?.active || 0}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Total sesiones:</strong></td>
                                        <td>${metrics.sessions?.total || 0}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${data.error || 'Error cargando información del sistema'}
                    <br><br>
                    <button class="btn btn-outline-warning" onclick="loadSystemInfo()">
                        <i class="fas fa-redo me-2"></i>Reintentar
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading system info:', error);
        container.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-times-circle me-2"></i>
                Error de conexión: ${error.message}
                <br><br>
                <button class="btn btn-outline-danger" onclick="loadSystemInfo()">
                    <i class="fas fa-redo me-2"></i>Reintentar
                </button>
            </div>
        `;
    }
    
    hideLoading();
}

// User management functions
function createUser() {
    showNotification('Funcionalidad de creación de usuarios en desarrollo', 'info');
}

function editUser(username) {
    showNotification(`Editando usuario: ${username}`, 'info');
}

function deleteUser(username) {
    if (confirm(`¿Estás seguro de eliminar el usuario ${username}?`)) {
        showNotification(`Usuario ${username} eliminado`, 'success');
    }
}

// Session management functions
async function createNewSession() {
    const sessionId = prompt('Ingrese el ID para la nueva sesión:');
    if (!sessionId) return;
    
    showLoading('Creando sesión...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/start-session`, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId: sessionId.trim() })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Sesión ${sessionId} creada exitosamente`, 'success');
            loadSessionsManagement(); // Reload sessions list
        } else {
            showNotification(`Error creando sesión: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error creating session:', error);
        showNotification(`Error de conexión: ${error.message}`, 'error');
    }
    
    hideLoading();
}

function viewSession(sessionId) {
    showNotification(`Viendo sesión: ${sessionId}`, 'info');
}

async function deleteSession(sessionId) {
    if (!confirm(`¿Estás seguro de eliminar la sesión ${sessionId}?`)) return;
    
    showLoading('Eliminando sesión...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/logout/${sessionId}`, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Sesión ${sessionId} eliminada exitosamente`, 'success');
            loadSessionsManagement(); // Reload sessions list
        } else {
            showNotification(`Error eliminando sesión: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting session:', error);
        showNotification(`Error de conexión: ${error.message}`, 'error');
    }
    
    hideLoading();
}