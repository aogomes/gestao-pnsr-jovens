import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ItemRateioConciliacaoDto {
  @IsNotEmpty()
  @IsNumber()
  pessoaId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  valor: number;
}

export class RatearConciliacaoDto {
  @IsNotEmpty()
  @IsNumber()
  eventoId: number;

  @IsOptional()
  @IsNumber()
  contaId?: number | null;

  @IsOptional()
  @IsString()
  data?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemRateioConciliacaoDto)
  itens: ItemRateioConciliacaoDto[];
}

