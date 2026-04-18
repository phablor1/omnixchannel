const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const dotenvCandidates = [
  process.env.DOTENV_CONFIG_PATH,
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  '/app/.env'
].filter(Boolean);

dotenvCandidates.forEach((dotenvPath) => {
  if (fs.existsSync(dotenvPath)) {
    dotenv.config({ path: dotenvPath, override: false });
  }
});

function normalizeEnvValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const env = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://omnixchannel.conectxip.cloud',
  CLIENT_PORTAL_USERNAME: process.env.CLIENT_PORTAL_USERNAME || 'cliente',
  CLIENT_PORTAL_PASSWORD: process.env.CLIENT_PORTAL_PASSWORD || 'troque-esta-senha',
  SESSION_TTL_MS: Number(process.env.CLIENT_PORTAL_SESSION_TTL_MS || 30 * 60 * 1000),
  SUPABASE_URL: normalizeEnvValue(process.env.SUPABASE_URL || process.env.SUPABSE_URL || ''),
  SUPABASE_SERVICE_ROLE_KEY: normalizeEnvValue(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABSE_SERVICE_ROLE_KEY || ''
  ),
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  TO_EMAIL: process.env.TO_EMAIL || 'omnixchanel@gmail.com'
};

function validateRuntimeConfig() {
  const errors = [];

  if (!Number.isFinite(env.PORT) || env.PORT <= 0 || env.PORT > 65535) {
    errors.push('PORT deve ser um número entre 1 e 65535.');
  }

  if (!Number.isFinite(env.SESSION_TTL_MS) || env.SESSION_TTL_MS < 60_000) {
    errors.push('CLIENT_PORTAL_SESSION_TTL_MS deve ser >= 60000 ms.');
  }

  if (env.NODE_ENV === 'production' && env.CLIENT_PORTAL_PASSWORD === 'troque-esta-senha') {
    errors.push('CLIENT_PORTAL_PASSWORD padrão não é permitido em produção.');
  }

  if (env.NODE_ENV === 'production' && !env.SMTP_USER) {
    errors.push('SMTP_USER é obrigatório em produção.');
  }

  if (env.NODE_ENV === 'production' && !env.SMTP_PASS) {
    errors.push('SMTP_PASS é obrigatório em produção.');
  }

  if (errors.length > 0) {
    console.error('❌ Falha na validação de configuração:');
    errors.forEach(error => console.error(` - ${error}`));
    process.exit(1);
  }
}

module.exports = { env, validateRuntimeConfig };
