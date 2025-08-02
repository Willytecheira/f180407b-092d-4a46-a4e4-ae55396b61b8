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
        showLoading('Cargando datos del dashboard...', true);
        
        const apiKey = localStorage.getItem('apiKey') || API_KEY;
        const response = await fetch(`${BASE_URL}/api/metrics/dashboard`, {
            headers: {
                'X-API-Key': apiKey
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
        hideLoading();
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
                                <button class="btn btn-sm btn-outline-primary" onclick="editWebhook('${webhook.sessionId}')">
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
    showNotification('Función de vista de sesión en desarrollo', 'info');
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
                                            <input class="form-check-input" type="checkbox" value="message" id="eventMessage" checked>
                                            <label class="form-check-label" for="eventMessage">
                                                Mensajes nuevos
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
    if (document.getElementById('eventMessage')?.checked) events.push('message');
    if (document.getElementById('eventQr')?.checked) events.push('qr');
    
    const apiKey = localStorage.getItem('apiKey') || API_KEY;
    
    showLoading('Creando webhook...', true);
    
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
    showNotification('Función de edición de webhook en desarrollo', 'info');
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