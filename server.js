require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const app = express();
const JWT_SECRET =
  process.env.JWT_SECRET || "chave_secreta_super_segura_opium_hub";
const SUPER_ADMIN = "YvlLima";

// Necessário para o rate-limit funcionar corretamente no Render
app.set("trust proxy", 1);

app.use(express.static("public"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// CORS configurado para permitir o teu frontend no Cloudflare Pages e ambiente local
app.use(
  cors({
    origin: [
      "https://musichub-9hu.pages.dev",
      "http://localhost:3000",
      "http://127.0.0.1:5500",
    ],
    credentials: true,
  }),
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ==========================================
// INICIALIZAÇÃO DA BASE DE DADOS
// ==========================================
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS utilizadores (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        pfp TEXT DEFAULT 'imagens/pfp.png',
        is_admin INT DEFAULT 0,
        tentativas_falhadas INT DEFAULT 0,
        ultimo_login TIMESTAMP,
        ip_acesso VARCHAR(45)
      );
    `);

    await pool.query(`
      ALTER TABLE utilizadores 
      ADD COLUMN IF NOT EXISTS tentativas_falhadas INT DEFAULT 0;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        UNIQUE(username, item_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        autor VARCHAR(255) NOT NULL,
        acao VARCHAR(255) NOT NULL,
        alvo VARCHAR(255) NOT NULL,
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS seguidores (
        id SERIAL PRIMARY KEY,
        follower_username VARCHAR(255) NOT NULL,
        following_username VARCHAR(255) NOT NULL,
        data_seguido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_username, following_username)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        estrelas INT CHECK (estrelas >= 1 AND estrelas <= 5),
        UNIQUE(username, item_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidaturas (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('artista', 'album')),
        artist_name VARCHAR(255) NOT NULL,
        artist_birthdate DATE,
        artist_photo TEXT,
        album_title VARCHAR(255),
        album_cover TEXT,
        album_date DATE,
        year INT,
        genre VARCHAR(100),
        description TEXT,
        profile_links TEXT,
        album_link TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        submitted_by VARCHAR(255) NOT NULL,
        submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_by VARCHAR(255),
        reviewed_date TIMESTAMP,
        rejection_reason TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico_candidaturas (
        id SERIAL PRIMARY KEY,
        candidatura_id INT NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
        acao VARCHAR(50) NOT NULL,
        realizado_por VARCHAR(255) NOT NULL,
        motivo TEXT,
        data_acao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Tabelas e colunas verificadas com sucesso.");
  } catch (err) {
    console.error("❌ Erro ao inicializar PostgreSQL:", err.message);
  }
}
if (process.env.NODE_ENV !== "test") {
  initDB();
}

async function registarLog(autor, acao, alvo) {
  try {
    await pool.query(
      "INSERT INTO logs (autor, acao, alvo) VALUES ($1, $2, $3)",
      [autor, acao, alvo],
    );
  } catch (err) {
    console.error("Erro ao gravar log:", err.message);
  }
}

async function registarHistoricoCandidatura(
  candidatura_id,
  acao,
  realizado_por,
  motivo = null,
) {
  try {
    await pool.query(
      "INSERT INTO historico_candidaturas (candidatura_id, acao, realizado_por, motivo) VALUES ($1, $2, $3, $4)",
      [candidatura_id, acao, realizado_por, motivo],
    );
  } catch (err) {
    console.error("Erro ao registar histórico de candidatura:", err.message);
  }
}

// Middleware
function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ erro: "Acesso negado. Token em falta." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ erro: "Token inválido ou expirado." });
    req.user = user;
    next();
  });
}

function verificarAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ erro: "Acesso restrito!" });
  }
  next();
}

function validarImagemBase64(str) {
  if (!str || str === "imagens/pfp.png") return true;
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(str);
}

