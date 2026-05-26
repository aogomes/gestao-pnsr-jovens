import { IsString, IsOptional, IsInt, IsBoolean, IsArray } from 'class-validator';

export class CreatePessoaDto {
  @IsString()
  nome: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  documento?: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsInt()
  @IsOptional()
  paroquiaId?: number;

  // Novos campos da imagem
  @IsString()
  @IsOptional()
  dataNascimento?: string;

  @IsString()
  @IsOptional()
  sexo?: string;

  @IsString()
  @IsOptional()
  rg?: string;

  @IsString()
  @IsOptional()
  orgaoEmissor?: string;

  @IsString()
  @IsOptional()
  emailResponsavel?: string;

  @IsString()
  @IsOptional()
  emailResponsavel2?: string;

  @IsString()
  @IsOptional()
  comunidade?: string;

  @IsString()
  @IsOptional()
  passaporte?: string;

  @IsString()
  @IsOptional()
  passaporteEmissaoValidade?: string;

  @IsString()
  @IsOptional()
  camiseta?: string;

  @IsBoolean()
  @IsOptional()
  vaiComConjuge?: boolean;

  @IsString()
  @IsOptional()
  nomeConjuge?: string;

  @IsString()
  @IsOptional()
  necessidadesMedicas?: string;

  @IsString()
  @IsOptional()
  responsavelLegal?: string;

  @IsString()
  @IsOptional()
  fotoPassaporte?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  perfis?: string[];
}

