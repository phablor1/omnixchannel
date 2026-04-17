const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omnixchannel.conectxip.cloud';
const CLIENT_PORTAL_USERNAME = process.env.CLIENT_PORTAL_USERNAME || 'cliente';
const CLIENT_PORTAL_PASSWORD = process.env.CLIENT_PORTAL_PASSWORD || 'troque-esta-senha';
const SESSION_TTL_MS = Number(process.env.CLIENT_PORTAL_SESSION_TTL_MS || 30 * 60 * 1000);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const sessions = new Map();

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })
  : null;

const allowedMethods = 'GET, POST, OPTIONS';
const allowedHeaders = 'Content-Type, Authorization';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_URL);
  res.header('Access-Control-Allow-Methods', allowedMethods);
  res.header('Access-Control-Allow-Headers', allowedHeaders);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return next();
});

app.use(bodyParser.json({ limit: '10mb' }));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.header('Access-Control-Allow-Origin', FRONTEND_URL);
    res.header('Access-Control-Allow-Methods', allowedMethods);
    res.header('Access-Control-Allow-Headers', allowedHeaders);
    res.status(options.statusCode).json(options.message);
  }
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

function timingSafeCompare(a, b) {
  const aBuffer = Buffer.from(a || '', 'utf8');
  const bBuffer = Buffer.from(b || '', 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function sanitizeText(value, maxLength = 120) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function isSecureHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

function getTokenFromRequest(req) {
  const authHeader = req.header('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

function requirePersistenceAvailable(res) {
  if (supabase) {
    return true;
  }

  res.status(503).json({
    success: false,
    message: 'Persistência indisponível. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
  });
  return false;
}

function requireClientSession(req, res, next) {
  cleanupExpiredSessions();

  const token = getTokenFromRequest(req);
  if (!token || !sessions.has(token)) {
    return res.status(401).json({
      success: false,
      message: 'Sessão inválida ou expirada. Faça login novamente.'
    });
  }

  const session = sessions.get(token);
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  req.session = session;
  req.sessionToken = token;

  return next();
}

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'ConectXIP Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/contact', contactLimiter);

app.post('/api/contact', async (req, res) => {
  let { nome, email, empresa, mensagem } = req.body;

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Nome inválido.' });
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'E-mail inválido.' });
  }

  if (!mensagem || typeof mensagem !== 'string' || mensagem.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'A mensagem deve ter pelo menos 10 caracteres.'
    });
  }

  nome = nome.trim();
  email = email.trim();
  empresa = (empresa || 'Não informada').trim();
  mensagem = mensagem.trim();

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"Formulário Site" <${process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL || 'omnixchanel@gmail.com',
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

    return res.json({
      success: true,
      message: 'Mensagem enviada com sucesso! Em breve entraremos em contato.'
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar mensagem. Tente novamente mais tarde.'
    });
  }
});

app.post('/api/client-auth/login', authLimiter, (req, res) => {
  const username = sanitizeText(req.body?.username, 80);
  const password = sanitizeText(req.body?.password, 120);

  const isValid = timingSafeCompare(username, CLIENT_PORTAL_USERNAME)
    && timingSafeCompare(password, CLIENT_PORTAL_PASSWORD);

  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
  }

  cleanupExpiredSessions();

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { username, createdAt: Date.now(), expiresAt });

  return res.json({
    success: true,
    token,
    expiresAt,
    message: 'Acesso autorizado com sucesso.'
  });
});

app.get('/api/client-auth/session', requireClientSession, (req, res) => {
  res.json({
    success: true,
    username: req.session.username,
    expiresAt: req.session.expiresAt
  });
});

app.get('/api/client-area/template', requireClientSession, (req, res) => {
  res.json({
    success: true,
    html: `
      <div class="client-area-grid">
        <div class="client-card secure-onboarding">
          <h3>🔐 Onboarding Seguro</h3>
          <p>Fluxo guiado para conectar n8n e Evolution API sem expor credenciais sensíveis no frontend.</p>
          <ul class="feature-list">
            <li>✓ Sessões com expiração curta e renovação segura</li>
            <li>✓ Validação de endpoint HTTPS para n8n e Evolution API</li>
            <li>✓ Rastreabilidade de quem criou cada integração</li>
            <li>✓ Boas práticas de segurança aplicadas por padrão</li>
          </ul>
        </div>

        <div class="client-card client-form-card">
          <h3>Configurar Integração</h3>
          <form id="client-integration-form" class="client-form" novalidate>
            <div class="form-group">
              <label for="company-name">Nome da Empresa</label>
              <input type="text" id="company-name" name="companyName" required maxlength="120" placeholder="Empresa Exemplo LTDA">
            </div>
            <div class="form-group">
              <label for="company-id">ID da Empresa</label>
              <input type="text" id="company-id" name="companyId" required maxlength="40" pattern="[A-Za-z0-9_-]{4,40}" placeholder="ex: cliente_1234">
              <small>Use somente letras, números, _ e - (mín. 4 caracteres).</small>
            </div>
            <div class="form-group">
              <label for="contact-email">E-mail corporativo</label>
              <input type="email" id="contact-email" name="contactEmail" required placeholder="seguranca@suaempresa.com">
            </div>
            <div class="form-group">
              <label for="n8n-endpoint">Endpoint n8n (HTTPS obrigatório)</label>
              <input type="url" id="n8n-endpoint" name="n8nEndpoint" required placeholder="https://n8n.suaempresa.com/webhook/entrada">
            </div>
            <div class="form-group">
              <label for="evolution-endpoint">Endpoint Evolution API (HTTPS obrigatório)</label>
              <input type="url" id="evolution-endpoint" name="evolutionEndpoint" required placeholder="https://api.suaempresa.com/evolution">
            </div>
            <div class="form-group">
              <label for="security-level">Nível de segurança</label>
              <select id="security-level" name="securityLevel" required>
                <option value="">Selecione</option>
                <option value="strict">Strict (recomendado)</option>
                <option value="high">High</option>
                <option value="standard">Standard</option>
              </select>
            </div>
            <button type="submit" class="btn-primary" style="width: 100%; justify-content: center;">
              Salvar Integração
            </button>
            <div id="client-security-result" class="client-security-result" aria-live="polite"></div>
          </form>
        </div>
      </div>

      <div class="client-area-grid admin-grid">
        <div class="client-card">
          <div class="admin-header">
            <h3>📋 Integrações Registradas</h3>
            <button id="client-logout" type="button" class="btn-secondary">Sair</button>
          </div>
          <p>Visualize as integrações já configuradas para n8n e Evolution API.</p>
          <div class="admin-actions">
            <button id="refresh-admin-clients" class="btn-primary" type="button">Atualizar Lista</button>
          </div>
          <div id="admin-clients-list" class="admin-clients-list">
            <p>Carregando integrações...</p>
          </div>
        </div>
      </div>
    `
  });
});

