import 'dotenv/config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error('❌ ERRO: DATABASE_URL não encontrada no ambiente!');
    }
    const isLocalhost = url?.includes('localhost') || url?.includes('127.0.0.1');
    const pool = new Pool({
      connectionString: url,
      min: 5,
      max: 20,
      ssl: isLocalhost ? false : { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
