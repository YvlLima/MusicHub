const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const {
  JWT_SECRET,
  validarImagemBase64,
  validarRequisitosPassword,
  autenticarToken,
  registarLog,
} = require("../middleware/auth");

const router = express.Router();

// ATUALIZAR PERFIL DE UTILIZADOR (TRANSAÇÃO SQL ATÓMICA)
router.put("/update-profile", autenticarToken, async (req, res) => {
  const { newUsername, newEmail, newPassword, pfp } = req.body;
  const currentUsername = req.user.username;
  const userId = req.user.id;

  if (pfp && !validarImagemBase64(pfp)) {
    return res.status(400).json({
      erro: "Formato de imagem inválido ou demasiado grande. Utilize PNG, JPEG ou WEBP até ~5MB.",
    });
  }

  if (newPassword && !validarRequisitosPassword(newPassword)) {
    return res.status(400).json({
      erro: "A nova password deve ter pelo menos 8 caracteres, incluindo 1 letra maiúscula, 1 minúscula, 1 número e 1 caráter especial!",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (newUsername && newUsername !== currentUsername) {
      const checkUser = await client.query(
        "SELECT id FROM utilizadores WHERE username = $1 AND id != $2",
        [newUsername, userId],
      );
      if (checkUser.rows.length > 0) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ erro: "Este username já está em uso por outro utilizador." });
      }
    }

    if (newEmail && newEmail !== req.user.email) {
      const checkEmail = await client.query(
        "SELECT id FROM utilizadores WHERE email = $1 AND id != $2",
        [newEmail, userId],
      );
      if (checkEmail.rows.length > 0) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ erro: "Este e-mail já está em uso por outro utilizador." });
      }
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    let updatedUsername = currentUsername;
    let updatedEmail = req.user.email;

    if (newUsername) {
      updates.push(`username = $${paramIndex++}`);
      values.push(newUsername);
      updatedUsername = newUsername;
    }

    if (newEmail) {
      updates.push(`email = $${paramIndex++}`);
      values.push(newEmail);
      updatedEmail = newEmail;
    }

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }

    if (pfp) {
      updates.push(`pfp = $${paramIndex++}`);
      values.push(pfp);
    }

    if (updates.length > 0) {
      values.push(userId);
      const query = `UPDATE utilizadores SET ${updates.join(", ")} WHERE id = $${paramIndex}`;
      await client.query(query, values);
    }

    if (newUsername && newUsername !== currentUsername) {
      await client.query("UPDATE likes SET username = $1 WHERE username = $2", [
        newUsername,
        currentUsername,
      ]);
      await client.query(
        "UPDATE ratings SET username = $1 WHERE username = $2",
        [newUsername, currentUsername],
      );
      await client.query(
        "UPDATE candidaturas SET submitted_by = $1 WHERE submitted_by = $2",
        [newUsername, currentUsername],
      );
      await client.query(
        "UPDATE candidaturas SET reviewed_by = $1 WHERE reviewed_by = $2",
        [newUsername, currentUsername],
      );
      await client.query(
        "UPDATE quotes SET submitted_by = $1 WHERE submitted_by = $2",
        [newUsername, currentUsername],
      );
      await client.query(
        "UPDATE quotes SET reviewed_by = $1 WHERE reviewed_by = $2",
        [newUsername, currentUsername],
      );
      await client.query("UPDATE logs SET autor = $1 WHERE autor = $2", [
        newUsername,
        currentUsername,
      ]);
      await client.query(
        "UPDATE seguidores SET follower_username = $1 WHERE follower_username = $2",
        [newUsername, currentUsername],
      );
      await client.query(
        "UPDATE seguidores SET following_username = $1 WHERE following_username = $2",
        [newUsername, currentUsername],
      );
    }

    await client.query("COMMIT");

    const updatedUserRes = await pool.query(
      "SELECT id, username, email, pfp, is_admin FROM utilizadores WHERE id = $1",
      [userId],
    );
    const updatedUser = updatedUserRes.rows[0];

    await registarLog(updatedUser.username, "ATUALIZOU PERFIL", "SISTEMA");

    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        is_admin: updatedUser.is_admin,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      mensagem: "Perfil atualizado com sucesso!",
      token: newToken,
      user: updatedUser,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro ao atualizar perfil:", err.message);
    res.status(500).json({ erro: "Erro ao atualizar perfil." });
  } finally {
    client.release();
  }
});

// APAGAR CONTA DO UTILIZADOR AUTENTICADO
router.delete("/delete-profile", autenticarToken, async (req, res) => {
  const currentUsername = req.user.username;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM likes WHERE username = $1", [currentUsername]);
    await client.query("DELETE FROM ratings WHERE username = $1", [currentUsername]);
    await client.query(
      "DELETE FROM seguidores WHERE follower_username = $1 OR following_username = $1",
      [currentUsername],
    );
    await client.query("DELETE FROM utilizadores WHERE id = $1", [userId]);
    await client.query("COMMIT");

    await registarLog(currentUsername, "ELIMINOU CONTA", "SISTEMA");

    res.json({ mensagem: "Conta eliminada com sucesso!" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro ao apagar perfil:", err.message);
    res.status(500).json({ erro: "Erro ao apagar conta." });
  } finally {
    client.release();
  }
});

// OBTER LISTA DE MEMBROS DA COMUNIDADE
router.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, pfp, is_admin FROM utilizadores ORDER BY username ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro ao obter utilizadores:", err.message);
    res.status(500).json({ erro: "Erro ao obter utilizadores." });
  }
});

