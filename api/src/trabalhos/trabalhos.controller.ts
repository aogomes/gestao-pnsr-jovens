import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { TrabalhosService } from './trabalhos.service';
import { CreateTrabalhoDto } from './dto/create-trabalho.dto';
import { UpdateTrabalhoDto } from './dto/update-trabalho.dto';
import { AddRecebimentoDto } from './dto/add-recebimento.dto';
import { UpdateRecebimentoDto } from './dto/update-recebimento.dto';

@Controller('trabalhos')
export class TrabalhosController {
  constructor(private readonly trabalhosService: TrabalhosService) {}

  @Post()
  create(@Body() createTrabalhoDto: CreateTrabalhoDto) {
    return this.trabalhosService.create(createTrabalhoDto);
  }

  @Get()
  findAll() {
    return this.trabalhosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trabalhosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTrabalhoDto: UpdateTrabalhoDto) {
    return this.trabalhosService.update(+id, updateTrabalhoDto);
  }

  @Delete('despesas/:despesaId')
  removeDespesa(@Param('despesaId') despesaId: string) {
    return this.trabalhosService.removeDespesa(+despesaId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trabalhosService.remove(+id);
  }

  // Recebimentos
  @Post(':id/recebimentos')
  addRecebimento(@Param('id') id: string, @Body() dto: AddRecebimentoDto) {
    return this.trabalhosService.addRecebimento(+id, dto);
  }

  @Patch(':id/recebimentos/:recId')
  updateRecebimento(
    @Param('id') id: string,
    @Param('recId') recId: string,
    @Body() dto: UpdateRecebimentoDto,
  ) {
    return this.trabalhosService.updateRecebimento(+id, +recId, dto);
  }

  @Delete(':id/recebimentos/:recId')
  removeRecebimento(
    @Param('id') id: string,
    @Param('recId') recId: string,
  ) {
    return this.trabalhosService.removeRecebimento(+id, +recId);
  }

  @Post(':id/ratear')
  @HttpCode(HttpStatus.OK)
  executarRateio(@Param('id') id: string) {
    return this.trabalhosService.executarRateio(+id);
  }

  @Post(':id/importar-extrato')
  @HttpCode(HttpStatus.OK)
  importarDoExtrato(@Param('id') id: string) {
    return this.trabalhosService.importarDoExtrato(+id);
  }

  // Despesas
  @Post(':id/despesas')
  addDespesa(@Param('id') id: string, @Body() data: { valor: number; descricao: string }) {
    return this.trabalhosService.addDespesa(+id, data);
  }

  @Delete(':id/lotes/:loteId')
  removeLoteRateio(@Param('id') id: string, @Param('loteId') loteId: string) {
    return this.trabalhosService.removeLoteRateio(+id, +loteId);
  }
}
