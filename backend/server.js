const { env } = require('./src/config/env');
const { createApp } = require('./src/app');

const { app, lifecycleState } = createApp();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`✅ Backend rodando na porta ${env.PORT}`);
  console.log('🔗 Endpoints: GET /health | POST /api/contact | POST /api/client-auth/login');
});

function gracefulShutdown(signal) {
  console.log(`📴 Sinal ${signal} recebido. Encerrando servidor HTTP...`);
  lifecycleState.isShuttingDown = true;

  server.close((error) => {
    if (error) {
      console.error('❌ Erro ao encerrar servidor:', error);
      process.exit(1);
    }

    console.log('✅ Servidor encerrado com sucesso.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⏱️ Timeout no graceful shutdown. Forçando saída.');
    process.exit(1);
  }, 10000).unref();
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});
