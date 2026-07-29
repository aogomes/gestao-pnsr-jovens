import { IsString, IsEmail, MinLength, IsInt, IsOptional } from 'class-validator';

export class RegistrarDto {
  @IsString()
  nome: string;

  @IsEmail()
  login: string;

  @IsString()
  @MinLength(6)
  senha: string;

  @IsString()
  @MinLength(6)
  confirmarSenha: string;

  @IsOptional()
  @IsInt()
  paroquiaId?: number;

  @IsOptional()
  @IsString()
  comunidade?: string;
}

