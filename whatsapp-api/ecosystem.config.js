module.exports = {
  apps: [
    {
      name: 'whatsapp-api',
      script: 'server.js',
      cwd: '/root/whatsapp-api/whatsapp-api',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        API_KEY: 'whatsapp-api-key-2024',
        SERVER_IP: 'https://docker.website',
        SESSIONS_DIR: './sessions',
        CACHE_DIR: './.wwebjs_cache',
        AUTH_DIR: './.wwebjs_auth',
        DISABLE_HTTPS: 'false',
        FORCE_HTTP: 'false',
        SOCKET_IO_ENABLED: 'true',
        DASHBOARD_REFRESH_INTERVAL: '30000'
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      listen_timeout: 3000,
      source_map_support: false,
      instance_var: 'INSTANCE_ID'
    }
  ]
};