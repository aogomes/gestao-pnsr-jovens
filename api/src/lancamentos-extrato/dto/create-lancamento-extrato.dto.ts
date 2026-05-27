import { IsNotEmpty, IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';
import { TipoTransacao } from '@prisma/client';

export class CreateLancamentoExtratoDto {
  @IsNotEmpty()
  @IsString()
  data: string;

  @IsNotEmpty()
  @IsString()
  descricao: string;

  @IsNotEmpty()
  @IsNumber()
  valor: number;

  @IsNotEmpty()
  @IsEnum(TipoTransacao)
  tipo: TipoTransacao;

  @IsOptional()
  @IsString()
  metodo?: string;

  @IsNotEmpty()
  @IsNumber()
  contaId: number;
}
