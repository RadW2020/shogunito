import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsEnum, IsNotEmpty } from 'class-validator';
import { ProjectRole } from '../../entities/project-permission.entity';

export class CreateProjectPermissionDto {
  @ApiProperty({
    description: 'ID of the user to grant permission to',
    example: 1,
    type: 'number',
  })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'Role to assign to the user for this project',
    enum: ProjectRole,
    example: ProjectRole.CONTRIBUTOR,
  })
  @IsEnum(ProjectRole)
  @IsNotEmpty()
  role: ProjectRole;
}
