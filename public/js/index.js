const API_URL = "http://localhost:3000/api";

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
// 2. CONTEÚDO, LIKES E PESQUISA
// ==========================================
function atualizarStatsHUD() {
  const totalArtistas = document.querySelectorAll("#musica .cartao").length;
  const totalAlbuns = document.querySelectorAll("#albuns .cartao").length;

  const elArt = document.getElementById("stat-artistas");
  const elAlb = document.getElementById("stat-albuns");

  if (elArt) elArt.innerText = totalArtistas;
  if (elAlb) elAlb.innerText = totalAlbuns;

  atualizarTopArtistaSuave();
}

function atualizarTopArtistaSuave() {
  const artistas = [
    { nome: "Lon3r Johny", id: "lon3r" },
    { nome: "Playboi Carti", id: "carti" },
    { nome: "Ken Carson", id: "ken" },
  ];

  let topArtista = "—";
  let maxLikes = 0;

  artistas.forEach((art) => {
    const btn = document.querySelector(`button[onclick*='${art.id}']`);
    if (btn) {
      const likesLocais = parseInt(
        btn.querySelector(".contador").innerText || "0",
      );
      if (likesLocais > maxLikes) {
        maxLikes = likesLocais;
        topArtista = art.nome;
      }
    }
  });

  const elemTop = document.getElementById("stat-top-artista");
  if (elemTop) elemTop.innerText = maxLikes > 0 ? topArtista : "—";
}

