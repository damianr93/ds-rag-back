import { Request, Response } from "express";
import { CustomError } from "../../domain";
import { AuthApplication } from "../../application/auth/auth.application";
import { LoginUserDto, RegisterUserDto } from "../../application/dto/auth.dto";

// Tipo para Request con user
type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    email?: string;
    name?: string;
    role?: string;
  };
};

export class AuthController {
  //* DI: mantengo inyectable para testear fácil
  constructor(public readonly authService: AuthApplication) {}

  // Handler centralizado de errores
  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
    console.error(error); // //! usar logger en prod (pino/winston)
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      timestamp: new Date().toISOString(),
    });
  };

  // Registro:
  // - Valido DTO
  // - Delego en service (hash + insert + token)
  // - Devuelvo 201 con { user, token }
  // - NO seteo cookie: el cliente debe guardar el token y mandarlo en Authorization
  registerUser = async (req: Request, res: Response) => {
    try {
      // Validación simple sin DTO.create (ya que es solo un tipo)
      const { name, lastName, division, email, password } = req.body;
      if (!name || !lastName || !division || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Todos los campos son requeridos',
          timestamp: new Date().toISOString(),
        });
      }

      const result = await this.authService.registerUser(req.body);

      return res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.token, // el front lo debe enviar como: Authorization: Bearer <token>
        },
        message: "User registered successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  };

  // Login:
  // - Valido DTO
  // - Delego auth en service (lookup + compare + token)
  // - Devuelvo { user, token }
  // - NO hay cookie; todo por header Bearer
  loginUser = async (req: Request, res: Response) => {
    try {
      // Validación simple sin DTO.create (ya que es solo un tipo)
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email y password son requeridos',
          timestamp: new Date().toISOString(),
        });
      }

      const result = await this.authService.loginUser(req.body);

      return res.json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
        },
        message: "Login successful",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const { email, password, passwordConfirmation } = req.body;
      if (!email || !password || !passwordConfirmation) {
        return res.status(400).json({
          success: false,
          error: 'Email, password y confirmacion son requeridos',
          timestamp: new Date().toISOString(),
        });
      }

      if (password !== passwordConfirmation) {
        return res.status(400).json({
          success: false,
          error: 'Las contraseñas no coinciden',
          timestamp: new Date().toISOString(),
        });
      }

      await this.authService.resetPassword({ email, password });

      return res.json({
        success: true,
        data: { email },
        message: 'Contraseña actualizada correctamente',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  };
  // Logout “stateless”: como no usamos cookies, a nivel API no hay nada que borrar.
  // Lo dejamos por si el front quiere un endpoint para “cerrar sesión” y limpiar su storage.
  logout = async (_req: Request, res: Response) => {
    try {
      return res.json({
        success: true,
        data: {},
        message: "Logged out (stateless). Remove token on client.",
        timestamp: new Date().toISOString(),
      }); // //! opcional: implementar blacklist/denylist si necesitás invalidar tokens hasta su expiración
    } catch (err) {
      return this.handleError(err, res);
    }
  };

  fetchMe = async(req:Request, res:Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Usuario no autenticado",
          timestamp: new Date().toISOString(),
        });
      }

      const user = await this.authService.getUserById(userId);
      
      return res.json({
        success: true,
        data: { user },
        message: "User data retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }

  updateDisclaimerChecked = async(req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
          message: "Usuario no autenticado",
          timestamp: new Date().toISOString(),
        });
      }

      const { checked } = req.body;
      if (typeof checked !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: "Invalid input",
          message: "El campo 'checked' debe ser un booleano",
          timestamp: new Date().toISOString(),
        });
      }

      await this.authService.updateDisclaimerChecked(userId, checked);

      return res.json({
        success: true,
        data: { disclaimerChecked: checked },
        message: "Disclaimer status updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return this.handleError(err, res);
    }
  }
}