// OBTER DADOS SOCIAIS DE UM UTILIZADOR
router.get("/users/:username/social", async (req, res) => {
  const { username } = req.params;
  try {
    const seguidoresRes = await pool.query(
      "SELECT COUNT(*)::int AS total FROM seguidores WHERE following_username = $1",
      [username],
    );
    const aSeguirRes = await pool.query(
      "SELECT COUNT(*)::int AS total FROM seguidores WHERE follower_username = $1",
      [username],
    );
    const likesRes = await pool.query(
      "SELECT COUNT(*)::int AS total FROM likes WHERE username = $1",
      [username],
    );

    res.json({
      seguidores: seguidoresRes.rows[0].total,
      aSeguir: aSeguirRes.rows[0].total,
      totalLikes: likesRes.rows[0].total,
    });
  } catch (err) {
    console.error("❌ Erro ao obter dados sociais:", err.message);
    res.status(500).json({ erro: "Erro ao obter estatísticas sociais." });
  }
});

// OBTER PERFIL COMPLETO DE UM UTILIZADOR
router.get("/users/:username/full-profile", async (req, res) => {
  const { username } = req.params;
  try {
    const userRes = await pool.query(
      "SELECT id, username, email, pfp, is_admin FROM utilizadores WHERE username = $1",
      [username],
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ erro: "Utilizador não encontrado." });
    }

    const user = userRes.rows[0];

    const seguidoresRes = await pool.query(
      "SELECT COUNT(*)::int AS total FROM seguidores WHERE following_username = $1",
      [username],
    );
    const aSeguirRes = await pool.query(
      "SELECT COUNT(*)::int AS total FROM seguidores WHERE follower_username = $1",
      [username],
    );
    const likesRes = await pool.query(
      "SELECT item_id FROM likes WHERE username = $1",
      [username],
    );

    res.json({
      user,
      seguidores: seguidoresRes.rows[0].total,
      aSeguir: aSeguirRes.rows[0].total,
      stats: {
        followers: seguidoresRes.rows[0].total,
        following: aSeguirRes.rows[0].total,
      },
      likes: likesRes.rows.map((r) => r.item_id),
    });
  } catch (err) {
    console.error("❌ Erro ao obter perfil completo:", err.message);
    res.status(500).json({ erro: "Erro ao obter perfil." });
  }
});

// SEGUIR / DEIXAR DE SEGUIR UTILIZADOR
router.post("/follow", autenticarToken, async (req, res) => {
  const { targetUsername } = req.body;
  const followerUsername = req.user.username;

  if (!targetUsername) {
    return res
      .status(400)
      .json({ erro: "Username do utilizador a seguir não fornecido." });
  }

  if (followerUsername === targetUsername) {
    return res
      .status(400)
      .json({ erro: "Não podes seguir a tua própria conta!" });
  }

  try {
    const checkFollow = await pool.query(
      "SELECT * FROM seguidores WHERE follower_username = $1 AND following_username = $2",
      [followerUsername, targetUsername],
    );

    if (checkFollow.rows.length > 0) {
      await pool.query(
        "DELETE FROM seguidores WHERE follower_username = $1 AND following_username = $2",
        [followerUsername, targetUsername],
      );
      await registarLog(
        followerUsername,
        "DEIXOU DE SEGUIR",
        targetUsername,
      );
      return res.json({
        mensagem: `Deixaste de seguir ${targetUsername}.`,
        seguindo: false,
      });
    } else {
      await pool.query(
        "INSERT INTO seguidores (follower_username, following_username) VALUES ($1, $2)",
        [followerUsername, targetUsername],
      );
      await registarLog(
        followerUsername,
        "COMEÇOU A SEGUIR",
        targetUsername,
      );
      return res.json({
        mensagem: `Passaste a seguir ${targetUsername}!`,
        seguindo: true,
      });
    }
  } catch (err) {
    console.error("❌ Erro ao alternar follow:", err.message);
    res.status(500).json({ erro: "Erro ao atualizar relação de seguir." });
  }
});

// LISTA DE UTILIZADORES QUE O UTILIZADOR ATUAL SEGUE
router.get("/my-following", autenticarToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT following_username FROM seguidores WHERE follower_username = $1",
      [req.user.username],
    );
    res.json(result.rows.map((r) => r.following_username));
  } catch (err) {
    console.error("❌ Erro ao obter lista de quem segue:", err.message);
    res.status(500).json({ erro: "Erro ao obter utilizadores seguidos." });
  }
});

// FEED DE ATIVIDADE RECENTE
router.get("/activity-feed", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT autor, acao, alvo, data FROM logs ORDER BY data DESC LIMIT 15",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro ao obter feed de atividade:", err.message);
    res.status(500).json({ erro: "Erro ao obter feed de atividade." });
  }
});

module.exports = router;