// ==========================================
// ENDPOINTS
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({ status: "online", timestamp: new Date() });
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { erro: "DEMASIADAS TENTATIVAS. TENTA NOVAMENTE MAIS TARDE." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login
app.post("/api/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ erro: "PREENCHE TODOS OS CAMPOS!" });
  }

  try {
    const userRes = await pool.query(
      "SELECT * FROM utilizadores WHERE username = $1",
      [username],
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ erro: "UTILIZADOR OU PASS INCORRETA!" });
    }

    const user = userRes.rows[0];

    if (!user.password_hash) {
      return res.status(400).json({ erro: "ERRO NOS DADOS DO UTILIZADOR!" });
    }

    const tentativas = user.tentativas_falhadas || 0;

    if (tentativas >= 5) {
      return res
        .status(403)
        .json({ erro: "CONTA BLOQUEADA POR EXCESSO DE TENTATIVAS!" });
    }

    const passCorreta = await bcrypt.compare(password, user.password_hash);

    if (!passCorreta) {
      await pool.query(
        "UPDATE utilizadores SET tentativas_falhadas = $1 WHERE id = $2",
        [tentativas + 1, user.id],
      );
      return res.status(400).json({ erro: "UTILIZADOR OU PASS INCORRETA!" });
    }

    await pool.query(
      "UPDATE utilizadores SET tentativas_falhadas = 0 WHERE id = $1",
      [user.id],
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      mensagem: "BEM-VINDO!",
      token,
      user: {
        username: user.username,
        email: user.email,
        pfp: user.pfp || "imagens/pfp.png",
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error("Erro interno no login:", err);
    res.status(500).json({ erro: "ERRO INTERNO NO SERVIDOR!" });
  }
});

// Registo
app.post("/api/register", async (req, res) => {
  const { username, email, password, pfp } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ erro: "Preenche todos os campos." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ erro: "Formato de e-mail inválido." });
  }

  const foto = pfp || "imagens/pfp.png";

  try {
    const hash = await bcrypt.hash(password, 10);
    const isAdminVal = username === SUPER_ADMIN ? 1 : 0;

    await pool.query(
      "INSERT INTO utilizadores (username, email, password_hash, pfp, is_admin, tentativas_falhadas) VALUES ($1, $2, $3, $4, $5, 0)",
      [username, email, hash, foto, isAdminVal],
    );

    const token = jwt.sign(
      { username, email, is_admin: isAdminVal },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      mensagem: "Registo efetuado com sucesso!",
      token,
      user: { username, email, pfp: foto, is_admin: isAdminVal },
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ erro: "Utilizador ou e-mail já existe." });
    }
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// Likes
app.get("/api/likes", async (req, res) => {
  const { username } = req.query;

  try {
    const totais = await pool.query(
      "SELECT item_id, COUNT(*)::int as total FROM likes GROUP BY item_id",
    );
    const contagem = {};
    totais.rows.forEach((row) => (contagem[row.item_id] = row.total));

    let deuLike = [];
    if (username) {
      const meus = await pool.query(
        "SELECT item_id FROM likes WHERE username = $1",
        [username],
      );
      deuLike = meus.rows.map((r) => r.item_id);
    }

    res.json({ contagem, deuLike });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao obter likes." });
  }
});

app.post("/api/like", autenticarToken, async (req, res) => {
  const { username, item_id } = req.body;

  if (!username || !item_id) {
    return res.status(400).json({ erro: "Dados incompletos." });
  }

  try {
    const existe = await pool.query(
      "SELECT id FROM likes WHERE username = $1 AND item_id = $2",
      [username, item_id],
    );

    if (existe.rows.length > 0) {
      await pool.query(
        "DELETE FROM likes WHERE username = $1 AND item_id = $2",
        [username, item_id],
      );
      return res.json({ acao: "removido" });
    }

    await pool.query("INSERT INTO likes (username, item_id) VALUES ($1, $2)", [
      username,
      item_id,
    ]);
    res.json({ acao: "adicionado" });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao processar like." });
  }
});

// Estatísticas sociais e Seguidores
app.get("/api/users/:username/social", async (req, res) => {
  const { username } = req.params;

  try {
    const followers = await pool.query(
      "SELECT COUNT(*)::int as total FROM seguidores WHERE following_username = $1",
      [username],
    );
    const following = await pool.query(
      "SELECT COUNT(*)::int as total FROM seguidores WHERE follower_username = $1",
      [username],
    );

    res.json({
      followers: followers.rows[0].total,
      following: following.rows[0].total,
    });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao obter estatísticas sociais." });
  }
});

app.get("/api/my-following", autenticarToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT following_username FROM seguidores WHERE follower_username = $1 ORDER BY data_seguido DESC",
      [req.user.username],
    );
    res.json({ following: result.rows.map((r) => r.following_username) });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao obter lista de seguimentos." });
  }
});

