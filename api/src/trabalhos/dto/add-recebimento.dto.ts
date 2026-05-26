import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { StatusRecebimentoTrabalho } from '@prisma/client';

export class AddRecebimentoDto {
  @IsNumber()
  valor: number;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  metodo?: string;

  @IsOptional()
  @IsEnum(StatusRecebimentoTrabalho)
  status?: StatusRecebimentoTrabalho;

  @IsOptional()
  @IsNumber()
  pessoaId?: number;
}
