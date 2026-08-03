const express = require("express");
const { pool } = require("../config/db");
const { autenticarToken, registarLog } = require("../middleware/auth");

const router = express.Router();

// CONSULTAR LIKES DO UTILIZADOR E CONTAGEM GLOBAL
router.get("/likes", async (req, res) => {
  const { username } = req.query;

  try {
    const contagemRes = await pool.query(
      "SELECT item_id, COUNT(*)::int AS total FROM likes GROUP BY item_id",
    );
    const contagem = {};
    contagemRes.rows.forEach((r) => {
      contagem[r.item_id] = r.total;
    });

    let deuLike = [];
    if (username) {
      const userLikes = await pool.query(
        "SELECT item_id FROM likes WHERE username = $1",
        [username],
      );
      deuLike = userLikes.rows.map((r) => r.item_id);
    }

    res.json({ contagem, deuLike });
  } catch (err) {
    console.error("❌ Erro ao consultar likes:", err.message);
    res.status(500).json({ erro: "Erro ao consultar likes." });
  }
});

// DAR OU REMOVER LIKE NUM ITEM
router.post("/like", autenticarToken, async (req, res) => {
  const { itemId } = req.body;
  const username = req.user.username;

  if (!itemId) {
    return res.status(400).json({ erro: "ID do item não fornecido." });
  }

  try {
    const checkRes = await pool.query(
      "SELECT * FROM likes WHERE username = $1 AND item_id = $2",
      [username, itemId],
    );

    let curtiu = false;
    if (checkRes.rows.length > 0) {
      await pool.query(
        "DELETE FROM likes WHERE username = $1 AND item_id = $2",
        [username, itemId],
      );
      await registarLog(username, "REMOVEU LIKE", itemId);
    } else {
      await pool.query(
        "INSERT INTO likes (username, item_id) VALUES ($1, $2)",
        [username, itemId],
      );
      await registarLog(username, "DEU LIKE", itemId);
      curtiu = true;
    }

    const countRes = await pool.query(
      "SELECT COUNT(*)::int AS total FROM likes WHERE item_id = $1",
      [itemId],
    );

    res.json({
      curtiu,
      total: countRes.rows[0].total,
    });
  } catch (err) {
    console.error("❌ Erro ao alternar like:", err.message);
    res.status(500).json({ erro: "Erro ao atualizar like." });
  }
});

module.exports = router;
