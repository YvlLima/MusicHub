// ==========================================
// ESTADO GLOBAL
// ==========================================
let candidaturaEmRejeicao = null;
let temporizadorToast;

// ==========================================
// UTILITÁRIOS
// ==========================================
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

function voltarAoTopo() {
  window.scrollTo(0, 0);
}

function terminarSessao() {
  localStorage.removeItem("utilizador_ativo");
  localStorage.removeItem("token_jwt");
  window.location.href = "login.html";
}

// ==========================================
// PAINEL DE MODERAÇÃO - CANDIDATURAS
// ==========================================

async function carregarCandidaturas() {
  const tokenJWT = localStorage.getItem("token_jwt");
  if (!tokenJWT) {
    mostrarToast("AUTENTICA-TE PRIMEIRO!");
    return;
  }

  const status = document.getElementById("filtro-status").value;
  const queryParam = status === "todas" ? "" : `?status=${status}`;

  try {
    const resposta = await fetch(`${API_URL}/candidaturas${queryParam}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenJWT}`,
      },
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO CARREGAR CANDIDATURAS!");
      return;
    }

    renderizarCandidaturas(dados.candidaturas);
  } catch (err) {
    console.error("Erro ao carregar candidaturas:", err);
    mostrarToast("ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

function renderizarCandidaturas(candidaturas) {
  const container = document.getElementById("container-candidaturas");

  if (!candidaturas || candidaturas.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #888; padding: 40px;">Nenhuma candidatura encontrada.</p>';
    return;
  }

  container.innerHTML = candidaturas
    .map((cand) => criarCartaoCandidatura(cand))
    .join("");
}

function criarCartaoCandidatura(cand) {
  const statusEmoji = { pendente: "⏳", aprovado: "✓", rejeitado: "✗" };
  const statusColor = {
    pendente: "#ff9900",
    aprovado: "#00ff00",
    rejeitado: "#ff0033",
  };

  const emoji = statusEmoji[cand.status] || "❓";
  const cor = statusColor[cand.status] || "#888888";
  const dataSubmissao = new Date(cand.submitted_date).toLocaleDateString(
    "pt-PT",
  );

  let botoesAcao = "";
  if (cand.status === "pendente") {
    botoesAcao = `
      <button class="btn-aprovar" onclick="aprovarCandidatura(${cand.id})">✓ APROVAR</button>
      <button class="btn-rejeitar" onclick="abrirModalRejeicao(${cand.id})">✗ REJEITAR</button>
    `;
  }
  botoesAcao += `<button class="btn-historico" onclick="carregarHistoricoCandidatura(${cand.id})">📜 HISTÓRICO</button>`;

  const imagem =
    cand.tipo === "artista" && cand.artist_photo
      ? cand.artist_photo
      : cand.album_cover;
  const imagemMostra =
    imagem && imagem.startsWith("data:image")
      ? `<img src="${imagem}" alt="Capa" class="capa-album-admin" />`
      : '<div class="capa-album-placeholder">SEM FOTO</div>';

  let infoAdicional = "";
  if (cand.tipo === "artista") {
    infoAdicional = `
      ${cand.artist_birthdate ? `<span><strong>NASCIMENTO:</strong> ${new Date(cand.artist_birthdate).toLocaleDateString("pt-PT")}</span>` : ""}
      ${cand.profile_links ? `<span><strong>LINK:</strong> <a href="${escapeHTML(cand.profile_links)}" target="_blank" style="color: #ff0033;">Abrir</a></span>` : ""}
    `;
  } else {
    infoAdicional = `
      ${cand.album_date ? `<span><strong>DATA:</strong> ${new Date(cand.album_date).toLocaleDateString("pt-PT")}</span>` : ""}
      ${cand.album_link ? `<span><strong>LINK:</strong> <a href="${escapeHTML(cand.album_link)}" target="_blank" style="color: #ff0033;">Abrir</a></span>` : ""}
    `;
  }

  return `
    <div class="cartao-candidatura">
      <div class="cabecalho-cartao">
        <div class="info-status">
          <span style="color: ${cor};">${emoji} ${cand.status.toUpperCase()}</span>
          <span style="color: #0066ff;">${cand.tipo === "artista" ? "👤 ARTISTA" : "💿 ÁLBUM"}</span>
          <span class="data-submissao">Submetido em ${dataSubmissao} por <strong>${escapeHTML(cand.submitted_by)}</strong></span>
        </div>
      </div>

      <div class="corpo-cartao">
        ${imagemMostra}

        <div class="col-direita">
          <h3>${escapeHTML(cand.artist_name)} ${cand.album_title ? `- ${escapeHTML(cand.album_title)}` : ""}</h3>

          <div class="info-candidatura">
            ${cand.genre ? `<span><strong>GÉNERO:</strong> ${escapeHTML(cand.genre)}</span>` : ""}
            ${infoAdicional}
          </div>

          ${cand.description ? `<p class="descricao">${escapeHTML(cand.description)}</p>` : ""}
        </div>

        <div class="acoes-candidatura">
          ${botoesAcao}
        </div>
      </div>
    </div>
  `;
}

function escapeHTML(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function abrirModalRejeicao(candidaturaId) {
  candidaturaEmRejeicao = candidaturaId;
  document.getElementById("motivo-rejeicao").value = "";
  document.getElementById("modal-rejeicao").style.display = "flex";
}

function fecharModalRejeicao() {
  document.getElementById("modal-rejeicao").style.display = "none";
  candidaturaEmRejeicao = null;
}

async function confirmarRejeicao() {
  const motivo = document.getElementById("motivo-rejeicao").value.trim();

  if (!motivo) {
    mostrarToast("DESCREVE O MOTIVO DA REJEIÇÃO!");
    return;
  }

  await rejeitarCandidatura(candidaturaEmRejeicao, motivo);
  fecharModalRejeicao();
}

async function aprovarCandidatura(candidaturaId) {
  const tokenJWT = localStorage.getItem("token_jwt");
  if (!tokenJWT) {
    mostrarToast("AUTENTICA-TE PRIMEIRO!");
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/candidaturas/${candidaturaId}/approve`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenJWT}`,
        },
      },
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO APROVAR!");
      return;
    }

    mostrarToast("✓ CANDIDATURA APROVADA COM SUCESSO!");
    carregarCandidaturas();
  } catch (err) {
    console.error("Erro ao aprovar:", err);
    mostrarToast("ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

async function rejeitarCandidatura(candidaturaId, motivo) {
  const tokenJWT = localStorage.getItem("token_jwt");
  if (!tokenJWT) {
    mostrarToast("AUTENTICA-TE PRIMEIRO!");
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/candidaturas/${candidaturaId}/reject`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenJWT}`,
        },
        body: JSON.stringify({
          rejection_reason: motivo,
        }),
      },
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO REJEITAR!");
      return;
    }

    mostrarToast("✗ CANDIDATURA REJEITADA!");
    carregarCandidaturas();
  } catch (err) {
    console.error("Erro ao rejeitar:", err);
    mostrarToast("ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

// ==========================================
// HISTÓRICO DE CANDIDATURAS
// ==========================================

async function carregarHistoricoCandidatura(candidaturaId) {
  const tokenJWT = localStorage.getItem("token_jwt");
  if (!tokenJWT) {
    mostrarToast("AUTENTICA-TE PRIMEIRO!");
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/candidaturas/${candidaturaId}/historico`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenJWT}`,
        },
      },
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO CARREGAR HISTÓRICO!");
      return;
    }

    exibirModalHistorico(dados.candidatura, dados.historico);
  } catch (err) {
    console.error("Erro ao carregar histórico:", err);
    mostrarToast("ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

function exibirModalHistorico(candidatura, historico) {
  const modal = document.getElementById("modal-historico");
  const titulo = document.getElementById("historico-titulo");
  const corpo = document.getElementById("historico-corpo");

  titulo.innerHTML = `${escapeHTML(candidatura.artist_name)} - ${escapeHTML(candidatura.album_title)}`;

  let html = `
    <div class="info-candidatura-historico">
      <p><strong>STATUS:</strong> <span style="color: ${getCorStatus(candidatura.status)}">${candidatura.status.toUpperCase()}</span></p>
      <p><strong>SUBMETIDA POR:</strong> ${escapeHTML(candidatura.submitted_by)}</p>
      <p><strong>DATA SUBMISSÃO:</strong> ${new Date(candidatura.submitted_date).toLocaleDateString("pt-PT")}</p>
    </div>

    <h4 style="margin-top: 20px; margin-bottom: 15px; color: #ff0033; border-bottom: 1px solid #333333; padding-bottom: 10px;">
      HISTÓRICO DE AÇÕES
    </h4>
  `;

  if (!historico || historico.length === 0) {
    html +=
      '<p style="text-align: center; color: #888; padding: 20px;">Sem histórico de ações ainda.</p>';
  } else {
    historico.forEach((acao) => {
      const data = new Date(acao.data_acao);
      const dataFormatada = data.toLocaleDateString("pt-PT");
      const horaFormatada = data.toLocaleTimeString("pt-PT");

      const corAcao = acao.acao === "APROVADO" ? "#00ff00" : "#ff0033";
      const emojAcao = acao.acao === "APROVADO" ? "✓" : "✗";

      html += `
        <div class="entrada-historico">
          <div class="entrada-cabecalho">
            <span class="entrada-acao" style="color: ${corAcao};">${emojAcao} ${acao.acao}</span>
            <span class="entrada-data">${dataFormatada} ${horaFormatada}</span>
          </div>
          <div class="entrada-corpo">
            <p><strong>REALIZADO POR:</strong> ${escapeHTML(acao.realizado_por)}</p>
            ${acao.motivo ? `<p><strong>MOTIVO:</strong> ${escapeHTML(acao.motivo)}</p>` : ""}
          </div>
        </div>
      `;
    });
  }

  corpo.innerHTML = html;
  modal.style.display = "flex";
}

function fecharModalHistorico() {
  const modal = document.getElementById("modal-historico");
  modal.style.display = "none";
}

function getCorStatus(status) {
  const cores = {
    pendente: "#ff9900",
    aprovado: "#00ff00",
    rejeitado: "#ff0033",
  };
  return cores[status] || "#888888";
}

// ==========================================
// ARRANQUE DA PÁGINA
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
  carregarCandidaturas();
});
