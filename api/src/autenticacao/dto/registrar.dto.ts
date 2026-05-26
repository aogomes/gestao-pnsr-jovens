import { IsString, IsEmail, MinLength } from 'class-validator';

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
}
