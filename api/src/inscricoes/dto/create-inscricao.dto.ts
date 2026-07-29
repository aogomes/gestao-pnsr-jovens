import { IsNotEmpty, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateInscricaoDto {
  @IsInt()
  @IsNotEmpty()
  pessoaId: number;

  @IsInt()
  @IsNotEmpty()
  eventoId: number;

  @IsOptional()
  @IsString()
  intencaoPagamento?: string;
}
