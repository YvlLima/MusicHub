const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { pool } = require("../config/db");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error(
          "FATAL: JWT_SECRET não está configurado nas variáveis de ambiente!",
        );
      })()
    : crypto.randomBytes(64).toString("hex"));

const SUPER_ADMIN = "YvlLima";

// Configurar o Nodemailer para envio de e-mails de recuperação
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function validarImagemBase64(str) {
  if (!str) return true;
  if (typeof str !== "string") return false;
  if (str.length > 7000000) return false;
  return /^data:image\/(png|jpeg|jpg|webp);base64,/.test(str);
}

function validarRequisitosPassword(password) {
  if (!password || typeof password !== "string") return false;
  if (password.length < 8) return false;
  const temMaiuscula = /[A-Z]/.test(password);
  const temMinuscula = /[a-z]/.test(password);
  const temNumero = /[0-9]/.test(password);
  const temEspecial = /[^A-Za-z0-9]/.test(password);
  return temMaiuscula && temMinuscula && temNumero && temEspecial;
}

function gerarCodigoReset() {
  return crypto.randomInt(100000, 999999).toString();
}

async function enviarEmailReset(emailDestino, username, codigo) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(
      `⚠️ E-mail não enviado para ${emailDestino}. EMAIL_USER ou EMAIL_PASS não configurados. Código: ${codigo}`,
    );
    return false;
  }

  const mailOptions = {
    from: `"Music Hub" <${process.env.EMAIL_USER}>`,
    to: emailDestino,
    subject: "🔐 Código de Recuperação de Password — Music Hub",
    html: `
      <div style="background-color: #050505; color: #ffffff; font-family: 'Courier New', monospace; padding: 30px; border-radius: 8px; border: 1px solid #ff0033;">
        <h2 style="color: #ff0033; letter-spacing: 2px;">RECUPERAÇÃO DE PASSWORD</h2>
        <p>Olá <strong>${username}</strong>,</p>
        <p>Recebemos um pedido para redefinir a tua password no <strong>Music Hub</strong>.</p>
        <p>O teu código de verificação é:</p>
        <div style="background-color: #0d0d0d; border: 1px solid #ff0033; color: #ff0033; font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px;">
          ${codigo}
        </div>
        <p style="color: #888888; font-size: 12px;">Este código expira em 15 minutos.</p>
        <p style="color: #666666; font-size: 11px; margin-top: 30px;">Se não pediste a redefinição de password, ignora este e-mail.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ E-mail de recuperação enviado para ${emailDestino}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao enviar e-mail de recuperação:`, error.message);
    return false;
  }
}

async function registarLog(autor, acao, alvo) {
  try {
    await pool.query(
      "INSERT INTO logs (autor, acao, alvo) VALUES ($1, $2, $3)",
      [autor, acao, alvo],
    );
  } catch (err) {
    console.error("❌ Erro ao registar log:", err.message);
  }
}

async function registarHistoricoCandidatura(client, candidaturaId, acao, realizadoPor, motivo = null) {
  try {
    await client.query(
      "INSERT INTO historico_candidaturas (candidatura_id, acao, realizado_por, motivo) VALUES ($1, $2, $3, $4)",
      [candidaturaId, acao, realizadoPor, motivo],
    );
  } catch (err) {
    console.error("❌ Erro ao registar histórico de candidatura:", err.message);
  }
}

function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ erro: "Acesso negado. Token não fornecido." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ erro: "Token inválido ou expirado." });
    }
    req.user = user;
    next();
  });
}

function verificarAdmin(req, res, next) {
  if (!req.user || req.user.is_admin !== 1) {
    return res
      .status(403)
      .json({ erro: "Acesso restrito a Administradores!" });
  }
  next();
}

function verificarModOuAdmin(req, res, next) {
  if (!req.user || req.user.is_admin <= 0) {
    return res
      .status(403)
      .json({ erro: "Acesso restrito a Moderadores e Administradores!" });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  SUPER_ADMIN,
  validarImagemBase64,
  validarRequisitosPassword,
  gerarCodigoReset,
  enviarEmailReset,
  registarLog,
  registarHistoricoCandidatura,
  autenticarToken,
  verificarAdmin,
  verificarModOuAdmin,
};
