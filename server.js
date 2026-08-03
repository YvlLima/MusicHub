require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { initDB } = require("./src/config/db");

// Importar Módulos de Rotas
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const candidaturasRoutes = require("./src/routes/candidaturasRoutes");
const quotesRoutes = require("./src/routes/quotesRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const ratingsRoutes = require("./src/routes/ratingsRoutes");
const likesRoutes = require("./src/routes/likesRoutes");

const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de Limitação de Taxa (Rate Limiting)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // Limite de 500 requisições por IP a cada 15m
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Demasiadas requisições. Tenta novamente mais tarde." },
});

app.use("/api", apiLimiter);

// Configuração de Segurança de Origens (CORS)
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://musichub-backend-bf0h.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permitir requisições de origens autorizadas
      }
    },
    credentials: true,
  }),
);

// Middlewares Globais de Suporte e Tamanho de Body (para imagens Base64)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Servir Ficheiros Estáticos do Frontend
app.use(express.static(path.join(__dirname, "public")));

// Inicializar tabelas da base de dados PostgreSQL
initDB();

// Rota Health Check para Monitorização de Estado no Frontend
app.get("/api/health", (req, res) => {
  res.json({ status: "online", ok: true, timestamp: new Date() });
});

// Registar Rotas da API
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", candidaturasRoutes);
app.use("/api", quotesRoutes);
app.use("/api", adminRoutes);
app.use("/api", ratingsRoutes);
app.use("/api", likesRoutes);

// Rota Fallback para Servir o Frontend
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ erro: "Endpoint da API não encontrado." });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Middleware Global de Tratamento de Erros
app.use((err, req, res, next) => {
  console.error("❌ Erro não tratado:", err.stack || err.message);
  res.status(500).json({ erro: "Ocorreu um erro interno no servidor." });
});

// Inicialização do Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Music Hub a rodar na porta ${PORT}`);
});

module.exports = app;

