import { CustomError } from '../../domain/errors/custom.error';
import { LoginUserDto, RegisterUserDto, ResetPasswordDto } from '../dto/auth.dto';
import { UserRepository } from '../../domain/auth/ports/repositories';
import { PasswordHasher, TokenService } from '../../domain/shared/ports/security';

export class AuthApplication {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService
  ) {}

  async registerUser(registerUserDto: RegisterUserDto) {
    const { name, lastName, division, email, password } = registerUserDto;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing) throw CustomError.badRequest('Email already exists');

    this.ensurePasswordStrength(password);
    const hashed = this.hasher.hash(password);
    const user = await this.users.create({ name, lastName, division, email: normalizedEmail, password: hashed });
    const token = await this.tokens.generate({ 
      id: user.id, 
      email: user.email, 
      role: user.role 
    });
    if (!token) throw CustomError.badRequest('Error while creating JWT');
    const { password: _omit, ...userEntity } = user as any;
    return { user: userEntity, token };
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) throw CustomError.badRequest('Invalid credentials');
    if (!user.password || !this.hasher.compare(password, user.password)) throw CustomError.badRequest('Invalid credentials');
    
    // Validar que el usuario esté activo
    if (!user.isActive) throw CustomError.forbidden('Tu cuenta no está activa. Contacta al administrador para activarla.');
    
    const token = await this.tokens.generate({ 
      id: user.id, 
      email: user.email, 
      role: user.role 
    });
    if (!token) throw CustomError.badRequest('Error while creating JWT');
    const { password: _omit, ...userEntity } = user as any;
    return { user: userEntity, token };
  }

  async getUserById(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw CustomError.notFound('User not found');
    const { password: _omit, ...userEntity } = user as any;
    return userEntity;
  }

  async updateDisclaimerChecked(userId: number, checked: boolean) {
    await this.users.updateDisclaimerChecked(userId, checked);
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) throw CustomError.notFound('User not found');

    this.ensurePasswordStrength(dto.password);
    const hashed = this.hasher.hash(dto.password);
    await this.users.updatePassword(user.id, hashed);

    const { password: _omit, ...userEntity } = user as any;
    return userEntity;
  }

  private ensurePasswordStrength(password: string) {
    const errors: string[] = [];
    if (password.length < 8) errors.push('al menos 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('una letra mayúscula');
    if (!/[a-z]/.test(password)) errors.push('una letra minúscula');
    if (!/[0-9]/.test(password)) errors.push('un número');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('un carácter especial');

    if (errors.length > 0) {
      throw CustomError.badRequest(`La contraseña debe incluir ${errors.join(', ')}.`);
    }
  }
}
