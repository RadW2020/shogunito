import { Controller, Get, Param, Put, Body, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRateLimit } from '../common/guards/user-rate-limit.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Obtener todos los usuarios',
    description:
      'Retorna una lista completa de todos los usuarios registrados en el sistema, ordenados por fecha de creación de forma descendente (más recientes primero). Solo accesible por administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
    type: [User],
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos suficientes',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @ApiOperation({
    summary: 'Obtener perfil propio',
    description: 'Retorna el perfil del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil obtenido exitosamente',
    type: User,
  })
  getMyProfile(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description: 'Retorna un usuario específico por su ID. Solo accesible por administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
    type: User,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @UserRateLimit({ limit: 200, ttl: 60000 })
  @ApiOperation({
    summary: 'Actualizar usuario',
    description:
      'Actualiza los datos de un usuario. Los usuarios pueden actualizar su propio perfil, los admins pueden actualizar cualquier usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para actualizar este usuario',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<User>,
    @CurrentUser() currentUser: User,
  ) {
    // Solo admins o el propio usuario pueden actualizar
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      throw new Error('Sin permisos para actualizar este usuario');
    }

    // Si no es admin, no puede cambiar su rol
    if (currentUser.role !== 'admin' && updateData.role) {
      delete updateData.role;
    }

    const changedBy = currentUser.id || null;
    return this.usersService.update(id, updateData, changedBy);
  }

  @Delete(':id')
  @UserRateLimit({ limit: 50, ttl: 60000 })
  @Roles('admin')
  @ApiOperation({
    summary: 'Eliminar usuario',
    description: 'Elimina un usuario del sistema. Solo accesible por administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
