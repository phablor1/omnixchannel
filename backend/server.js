// server.js
//require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

// ======================
// MIDDLEWARES
// ======================

// Middleware para CORS (aplicado a todas as rotas)
app.use((req, res, next) => {
  const allowedOrigin = process.env.FRONTEND_URL || 'https://omnixchannel.conectxip.cloud';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Responder imediatamente a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Body parser para JSON
app.use(bodyParser.json({ limit: '10mb' }));

// ======================
// RATE LIMITING (com CORS incluso no erro)
// ======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    // Garante que o erro 429 também tenha os headers de CORS
    const allowedOrigin = process.env.FRONTEND_URL || 'https://omnixchannel.conectxip.cloud';
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(options.statusCode).json(options.message);
  }
});

// Aplica o rate limit apenas na rota de contato
app.use('/api/contact', limiter);

// ======================
// ROTAS
// ======================

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'ConectXIP Backend - Formulário de Contato',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rota principal: processar formulário
app.post('/api/contact', async (req, res) => {
  let { nome, email, empresa, mensagem } = req.body;

  // ======================
  // VALIDAÇÃO DOS DADOS
  // ======================
  if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Nome inválido.'
    });
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'E-mail inválido.'
    });
  }

  if (!mensagem || typeof mensagem !== 'string' || mensagem.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'A mensagem deve ter pelo menos 10 caracteres.'
    });
  }

  // Sanitização básica
  nome = nome.trim();
  email = email.trim();
  empresa = (empresa || 'Não informada').trim();
  mensagem = mensagem.trim();

  try {
    // ======================
    // CONFIGURAÇÃO DO EMAIL (Nodemailer)
    // ======================
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true para 465, false para outros
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false // Desativar apenas em dev
      }
    });

    // Teste de conexão (opcional, pode ser removido em produção)
    await transporter.verify();

    // ======================
    // ENVIO DO EMAIL
    // ======================
    await transporter.sendMail({
      from: `"Formulário Site" <${process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL || 'omnixchanel@gmail.com',
      replyTo: email,
      subject: `📞 Novo contato de ${nome} - ${empresa}`,
      text: `
Nova mensagem do site ConectXIP Cloud:

Nome: ${nome}
E-mail: ${email}
Empresa: ${empresa}
Mensagem:
${mensagem}

Recebido em: ${new Date().toLocaleString('pt-BR')}
      `,
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
  <div style="background: #f1f1f1; padding: 15px; text-align: center; font-size: 0.9em; color: #666;">
    Este e-mail foi enviado automaticamente através do site <strong>ConectXIP Cloud</strong>.
  </div>
</div>
      `
    });

    console.log(`✅ E-mail enviado com sucesso: ${nome} <${email}>`);
    return res.json({
      success: true,
      message: 'Mensagem enviada com sucesso! Em breve entraremos em contato.'
    });

  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);

    // Em produção, não exponha detalhes do erro
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar mensagem. Tente novamente mais tarde.'
    });
  }
});
// Rota health
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
// Rota 404 para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ======================
// INICIALIZAÇÃO DO SERVIDOR
// ======================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend rodando na porta ${PORT}`);
  console.log(`🔗 Endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   POST /api/contact`);
});
