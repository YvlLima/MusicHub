const express = require("express");
const { pool } = require("../config/db");
const {
  autenticarToken,
  verificarModOuAdmin,
  registarLog,
} = require("../middleware/auth");

const router = express.Router();

// SUBMETER NOVA QUOTE
router.post("/quotes/submit", autenticarToken, async (req, res) => {
  const { texto, artista, autor } = req.body;
  const submitted_by = req.user.username;

  if (!texto || !artista) {
    return res
      .status(400)
      .json({ erro: "Preencha o texto da quote e o nome do artista!" });
  }

  const autorFinal = autor || artista;

  try {
    const result = await pool.query(
      "INSERT INTO quotes (texto, autor, artista, submitted_by, status) VALUES ($1, $2, $3, $4, 'pendente') RETURNING id",
      [texto, autorFinal, artista, submitted_by],
    );

    await registarLog(
      submitted_by,
      "SUGERIU QUOTE",
      `"${texto.substring(0, 30)}..." (${artista})`,
    );

    res.json({
      mensagem: "✓ Quote sugerida com sucesso! Aguarda aprovação da moderação.",
      quoteId: result.rows[0].id,
    });
  } catch (err) {
    console.error("❌ Erro ao submeter quote:", err.message);
    res.status(500).json({ erro: "Erro ao submeter quote." });
  }
});

// LISTAR QUOTES PENDENTES DE APROVAÇÃO
router.get("/quotes", autenticarToken, verificarModOuAdmin, async (req, res) => {
  const { status } = req.query;

  try {
    let query = "SELECT * FROM quotes";
    const params = [];

    if (status) {
      query += " WHERE status = $1";
      params.push(status);
    } else {
      query += " WHERE status = 'pendente'";
    }

    query += " ORDER BY submitted_date DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro ao listar quotes:", err.message);
    res.status(500).json({ erro: "Erro ao listar quotes." });
  }
});

// APROVAR QUOTE
router.put("/quotes/:id/approve", autenticarToken, verificarModOuAdmin, async (req, res) => {
  const { id } = req.params;
  const reviewed_by = req.user.username;

  try {
    const checkRes = await pool.query("SELECT * FROM quotes WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ erro: "Quote não encontrada." });
    }

    const quoteObj = checkRes.rows[0];

    await pool.query(
      "UPDATE quotes SET status = 'aprovado', reviewed_by = $1, reviewed_date = NOW() WHERE id = $2",
      [reviewed_by, id],
    );

    await registarLog(
      reviewed_by,
      "APROVOU QUOTE",
      `"${quoteObj.texto.substring(0, 30)}..." (${quoteObj.artista})`,
    );

    res.json({ mensagem: "✓ Quote aprovada com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao aprovar quote:", err.message);
    res.status(500).json({ erro: "Erro ao aprovar quote." });
  }
});

// REJEITAR QUOTE
router.put("/quotes/:id/reject", autenticarToken, verificarModOuAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const reviewed_by = req.user.username;

  try {
    const checkRes = await pool.query("SELECT * FROM quotes WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ erro: "Quote não encontrada." });
    }

    const quoteObj = checkRes.rows[0];

    await pool.query(
      "UPDATE quotes SET status = 'rejeitado', reviewed_by = $1, reviewed_date = NOW(), rejection_reason = $2 WHERE id = $3",
      [reviewed_by, reason || "Rejeitada pela moderação", id],
    );

    await registarLog(
      reviewed_by,
      "REJEITOU QUOTE",
      `"${quoteObj.texto.substring(0, 30)}..." (${quoteObj.artista})`,
    );

    res.json({ mensagem: "✕ Quote rejeitada." });
  } catch (err) {
    console.error("❌ Erro ao rejeitar quote:", err.message);
    res.status(500).json({ erro: "Erro ao rejeitar quote." });
  }
});

// CONSULTAR QUOTES APROVADAS (PÚBLICO)
router.get("/quotes/aprovadas", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM quotes WHERE status = 'aprovado' ORDER BY id ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro ao consultar quotes aprovadas:", err.message);
    res.status(500).json({ erro: "Erro ao obter quotes." });
  }
});

module.exports = router;
