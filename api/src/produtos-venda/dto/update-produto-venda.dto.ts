import { PartialType } from '@nestjs/mapped-types';
import { CreateProdutoVendaDto } from './create-produto-venda.dto';

export class UpdateProdutoVendaDto extends PartialType(CreateProdutoVendaDto) {}
