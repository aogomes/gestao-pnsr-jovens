import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ItemVendaDto {
  @IsNumber()
  produtoId: number;

  @IsNumber()
  quantidade: number;
}

export class CreateVendaDto {
  @IsOptional()
  @IsString()
  descricao?: string;

  @IsString()
  metodoPagamento: string;

  @IsString()
  statusPagamento: string;

  @IsNumber()
  trabalhoId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemVendaDto)
  itens: ItemVendaDto[];
}
