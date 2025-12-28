import { UserRepository } from '../../../domain/auth/ports/repositories';
import { prisma } from '../../db/prisma';
import { UserEntity } from '../../../domain';

export class PrismaUserRepository implements UserRepository {
  async create(user: { name: string; lastName: string; division: string; email: string; password: string }): Promise<UserEntity> {
    const createdUser = await prisma.user.create({
      data: {
        name: user.name,
        lastName: user.lastName,
        division: user.division,
        email: user.email,
        password: user.password,
      }
    });
    
    return UserEntity.fromObject(createdUser);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) return null;
    return UserEntity.fromObject(user);
  }

  async findById(id: number): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) return null;
    return UserEntity.fromObject(user);
  }

  async updateDisclaimerChecked(userId: number, checked: boolean): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { disclaimerChecked: checked }
    });
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
  }
}
