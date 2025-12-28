import { PrismaUserRepository } from '../../infrastructure/auth/repositories/prisma-user.repository';
import { BcryptHasher } from '../../infrastructure/auth/providers/bcrypt.hasher';
import { JwtTokenService } from '../../infrastructure/auth/providers/jwt.token';
import { AuthApplication } from '../../application/auth/auth.application';
import { AuthService } from '../../application/services/auth.service';
import { AuthController } from '../../presentation/controllers/auth.controller';
import { OAuthController } from '../../presentation/controllers/oauth.controller';
import { TokenService, PasswordHasher } from '../../domain/shared/ports/security';
import { RAGApplication } from '../../application/rag/rag.application';
import { RAGService } from '../../application/services/rag.service';
import { RAGController } from '../../presentation/controllers/rag.controller';
import { PrismaConversationRepository } from '../rag/repositories/prisma-conversation.repository';
import { PostgresDocumentVectorRepository } from '../rag/repositories/postgres-document-vector.repository';
import { PrismaProcessedFileRepository } from '../rag/repositories/prisma-processed-file.repository';
import { OpenAIEmbeddingsProvider } from '../rag/providers/openai-embeddings.provider';
import { OpenAIChatProvider } from '../rag/providers/openai-chat.provider';
import { SimpleChunker } from '../rag/utils/chunker';
import { closePool } from '../db/pg';
import { ConsoleLogger } from '../logger/ConsoleLogger';
import { AuthMiddleware } from '../../presentation/middleware/auth.middleware';
import { DocumentSourcesApplication } from '../../application/document-sources/document-sources.application';
import { DocumentSourcesController } from '../../presentation/controllers/document-sources.controller';
import { PrismaDocumentSourceRepository } from '../document-sources/repositories/prisma-document-source.repository';
import { GoogleDriveProvider } from '../document-sources/providers/google-drive.provider';
import { DropboxProvider } from '../document-sources/providers/dropbox.provider';
import { OneDriveProvider } from '../document-sources/providers/onedrive.provider';
import { TrackedFilesApplication } from '../../application/tracked-files/tracked-files.application';
import { TrackedFilesController } from '../../presentation/controllers/tracked-files.controller';
import { PrismaTrackedFileRepository } from '../tracked-files/repositories/prisma-tracked-file.repository';
import { RagSyncService } from '../../application/services/rag-sync.service';
import { envs } from '../../config';
import { prisma } from '../db/prisma';

type ProviderFactory<T> = (container: Container) => T;

interface Provider<T> {
  factory: ProviderFactory<T>;
  singleton: boolean;
  instance?: T;
}

export class Container {
  private static instance: Container;
  private readonly providers = new Map<string, Provider<unknown>>();
  private configured = false;

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register<T>(key: string, factory: ProviderFactory<T>, options: { singleton?: boolean } = {}): void {
    this.providers.set(key, {
      factory,
      singleton: options.singleton ?? true,
    });
  }

  resolve<T>(key: string): T {
    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error(`Dependency ${key} not found`);
    }

    if (provider.singleton) {
      if (provider.instance === undefined) {
        provider.instance = provider.factory(this);
      }
      return provider.instance as T;
    }

