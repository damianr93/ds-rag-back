import { Request, Response } from "express";
import { RAGApplication } from "../../application/rag/rag.application";


type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    email?: string;
    name?: string;
    role?: string;
  };
};

export class RAGController {
  constructor(public readonly ragService: RAGApplication) { }

  // ✅ Chatbot habilitado para todos los usuarios
  // (Restricción de emails eliminada)

  // Handler de errores central del controller: logueo y devuelvo 500 genérico con mensaje útil.
  private handleError = (error: unknown, res: Response) => {
    console.error("❌ RAG Controller Error:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";

    return res.status(500).json({
      success: false,
      error: "Error procesando solicitud RAG",
      message,
      timestamp: new Date().toISOString(),
    }); 
  };

  /**
   * ENDPOINTS PRINCIPALES DE RAG
   */

  // Endpoint principal: pregunta con RAG + persistencia de conversación.
  // Requiere: question (string), conversationId (number). El userId viene del JWT (req.user.id).
  askQuestion = async (req: Request, res: Response) => {
    try {
      const authUserId = (req as AuthenticatedRequest).user?.id; // <- del middleware
      const { question, conversationId } = req.body;

      if (!authUserId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Falta usuario autenticado",
          timestamp: new Date().toISOString(),
        }); // //! si esto pasa, el middleware no corrió o falló
      }

      // Validaciones mínimas de payload.
      if (!question?.trim()) {
        return res.status(400).json({
          success: false,
          error: "La pregunta es requerida",
          message: "Debe proporcionar una pregunta válida",
        }); // //! estandarizar validaciones con un schema (zod/yup) para evitar repetición
      }

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          error: "conversationId es requerido",
          message: "Debe proporcionar conversationId",
        });
      }


      const result = await this.ragService.askWithRAG(
        question,
        Number(conversationId),
        authUserId
      );

      return res.json({
        success: true,
        data: {
          response: result.content,
          conversationId: Number(conversationId),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * ENDPOINTS DE GESTIÓN DE CONVERSACIONES
   */

  // Crea una conversación vacía con título (para organizar hilos).
  // El userId viene del JWT (req.user.id), no del body.
  createConversation = async (req: Request, res: Response) => {
    try {
      const authUserId = (req as AuthenticatedRequest).user?.id;
      const { title } = req.body;

      if (!authUserId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Falta usuario autenticado",
          timestamp: new Date().toISOString(),
        });
      }

      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          error: "title es requerido",
          message: "Debe proporcionar title",
        }); // //! validar longitud máxima de title (ej. 120 chars) y normalizar espacios
      }

      const conversationId = await this.ragService.createConversation(
        authUserId,
        title.trim()
      );


      return res.status(201).json({
        success: true,
        data: {
          conversationId,
          title,
          userId: authUserId,
          createdAt: new Date().toISOString(),
        },
        message: "Conversación creada exitosamente",
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Devuelve el historial completo (orden cronológico ascendente).
  // (Opcional futuro) validar que la conversación pertenece al usuario autenticado.
  getConversationHistory = async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;

      if (!conversationId || isNaN(Number(conversationId))) {
        return res.status(400).json({
          success: false,
          error: "conversationId inválido",
          message: "Debe proporcionar un conversationId válido",
        });
      }

      // //! opcional: autorizar que la conversación pertenezca a req.user.id

      const messages = await this.ragService.getConversationHistory(
        Number(conversationId)
      );

      return res.json({
        success: true,
        data: {
          conversationId: Number(conversationId),
          messages,
          totalMessages: messages.length,
        },
      }); // //! considerar paginación/limit para hilos muy largos
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Lista de conversaciones del usuario autenticado (ordenadas por fecha desc).
  // Ya no leo :userId de params; uso req.user.id del token.
  getUserConversations = async (req: Request, res: Response) => {
    try {
      const authUserId = (req as AuthenticatedRequest).user?.id;

      if (!authUserId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Falta usuario autenticado",
          timestamp: new Date().toISOString(),
        });
      }

      const conversations = await this.ragService.getUserConversations(
        authUserId
      );

      return res.json({
        success: true,
        data: {
          userId: authUserId,
          conversations,
          totalConversations: conversations.length,
        },
      }); // //! agregar paginación y filtros (por título, fecha) si crece
    } catch (error) {
      this.handleError(error, res);
    }
  };


  desactiveConversation = async (req: Request, res: Response) => {
    try {
      const authUserId = (req as AuthenticatedRequest).user?.id;

      if (!authUserId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Falta usuario autenticado",
          timestamp: new Date().toISOString(),
        });
      }
      const { conversationId } = req.body;

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          error: "conversation id is required",
          message: "Debe proporcionar el id de la conversacion a eliminar"
        });
      };
      const success = await this.ragService.deactivateConversation(conversationId);

      if (!success) {
        return res.status(400).json({
          success: false,
          error: "the method return false",
          message: "El metodo retorno falso"
        });
      };

      return res.status(200).json({
        success: true,
        message: 'Conversacion desactivada'

      })

    } catch (error) {
      this.handleError(error, res);
    }
  }


  /**
   * ENDPOINTS DE PROCESAMIENTO DE DOCUMENTOS
   */

  // Procesa todos los archivos soportados del directorio dado.
  processDirectory = async (req: Request, res: Response) => {
    try {
      const { directoryPath, extensions } = req.body;

      if (!directoryPath?.trim()) {
        return res.status(400).json({
          success: false,
          error: "directoryPath es requerido",
          message: "Debe proporcionar la ruta del directorio",
        }); // //! validar que directoryPath esté dentro de una raíz permitida (evitar path traversal)
      }


      const result = await this.ragService.processDirectory(
        directoryPath,
        extensions
      );

      const success = result.processed > 0 || result.skipped > 0;
      const statusCode = success ? 200 : 422; // 422 si no se pudo procesar nada útil

      return res.status(statusCode).json({
        success,
        data: {
          stats: {
            processed: result.processed,
            skipped: result.skipped,
            errors: result.errors,
            total: result.processed + result.skipped + result.errors,
          },
          details: result.details,
        },
        message: success
          ? `Procesamiento completado: ${result.processed} procesados, ${result.skipped} omitidos, ${result.errors} errores`
          : "No se procesaron archivos",
      }); // //! si el procesamiento fuese pesado, considerar colas y responder 202 + jobId
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Procesa un archivo puntual por ruta absoluta/relativa.
  processFile = async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;

      if (!filePath?.trim()) {
        return res.status(400).json({
          success: false,
          error: "filePath es requerido",
          message: "Debe proporcionar la ruta del archivo",
        }); // //! normalizar y validar ruta (path.normalize) y baseDir permitida
      }

      const result = await this.ragService.processFile(filePath.trim());

      if (result.success) {
        return res.json({
          success: true,
          data: {
            filename: filePath.split("/").pop(),
            chunksCount: result.chunksCount,
            processedAt: new Date().toISOString(),
          },
          message: result.message,
        });
      } else {
        const statusCode = result.message.includes("ya fue procesado")
          ? 409
          : 422; // 409: conflicto por duplicado

        return res.status(statusCode).json({
          success: false,
          error: "Error procesando archivo",
          message: result.message,
        });
      }
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * ENDPOINTS DE ADMINISTRACIÓN
   */

  // Resumen de estado: totales y detalle de archivos procesados.
  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.ragService.getStats();

      return res.json({
        success: true,
        data: {
          summary: {
            totalFiles: stats.totalFiles,
            totalChunks: stats.totalChunks,
            averageChunksPerFile:
              stats.totalFiles > 0
                ? Math.round(stats.totalChunks / stats.totalFiles)
                : 0,
          },
          files: stats.files.map((file: any) => ({
            filename: file.filename,
            chunksCount: file.chunks_count,
            processedAt: file.processed_at,
          })),
        },
        message: "Estadísticas obtenidas exitosamente",
      }); // //! si hay muchos archivos, paginar/limitar la lista para no romper el payload
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Health check simple: prueba embedding + DB.
  healthCheck = async (req: Request, res: Response) => {
    try {
      // Verifico conectividad a Ollama y leo stats de DB.
      const testEmbedding = await this.ragService.generateEmbedding("test"); // //! esto puede tardar: agregar timeout o shortcut configurable
      const stats = await this.ragService.getStats();

      return res.json({
        success: true,
        status: "healthy",
        data: {
          services: {
            database: "connected",
            ollama: "connected",
          },
          metrics: {
            embeddingDimensions: testEmbedding.length,
            totalChunks: stats.totalChunks,
            totalFiles: stats.totalFiles,
          },
          timestamp: new Date().toISOString(),
        },
        message: "Todos los servicios funcionando correctamente",
      });
    } catch (error) {
      console.error("❌ Health check falló:", error);

      return res.status(503).json({
        success: false,
        status: "unhealthy",
        error: "Servicios no disponibles",
        message: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      }); // //! opcional: devolver detalle de qué chequeo falló (db/ollama) con flags booleanos
    }
  };

  // Borra vectores y archivos procesados (uso dev).
  clearDatabase = async (req: Request, res: Response) => {
    try {
      // En producción, chequear permisos/roles acá usando req.user.role si lo tenés.
      const { confirm } = req.body;

      if (confirm !== "YES_DELETE_EVERYTHING") {
        return res.status(400).json({
          success: false,
          error: "Confirmación requerida",
          message:
            "Debe enviar { confirm: 'YES_DELETE_EVERYTHING' } para confirmar",
        }); // //! exigir auth de admin + 2FA si aplica
      }

      await this.ragService.clearDatabase();


      return res.json({
        success: true,
        data: {
          clearedAt: new Date().toISOString(),
        },
        message: "Base de datos limpiada exitosamente",
        warning: "Todos los vectores y archivos procesados han sido eliminados",
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * ENDPOINTS DE UTILIDAD (OPCIONALES)
   */

  // Genera embedding de un texto (para pruebas y debugging).
  generateEmbedding = async (req: Request, res: Response) => {
    try {
      const { text } = req.body;

      if (!text?.trim()) {
        return res.status(400).json({
          success: false,
          error: "text es requerido",
          message: "Debe proporcionar texto para generar embedding",
        }); // //! limitar tamaño máximo de texto para evitar saturar el modelo
      }

      const embedding = await this.ragService.generateEmbedding(text.trim());

      return res.json({
        success: true,
        data: {
          text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
          embedding,
          dimensions: embedding.length,
          generatedAt: new Date().toISOString(),
        },
        message: "Embedding generado exitosamente",
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Busca similares a partir de texto o embedding crudo (testing).
  searchSimilar = async (req: Request, res: Response) => {
    try {
      const { text, embedding, k = 5 } = req.body;

      if (!text && !embedding) {
        return res.status(400).json({
          success: false,
          error: "text o embedding son requeridos",
          message: "Debe proporcionar texto o embedding para buscar",
        });
      }

      let finalEmbedding = embedding;
      if (!finalEmbedding && text) {
        finalEmbedding = await this.ragService.generateEmbedding(text);
      }

      const similarDocs = await this.ragService.searchSimilarDocuments(
        finalEmbedding,
        k
      );

      return res.json({
        success: true,
        data: {
          query: text || "embedding proporcionado",
          similarDocuments: similarDocs,
          count: similarDocs.length,
          maxResults: k,
        },
        message: "Búsqueda completada exitosamente",
      }); // //! validar que k sea número razonable (ej. 1..50) para evitar scans pesados
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Actualizar el título de una conversación
   */
  updateConversationTitle = async (req: any, res: any) => {
    try {
      const authUserId = req.user?.id;
      const { conversationId } = req.params;
      const { title } = req.body;

      if (!authUserId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Usuario no autenticado",
        });
      }

      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          error: "title es requerido",
          message: "Debe proporcionar un título",
        });
      }

      await this.ragService.updateConversationTitle(
        Number(conversationId),
        authUserId,
        title.trim()
      );

      return res.json({
        success: true,
        data: {
          conversationId: Number(conversationId),
          title: title.trim(),
          updatedAt: new Date().toISOString(),
        },
        message: "Título de conversación actualizado exitosamente",
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Procesar archivo desde fuente externa (Drive, Dropbox, OneDrive)
   */
  processFileFromSource = async (req: Request, res: Response) => {
    try {
      const authUserId = (req as AuthenticatedRequest).user?.id;
      const { sourceId, fileId, fileName } = req.body;

      if (!authUserId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Falta usuario autenticado",
          timestamp: new Date().toISOString(),
        });
      }

      if (!sourceId || !fileId) {
        return res.status(400).json({
          success: false,
          error: "sourceId y fileId son requeridos",
          message: "Debe proporcionar sourceId y fileId",
        });
      }

      const result = await this.ragService.processFileFromSource(
        authUserId,
        Number(sourceId),
        fileId,
        fileName
      );

      if (result.success) {
        return res.json({
          success: true,
          data: {
            filename: fileName || fileId,
            chunksCount: result.chunksCount,
            processedAt: new Date().toISOString(),
          },
          message: result.message,
        });
      } else {
        const statusCode = result.message.includes("ya fue procesado") ? 409 : 422;
        return res.status(statusCode).json({
          success: false,
          error: "Error procesando archivo",
          message: result.message,
        });
      }
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
