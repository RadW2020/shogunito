import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProjectRole } from '../../entities/project-permission.entity';

export class UpdateProjectPermissionDto {
  @ApiProperty({
    description: 'New role to assign to the user for this project',
    enum: ProjectRole,
    example: ProjectRole.CONTRIBUTOR,
  })
  @IsEnum(ProjectRole)
  @IsNotEmpty()
  role: ProjectRole;
}
