var API_URL = API_URL || "https://musichub-backend-bf0h.onrender.com/api";

// ==========================================
// 1. UTILITÁRIOS E FEEDBACK DA INTERFACE
// ==========================================
function enviarEmailFeedback(destinoEmail, nomeUtilizador) {
  if (!destinoEmail) return;
  emailjs.send("service_wwb9l28", "template_xo1r5qk", {
    to_name: nomeUtilizador,
    email: destinoEmail,
  });
}

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

function copiarLink(url) {
  navigator.clipboard.writeText(url);
  mostrarToast("LINK COPIADO COM SUCESSO");
}

function toggleVisibilidadePass(idCampo, elIcone) {
  const campo = document.getElementById(idCampo);
  if (campo.type === "password") {
    campo.type = "text";
    elIcone.innerText = "🙈";
  } else {
    campo.type = "password";
    elIcone.innerText = "👁";
  }
}

function validarRequisitosPassword(pass) {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-#])[A-Za-z\d@$!%*?&._\-#]{8,}$/;
  return regex.test(pass);
}

function atualizarRelogio() {
  const relogio = document.getElementById("relogio-hud");
  if (relogio) {
    const agora = new Date();
    relogio.innerText = agora.toLocaleTimeString("pt-PT");
  }
}
setInterval(atualizarRelogio, 1000);

window.onscroll = function () {
  var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  var height =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;
  var scrolled = (winScroll / height) * 100;

  const barra = document.getElementById("barra-progresso");
  if (barra) barra.style.width = scrolled + "%";

  var btn = document.getElementById("btn-topo");
  if (btn) {
    if (winScroll > 300) btn.style.display = "block";
    else btn.style.display = "none";
  }
};

function voltarAoTopo() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function verificarEstadoServidor() {
  const ponto = document.getElementById("ponto-servidor");
  const texto = document.getElementById("texto-servidor");
  if (!ponto || !texto) return;

  try {
    const res = await fetch(`${API_URL}/health`, { method: "GET" });
    if (res.ok) {
      ponto.className = "ponto-status online";
      texto.innerText = "SERVER ONLINE";
      texto.style.color = "#00ff66";
    } else {
      throw new Error();
    }
  } catch {
    ponto.className = "ponto-status offline";
    texto.innerText = "SERVER OFFLINE";
    texto.style.color = "#ff0033";
  }
}
setInterval(verificarEstadoServidor, 5000);

// ==========================================
// 2. SISTEMA DE IDIOMAS (INTERNACIONALIZAÇÃO)
// ==========================================
function aplicarTraducoes(lang) {
  if (!traducoes[lang]) lang = "pt";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const chave = el.getAttribute("data-i18n");
    if (traducoes[lang][chave]) {
      el.innerText = traducoes[lang][chave];
    }
  });

  // Traduzir placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const chave = el.getAttribute("data-i18n-placeholder");
    if (traducoes[lang][chave]) {
      el.placeholder = traducoes[lang][chave];
    }
  });

  const campoPesquisa = document.getElementById("campo-pesquisa");
  if (campoPesquisa) {
    campoPesquisa.placeholder = traducoes[lang].pesquisaPlaceholder;
  }
}

function mudarIdioma(lang) {
  if (!traducoes[lang]) lang = "pt";
  localStorage.setItem("idioma_preferido", lang);

  aplicarTraducoes(lang);

  const select = document.getElementById("idioma-select");
  if (select && select.value !== lang) select.value = lang;

  // Se estiveres na página da comunidade, recarrega a lista para aplicar as novas traduções de labels
  if (
    typeof carregarPaginaComunidade === "function" &&
    document.getElementById("lista-comunidade")
  ) {
    carregarPaginaComunidade();
  }
}

// ==========================================
// 3. CONTEÚDO, LIKES E PESQUISA
// ==========================================
function atualizarStatsHUD() {
  const totalArtistas =
    typeof todosArtistasAprovados !== "undefined" &&
    todosArtistasAprovados.length
      ? todosArtistasAprovados.length
      : document.querySelectorAll("#musica .cartao").length;
  const totalAlbuns =
    typeof todosAlbunsAprovados !== "undefined" && todosAlbunsAprovados.length
      ? todosAlbunsAprovados.length
      : document.querySelectorAll("#albuns .cartao").length;

  const elArt = document.getElementById("stat-artistas");
  const elAlb = document.getElementById("stat-albuns");

  if (elArt) elArt.innerText = totalArtistas;
  if (elAlb) elAlb.innerText = totalAlbuns;

  atualizarTopArtistaSuave();
}

function atualizarTopArtistaSuave() {
  let topArtista = "—";
  let maxLikes = 0;

  const cartoesArtistas = document.querySelectorAll("#musica .cartao");

  cartoesArtistas.forEach((cartao) => {
    const nome = cartao.querySelector("h3")?.innerText || "—";
    const contador = cartao.querySelector(".contador")?.innerText || "0";
    const likes = parseInt(contador, 10);

    if (likes > maxLikes) {
      maxLikes = likes;
      topArtista = nome;
    }
  });

  const elemTop = document.getElementById("stat-top-artista");
  if (elemTop) elemTop.innerText = maxLikes > 0 ? topArtista : "—";
}

function filtrarCartoes() {
  const campo = document.getElementById("campo-pesquisa");
  const termo = campo.value.toLowerCase().trim();

  const grelhaArtistas = document.querySelector("#musica .grelha");
  const grelhaAlbuns = document.querySelector("#albuns .grelha");
  const botoesArtistas = document.getElementById("botoes-grelha-artistas");
  const botoesAlbuns = document.getElementById("botoes-grelha-albuns");

  if (!termo) {
    if (typeof renderizarGrelhasAprovadas === "function") {
      renderizarGrelhasAprovadas();
    }
    return;
  }

  const artistasFiltrados = (todosArtistasAprovados || []).filter((item) =>
    itemCorrespondePesquisa(item, termo, "artista"),
  );
  const albunsFiltrados = (todosAlbunsAprovados || []).filter((item) =>
    itemCorrespondePesquisa(item, termo, "album"),
  );

  if (grelhaArtistas) {
    grelhaArtistas.innerHTML = artistasFiltrados
      .map((item) => construirCartaoArtista(item))
      .join("");
  }
  if (grelhaAlbuns) {
    grelhaAlbuns.innerHTML = albunsFiltrados
      .map((item) => construirCartaoAlbum(item))
      .join("");
  }

  if (botoesArtistas) botoesArtistas.innerHTML = "";
  if (botoesAlbuns) botoesAlbuns.innerHTML = "";

  if (typeof carregarLikesBD === "function") carregarLikesBD();
  if (typeof carregarRatingsBD === "function") carregarRatingsBD();
}