// Perfil
app.put("/api/update-profile", autenticarToken, async (req, res) => {
  const { currentUsername, newUsername, email, newPassword, pfp } = req.body;

  if (!newUsername || !newUsername.trim()) {
    return res
      .status(400)
      .json({ erro: "O nome de utilizador é obrigatório." });
  }

  if (pfp && !validarImagemBase64(pfp)) {
    return res
      .status(400)
      .json({ erro: "Formato de imagem de perfil inválido." });
  }

  try {
    if (newUsername !== currentUsername) {
      const existe = await pool.query(
        "SELECT id FROM utilizadores WHERE username = $1",
        [newUsername],
      );
      if (existe.rows.length > 0) {
        return res.status(400).json({ erro: "Nome de utilizador já existe!" });
      }
    }

    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);
      await pool.query(
        "UPDATE utilizadores SET username = $1, email = $2, password_hash = $3, pfp = $4 WHERE username = $5",
        [newUsername, email, hash, pfp || "imagens/pfp.png", currentUsername],
      );
    } else {
      await pool.query(
        "UPDATE utilizadores SET username = $1, email = $2, pfp = $3 WHERE username = $4",
        [newUsername, email, pfp || "imagens/pfp.png", currentUsername],
      );
    }

    if (newUsername !== currentUsername) {
      await pool.query("UPDATE likes SET username = $1 WHERE username = $2", [
        newUsername,
        currentUsername,
      ]);
      await pool.query(
        "UPDATE seguidores SET follower_username = $1 WHERE follower_username = $2",
        [newUsername, currentUsername],
      );
      await pool.query(
        "UPDATE seguidores SET following_username = $1 WHERE following_username = $2",
        [newUsername, currentUsername],
      );
    }

    const novoToken = jwt.sign(
      { username: newUsername, email, is_admin: req.user.is_admin },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({ mensagem: "Perfil atualizado com sucesso!", token: novoToken });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ erro: "Nome de utilizador ou e-mail já existe." });
    }
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

app.delete("/api/delete-profile", autenticarToken, async (req, res) => {
  const username = req.user.username;

  if (username === SUPER_ADMIN) {
    return res
      .status(403)
      .json({ erro: "A conta do Super Admin não pode ser eliminada!" });
  }

  try {
    await pool.query("DELETE FROM likes WHERE username = $1", [username]);
    await pool.query(
      "DELETE FROM seguidores WHERE follower_username = $1 OR following_username = $1",
      [username],
    );
    await pool.query("DELETE FROM utilizadores WHERE username = $1", [
      username,
    ]);

    res.json({ mensagem: "A tua conta foi eliminada com sucesso." });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao eliminar conta." });
  }
});

// Admin / Mod
app.get(
  "/api/admin/users",
  autenticarToken,
  verificarAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, username, email, is_admin FROM utilizadores ORDER BY id ASC",
      );
      res.json({ utilizadores: result.rows });
    } catch (err) {
      res.status(500).json({ erro: "Erro ao procurar utilizadores." });
    }
  },
);

app.get(
  "/api/admin/stats",
  autenticarToken,
  verificarAdmin,
  async (req, res) => {
    try {
      const totalUsers = await pool.query(
        "SELECT COUNT(*)::int as total FROM utilizadores",
      );
      const totalMods = await pool.query(
        "SELECT COUNT(*)::int as total FROM utilizadores WHERE is_admin = 2",
      );
      const totalLikes = await pool.query(
        "SELECT COUNT(DISTINCT item_id)::int as total FROM likes WHERE username IN (SELECT username FROM utilizadores)",
      );
      const logs = await pool.query(
        "SELECT * FROM logs ORDER BY id DESC LIMIT 10",
      );

      res.json({
        stats: {
          totalUsers: totalUsers.rows[0].total,
          totalMods: totalMods.rows[0].total,
          totalLikes: totalLikes.rows[0].total,
        },
        logs: logs.rows,
      });
    } catch (err) {
      res.status(500).json({ erro: "Erro ao obter estatísticas." });
    }
  },
);

app.get(
  "/api/admin/export",
  autenticarToken,
  verificarAdmin,
  async (req, res) => {
    const formato = req.query.format || "json";

    try {
      const result = await pool.query(
        "SELECT id, username, email, is_admin, ultimo_login, ip_acesso FROM utilizadores ORDER BY id ASC",
      );
      const rows = result.rows;

      if (formato === "csv") {
        let csv = "ID,Username,Email,Cargo,UltimoLogin,IP\n";
        rows.forEach((u) => {
          csv += `${u.id},"${u.username}","${u.email}",${u.is_admin},"${u.ultimo_login || ""}","${u.ip_acesso || ""}"\n`;
        });
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=utilizadores.csv",
        );
        return res.send(csv);
      }

      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: "Erro ao exportar dados." });
    }
  },
);

