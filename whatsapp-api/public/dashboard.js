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
    const sessionToken = localStorage.getItem('sessionToken');
    const sessionData = localStorage.getItem('whatsapp_api_session');
    
    if (!sessionToken && !sessionData) {
        window.location.href = '/login.html';
        return;
    }

    try {
        if (sessionData) {
            const data = JSON.parse(sessionData);
            const loginTime = new Date(data.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

            if (hoursDiff > 24) {
                localStorage.removeItem('whatsapp_api_session');
                localStorage.removeItem('sessionToken');
                window.location.href = '/login.html';
                return;
            }

            document.getElementById('currentUser').textContent = data.username;
            
            // Store API key for future requests
            localStorage.setItem('apiKey', API_KEY);
        }
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
        console.log('🔄 Iniciando carga de datos del dashboard...');
        showLoading('Cargando datos del dashboard...', true);
        
        const apiKey = localStorage.getItem('apiKey') || API_KEY;
        console.log('🔑 API Key encontrada:', apiKey ? 'SÍ' : 'NO');
        
        const response = await fetch(`${BASE_URL}/api/metrics/dashboard`, {
            headers: {
                'X-API-Key': apiKey
            }
        });

        console.log('📡 Respuesta del servidor:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error HTTP:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('📊 Datos recibidos:', data);
        
        if (data.success) {
            console.log('✅ Dashboard data:', data.dashboard);
            updateDashboard(data.dashboard);
        } else {
            console.error('❌ Error en respuesta:', data.error);
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('💥 Error loading dashboard data:', error);
        showNotification('Error cargando datos del dashboard: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Update dashboard with new data
function updateDashboard(dashboard) {
    console.log('🎯 Actualizando dashboard con datos:', dashboard);
    
    // Verificar estructura de datos
    if (!dashboard || !dashboard.overview) {
        console.error('❌ Estructura de datos incorrecta:', dashboard);
        showNotification('Error: Datos del dashboard incompletos', 'error');
        return;
    }
    
    // Update overview statistics
    document.getElementById('totalSessions').textContent = dashboard.overview.totalSessions || 0;
    document.getElementById('activeSessions').textContent = dashboard.overview.activeSessions || 0;
    document.getElementById('totalMessages').textContent = dashboard.overview.totalMessages || 0;
    document.getElementById('systemUptime').textContent = dashboard.overview.uptime || '0m';

    // Update system resources
    const memoryUsage = parseFloat(dashboard.resources.memoryUsage) || 0;
    const heapUsage = parseFloat(dashboard.resources.heapUsage) || 0;
    
    document.getElementById('memoryUsage').textContent = memoryUsage.toFixed(1) + '%';
    document.getElementById('heapUsage').textContent = heapUsage.toFixed(1) + '%';
    document.getElementById('cpuCores').textContent = dashboard.resources.cpuCores || 0;
    document.getElementById('loadAverage').textContent = (dashboard.resources.loadAverage[0] || 0).toFixed(2);

    // Update progress bars
    document.getElementById('memoryProgress').style.width = memoryUsage + '%';
    document.getElementById('heapProgress').style.width = heapUsage + '%';

    // Update memory chart
    if (dashboard.trends && dashboard.trends.memory && dashboard.trends.memory.length > 0) {
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

    if (dashboard.sessions) {
        dashboard.sessions.forEach(session => {
            if (session.status === 'connected') {
                statusCounts.connected++;
            } else if (session.status === 'disconnected') {
                statusCounts.disconnected++;
            } else {
                statusCounts.initializing++;
            }
        });
    }

    sessionsChart.data.datasets[0].data = [
        statusCounts.connected,
        statusCounts.disconnected,
        statusCounts.initializing
    ];
    sessionsChart.update('none');

    // Update alerts
    updateAlerts(dashboard.alerts || []);

    // Update sessions list
    updateSessionsList(dashboard.sessions || []);
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
    const container = document.getElementById('sessionsContainer');
    
    if (!sessions || sessions.length === 0) {
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
                        ${session.id || session.sessionId}
                    </h6>
                    <small class="text-muted">
                        ${session.messageCount || 0} mensajes
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
        if (show && overlay.querySelector('h5')) {
            overlay.querySelector('h5').textContent = message;
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
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('apiKey');
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
            case '#webhooks':
                document.getElementById('webhooks-content').classList.add('active');
                loadWebhooksManagement();
                break;
        }
    });
});

// Load sessions management
function loadSessionsManagement() {
    showLoading('Cargando gestión de sesiones...', true);
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    fetch('/api/metrics/dashboard', {
        method: 'GET',
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                // Extract sessions from dashboard data
                const sessions = data.dashboard.sessions || [];
                displaySessionsManagement(sessions);
            } else {
                document.getElementById('sessionsManagement').innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>Error: ${data.error || 'No se pudieron cargar las sesiones'}
                    </div>
                `;
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error loading sessions:', error);
            document.getElementById('sessionsManagement').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>Error de conexión: ${error.message}
                </div>
            `;
        });
}

function displaySessionsManagement(sessions) {
    const container = document.getElementById('sessionsManagement');
    
    if (!sessions || sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-mobile-alt fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No hay sesiones activas</h5>
                <p class="text-muted">Crea una nueva sesión para comenzar</p>
                <button class="btn btn-primary-custom btn-custom" onclick="createNewSession()">
                    <i class="fas fa-plus me-1"></i>Nueva Sesión
                </button>
            </div>
        `;
        return;
    }

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h5>Sesiones Activas (${sessions.length})</h5>
            <button class="btn btn-primary-custom btn-custom" onclick="createNewSession()">
                <i class="fas fa-plus me-1"></i>Nueva Sesión
            </button>
        </div>
        <div class="row">
    `;

    sessions.forEach(session => {
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="session-card">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">${session.id || session.sessionId}</h6>
                        <span class="status-badge status-${session.status}">
                            ${getStatusText(session.status)}
                        </span>
                    </div>
                    <p class="text-muted small mb-2">
                        <i class="fas fa-clock me-1"></i>
                        Conectado: ${session.connectedAt ? formatDate(session.connectedAt) : 'N/A'}
                    </p>
                    <p class="text-muted small mb-3">
                        <i class="fas fa-paper-plane me-1"></i>
                        Mensajes: ${session.messageCount || 0}
                    </p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewSession('${session.id || session.sessionId}')">
                            <i class="fas fa-eye me-1"></i>Ver
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteSession('${session.id || session.sessionId}')">
                            <i class="fas fa-trash me-1"></i>Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Load users management
function loadUsersManagement() {
    showLoading('Cargando gestión de usuarios...', true);
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    const sessionData = localStorage.getItem('whatsapp_api_session');
    
    // Create authorization token from session data
    let authToken = '';
    if (sessionData) {
        try {
            const data = JSON.parse(sessionData);
            // Use btoa instead of Buffer for browser compatibility
            authToken = btoa(JSON.stringify({
                username: data.username,
                role: data.role || 'admin',
                loginTime: data.loginTime
            }));
            console.log('Users auth token created:', authToken.substring(0, 20) + '...');
        } catch (error) {
            console.error('Error parsing session data for users:', error);
        }
    }
    
    fetch('/api/users', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                displayUsersManagement(data.users);
            } else {
                document.getElementById('usersTable').innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>Error: ${data.error || 'No se pudieron cargar los usuarios'}
                    </div>
                `;
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error loading users:', error);
            document.getElementById('usersTable').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>Error de conexión: ${error.message}
                </div>
            `;
        });
}

function displayUsersManagement(users) {
    let tableHtml = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Último Login</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    users.forEach(user => {
        const statusBadge = user.active 
            ? '<span class="badge bg-success">Activo</span>'
            : '<span class="badge bg-danger">Inactivo</span>';
        
        const roleBadge = user.role === 'admin' 
            ? '<span class="badge bg-primary">Admin</span>'
            : user.role === 'operator'
            ? '<span class="badge bg-info">Operador</span>'
            : '<span class="badge bg-secondary">Viewer</span>';

        tableHtml += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                            ${user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h6 class="mb-0">${user.username}</h6>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>${user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editUser('${user.username}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${user.username !== 'admin' ? `
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.username}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('usersTable').innerHTML = tableHtml;
}

// Load system info
function loadSystemInfo() {
    showLoading('Cargando información del sistema...', true);
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    const sessionData = localStorage.getItem('whatsapp_api_session');
    
    // Create authorization token from session data
    let authToken = '';
    if (sessionData) {
        try {
            const data = JSON.parse(sessionData);
            // Use btoa instead of Buffer for browser compatibility
            authToken = btoa(JSON.stringify({
                username: data.username,
                role: data.role || 'admin',
                loginTime: data.loginTime
            }));
            console.log('System auth token created:', authToken.substring(0, 20) + '...');
        } catch (error) {
            console.error('Error parsing session data for system:', error);
        }
    }
    
    fetch('/api/metrics/system', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                displaySystemInfo(data.metrics);
            } else {
                document.getElementById('system-content').innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>Error: ${data.error || 'No se pudo cargar la información del sistema'}
                    </div>
                `;
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error loading system info:', error);
            document.getElementById('system-content').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>Error de conexión: ${error.message}
                </div>
            `;
        });
}

function displaySystemInfo(systemInfo) {
    const container = document.getElementById('system-content');
    
    if (!systemInfo) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>No se pudo obtener información del sistema
            </div>
        `;
        return;
    }

    // Format memory values
    const formatBytes = (bytes) => {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    // Format uptime
    const formatUptime = (seconds) => {
        if (!seconds) return 'N/A';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    container.innerHTML = `
        <h2 class="mb-4"><i class="fas fa-cog me-2"></i>Configuración del Sistema</h2>
        <div class="row">
            <div class="col-lg-6">
                <div class="chart-container">
                    <h5><i class="fas fa-server me-2"></i>Información del Sistema</h5>
                    <div class="metric-item">
                        <span class="metric-label">Sistema Operativo</span>
                        <span class="metric-value">${systemInfo.os?.platform || 'N/A'} ${systemInfo.os?.release || ''}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Arquitectura</span>
                        <span class="metric-value">${systemInfo.os?.arch || 'N/A'}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Hostname</span>
                        <span class="metric-value">${systemInfo.os?.hostname || 'N/A'}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Tiempo de Actividad</span>
                        <span class="metric-value">${systemInfo.uptime?.formatted || formatUptime(systemInfo.uptime?.seconds) || 'N/A'}</span>
                    </div>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="chart-container">
                    <h5><i class="fas fa-chart-bar me-2"></i>Recursos del Sistema</h5>
                    <div class="metric-item">
                        <span class="metric-label">Memoria Total</span>
                        <span class="metric-value">${formatBytes(systemInfo.memory?.total)}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Memoria Libre</span>
                        <span class="metric-value">${formatBytes(systemInfo.memory?.free)}</span>
                    </div>
                     <div class="metric-item">
                         <span class="metric-label">Memoria Usada</span>
                         <span class="metric-value">${formatBytes(systemInfo.memory?.used)} (${((systemInfo.memory?.used / systemInfo.memory?.total) * 100)?.toFixed(1) || '0'}%)</span>
                     </div>
                    <div class="metric-item">
                        <span class="metric-label">CPU Cores</span>
                        <span class="metric-value">${systemInfo.cpu?.cores || 'N/A'}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Load Average</span>
                        <span class="metric-value">${systemInfo.cpu?.loadAverage?.join(', ') || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Process Information -->
        <div class="row mt-4">
            <div class="col-lg-12">
                <div class="chart-container">
                    <h5><i class="fas fa-cogs me-2"></i>Información del Proceso</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="metric-item">
                                <span class="metric-label">Versión Node.js</span>
                                <span class="metric-value">${systemInfo.process?.nodeVersion || 'N/A'}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">PID</span>
                                <span class="metric-value">${systemInfo.process?.pid || 'N/A'}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Heap Usado</span>
                                <span class="metric-value">${formatBytes(systemInfo.memory?.process?.heapUsed)}</span>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="metric-item">
                                <span class="metric-label">Heap Total</span>
                                <span class="metric-value">${formatBytes(systemInfo.memory?.process?.heapTotal)}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Memoria Externa</span>
                                <span class="metric-value">${formatBytes(systemInfo.memory?.process?.external)}</span>
                            </div>
                             <div class="metric-item">
                                 <span class="metric-label">Uso de Heap</span>
                                 <span class="metric-value">${((systemInfo.memory?.process?.heapUsed / systemInfo.memory?.process?.heapTotal) * 100)?.toFixed(1) || '0'}%</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load webhooks management
function loadWebhooksManagement() {
    showLoading('Cargando gestión de webhooks...', true);
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    fetch('/api/webhooks', {
        method: 'GET',
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                displayWebhooksManagement(data.webhooks || []);
            } else {
                document.getElementById('webhooksManagement').innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>Error: ${data.error || 'No se pudieron cargar los webhooks'}
                    </div>
                `;
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error loading webhooks:', error);
            document.getElementById('webhooksManagement').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>Error de conexión: ${error.message}
                </div>
            `;
        });
}

function displayWebhooksManagement(webhooks) {
    const container = document.getElementById('webhooksManagement');
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h5>Webhooks Configurados (${webhooks.length})</h5>
            <button class="btn btn-primary-custom btn-custom" onclick="createWebhook()">
                <i class="fas fa-plus me-1"></i>Nuevo Webhook
            </button>
        </div>
    `;

    if (webhooks.length === 0) {
        html += `
            <div class="text-center py-5">
                <i class="fas fa-webhook fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No hay webhooks configurados</h5>
                <p class="text-muted">Configura webhooks para recibir notificaciones automáticas de eventos de WhatsApp</p>
                <button class="btn btn-primary-custom btn-custom" onclick="createWebhook()">
                    <i class="fas fa-plus me-1"></i>Crear Primer Webhook
                </button>
            </div>
        `;
    } else {
        html += '<div class="row">';
        webhooks.forEach(webhook => {
            const isGlobal = webhook.type === 'global';
            const sessionName = isGlobal ? 'Global' : webhook.sessionId;
            
            html += `
                <div class="col-md-6 mb-3">
                    <div class="session-card">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="mb-0">
                                ${isGlobal ? '<i class="fas fa-globe me-1"></i>' : '<i class="fas fa-mobile-alt me-1"></i>'}
                                ${sessionName}
                            </h6>
                            <span class="status-badge ${webhook.configured ? 'status-connected' : 'status-disconnected'}">
                                ${webhook.configured ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <p class="text-muted small mb-2">
                            <i class="fas fa-link me-1"></i>
                            URL: ${webhook.url ? webhook.url.substring(0, 50) + (webhook.url.length > 50 ? '...' : '') : 'No configurada'}
                        </p>
                        <p class="text-muted small mb-3">
                            <i class="fas fa-bell me-1"></i>
                            Eventos: ${webhook.events ? webhook.events.join(', ') : 'all'}
                        </p>
                        <div class="d-flex gap-2">
                            ${!isGlobal ? `
                                <button class="btn btn-sm btn-outline-primary" onclick="console.log('Botón editar clickeado para:', '${webhook.sessionId}'); editWebhook('${webhook.sessionId}')">
                                    <i class="fas fa-edit me-1"></i>Editar
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteWebhook('${webhook.sessionId}')">
                                    <i class="fas fa-trash me-1"></i>Eliminar
                                </button>
                            ` : `
                                <span class="badge bg-info">Webhook Global</span>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

// Management functions
function createUser() {
    const modal = `
        <div class="modal fade" id="createUserModal" tabindex="-1" style="backdrop-filter: blur(5px);">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Crear Nuevo Usuario</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="createUserForm">
                            <div class="mb-3">
                                <label for="newUsername" class="form-label">Nombre de Usuario</label>
                                <input type="text" class="form-control" id="newUsername" required>
                            </div>
                            <div class="mb-3">
                                <label for="newEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="newEmail" required>
                            </div>
                            <div class="mb-3">
                                <label for="newPassword" class="form-label">Contraseña</label>
                                <input type="password" class="form-control" id="newPassword" required>
                            </div>
                            <div class="mb-3">
                                <label for="newRole" class="form-label">Rol</label>
                                <select class="form-control" id="newRole" required>
                                    <option value="viewer">Viewer</option>
                                    <option value="operator">Operator</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="submitCreateUser()">Crear Usuario</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    const modalElement = new bootstrap.Modal(document.getElementById('createUserModal'));
    modalElement.show();
    
    // Clean up modal when closed
    document.getElementById('createUserModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}

function submitCreateUser() {
    const userData = {
        username: document.getElementById('newUsername').value,
        email: document.getElementById('newEmail').value,
        password: document.getElementById('newPassword').value,
        role: document.getElementById('newRole').value
    };
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    const sessionData = localStorage.getItem('whatsapp_api_session');
    
    // Create authorization token from session data
    let authToken = '';
    if (sessionData) {
        try {
            const data = JSON.parse(sessionData);
            authToken = Buffer.from(JSON.stringify({
                username: data.username,
                role: data.role || 'admin',
                loginTime: data.loginTime
            })).toString('base64');
        } catch (error) {
            console.error('Error parsing session data:', error);
        }
    }
    
    fetch('/api/users', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Usuario creado exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('createUserModal')).hide();
            loadUsersManagement(); // Refresh the users list
        } else {
            showNotification(`Error: ${data.error}`, 'danger');
        }
    })
    .catch(error => {
        console.error('Error creating user:', error);
        showNotification('Error de conexión', 'danger');
    });
}

function editUser(username) {
    showNotification('Función de edición en desarrollo', 'info');
}

function deleteUser(username) {
    if (confirm(`¿Estás seguro de que quieres eliminar el usuario "${username}"?`)) {
        const apiKey = localStorage.getItem('apiKey') || API_KEY;
        const sessionData = localStorage.getItem('whatsapp_api_session');
        
        // Create authorization token from session data
        let authToken = '';
        if (sessionData) {
            try {
                const data = JSON.parse(sessionData);
                authToken = Buffer.from(JSON.stringify({
                    username: data.username,
                    role: data.role || 'admin',
                    loginTime: data.loginTime
                })).toString('base64');
            } catch (error) {
                console.error('Error parsing session data:', error);
            }
        }
        
        fetch(`/api/users/${username}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Usuario eliminado exitosamente', 'success');
                loadUsersManagement(); // Refresh the users list
            } else {
                showNotification(`Error: ${data.error}`, 'danger');
            }
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            showNotification('Error de conexión', 'danger');
        });
    }
}

function createNewSession() {
    const sessionId = prompt('Ingresa el ID para la nueva sesión:');
    if (sessionId && sessionId.trim()) {
        const apiKey = localStorage.getItem('apiKey') || API_KEY;
        
        showLoading('Creando nueva sesión...', true);
        
        fetch('/api/start-session', {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId: sessionId.trim() })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                showNotification(`Sesión "${sessionId}" creada exitosamente`, 'success');
                loadSessionsManagement(); // Refresh the sessions list
            } else {
                showNotification(`Error: ${data.error}`, 'danger');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error creating session:', error);
            showNotification('Error de conexión', 'danger');
        });
    }
}

function viewSession(sessionId) {
    showLoading('Cargando información de la sesión...', true);
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    // Obtener información de la sesión y métricas
    Promise.all([
        fetch(`/api/${sessionId}/status`, {
            headers: { 'X-API-Key': apiKey }
        }),
        fetch(`/api/${sessionId}/webhook`, {
            headers: { 'X-API-Key': apiKey }
        }),
        fetch(`/api/metrics`, {
            headers: { 'X-API-Key': apiKey }
        })
    ])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([sessionData, webhookData, metricsData]) => {
        hideLoading();
        
        const session = sessionData.success ? sessionData : {};
        const webhook = webhookData.success ? webhookData : {};
        const metrics = metricsData.success ? metricsData : {};
        
        const modal = `
            <div class="modal fade" id="viewSessionModal" tabindex="-1" style="backdrop-filter: blur(5px);">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-mobile-alt me-2"></i>Sesión: ${sessionId}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <ul class="nav nav-tabs" id="sessionTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="info-tab" data-bs-toggle="tab" data-bs-target="#info" type="button" role="tab">
                                        <i class="fas fa-info-circle me-1"></i>Información
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="messages-tab" data-bs-toggle="tab" data-bs-target="#messages" type="button" role="tab">
                                        <i class="fas fa-comments me-1"></i>Mensajes
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="webhook-tab" data-bs-toggle="tab" data-bs-target="#webhook" type="button" role="tab">
                                        <i class="fas fa-link me-1"></i>Webhook
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="actions-tab" data-bs-toggle="tab" data-bs-target="#actions" type="button" role="tab">
                                        <i class="fas fa-cogs me-1"></i>Acciones
                                    </button>
                                </li>
                            </ul>
                            
                            <div class="tab-content mt-3" id="sessionTabContent">
                                <!-- Información General -->
                                <div class="tab-pane fade show active" id="info" role="tabpanel">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6><i class="fas fa-signal me-2"></i>Estado de Conexión</h6>
                                            <div class="mb-3">
                                                <span class="badge ${session.connected ? 'bg-success' : 'bg-danger'} fs-6">
                                                    <i class="fas ${session.connected ? 'fa-check-circle' : 'fa-times-circle'} me-1"></i>
                                                    ${session.connected ? 'Conectado' : 'Desconectado'}
                                                </span>
                                            </div>
                                            
                                            <h6><i class="fas fa-phone me-2"></i>Número WhatsApp</h6>
                                            <p class="text-muted">${session.phoneNumber || 'No disponible'}</p>
                                            
                                            <h6><i class="fas fa-clock me-2"></i>Conexión</h6>
                                            <p class="text-muted">${session.connectedAt ? new Date(session.connectedAt).toLocaleString() : 'No conectado'}</p>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <h6><i class="fas fa-chart-bar me-2"></i>Estadísticas</h6>
                                            <div class="row text-center">
                                                <div class="col-6">
                                                    <div class="border rounded p-2 mb-2">
                                                        <h5 class="text-primary mb-0">${metrics.messagesSent || 0}</h5>
                                                        <small class="text-muted">Enviados</small>
                                                    </div>
                                                </div>
                                                <div class="col-6">
                                                    <div class="border rounded p-2 mb-2">
                                                        <h5 class="text-success mb-0">${metrics.messagesReceived || 0}</h5>
                                                        <small class="text-muted">Recibidos</small>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <h6><i class="fas fa-memory me-2"></i>Recursos</h6>
                                            <p class="text-muted">
                                                Memoria: ${metrics.memoryUsage?.rss ? Math.round(metrics.memoryUsage.rss / 1024 / 1024) + ' MB' : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Mensajes Recientes -->
                                <div class="tab-pane fade" id="messages" role="tabpanel">
                                    <div id="recentMessages">
                                        <div class="text-center py-4">
                                            <i class="fas fa-spinner fa-spin fa-2x text-muted mb-3"></i>
                                            <p class="text-muted">Cargando mensajes recientes...</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Configuración Webhook -->
                                <div class="tab-pane fade" id="webhook" role="tabpanel">
                                    ${webhook.webhookUrl ? `
                                        <div class="alert alert-success">
                                            <h6><i class="fas fa-check-circle me-2"></i>Webhook Configurado</h6>
                                            <p class="mb-2"><strong>URL:</strong> ${webhook.webhookUrl}</p>
                                            <p class="mb-0"><strong>Eventos:</strong> ${webhook.events?.join(', ') || 'Todos'}</p>
                                        </div>
                                        <button class="btn btn-outline-primary btn-sm" onclick="editWebhook('${sessionId}')">
                                            <i class="fas fa-edit me-1"></i>Editar Webhook
                                        </button>
                                    ` : `
                                        <div class="alert alert-warning">
                                            <h6><i class="fas fa-exclamation-triangle me-2"></i>Sin Webhook</h6>
                                            <p class="mb-0">No hay webhook configurado para esta sesión</p>
                                        </div>
                                        <button class="btn btn-primary btn-sm" onclick="createWebhook(); bootstrap.Modal.getInstance(document.getElementById('viewSessionModal')).hide();">
                                            <i class="fas fa-plus me-1"></i>Configurar Webhook
                                        </button>
                                    `}
                                </div>
                                
                                <!-- Acciones -->
                                <div class="tab-pane fade" id="actions" role="tabpanel">
                                    <div class="d-grid gap-2">
                                        ${!session.connected ? `
                                            <button class="btn btn-success" onclick="reconnectSession('${sessionId}')">
                                                <i class="fas fa-sync me-2"></i>Reconectar Sesión
                                            </button>
                                        ` : ''}
                                        
                                        <button class="btn btn-info" onclick="getSessionQR('${sessionId}')">
                                            <i class="fas fa-qrcode me-2"></i>Obtener Código QR
                                        </button>
                                        
                                        <button class="btn btn-warning" onclick="restartSession('${sessionId}')">
                                            <i class="fas fa-redo me-2"></i>Reiniciar Sesión
                                        </button>
                                        
                                        <hr>
                                        
                                        <button class="btn btn-danger" onclick="deleteSession('${sessionId}'); bootstrap.Modal.getInstance(document.getElementById('viewSessionModal')).hide();">
                                            <i class="fas fa-trash me-2"></i>Eliminar Sesión
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modal);
        const modalElement = new bootstrap.Modal(document.getElementById('viewSessionModal'));
        modalElement.show();
        
        // Cargar mensajes recientes cuando se seleccione la pestaña
        document.getElementById('messages-tab').addEventListener('click', function() {
            loadRecentMessages(sessionId);
        });
        
        // Clean up modal when closed
        document.getElementById('viewSessionModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    })
    .catch(error => {
        hideLoading();
        console.error('Error loading session details:', error);
        showNotification('Error cargando información de la sesión', 'danger');
    });
}

function deleteSession(sessionId) {
    if (confirm(`¿Estás seguro de que quieres eliminar la sesión "${sessionId}"?`)) {
        const apiKey = localStorage.getItem('apiKey') || API_KEY;
        
        showLoading('Eliminando sesión...', true);
        
        fetch(`/api/logout/${sessionId}`, {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                showNotification(`Sesión "${sessionId}" eliminada exitosamente`, 'success');
                loadSessionsManagement(); // Refresh the sessions list
            } else {
                showNotification(`Error: ${data.error}`, 'danger');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error deleting session:', error);
            showNotification('Error de conexión', 'danger');
        });
    }
}

function createWebhook() {
    // First, get available sessions
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    fetch('/api/metrics/dashboard', {
        headers: { 'X-API-Key': apiKey }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.dashboard.sessions) {
            const sessions = data.dashboard.sessions;
            
            if (sessions.length === 0) {
                showNotification('No hay sesiones disponibles. Crea una sesión primero.', 'warning');
                return;
            }
            
            let sessionOptions = sessions.map(session => 
                `<option value="${session.id || session.sessionId}">${session.id || session.sessionId}</option>`
            ).join('');
            
            const modal = `
                <div class="modal fade" id="createWebhookModal" tabindex="-1" style="backdrop-filter: blur(5px);">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Crear Nuevo Webhook</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="createWebhookForm">
                                    <div class="mb-3">
                                        <label for="webhookSessionId" class="form-label">Session ID</label>
                                        <select class="form-control" id="webhookSessionId" required>
                                            <option value="">Selecciona una sesión</option>
                                            ${sessionOptions}
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label for="webhookUrl" class="form-label">URL del Webhook</label>
                                        <input type="url" class="form-control" id="webhookUrl" required 
                                               placeholder="https://tu-dominio.com/webhook">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Eventos (opcional)</label>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="message-received" id="eventMessage" checked>
                                            <label class="form-check-label" for="eventMessage">
                                                Mensajes recibidos
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="message-delivered" id="eventDelivered">
                                            <label class="form-check-label" for="eventDelivered">
                                                Mensajes entregados
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="message-from-me" id="eventFromMe">
                                            <label class="form-check-label" for="eventFromMe">
                                                Mensajes enviados por mí
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="qr" id="eventQr">
                                            <label class="form-check-label" for="eventQr">
                                                Código QR
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                <button type="button" class="btn btn-primary" onclick="submitCreateWebhook()">Crear Webhook</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modal);
            const modalElement = new bootstrap.Modal(document.getElementById('createWebhookModal'));
            modalElement.show();
            
            // Clean up modal when closed
            document.getElementById('createWebhookModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        } else {
            showNotification('Error obteniendo sesiones disponibles', 'danger');
        }
    })
    .catch(error => {
        console.error('Error getting sessions:', error);
        showNotification('Error de conexión', 'danger');
    });
}

// Función para enviar la actualización del webhook editado
function submitEditWebhook() {
    const sessionId = document.getElementById('editWebhookSessionId').value;
    const webhookUrl = document.getElementById('editWebhookUrl').value;
    
    if (!sessionId || !webhookUrl) {
        showNotification('Por favor completa todos los campos', 'warning');
        return;
    }
    
    // Obtener eventos seleccionados
    const events = [];
    if (document.getElementById('editEventMessage').checked) events.push('message-received');
    if (document.getElementById('editEventDelivered').checked) events.push('message-delivered');
    if (document.getElementById('editEventFromMe').checked) events.push('message-from-me');
    if (document.getElementById('editEventQr').checked) events.push('qr');
    
    showLoading('Actualizando webhook...', true);
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    fetch(`/api/${sessionId}/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        },
        body: JSON.stringify({
            url: webhookUrl,
            events: events.length > 0 ? events : ['all']
        })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            showNotification('Webhook actualizado exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editWebhookModal')).hide();
            loadWebhooksManagement(); // Refresh the webhooks list
        } else {
            showNotification(`Error: ${data.error}`, 'danger');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Error updating webhook:', error);
        showNotification('Error de conexión', 'danger');
    });
}

// Función para cargar mensajes recientes de una sesión
function loadRecentMessages(sessionId) {
    const container = document.getElementById('recentMessages');
    container.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin fa-2x text-muted mb-3"></i>
            <p class="text-muted">Cargando mensajes recientes...</p>
        </div>
    `;
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    fetch(`/api/${sessionId}/messages`, {
        headers: { 'X-API-Key': apiKey }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.messages && data.messages.length > 0) {
            const messagesHtml = data.messages.slice(-20).map(msg => `
                <div class="border rounded p-3 mb-2">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge ${msg.fromMe ? 'bg-primary' : 'bg-success'}">
                            ${msg.fromMe ? 'Enviado' : 'Recibido'}
                        </span>
                        <small class="text-muted">${new Date(msg.timestamp * 1000).toLocaleString()}</small>
                    </div>
                    <p class="mb-1"><strong>De:</strong> ${msg.from}</p>
                    <p class="mb-0">${msg.body}</p>
                </div>
            `).join('');
            
            container.innerHTML = messagesHtml;
        } else {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-inbox fa-2x text-muted mb-3"></i>
                    <p class="text-muted">No hay mensajes recientes</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error loading messages:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>Error cargando mensajes
            </div>
        `;
    });
}

// Funciones adicionales para las acciones de sesión
function reconnectSession(sessionId) {
    showLoading('Reconectando sesión...', true);
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    fetch(`/api/${sessionId}/restart`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey }
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            showNotification('Sesión reconectándose...', 'success');
            bootstrap.Modal.getInstance(document.getElementById('viewSessionModal')).hide();
        } else {
            showNotification(`Error: ${data.error}`, 'danger');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Error reconnecting session:', error);
        showNotification('Error de conexión', 'danger');
    });
}

function getSessionQR(sessionId) {
    showLoading('Obteniendo código QR...', true);
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    fetch(`/api/${sessionId}/qr`, {
        headers: { 'X-API-Key': apiKey }
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success && data.qr) {
            const qrModal = `
                <div class="modal fade" id="qrModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Código QR - ${sessionId}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body text-center">
                                <img src="${data.qr}" class="img-fluid" alt="QR Code">
                                <p class="mt-3 text-muted">Escanea este código QR con WhatsApp</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', qrModal);
            const modalElement = new bootstrap.Modal(document.getElementById('qrModal'));
            modalElement.show();
            
            document.getElementById('qrModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
        } else {
            showNotification(data.error || 'No se pudo obtener el código QR', 'warning');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Error getting QR:', error);
        showNotification('Error de conexión', 'danger');
    });
}

function restartSession(sessionId) {
    if (confirm(`¿Estás seguro de que quieres reiniciar la sesión "${sessionId}"?`)) {
        reconnectSession(sessionId);
    }
}

function submitCreateWebhook() {
    const sessionId = document.getElementById('webhookSessionId').value;
    const webhookUrl = document.getElementById('webhookUrl').value;
    
    if (!sessionId) {
        showNotification('Por favor selecciona una sesión', 'warning');
        return;
    }
    
    if (!webhookUrl) {
        showNotification('Por favor ingresa una URL de webhook', 'warning');
        return;
    }
    
    // Get selected events
    const events = [];
    if (document.getElementById('eventMessage')?.checked) events.push('message-received');
    if (document.getElementById('eventDelivered')?.checked) events.push('message-delivered');
    if (document.getElementById('eventFromMe')?.checked) events.push('message-from-me');
    if (document.getElementById('eventQr')?.checked) events.push('qr');
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    showLoading('Creando webhook...', true);
    
    // Log para debug
    console.log('Creating webhook:', {
        sessionId,
        webhookUrl,
        events: events.length > 0 ? events : ['all']
    });
    
    fetch(`/api/${sessionId}/webhook`, {
        method: 'POST',
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            url: webhookUrl,
            events: events.length > 0 ? events : ['all']
        })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            showNotification('Webhook creado exitosamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('createWebhookModal')).hide();
            loadWebhooksManagement(); // Refresh the webhooks list
        } else {
            showNotification(`Error: ${data.error}`, 'danger');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Error creating webhook:', error);
        showNotification('Error de conexión', 'danger');
    });
}

function editWebhook(sessionId) {
    // Obtener configuración actual del webhook
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    fetch(`/api/${sessionId}/webhook`, {
        method: 'GET',
        headers: {
            'X-API-Key': apiKey
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.webhookUrl) {
            // Crear modal de edición directamente
            const modal = `
                <div class="modal fade" id="editWebhookModal" tabindex="-1" style="backdrop-filter: blur(5px);">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Editar Webhook - ${sessionId}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editWebhookForm">
                                    <input type="hidden" id="editWebhookSessionId" value="${sessionId}">
                                    <div class="mb-3">
                                        <label for="editWebhookUrl" class="form-label">URL del Webhook</label>
                                        <input type="url" class="form-control" id="editWebhookUrl" required 
                                               value="${data.webhookUrl}" placeholder="https://tu-dominio.com/webhook">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Eventos</label>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="message-received" 
                                                   id="editEventMessage" ${data.events?.includes('message-received') || data.events?.includes('all') ? 'checked' : ''}>
                                            <label class="form-check-label" for="editEventMessage">
                                                Mensajes recibidos
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="message-delivered" 
                                                   id="editEventDelivered" ${data.events?.includes('message-delivered') || data.events?.includes('all') ? 'checked' : ''}>
                                            <label class="form-check-label" for="editEventDelivered">
                                                Mensajes entregados
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="message-from-me" 
                                                   id="editEventFromMe" ${data.events?.includes('message-from-me') || data.events?.includes('all') ? 'checked' : ''}>
                                            <label class="form-check-label" for="editEventFromMe">
                                                Mensajes enviados por mí
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="qr" 
                                                   id="editEventQr" ${data.events?.includes('qr') || data.events?.includes('all') ? 'checked' : ''}>
                                            <label class="form-check-label" for="editEventQr">
                                                Código QR
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                <button type="button" class="btn btn-primary" onclick="submitEditWebhook()">Actualizar Webhook</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modal);
            const modalElement = new bootstrap.Modal(document.getElementById('editWebhookModal'));
            modalElement.show();
            
            // Clean up modal when closed
            document.getElementById('editWebhookModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
            
            // Wait for modal to be fully rendered
            setTimeout(function() {
                console.log('⏰ Intentando rellenar el modal...');
                    
                    // Verificar que los elementos existen antes de usarlos
                    const sessionSelect = document.getElementById('webhookSessionId');
                    const urlInput = document.getElementById('webhookUrl');
                    const eventMessage = document.getElementById('eventMessage');
                    const eventDelivered = document.getElementById('eventDelivered');
                    const eventFromMe = document.getElementById('eventFromMe');
                    const eventQr = document.getElementById('eventQr');
                    
                    console.log('🔍 Elementos encontrados:', {
                        sessionSelect: !!sessionSelect,
                        urlInput: !!urlInput,
                        eventMessage: !!eventMessage,
                        eventDelivered: !!eventDelivered,
                        eventFromMe: !!eventFromMe,
                        eventQr: !!eventQr
                    });
                    
                    if (sessionSelect && urlInput) {
                        sessionSelect.value = sessionId;
                        urlInput.value = data.webhookUrl;
                        
                        // Marcar los eventos actuales
                        const events = data.events || [];
                        console.log('📋 Eventos a marcar:', events);
                        
                        if (eventMessage) eventMessage.checked = events.includes('message-received');
                        if (eventDelivered) eventDelivered.checked = events.includes('message-delivered');
                        if (eventFromMe) eventFromMe.checked = events.includes('message-from-me');
                        if (eventQr) eventQr.checked = events.includes('qr');
                        
                        console.log('✅ Modal rellenado exitosamente');
                    } else {
                        console.error('❌ No se encontraron los elementos del modal');
                        showNotification('Error: No se pudo acceder al formulario', 'danger');
                    }
                }, 200); // Aumenté el timeout a 200ms
                
            } else {
                console.log('⚠️ Respuesta exitosa pero sin webhookUrl');
                showNotification('No hay webhook configurado para esta sesión', 'warning');
            }
        } else {
            console.log('❌ Respuesta no exitosa:', data);
            showNotification(data.error || 'Error obteniendo webhook', 'danger');
        }
    })
    .catch(error => {
        console.error('💥 Error completo:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        showNotification(`Error de conexión: ${error.message}`, 'danger');
    });
}

function deleteWebhook(sessionId) {
    if (confirm(`¿Estás seguro de que quieres eliminar el webhook para la sesión "${sessionId}"?`)) {
        const apiKey = localStorage.getItem('apiKey') || API_KEY;
        
        fetch(`/api/${sessionId}/webhook`, {
            method: 'DELETE',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Webhook eliminado exitosamente', 'success');
                loadWebhooksManagement(); // Refresh the webhooks list
            } else {
                showNotification(`Error: ${data.error}`, 'danger');
            }
        })
        .catch(error => {
            console.error('Error deleting webhook:', error);
            showNotification('Error de conexión', 'danger');
        });
    }
}