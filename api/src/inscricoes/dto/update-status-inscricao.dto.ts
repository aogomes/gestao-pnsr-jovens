import { IsEnum } from 'class-validator';
import { StatusInscricao } from '@prisma/client';

export class UpdateStatusInscricaoDto {
  @IsEnum(['PENDENTE', 'CONFIRMADO', 'REJEITADA', 'EM_ANALISE'], {
    message: 'O status deve ser PENDENTE, CONFIRMADO, REJEITADA ou EM_ANALISE'
  })
  status: any;
}