function itemCorrespondePesquisa(item, termo, tipo) {
  const nomePrincipal = tipo === "album" ? item.album_title : item.artist_name;
  const nomeArtista = tipo === "album" ? item.artist_name : "";
  const generos = item.genre || "";

  const alvo = `${nomePrincipal || ""} ${nomeArtista} ${generos}`.toLowerCase();
  return alvo.includes(termo);
}

// Citações (Quotes)
const quotes = [
  {
    texto: '"Should\'ve known this shit was not real when it started"',
    autor: "— PLAYBOI CARTI - OVER",
    artista: "PLAYBOI CARTI",
  },
  {
    texto: '"Just to feel like this, it took a long time"',
    autor: "— PLAYBOI CARTI - LONG TIME",
    artista: "PLAYBOI CARTI",
  },
  {
    texto: '"O teu love, é tudo o que eu peço"',
    autor: "— LON3R JOHNY - LV",
    artista: "LON3R JOHNY",
  },
  {
    texto: '"Eu sou maluco, obcecado por ti, tu não sais da minha mente"',
    autor: "— LON3R JOHNY - LUV",
    artista: "LON3R JOHNY",
  },
  {
    texto: '"Like oxygen, without you, baby girl, I can\'t breathe"',
    autor: "— KEN CARSON - I NEED U",
    artista: "KEN CARSON",
  },
];

let quotesUsadas = [];
let ultimoArtista = "";
let temporizadorQuote;
let indexLetra = 0;
let textoAtualTypewriter = "";
let temporizadorTypewriter;

function escreverTextoTypewriter(texto, elemento, velocidade = 40) {
  clearTimeout(temporizadorTypewriter);
  elemento.textContent = "";
  indexLetra = 0;
  textoAtualTypewriter = texto;

  function digitar() {
    if (indexLetra <= textoAtualTypewriter.length) {
      elemento.textContent = textoAtualTypewriter.slice(0, indexLetra);
      indexLetra++;
      temporizadorTypewriter = setTimeout(digitar, velocidade);
    }
  }
  digitar();
}

function gerarQuote() {
  const elementoTexto = document.getElementById("texto-quote");
  const elementoAutor = document.getElementById("autor-quote");

  if (!elementoTexto || !elementoAutor) return;

  const poolQuotes = quotes.concat(quotesAprovadasBD);

  if (quotesUsadas.length >= poolQuotes.length) quotesUsadas = [];

  let disponiveis = poolQuotes.filter(
    (q, index) => !quotesUsadas.includes(index) && q.artista !== ultimoArtista,
  );
  if (disponiveis.length === 0)
    disponiveis = poolQuotes.filter(
      (q, index) => !quotesUsadas.includes(index),
    );

  const indiceSorteado = Math.floor(Math.random() * disponiveis.length);
  const quoteEscolhida = disponiveis[indiceSorteado];

  quotesUsadas.push(poolQuotes.findIndex((q) => q === quoteEscolhida));
  ultimoArtista = quoteEscolhida.artista;

  escreverTextoTypewriter(quoteEscolhida.texto, elementoTexto);
  elementoAutor.innerText = quoteEscolhida.autor;

  reiniciarTemporizador();
}

function reiniciarTemporizador() {
  clearInterval(temporizadorQuote);
  temporizadorQuote = setInterval(gerarQuote, 8000);
}

function vibeAleatoria() {
  const cartoes = document.querySelectorAll(".cartao");
  if (cartoes.length === 0) return;
  const sorteado = cartoes[Math.floor(Math.random() * cartoes.length)];
  sorteado.scrollIntoView({ behavior: "smooth", block: "center" });
  sorteado.style.borderColor = "#ffffff";
  sorteado.style.boxShadow = "0 0 25px rgba(255, 255, 255, 0.6)";
  setTimeout(() => {
    sorteado.style.borderColor = "#1a1a1a";
    sorteado.style.boxShadow = "none";
  }, 1500);
}

// Sistema de Likes
async function darLike(btn, id) {
  if (!utilizadorDados || !tokenJWT) {
    return mostrarToast("PRECISAS DE ESTAR AUTENTICADO!");
  }

  const elemContador = btn.querySelector(".contador");
  let totalAtual = parseInt(elemContador.innerText || "0");
  const jaTinhaLike = btn.classList.contains("liked");

  if (jaTinhaLike) {
    btn.classList.remove("liked");
    elemContador.innerText = Math.max(0, totalAtual - 1);
    mostrarToast("LIKE REMOVIDO");
  } else {
    btn.classList.add("liked");
    elemContador.innerText = totalAtual + 1;
    mostrarToast("LIKE ADICIONADO");
  }

  atualizarTopArtistaSuave();

  try {
    await fetch(`${API_URL}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenJWT}`,
      },
      body: JSON.stringify({
        username: utilizadorDados.username,
        item_id: id,
      }),
    });
  } catch (err) {
    console.error("Erro ao guardar like na BD:", err);
  }
}