app.put(
  "/api/admin/promote-mod",
  autenticarToken,
  verificarAdmin,
  async (req, res) => {
    const { targetUsername } = req.body;

    if (targetUsername === SUPER_ADMIN) {
      return res
        .status(403)
        .json({ erro: "O Super Admin não pode alterar de cargo!" });
    }

    try {
      const result = await pool.query(
        "UPDATE utilizadores SET is_admin = 2 WHERE username = $1",
        [targetUsername],
      );
      if (result.rowCount === 0) {
        return res.status(400).json({ erro: "Utilizador não encontrado." });
      }
      await registarLog(req.user.username, "PROMOVEU A MOD", targetUsername);
      res.json({ mensagem: `'${targetUsername}' É AGORA MOD!` });
    } catch (err) {
      res.status(500).json({ erro: "Erro ao promover utilizador." });
    }
  },
);

app.put(
  "/api/admin/demote",
  autenticarToken,
  verificarAdmin,
  async (req, res) => {
    const { targetUsername } = req.body;

    if (targetUsername === SUPER_ADMIN) {
      return res
        .status(403)
        .json({ erro: "O Super Admin não pode ser despromovido!" });
    }

    if (targetUsername === req.user.username) {
      return res
        .status(400)
        .json({ erro: "Não te podes despromover a ti próprio!" });
    }

    try {
      await pool.query(
        "UPDATE utilizadores SET is_admin = 0 WHERE username = $1",
        [targetUsername],
      );
      await registarLog(req.user.username, "REMOVEU CARGO", targetUsername);
      res.json({ mensagem: "CARGO REMOVIDO COM SUCESSO!" });
    } catch (err) {
      res.status(500).json({ erro: "Erro ao despromover utilizador." });
    }
  },
);

app.delete(
  "/api/admin/users/:id",
  autenticarToken,
  verificarAdmin,
  async (req, res) => {
    const userId = req.params.id;

    try {
      const userRes = await pool.query(
        "SELECT username FROM utilizadores WHERE id = $1",
        [userId],
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({ erro: "Utilizador não encontrado." });
      }

      const alvo = userRes.rows[0].username;

      if (alvo === SUPER_ADMIN) {
        return res
          .status(403)
          .json({ erro: "A conta do Super Admin não pode ser eliminada!" });
      }

      if (alvo === req.user.username) {
        return res
          .status(400)
          .json({ erro: "Não podes eliminar a tua própria conta!" });
      }

      await pool.query("DELETE FROM likes WHERE username = $1", [alvo]);
      await pool.query(
        "DELETE FROM seguidores WHERE follower_username = $1 OR following_username = $1",
        [alvo],
      );
      await pool.query("DELETE FROM utilizadores WHERE id = $1", [userId]);

      await registarLog(req.user.username, "ELIMINOU CONTA", alvo);
      res.json({ mensagem: `Conta '${alvo}' eliminada com sucesso!` });
    } catch (err) {
      res.status(500).json({ erro: "Erro ao eliminar utilizador." });
    }
  },
);

// Comunidade
app.get("/api/users", autenticarToken, async (req, res) => {
  const me = req.user.username;

  try {
    const result = await pool.query(
      `SELECT u.username, u.pfp,
              EXISTS(
                SELECT 1 FROM seguidores s 
                WHERE s.follower_username = $1 AND s.following_username = u.username
              ) as ja_segue,
              (SELECT COUNT(*) FROM seguidores WHERE following_username = u.username) as seguidores,
              (SELECT COUNT(*) FROM seguidores WHERE follower_username = u.username) as seguindo
       FROM utilizadores u
       WHERE u.username != $1
       ORDER BY u.id DESC`,
      [me],
    );

    const utilizadoresFormatados = result.rows.map((u) => ({
      username: u.username,
      pfp: u.pfp || "imagens/pfp.png",
      ja_segue: Boolean(u.ja_segue),
      followers: parseInt(u.seguidores || 0, 10),
      following: parseInt(u.seguindo || 0, 10),
    }));

    res.json({ utilizadores: utilizadoresFormatados });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao obter utilizadores." });
  }
});

