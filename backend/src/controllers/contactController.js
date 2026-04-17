const { sendContactEmail } = require('../services/contactService');

async function sendContact(req, res) {
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
    await sendContactEmail({ nome, email, empresa, mensagem });

    return res.json({
      success: true,
      message: 'Mensagem enviada com sucesso! Em breve entraremos em contato.'
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao enviar e-mail:`, error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar mensagem. Tente novamente mais tarde.'
    });
  }
}

module.exports = { sendContact };
