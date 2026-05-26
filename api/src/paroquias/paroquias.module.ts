import { Module } from '@nestjs/common';
import { ParoquiasController } from './paroquias.controller';
import { ParoquiasService } from './paroquias.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ParoquiasController],
  providers: [ParoquiasService],
})
export class ParoquiasModule {}

