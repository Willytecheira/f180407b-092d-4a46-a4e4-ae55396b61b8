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
    const container = document.getElementById('sessionsContainer');
    
    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted p-4">
                <i class="fas fa-mobile-alt fa-3x mb-3"></i>
                <p>No hay sesiones disponibles</p>
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

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'block' : 'none';
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
        
        // Handle navigation
        const href = this.getAttribute('href');
        switch(href) {
            case '#dashboard':
                // Already on dashboard
                break;
            case '#sessions':
                window.location.href = '/admin.html';
                break;
            case '#users':
                window.location.href = '/users.html';
                break;
            case '#system':
                window.location.href = '/system.html';
                break;
        }
    });
});