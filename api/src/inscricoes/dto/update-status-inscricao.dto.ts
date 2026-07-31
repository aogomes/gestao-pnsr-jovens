import { IsEnum } from 'class-validator';
import { StatusInscricao } from '@prisma/client';

export class UpdateStatusInscricaoDto {
  @IsEnum(['PENDENTE', 'CONFIRMADO', 'DESISTENCIA', 'EM_ANALISE'], {
    message: 'O status deve ser PENDENTE, CONFIRMADO, DESISTENCIA ou EM_ANALISE'
  })
  status: any;
}
