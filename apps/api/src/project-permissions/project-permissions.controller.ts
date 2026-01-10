import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectPermissionsService } from './project-permissions.service';
import { CreateProjectPermissionDto } from './dto/create-project-permission.dto';
import { UpdateProjectPermissionDto } from './dto/update-project-permission.dto';
import { ProjectPermission, ProjectRole } from '../entities/project-permission.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ProjectPermissionGuard } from '../auth/guards/project-permission.guard';
import { RequireProjectRole } from '../auth/decorators/project-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Project Permissions')
@Controller('projects/:projectId/permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard, ProjectPermissionGuard)
@ApiBearerAuth()
export class ProjectPermissionsController {
  constructor(private readonly projectPermissionsService: ProjectPermissionsService) {}

  @Get()
  @RequireProjectRole(ProjectRole.OWNER)
  @ApiOperation({
    summary: 'List all permissions for a project',
    description:
      'Returns all users with access to this project and their roles. Only project owners can view this.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of project permissions',
    type: [ProjectPermission],
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - must be project owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  findAll(@Param('projectId', ParseIntPipe) projectId: number): Promise<ProjectPermission[]> {
    return this.projectPermissionsService.findAllForProject(projectId);
  }

  @Post()
  @RequireProjectRole(ProjectRole.OWNER)
  @ApiOperation({
    summary: 'Add a user to the project',
    description:
      'Grants a user access to the project with the specified role. Only project owners can add users.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'User added to project successfully',
    type: ProjectPermission,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - must be project owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or user not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User already has permission for this project',
  })
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createDto: CreateProjectPermissionDto,
  ): Promise<ProjectPermission> {
    return this.projectPermissionsService.create(projectId, createDto);
  }

  @Patch(':userId')
  @RequireProjectRole(ProjectRole.OWNER)
  @ApiOperation({
    summary: "Update a user's role for the project",
    description: "Changes a user's role within the project. Only project owners can modify roles.",
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'number',
    example: 1,
  })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user whose role to update',
    type: 'number',
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    type: ProjectPermission,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or cannot remove last owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Permission not found',
  })
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateDto: UpdateProjectPermissionDto,
  ): Promise<ProjectPermission> {
    return this.projectPermissionsService.update(projectId, userId, updateDto);
  }

  @Delete(':userId')
  @RequireProjectRole(ProjectRole.OWNER)
  @ApiOperation({
    summary: "Remove a user's access to the project",
    description:
      "Revokes a user's permission to access the project. Only project owners can remove users.",
  })
  @ApiParam({
    name: 'projectId',
    description: 'ID of the project',
    type: 'number',
    example: 1,
  })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user to remove',
    type: 'number',
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description: 'User removed from project successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or cannot remove last owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Permission not found',
  })
  async remove(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{ message: string }> {
    await this.projectPermissionsService.remove(projectId, userId);
    return { message: 'User removed from project successfully' };
  }

  @Get('my-projects')
  @ApiOperation({
    summary: 'Get all projects the current user has access to',
    description: 'Returns all projects where the current user has been granted permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of project permissions for the current user',
    type: [ProjectPermission],
  })
  getMyProjects(@CurrentUser() user: User): Promise<ProjectPermission[]> {
    return this.projectPermissionsService.findAllForUser(user.id);
  }
}
