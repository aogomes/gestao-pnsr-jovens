import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConciliacaoItemDto {
  @IsNotEmpty()
  @IsString()
  dataLancamento: string;

  @IsOptional()
  @IsString()
  lote?: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsNotEmpty()
  @IsString()
  historico: string;

  @IsOptional()
  @IsString()
  tipoLancamento?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  nomeExtrato?: string;

  @IsNotEmpty()
  @IsNumber()
  valor: number;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsBoolean()
  desconsiderado?: boolean;

  @IsOptional()
  @IsNumber()
  pessoaId?: number | null;
}

export class CreateConciliacaoDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(12)
  mes: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(2000)
  @Max(2100)
  ano: number;

  @IsNotEmpty()
  @IsString()
  descricao: string;

  @IsOptional()
  @IsNumber()
  contaId?: number | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConciliacaoItemDto)
  itens: CreateConciliacaoItemDto[];
}
