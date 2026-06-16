import { IsEnum } from 'class-validator';
import { StatusInscricao } from '@prisma/client';

export class UpdateStatusInscricaoDto {
  @IsEnum(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'EM_ANALISE'], {
    message: 'O status deve ser PENDENTE, CONFIRMADO, CANCELADO ou EM_ANALISE'
  })
  status: any;
}
