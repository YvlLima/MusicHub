const express = require("express");
const { pool } = require("../config/db");
const { autenticarToken, registarLog } = require("../middleware/auth");

const router = express.Router();

// CONSULTAR AVALIAÇÕES (PÚBLICO)
router.get("/ratings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT item_id, AVG(estrelas)::numeric(3,1) AS media, COUNT(*)::int AS total FROM ratings GROUP BY item_id",
    );
    const ratingsMap = {};
    result.rows.forEach((r) => {
      ratingsMap[r.item_id] = {
        media: parseFloat(r.media),
        total: r.total,
      };
    });
    res.json(ratingsMap);
  } catch (err) {
    console.error("❌ Erro ao consultar ratings:", err.message);
    res.status(500).json({ erro: "Erro ao consultar avaliações." });
  }
});

// AVALIAR UM ITEM (1 A 5 ESTRELAS)
router.post("/rate", autenticarToken, async (req, res) => {
  const { itemId, estrelas } = req.body;
  const username = req.user.username;

  if (!itemId || !estrelas || estrelas < 1 || estrelas > 5) {
    return res
      .status(400)
      .json({ erro: "Item e classificação válida (1-5 estrelas) são obrigatórios!" });
  }

  try {
    await pool.query(
      "INSERT INTO ratings (username, item_id, estrelas) VALUES ($1, $2, $3) ON CONFLICT (username, item_id) DO UPDATE SET estrelas = $3",
      [username, itemId, estrelas],
    );

    await registarLog(
      username,
      "AVALIOU ITEM",
      `${itemId} (${estrelas} estrelas)`,
    );

    const statsRes = await pool.query(
      "SELECT AVG(estrelas)::numeric(3,1) AS media, COUNT(*)::int AS total FROM ratings WHERE item_id = $1",
      [itemId],
    );

    res.json({
      mensagem: "✓ Avaliação registada com sucesso!",
      media: parseFloat(statsRes.rows[0].media),
      total: statsRes.rows[0].total,
    });
  } catch (err) {
    console.error("❌ Erro ao avaliar item:", err.message);
    res.status(500).json({ erro: "Erro ao registar avaliação." });
  }
});

module.exports = router;
