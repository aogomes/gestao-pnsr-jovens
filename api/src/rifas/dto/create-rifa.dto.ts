import { IsString, IsNumber, IsDate, IsOptional, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class CreatePremioDto {
  @IsString()
  descricao: string;

  @IsNumber()
  posicao: number;
}

export class CreateRifaDto {
  @IsString()
  nome: string;

  @IsString()
  @IsOptional()
  titulo?: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsDate()
  @Type(() => Date)
  dataInicio: Date;

  @IsDate()
  @Type(() => Date)
  dataFim: Date;

  @IsDate()
  @Type(() => Date)
  dataSorteio: Date;

  @IsNumber()
  valorNumero: number;

  @IsNumber()
  numerosPorCartela: number;

  @IsNumber()
  totalNumeros: number;

  @IsNumber()
  @IsOptional()
  percentualRateio?: number;

  @IsString()
  @IsOptional()
  premioVendedor?: string;

  @IsInt()
  @IsOptional()
  contaId?: number;

  @IsString()
  @IsOptional()
  chavePix?: string;

  @IsString()
  @IsOptional()
  tipoChavePix?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePremioDto)
  premios: CreatePremioDto[];
}
