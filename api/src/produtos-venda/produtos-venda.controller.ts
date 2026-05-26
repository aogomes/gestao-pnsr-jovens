import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProdutosVendaService } from './produtos-venda.service';
import { CreateProdutoVendaDto } from './dto/create-produto-venda.dto';
import { UpdateProdutoVendaDto } from './dto/update-produto-venda.dto';

@Controller('produtos-venda')
export class ProdutosVendaController {
  constructor(private readonly service: ProdutosVendaService) {}

  @Post()
  create(@Body() dto: CreateProdutoVendaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProdutoVendaDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
