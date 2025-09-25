import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsInt } from 'class-validator';
import { Role } from '../../common/enums';

export class RegisterDto {
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsEnum(Role, { message: 'Role must be one of: ADMIN, MANAGER, EMPLOYEE, INTERN' })
  @IsOptional()
  role?: Role;

  @IsInt({ message: 'Parent ID must be an integer' })
  @IsOptional()
  parentId?: number;
}