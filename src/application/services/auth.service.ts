import { AuthApplication } from '../auth/auth.application';
import { ResetPasswordDto } from '../dto/auth.dto';
export class AuthService {
  constructor(private readonly app: AuthApplication) {}

  async login(credentials: any): Promise<any> {
    return this.app.loginUser(credentials);
  }

  async register(userData: any): Promise<any> {
    return this.app.registerUser(userData);
  }

  async loginUser(credentials: any): Promise<any> {
    return this.app.loginUser(credentials);
  }

  async registerUser(userData: any): Promise<any> {
    return this.app.registerUser(userData);
  }

  async getUserById(userId: number): Promise<any> {
    return this.app.getUserById(userId);
  }

  async updateDisclaimerChecked(userId: number, checked: boolean): Promise<void> {
    await this.app.updateDisclaimerChecked(userId, checked);
  }

  async resetPassword(payload: ResetPasswordDto): Promise<any> {
    return this.app.resetPassword(payload);
  }
}