app.post('/api/client-auth/logout', requireClientSession, (req, res) => {
  sessions.delete(req.sessionToken);
  res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
});

app.post('/api/client-integrations', requireClientSession, async (req, res) => {
  if (!requirePersistenceAvailable(res)) {
    return;
  }

  const companyName = sanitizeText(req.body?.companyName, 120);
  const companyId = sanitizeText(req.body?.companyId, 40);
  const contactEmail = sanitizeText(req.body?.contactEmail, 120).toLowerCase();
  const n8nEndpoint = sanitizeText(req.body?.n8nEndpoint, 255);
  const evolutionEndpoint = sanitizeText(req.body?.evolutionEndpoint, 255);
  const securityLevel = sanitizeText(req.body?.securityLevel, 20).toLowerCase();

  const companyIdRegex = /^[A-Za-z0-9_-]{4,40}$/;
  const validLevels = new Set(['strict', 'high', 'standard']);

  if (!companyName || !companyIdRegex.test(companyId)) {
    return res.status(400).json({
      success: false,
      message: 'Dados da empresa inválidos. Revise nome e ID.'
    });
  }

  if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return res.status(400).json({ success: false, message: 'E-mail corporativo inválido.' });
  }

  if (!isSecureHttpsUrl(n8nEndpoint) || !isSecureHttpsUrl(evolutionEndpoint)) {
    return res.status(400).json({
      success: false,
      message: 'Endpoints devem ser URLs HTTPS válidas.'
    });
  }

  if (!validLevels.has(securityLevel)) {
    return res.status(400).json({
      success: false,
      message: 'Nível de segurança inválido.'
    });
  }

  const payload = {
    company_id: companyId,
    company_name: companyName,
    contact_email: contactEmail,
    n8n_endpoint: n8nEndpoint,
    evolution_endpoint: evolutionEndpoint,
    security_level: securityLevel
  };

  try {
    const { data, error } = await supabase
      .from('client_integrations')
      .upsert(payload, { onConflict: 'company_id' })
      .select('id, company_id, company_name, contact_email, n8n_endpoint, evolution_endpoint, security_level, status, created_at, updated_at')
      .single();

    if (error) {
      throw error;
    }

    await supabase.from('integration_events').insert({
      client_integration_id: data.id,
      event_type: 'client_integration_upsert',
      source: 'client-portal',
      payload: {
        companyId,
        actor: req.session.username
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Integração registrada com sucesso.',
      integration: {
        id: data.id,
        companyId: data.company_id,
        companyName: data.company_name,
        contactEmail: data.contact_email,
        n8nEndpoint: data.n8n_endpoint,
        evolutionEndpoint: data.evolution_endpoint,
        securityLevel: data.security_level,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });
  } catch (error) {
    console.error('Erro ao persistir integração no Supabase:', error);
    return res.status(500).json({
      success: false,
      message: 'Falha ao persistir integração no banco.'
    });
  }
});

app.get('/api/client-integrations', requireClientSession, async (req, res) => {
  if (!requirePersistenceAvailable(res)) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from('client_integrations')
      .select('id, company_id, company_name, contact_email, n8n_endpoint, evolution_endpoint, security_level, status, created_at, updated_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      integrations: data.map(item => ({
        id: item.id,
        companyId: item.company_id,
        companyName: item.company_name,
        contactEmail: item.contact_email,
        n8nEndpoint: item.n8n_endpoint,
        evolutionEndpoint: item.evolution_endpoint,
        securityLevel: item.security_level,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    });
  } catch (error) {
    console.error('Erro ao consultar integrações no Supabase:', error);
    res.status(500).json({
      success: false,
      message: 'Falha ao consultar integrações no banco.'
    });
  }
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend rodando na porta ${PORT}`);
  console.log('🔗 Endpoints: GET /health | POST /api/contact | POST /api/client-auth/login');
});
