import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  IsStrictEmail,
  IsNotSQLInjection,
  IsNotXSS,
} from '../../common/validators/custom-validators';

export class LoginDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@ejemplo.com',
  })
  @IsStrictEmail({ message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsNotSQLInjection({
    message: 'La contraseña contiene caracteres no permitidos',
  })
  @IsNotXSS({ message: 'La contraseña contiene caracteres no permitidos' })
  password: string;
}