    return provider.factory(this) as T;
  }

  configure(): void {
    if (this.configured) {
      return;
    }

    console.log('[Container] Configurando dependencias...');
    console.log('[Container] Usando OpenAI para chat y embeddings');

    try {
      // Shared infrastructure
      this.register<ConsoleLogger>('Logger', () => new ConsoleLogger(), { singleton: true });
      
      // LLM Providers - OpenAI
      if (!envs.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY es requerida en el archivo .env');
      }
      this.register('ChatProvider', () => new OpenAIChatProvider(envs.OPENAI_API_KEY, envs.OPENAI_CHAT_MODEL), { singleton: true });
      this.register('EmbeddingsProvider', () => new OpenAIEmbeddingsProvider(envs.OPENAI_API_KEY, envs.OPENAI_EMBEDDING_MODEL), { singleton: true });

      // Auth
      this.register<PrismaUserRepository>('UserRepository', () => new PrismaUserRepository());
      this.register<PasswordHasher>('PasswordHasher', () => new BcryptHasher());
      this.register<TokenService>('TokenService', () => new JwtTokenService(), { singleton: true });
      this.register<AuthApplication>('AuthApplication', (c) =>
        new AuthApplication(
          c.resolve<PrismaUserRepository>('UserRepository'),
          c.resolve<PasswordHasher>('PasswordHasher'),
          c.resolve<TokenService>('TokenService')
        )
      );
      this.register<AuthService>('AuthService', (c) => new AuthService(c.resolve<AuthApplication>('AuthApplication')));
      this.register<AuthController>('AuthController', (c) => new AuthController(c.resolve<AuthService>('AuthService')));

      // Document Sources
      this.register<PrismaDocumentSourceRepository>('DocumentSourceRepository', () => new PrismaDocumentSourceRepository(prisma));
      this.register<GoogleDriveProvider>('GoogleDriveProvider', () => new GoogleDriveProvider(), { singleton: true });
      this.register<DropboxProvider>('DropboxProvider', () => new DropboxProvider(), { singleton: true });
      this.register<OneDriveProvider>('OneDriveProvider', () => new OneDriveProvider(), { singleton: true });
      
      this.register<DocumentSourcesApplication>('DocumentSourcesApplication', (c) =>
        new DocumentSourcesApplication(
          c.resolve<PrismaDocumentSourceRepository>('DocumentSourceRepository'),
          c.resolve<GoogleDriveProvider>('GoogleDriveProvider'),
          c.resolve<DropboxProvider>('DropboxProvider'),
          c.resolve<OneDriveProvider>('OneDriveProvider'),
          envs.ENCRYPTION_KEY || 'default-key-change-in-production'
        )
      );
      
      this.register<DocumentSourcesController>('DocumentSourcesController', (c) =>
        new DocumentSourcesController(c.resolve<DocumentSourcesApplication>('DocumentSourcesApplication'))
      );

      // Tracked Files
      this.register<PrismaTrackedFileRepository>('TrackedFileRepository', () => new PrismaTrackedFileRepository(prisma));
      this.register<TrackedFilesApplication>('TrackedFilesApplication', (c) =>
        new TrackedFilesApplication(
          c.resolve<PrismaTrackedFileRepository>('TrackedFileRepository'),
          c.resolve<PrismaDocumentSourceRepository>('DocumentSourceRepository')
        )
      );
      this.register<RagSyncService>('RagSyncService', (c) =>
        new RagSyncService(
          c.resolve<PrismaTrackedFileRepository>('TrackedFileRepository'),
          c.resolve<PrismaDocumentSourceRepository>('DocumentSourceRepository'),
          c.resolve<DocumentSourcesApplication>('DocumentSourcesApplication'),
          c.resolve<RAGApplication>('RagApplication')
        )
      );
      this.register<TrackedFilesController>('TrackedFilesController', (c) =>
        new TrackedFilesController(
          c.resolve<TrackedFilesApplication>('TrackedFilesApplication'),
          c.resolve<RagSyncService>('RagSyncService')
        )
      );

      // OAuth
      this.register<OAuthController>('OAuthController', () => new OAuthController());

      // RAG
      this.register<PrismaConversationRepository>('ConversationRepository', () => new PrismaConversationRepository());
      this.register<PostgresDocumentVectorRepository>('DocumentVectorRepository', () => new PostgresDocumentVectorRepository());
      this.register<PrismaProcessedFileRepository>('ProcessedFileRepository', () => new PrismaProcessedFileRepository());
      this.register<SimpleChunker>('Chunker', () => new SimpleChunker());
      
      this.register<RAGApplication>('RagApplication', (c) =>
        new RAGApplication(
          c.resolve<PrismaConversationRepository>('ConversationRepository'),
          c.resolve<PostgresDocumentVectorRepository>('DocumentVectorRepository'),
          c.resolve<PrismaProcessedFileRepository>('ProcessedFileRepository'),
          c.resolve('EmbeddingsProvider'),
          c.resolve('ChatProvider'),
          c.resolve<SimpleChunker>('Chunker'),
          c.resolve<PrismaDocumentSourceRepository>('DocumentSourceRepository'),
          c.resolve<GoogleDriveProvider>('GoogleDriveProvider'),
          c.resolve<DropboxProvider>('DropboxProvider'),
          c.resolve<OneDriveProvider>('OneDriveProvider'),
          envs.ENCRYPTION_KEY || 'default-key-change-in-production'
        )
      );
      
      this.register<RAGService>('RAGService', (c) => new RAGService(c.resolve<RAGApplication>('RagApplication'), () => closePool()));
      this.register<RAGController>('RAGController', (c) => new RAGController(c.resolve<RAGService>('RAGService')));

      // Configure middleware
      AuthMiddleware.configure(this.resolve<TokenService>('TokenService'));

      this.configured = true;
      console.log('[Container] Configuración completada exitosamente');
    } catch (error) {
      console.error('[Container] Error en configuración:', error);
      throw error;
    }
  }
}
