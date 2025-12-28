export class UserEntity {
  constructor(
    public id: number,
    public name: string,
    public lastName: string,
    public division: string,
    public email: string,
    public password?: string,
    public disclaimerChecked: boolean = false,
    public role: 'USER' | 'ADMIN' = 'USER',
    public isActive: boolean = false,
  ) {}

  static fromObject(object: any): UserEntity {
    const { id, name, lastName, division, email, password, disclaimerChecked, role, isActive } = object;
    return new UserEntity(id, name, lastName, division, email, password, disclaimerChecked ?? false, role ?? 'USER', isActive ?? false);
  }
}