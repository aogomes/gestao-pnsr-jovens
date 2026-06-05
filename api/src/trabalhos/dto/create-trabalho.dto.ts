import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray } from 'class-validator';
import { TipoTrabalho, StatusTrabalho } from '@prisma/client';

export class CreateTrabalhoDto {
  @IsString()
  descricao: string;

  @IsDateString()
  dataTrabalho: string;

  @IsEnum(TipoTrabalho)
  tipo: TipoTrabalho;

  @IsNumber()
  proporcao: number;

  @IsNumber()
  eventoId: number;

  @IsOptional()
  @IsNumber()
  pessoaId?: number; // Para INDIVIDUAL

  @IsOptional()
  @IsArray()
  membrosIds?: number[]; // Para GRUPO
}
