import { Module } from '@nestjs/common';
import { RifasController } from './rifas.controller';
import { RifasService } from './rifas.service';

@Module({
  controllers: [RifasController],
  providers: [RifasService]
})
export class RifasModule {}
