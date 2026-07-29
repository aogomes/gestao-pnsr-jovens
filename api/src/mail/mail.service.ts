import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendVerificationCode(email: string, code: string, userName: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Peregrinação Rosário (JMJ Seul 2027) <onboarding@resend.dev>',
        to: email,
        subject: 'Seu Código de Verificação - Peregrinação Rosário (JMJ Seul 2027)',
        html: `
          <div style="font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #1351b4 0%, #0d3880 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Peregrinação</h1>
              <div style="background-color: rgba(255, 255, 255, 0.2); display: inline-block; padding: 6px 16px; border-radius: 20px; margin-top: 12px;">
                <p style="color: #ffffff; margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">JMJ Seul 2027 🇰🇷</p>
              </div>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
              <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">Olá, ${userName}!</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Recebemos uma solicitação de acesso para sua conta. Utilize o código de verificação abaixo para continuar:
              </p>
              
              <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
                <span style="font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #1351b4; margin-left: 12px;">${code}</span>
              </div>
              
              <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 0;">
                <span style="display: inline-block; vertical-align: middle; margin-right: 6px;">⏱️</span>
                Este código expira em <strong style="color: #0f172a;">15 minutos</strong>.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
              
              <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0; line-height: 1.5;">
                Se você não solicitou este código, por favor, ignore este e-mail. Sua conta está segura.<br/><br/>
                <strong>Equipe Organizadora - Peregrinação Rosário (JMJ Seul 2027)</strong>
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('Erro Resend:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      return false;
    }
  }
}
