import { envs } from './config/envs';
import { AppRoutes } from './presentation/routes';
import { Server } from './presentation/server';
import { Container } from './infrastructure/configuration/container';

(async () => {
  main();
})();

async function main() {
  try {
    console.log('🚀 Iniciando servidor...');
    
    const container = Container.getInstance();
    container.configure();

    const server = new Server({
      port: envs.PORT,
      routes: AppRoutes.routes,
    });

    server.start();
    console.log('✅ Servidor iniciado correctamente');
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}