import { IsNotEmpty, IsInt } from 'class-validator';

export class CreateInscricaoDto {
  @IsInt()
  @IsNotEmpty()
  pessoaId: number;

  @IsInt()
  @IsNotEmpty()
  eventoId: number;
}

