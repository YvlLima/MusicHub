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

// Utilitários Partilhados Globais
function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>'"]/g,
    (tag) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        tag
      ] || tag,
  );
}

function validarRequisitosPassword(pass) {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-#])[A-Za-z\d@$!%*?&._\-#]{8,}$/;
  return regex.test(pass);
}

// Expor no objeto global window
window.CONFIG = CONFIG;
window.escapeHTML = escapeHTML;
window.validarRequisitosPassword = validarRequisitosPassword;

