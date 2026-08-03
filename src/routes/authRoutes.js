const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool } = require("../config/db");
const {
  JWT_SECRET,
  validarImagemBase64,
  validarRequisitosPassword,
  gerarCodigoReset,
  enviarEmailReset,
  registarLog,
} = require("../middleware/auth");

const router = express.Router();

// REGISTO DE UTILIZADOR
router.post("/register", async (req, res) => {
  const { username, email, password, pfp } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ erro: "Preencha todos os campos!" });
  }

  if (username.length < 3) {
    return res
      .status(400)
      .json({ erro: "O username deve ter pelo menos 3 caracteres!" });
  }

  if (!validarRequisitosPassword(password)) {
    return res.status(400).json({
      erro: "A password deve ter pelo menos 8 caracteres, incluindo 1 letra maiúscula, 1 minúscula, 1 número e 1 caráter especial!",
    });
  }

  if (pfp && !validarImagemBase64(pfp)) {
    return res.status(400).json({
      erro: "Formato de imagem inválido ou demasiado grande. Utilize PNG, JPEG ou WEBP até ~5MB.",
    });
  }

  try {
    const userCheck = await pool.query(
      "SELECT * FROM utilizadores WHERE username = $1 OR email = $2",
      [username, email],
    );

    if (userCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ erro: "Username ou E-mail já registados!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const pfpFinal = pfp || "imagens/pfp.png";
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const result = await pool.query(
      "INSERT INTO utilizadores (username, email, password_hash, pfp, is_admin, ultimo_login, ip_acesso) VALUES ($1, $2, $3, $4, 0, NOW(), $5) RETURNING id",
      [username, email, hashedPassword, pfpFinal, ip],
    );

    const newUserId = result.rows[0].id;
    await registarLog(username, "CRIOU CONTA", "SISTEMA");

    const token = jwt.sign(
      { id: newUserId, username, email, is_admin: 0 },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      mensagem: "Utilizador registado com sucesso!",
      token,
      user: { username, email, pfp: pfpFinal, is_admin: 0 },
    });
  } catch (err) {
    console.error("❌ Erro no registo:", err.message);
    res.status(500).json({ erro: "Erro ao registar utilizador." });
  }
});

// LOGIN DE UTILIZADOR
router.post("/login", async (req, res) => {
  const { loginInput, password } = req.body;

  if (!loginInput || !password) {
    return res.status(400).json({ erro: "Preencha todos os campos!" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM utilizadores WHERE username = $1 OR email = $2",
      [loginInput, loginInput],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ erro: "Credenciais inválidas!" });
    }

    const user = result.rows[0];

    if (
      user.tentativas_falhadas >= 5 &&
      user.ultimo_login &&
      Date.now() - new Date(user.ultimo_login).getTime() < 15 * 60 * 1000
    ) {
      const minutosRestantes = Math.ceil(
        (15 * 60 * 1000 - (Date.now() - new Date(user.ultimo_login).getTime())) /
          60000,
      );
      return res.status(403).json({
        erro: `Conta temporariamente bloqueada devido a excesso de tentativas falhadas. Tenta novamente em ${minutosRestantes} minuto(s).`,
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      await pool.query(
        "UPDATE utilizadores SET tentativas_falhadas = tentativas_falhadas + 1, ultimo_login = NOW() WHERE id = $1",
        [user.id],
      );
      return res.status(400).json({ erro: "Credenciais inválidas!" });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    await pool.query(
      "UPDATE utilizadores SET tentativas_falhadas = 0, ultimo_login = NOW(), ip_acesso = $1 WHERE id = $2",
      [ip, user.id],
    );

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      mensagem: "Login efetuado com sucesso!",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        pfp: user.pfp,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error("❌ Erro no login:", err.message);
    res.status(500).json({ erro: "Erro ao efetuar login." });
  }
});

// PEDIDO DE RECUPERAÇÃO DE PASSWORD
router.post("/forgot-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ erro: "Preencha todos os campos!" });
  }

  if (!validarRequisitosPassword(newPassword)) {
    return res.status(400).json({
      erro: "A nova password deve ter pelo menos 8 caracteres, incluindo 1 letra maiúscula, 1 minúscula, 1 número e 1 caráter especial!",
    });
  }

  try {
    const userResult = await pool.query(
      "SELECT * FROM utilizadores WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ erro: "E-mail não encontrado!" });
    }

    const user = userResult.rows[0];
    const codigo = gerarCodigoReset();
    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(codigo, salt);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      "DELETE FROM password_resets WHERE username = $1 OR email = $2",
      [user.username, email],
    );

    await pool.query(
      "INSERT INTO password_resets (username, email, code_hash, new_password_hash, expires_at) VALUES ($1, $2, $3, $4, $5)",
      [user.username, email, codeHash, newPasswordHash, expiresAt],
    );

    const emailEnviado = await enviarEmailReset(email, user.username, codigo);

    res.json({
      mensagem: emailEnviado
        ? "Código de verificação enviado para o teu e-mail!"
        : "Pedido registado. Caso o e-mail não chegue, contacta o administrador.",
      emailEnviado,
    });
  } catch (err) {
    console.error("❌ Erro no pedido de recuperação:", err.message);
    res.status(500).json({ erro: "Erro ao processar pedido de recuperação." });
  }
});

// VERIFICAÇÃO E REINICIALIZAÇÃO DA PASSWORD COM CÓDIGO
router.post("/verify-reset-code", async (req, res) => {
  const { email, codigo } = req.body;

  if (!email || !codigo) {
    return res
      .status(400)
      .json({ erro: "Preencha o e-mail e o código de verificação!" });
  }

  try {
    const resetResult = await pool.query(
      "SELECT * FROM password_resets WHERE email = $1 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [email],
    );

    if (resetResult.rows.length === 0) {
      return res
        .status(400)
        .json({ erro: "Código inválido ou expirado. Pede um novo código." });
    }

    const resetRequest = resetResult.rows[0];
    const codigoValido = await bcrypt.compare(codigo, resetRequest.code_hash);

    if (!codigoValido) {
      return res.status(400).json({ erro: "Código de verificação incorreto!" });
    }

    await pool.query(
      "UPDATE utilizadores SET password_hash = $1 WHERE email = $2",
      [resetRequest.new_password_hash, email],
    );

    await pool.query("DELETE FROM password_resets WHERE email = $1", [email]);
    await registarLog(resetRequest.username, "REDEFINIU PASSWORD", "SISTEMA");

    res.json({
      mensagem: "Password redefinida com sucesso! Já podes fazer login.",
    });
  } catch (err) {
    console.error("❌ Erro ao verificar código de reset:", err.message);
    res
      .status(500)
      .json({ erro: "Erro ao concluir a redefinição de password." });
  }
});

module.exports = router;
