// ==========================================
// MÚSICA DE FUNDO DO SITE
// ==========================================

var ytPlayerFundo = null;
var tipoMusicaFundoAtual = null; // 'youtube' | 'upload' | null
var youtubeIdPendente = null;
var musicaFundoTipoSelecionado = "youtube";
var musicaFundoAudioBase64 = "";
var musicaFundoNomeFicheiro = "";

const CHAVE_MUTE_MUSICA = "musica_fundo_silenciada";
const LIMITE_BYTES_MUSICA = 10 * 1024 * 1024; // ~10MB

// ------------------------------------------
// PAINEL ADMIN/MOD — Definir Música de Fundo
// ------------------------------------------
function mudarTipoMusicaFundo(tipo) {
  musicaFundoTipoSelecionado = tipo;
  const campoYoutube = document.getElementById("campo-musica-youtube");
  const campoUpload = document.getElementById("campo-musica-upload");

  if (tipo === "youtube") {
    if (campoYoutube) campoYoutube.style.display = "flex";
    if (campoUpload) campoUpload.style.display = "none";
  } else {
    if (campoYoutube) campoYoutube.style.display = "none";
    if (campoUpload) campoUpload.style.display = "flex";
  }
}

function carregarFicheiroMusicaFundo(event) {
  const file = event.target.files[0];
  const spanNome = document.getElementById("nome-ficheiro-musica");

  if (!file) {
    musicaFundoAudioBase64 = "";
    musicaFundoNomeFicheiro = "";
    if (spanNome) spanNome.innerText = "";
    return;
  }

  if (file.size > LIMITE_BYTES_MUSICA) {
    mostrarToast("FICHEIRO DEMASIADO GRANDE (MÁX. ~10MB)!");
    event.target.value = "";
    musicaFundoAudioBase64 = "";
    musicaFundoNomeFicheiro = "";
    if (spanNome) spanNome.innerText = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (evt) {
    musicaFundoAudioBase64 = evt.target.result;
    musicaFundoNomeFicheiro = file.name;
    if (spanNome) spanNome.innerText = file.name;
  };
  reader.readAsDataURL(file);
}

async function guardarMusicaFundo() {
  const body = { tipo: musicaFundoTipoSelecionado };

  if (musicaFundoTipoSelecionado === "youtube") {
    const campoLink = document.getElementById("input-musica-youtube");
    const link = campoLink ? campoLink.value.trim() : "";
    if (!link) return mostrarToast("COLA UM LINK DO YOUTUBE!");
    body.youtube_url = link;
  } else {
    if (!musicaFundoAudioBase64) {
      return mostrarToast("ESCOLHE UM FICHEIRO DE ÁUDIO!");
    }
    body.audio_data = musicaFundoAudioBase64;
    body.nome_ficheiro = musicaFundoNomeFicheiro;
  }

  try {
    const resposta = await fetch(`${API_URL}/admin/musica-fundo`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenJWT}`,
      },
      body: JSON.stringify(body),
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      return mostrarToast(dados.erro || "ERRO AO GUARDAR MÚSICA DE FUNDO!");
    }

    mostrarToast(dados.mensagem || "MÚSICA DE FUNDO ATUALIZADA!");
    carregarEstadoMusicaFundoAdmin();
    carregarMusicaFundoSite();
  } catch (err) {
    console.error("Erro ao guardar música de fundo:", err);
    mostrarToast("ERRO DE LIGAÇÃO!");
  }
}

async function removerMusicaFundo() {
  const confirmou = await confirmarAcao(
    "Remover a música de fundo do site?",
    "REMOVER MÚSICA",
  );
  if (!confirmou) return;

  try {
    const resposta = await fetch(`${API_URL}/admin/musica-fundo`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenJWT}` },
    });

    const dados = await resposta.json();
    if (!resposta.ok) return mostrarToast(dados.erro || "ERRO!");

    mostrarToast(dados.mensagem || "MÚSICA DE FUNDO REMOVIDA!");
    carregarEstadoMusicaFundoAdmin();
    carregarMusicaFundoSite();
  } catch (err) {
    console.error("Erro ao remover música de fundo:", err);
    mostrarToast("ERRO DE LIGAÇÃO!");
  }
}

async function carregarEstadoMusicaFundoAdmin() {
  const el = document.getElementById("musica-fundo-estado");
  if (!el) return;

  try {
    const resposta = await fetch(`${API_URL}/musica-fundo`);
    const dados = await resposta.json();

    if (!dados.ativo) {
      el.innerText = "Nenhuma música de fundo definida.";
      return;
    }

    el.innerText =
      dados.tipo === "youtube"
        ? `Atual: vídeo do YouTube (${dados.youtube_id})`
        : `Atual: ficheiro "${dados.nome_ficheiro}"`;
  } catch (err) {
    el.innerText = "Erro ao verificar música de fundo.";
  }
}

