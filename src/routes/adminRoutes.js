const express = require("express");
const { pool } = require("../config/db");
const {
  SUPER_ADMIN,
  autenticarToken,
  verificarAdmin,
  registarLog,
} = require("../middleware/auth");

const router = express.Router();

// PAINEL ADMIN: LISTAR TODOS OS UTILIZADORES
router.get("/admin/users", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, is_admin, tentativas_falhadas, ultimo_login, ip_acesso FROM utilizadores ORDER BY id ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro ao carregar utilizadores admin:", err.message);
    res.status(500).json({ erro: "Erro ao obter dados da administração." });
  }
});

// PAINEL ADMIN: ESTATÍSTICAS GLOBAIS
router.get("/admin/stats", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const totalUsers = await pool.query("SELECT COUNT(*)::int AS count FROM utilizadores");
    const totalMods = await pool.query("SELECT COUNT(*)::int AS count FROM utilizadores WHERE is_admin > 0");
    const totalLikes = await pool.query("SELECT COUNT(*)::int AS count FROM likes");

    res.json({
      totalUsers: totalUsers.rows[0].count,
      totalUtilizadores: totalUsers.rows[0].count,
      totalMods: totalMods.rows[0].count,
      totalModeradores: totalMods.rows[0].count,
      totalLikes: totalLikes.rows[0].count,
    });
  } catch (err) {
    console.error("❌ Erro ao obter estatísticas:", err.message);
    res.status(500).json({ erro: "Erro ao obter estatísticas." });
  }
});

// PAINEL ADMIN: LOGS DE ATIVIDADE
router.get("/admin/logs", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM logs ORDER BY data DESC LIMIT 100",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro ao obter logs:", err.message);
    res.status(500).json({ erro: "Erro ao obter logs." });
  }
});

// PAINEL ADMIN: ELIMINAR UM LOG INDIVIDUAL
router.delete("/admin/logs/:id", autenticarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM logs WHERE id = $1", [id]);
    res.json({ mensagem: "Log eliminado com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao eliminar log:", err.message);
    res.status(500).json({ erro: "Erro ao eliminar log." });
  }
});

// PAINEL ADMIN: LIMPAR TODOS OS LOGS DE ATIVIDADE
router.delete("/admin/logs-clear", autenticarToken, verificarAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM logs");
    await registarLog(req.user.username, "LIMPOU LOGS", "SISTEMA");
    res.json({ mensagem: "Todos os logs foram eliminados com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao limpar logs:", err.message);
    res.status(500).json({ erro: "Erro ao limpar logs." });
  }
});

// PAINEL ADMIN: EXPORTAR DADOS
router.get("/admin/export", autenticarToken, verificarAdmin, async (req, res) => {
  const { format } = req.query;

  try {
    const result = await pool.query(
      "SELECT id, username, email, is_admin, ultimo_login, ip_acesso FROM utilizadores ORDER BY id ASC",
    );
    const users = result.rows;

    if (format === "csv") {
      let csv = "id,username,email,is_admin,ultimo_login,ip_acesso\n";
      users.forEach((u) => {
        csv += `${u.id},"${u.username}","${u.email}",${u.is_admin},"${u.ultimo_login || ""}","${u.ip_acesso || ""}"\n`;
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="utilizadores.csv"');
      return res.send(csv);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", 'attachment; filename="utilizadores.json"');
      return res.json(users);
    }
  } catch (err) {
    console.error("❌ Erro ao exportar dados:", err.message);
    res.status(500).json({ erro: "Erro ao exportar dados." });
  }
});

// PAINEL ADMIN: PROMOVER UTILIZADOR A MODERADOR
router.put("/admin/promote-mod", autenticarToken, verificarAdmin, async (req, res) => {
  const { targetUserId } = req.body;

  try {
    const checkUser = await pool.query(
      "SELECT * FROM utilizadores WHERE id = $1",
      [targetUserId],
    );

    if (checkUser.rows.length === 0) {
      return res.status(404).json({ erro: "Utilizador não encontrado." });
    }

    const user = checkUser.rows[0];

    if (user.is_admin === 1) {
      return res.status(400).json({
        erro: "Não é possível alterar o cargo do Administrador Principal!",
      });
    }

    await pool.query("UPDATE utilizadores SET is_admin = 2 WHERE id = $1", [
      targetUserId,
    ]);

    await registarLog(
      req.user.username,
      "PROMOVEU A MODERADOR",
      user.username,
    );

    res.json({
      mensagem: `Utilizador ${user.username} foi promovido a Moderador!`,
    });
  } catch (err) {
    console.error("❌ Erro ao promover utilizador:", err.message);
    res.status(500).json({ erro: "Erro ao promover utilizador." });
  }
});

// PAINEL ADMIN: DESPROMOVER MODERADOR A UTILIZADOR NORMAL
router.put("/admin/demote", autenticarToken, verificarAdmin, async (req, res) => {
  const { targetUserId } = req.body;

  try {
    const checkUser = await pool.query(
      "SELECT * FROM utilizadores WHERE id = $1",
      [targetUserId],
    );

    if (checkUser.rows.length === 0) {
      return res.status(404).json({ erro: "Utilizador não encontrado." });
    }

    const user = checkUser.rows[0];

    if (user.is_admin === 1 || user.username === SUPER_ADMIN) {
      return res.status(400).json({
        erro: "Não é possível despromover o Administrador Principal!",
      });
    }

    await pool.query("UPDATE utilizadores SET is_admin = 0 WHERE id = $1", [
      targetUserId,
    ]);

    await registarLog(
      req.user.username,
      "DESPROMOVEU A UTILIZADOR",
      user.username,
    );

    res.json({
      mensagem: `Utilizador ${user.username} foi despromovido a Utilizador normal.`,
    });
  } catch (err) {
    console.error("❌ Erro ao despromover utilizador:", err.message);
    res.status(500).json({ erro: "Erro ao despromover utilizador." });
  }
});

// PAINEL ADMIN: APAGAR UTILIZADOR
router.delete("/admin/users/:id", autenticarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkUser = await client.query(
      "SELECT * FROM utilizadores WHERE id = $1",
      [id],
    );

    if (checkUser.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ erro: "Utilizador não encontrado." });
    }

    const user = checkUser.rows[0];

    if (user.is_admin === 1 || user.username === SUPER_ADMIN) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        erro: "Não é possível apagar a conta do Administrador Principal!",
      });
    }

    await client.query("DELETE FROM likes WHERE username = $1", [user.username]);
    await client.query("DELETE FROM ratings WHERE username = $1", [user.username]);
    await client.query(
      "DELETE FROM seguidores WHERE follower_username = $1 OR following_username = $1",
      [user.username],
    );
    await client.query("DELETE FROM utilizadores WHERE id = $1", [id]);

    await client.query("COMMIT");

    await registarLog(req.user.username, "APAGOU UTILIZADOR", user.username);

    res.json({ mensagem: `Utilizador ${user.username} foi eliminado com sucesso.` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro ao apagar utilizador admin:", err.message);
    res.status(500).json({ erro: "Erro ao apagar utilizador." });
  } finally {
    client.release();
  }
});

module.exports = router;
