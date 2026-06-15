import { Controller, Get, Query, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../autenticacao/jwt-auth.guard';
import { createClient } from '@supabase/supabase-js';

@Controller('arquivos')
export class ArquivosController {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  @Get('download')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Query('bucket') bucket: string,
    @Query('path') path: string,
    @Res() res: Response
  ) {
    if (!this.supabase) {
      return res.status(500).json({ message: 'Supabase não configurado no servidor' });
    }

    if (!bucket || !path) {
      return res.status(400).json({ message: 'Parâmetros bucket e path são obrigatórios' });
    }

    try {
      // Cria uma URL assinada válida por 60 segundos usando a chave de serviço
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60, {
          download: false // Se true, força o header Content-Disposition: attachment
        });

      if (error || !data) {
        console.error('Erro ao gerar signed url:', error);
        return res.status(404).json({ message: 'Arquivo não encontrado ou erro de permissão' });
      }

      // Redireciona o usuário para a URL assinada recém gerada
      return res.redirect(302, data.signedUrl);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erro interno ao processar o arquivo' });
    }
  }
}
