import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches, IsOptional, IsDefined } from 'class-validator';
import {
  IsStrictEmail,
  IsNotSQLInjection,
  IsNotXSS,
} from '../../common/validators/custom-validators';

export class RegisterDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@ejemplo.com',
  })
  @IsDefined({ message: 'El email es requerido', always: true })
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsString({ message: 'El email debe ser un string' })
  @IsStrictEmail({ message: 'Email inválido' })
  email!: string;

  @ApiProperty({
    description:
      'Contraseña del usuario (mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números)',
    example: 'Password123!',
  })
  @IsDefined({ message: 'La contraseña es requerida', always: true })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser un string' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  @IsNotSQLInjection({
    message: 'La contraseña contiene caracteres no permitidos',
  })
  @IsNotXSS({ message: 'La contraseña contiene caracteres no permitidos' })
  password!: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  @IsDefined({ message: 'El nombre es requerido', always: true })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser un string' })
  @IsNotSQLInjection({ message: 'El nombre contiene caracteres no permitidos' })
  @IsNotXSS({ message: 'El nombre contiene caracteres no permitidos' })
  name!: string;

  @ApiProperty({
    description: 'Rol del usuario en el sistema',
    enum: ['admin', 'producer', 'reviewer', 'artist', 'member'],
    example: 'member',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: 'admin' | 'producer' | 'reviewer' | 'artist' | 'member';
}
