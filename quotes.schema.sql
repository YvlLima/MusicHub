-- Tabela de sugestões de quotes (segue o mesmo estilo de candidaturas em schema.sql)

CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    texto TEXT NOT NULL,
    autor VARCHAR(255) NOT NULL,        -- Ex: "— PLAYBOI CARTI - OVER"
    artista VARCHAR(255) NOT NULL,      -- Ex: "Playboi Carti"
    status VARCHAR(50) DEFAULT 'pendente',
    submitted_by VARCHAR(255) NOT NULL,
    submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by VARCHAR(255),
    reviewed_date TIMESTAMP,
    rejection_reason TEXT
);