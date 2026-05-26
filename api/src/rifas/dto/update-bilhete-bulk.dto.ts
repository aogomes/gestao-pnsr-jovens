import { IsString, IsOptional, IsEnum, IsArray, IsInt } from 'class-validator';

enum StatusBilhete {
  LIVRE = 'LIVRE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO',
}

export class UpdateBilheteBulkDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @IsEnum(StatusBilhete)
  status: StatusBilhete;

  @IsString()
  @IsOptional()
  comprovante?: string;

  @IsString()
  @IsOptional()
  nomeCliente?: string;

  @IsString()
  @IsOptional()
  foneCliente?: string;
}
