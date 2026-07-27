// ==========================================
// MODERAÇÃO DE QUOTES SUGERIDAS
// ==========================================

// NOTA: 'temporizadorToast' e 'mostrarToast' já são fornecidos globalmente por index.js.
// Removemos a declaração duplicada de 'temporizadorToast' para evitar o SyntaxError.

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
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];
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
      mostrarToast(
        dados.erro ||
          t.quotesToastErroCarregar ||
          "ERRO AO CARREGAR QUOTES PENDENTES!",
      );
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
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  if (statTotal) statTotal.innerText = lista.length;
  if (!corpo) return;

  if (lista.length === 0) {
    corpo.innerHTML = `<tr><td colspan="5" style="text-align:center; opacity:0.6;">${t.quotesSemPendentes || "Sem quotes pendentes de momento."}</td></tr>`;
    return;
  }

  corpo.innerHTML = lista
    .map((q) => {
      const dataSubmissao = q.submitted_date
        ? new Date(q.submitted_date).toLocaleDateString(
            idiomaAtual === "en" ? "en-US" : "pt-PT",
          )
        : "—";

      return `
        <tr>
          <td data-label="Quote">${escapeHTML(q.texto)}<br><span style="opacity:0.6; font-size:0.8em;">${escapeHTML(q.autor || "")}</span></td>
          <td data-label="Artista">${escapeHTML(q.artista)}</td>
          <td data-label="Sugerida por">${escapeHTML(q.submitted_by || (idiomaAtual === "en" ? "Anonymous" : "Anónimo"))}</td>
          <td data-label="Data">${dataSubmissao}</td>
          <td data-label="Ações" class="col-acoes-quote">
            <button type="button" class="btn-hud" onclick="aprovarQuote(${q.id})">${t.quotesBtnAprovar || "✓ APROVAR"}</button>
            <button type="button" class="btn-hud btn-perigo" onclick="rejeitarQuote(${q.id})">${t.quotesBtnRejeitar || "✕ REJEITAR"}</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function aprovarQuote(id) {
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  const confirmado = await confirmarAcao(
    t.quotesConfirmarAprovarTexto ||
      "Tens a certeza que queres aprovar esta quote?",
    t.quotesConfirmarAprovarTitulo || "APROVAR QUOTE",
    t.quotesBtnAprovar ? t.quotesBtnAprovar.replace("✓ ", "") : "APROVAR",
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
      mostrarToast(
        dados.erro || t.quotesToastErroAprovar || "ERRO AO APROVAR QUOTE!",
      );
      return;
    }

    mostrarToast(t.quotesToastAprovada || "✓ QUOTE APROVADA!");
    carregarQuotesPendentes();
  } catch (err) {
    console.error("Erro ao aprovar quote:", err);
    mostrarToast(`ERRO DE LIGAÇÃO: ${err.message || err}`);
  }
}

async function rejeitarQuote(id) {
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  const confirmado = await confirmarAcao(
    t.quotesConfirmarRejeitarTexto ||
      "Tens a certeza que queres rejeitar esta quote?",
    t.quotesConfirmarRejeitarTitulo || "REJEITAR QUOTE",
    t.quotesBtnRejeitar ? t.quotesBtnRejeitar.replace("✕ ", "") : "REJEITAR",
    "btn-perigo",
  );
  if (!confirmado) return;

  const { token } = obterTokenEUtilizador();

  try {
    const resposta = await fetch(`${API_URL}/quotes/${id}/reject`, {
      method: "PUT",
      headers: { Authorization: `Bearer` + ` ${token}` },
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      mostrarToast(
        dados.erro || t.quotesToastErroRejeitar || "ERRO AO REJEITAR QUOTE!",
      );
      return;
    }

    mostrarToast(t.quotesToastRejeitada || "QUOTE REJEITADA.");
    carregarQuotesPendentes();
  } catch (err) {
    console.error("Erro ao rejeitar quote:", err);
    mostrarToast(`ERRO DE LIGAÇÃO: ${err.message || err}`);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const idiomaSalvo = localStorage.getItem("idioma_preferido") || "pt";
  if (typeof aplicarTraducoes === "function") {
    aplicarTraducoes(idiomaSalvo);
  }
  carregarQuotesPendentes();
});
