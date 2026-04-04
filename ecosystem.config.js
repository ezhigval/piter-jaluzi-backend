module.exports = {
  apps: [{
    name: 'piter-jaluzi-back',
    script: 'src/index.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Окружение
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Логи
    output: './logs/out.log',
    error: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Авто-рестарт
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Перезапуск при ошибках
    restart_delay: 4000,
    max_restarts: 10
  }]
};
