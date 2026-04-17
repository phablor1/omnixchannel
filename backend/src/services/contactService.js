const nodemailer = require('nodemailer');
const { env } = require('../config/env');

async function sendContactEmail({ nome, email, empresa, mensagem }) {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: env.NODE_ENV === 'production'
    }
  });

  await transporter.verify();

  await transporter.sendMail({
    from: `"Formulário Site" <${env.SMTP_USER}>`,
    to: env.TO_EMAIL,
    replyTo: email,
    subject: `📞 Novo contato de ${nome} - ${empresa}`,
    text: `\nNova mensagem do site ConectXIP Cloud:\n\nNome: ${nome}\nE-mail: ${email}\nEmpresa: ${empresa}\nMensagem:\n${mensagem}\n\nRecebido em: ${new Date().toLocaleString('pt-BR')}\n      `,
    html: `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; text-align: center;">
    <h2>📞 Novo Contato - ConectXIP Cloud</h2>
  </div>
  <div style="padding: 20px; line-height: 1.6;">
    <p><strong>Nome:</strong> ${nome}</p>
    <p><strong>E-mail:</strong> <a href="mailto:${email}" style="color: #667eea;">${email}</a></p>
    <p><strong>Empresa:</strong> ${empresa}</p>
    <p><strong>Mensagem:</strong></p>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea;">
      ${mensagem.replace(/\n/g, '<br>')}
    </div>
    <p><strong>Recebido em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
  </div>
</div>
      `
  });
}

module.exports = { sendContactEmail };