async function carregarLikesBD() {
  const userString = localStorage.getItem("utilizador_ativo");
  const user = userString
    ? JSON.parse(userString)
    : typeof utilizadorDados !== "undefined" && utilizadorDados
      ? utilizadorDados
      : {};
  const username = user.username || "";

  try {
    const resposta = await fetch(
      `${API_URL}/likes?username=${encodeURIComponent(username)}`,
    );
    const dados = await resposta.json();

    if (!resposta.ok) return;

    document.querySelectorAll(".btn-like").forEach((btn) => {
      btn.classList.remove("liked");
      const contador = btn.querySelector(".contador");
      if (contador) contador.innerText = "0";
    });

    if (dados.contagem) {
      for (const [itemId, total] of Object.entries(dados.contagem)) {
        const contador =
          document.getElementById(`count-like-${itemId}`) ||
          document.querySelector(
            `.cartao[data-candidatura="${itemId}"] .contador`,
          );
        if (contador) {
          contador.innerText = total;
        }
      }
    }

    if (dados.deuLike && Array.isArray(dados.deuLike)) {
      dados.deuLike.forEach((itemId) => {
        const btn =
          document.getElementById(`btn-like-${itemId}`) ||
          document.querySelector(
            `.cartao[data-candidatura="${itemId}"] .btn-like`,
          );
        if (btn) {
          btn.classList.add("liked");
        }
      });
    }

    if (typeof atualizarStatsHUD === "function") {
      atualizarStatsHUD();
    }
  } catch (err) {
    console.error("Erro ao carregar likes da BD:", err);
  }
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

// ==========================================
// 4. PAINEL DE ADMINISTRAÇÃO
// ==========================================
function verificarEstatutoAdmin() {
  const seccaoAdmin = document.getElementById("seccao-admin");
  const btnAdminCandidaturas = document.getElementById(
    "btn-admin-candidaturas",
  );
  const btnAdminQuotes = document.getElementById("btn-admin-quotes");

  if (utilizadorDados && utilizadorDados.is_admin > 0) {
    if (seccaoAdmin) seccaoAdmin.style.display = "block";
    if (btnAdminCandidaturas)
      btnAdminCandidaturas.style.display = "inline-block";
    if (btnAdminQuotes) btnAdminQuotes.style.display = "inline-block";
    carregarUtilizadoresAdmin();
  } else {
    if (seccaoAdmin) seccaoAdmin.style.display = "none";
    if (btnAdminCandidaturas) btnAdminCandidaturas.style.display = "none";
    if (btnAdminQuotes) btnAdminQuotes.style.display = "none";
  }
}

async function carregarUtilizadoresAdmin() {
  if (!tokenJWT) return;

  if (typeof carregarStatsEGlags === "function") {
    carregarStatsEGlags();
  }

  try {
    const resposta = await fetch(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${tokenJWT}` },
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO CARREGAR UTILIZADORES!");
      return;
    }

    const tbody = document.getElementById("lista-utilizadores-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    dados.utilizadores.forEach((user) => {
      const tr = document.createElement("tr");

      const eAdmin = user.username === "YvlLima";
      const eMod = user.is_admin === 2;
      const eProprioUser =
        utilizadorDados && user.username === utilizadorDados.username;

      let cargoHTML = `<span class="badge-user">USER</span>`;
      if (eAdmin) cargoHTML = `<span class="badge-admin">ADMIN</span>`;
      else if (eMod) cargoHTML = `<span class="badge-mod">MOD</span>`;

      const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
      const t = traducoes[idiomaAtual] || traducoes["pt"];

      let promoverBtnHTML = `—`;
      if (!eAdmin && !eProprioUser) {
        if (eMod) {
          promoverBtnHTML = `<button type="button" class="btn-despromover" onclick="despromoverUtilizador('${user.username}')">${t.adminBtnDespromover || "👇 DESPROMOVER"}</button>`;
        } else {
          promoverBtnHTML = `<button type="button" class="btn-promover" onclick="promoverMod('${user.username}')">${t.adminBtnPromover || "👆 PROMOVER"}</button>`;
        }
      }

      const eliminarBtnHTML =
        eAdmin || eProprioUser
          ? `—`
          : `<button type="button" class="btn-eliminar" onclick="eliminarUtilizador(${user.id}, '${user.username}')">${t.adminBtnApagar || "❌ APAGAR"}</button>`;

      tr.innerHTML = `
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${cargoHTML}</td>
        <td>${promoverBtnHTML}</td>
        <td>${eliminarBtnHTML}</td>
      `;

      tbody.appendChild(tr);
    });

    if (typeof filtrarUtilizadores === "function") {
      filtrarUtilizadores();
    }
  } catch (err) {
    console.error("Erro ao carregar utilizadores do admin:", err);
  }
}

async function promoverMod(usernameAlvo) {
  const confirmou = await confirmarAcao(
    `Promover '${usernameAlvo}' a Moderador?`,
    "DAR MOD",
  );
  if (!confirmou) return;

  try {
    const resposta = await fetch(`${API_URL}/admin/promote-mod`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenJWT}`,
      },
      body: JSON.stringify({ targetUsername: usernameAlvo }),
    });

    const dados = await resposta.json();
    if (!resposta.ok) return mostrarToast(dados.erro || "ERRO!");

    mostrarToast(dados.mensagem);
    carregarUtilizadoresAdmin();
  } catch (err) {
    mostrarToast("ERRO DE LIGAÇÃO!");
  }
}

async function despromoverUtilizador(usernameAlvo) {
  const confirmou = await confirmarAcao(
    `Remover cargo de Moderador de '${usernameAlvo}'?`,
    "REMOVER MOD",
  );
  if (!confirmou) return;

  try {
    const resposta = await fetch(`${API_URL}/admin/demote`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenJWT}`,
      },
      body: JSON.stringify({ targetUsername: usernameAlvo }),
    });

    const dados = await resposta.json();
    if (!resposta.ok) return mostrarToast(dados.erro || "ERRO!");

    mostrarToast(dados.mensagem);
    carregarUtilizadoresAdmin();
  } catch (err) {
    mostrarToast("ERRO DE LIGAÇÃO!");
  }
}

async function eliminarUtilizador(userId, username) {
  const confirmou = await confirmarAcao(
    `Eliminar permanentemente a conta '${username}'?`,
    "ELIMINAR UTILIZADOR",
  );
  if (!confirmou) return;

  try {
    const resposta = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenJWT}` },
    });

    const dados = await resposta.json();

    if (!resposta.ok) return mostrarToast(dados.erro || "ERRO AO ELIMINAR!");

    mostrarToast(dados.mensagem || "UTILIZADOR ELIMINADO!");
    carregarUtilizadoresAdmin();
    carregarLikesBD();
  } catch (err) {
    mostrarToast("ERRO DE LIGAÇÃO!");
  }
}

