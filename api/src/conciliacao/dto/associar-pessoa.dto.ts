import { IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class AssociarPessoaDto {
  @IsOptional()
  @IsNumber()
  pessoaId?: number | null;

  @IsOptional()
  @IsBoolean()
  desconsiderado?: boolean;

  @IsOptional()
  @IsBoolean()
  atualizarCpfCadastro?: boolean;
}

