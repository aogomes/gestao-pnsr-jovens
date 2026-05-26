import { IsString, IsOptional, IsEnum } from 'class-validator';

enum StatusBilhete {
  LIVRE = 'LIVRE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO',
}

export class UpdateBilheteDto {
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
