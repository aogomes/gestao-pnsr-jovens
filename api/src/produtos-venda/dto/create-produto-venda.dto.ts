import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateProdutoVendaDto {
  @IsString()
  nome: string;

  @IsNumber()
  valor: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
