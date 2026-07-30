import { IsString, IsNotEmpty, IsNumber, IsDateString, IsEnum, IsOptional, IsInt } from 'class-validator';
import { StatusEvento } from '@prisma/client';

export class CreateEventoDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsInt()
  @IsNotEmpty()
  paroquiaId: number;

  @IsInt()
  @IsNotEmpty()
  contaId: number;

  @IsDateString()
  dataInicio: string;

  @IsDateString()
  dataFim: string;

  @IsNumber()
  valor: number;

  @IsDateString()
  limiteInscricao: string;

  @IsEnum(StatusEvento)
  @IsOptional()
  status?: StatusEvento;

  @IsOptional()
  itensInclusos?: string[];

  @IsDateString()
  @IsOptional()
  dataIdaEstimada?: string;

  @IsDateString()
  @IsOptional()
  dataRetornoEstimada?: string;

  @IsInt()
  @IsOptional()
  duracaoDias?: number;

  @IsNumber()
  @IsOptional()
  valorSinal?: number;

  @IsDateString()
  @IsOptional()
  dataLimiteSinal?: string;
}

