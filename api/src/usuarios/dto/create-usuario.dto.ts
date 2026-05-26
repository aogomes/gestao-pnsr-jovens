import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { PapelUsuario } from '@prisma/client';

export class CreateUsuarioDto {
  @IsString()
  login: string;

  @IsString()
  @MinLength(6)
  senha: string;

  @IsString()
  nome: string;

  @IsEnum(PapelUsuario)
  @IsOptional()
  papel?: PapelUsuario;
}

