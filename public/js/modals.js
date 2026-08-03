// ==========================================
// CONTROLADOR GLOBAL DE MODAIS E UX (modals.js)
// ==========================================

function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("ativo");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden"; // Evita scroll do fundo
  }
}

function fecharModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("ativo");
    modal.style.display = "none";
    
    // Se não houver mais nenhum modal aberto, restaura o scroll
    const modaisAbertos = document.querySelectorAll(".modal-overlay.ativo, .modal-overlay[style*='display: flex']");
    if (modaisAbertos.length <= 1) {
      document.body.style.overflow = "";
    }
  }
}

function fecharTodosModais() {
  const modais = document.querySelectorAll(".modal-overlay");
  modais.forEach((modal) => {
    modal.classList.remove("ativo");
    modal.style.display = "none";
  });
  document.body.style.overflow = "";
}

// Ouvintes de Eventos Globais para UX
document.addEventListener("DOMContentLoaded", () => {
  // 1. Fechar modais ao premir a tecla ESC (Escape)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.keyCode === 27) {
      fecharTodosModais();
    }
  });

  // 2. Fechar modais ao clicar no fundo escuro (backdrop overlay)
  document.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("modal-overlay")) {
      fecharModal(e.target.id);
    }
  });
});

window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.fecharTodosModais = fecharTodosModais;
