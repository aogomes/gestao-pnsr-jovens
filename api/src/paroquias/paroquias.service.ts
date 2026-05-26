import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParoquiaDto } from './dto/create-paroquia.dto';
import { UpdateParoquiaDto } from './dto/update-paroquia.dto';

@Injectable()
export class ParoquiasService {
  constructor(private prisma: PrismaService) {}

  criar(createParoquiaDto: CreateParoquiaDto) {
    return this.prisma.paroquia.create({ data: createParoquiaDto });
  }

  buscarTodas() {
    return this.prisma.paroquia.findMany();
  }

  buscarUma(id: number) {
    return this.prisma.paroquia.findUnique({ where: { id } });
  }

  atualizar(id: number, updateParoquiaDto: UpdateParoquiaDto) {
    return this.prisma.paroquia.update({ where: { id }, data: updateParoquiaDto });
  }

  remover(id: number) {
    return this.prisma.paroquia.delete({ where: { id } });
  }
}

