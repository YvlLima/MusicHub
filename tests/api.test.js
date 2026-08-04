const request = require("supertest");
const app = require("../server");
const { pool } = require("../src/config/db");

describe("🧪 Suíte Completa de Testes da API - Music Hub", () => {
  afterAll(async () => {
    await pool.end();
  });

  describe("1. Monitorização & Saúde do Sistema", () => {
    it("GET /api/health - deve retornar estado online e status 200", async () => {
      const response = await request(app).get("/api/health");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "online");
      expect(response.body).toHaveProperty("ok", true);
      expect(response.body).toHaveProperty("timestamp");
    });

    it("GET /api/rota-invalida - deve retornar 404 para endpoints inexistentes", async () => {
      const response = await request(app).get("/api/rota-invalida-teste");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("erro", "Endpoint da API não encontrado.");
    });
  });

  describe("2. Módulo de Autenticação (/api/auth)", () => {
    it("POST /api/register - deve rejeitar registo sem dados (HTTP 400)", async () => {
      const response = await request(app).post("/api/register").send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("erro");
    });

    it("POST /api/login - deve rejeitar login com campos vazios (HTTP 400)", async () => {
      const response = await request(app).post("/api/login").send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("erro");
    });

    it("POST /api/login - deve rejeitar credenciais incorretas (HTTP 400/401)", async () => {
      const response = await request(app).post("/api/login").send({
        usernameOrEmail: "utilizador_falso_testes_123",
        password: "palavra_passe_errada",
      });
      expect([400, 401]).toContain(response.status);
      expect(response.body).toHaveProperty("erro");
    });

    it("POST /api/forgot-password - deve rejeitar pedido sem email/username (HTTP 400)", async () => {
      const response = await request(app).post("/api/forgot-password").send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("erro");
    });

    it("POST /api/verify-reset-code - deve rejeitar código de recuperação inválido (HTTP 400)", async () => {
      const response = await request(app).post("/api/verify-reset-code").send({
        usernameOrEmail: "invalido",
        code: "000000",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("erro");
    });
  });

  describe("3. Módulo de Utilizadores & Comunidade (/api/users)", () => {
    it("GET /api/users - deve responder e retornar lista de membros da comunidade", async () => {
      const response = await request(app).get("/api/users");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("GET /api/users/:username/social - deve responder com contadores sociais (aSeguir, seguidores)", async () => {
      const response = await request(app).get("/api/users/utilizador_inexistente_9999/social");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("aSeguir");
      expect(response.body).toHaveProperty("seguidores");
    });

    it("GET /api/users/:username/full-profile - deve retornar 404 para utilizador inexistente", async () => {
      const response = await request(app).get("/api/users/utilizador_inexistente_9999/full-profile");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("erro", "Utilizador não encontrado.");
    });

    it("PUT /api/update-profile - deve negar atualização sem token JWT", async () => {
      const response = await request(app).put("/api/update-profile").send({ newUsername: "novo_nome" });
      expect([401, 403]).toContain(response.status);
    });

    it("DELETE /api/delete-profile - deve negar eliminação de conta sem token JWT", async () => {
      const response = await request(app).delete("/api/delete-profile").send({ password: "123" });
      expect([401, 403]).toContain(response.status);
    });

    it("POST /api/follow - deve negar acção de seguir sem token JWT", async () => {
      const response = await request(app).post("/api/follow").send({ targetUsername: "admin" });
      expect([401, 403]).toContain(response.status);
    });

    it("GET /api/my-following - deve negar consulta sem token JWT", async () => {
      const response = await request(app).get("/api/my-following");
      expect([401, 403]).toContain(response.status);
    });

    it("GET /api/activity-feed - deve retornar lista de atividade pública", async () => {
      const response = await request(app).get("/api/activity-feed");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("4. Módulo de Candidaturas (/api/candidaturas)", () => {
    it("GET /api/candidaturas/aprovadas - deve retornar mapa de candidaturas aprovadas", async () => {
      const response = await request(app).get("/api/candidaturas/aprovadas");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("aprovados");
      expect(Array.isArray(response.body.aprovados)).toBe(true);
    });

    it("POST /api/candidaturas/submit - deve negar submissão sem token JWT", async () => {
      const response = await request(app).post("/api/candidaturas/submit").send({ tipo: "artista", artist_name: "Teste" });
      expect([401, 403]).toContain(response.status);
    });

    it("GET /api/candidaturas - deve negar acesso a candidaturas pendentes sem privilégios de mod/admin", async () => {
      const response = await request(app).get("/api/candidaturas");
      expect([401, 403]).toContain(response.status);
    });

    it("PUT /api/candidaturas/1/approve - deve negar aprovação de candidatura sem token JWT", async () => {
      const response = await request(app).put("/api/candidaturas/1/approve");
      expect([401, 403]).toContain(response.status);
    });

    it("PUT /api/candidaturas/1/reject - deve negar rejeição de candidatura sem token JWT", async () => {
      const response = await request(app).put("/api/candidaturas/1/reject").send({ reason: "Motivo" });
      expect([401, 403]).toContain(response.status);
    });
  });

  describe("5. Módulo de Citações / Quotes (/api/quotes)", () => {
    it("GET /api/quotes/aprovadas - deve retornar lista de citações aprovadas", async () => {
      const response = await request(app).get("/api/quotes/aprovadas");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("POST /api/quotes/submit - deve negar submissão sem token JWT", async () => {
      const response = await request(app).post("/api/quotes/submit").send({ texto: "Citação", artista: "Artista" });
      expect([401, 403]).toContain(response.status);
    });

    it("GET /api/quotes - deve negar acesso a citações pendentes sem autorização mod/admin", async () => {
      const response = await request(app).get("/api/quotes");
      expect([401, 403]).toContain(response.status);
    });

    it("PUT /api/quotes/1/approve - deve negar aprovação de quote sem token JWT", async () => {
      const response = await request(app).put("/api/quotes/1/approve");
      expect([401, 403]).toContain(response.status);
    });

    it("PUT /api/quotes/1/reject - deve negar rejeição de quote sem token JWT", async () => {
      const response = await request(app).put("/api/quotes/1/reject").send({ reason: "Motivo" });
      expect([401, 403]).toContain(response.status);
    });
  });

  describe("6. Módulo de Avaliações & Likes (/api/ratings e /api/likes)", () => {
    it("GET /api/ratings - deve retornar objeto com contagem e médias de ratings", async () => {
      const response = await request(app).get("/api/ratings");
      expect(response.status).toBe(200);
      expect(typeof response.body).toBe("object");
    });

    it("POST /api/rate - deve negar classificação sem token JWT", async () => {
      const response = await request(app).post("/api/rate").send({ item_id: "album_1", estrelas: 5 });
      expect([401, 403]).toContain(response.status);
    });

    it("GET /api/likes - deve retornar contagem pública de likes e estado de likes do utilizador", async () => {
      const response = await request(app).get("/api/likes");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("contagem");
      expect(response.body).toHaveProperty("deuLike");
    });

    it("POST /api/like - deve negar Like sem token JWT", async () => {
      const response = await request(app).post("/api/like").send({ item_id: "album_1" });
      expect([401, 403]).toContain(response.status);
    });
  });

  describe("7. Módulo de Administração (/api/admin)", () => {
    it("GET /api/admin/users - deve negar listagem de utilizadores sem token admin", async () => {
      const response = await request(app).get("/api/admin/users");
      expect([401, 403]).toContain(response.status);
    });

    it("GET /api/admin/stats - deve negar estatísticas admin sem token", async () => {
      const response = await request(app).get("/api/admin/stats");
      expect([401, 403]).toContain(response.status);
    });

    it("GET /api/admin/logs - deve negar consulta de logs sem token admin", async () => {
      const response = await request(app).get("/api/admin/logs");
      expect([401, 403]).toContain(response.status);
    });

    it("DELETE /api/admin/logs/1 - deve negar eliminação de log sem token admin", async () => {
      const response = await request(app).delete("/api/admin/logs/1");
      expect([401, 403]).toContain(response.status);
    });

    it("GET /api/admin/export - deve negar exportação de dados sem token admin", async () => {
      const response = await request(app).get("/api/admin/export");
      expect([401, 403]).toContain(response.status);
    });

    it("GET /api/admin/export?format=csv - deve negar exportação CSV sem token admin", async () => {
      const response = await request(app).get("/api/admin/export?format=csv");
      expect([401, 403]).toContain(response.status);
    });

    it("PUT /api/admin/promote-mod - deve negar promoção sem privilégios de admin", async () => {
      const response = await request(app).put("/api/admin/promote-mod").send({ targetUserId: 2 });
      expect([401, 403]).toContain(response.status);
    });

    it("PUT /api/admin/demote - deve negar despromoção sem privilégios de admin", async () => {
      const response = await request(app).put("/api/admin/demote").send({ targetUserId: 2 });
      expect([401, 403]).toContain(response.status);
    });

    it("DELETE /api/admin/users/1 - deve negar apagar conta de utilizador sem token admin", async () => {
      const response = await request(app).delete("/api/admin/users/1");
      expect([401, 403]).toContain(response.status);
    });

    it("DELETE /api/admin/logs-clear - deve negar limpeza de logs sem token admin", async () => {
      const response = await request(app).delete("/api/admin/logs-clear");
      expect([401, 403]).toContain(response.status);
    });
  });
});
