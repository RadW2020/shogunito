import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrictEmail } from '../../common/validators/custom-validators';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Correo electrónico del usuario que solicita recuperar su contraseña',
    example: 'usuario@ejemplo.com',
  })
  @IsStrictEmail({ message: 'Debe proporcionar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;
}