function filtrarCartoes() {
  let termo = document.getElementById("campo-pesquisa").value.toLowerCase();
  let cartoes = document.querySelectorAll(".cartao");

  cartoes.forEach((cartao) => {
    let texto = cartao.innerText.toLowerCase();
    cartao.style.display = texto.includes(termo) ? "block" : "none";
  });
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

  if (quotesUsadas.length === quotes.length) quotesUsadas = [];

  let disponiveis = quotes.filter(
    (q, index) => !quotesUsadas.includes(index) && q.artista !== ultimoArtista,
  );
  if (disponiveis.length === 0)
    disponiveis = quotes.filter((q, index) => !quotesUsadas.includes(index));

  const indiceSorteado = Math.floor(Math.random() * disponiveis.length);
  const quoteEscolhida = disponiveis[indiceSorteado];

  quotesUsadas.push(quotes.findIndex((q) => q === quoteEscolhida));
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

// ==========================================
// FUNÇÃO PARA CARREGAR E PINTAR OS LIKES (F5)
// ==========================================
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

    // 1. Limpar estados visuais anteriores
    document.querySelectorAll(".btn-like").forEach((btn) => {
      btn.classList.remove("liked");
      const contador =
        btn.querySelector(".contador") ||
        document.getElementById(
          `count-like-${btn.id.replace("btn-like-", "")}`,
        );
      if (contador) contador.innerText = "0";
    });

    // 2. Atualizar os números totais de likes
    if (dados.contagem) {
      for (const [itemId, total] of Object.entries(dados.contagem)) {
        const contador =
          document.getElementById(`count-like-${itemId}`) ||
          document.querySelector(`button[onclick*='${itemId}'] .contador`);
        if (contador) {
          contador.innerText = total;
        }
      }
    }

    // 3. Ativar a cor vermelha (.liked) para os itens que este utilizador gostou
    if (dados.deuLike && Array.isArray(dados.deuLike)) {
      dados.deuLike.forEach((itemId) => {
        const btn =
          document.getElementById(`btn-like-${itemId}`) ||
          document.querySelector(`button[onclick*='${itemId}']`);
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

// Modal de Confirmação Generico
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
// 3. PAINEL DE ADMINISTRAÇÃO
// ==========================================
function verificarEstatutoAdmin() {
  const seccaoAdmin = document.getElementById("seccao-admin");
  const btnAdminCandidaturas = document.getElementById(
    "btn-admin-candidaturas",
  );

  if (utilizadorDados && utilizadorDados.is_admin > 0) {
    if (seccaoAdmin) seccaoAdmin.style.display = "block";
    if (btnAdminCandidaturas)
      btnAdminCandidaturas.style.display = "inline-block";
    carregarUtilizadoresAdmin();
  } else {
    if (seccaoAdmin) seccaoAdmin.style.display = "none";
    if (btnAdminCandidaturas) btnAdminCandidaturas.style.display = "none";
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

      let promoverBtnHTML = `—`;
      if (!eAdmin && !eProprioUser) {
        if (eMod) {
          promoverBtnHTML = `<button type="button" class="btn-despromover" onclick="despromoverUtilizador('${user.username}')">👇 DESPROMOVER</button>`;
        } else {
          promoverBtnHTML = `<button type="button" class="btn-promover" onclick="promoverMod('${user.username}')">👆 PROMOVER</button>`;
        }
      }

      const eliminarBtnHTML =
        eAdmin || eProprioUser
          ? `—`
          : `<button type="button" class="btn-eliminar" onclick="eliminarUtilizador(${user.id}, '${user.username}')">❌ APAGAR</button>`;

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

    document.getElementById("stat-total-users").innerText =
      dados.stats.totalUsers;
    document.getElementById("stat-total-mods").innerText =
      dados.stats.totalMods;
    document.getElementById("stat-total-likes").innerText =
      dados.stats.totalLikes;

    const tbodyLogs = document.getElementById("lista-logs-body");
    if (tbodyLogs) {
      tbodyLogs.innerHTML = "";
      dados.logs.forEach((log) => {
        const tr = document.createElement("tr");
        const dataFormatada = new Date(log.data).toLocaleString("pt-PT");
        tr.innerHTML = `
          <td>${dataFormatada}</td>
          <td>${log.autor}</td>
          <td><span style="color: #ff0033;">${log.acao}</span></td>
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
// 4. FILTROS, TAGS E RATINGS
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

const generosArtistas = {
  lon3r: ["Trap", " Rage Rap ", "Hip Hop Tuga"],
  carti: ["Trap", " Rage ", "Cloud Rap"],
  ken: ["Rage", " Trap ", "Hip Hop"],
};

function carregarTagsArtistas() {
  const cartoes = document.querySelectorAll(".cartao[data-artista]");

  cartoes.forEach((cartao) => {
    const idArtista = cartao.getAttribute("data-artista");
    const generos = generosArtistas[idArtista];
    const container = cartao.querySelector(".tags-container");

    if (container && generos) {
      container.innerHTML = generos
        .map((genero, index) => {
          const classeCor = index % 2 === 1 ? "tag alt" : "tag";
          return `<span class="${classeCor}">${genero}</span>`;
        })
        .join("");
    }
  });
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
// SISTEMA DE CANDIDATURAS DE ARTISTAS/ÁLBUNS
// ==========================================
// Variáveis globais para armazenar imagens em base64
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

  if (!utilizadorDados || !tokenJWT) {
    mostrarToast("AUTENTICA-TE PRIMEIRO!");
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

    if (!artist_name) {
      mostrarToast("PREENCHE O NOME DO ARTISTA!");
      return;
    }

    if (!artist_photo) {
      mostrarToast("CARREGA UMA FOTO DO ARTISTA!");
      return;
    }

    if (!artist_profile) {
      mostrarToast(
        "PREENCHE O PERFIL DO ARTISTA (SPOTIFY/SOUNDCLOUD/APPLE MUSIC)!",
      );
      return;
    }

    payload = {
      tipo: "artista",
      artist_name,
      artist_photo,
      artist_profile,
      artist_birthdate,
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

    if (!album_title) {
      mostrarToast("PREENCHE O NOME DO ÁLBUM!");
      return;
    }

    if (!album_artist) {
      mostrarToast("PREENCHE O NOME DO ARTISTA/BANDA!");
      return;
    }

    if (!album_cover) {
      mostrarToast("CARREGA UMA CAPA PARA O ÁLBUM!");
      return;
    }

    if (!album_date) {
      mostrarToast("PREENCHE A DATA DO ÁLBUM!");
      return;
    }

    if (!album_link) {
      mostrarToast(
        "PREENCHE O LINK DO ÁLBUM (SPOTIFY/SOUNDCLOUD/APPLE MUSIC)!",
      );
      return;
    }

    payload = {
      tipo: "album",
      album_title,
      artist_name: album_artist,
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

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO SUBMETER CANDIDATURA!");
      return;
    }

    mostrarToast("✓ CANDIDATURA SUBMETIDA COM SUCESSO! À ESPERA DE APROVAÇÃO.");
    fecharModalCandidatura();
  } catch (err) {
    console.error("Erro:", err);
    mostrarToast("ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

function abrirPainelModeracaoCandidaturas() {
  window.location.href = "admin-submissions.html";
}

// ARRANQUE DA PÁGINA
window.addEventListener("DOMContentLoaded", () => {
  if (typeof verificarEstadoServidor === "function") verificarEstadoServidor();
  if (typeof carregarTagsArtistas === "function") carregarTagsArtistas();
  if (typeof atualizarRelogio === "function") atualizarRelogio();
  if (typeof verificarEstatutoAdmin === "function") verificarEstatutoAdmin();

  carregarLikesBD();
  verificarEstatutoAdmin();
  reiniciarTemporizador();

  if (typeof carregarRatingsBD === "function") {
    carregarRatingsBD();
  }
});

// Easter Egg (Opium) - Protegido contra undefined
let sequencia = "";
const codigo = "opium";

document.addEventListener("keydown", (e) => {
  if (!e || !e.key) return;

  sequencia += e.key.toLowerCase();

  if (sequencia.length > codigo.length) {
    sequencia = sequencia.slice(-codigo.length);
  }

  if (sequencia === codigo) {
    mostrarToast("MODO OPIUM ATIVADO");
    document.body.classList.toggle("modo-matrix");
  }
});
