import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator';

export class CreateSaqueDto {
  @IsNumber()
  @Min(0.01, { message: 'O valor do saque deve ser maior que zero' })
  valor: number;

  @IsString()
  descricao: string;

  @IsString()
  @IsOptional()
  data?: string;

  @IsInt()
  pessoaId: number;

  @IsInt()
  eventoId: number;
}
