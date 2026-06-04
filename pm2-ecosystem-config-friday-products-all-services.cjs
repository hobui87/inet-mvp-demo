// PM2 ecosystem — chạy từ ~/friday-products/
// pm2 start ecosystem.config.cjs
// pm2 reload ecosystem.config.cjs --update-env

module.exports = {
  apps: [
    {
      name: 'hub',
      script: './friday-demo-hub-server-plans-static-and-product-proxy.js',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'domain-reputation',
      script: 'hono-domain-reputation-api-server.js',
      cwd: './products/domain-reputation',
      node_args: '--env-file .env',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'email-auth-checker',
      script: 'hono-email-auth-checker-api-server.js',
      cwd: './products/email-auth-checker',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'ssl-health-dashboard',
      script: 'hono-ssl-health-dashboard-api-server.js',
      cwd: './products/ssl-health-dashboard',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'ip-reputation-checker',
      script: 'hono-ip-reputation-api-server.js',
      cwd: './products/ip-reputation-checker',
      env: { NODE_ENV: 'production' },
    },
  ],
};
