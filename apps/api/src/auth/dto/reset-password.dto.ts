import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotSQLInjection, IsNotXSS } from '../../common/validators/custom-validators';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de recuperación recibido por correo electrónico',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  })
  @IsString({ message: 'El token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @IsNotSQLInjection({ message: 'El token contiene caracteres no permitidos' })
  @IsNotXSS({ message: 'El token contiene caracteres no permitidos' })
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña del usuario',
    example: 'MiNuevaContraseña123',
    minLength: 8,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message: 'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número',
  })
  @IsNotSQLInjection({
    message: 'La contraseña contiene caracteres no permitidos',
  })
  @IsNotXSS({ message: 'La contraseña contiene caracteres no permitidos' })
  newPassword: string;
}
