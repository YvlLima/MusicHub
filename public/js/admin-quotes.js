// ==========================================
// MODERAÇÃO DE QUOTES SUGERIDAS
// (Página separada do painel de candidaturas de artistas/álbuns)
// ==========================================

let temporizadorToast;

function mostrarToast(mensagem) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  document.getElementById("toast-mensagem").innerText = mensagem;
  toast.classList.add("mostrar");

  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => {
    toast.classList.remove("mostrar");
  }, 2500);
}

function confirmarAcao(
  mensagem,
  titulo = "CONFIRMAÇÃO",
  textoBotao = "CONFIRMAR",
  classeBotao = "btn-perigo",
) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal-confirmacao");
    if (!modal) return resolve(false);

    const caixa = modal.querySelector(".caixa-modal-confirm");
    const elTexto = document.getElementById("modal-confirm-texto");
    const elTitulo = document.getElementById("modal-confirm-titulo");
    const btnConfirmar = document.getElementById("btn-modal-confirmar");
    const btnCancelar = document.getElementById("btn-modal-cancelar");

    let resolvido = false;

    caixa.classList.remove("a-fechar");
    elTitulo.innerText = titulo;
    elTexto.innerText = mensagem;
    btnConfirmar.innerText = textoBotao;
    btnConfirmar.className = `btn-hud-modal ${classeBotao}`;
    modal.style.display = "flex";

    function fechar(resultado) {
      if (resolvido) return;
      resolvido = true;

      caixa.classList.add("a-fechar");

      btnConfirmar.removeEventListener("click", aoConfirmar);
      btnCancelar.removeEventListener("click", aoCancelar);
      document.removeEventListener("keydown", aoPressionarTecla);

      setTimeout(() => {
        modal.style.display = "none";
        caixa.classList.remove("a-fechar");
        resolve(resultado);
      }, 200);
    }

    function aoConfirmar() {
      fechar(true);
    }
    function aoCancelar() {
      fechar(false);
    }
    function aoPressionarTecla(e) {
      if (e.key === "Escape") fechar(false);
    }

    btnConfirmar.addEventListener("click", aoConfirmar);
    btnCancelar.addEventListener("click", aoCancelar);
    document.addEventListener("keydown", aoPressionarTecla);
  });
}

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

function obterTokenEUtilizador() {
  const token = localStorage.getItem("token_jwt");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("utilizador_ativo"));
  } catch (e) {
    user = null;
  }
  return { token, user };
}

async function carregarQuotesPendentes() {
  const { token } = obterTokenEUtilizador();
  if (!token) return;

  try {
    const resposta = await fetch(`${API_URL}/quotes?status=pendente`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let dados;
    try {
      dados = await resposta.json();
    } catch (e) {
      mostrarToast("RESPOSTA INVÁLIDA DO SERVIDOR!");
      return;
    }

    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO CARREGAR QUOTES PENDENTES!");
      return;
    }

    renderizarQuotesPendentes(dados.quotes || []);
  } catch (err) {
    console.error("Erro ao carregar quotes pendentes:", err);
    mostrarToast(`ERRO DE LIGAÇÃO: ${err.message || err}`);
  }
}

function renderizarQuotesPendentes(lista) {
  const corpo = document.getElementById("lista-quotes-pendentes-body");
  const statTotal = document.getElementById("stat-total-pendentes");

  if (statTotal) statTotal.innerText = lista.length;
  if (!corpo) return;

  if (lista.length === 0) {
    corpo.innerHTML = `<tr><td colspan="5" style="text-align:center; opacity:0.6;">Sem quotes pendentes de momento.</td></tr>`;
    return;
  }

  corpo.innerHTML = lista
    .map((q) => {
      const dataSubmissao = q.submitted_date
        ? new Date(q.submitted_date).toLocaleDateString("pt-PT")
        : "—";

      return `
        <tr>
          <td>${escapeHTML(q.texto)}<br><span style="opacity:0.6; font-size:0.8em;">${escapeHTML(q.autor || "")}</span></td>
          <td>${escapeHTML(q.artista)}</td>
          <td>${escapeHTML(q.submitted_by || "Anónimo")}</td>
          <td>${dataSubmissao}</td>
          <td>
            <button type="button" class="btn-hud" onclick="aprovarQuote(${q.id})">✓ APROVAR</button>
            <button type="button" class="btn-hud btn-perigo" onclick="rejeitarQuote(${q.id})">✕ REJEITAR</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function aprovarQuote(id) {
  const confirmado = await confirmarAcao(
    "Tens a certeza que queres aprovar esta quote? Ela vai aparecer no gerador de quotes do Hub.",
    "APROVAR QUOTE",
    "APROVAR",
    "btn-perigo",
  );
  if (!confirmado) return;

  const { token } = obterTokenEUtilizador();

  try {
    const resposta = await fetch(`${API_URL}/quotes/${id}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO APROVAR QUOTE!");
      return;
    }

    mostrarToast("✓ QUOTE APROVADA!");
    carregarQuotesPendentes();
  } catch (err) {
    console.error("Erro ao aprovar quote:", err);
    mostrarToast(`ERRO DE LIGAÇÃO: ${err.message || err}`);
  }
}

async function rejeitarQuote(id) {
  const confirmado = await confirmarAcao(
    "Tens a certeza que queres rejeitar esta quote? Esta ação não pode ser desfeita.",
    "REJEITAR QUOTE",
    "REJEITAR",
    "btn-perigo",
  );
  if (!confirmado) return;

  const { token } = obterTokenEUtilizador();

  try {
    const resposta = await fetch(`${API_URL}/quotes/${id}/reject`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO REJEITAR QUOTE!");
      return;
    }

    mostrarToast("QUOTE REJEITADA.");
    carregarQuotesPendentes();
  } catch (err) {
    console.error("Erro ao rejeitar quote:", err);
    mostrarToast(`ERRO DE LIGAÇÃO: ${err.message || err}`);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  carregarQuotesPendentes();
});
