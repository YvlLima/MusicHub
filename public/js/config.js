// ==========================================
// CONFIGURAÇÕES GLOBAIS DA APLICAÇÃO
// ==========================================
const CONFIG = {
  API_URL: "https://musichub-backend-bf0h.onrender.com/api",
  SUPER_ADMIN: "YvlLima",
  DEFAULT_PFP: "imagens/pfp.png",
};

// Garantir compatibilidade global nos ficheiros legados
var API_URL = CONFIG.API_URL;

// Expor no objeto global window
window.CONFIG = CONFIG;