app.get("/api/users/:username/full-profile", async (req, res) => {
  const { username } = req.params;

  try {
    const userRes = await pool.query(
      "SELECT username, pfp, is_admin FROM utilizadores WHERE username = $1",
      [username],
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ erro: "Utilizador não encontrado." });
    }

    const followers = await pool.query(
      "SELECT COUNT(*)::int as total FROM seguidores WHERE following_username = $1",
      [username],
    );
    const following = await pool.query(
      "SELECT COUNT(*)::int as total FROM seguidores WHERE follower_username = $1",
      [username],
    );

    const likesRes = await pool.query(
      "SELECT item_id FROM likes WHERE username = $1",
      [username],
    );

    res.json({
      user: userRes.rows[0],
      stats: {
        followers: followers.rows[0].total,
        following: following.rows[0].total,
      },
      likes: likesRes.rows.map((r) => r.item_id),
    });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao obter perfil." });
  }
});

app.post("/api/follow", autenticarToken, async (req, res) => {
  const follower = req.user.username;
  const { targetUsername } = req.body;

  if (!targetUsername || follower === targetUsername) {
    return res.status(400).json({ erro: "Ação de seguir inválida." });
  }

  try {
    const checkFollow = await pool.query(
      "SELECT id FROM seguidores WHERE follower_username = $1 AND following_username = $2",
      [follower, targetUsername],
    );

    if (checkFollow.rows.length > 0) {
      await pool.query(
        "DELETE FROM seguidores WHERE follower_username = $1 AND following_username = $2",
        [follower, targetUsername],
      );
      await registarLog(follower, "DEIXOU DE SEGUIR", targetUsername);
      res.json({
        acao: "unfollowed",
        mensagem: `Deixaste de seguir ${targetUsername}`,
      });
    } else {
      await pool.query(
        "INSERT INTO seguidores (follower_username, following_username) VALUES ($1, $2)",
        [follower, targetUsername],
      );
      await registarLog(follower, "COMEÇOU A SEGUIR", targetUsername);
      res.json({
        acao: "followed",
        mensagem: `Agora segues ${targetUsername}!`,
      });
    }
  } catch (err) {
    res.status(500).json({ erro: "Erro ao processar relação." });
  }
});

app.get("/api/activity-feed", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT autor, acao, alvo, data FROM logs WHERE acao IN ('COMEÇOU A SEGUIR', 'LIKE') ORDER BY id DESC LIMIT 15",
    );
    res.json({ atividades: result.rows });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao obter feed." });
  }
});

// Ratings
app.get("/api/ratings", async (req, res) => {
  const { username } = req.query;

  try {
    const mediasRes = await pool.query(`
      SELECT item_id, 
             ROUND(AVG(estrelas), 1)::float as media, 
             COUNT(*)::int as total 
      FROM ratings 
      GROUP BY item_id
    `);

    const estatisticas = {};
    mediasRes.rows.forEach((row) => {
      estatisticas[row.item_id] = { media: row.media, total: row.total };
    });

    let minhasNotas = {};
    if (username) {
      const minhasRes = await pool.query(
        "SELECT item_id, estrelas FROM ratings WHERE username = $1",
        [username],
      );
      minhasRes.rows.forEach((row) => {
        minhasNotas[row.item_id] = row.estrelas;
      });
    }

    res.json({ estatisticas, minhasNotas });
  } catch (err) {
    console.error("Erro ao obter ratings:", err);
    res.status(500).json({ erro: "Erro ao obter avaliações." });
  }
});

app.post("/api/rate", autenticarToken, async (req, res) => {
  const { item_id, estrelas } = req.body;
  const username = req.user.username;

  if (!item_id || !estrelas || estrelas < 1 || estrelas > 5) {
    return res
      .status(400)
      .json({ erro: "Dados inválidos. A nota deve ser entre 1 e 5." });
  }

  try {
    await pool.query(
      `
      INSERT INTO ratings (username, item_id, estrelas)
      VALUES ($1, $2, $3)
      ON CONFLICT (username, item_id) 
      DO UPDATE SET estrelas = EXCLUDED.estrelas
    `,
      [username, item_id, estrelas],
    );

    await registarLog(username, "AVALIOU", `${item_id} com ${estrelas}★`);
    res.json({ mensagem: "Avaliação guardada com sucesso!" });
  } catch (err) {
    console.error("Erro ao guardar rating:", err);
    res.status(500).json({ erro: "Erro ao guardar avaliação." });
  }
});

// Candidaturas
app.post("/api/candidaturas/submit", autenticarToken, async (req, res) => {
  const {
    tipo,
    artist_name,
    artist_birthdate,
    artist_photo,
    artist_profile,
    album_title,
    album_artist,
    album_cover,
    album_date,
    album_link,
    genre,
    description,
  } = req.body;
  const submitted_by = req.user.username;

  if (!tipo || !["artista", "album"].includes(tipo)) {
    return res.status(400).json({ erro: "Tipo de candidatura inválido." });
  }

  try {
    if (tipo === "artista") {
      if (
        !artist_name ||
        !artist_birthdate ||
        !artist_photo ||
        !artist_profile
      ) {
        return res.status(400).json({
          erro: "Nome do artista, data de nascimento, foto e perfil são obrigatórios.",
        });
      }

      if (!validarImagemBase64(artist_photo)) {
        return res.status(400).json({
          erro: "Formato de imagem inválido.",
        });
      }

      const result = await pool.query(
        `INSERT INTO candidaturas (tipo, artist_name, artist_birthdate, artist_photo, profile_links, genre, description, status, submitted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, artist_name, status, submitted_date`,
        [
          "artista",
          artist_name,
          artist_birthdate || null,
          artist_photo,
          artist_profile || null,
          genre || null,
          description || null,
          "pendente",
          submitted_by,
        ],
      );

      await registarLog(submitted_by, "SUBMETE ARTISTA", artist_name);

      res.json({
        mensagem: "Candidatura enviada com sucesso!",
        candidatura: result.rows[0],
      });
    } else {
      if (
        !album_title ||
        !album_artist ||
        !album_cover ||
        !album_date ||
        !album_link
      ) {
        return res.status(400).json({
          erro: "Título do álbum, artista, capa, data e link são obrigatórios.",
        });
      }

      if (!validarImagemBase64(album_cover)) {
        return res.status(400).json({
          erro: "Formato de imagem inválido.",
        });
      }

      const result = await pool.query(
        `INSERT INTO candidaturas (tipo, artist_name, album_title, album_cover, album_date, album_link, genre, description, status, submitted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, album_title, status, submitted_date`,
        [
          "album",
          album_artist,
          album_title,
          album_cover,
          album_date,
          album_link,
          genre || null,
          description || null,
          "pendente",
          submitted_by,
        ],
      );

      await registarLog(
        submitted_by,
        "SUBMETE ÁLBUM",
        `${album_artist} - ${album_title}`,
      );

      res.json({
        mensagem: "Candidatura de álbum enviada com sucesso!",
        candidatura: result.rows[0],
      });
    }
  } catch (err) {
    console.error("Erro ao submeter candidatura:", err);
    res.status(500).json({ erro: "Erro ao processar candidatura." });
  }
});

app.get(
  "/api/candidaturas",
  autenticarToken,
  verificarAdmin,
  async (req, res) => {
    const status = req.query.status || "pendente";

    try {
      let query =
        "SELECT id, tipo, artist_name, artist_birthdate, artist_photo, album_title, album_cover, album_date, genre, description, profile_links, album_link, status, submitted_by, submitted_date, reviewed_by, reviewed_date, rejection_reason FROM candidaturas";
      let params = [];

      if (status && status !== "todas") {
        query += " WHERE status = $1";
        params = [status];
      }

      query += " ORDER BY submitted_date DESC";

      const result = await pool.query(query, params);

      res.json({
        total: result.rows.length,
        candidaturas: result.rows,
      });
    } catch (err) {
      console.error("Erro ao listar candidaturas:", err);
      res.status(500).json({ erro: "Erro ao obter candidaturas." });
    }
  },
);

app.put(
  "/api/candidaturas/:id/approve",
  autenticarToken,
  verificarAdmin,
  async (req, res) => {
    const { id } = req.params;
    const reviewed_by = req.user.username;

    try {
      const candidatura = await pool.query(
        "SELECT * FROM candidaturas WHERE id = $1",
        [id],
      );

      if (candidatura.rows.length === 0) {
        return res.status(404).json({ erro: "Candidatura não encontrada." });
      }

      const cand = candidatura.rows[0];

      await pool.query(
        "UPDATE candidaturas SET status = $1, reviewed_by = $2, reviewed_date = CURRENT_TIMESTAMP WHERE id = $3",
        ["aprovado", reviewed_by, id],
      );

      await registarHistoricoCandidatura(id, "APROVADO", reviewed_by, null);
      await registarLog(
        reviewed_by,
        "APROVOU CANDIDATURA",
        `${cand.artist_name}${cand.album_title ? ` - ${cand.album_title}` : ""}`,
      );

      res.json({
        mensagem: "Candidatura aprovada com sucesso!",
      });
    } catch (err) {
      console.error("Erro ao aprovar candidatura:", err);
      res.status(500).json({ erro: "Erro ao aprovar candidatura." });
    }
  },
);

