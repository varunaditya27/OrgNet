import {
  BadRequestException,
  Injectable,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterDto,
  LoginDto,
  UserResponseDto,
  AuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { MailService } from '../mail/mail.service';
import { Role } from '../common/enums';
import type { User } from '@prisma/client';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { name, email, password } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Public sign-up always creates a root-level employee; admins and managers assign roles and reporting lines.
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.EMPLOYEE,
        lastLoginAt: new Date(),
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

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

  /** Always answers the same way so the endpoint cannot be used to discover which emails have accounts. */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user?.isActive) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({
          where: { userId: user.id, usedAt: null },
        }),
        this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        }),
      ]);

      const frontendUrl =
        this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
      const link = `${frontendUrl}/reset-password?token=${token}`;

      // Not awaited: a slow or failing mail server must not change the response.
      void this.mailService
        .sendPasswordReset(user.email, user.name, link)
        .then((info) =>
          this.logger.log(
            `Reset email for user ${user.id}: ${info.response ?? 'sent'}`,
          ),
        )
        .catch((error: Error) =>
          this.logger.error(
            `Reset email for user ${user.id} failed: ${error.message}`,
          ),
        );
    }

    return {
      message:
        'If an account exists for that email, a reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const invalid = new BadRequestException(
      'This reset link is invalid or has expired',
    );

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
      include: { user: { select: { isActive: true } } },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      !record.user.isActive
    ) {
      throw invalid;
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction(async (tx) => {
      // Claiming the token first makes a second concurrent use fail.
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) throw invalid;

      await tx.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });

    return { message: 'Your password has been reset. You can now sign in.' };
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

  private mapToUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      parentId: user.parentId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