function filtrarUtilizadores() {
  const el = document.getElementById("pesquisa-admin");
  if (!el) return;
  const termo = el.value.toLowerCase();
  const linhas = document.querySelectorAll("#lista-utilizadores-body tr");

  linhas.forEach((linha) => {
    const username = linha.children[1].innerText.toLowerCase();
    linha.style.display = username.includes(termo) ? "" : "none";
  });
}

async function carregarStatsEGlags() {
  if (!tokenJWT) return;

  try {
    const resposta = await fetch(`${API_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${tokenJWT}` },
    });

    const dados = await resposta.json();
    if (!resposta.ok) return;

    const elTotalUsers = document.getElementById("stat-total-users");
    const elTotalMods = document.getElementById("stat-total-mods");
    const elTotalLikes = document.getElementById("stat-total-likes");

    if (elTotalUsers) elTotalUsers.innerText = dados.stats.totalUsers;
    if (elTotalMods) elTotalMods.innerText = dados.stats.totalMods;
    if (elTotalLikes) elTotalLikes.innerText = dados.stats.totalLikes;

    const tbodyLogs = document.getElementById("lista-logs-body");
    if (tbodyLogs) {
      tbodyLogs.innerHTML = "";
      dados.logs.forEach((log) => {
        const tr = document.createElement("tr");
        const dataFormatada = new Date(log.data).toLocaleString("pt-PT");

        // Mapeia a ação da base de dados para a chave de tradução correspondente
        let chaveAcao = "";
        const acaoUpper = (log.acao || "").toUpperCase();
        if (acaoUpper.includes("SUGERIU QUOTE")) chaveAcao = "logSugeriurQuote";
        else if (acaoUpper.includes("APROVOU QUOTE"))
          chaveAcao = "logAprovouQuote";
        else if (acaoUpper.includes("ELIMINOU CONTA"))
          chaveAcao = "logEliminouConta";
        else if (acaoUpper.includes("DEIXOU DE SEGUIR"))
          chaveAcao = "logDeixouSeguir";
        else if (acaoUpper.includes("COMEÇOU A SEGUIR"))
          chaveAcao = "logComecouSeguir";

        const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
        const acaoTraduzida =
          chaveAcao &&
          traducoes[idiomaAtual] &&
          traducoes[idiomaAtual][chaveAcao]
            ? traducoes[idiomaAtual][chaveAcao]
            : log.acao;

        tr.innerHTML = `
          <td>${dataFormatada}</td>
          <td>${log.autor}</td>
          <td><span style="color: #ff0033;">${acaoTraduzida}</span></td>
          <td>${log.alvo}</td>
        `;
        tbodyLogs.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Erro ao carregar estatísticas:", err);
  }
}

async function exportarDadosAdmin(formato) {
  if (!tokenJWT) return;

  try {
    const resposta = await fetch(`${API_URL}/admin/export?format=${formato}`, {
      headers: { Authorization: `Bearer ${tokenJWT}` },
    });

    if (!resposta.ok) return mostrarToast("ERRO AO EXPORTAR!");

    if (formato === "csv") {
      const blob = await resposta.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "utilizadores.csv";
      a.click();
    } else {
      const dados = await resposta.json();
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(dados, null, 2));
      const a = document.createElement("a");
      a.href = dataStr;
      a.download = "utilizadores.json";
      a.click();
    }
    mostrarToast("FICHEIRO DESCARREGADO!");
  } catch (err) {
    mostrarToast("ERRO DE LIGAÇÃO!");
  }
}

