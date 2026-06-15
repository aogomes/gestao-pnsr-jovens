import { Module } from '@nestjs/common';
import { ArquivosController } from './arquivos.controller';

@Module({
  controllers: [ArquivosController],
  providers: [],
})
export class ArquivosModule {}
