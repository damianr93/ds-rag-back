import { UserEntity } from '../../entities/user.entity';

export interface UserRepository {
  create(user: { name: string; lastName: string; division: string; email: string; password: string }): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: number): Promise<UserEntity | null>;
  updateDisclaimerChecked(userId: number, checked: boolean): Promise<void>;
  updatePassword(userId: number, hashedPassword: string): Promise<void>;
}

