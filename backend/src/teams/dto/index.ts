import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  memberIds?: number[];
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AddMembersDto {
  @IsArray()
  @IsNotEmpty()
  @IsInt({ each: true })
  memberIds: number[];
}

export class RemoveMembersDto {
  @IsArray()
  @IsNotEmpty()
  @IsInt({ each: true })
  memberIds: number[];
}

export class TeamQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;
}

// Response DTOs
export class UserResponseDto {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

export class TeamResponseDto {
  id: number;
  name: string;
  description?: string;
  managerId: number;
  manager: UserResponseDto;
  members: UserResponseDto[];
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TeamListResponseDto {
  id: number;
  name: string;
  description?: string;
  managerId: number;
  manager: {
    id: number;
    name: string;
    email: string;
  };
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedTeamsResponseDto {
  teams: TeamListResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}