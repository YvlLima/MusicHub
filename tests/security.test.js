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

  describe("3. Proteção contra SQL Injection", () => {
    it("deve tratar tentativas de SQL Injection no login com segurança sem quebrar a consulta", async () => {
      const payloadSqlInjection = {
        usernameOrEmail: "' OR '1'='1",
        password: "' OR '1'='1",
      };

      const response = await request(app)
        .post("/api/login")
        .send(payloadSqlInjection);

      // Deve responder com rejeição de credenciais sem revelar erros internos de sintaxe SQL
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
        password: "123", // Palavra-passe fraca
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
          pfp: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==", // Script HTML injetado
        });

      expect(response.status).toBe(400);
      expect(response.body.erro).toContain("Formato de imagem inválido");
    });
  });
});
