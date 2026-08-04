const request = require("supertest");
const app = require("../server");
const { pool } = require("../src/config/db");

describe("🧪 Suíte de Testes da API - Music Hub", () => {
  afterAll(async () => {
    await pool.end();
  });
  describe("GET /api/health", () => {
    it("deve retornar estado online e status 200", async () => {
      const response = await request(app).get("/api/health");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "online");
      expect(response.body).toHaveProperty("ok", true);
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("GET /api/endpoint-inexistente", () => {
    it("deve retornar 404 para rotas de API inexistentes", async () => {
      const response = await request(app).get("/api/rota-invalida-teste");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("erro", "Endpoint da API não encontrado.");
    });
  });

  describe("POST /api/login", () => {
    it("deve rejeitar tentativa de login com campos vazios", async () => {
      const response = await request(app)
        .post("/api/login")
        .send({});
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty("erro");
    });
  });

  describe("Rotas Autenticadas sem Token", () => {
    it("deve negar acesso a /api/admin/users sem token JWT", async () => {
      const response = await request(app).get("/api/admin/users");
      expect([401, 403]).toContain(response.status);
    });

    it("deve negar acesso a /api/candidaturas sem autorização", async () => {
      const response = await request(app).get("/api/candidaturas");
      expect([401, 403]).toContain(response.status);
    });
  });
});
