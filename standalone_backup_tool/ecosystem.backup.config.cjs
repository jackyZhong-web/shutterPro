module.exports = {
  apps: [
    {
      name: "shutterpro-backup",
      script: "./linux_pm2_backup.js",
      cwd: __dirname,
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      env: {
        BACKUP_CONFIG_PATH: "./linux_pm2_config.json"
      }
    }
  ]
}
