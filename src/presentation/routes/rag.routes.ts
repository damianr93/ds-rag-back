import { Router } from 'express';
import { Container } from '../../infrastructure/configuration/container';
import { RAGController } from '../controllers/rag.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

export class RAGRoutes {
  static get routes(): Router {
    const router = Router();
    const container = Container.getInstance();
    const controller = container.resolve<RAGController>('RAGController');

    router.get('/health', controller.healthCheck);

    router.use(AuthMiddleware.validateJWT);

    // Rate limiting para operaciones con AI
    router.post('/ask', RateLimitMiddleware.ai, controller.askQuestion);
    router.post('/conversation', controller.createConversation);
    router.get('/conversation/:conversationId/history', controller.getConversationHistory);

    router.get('/me/conversations', controller.getUserConversations);
    router.post('/conversation/delete', controller.desactiveConversation);
    router.put('/conversation/:conversationId/update-title', controller.updateConversationTitle);

    router.post('/process/directory', controller.processDirectory);
    router.post('/process/file', controller.processFile);
    router.post('/process-file-from-source', controller.processFileFromSource);

    router.get('/stats', controller.getStats);
    router.post('/utils/embedding', controller.generateEmbedding);
    router.post('/utils/search', controller.searchSimilar);

    router.delete('/admin/clear', controller.clearDatabase);

    return router;
  }
}