// ------------------------------------------
// REPRODUÇÃO NO SITE (todos os visitantes)
// ------------------------------------------
async function carregarMusicaFundoSite() {
  const btn = document.getElementById("btn-musica-fundo");

  try {
    const resposta = await fetch(`${API_URL}/musica-fundo`);
    const dados = await resposta.json();

    pararMusicaFundo();

    if (!dados.ativo) {
      tipoMusicaFundoAtual = null;
      if (btn) btn.style.display = "none";
      return;
    }

    if (btn) btn.style.display = "flex";

    if (dados.tipo === "youtube" && dados.youtube_id) {
      tipoMusicaFundoAtual = "youtube";
      iniciarPlayerYoutube(dados.youtube_id);
    } else if (dados.tipo === "upload" && dados.audio_data) {
      tipoMusicaFundoAtual = "upload";
      const audio = document.getElementById("audio-player-fundo");
      if (audio) {
        audio.src = dados.audio_data;
        tentarTocarMusicaFundo();
      }
    }

    atualizarIconeMusicaFundo();
  } catch (err) {
    console.error("Erro ao carregar música de fundo:", err);
  }
}

function pararMusicaFundo() {
  const audio = document.getElementById("audio-player-fundo");
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
  }
  if (ytPlayerFundo && typeof ytPlayerFundo.stopVideo === "function") {
    ytPlayerFundo.stopVideo();
  }
}

function estaSilenciado() {
  // Por omissão começa silenciado, por causa das políticas de autoplay dos browsers.
  // O utilizador tem de clicar no botão para ativar o som.
  return localStorage.getItem(CHAVE_MUTE_MUSICA) !== "nao";
}

function tentarTocarMusicaFundo() {
  const silenciado = estaSilenciado();
  const audio = document.getElementById("audio-player-fundo");
  if (!audio) return;

  audio.muted = silenciado;
  audio.volume = 0.5;
  audio.play().catch(() => {
    // Autoplay bloqueado pelo browser — fica à espera do clique do utilizador
  });
}

function iniciarPlayerYoutube(videoId) {
  youtubeIdPendente = videoId;

  if (typeof YT === "undefined" || !YT.Player) {
    // API do YouTube ainda não carregou — onYouTubeIframeAPIReady trata disto assim que carregar
    return;
  }

  criarOuAtualizarPlayerYoutube(videoId);
}

function criarOuAtualizarPlayerYoutube(videoId) {
  const silenciado = estaSilenciado();

  if (ytPlayerFundo && typeof ytPlayerFundo.loadVideoById === "function") {
    ytPlayerFundo.loadVideoById(videoId);
    if (silenciado) ytPlayerFundo.mute();
    else ytPlayerFundo.unMute();
    return;
  }

  ytPlayerFundo = new YT.Player("youtube-player-fundo", {
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      loop: 1,
      playlist: videoId,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
    },
    events: {
      onReady: function (e) {
        if (silenciado) e.target.mute();
        e.target.playVideo();
      },
    },
  });
}

// Chamado automaticamente pelo script da API do YouTube quando esta carrega
function onYouTubeIframeAPIReady() {
  if (tipoMusicaFundoAtual === "youtube" && youtubeIdPendente) {
    criarOuAtualizarPlayerYoutube(youtubeIdPendente);
  }
}

function atualizarIconeMusicaFundo() {
  const btn = document.getElementById("btn-musica-fundo");
  if (!btn) return;
  btn.innerText = estaSilenciado() ? "🔇" : "🔊";
}

function alternarMusicaFundo() {
  const vaiTocar = estaSilenciado(); // se estava silenciado, este clique liga o som
  localStorage.setItem(CHAVE_MUTE_MUSICA, vaiTocar ? "nao" : "sim");

  const audio = document.getElementById("audio-player-fundo");

  if (tipoMusicaFundoAtual === "upload" && audio) {
    audio.muted = !vaiTocar;
    if (vaiTocar) audio.play().catch(() => {});
  } else if (tipoMusicaFundoAtual === "youtube" && ytPlayerFundo) {
    if (vaiTocar) {
      ytPlayerFundo.unMute();
      ytPlayerFundo.playVideo();
    } else {
      ytPlayerFundo.mute();
    }
  }

  atualizarIconeMusicaFundo();
}

// Arranque — carrega e tenta tocar a música de fundo para qualquer visitante
window.addEventListener("DOMContentLoaded", () => {
  carregarMusicaFundoSite();
});
