const express = require("express");
const { pool } = require("../config/db");
const {
  validarImagemBase64,
  autenticarToken,
  verificarModOuAdmin,
  registarLog,
  registarHistoricoCandidatura,
} = require("../middleware/auth");

const router = express.Router();

// SUBMETER NOVA CANDIDATURA (ARTISTA OU ÁLBUM)
router.post("/candidaturas/submit", autenticarToken, async (req, res) => {
  const {
    tipo,
    artist_name,
    artist_birthdate,
    artist_photo,
    album_title,
    album_cover,
    album_date,
    year,
    genre,
    description,
    profile_links,
    album_link,
  } = req.body;

  const submitted_by = req.user.username;

  if (!tipo || !["artista", "album"].includes(tipo)) {
    return res
      .status(400)
      .json({ erro: "Tipo de submissão inválido. Escolha 'artista' ou 'album'." });
  }

  if (tipo === "artista") {
    if (!artist_name || !artist_birthdate || !artist_photo || !profile_links) {
      return res.status(400).json({
        erro: "Para registar um Artista, preencha o Nome, Data de Nascimento, Foto e Perfil Spotify!",
      });
    }
    if (!validarImagemBase64(artist_photo)) {
      return res.status(400).json({
        erro: "Foto de artista inválida ou superior a ~5MB.",
      });
    }
  }

  if (tipo === "album") {
    if (!album_title || !artist_name || !album_cover || !album_date || !album_link) {
      return res.status(400).json({
        erro: "Para registar um Álbum, preencha o Título, Artista, Capa, Data e Link Spotify!",
      });
    }
    if (!validarImagemBase64(album_cover)) {
      return res.status(400).json({
        erro: "Capa de álbum inválida ou superior a ~5MB.",
      });
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
      INSERT INTO candidaturas (
        tipo, artist_name, artist_birthdate, artist_photo,
        album_title, album_cover, album_date, year, genre,
        description, profile_links, album_link, submitted_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pendente')
      RETURNING id;
    `;

    const values = [
      tipo,
      artist_name,
      artist_birthdate || null,
      artist_photo || null,
      album_title || null,
      album_cover || null,
      album_date || null,
      year || (album_date ? new Date(album_date).getFullYear() : null),
      genre || null,
      description || null,
      profile_links || null,
      album_link || null,
      submitted_by,
    ];

    const result = await client.query(query, values);
    const newId = result.rows[0].id;

    await registarHistoricoCandidatura(
      client,
      newId,
      "SUBMETIDA",
      submitted_by,
      `Nova candidatura de ${tipo} submetida.`,
    );

    await client.query("COMMIT");

    await registarLog(
      submitted_by,
      "SUBMETEU CANDIDATURA",
      tipo === "album" ? `${artist_name} - ${album_title}` : artist_name,
    );

    res.json({
      mensagem: "✓ Candidatura submetida com sucesso! Aguarda revisão de um Moderador/Admin.",
      candidaturaId: newId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro ao submeter candidatura:", err.message);
    res.status(500).json({ erro: "Erro ao submeter candidatura." });
  } finally {
    client.release();
  }
});

// LISTAR CANDIDATURAS (COM FILTRO DE STATUS)
router.get("/candidaturas", autenticarToken, verificarModOuAdmin, async (req, res) => {
  const { status } = req.query;

  try {
    let query = "SELECT * FROM candidaturas";
    const params = [];

    if (status && status !== "todas") {
      query += " WHERE status = $1";
      params.push(status);
    }

    query += " ORDER BY submitted_date DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro ao listar candidaturas:", err.message);
    res.status(500).json({ erro: "Erro ao listar candidaturas." });
  }
});

// APROVAR CANDIDATURA
router.put("/candidaturas/:id/approve", autenticarToken, verificarModOuAdmin, async (req, res) => {
  const { id } = req.params;
  const reviewed_by = req.user.username;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkRes = await client.query("SELECT * FROM candidaturas WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ erro: "Candidatura não encontrada." });
    }

    const cand = checkRes.rows[0];

    await client.query(
      "UPDATE candidaturas SET status = 'aprovado', reviewed_by = $1, reviewed_date = NOW() WHERE id = $2",
      [reviewed_by, id],
    );

    await registarHistoricoCandidatura(
      client,
      id,
      "APROVADA",
      reviewed_by,
      "Candidatura aprovada.",
    );

    await client.query("COMMIT");

    const itemAlvo = cand.tipo === "album" ? `${cand.artist_name} - ${cand.album_title}` : cand.artist_name;
    await registarLog(reviewed_by, "APROVOU CANDIDATURA", itemAlvo);

    res.json({ mensagem: "✓ Candidatura aprovada com sucesso!" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro ao aprovar candidatura:", err.message);
    res.status(500).json({ erro: "Erro ao aprovar candidatura." });
  } finally {
    client.release();
  }
});

// REJEITAR CANDIDATURA COM MOTIVO
router.put("/candidaturas/:id/reject", autenticarToken, verificarModOuAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const reviewed_by = req.user.username;

  if (!reason || reason.trim() === "") {
    return res.status(400).json({ erro: "Indique o motivo da rejeição!" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkRes = await client.query("SELECT * FROM candidaturas WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ erro: "Candidatura não encontrada." });
    }

    const cand = checkRes.rows[0];

    await client.query(
      "UPDATE candidaturas SET status = 'rejeitado', reviewed_by = $1, reviewed_date = NOW(), rejection_reason = $2 WHERE id = $3",
      [reviewed_by, reason, id],
    );

    await registarHistoricoCandidatura(
      client,
      id,
      "REJEITADA",
      reviewed_by,
      reason,
    );

    await client.query("COMMIT");

    const itemAlvo = cand.tipo === "album" ? `${cand.artist_name} - ${cand.album_title}` : cand.artist_name;
    await registarLog(reviewed_by, "REJEITOU CANDIDATURA", itemAlvo);

    res.json({ mensagem: "✗ Candidatura rejeitada." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro ao rejeitar candidatura:", err.message);
    res.status(500).json({ erro: "Erro ao rejeitar candidatura." });
  } finally {
    client.release();
  }
});

// CONSULTAR HISTÓRICO DE UMA CANDIDATURA
router.get("/candidaturas/:id/historico", autenticarToken, verificarModOuAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM historico_candidaturas WHERE candidatura_id = $1 ORDER BY data_acao ASC",
      [id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Erro ao consultar histórico:", err.message);
    res.status(500).json({ erro: "Erro ao consultar histórico." });
  }
});

// CONSULTAR TODAS AS CANDIDATURAS APROVADAS (PÚBLICO)
router.get("/candidaturas/aprovadas", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM candidaturas WHERE status = 'aprovado' ORDER BY id ASC",
    );
    res.json({ aprovados: result.rows });
  } catch (err) {
    console.error("❌ Erro ao consultar candidaturas aprovadas:", err.message);
    res.status(500).json({ erro: "Erro ao obter conteúdo aprovado." });
  }
});

module.exports = router;
