-- Schema PostgreSQL do Music Hub (espelha o initDB() em server.js)

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

CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    UNIQUE(username, item_id)
);

CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    autor VARCHAR(255) NOT NULL,
    acao VARCHAR(255) NOT NULL,
    alvo VARCHAR(255) NOT NULL,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seguidores (
    id SERIAL PRIMARY KEY,
    follower_username VARCHAR(255) NOT NULL,
    following_username VARCHAR(255) NOT NULL,
    data_seguido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_username, following_username)
);