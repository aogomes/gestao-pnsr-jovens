import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';
import * as dns from 'dns';

// Força o Node.js a preferir IPv4 para evitar erro ENETUNREACH (IPv6) no Render
dns.setDefaultResultOrder('ipv4first');

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
        secure: process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : true, // default para true se 465
        family: 4, // Força o uso de IPv4 na conexão de socket

        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000, // 10 segundos
        greetingTimeout: 10000,
      },
      defaults: {
        from: '"Peregrinação Rosário (JMJ Seul 2027)" <noreply@peregrinacaorosario.com.br>',
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule { }
