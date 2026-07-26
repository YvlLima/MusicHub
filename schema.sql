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

CREATE TABLE IF NOT EXISTS candidaturas (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('artista', 'album')),
    artist_name VARCHAR(255) NOT NULL,
    artist_birthdate DATE,
    artist_photo TEXT,
    album_title VARCHAR(255),
    album_cover TEXT,
    album_date DATE,
    year INT,
    genre VARCHAR(100),
    description TEXT,
    profile_links TEXT,
    album_link TEXT,
    status VARCHAR(50) DEFAULT 'pendente',
    submitted_by VARCHAR(255) NOT NULL,
    submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by VARCHAR(255),
    reviewed_date TIMESTAMP,
    rejection_reason TEXT
);