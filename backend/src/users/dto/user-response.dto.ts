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

export class UserHierarchyDto extends UserResponseDto {
  parent?: UserResponseDto | null;
  subordinates?: UserResponseDto[];
}

export class UserTeamInfoDto {
  teamsManaged: Array<{
    id: number;
    name: string;
    createdAt: Date;
  }>;
  teamMemberships: Array<{
    id: number;
    name: string;
    managerId: number;
    createdAt: Date;
  }>;
}
