import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AutenticacaoModule } from './autenticacao/autenticacao.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PessoasModule } from './pessoas/pessoas.module';
import { TransacoesModule } from './transacoes/transacoes.module';
import { ParoquiasModule } from './paroquias/paroquias.module';
import { EventosModule } from './eventos/eventos.module';
import { InscricoesModule } from './inscricoes/inscricoes.module';
import { RifasModule } from './rifas/rifas.module';
import { ContasModule } from './contas/contas.module';
import { TrabalhosModule } from './trabalhos/trabalhos.module';
import { ProdutosVendaModule } from './produtos-venda/produtos-venda.module';
import { VendasModule } from './vendas/vendas.module';
import { LancamentosExtratoModule } from './lancamentos-extrato/lancamentos-extrato.module';
import { ArquivosModule } from './arquivos/arquivos.module';


@Module({
  imports: [
    PrismaModule, 
    AutenticacaoModule, 
    UsuariosModule, 
    PessoasModule, 
    TransacoesModule,
    ParoquiasModule,
    EventosModule,
    InscricoesModule,
    RifasModule,
    ContasModule,
    TrabalhosModule,
    ProdutosVendaModule,
    VendasModule,
    LancamentosExtratoModule,
    ArquivosModule
  ],
  controllers: [AppController],
  providers: [
    AppService
  ],
})
export class AppModule {}
