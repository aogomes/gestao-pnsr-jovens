import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePagamentoDto {
  @IsNumber()
  valor: number;

  @IsString()
  @IsOptional()
  metodo?: string;

  @IsString()
  @IsOptional()
  observacao?: string;

  @IsNumber()
  inscricaoId: number;

  @IsNumber()
  @IsOptional()
  transacaoId?: number;
}
