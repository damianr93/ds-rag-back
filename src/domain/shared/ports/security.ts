export interface PasswordHasher {
  hash(plain: string): string;
  compare(plain: string, hashed: string): boolean;
}

export interface TokenService {
  generate(payload: any): Promise<string | null>;
  validate<T>(token: string): Promise<T | null>;
}

