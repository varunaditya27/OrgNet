import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  AdminUserQueryDto,
  AdminTeamDto,
  AdminTeamQueryDto,
  AuditLogQueryDto,
  SystemStatsDto,
  AdminOverrideDto,
  BulkUserOperationDto,
  HierarchyRestructureDto,
  AdminUserResponseDto,
  AdminTeamResponseDto,
  AuditLogResponseDto,
  PaginatedResponseDto,
} from './dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    role: Role;
  };
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ====== USER MANAGEMENT ======

  @Post('users')
  @ApiOperation({
    summary: 'Create a new user with admin privileges',
    description:
      'Creates a user with any role and bypasses normal RBAC restrictions. Requires admin role.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: AdminUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  async createUser(
    @Body() createUserDto: AdminCreateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AdminUserResponseDto> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.adminService.createUser(
      createUserDto,
      adminId,
      ipAddress,
      userAgent,
    );
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get all users with admin privileges',
    description:
      'Retrieves all users in the system with pagination and filtering. Bypasses RBAC restrictions.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: Role,
    description: 'Filter by role',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name or email',
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Include deleted users',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: PaginatedResponseDto<AdminUserResponseDto>,
  })
  async getAllUsers(
    @Query() query: AdminUserQueryDto,
  ): Promise<PaginatedResponseDto<AdminUserResponseDto>> {
    return this.adminService.getAllUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get user by ID with admin privileges',
    description: 'Retrieves any user by ID, bypassing RBAC restrictions.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: AdminUserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminUserResponseDto> {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id')
  @ApiOperation({
    summary: 'Update any user with admin privileges',
    description: 'Updates any user in the system, bypassing RBAC restrictions.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: AdminUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: AdminUpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AdminUserResponseDto> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.adminService.updateUser(
      id,
      updateUserDto,
      adminId,
      ipAddress,
      userAgent,
    );
  }

  @Delete('users/:id')
  @ApiOperation({
    summary: 'Permanently delete a user',
    description:
      'Hard deletes a user from the system. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - user has dependencies',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.adminService.deleteUser(id, adminId, ipAddress, userAgent);
  }

  @Post('users/bulk-operation')
  @ApiOperation({
    summary: 'Perform bulk operations on users',
    description:
      'Performs bulk activate, deactivate, or reassign operations on multiple users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        affectedUsers: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid operation or parameters',
  })
  @HttpCode(HttpStatus.OK)
  async bulkUserOperation(
    @Body() operationDto: BulkUserOperationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string; affectedUsers: number }> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.adminService.bulkUserOperation(
      operationDto,
      adminId,
      ipAddress,
      userAgent,
    );
  }

  // ====== TEAM MANAGEMENT ======

  @Post('teams')
  @ApiOperation({
    summary: 'Create a team with admin privileges',
    description:
      'Creates a team with any manager and members, bypassing RBAC restrictions.',
  })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
    type: AdminTeamResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async createTeam(
    @Body() teamDto: AdminTeamDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AdminTeamResponseDto> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.adminService.createTeam(teamDto, adminId, ipAddress, userAgent);
  }

  @Get('teams')
  @ApiOperation({
    summary: 'Get all teams with admin privileges',
    description:
      'Retrieves all teams in the system with pagination and filtering.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by team name',
  })
  @ApiQuery({
    name: 'managerId',
    required: false,
    description: 'Filter by manager ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Teams retrieved successfully',
    type: PaginatedResponseDto<AdminTeamResponseDto>,
  })
  async getAllTeams(
    @Query() query: AdminTeamQueryDto,
  ): Promise<PaginatedResponseDto<AdminTeamResponseDto>> {
    return this.adminService.getAllTeams(query);
  }

  @Delete('teams/:id')
  @ApiOperation({
    summary: 'Delete a team with admin privileges',
    description: 'Deletes any team in the system, bypassing RBAC restrictions.',
  })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({
    status: 200,
    description: 'Team deleted successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @HttpCode(HttpStatus.OK)
  async deleteTeam(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.adminService.deleteTeam(id, adminId, ipAddress, userAgent);
  }

  // ====== HIERARCHY MANAGEMENT ======

  @Put('hierarchy/restructure')
  @ApiOperation({
    summary: 'Restructure user hierarchy',
    description:
      'Moves users in the organizational hierarchy and optionally relocates their subordinates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Hierarchy restructured successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid hierarchy operation',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async restructureHierarchy(
    @Body() restructureDto: HierarchyRestructureDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.adminService.restructureHierarchy(
      restructureDto,
      adminId,
      ipAddress,
      userAgent,
    );
  }

  // ====== AUDIT LOGS ======

  @Get('audit-logs')
  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Retrieves system audit logs with pagination and filtering.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (max 100)',
    example: 50,
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action type',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'entity',
    required: false,
    description: 'Filter by entity type',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    type: PaginatedResponseDto<AuditLogResponseDto>,
  })
  async getAuditLogs(
    @Query() query: AuditLogQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    return this.adminService.getAuditLogs(query);
  }

  // ====== SYSTEM STATISTICS ======

  @Get('stats')
  @ApiOperation({
    summary: 'Get system statistics',
    description:
      'Retrieves comprehensive system statistics including users, teams, messages, and files.',
  })
  @ApiResponse({
    status: 200,
    description: 'System statistics retrieved successfully',
    type: SystemStatsDto,
  })
  async getSystemStats(): Promise<SystemStatsDto> {
    return this.adminService.getSystemStats();
  }

  // ====== ADMIN OVERRIDES ======

  @Post('override')
  @ApiOperation({
    summary: 'Record admin RBAC override',
    description:
      'Records an admin override action for audit purposes when bypassing RBAC restrictions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin override recorded successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid override data',
  })
  @HttpCode(HttpStatus.OK)
  async recordAdminOverride(
    @Body() overrideDto: AdminOverrideDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.adminService.recordAdminOverride(
      overrideDto,
      adminId,
      ipAddress,
      userAgent,
    );
  }

  // ====== HEALTH CHECK ======

  @Get('health')
  @ApiOperation({
    summary: 'Admin module health check',
    description:
      'Checks the health status of the admin module and its dependencies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin module is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  healthCheck(): {
    status: string;
    timestamp: string;
    version: string;
  } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
