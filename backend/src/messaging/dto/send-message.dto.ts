import { IsString, IsInt, IsOptional, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString({ message: 'Content must be a string' })
  @MinLength(1, { message: 'Message content cannot be empty' })
  @MaxLength(2000, { message: 'Message content cannot exceed 2000 characters' })
  content: string;

  @IsInt({ message: 'Receiver ID must be an integer' })
  @IsOptional()
  receiverId?: number;

  @IsInt({ message: 'Group ID must be an integer' })
  @IsOptional()
  groupId?: number;
}