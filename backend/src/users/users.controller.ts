import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UserHierarchyDto,
  UserTeamInfoDto,
} from './dto';
import {
  JwtAuthGuard,
  RolesGuard,
  HierarchyGuard,
  TreeBasedRBACGuard,
  Roles,
  RequireHierarchyAccess,
  HierarchyPermission,
} from '../common';
import { Role } from '../common/enums';
import type { AuthenticatedRequest } from '../common/types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto, req.user.role);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: Role,
    @Query('isActive') isActive?: string,
  ): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const isActiveFilter =
      isActive !== undefined ? isActive === 'true' : undefined;

    return this.usersService.findAll(pageNum, limitNum, role, isActiveFilter);
  }

  @Get('profile')
  async getProfile(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(req.user.id);
  }

  @Get('messageable')
  async getMessageableUsers(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto[]> {
    return this.usersService.getMessageableUsers(req.user.id);
  }

  @Get(':id')
  @UseGuards(TreeBasedRBACGuard)
  @RequireHierarchyAccess([
    HierarchyPermission.SELF,
    HierarchyPermission.DIRECT_SUBORDINATES,
    HierarchyPermission.DIRECT_SUPERIOR,
    HierarchyPermission.ALL_USERS,
  ])
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Get(':id/hierarchy')
  @UseGuards(HierarchyGuard)
  async getHierarchy(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserHierarchyDto> {
    return this.usersService.getHierarchy(id);
  }

  @Get(':id/superior')
  @UseGuards(HierarchyGuard)
  async getSuperior(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto | null> {
    return this.usersService.getSuperior(id);
  }

  @Get(':id/subordinates')
  @UseGuards(HierarchyGuard)
  async getSubordinates(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto[]> {
    return this.usersService.getSubordinates(id);
  }

  @Get(':id/teams')
  @UseGuards(HierarchyGuard)
  async getTeamInfo(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserTeamInfoDto> {
    return this.usersService.getTeamInfo(id);
  }

  @Patch(':id')
  @UseGuards(HierarchyGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto, req.user.id);
  }

  @Patch(':id/change-password')
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    // Users can only change their own password
    if (req.user.id !== id && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('You can only change your own password');
    }

    return this.usersService.changePassword(
      id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    return this.usersService.remove(id, req.user.id);
  }

  // Admin-only endpoints
  @Get('admin/all-users')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getAllUsersAdmin(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<UserResponseDto[]> {
    const includeInactiveFilter = includeInactive === 'true' ? undefined : true;
    const result = await this.usersService.findAll(
      1,
      1000,
      undefined,
      includeInactiveFilter,
    );
    return result.users;
  }

  @Patch('admin/:id/activate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async activateUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, { isActive: true }, req.user.id);
  }

  @Patch('admin/:id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async deactivateUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, { isActive: false }, req.user.id);
  }
}
