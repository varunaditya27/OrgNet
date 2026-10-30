import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../common/enums';

// Admin User Management DTOs
export class AdminCreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUserQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDeleted?: boolean = false;
}

// Admin Team Management DTOs
export class AdminTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  managerId: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  memberIds?: number[];
}

export class AdminTeamQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  managerId?: number;
}

// Audit Log DTOs
export class AuditLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateAuditLogDto {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  entity: string;

  @IsOptional()
  @IsInt()
  entityId?: number;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  metadata?: any;
}

// System Statistics DTOs
export class SystemStatsDto {
  users: {
    total: number;
    active: number;
    byRole: Record<Role, number>;
    recentlyCreated: number;
  };
  teams: {
    total: number;
    totalMembers: number;
    averageTeamSize: number;
    teamsWithoutMembers: number;
  };
  messages: {
    totalSent: number;
    todaysSent: number;
    topSenders: Array<{ userId: number; name: string; count: number }>;
  };
  files: {
    totalFiles: number;
    totalSize: number;
    downloadCount: number;
    activeFiles: number;
  };
  system: {
    uptimeMinutes: number;
    lastBackup?: Date;
    databaseSize?: string;
  };
}

// Admin Override DTOs
export class AdminOverrideDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  targetEntity: string;

  @IsInt()
  targetEntityId: number;

  @IsString()
  @IsNotEmpty()
  overrideType: string;

  @IsOptional()
  metadata?: any;
}

// Response DTOs
export class AdminUserResponseDto {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date | null;
  parentId?: number | null;
  parent?: {
    id: number;
    name: string;
    role: Role;
  } | null;
  subordinatesCount: number;
  teamsManaged: number;
  teamMemberships: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AdminTeamResponseDto {
  id: number;
  name: string;
  description?: string | null;
  managerId: number;
  manager: {
    id: number;
    name: string;
    email: string;
    role: Role;
  };
  members: Array<{
    id: number;
    name: string;
    email: string;
    role: Role;
  }>;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AuditLogResponseDto {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: Role;
  };
  action: string;
  entity: string;
  entityId?: number;
  details?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export class PaginatedResponseDto<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Organization Management DTOs
export class OrganizationStatsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class BulkUserOperationDto {
  @IsArray()
  @IsInt({ each: true })
  userIds: number[];

  @IsString()
  @IsNotEmpty()
  operation: 'activate' | 'deactivate' | 'delete' | 'reassign';

  @IsOptional()
  @IsInt()
  newParentId?: number; // For reassign operation

  @IsOptional()
  @IsString()
  reason?: string;
}

export class HierarchyRestructureDto {
  @IsInt()
  userId: number;

  @IsOptional()
  @IsInt()
  newParentId?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsBoolean()
  moveSubordinates?: boolean = false;
}
