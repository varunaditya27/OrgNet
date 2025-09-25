import { Role } from '../../common/enums';

export class UserResponseDto {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthResponseDto {
  user: UserResponseDto;
  accessToken: string;
}

export class LoginResponseDto extends AuthResponseDto {}

export class RegisterResponseDto extends AuthResponseDto {}