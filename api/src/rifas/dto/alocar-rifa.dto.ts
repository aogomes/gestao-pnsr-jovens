import { IsNumber, IsInt } from 'class-validator';

export class AlocarRifaDto {
  @IsInt()
  rifaId: number;

  @IsInt()
  pessoaId: number;

  @IsNumber()
  quantidade: number;
}
