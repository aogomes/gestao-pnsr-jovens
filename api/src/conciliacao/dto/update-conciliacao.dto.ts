import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class UpdateConciliacaoDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  mes?: number;

  @IsOptional()
  @IsNumber()
  @Min(2000)
  @Max(2100)
  ano?: number;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  contaId?: number | null;
}

