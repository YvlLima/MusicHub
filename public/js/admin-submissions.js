// ==========================================
// ESTADO GLOBAL
// ==========================================
let candidaturaEmRejeicao = null;

// NOTA: 'temporizadorToast' e 'mostrarToast' já são fornecidos globalmente pelo index.js.
// Removemos a declaração duplicada de 'temporizadorToast' e a função 'mostrarToast' duplicada para evitar o erro de identificador já declarado.

// ==========================================
// UTILITÁRIOS
// ==========================================
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
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  if (!tokenJWT) {
    mostrarToast(t.modToastAutenticar || "AUTENTICA-TE PRIMEIRO!");
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
      mostrarToast(
        dados.erro ||
          t.modToastErroCarregar ||
          "ERRO AO CARREGAR CANDIDATURAS!",
      );
      return;
    }

    renderizarCandidaturas(dados.candidaturas);
  } catch (err) {
    console.error("Erro ao carregar candidaturas:", err);
    mostrarToast(t.modToastErroLigacao || "ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

function renderizarCandidaturas(candidaturas) {
  const container = document.getElementById("container-candidaturas");
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  if (!candidaturas || candidaturas.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: #888; padding: 40px;">${t.modNenhumaEncontrada || "Nenhuma candidatura encontrada."}</p>`;
    return;
  }

  container.innerHTML = candidaturas
    .map((cand) => criarCartaoCandidatura(cand))
    .join("");
}

function criarCartaoCandidatura(cand) {
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  const statusEmoji = { pendente: "⏳", aprovado: "✓", rejeitado: "✗" };
  const statusColor = {
    pendente: "#ff9900",
    aprovado: "#00ff00",
    rejeitado: "#ff0033",
  };

  const emoji = statusEmoji[cand.status] || "❓";
  const cor = statusColor[cand.status] || "#888888";
  const dataSubmissao = new Date(cand.submitted_date).toLocaleDateString(
    idiomaAtual === "en" ? "en-US" : "pt-PT",
  );

  let statusTraduzido = cand.status.toUpperCase();
  if (cand.status === "pendente")
    statusTraduzido = t.modStatusPendente || "PENDENTE";
  else if (cand.status === "aprovado")
    statusTraduzido = t.modStatusAprovado || "APROVADO";
  else if (cand.status === "rejeitado")
    statusTraduzido = t.modStatusRejeitado || "REJEITADO";

  let tipoTraduzido =
    cand.tipo === "artista"
      ? t.modTipoArtista || "👤 ARTISTA"
      : t.modTipoAlbum || "💿 ÁLBUM";

  let botoesAcao = "";
  if (cand.status === "pendente") {
    botoesAcao = `
      <button class="btn-aprovar" onclick="aprovarCandidatura(${cand.id})">${t.modBtnAprovar || "✓ APROVAR"}</button>
      <button class="btn-rejeitar" onclick="abrirModalRejeicao(${cand.id})">${t.modBtnRejeitarLista || "✗ REJEITAR"}</button>
    `;
  }
  botoesAcao += `<button class="btn-historico" onclick="carregarHistoricoCandidatura(${cand.id})">${t.modBtnHistorico || "📜 HISTÓRICO"}</button>`;

  const imagem =
    cand.tipo === "artista" && cand.artist_photo
      ? cand.artist_photo
      : cand.album_cover;
  const imagemMostra =
    imagem && imagem.startsWith("data:image")
      ? `<img src="${imagem}" alt="Capa" class="capa-album-admin" />`
      : `<div class="capa-album-placeholder">${idiomaAtual === "en" ? "NO PHOTO" : "SEM FOTO"}</div>`;

  let infoAdicional = "";
  if (cand.tipo === "artista") {
    infoAdicional = `
      ${cand.artist_birthdate ? `<span><strong>${t.modLabelNascimento || "NASCIMENTO:"}</strong> ${new Date(cand.artist_birthdate).toLocaleDateString(idiomaAtual === "en" ? "en-US" : "pt-PT")}</span>` : ""}
      ${cand.profile_links ? `<span><strong>${t.modLabelLink || "LINK:"}</strong> <a href="${escapeHTML(cand.profile_links)}" target="_blank" style="color: #ff0033;">${t.modLabelAbrir || "Abrir"}</a></span>` : ""}
    `;
  } else {
    infoAdicional = `
      ${cand.album_date ? `<span><strong>${t.modLabelData || "DATA:"}</strong> ${new Date(cand.album_date).toLocaleDateString(idiomaAtual === "en" ? "en-US" : "pt-PT")}</span>` : ""}
      ${cand.album_link ? `<span><strong>${t.modLabelLink || "LINK:"}</strong> <a href="${escapeHTML(cand.album_link)}" target="_blank" style="color: #ff0033;">${t.modLabelAbrir || "Abrir"}</a></span>` : ""}
    `;
  }

  return `
    <div class="cartao-candidatura">
      <div class="cabecalho-cartao">
        <div class="info-status">
          <span style="color: ${cor};">${emoji} ${statusTraduzido}</span>
          <span style="color: #0066ff;">${tipoTraduzido}</span>
          <span class="data-submissao">${t.modLabelSubmetidoPor || "Submetido em"} ${dataSubmissao} ${t.modLabelPor || "por"} <strong>${escapeHTML(cand.submitted_by)}</strong></span>
        </div>
      </div>

      <div class="corpo-cartao">
        ${imagemMostra}

        <div class="col-direita">
          <h3>${escapeHTML(cand.artist_name)} ${cand.album_title ? `- ${escapeHTML(cand.album_title)}` : ""}</h3>

          <div class="info-candidatura">
            ${cand.genre ? `<span><strong>${t.modLabelGenero || "GÉNERO:"}</strong> ${escapeHTML(cand.genre)}</span>` : ""}
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
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  if (!motivo) {
    mostrarToast(t.modToastDescreverMotivo || "DESCREVE O MOTIVO DA REJEIÇÃO!");
    return;
  }

  await rejeitarCandidatura(candidaturaEmRejeicao, motivo);
  fecharModalRejeicao();
}

async function aprovarCandidatura(candidaturaId) {
  const tokenJWT = localStorage.getItem("token_jwt");
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  if (!tokenJWT) {
    mostrarToast(t.modToastAutenticar || "AUTENTICA-TE PRIMEIRO!");
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
      mostrarToast(dados.erro || t.modToastErroAprovar || "ERRO AO APROVAR!");
      return;
    }

    mostrarToast(
      t.modToastAprovadoSucesso || "✓ CANDIDATURA APROVADA COM SUCESSO!",
    );
    carregarCandidaturas();
  } catch (err) {
    console.error("Erro ao aprovar:", err);
    mostrarToast(t.modToastErroLigacao || "ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

async function rejeitarCandidatura(candidaturaId, motivo) {
  const tokenJWT = localStorage.getItem("token_jwt");
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  if (!tokenJWT) {
    mostrarToast(t.modToastAutenticar || "AUTENTICA-TE PRIMEIRO!");
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
      mostrarToast(dados.erro || t.modToastErroRejeitar || "ERRO AO REJEITAR!");
      return;
    }

    mostrarToast(t.modToastRejeitadoSucesso || "✗ CANDIDATURA REJEITADA!");
    carregarCandidaturas();
  } catch (err) {
    console.error("Erro ao rejeitar:", err);
    mostrarToast(t.modToastErroLigacao || "ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

// ==========================================
// HISTÓRICO DE CANDIDATURAS
// ==========================================

async function carregarHistoricoCandidatura(candidaturaId) {
  const tokenJWT = localStorage.getItem("token_jwt");
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  if (!tokenJWT) {
    mostrarToast(t.modToastAutenticar || "AUTENTICA-TE PRIMEIRO!");
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
      mostrarToast(
        dados.erro || t.modToastErroHistorico || "ERRO AO CARREGAR HISTÓRICO!",
      );
      return;
    }

    exibirModalHistorico(dados.candidatura, dados.historico);
  } catch (err) {
    console.error("Erro ao carregar histórico:", err);
    mostrarToast(t.modToastErroLigacao || "ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

function exibirModalHistorico(candidatura, historico) {
  const modal = document.getElementById("modal-historico");
  const titulo = document.getElementById("historico-titulo");
  const corpo = document.getElementById("historico-corpo");
  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  titulo.innerHTML = `${escapeHTML(candidatura.artist_name)} - ${escapeHTML(candidatura.album_title)}`;

  let statusTraduzido = candidatura.status.toUpperCase();
  if (candidatura.status === "pendente")
    statusTraduzido = t.modStatusPendente || "PENDENTE";
  else if (candidatura.status === "aprovado")
    statusTraduzido = t.modStatusAprovado || "APROVADO";
  else if (candidatura.status === "rejeitado")
    statusTraduzido = t.modStatusRejeitado || "REJEITADO";

  let html = `
    <div class="info-candidatura-historico">
      <p><strong>${t.modLabelStatus || "STATUS:"}</strong> <span style="color: ${getCorStatus(candidatura.status)}">${statusTraduzido}</span></p>
      <p><strong>${t.modLabelSubmetidaPorModal || "SUBMETIDA POR:"}</strong> ${escapeHTML(candidatura.submitted_by)}</p>
      <p><strong>${t.modLabelDataSubmissao || "DATA SUBMISSÃO:"}</strong> ${new Date(candidatura.submitted_date).toLocaleDateString(idiomaAtual === "en" ? "en-US" : "pt-PT")}</p>
    </div>

    <h4 style="margin-top: 20px; margin-bottom: 15px; color: #ff0033; border-bottom: 1px solid #333333; padding-bottom: 10px;">
      ${t.modHistoricoAcoesTitulo || "HISTÓRICO DE AÇÕES"}
    </h4>
  `;

  if (!historico || historico.length === 0) {
    html += `<p style="text-align: center; color: #888; padding: 20px;">${t.modSemHistorico || "Sem histórico de ações ainda."}</p>`;
  } else {
    historico.forEach((acao) => {
      const data = new Date(acao.data_acao);
      const dataFormatada = data.toLocaleDateString(
        idiomaAtual === "en" ? "en-US" : "pt-PT",
      );
      const horaFormatada = data.toLocaleTimeString(
        idiomaAtual === "en" ? "en-US" : "pt-PT",
      );

      const corAcao = acao.acao === "APROVADO" ? "#00ff00" : "#ff0033";
      const emojAcao = acao.acao === "APROVADO" ? "✓" : "✗";
      const acaoTraduzida =
        acao.acao === "APROVADO"
          ? idiomaAtual === "en"
            ? "APPROVED"
            : "APROVADO"
          : idiomaAtual === "en"
            ? "REJECTED"
            : "REJEITADO";

      html += `
        <div class="entrada-historico">
          <div class="entrada-cabecalho">
            <span class="entrada-acao" style="color: ${corAcao};">${emojAcao} ${acaoTraduzida}</span>
            <span class="entrada-data">${dataFormatada} ${horaFormatada}</span>
          </div>
          <div class="entrada-corpo">
            <p><strong>${t.modLabelRealizadoPor || "REALIZADO POR:"}</strong> ${escapeHTML(acao.realizado_por)}</p>
            ${acao.motivo ? `<p><strong>${t.modLabelMotivo || "MOTIVO:"}</strong> ${escapeHTML(acao.motivo)}</p>` : ""}
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
  const idiomaSalvo = localStorage.getItem("idioma_preferido") || "pt";
  if (typeof aplicarTraducoes === "function") {
    aplicarTraducoes(idiomaSalvo);
  }
  carregarCandidaturas();
});
