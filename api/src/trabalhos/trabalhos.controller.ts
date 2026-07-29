import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { TrabalhosService } from './trabalhos.service';
import { CreateTrabalhoDto } from './dto/create-trabalho.dto';
import { UpdateTrabalhoDto } from './dto/update-trabalho.dto';
import { AddRecebimentoDto } from './dto/add-recebimento.dto';
import { UpdateRecebimentoDto } from './dto/update-recebimento.dto';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { PermissionsGuard } from '../autenticacao/permissions.guard';
import { RequirePermissions } from '../autenticacao/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('trabalhos')
export class TrabalhosController {
  constructor(private readonly trabalhosService: TrabalhosService) {}

  @Post()
  @RequirePermissions('trabalhos', 'escrever')
  create(@Body() createTrabalhoDto: CreateTrabalhoDto) {
    return this.trabalhosService.create(createTrabalhoDto);
  }

  @Get()
  @RequirePermissions('trabalhos', 'ler')
  findAll() {
    return this.trabalhosService.findAll();
  }

  @Get(':id')
  @RequirePermissions('trabalhos', 'ler')
  findOne(@Param('id') id: string) {
    return this.trabalhosService.findOne(+id);
  }

  @Patch(':id')
  @RequirePermissions('trabalhos', 'escrever')
  update(@Param('id') id: string, @Body() updateTrabalhoDto: UpdateTrabalhoDto) {
    return this.trabalhosService.update(+id, updateTrabalhoDto);
  }

  @Delete('despesas/:despesaId')
  @RequirePermissions('trabalhos', 'escrever')
  removeDespesa(@Param('despesaId') despesaId: string) {
    return this.trabalhosService.removeDespesa(+despesaId);
  }

  @Delete(':id')
  @RequirePermissions('trabalhos', 'escrever')
  remove(@Param('id') id: string) {
    return this.trabalhosService.remove(+id);
  }

  // Recebimentos
  @Post(':id/recebimentos')
  @RequirePermissions('trabalhos', 'escrever')
  addRecebimento(@Param('id') id: string, @Body() dto: AddRecebimentoDto) {
    return this.trabalhosService.addRecebimento(+id, dto);
  }

  @Patch(':id/recebimentos/:recId')
  @RequirePermissions('trabalhos', 'escrever')
  updateRecebimento(
    @Param('id') id: string,
    @Param('recId') recId: string,
    @Body() dto: UpdateRecebimentoDto,
  ) {
    return this.trabalhosService.updateRecebimento(+id, +recId, dto);
  }

  @Delete(':id/recebimentos/:recId')
  @RequirePermissions('trabalhos', 'escrever')
  removeRecebimento(
    @Param('id') id: string,
    @Param('recId') recId: string,
  ) {
    return this.trabalhosService.removeRecebimento(+id, +recId);
  }

  @Post(':id/ratear')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('trabalhos', 'escrever')
  executarRateio(@Param('id') id: string) {
    return this.trabalhosService.executarRateio(+id);
  }

  @Post(':id/importar-extrato')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('trabalhos', 'escrever')
  importarDoExtrato(@Param('id') id: string) {
    return this.trabalhosService.importarDoExtrato(+id);
  }

  // Despesas
  @Post(':id/despesas')
  @RequirePermissions('trabalhos', 'escrever')
  addDespesa(@Param('id') id: string, @Body() data: { valor: number; descricao: string }) {
    return this.trabalhosService.addDespesa(+id, data);
  }

  @Delete(':id/lotes/:loteId')
  @RequirePermissions('trabalhos', 'escrever')
  removeLoteRateio(@Param('id') id: string, @Param('loteId') loteId: string) {
    return this.trabalhosService.removeLoteRateio(+id, +loteId);
  }
}
