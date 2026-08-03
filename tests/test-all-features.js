require("dotenv").config();
const http = require("http");
const app = require("../server");
const { pool } = require("../src/config/db");

let server;
let baseUrl;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({ status: res.statusCode, body: json });
        });
      },
    );

    req.on("error", (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runFullTestSuite() {
  console.log("==========================================");
  console.log("🧪 INICIANDO SUÍTE DE TESTES DE INTEGRAÇÃO");
  console.log("==========================================\n");

  let passes = 0;
  let fails = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASSE: ${testName}`);
      passes++;
    } else {
      console.error(`  ❌ FALHA: ${testName}`);
      fails++;
    }
  }

  // Iniciar Servidor de Teste
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`📡 Servidor de Testes a rodar em ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ------------------------------------------
    // 1. TESTES DE ROTAS PÚBLICAS
    // ------------------------------------------
    console.log("--- 1. ROTAS PÚBLICAS DA API ---");
    let res = await request("GET", "/api/candidaturas/aprovadas");
    assert(res.status === 200 && Array.isArray(res.body.aprovados), "GET /api/candidaturas/aprovadas");

    res = await request("GET", "/api/quotes/aprovadas");
    assert(res.status === 200 && Array.isArray(res.body), "GET /api/quotes/aprovadas");

    res = await request("GET", "/api/ratings");
    assert(res.status === 200 && typeof res.body === "object", "GET /api/ratings");

    res = await request("GET", "/api/likes");
    assert(res.status === 200 && typeof res.body.contagem === "object", "GET /api/likes");

    res = await request("GET", "/api/users");
    assert(res.status === 200 && Array.isArray(res.body), "GET /api/users");

    res = await request("GET", "/api/activity-feed");
    assert(res.status === 200 && Array.isArray(res.body), "GET /api/activity-feed");

    // ------------------------------------------
    // 2. TESTES DE AUTENTICAÇÃO (REGISTO & LOGIN)
    // ------------------------------------------
    console.log("\n--- 2. AUTENTICAÇÃO E REGISTO ---");
    const testUsername = `testuser_${Date.now()}`;
    const testEmail = `test_${Date.now()}@musichub.test`;
    const testPassword = "Password123!";

    res = await request("POST", "/api/register", {
      username: testUsername,
      email: testEmail,
      password: testPassword,
    });
    assert(res.status === 200 && res.body.token, `POST /api/register (${testUsername})`);
    const userToken = res.body.token;

    res = await request("POST", "/api/login", {
      loginInput: testUsername,
      password: testPassword,
    });
    assert(res.status === 200 && res.body.token, `POST /api/login (${testUsername})`);

    // ------------------------------------------
    // 3. TESTES DE AÇÕES DE UTILIZADOR AUTENTICADO
    // ------------------------------------------
    console.log("\n--- 3. AÇÕES DE UTILIZADOR AUTENTICADO ---");
    res = await request("POST", "/api/rate", { itemId: "cand_1", estrelas: 5 }, userToken);
    assert(res.status === 200 && res.body.media === 5, "POST /api/rate (5 estrelas em cand_1)");

    res = await request("POST", "/api/like", { itemId: "cand_1" }, userToken);
    assert(res.status === 200 && res.body.curtiu === true, "POST /api/like (adicionar como favorito)");

    res = await request("POST", "/api/like", { itemId: "cand_1" }, userToken);
    assert(res.status === 200 && res.body.curtiu === false, "POST /api/like (remover favorito)");

    res = await request("POST", "/api/follow", { targetUsername: "YvlLima36" }, userToken);
    assert(res.status === 200 && typeof res.body.seguindo === "boolean", "POST /api/follow (seguir YvlLima36)");

    res = await request("GET", "/api/my-following", null, userToken);
    assert(res.status === 200 && Array.isArray(res.body), "GET /api/my-following");

    // ------------------------------------------
    // 4. TESTES DE SUBMISSÃO DE CONTEÚDO
    // ------------------------------------------
    console.log("\n--- 4. SUBMISSÃO DE CANDIDATURAS E QUOTES ---");
    res = await request(
      "POST",
      "/api/candidaturas/submit",
      {
        tipo: "artista",
        artist_name: "Artista Teste Automatizado",
        artist_birthdate: "2000-01-01",
        artist_photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        profile_links: "https://open.spotify.com/artist/test",
      },
      userToken,
    );
    assert(res.status === 200 && res.body.candidaturaId, "POST /api/candidaturas/submit (Artista)");
    const subId = res.body.candidaturaId;

    res = await request(
      "POST",
      "/api/quotes/submit",
      {
        texto: "Esta é uma quote de teste automatizado.",
        artista: "Artista Teste Automatizado",
      },
      userToken,
    );
    assert(res.status === 200 && res.body.quoteId, "POST /api/quotes/submit");
    const quoteSubId = res.body.quoteId;

    // ------------------------------------------
    // 5. TESTES DE ADMINISTRAÇÃO E MODERAÇÃO
    // ------------------------------------------
    console.log("\n--- 5. MODERAÇÃO E PAINEL ADMIN ---");
    // Obter conta de admin da BD para gerar token de admin
    const adminQuery = await pool.query("SELECT id, username, email FROM utilizadores WHERE is_admin = 1 LIMIT 1");
    if (adminQuery.rows.length > 0) {
      const jwt = require("jsonwebtoken");
      const { JWT_SECRET } = require("../src/middleware/auth");
      const adminUser = adminQuery.rows[0];
      const adminToken = jwt.sign(
        { id: adminUser.id, username: adminUser.username, email: adminUser.email, is_admin: 1 },
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      res = await request("GET", "/api/candidaturas?status=pendente", null, adminToken);
      assert(res.status === 200 && Array.isArray(res.body), "GET /api/candidaturas?status=pendente (Admin)");

      res = await request("GET", "/api/quotes?status=pendente", null, adminToken);
      assert(res.status === 200 && Array.isArray(res.body), "GET /api/quotes?status=pendente (Admin)");

      if (subId) {
        res = await request("PUT", `/api/candidaturas/${subId}/approve`, {}, adminToken);
        assert(res.status === 200, `PUT /api/candidaturas/${subId}/approve`);

        res = await request("GET", `/api/candidaturas/${subId}/historico`, null, adminToken);
        assert(res.status === 200 && Array.isArray(res.body), `GET /api/candidaturas/${subId}/historico`);
      }

      if (quoteSubId) {
        res = await request("PUT", `/api/quotes/${quoteSubId}/approve`, {}, adminToken);
        assert(res.status === 200, `PUT /api/quotes/${quoteSubId}/approve`);
      }

      res = await request("GET", "/api/admin/stats", null, adminToken);
      assert(res.status === 200 && typeof res.body.totalUtilizadores === "number", "GET /api/admin/stats");

      res = await request("GET", "/api/admin/users", null, adminToken);
      assert(res.status === 200 && Array.isArray(res.body), "GET /api/admin/users");

      res = await request("GET", "/api/admin/logs", null, adminToken);
      assert(res.status === 200 && Array.isArray(res.body), "GET /api/admin/logs");

      res = await request("GET", "/api/admin/export?format=json", null, adminToken);
      assert(res.status === 200 && Array.isArray(res.body), "GET /api/admin/export (JSON)");
    }

    // ------------------------------------------
    // CLEANUP DO UTILIZADOR DE TESTE
    // ------------------------------------------
    res = await request("DELETE", "/api/delete-profile", null, userToken);
    assert(res.status === 200, "DELETE /api/delete-profile (Limpeza do utilizador de teste)");

    console.log("\n==========================================");
    console.log(`📊 RESULTADO FINAL DOS TESTES:`);
    console.log(`  ✅ Passaram: ${passes}`);
    console.log(`  ❌ Falharam: ${fails}`);
    console.log("==========================================");
  } catch (err) {
    console.error("❌ Erro fatal durante a suíte de testes:", err);
  } finally {
    if (server) server.close();
    await pool.end();
    process.exit(fails > 0 ? 1 : 0);
  }
}

runFullTestSuite();
