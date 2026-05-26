import { IsString, IsNumber, IsOptional, IsInt } from 'class-validator';

export class CreateContaDto {
  @IsString()
  nome: string;

  @IsNumber()
  @IsOptional()
  saldo?: number;

  @IsInt()
  paroquiaId: number;
}
