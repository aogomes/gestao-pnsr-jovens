import { PartialType } from '@nestjs/mapped-types';
import { AddRecebimentoDto } from './add-recebimento.dto';

export class UpdateRecebimentoDto extends PartialType(AddRecebimentoDto) {}
