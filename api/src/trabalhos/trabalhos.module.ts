import { Module } from '@nestjs/common';
import { TrabalhosService } from './trabalhos.service';
import { TrabalhosController } from './trabalhos.controller';

@Module({
  controllers: [TrabalhosController],
  providers: [TrabalhosService],
})
export class TrabalhosModule {}
