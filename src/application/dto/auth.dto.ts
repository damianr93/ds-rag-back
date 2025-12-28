export interface LoginUserDto {
  email: string;
  password: string;
}

export interface RegisterUserDto {
  name: string;
  lastName: string;
  division: string;
  email: string;
  password: string;
}

export interface ResetPasswordDto {
  email: string;
  password: string;
}

