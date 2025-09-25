import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddMembersDto,
  RemoveMembersDto,
  TeamQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '../common/enums';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * Create a new team
   * Only managers and admins can create teams
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @User('id') userId: number,
  ) {
    return this.teamsService.create(createTeamDto, userId);
  }

  /**
   * Get all teams accessible to the current user
   * - Admins: See all teams
   * - Managers: See their own teams
   * - Employees/Interns: See teams they are members of
   */
  @Get()
  async findAll(
    @User('id') userId: number,
    @Query() query: TeamQueryDto,
  ) {
    return this.teamsService.findAll(userId, query);
  }

  /**
   * Get a specific team by ID
   * Access controlled by RBAC rules
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number,
  ) {
    return this.teamsService.findOne(id, userId);
  }

  /**
   * Update team information
   * Only team manager or admin can update
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTeamDto: UpdateTeamDto,
    @User('id') userId: number,
  ) {
    return this.teamsService.update(id, updateTeamDto, userId);
  }

  /**
   * Add members to a team
   * Only team manager or admin can add members
   */
  @Post(':id/members')
  async addMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() addMembersDto: AddMembersDto,
    @User('id') userId: number,
  ) {
    return this.teamsService.addMembers(id, addMembersDto, userId);
  }

  /**
   * Remove members from a team
   * Only team manager or admin can remove members
   */
  @Delete(':id/members')
  async removeMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() removeMembersDto: RemoveMembersDto,
    @User('id') userId: number,
  ) {
    return this.teamsService.removeMembers(id, removeMembersDto, userId);
  }

  /**
   * Delete a team
   * Only team manager or admin can delete
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number,
  ) {
    return this.teamsService.remove(id, userId);
  }

  /**
   * Get teams managed by the current user
   * Available to managers and admins
   */
  @Get('managed/my-teams')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async getManagedTeams(@User('id') userId: number) {
    return this.teamsService.getTeamsByManager(userId);
  }

  /**
   * Get teams managed by a specific manager
   * Admin only endpoint
   */
  @Get('managed/by-manager/:managerId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getTeamsByManager(
    @Param('managerId', ParseIntPipe) managerId: number,
  ) {
    return this.teamsService.getTeamsByManager(managerId);
  }
}