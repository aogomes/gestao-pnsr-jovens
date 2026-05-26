import { PartialType } from '@nestjs/mapped-types';
import { CreateTrabalhoDto } from './create-trabalho.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { StatusTrabalho } from '@prisma/client';

export class UpdateTrabalhoDto extends PartialType(CreateTrabalhoDto) {
  @IsOptional()
  @IsEnum(StatusTrabalho)
  status?: StatusTrabalho;
}
