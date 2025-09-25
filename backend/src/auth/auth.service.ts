import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, UserResponseDto, AuthResponseDto } from './dto';
import { Role } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { name, email, password, role = Role.EMPLOYEE, parentId } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate parent exists if parentId is provided
    if (parentId) {
      const parent = await this.prisma.user.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new BadRequestException('Parent user not found');
      }

      // Validate hierarchy rules (optional business logic)
      if (role === Role.ADMIN && parent) {
        throw new BadRequestException('Admin users cannot have a parent');
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any, // Cast to satisfy Prisma enum
        parentId,
      },
    });

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.mapToUserResponse(user),
      accessToken,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.mapToUserResponse(user),
      accessToken,
    };
  }

  async validateUser(userId: number): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      return null;
    }

    return this.mapToUserResponse(user);
  }

  private mapToUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      parentId: user.parentId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}