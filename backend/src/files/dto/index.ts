import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../common/enums';

export class UploadFileDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(Role)
  allowedRole: Role;
}

export class FileFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(Role)
  allowedRole?: Role;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;
}

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Role)
  allowedRole?: Role;
}

export class FileResponseDto {
  id: number;
  fileName: string;
  mimeType: string;
  size: number;
  description?: string;
  allowedRole: Role;
  downloadCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: number;
    name: string;
    email: string;
  };
}

export class FileDownloadDto {
  @IsUUID()
  fileId: string;
}

export class PaginatedFilesDto {
  files: FileResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class FileUploadResponseDto {
  id: number;
  fileName: string;
  mimeType: string;
  size: number;
  description?: string;
  allowedRole: Role;
  s3Key: string;
  uploadedAt: Date;
}
