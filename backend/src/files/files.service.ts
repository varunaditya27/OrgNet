import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'node:crypto';
import {
  UploadFileDto,
  FileFilterDto,
  UpdateFileDto,
  FileResponseDto,
  PaginatedFilesDto,
  FileUploadResponseDto,
} from './dto';
import { Role } from '../common/enums';
import type { HierarchyUser } from '../common/types';
import type { File as FileRecord, Prisma } from '@prisma/client';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3Client: S3Client;
  private readonly signingClient: S3Client;
  private readonly bucketName: string;

  constructor(private readonly prisma: PrismaService) {
    this.bucketName = process.env.R2_BUCKET_NAME!;

    this.s3Client = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      forcePathStyle: process.env.R2_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    // A download link is signed for one host name. When the app reaches storage by an internal
    // address (Docker), the link must be signed for the address the browser can reach instead.
    this.signingClient = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: process.env.R2_PUBLIC_ENDPOINT || process.env.R2_ENDPOINT!,
      forcePathStyle: process.env.R2_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    uploadFileDto: UploadFileDto,
    userId: number,
  ): Promise<FileUploadResponseDto> {
    // Validate file size
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxFileSize} bytes`,
      );
    }

    // Validate file type
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [];
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }

    // Generate unique S3 key
    const fileExtension = file.originalname.split('.').pop();
    const s3Key = `files/${userId}/${randomUUID()}.${fileExtension}`;

    try {
      // Upload to S3
      const uploadParams = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          userId: userId.toString(),
        },
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));

      // Save metadata to database
      const savedFile = await this.prisma.file.create({
        data: {
          ownerId: userId,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          s3Key,
          allowedRole: uploadFileDto.allowedRole,
          description: uploadFileDto.description,
        },
      });

      return {
        id: savedFile.id,
        fileName: savedFile.fileName,
        mimeType: savedFile.mimeType,
        size: savedFile.size,
        description: savedFile.description || undefined,
        allowedRole: savedFile.allowedRole,
        s3Key: savedFile.s3Key,
        uploadedAt: savedFile.createdAt,
      };
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  async findAll(
    filterDto: FileFilterDto,
    userId: number,
  ): Promise<PaginatedFilesDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, parentId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const {
      page = 1,
      limit = 20,
      allowedRole,
      search,
      mimeType,
      ownerId,
    } = filterDto;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.FileWhereInput = { isActive: true };
    // Each entry must hold, so search can narrow the results but never widen what a role may see.
    const conditions: Prisma.FileWhereInput[] = [];

    if (user.role !== Role.ADMIN) {
      conditions.push({
        OR: [
          { ownerId: userId },
          { allowedRole: { in: this.getAllowedRolesForUser(user.role) } },
        ],
      });
    }

    if (search) {
      conditions.push({
        OR: [
          { fileName: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (conditions.length > 0) {
      whereClause.AND = conditions;
    }

    if (allowedRole) {
      whereClause.allowedRole = allowedRole;
    }

    if (mimeType) {
      whereClause.mimeType = mimeType;
    }

    if (ownerId) {
      whereClause.ownerId = ownerId;
    }

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: whereClause,
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.file.count({ where: whereClause }),
    ]);

    const fileResponses: FileResponseDto[] = files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      description: file.description || undefined,
      allowedRole: file.allowedRole,
      downloadCount: file.downloadCount,
      isActive: file.isActive,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      owner: file.owner,
    }));

    return {
      files: fileResponses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, userId: number): Promise<FileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, parentId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const file = await this.prisma.file.findUnique({
      where: { id, isActive: true },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check if user can access this file
    if (!this.canUserAccessFile(user, file)) {
      throw new ForbiddenException(
        'Insufficient permissions to access this file',
      );
    }

    return {
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      description: file.description || undefined,
      allowedRole: file.allowedRole,
      downloadCount: file.downloadCount,
      isActive: file.isActive,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      owner: file.owner,
    };
  }

  async generateDownloadUrl(id: number, userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, parentId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const file = await this.prisma.file.findUnique({
      where: { id, isActive: true },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check if user can access this file
    if (!this.canUserAccessFile(user, file)) {
      throw new ForbiddenException(
        'Insufficient permissions to download this file',
      );
    }

    try {
      // Increment download count
      await this.prisma.file.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
      });

      // Generate pre-signed URL (valid for 1 hour)
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: file.s3Key,
      });

      const signedUrl = await getSignedUrl(this.signingClient, command, {
        expiresIn: 3600,
      });
      return signedUrl;
    } catch (error) {
      this.logger.error('Error generating download URL:', error);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  async update(
    id: number,
    updateFileDto: UpdateFileDto,
    userId: number,
  ): Promise<FileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, parentId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const file = await this.prisma.file.findUnique({
      where: { id, isActive: true },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Only file owner or admin can update
    if (file.ownerId !== userId && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only file owner or admin can update file metadata',
      );
    }

    const updatedFile = await this.prisma.file.update({
      where: { id },
      data: {
        description: updateFileDto.description,
        allowedRole: updateFileDto.allowedRole,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      id: updatedFile.id,
      fileName: updatedFile.fileName,
      mimeType: updatedFile.mimeType,
      size: updatedFile.size,
      description: updatedFile.description || undefined,
      allowedRole: updatedFile.allowedRole,
      downloadCount: updatedFile.downloadCount,
      isActive: updatedFile.isActive,
      createdAt: updatedFile.createdAt,
      updatedAt: updatedFile.updatedAt,
      owner: updatedFile.owner,
    };
  }

  async remove(id: number, userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, parentId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const file = await this.prisma.file.findUnique({
      where: { id, isActive: true },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Only file owner or admin can delete
    if (file.ownerId !== userId && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only file owner or admin can delete files');
    }

    try {
      // Delete from S3
      const deleteParams = {
        Bucket: this.bucketName,
        Key: file.s3Key,
      };

      await this.s3Client.send(new DeleteObjectCommand(deleteParams));

      // Soft delete in database
      await this.prisma.file.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  // Helper methods

  private canUserAccessFile(user: HierarchyUser, file: FileRecord): boolean {
    // Admin can access any file
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Owner can always access their own files
    if (file.ownerId === user.id) {
      return true;
    }

    // Check if user's role meets the file's required role
    return this.hasRequiredRole(user.role, file.allowedRole);
  }

  private hasRequiredRole(userRole: Role, requiredRole: Role): boolean {
    const roleHierarchy = {
      [Role.ADMIN]: 4,
      [Role.MANAGER]: 3,
      [Role.EMPLOYEE]: 2,
      [Role.INTERN]: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  private getAllowedRolesForUser(userRole: Role): Role[] {
    switch (userRole) {
      case Role.ADMIN:
        return [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.INTERN];
      case Role.MANAGER:
        return [Role.MANAGER, Role.EMPLOYEE, Role.INTERN];
      case Role.EMPLOYEE:
        return [Role.EMPLOYEE, Role.INTERN];
      case Role.INTERN:
        return [Role.INTERN];
      default:
        return [];
    }
  }
}
