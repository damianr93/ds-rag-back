import { TokenService } from '../../../domain/shared/ports/security';
import { JwtAdapter } from '../../../config';

export class JwtTokenService implements TokenService {
  async generate(payload: any): Promise<string | null> {
    return await JwtAdapter.generateToken(payload) as string | null;
  }
  async validate<T>(token: string): Promise<T | null> {
    return await JwtAdapter.validateToken<T>(token);
  }
}
