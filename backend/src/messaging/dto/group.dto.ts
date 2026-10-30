import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateGroupDto {
  @IsString({ message: 'Group name must be a string' })
  @MinLength(2, { message: 'Group name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Group name cannot exceed 100 characters' })
  name: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsArray({ message: 'Member IDs must be an array' })
  @IsInt({ each: true, message: 'Each member ID must be an integer' })
  memberIds: number[];
}

export class UpdateGroupDto {
  @IsString({ message: 'Group name must be a string' })
  @MinLength(2, { message: 'Group name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Group name cannot exceed 100 characters' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}

export class AddGroupMembersDto {
  @IsArray({ message: 'Member IDs must be an array' })
  @IsInt({ each: true, message: 'Each member ID must be an integer' })
  memberIds: number[];
}

export class RemoveGroupMembersDto {
  @IsArray({ message: 'Member IDs must be an array' })
  @IsInt({ each: true, message: 'Each member ID must be an integer' })
  memberIds: number[];
}
