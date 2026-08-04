const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");
const { pool } = require("../src/config/db");
const { JWT_SECRET } = require("../src/middleware/auth");

describe("🛡️ Suíte de Testes de Segurança da API - Music Hub", () => {
  afterAll(async () => {
    await pool.end();
  });

  describe("1. Integridade de Tokens JWT e Controlo de Acesso", () => {
    it("deve rejeitar pedidos com token assinado com chave secreta falsa (HTTP 403)", async () => {
      const tokenFalso = jwt.sign(
        { id: 1, username: "hacker", is_admin: 1 },
        "chave_secreta_falsa_e_incorreta_123"
      );

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${tokenFalso}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("erro", "Token inválido ou expirado.");
    });

    it("deve rejeitar pedidos com cabeçalho de autorização malformado (HTTP 401)", async () => {
      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", "FormatoInvalidoTokenSemBearer");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("erro", "Acesso negado. Token não fornecido.");
    });

    it("deve rejeitar pedidos com token JWT adulterado no payload (HTTP 403)", async () => {
      const tokenValido = jwt.sign({ id: 1, username: "user" }, JWT_SECRET);
      const partes = tokenValido.split(".");
      // Alterar payload sem recalcular assinatura
      const tokenAdulterado = `${partes[0]}.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImlzX2FkbWluIjoxfQ.${partes[2]}`;

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${tokenAdulterado}`);

      expect(response.status).toBe(403);
    });
  });

  describe("2. Prevenção de Escalamento de Privilégios (RBAC)", () => {
    it("deve negar acesso de utilizador normal (is_admin = 0) a rotas de Admin (HTTP 403)", async () => {
      const tokenUserNormal = jwt.sign(
        { id: 999, username: "user_normal", is_admin: 0 },
        JWT_SECRET
      );

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${tokenUserNormal}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("erro", "Acesso restrito a Administradores!");
    });

    it("deve negar acesso de Moderador (is_admin = 2) a ações exclusivas de Admin Principal (HTTP 403)", async () => {
      const tokenModerador = jwt.sign(
        { id: 888, username: "mod_user", is_admin: 2 },
        JWT_SECRET
      );

      const response = await request(app)
        .get("/api/admin/stats")
        .set("Authorization", `Bearer ${tokenModerador}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("erro", "Acesso restrito a Administradores!");
    });

    it("deve proibir utilizador normal de aprovar candidaturas (HTTP 403)", async () => {
      const tokenUserNormal = jwt.sign(
        { id: 999, username: "user_normal", is_admin: 0 },
        JWT_SECRET
      );

      const response = await request(app)
        .put("/api/candidaturas/1/approve")
        .set("Authorization", `Bearer ${tokenUserNormal}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("erro", "Acesso restrito a Moderadores e Administradores!");
    });
  });

  describe("3. Proteção contra SQL Injection & Sanitização", () => {
    it("deve tratar tentativas de SQL Injection no login com segurança sem quebrar a consulta", async () => {
      const payloadSqlInjection = {
        usernameOrEmail: "' OR '1'='1",
        password: "' OR '1'='1",
      };

      const response = await request(app)
        .post("/api/login")
        .send(payloadSqlInjection);

      expect([400, 401]).toContain(response.status);
      expect(response.body).not.toHaveProperty("stack");
      expect(response.body).toHaveProperty("erro");
    });

    it("deve higienizar rotas com parâmetros de pesquisa contra injeção SQL", async () => {
      const response = await request(app).get(
        "/api/users/admin' UNION SELECT 1,2,3--/social"
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ aSeguir: 0, seguidores: 0, totalLikes: 0 });
    });
  });

  describe("4. Validação de Palavra-passe Forte & Segurança de Inputs", () => {
    it("deve rejeitar tentativa de registo com palavra-passe fraca", async () => {
      const response = await request(app).post("/api/register").send({
        username: "novo_user_seguranca",
        email: "teste_seguranca@musichub.com",
        password: "123",
      });

      expect(response.status).toBe(400);
      expect(response.body.erro).toContain("password");
    });

    it("deve rejeitar uploads de imagens Base64 com formatos inválidos ou scripts maliciosos", async () => {
      const tokenUser = jwt.sign({ id: 10, username: "testuser", is_admin: 0 }, JWT_SECRET);

      const response = await request(app)
        .put("/api/update-profile")
        .set("Authorization", `Bearer ${tokenUser}`)
        .send({
          pfp: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        });

      expect(response.status).toBe(400);
      expect(response.body.erro).toContain("Formato de imagem inválido");
    });
  });

  describe("5. Proteção DoS, Limitação de Taxa & Resiliência a Payloads Malformados", () => {
    it("deve aplicar cabeçalhos de Rate Limiting nos endpoints /api", async () => {
      const response = await request(app).get("/api/health");
      expect(response.headers).toHaveProperty("ratelimit-limit");
      expect(response.headers).toHaveProperty("ratelimit-remaining");
    });

    it("deve tratar requisições com JSON malformado sem quebrar o servidor (HTTP 400/500 gracioso)", async () => {
      const response = await request(app)
        .post("/api/login")
        .set("Content-Type", "application/json")
        .send("{ json_malformado: invalido, ");

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty("erro");
    });

    it("deve tratar identificadores não numéricos em parâmetros de URL sem expor exceções SQL", async () => {
      const tokenMod = jwt.sign({ id: 5, username: "mod", is_admin: 1 }, JWT_SECRET);
      const response = await request(app)
        .get("/api/candidaturas/parametro_invalido_texto/historico")
        .set("Authorization", `Bearer ${tokenMod}`);

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty("erro");
      expect(response.body).not.toHaveProperty("stack");
    });
  });

  describe("6. Proteção Path Traversal & XSS Refletido", () => {
    it("deve bloquear tentativas de Path Traversal prevenindo a exposição de ficheiros do sistema", async () => {
      const response = await request(app).get("/../../package.json");
      expect(response.status).toBe(200); // Servidor redireciona para a página principal (index.html) por ser rota estática
      expect(response.text).not.toContain("musichub-backend");
    });

    it("deve responder de forma segura a XSS refletido em parâmetros de utilizador", async () => {
      const response = await request(app).get(
        "/api/users/%3Cscript%3Ealert(1)%3C%2Fscript%3E/social"
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ aSeguir: 0, seguidores: 0, totalLikes: 0 });
    });
  });
});
