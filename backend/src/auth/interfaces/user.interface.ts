import { Role } from '../../common/enums';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
