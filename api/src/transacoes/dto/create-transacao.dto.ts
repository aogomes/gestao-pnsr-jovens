import { IsString, IsNumber, IsOptional, IsEnum, IsInt } from 'class-validator';
import { TipoTransacao, OrigemTransacao } from '@prisma/client';

export class CreateTransacaoDto {
  @IsNumber()
  valor: number;

  @IsEnum(['RECEITA', 'DESPESA', 'TRANSFERENCIA'], {
    message: 'tipo deve ser RECEITA, DESPESA ou TRANSFERENCIA'
  })
  tipo: TipoTransacao;

  @IsEnum(['RIFA', 'DEPOSITO', 'TRABALHO', 'PAGAMENTO', 'CONTAS', 'EVENTOS'], {
    message: 'origem deve ser RIFA, DEPOSITO, TRABALHO, PAGAMENTO, CONTAS ou EVENTOS'
  })
  @IsOptional()
  origem?: OrigemTransacao;

  @IsString()
  descricao: string;

  @IsString()
  @IsOptional()
  metodo?: string;

  @IsInt()
  @IsOptional()
  pessoaId?: number;

  @IsString()
  @IsOptional()
  data?: string;

  @IsInt()
  @IsOptional()
  contaId?: number;
}