// ==========================================
// 5. FILTROS, TAGS E RATINGS
// ==========================================
function filtrarCategoria(categoria, btn) {
  document
    .querySelectorAll(".btn-filtro")
    .forEach((b) => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");

  const seccaoMusica = document.getElementById("musica");
  const seccaoAlbuns = document.getElementById("albuns");

  if (!seccaoMusica || !seccaoAlbuns) return;

  if (categoria === "tudo") {
    seccaoMusica.style.display = "block";
    seccaoAlbuns.style.display = "block";
  } else if (categoria === "musica") {
    seccaoMusica.style.display = "block";
    seccaoAlbuns.style.display = "none";
  } else if (categoria === "albuns") {
    seccaoMusica.style.display = "none";
    seccaoAlbuns.style.display = "block";
  }
}

async function carregarRatingsBD() {
  const userString = localStorage.getItem("utilizador_ativo");
  const user = userString ? JSON.parse(userString) : {};
  const username = user.username || "";

  try {
    const res = await fetch(
      `${API_URL}/ratings?username=${encodeURIComponent(username)}`,
    );
    const dados = await res.json();
    if (!res.ok) return;

    for (const [itemId, info] of Object.entries(dados.estatisticas)) {
      const elInfo = document.getElementById(`info-rating-${itemId}`);
      if (elInfo) {
        elInfo.innerText = `${info.media} ★ (${info.total})`;
      }
    }

    if (dados.minhasNotas) {
      for (const [itemId, nota] of Object.entries(dados.minhasNotas)) {
        const box = document.querySelector(
          `.rating-box[data-item='${itemId}']`,
        );
        if (box) {
          const estrelas = box.querySelectorAll(".estrela");
          estrelas.forEach((est, idx) => {
            if (idx < nota) est.classList.add("ativa");
            else est.classList.remove("ativa");
          });
        }
      }
    }
  } catch (err) {
    console.error("Erro ao carregar ratings:", err);
  }
}

async function submeterRating(itemId, estrelas) {
  if (!utilizadorDados || !tokenJWT) {
    return mostrarToast("PRECISAS DE ESTAR AUTENTICADO!");
  }

  try {
    const res = await fetch(`${API_URL}/rate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenJWT}`,
      },
      body: JSON.stringify({ item_id: itemId, estrelas: estrelas }),
    });

    const dados = await res.json();
    if (!res.ok) return mostrarToast(dados.erro || "ERRO AO AVALIAR!");

    mostrarToast(`AVALIAÇÃO DE ${estrelas}★ REGISTADA!`);
    carregarRatingsBD();
  } catch (err) {
    mostrarToast("ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

// ==========================================
// 6. GESTÃO DE PERFIL E SEGURANÇA DE PASSWORD
// ==========================================
async function guardarPerfil(e) {
  e.preventDefault();

  const username = document.getElementById("perfil-username").value.trim();
  const email = document.getElementById("perfil-email").value.trim();
  const currentPassword = document.getElementById("perfil-current-password")
    ? document.getElementById("perfil-current-password").value
    : "";
  const newPassword = document.getElementById("perfil-password").value;

  if (newPassword && !currentPassword) {
    return mostrarToast("PRECISAS DE INSERIR A PALAVRA-PASSE ATUAL!");
  }

  const payload = {
    username,
    email,
    currentPassword,
    newPassword: newPassword || undefined,
  };

  try {
    const resposta = await fetch(`${API_URL}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenJWT}`,
      },
      body: JSON.stringify(payload),
    });

    const dados = await resposta.json();
    if (!resposta.ok)
      return mostrarToast(dados.erro || "ERRO AO GUARDAR PERFIL!");

    mostrarToast("PERFIL ATUALIZADO COM SUCESSO!");

    if (document.getElementById("perfil-current-password")) {
      document.getElementById("perfil-current-password").value = "";
    }
    document.getElementById("perfil-password").value = "";
  } catch (err) {
    mostrarToast("ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

// ==========================================
// 7. CANDIDATURAS E QUOTES
// ==========================================
let artistPhotoBase64 = "";
let albumCoverBase64 = "";
let tipoCandidaturaSelecionado = "artista";

function abrirFormularioCandidatura() {
  if (!utilizadorDados || !tokenJWT) {
    mostrarToast("AUTENTICA-TE PRIMEIRO!");
    return;
  }

  artistPhotoBase64 = "";
  albumCoverBase64 = "";
  tipoCandidaturaSelecionado = "artista";
  document.getElementById("form-candidatura").reset();
  document.querySelector(
    'input[name="tipo-candidatura"][value="artista"]',
  ).checked = true;
  mudarTipoCandidatura("artista");
  document.getElementById("modal-candidatura").style.display = "flex";
}

function fecharModalCandidatura() {
  document.getElementById("modal-candidatura").style.display = "none";
  artistPhotoBase64 = "";
  albumCoverBase64 = "";
}

function mudarTipoCandidatura(tipo) {
  tipoCandidaturaSelecionado = tipo;
  const camposArtista = document.getElementById("campos-artista");
  const camposAlbum = document.getElementById("campos-album");

  if (tipo === "artista") {
    camposArtista.style.display = "block";
    camposAlbum.style.display = "none";
  } else {
    camposArtista.style.display = "none";
    camposAlbum.style.display = "block";
  }
}

function carregarFotoArtista(event) {
  const file = event.target.files[0];
  if (!file) {
    artistPhotoBase64 = "";
    document.getElementById("preview-artist-photo").src = "imagens/pfp.png";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (evt) {
    artistPhotoBase64 = evt.target.result;
    document.getElementById("preview-artist-photo").src = artistPhotoBase64;
  };
  reader.readAsDataURL(file);
}

function carregarCapaAlbum(event) {
  const file = event.target.files[0];
  if (!file) {
    albumCoverBase64 = "";
    document.getElementById("preview-album-cover").src = "imagens/pfp.png";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (evt) {
    albumCoverBase64 = evt.target.result;
    document.getElementById("preview-album-cover").src = albumCoverBase64;
  };
  reader.readAsDataURL(file);
}

async function submeterCandidatura(e) {
  e.preventDefault();

  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  if (!utilizadorDados || !tokenJWT) {
    mostrarToast(
      idiomaAtual === "en" ? "PLEASE LOG IN FIRST!" : "AUTENTICA-TE PRIMEIRO!",
    );
    return;
  }

  let payload = {};

  if (tipoCandidaturaSelecionado === "artista") {
    const artist_name = document
      .getElementById("candidatura-artist-name")
      .value.trim();
    const artist_photo = artistPhotoBase64 || null;
    const artist_profile = document
      .getElementById("candidatura-artist-profile")
      .value.trim();
    const artist_birthdate =
      document.getElementById("candidatura-artist-birthdate").value || null;
    const genre =
      document.getElementById("candidatura-artist-genre").value.trim() || null;
    const description =
      document.getElementById("candidatura-artist-description").value.trim() ||
      null;

    if (!artist_name)
      return mostrarToast(
        t.subToastPreencherNomeArtista || "PREENCHE O NOME DO ARTISTA!",
      );
    if (!artist_birthdate)
      return mostrarToast(
        t.subToastPreencherDataNasc || "PREENCHE A DATA DE NASCIMENTO!",
      );
    if (!artist_photo)
      return mostrarToast(
        t.subToastEscolherFotoArtista || "CARREGA UMA FOTO DO ARTISTA!",
      );
    if (!artist_profile)
      return mostrarToast(
        t.subToastPreencherPerfilArtista || "PREENCHE O PERFIL DO ARTISTA!",
      );

    payload = {
      tipo: "artista",
      artist_name,
      artist_birthdate,
      artist_photo,
      artist_profile,
      genre,
      description,
    };
  } else {
    const album_title = document
      .getElementById("candidatura-album-title")
      .value.trim();
    const album_artist = document
      .getElementById("candidatura-album-artist")
      .value.trim();
    const album_cover = albumCoverBase64 || null;
    const album_date =
      document.getElementById("candidatura-album-date").value || null;
    const album_link = document
      .getElementById("candidatura-album-link")
      .value.trim();
    const genre =
      document.getElementById("candidatura-album-genre").value.trim() || null;
    const description =
      document.getElementById("candidatura-album-description").value.trim() ||
      null;

    if (!album_title)
      return mostrarToast(
        t.subToastPreencherNomeAlbum || "PREENCHE O NOME DO ÁLBUM!",
      );
    if (!album_artist)
      return mostrarToast(
        t.subToastPreencherArtistaAlbum || "PREENCHE O ARTISTA!",
      );
    if (!album_cover)
      return mostrarToast(t.subToastEscolherCapaAlbum || "CARREGA UMA CAPA!");
    if (!album_date)
      return mostrarToast(t.subToastPreencherDataAlbum || "PREENCHE A DATA!");
    if (!album_link)
      return mostrarToast(
        t.subToastPreencherLinkAlbum || "PREENCHE O LINK DO ÁLBUM!",
      );

    payload = {
      tipo: "album",
      album_title,
      album_artist,
      album_cover,
      album_date,
      album_link,
      genre,
      description,
    };
  }

  try {
    const resposta = await fetch(`${API_URL}/candidaturas/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenJWT}`,
      },
      body: JSON.stringify(payload),
    });

    let dados;
    try {
      dados = await resposta.json();
    } catch (parseErr) {
      console.error("Erro ao interpretar resposta do servidor:", parseErr);
      mostrarToast("RESPOSTA INVÁLIDA DO SERVIDOR! Vê a consola (F12).");
      return;
    }

    if (!resposta.ok) {
      console.error("Erro ao submeter candidatura:", dados);
      return mostrarToast(dados.erro || `ERRO! (status ${resposta.status})`);
    }

    mostrarToast(t.subToastSucesso || "✓ CANDIDATURA SUBMETIDA COM SUCESSO!");
    fecharModalCandidatura();
  } catch (err) {
    console.error("Erro ao submeter candidatura:", err);
    mostrarToast(`ERRO DE LIGAÇÃO: ${err.message || err}`);
  }
}

function abrirPainelModeracaoCandidaturas() {
  window.location.href = "admin-submissions.html";
}

function abrirPainelModeracaoQuotes() {
  window.location.href = "admin-quotes.html";
}

function abrirModalSugestaoQuote() {
  if (!utilizadorDados || !tokenJWT) {
    mostrarToast("AUTENTICA-TE PRIMEIRO!");
    return;
  }

  document.getElementById("form-sugestao-quote").reset();
  document.getElementById("modal-sugestao-quote").style.display = "flex";
}

function fecharModalSugestaoQuote() {
  document.getElementById("modal-sugestao-quote").style.display = "none";
}

async function submeterSugestaoQuote(e) {
  e.preventDefault();

  if (!utilizadorDados || !tokenJWT) {
    mostrarToast("AUTENTICA-TE PRIMEIRO!");
    return;
  }

  const texto = document.getElementById("quote-sugestao-texto").value.trim();
  const artista = document
    .getElementById("quote-sugestao-artista")
    .value.trim();
  const musica = document.getElementById("quote-sugestao-musica").value.trim();

  if (!texto) return mostrarToast("PREENCHE O TEXTO DA QUOTE!");
  if (!artista) return mostrarToast("PREENCHE O ARTISTA!");
  if (!musica) return mostrarToast("PREENCHE A MÚSICA!");

  const payload = {
    texto: texto.startsWith('"') ? texto : `"${texto}"`,
    artista,
    autor: `— ${artista.toUpperCase()} - ${musica.toUpperCase()}`,
  };

  try {
    const resposta = await fetch(`${API_URL}/quotes/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenJWT}`,
      },
      body: JSON.stringify(payload),
    });

    let dados;
    try {
      dados = await resposta.json();
    } catch (parseErr) {
      console.error("Erro ao interpretar resposta do servidor:", parseErr);
      mostrarToast("RESPOSTA INVÁLIDA DO SERVIDOR! Vê a consola (F12).");
      return;
    }

    if (!resposta.ok) {
      console.error("Erro ao submeter quote:", dados);
      return mostrarToast(dados.erro || `ERRO! (status ${resposta.status})`);
    }

    mostrarToast("✓ QUOTE SUBMETIDA PARA APROVAÇÃO!");
    fecharModalSugestaoQuote();
  } catch (err) {
    console.error("Erro ao submeter quote:", err);
    mostrarToast(`ERRO DE LIGAÇÃO: ${err.message || err}`);
  }
}

let quotesAprovadasBD = [];

async function carregarQuotesAprovadasBD() {
  try {
    const resposta = await fetch(`${API_URL}/quotes/aprovadas`);
    if (!resposta.ok) return;

    const dados = await resposta.json();
    quotesAprovadasBD = (dados.aprovadas || []).map((q) => ({
      texto: q.texto,
      autor: q.autor,
      artista: q.artista,
    }));
  } catch (err) {
    console.error("Erro ao carregar quotes aprovadas:", err);
  }
}

async function abrirInfoItem(id) {
  try {
    const res = await fetch(`${API_URL}/candidaturas/aprovadas`);
    const dados = await res.json();

    if (!res.ok) return mostrarToast("ERRO AO CARREGAR DETALHES!");

    const item = dados.aprovados.find((c) => String(c.id) === String(id));
    if (!item) return;

    const titulo =
      item.tipo === "album"
        ? `${item.artist_name} - ${item.album_title}`
        : item.artist_name;
    document.getElementById("info-item-titulo").innerText =
      titulo.toUpperCase();

    const dataSubmissao = item.submitted_date
      ? new Date(item.submitted_date).toLocaleDateString("pt-PT")
      : "—";
    const dataAprovacao = item.reviewed_date
      ? new Date(item.reviewed_date).toLocaleDateString("pt-PT")
      : "—";

    document.getElementById("info-item-conteudo").innerHTML = `
      <p><strong>SUBMETIDO POR:</strong> <span style="color: #ff0033;">${escapeHTML(item.submitted_by || "Anónimo")}</span> (${dataSubmissao})</p>
      <p><strong>APROVADO POR:</strong> <span style="color: #00ff00;">${escapeHTML(item.reviewed_by || "Admin")}</span> (${dataAprovacao})</p>
      <p><strong>DESCRIÇÃO:</strong></p>
      <div style="background: #050505; padding: 10px; border-left: 2px solid #ff0033; border-radius: 4px; color: #ccc;">
        ${escapeHTML(item.description || "Sem descrição disponível.")}
      </div>
    `;

    document.getElementById("modal-info-item").style.display = "flex";
  } catch (err) {
    console.error("Erro ao abrir detalhes:", err);
  }
}

function fecharModalInfoItem() {
  const modal = document.getElementById("modal-info-item");
  if (modal) modal.style.display = "none";
}

let todosArtistasAprovados = [];
let todosAlbunsAprovados = [];
let limiteArtistasIndex = 5;
let limiteAlbunsIndex = 5;

function construirCartaoArtista(item) {
  const idUnico = `cand_${item.id}`;

  const btnInfoHTML = `
  <button type="button" class="btn-share" 
          title="Informações de Submissão"
          onclick="abrirInfoItem(${item.id})" 
          style="border-radius: 50%; width: 22px; height: 22px; padding: 0; font-weight: bold;">
    i
  </button>
`;

  const generos = item.genre ? item.genre.split(",").map((g) => g.trim()) : [];
  const tagsHTML = generos
    .map(
      (g, i) =>
        `<span class="${i % 2 === 1 ? "tag alt" : "tag"}">${escapeHTML(g)}</span>`,
    )
    .join(" ");

  let embedHTML = "";
  if (item.profile_links && item.profile_links.includes("spotify.com")) {
    const match = item.profile_links.match(/(artist|album)\/([a-zA-Z0-9]+)/);
    if (match) {
      const tipoItem = match[1];
      const spotifyId = match[2];
      const altura = tipoItem === "artist" ? 352 : 152;
      embedHTML = `<iframe src="https://open.spotify.com/embed/${tipoItem}/${spotifyId}?utm_source=generator" width="100%" height="${altura}" frameborder="0" allowfullscreen="" loading="lazy"></iframe>`;
    }
  }

  const dataNasc = item.artist_birthdate
    ? new Date(item.artist_birthdate).toLocaleDateString("pt-PT")
    : "";

  return `
    <div class="cartao" data-candidatura="${idUnico}">
      <div class="top-cartao">
        <div class="status-indicator"><span class="ponto-pisca"></span> REC 4K</div>
        <div class="acoes-cartao">
          ${btnInfoHTML}
          <button id="btn-like-${idUnico}" class="btn-like" onclick="darLike(this, '${idUnico}')">
            ♥ <span id="count-like-${idUnico}" class="contador">0</span>
          </button>
          ${item.profile_links ? `<button class="btn-share" onclick="copiarLink('${escapeHTML(item.profile_links)}')">SHARE</button>` : ""}
        </div>
      </div>
      <img class="imagem-cartao" src="${item.artist_photo || "imagens/pfp.png"}" alt="${escapeHTML(item.artist_name)}" />
      <h3>${escapeHTML(item.artist_name)}</h3>
      ${dataNasc ? `<p><span data-i18n="dataNascimento">Data de Nascimento</span>: ${dataNasc}</p>` : ""}
      <div class="tags-container">${tagsHTML}</div>
      ${embedHTML}
      <div class="rating-box" data-item="${idUnico}">
        <div class="estrelas-container">
          <span class="estrela" onclick="submeterRating('${idUnico}', 1)">★</span>
          <span class="estrela" onclick="submeterRating('${idUnico}', 2)">★</span>
          <span class="estrela" onclick="submeterRating('${idUnico}', 3)">★</span>
          <span class="estrela" onclick="submeterRating('${idUnico}', 4)">★</span>
          <span class="estrela" onclick="submeterRating('${idUnico}', 5)">★</span>
        </div>
        <span class="rating-info" id="info-rating-${idUnico}">0.0 ★ (0)</span>
      </div>
    </div>
  `;
}

function construirCartaoAlbum(item) {
  const idUnico = `cand_${item.id}`;

  const btnInfoHTML = `
  <button type="button" class="btn-share" 
          title="Informações de Submissão"
          onclick="abrirInfoItem(${item.id})" 
          style="border-radius: 50%; width: 22px; height: 22px; padding: 0; font-weight: bold;">
    i
  </button>
`;

  let embedHTML = "";
  if (item.album_link && item.album_link.includes("spotify.com")) {
    const match = item.album_link.match(/(artist|album)\/([a-zA-Z0-9]+)/);
    if (match) {
      const tipoItem = match[1];
      const spotifyId = match[2];
      embedHTML = `<iframe src="https://open.spotify.com/embed/${tipoItem}/${spotifyId}?utm_source=generator" width="100%" height="152" frameborder="0" allowfullscreen="" loading="lazy"></iframe>`;
    }
  }

  const anoAlbum = item.album_date
    ? new Date(item.album_date).getFullYear()
    : "";

  return `
    <div class="cartao" data-candidatura="${idUnico}">
      <div class="top-cartao">
        <div class="status-indicator"><span class="ponto-pisca"></span> REC 4K</div>
        <div class="acoes-cartao">
          ${btnInfoHTML}
          <button id="btn-like-${idUnico}" class="btn-like" onclick="darLike(this, '${idUnico}')">
            ♥ <span id="count-like-${idUnico}" class="contador">0</span>
          </button>
          ${item.album_link ? `<button class="btn-share" onclick="copiarLink('${escapeHTML(item.album_link)}')">SHARE</button>` : ""}
        </div>
      </div>
      <img class="imagem-cartao" src="${item.album_cover || "imagens/pfp.png"}" alt="${escapeHTML(item.album_title)}" />
      <h3>${escapeHTML(item.album_title)}</h3>
      <p>${escapeHTML(item.artist_name)} ${anoAlbum ? `(${anoAlbum})` : ""}</p>
      ${embedHTML}
      <div class="rating-box" data-item="${idUnico}">
        <div class="estrelas-container">
          <span class="estrela" onclick="submeterRating('${idUnico}', 1)">★</span>
          <span class="estrela" onclick="submeterRating('${idUnico}', 2)">★</span>
          <span class="estrela" onclick="submeterRating('${idUnico}', 3)">★</span>
          <span class="estrela" onclick="submeterRating('${idUnico}', 4)">★</span>
          <span class="estrela" onclick="submeterRating('${idUnico}', 5)">★</span>
        </div>
        <span class="rating-info" id="info-rating-${idUnico}">0.0 ★ (0)</span>
      </div>
    </div>
  `;
}

function renderizarGrelhasAprovadas() {
  const grelhaArtistas = document.querySelector("#musica .grelha");
  const grelhaAlbuns = document.querySelector("#albuns .grelha");
  const botoesArtistas = document.getElementById("botoes-grelha-artistas");
  const botoesAlbuns = document.getElementById("botoes-grelha-albuns");

  if (grelhaArtistas) {
    const subArtistas = todosArtistasAprovados.slice(0, limiteArtistasIndex);
    grelhaArtistas.innerHTML = subArtistas
      .map((item) => construirCartaoArtista(item))
      .join("");
  }

  if (botoesArtistas) {
    let html = "";
    if (limiteArtistasIndex < todosArtistasAprovados.length) {
      html += `
        <button type="button" class="btn-hud" data-i18n="btnVerMais" onclick="verMaisArtistasIndex()">VER MAIS</button>
        <button type="button" class="btn-hud" data-i18n="btnVerTudo" onclick="verTudoArtistasIndex()">VER TUDO</button>
      `;
    }
    if (limiteArtistasIndex > 5) {
      html += `<button type="button" class="btn-hud" data-i18n="btnVerMenos" onclick="verMenosArtistasIndex()">VER MENOS</button>`;
    }
    botoesArtistas.innerHTML = html;
  }

  if (grelhaAlbuns) {
    const subAlbuns = todosAlbunsAprovados.slice(0, limiteAlbunsIndex);
    grelhaAlbuns.innerHTML = subAlbuns
      .map((item) => construirCartaoAlbum(item))
      .join("");
  }

  if (botoesAlbuns) {
    let html = "";
    if (limiteAlbunsIndex < todosAlbunsAprovados.length) {
      html += `
        <button type="button" class="btn-hud" data-i18n="btnVerMais" onclick="verMaisAlbunsIndex()">VER MAIS</button>
        <button type="button" class="btn-hud" data-i18n="btnVerTudo" onclick="verTudoAlbunsIndex()">VER TUDO</button>
      `;
    }
    if (limiteAlbunsIndex > 5) {
      html += `<button type="button" class="btn-hud" data-i18n="btnVerMenos" onclick="verMenosAlbunsIndex()">VER MENOS</button>`;
    }
    botoesAlbuns.innerHTML = html;
  }

  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  aplicarTraducoes(idiomaAtual);

  carregarLikesBD();
  if (typeof carregarRatingsBD === "function") carregarRatingsBD();
  if (typeof atualizarStatsHUD === "function") atualizarStatsHUD();
}

function verMaisArtistasIndex() {
  limiteArtistasIndex += 5;
  renderizarGrelhasAprovadas();
}

function verTudoArtistasIndex() {
  limiteArtistasIndex = todosArtistasAprovados.length;
  renderizarGrelhasAprovadas();
}

function verMenosArtistasIndex() {
  limiteArtistasIndex = 5;
  renderizarGrelhasAprovadas();
}

function verMaisAlbunsIndex() {
  limiteAlbunsIndex += 5;
  renderizarGrelhasAprovadas();
}

function verTudoAlbunsIndex() {
  limiteAlbunsIndex = todosAlbunsAprovados.length;
  renderizarGrelhasAprovadas();
}

function verMenosAlbunsIndex() {
  limiteAlbunsIndex = 5;
  renderizarGrelhasAprovadas();
}

async function carregarConteudoAprovado() {
  try {
    const resposta = await fetch(`${API_URL}/candidaturas/aprovadas`);
    const dados = await resposta.json();

    if (!resposta.ok) return;

    todosArtistasAprovados = dados.aprovados.filter(
      (item) => item.tipo === "artista",
    );
    todosAlbunsAprovados = dados.aprovados.filter(
      (item) => item.tipo === "album",
    );
    limiteArtistasIndex = 5;
    limiteAlbunsIndex = 5;

    renderizarGrelhasAprovadas();
  } catch (err) {
    console.error("Erro ao carregar conteúdo aprovado:", err);
  }
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        tag
      ] || tag,
  );
}

function escapeJS(str) {
  if (!str) return "";
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Arranque
window.addEventListener("DOMContentLoaded", async () => {
  if (typeof verificarEstadoServidor === "function") verificarEstadoServidor();
  if (typeof atualizarRelogio === "function") atualizarRelogio();
  if (typeof verificarEstatutoAdmin === "function") verificarEstatutoAdmin();

  // Inicializar Idioma Guardado
  const idiomaSalvo = localStorage.getItem("idioma_preferido") || "pt";
  const select = document.getElementById("idioma-select");
  if (select) select.value = idiomaSalvo;
  mudarIdioma(idiomaSalvo);

  await carregarConteudoAprovado();
  if (typeof carregarQuotesAprovadasBD === "function")
    await carregarQuotesAprovadasBD();

  carregarLikesBD();
  reiniciarTemporizador();

  if (typeof carregarRatingsBD === "function") {
    carregarRatingsBD();
  }
});