app.put(
  "/api/candidaturas/:id/reject",
  autenticarToken,
  verificarAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const reviewed_by = req.user.username;

    try {
      const candidatura = await pool.query(
        "SELECT * FROM candidaturas WHERE id = $1",
        [id],
      );

      if (candidatura.rows.length === 0) {
        return res.status(404).json({ erro: "Candidatura não encontrada." });
      }

      const cand = candidatura.rows[0];

      await pool.query(
        "UPDATE candidaturas SET status = $1, reviewed_by = $2, reviewed_date = CURRENT_TIMESTAMP, rejection_reason = $3 WHERE id = $4",
        ["rejeitado", reviewed_by, rejection_reason || null, id],
      );

      await registarHistoricoCandidatura(
        id,
        "REJEITADO",
        reviewed_by,
        rejection_reason || null,
      );

      await registarLog(
        reviewed_by,
        "REJEITOU CANDIDATURA",
        `${cand.artist_name}${cand.album_title ? ` - ${cand.album_title}` : ""}`,
      );

      res.json({
        mensagem: "Candidatura rejeitada com sucesso.",
      });
    } catch (err) {
      console.error("Erro ao rejeitar candidatura:", err);
      res.status(500).json({ erro: "Erro ao rejeitar candidatura." });
    }
  },
);

app.get(
  "/api/candidaturas/:id/historico",
  autenticarToken,
  verificarAdmin,
  async (req, res) => {
    const { id } = req.params;

    try {
      const candidatura = await pool.query(
        "SELECT id, tipo, artist_name, album_title, status, submitted_by, submitted_date FROM candidaturas WHERE id = $1",
        [id],
      );

      if (candidatura.rows.length === 0) {
        return res.status(404).json({ erro: "Candidatura não encontrada." });
      }

      const historico = await pool.query(
        "SELECT acao, realizado_por, motivo, data_acao FROM historico_candidaturas WHERE candidatura_id = $1 ORDER BY data_acao DESC",
        [id],
      );

      res.json({
        candidatura: candidatura.rows[0],
        historico: historico.rows,
      });
    } catch (err) {
      console.error("Erro ao obter histórico:", err);
      res.status(500).json({ erro: "Erro ao obter histórico." });
    }
  },
);

// Rota pública para obter conteúdo aprovado (Inclui a descrição)
app.get("/api/candidaturas/aprovadas", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tipo, artist_name, artist_birthdate, artist_photo, 
              album_title, album_cover, album_date, genre, profile_links, album_link,
              description, submitted_by, submitted_date, reviewed_by, reviewed_date 
       FROM candidaturas 
       WHERE status = 'aprovado' 
       ORDER BY reviewed_date DESC`,
    );
    res.json({ aprovados: result.rows });
  } catch (err) {
    console.error("Erro ao obter candidaturas aprovadas:", err);
    res.status(500).json({ erro: "Erro ao carregar conteúdo aprovado." });
  }
});

// ==========================================
// ROTAS DE MANUTENÇÃO E UTILITÁRIAS
// ==========================================
app.get("/api/reset-admin", async (req, res) => {
  try {
    await pool.query("DELETE FROM utilizadores WHERE username = 'YvlLima'");
    res.send(
      "Conta YvlLima eliminada com sucesso. Podes registar novamente no site!",
    );
  } catch (err) {
    res.status(500).send("Erro ao apagar utilizador: " + err.message);
  }
});

app.get("/api/make-admin", async (req, res) => {
  try {
    await pool.query(
      "UPDATE utilizadores SET is_admin = 1 WHERE username = 'YvlLima'",
    );
    res.send("YvlLima agora é Admin!");
  } catch (err) {
    res.status(500).send("Erro: " + err.message);
  }
});

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Servidor a rodar na porta ${PORT}`));
}

module.exports = { app, pool };
