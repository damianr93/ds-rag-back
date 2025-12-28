import { PasswordHasher } from '../../../domain/shared/ports/security';
import { bcryptAdapter } from '../../../config';

export class BcryptHasher implements PasswordHasher {
  hash(plain: string): string {
    return bcryptAdapter.hash(plain);
  }
  compare(plain: string, hashed: string): boolean {
    return bcryptAdapter.compare(plain, hashed);
  }
}
