require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Lista dos utilizadores a criar
// Cargos (is_admin): 1 = Admin, 2 = Mod, 0 = User
const utilizadoresNovos = [
  {
    username: "YvlLima",
    email: "goncalomartinslima2007@gmail.com",
    passPadrao: "Admin123!",
    is_admin: 1, // Admin
  },
  {
    username: "teste",
    email: "yvllima36@gmail.com",
    passPadrao: "Mod12345!",
    is_admin: 2, // Mod
  },
  {
    username: "Noxzy",
    email: "rodrigopenela518@gmail.com",
    passPadrao: "User1234!",
    is_admin: 0, // User
  },
];

async function popularBaseDados() {
  console.log("⚡ A popular a base de dados com os utilizadores...");

  // Garante a tabela de utilizadores para registo inicial
  await pool.query(`
    CREATE TABLE IF NOT EXISTS utilizadores (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      pfp TEXT DEFAULT 'imagens/pfp.png',
      is_admin INT DEFAULT 0,
      tentativas_falhadas INT DEFAULT 0,
      ultimo_login TIMESTAMP,
      ip_acesso VARCHAR(45)
    );
  `);


  // Insere/atualiza os utilizadores
  for (const u of utilizadoresNovos) {
    try {
      const hash = await bcrypt.hash(u.passPadrao, 10);

      await pool.query(
        `INSERT INTO utilizadores (username, email, password_hash, pfp, is_admin)
         VALUES ($1, $2, $3, 'imagens/pfp.png', $4)
         ON CONFLICT (username) DO UPDATE SET
           email = excluded.email,
           password_hash = excluded.password_hash,
           is_admin = excluded.is_admin`,
        [u.username, u.email, hash, u.is_admin],
      );

      console.log(
        `✅ Utilizador '${u.username}' (${u.email}) criado/atualizado!`,
      );
    } catch (err) {
      console.error(`❌ Erro ao criar '${u.username}':`, err.message);
    }
  }

  await pool.end();
  console.log("🚀 Concluído! Já podes iniciar o teu server.js");
}

popularBaseDados();
