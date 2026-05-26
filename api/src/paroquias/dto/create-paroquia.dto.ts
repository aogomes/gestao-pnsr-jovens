import { IsString, IsNotEmpty } from 'class-validator';

export class CreateParoquiaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  paroco: string;

  @IsString()
  @IsNotEmpty()
  cidade: string;
}

