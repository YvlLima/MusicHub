// ==========================================
// MÚSICA DE FUNDO DO SITE
// ==========================================

var ytPlayerFundo = null;
var tipoMusicaFundoAtual = null; // 'youtube' | 'upload' | null
var youtubeIdPendente = null;
var musicaFundoTipoSelecionado = "youtube";
var musicaFundoAudioBase64 = "";
var musicaFundoNomeFicheiro = "";
var playlistMusicas = []; // Lista para skip/unskip se houver várias
var indiceMusicaAtual = 0;

const CHAVE_MUTE_MUSICA = "musica_fundo_silenciada";
const CHAVE_VOLUME_MUSICA = "musica_fundo_volume";
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

    // Suporte para playlist ou item único
    if (dados.playlist && Array.isArray(dados.playlist)) {
      playlistMusicas = dados.playlist;
    } else if (dados.tipo === "youtube" && dados.youtube_id) {
      playlistMusicas = [{ tipo: "youtube", id: dados.youtube_id }];
    } else if (dados.tipo === "upload" && dados.audio_data) {
      playlistMusicas = [
        { tipo: "upload", src: dados.audio_data, nome: dados.nome_ficheiro },
      ];
    }

    indiceMusicaAtual = 0;
    tocarMusicaAtual();
    atualizarIconeMusicaFundo();
  } catch (err) {
    console.error("Erro ao carregar música de fundo:", err);
  }
}

function tocarMusicaAtual() {
  if (playlistMusicas.length === 0) return;
  const musica = playlistMusicas[indiceMusicaAtual];

  pararMusicaFundo();

  if (musica.tipo === "youtube") {
    tipoMusicaFundoAtual = "youtube";
    iniciarPlayerYoutube(musica.id || musica.youtube_id);
  } else if (musica.tipo === "upload") {
    tipoMusicaFundoAtual = "upload";
    const audio = document.getElementById("audio-player-fundo");
    if (audio) {
      audio.src = musica.src || musica.audio_data;
      tentarTocarMusicaFundo();
    }
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

// --- CONTROLOS: PLAY, PAUSE, SKIP, UNSKIP, VOLUME ---

function playMusicaFundo() {
  const audio = document.getElementById("audio-player-fundo");
  const volume = obterVolumeGuardado();

  if (tipoMusicaFundoAtual === "upload" && audio) {
    audio.volume = volume;
    audio.play().catch(() => {});
  } else if (tipoMusicaFundoAtual === "youtube" && ytPlayerFundo) {
    if (typeof ytPlayerFundo.unMute === "function") ytPlayerFundo.unMute();
    if (typeof ytPlayerFundo.setVolume === "function")
      ytPlayerFundo.setVolume(volume * 100);
    if (typeof ytPlayerFundo.playVideo === "function")
      ytPlayerFundo.playVideo();
  }
  localStorage.setItem(CHAVE_MUTE_MUSICA, "nao");
  atualizarIconeMusicaFundo();
}

function pauseMusicaFundo() {
  const audio = document.getElementById("audio-player-fundo");

  if (tipoMusicaFundoAtual === "upload" && audio) {
    audio.pause();
  } else if (tipoMusicaFundoAtual === "youtube" && ytPlayerFundo) {
    if (typeof ytPlayerFundo.pauseVideo === "function")
      ytPlayerFundo.pauseVideo();
  }
  localStorage.setItem(CHAVE_MUTE_MUSICA, "sim");
  atualizarIconeMusicaFundo();
}

function skipMusicaFundo() {
  if (playlistMusicas.length <= 1) return;
  indiceMusicaAtual = (indiceMusicaAtual + 1) % playlistMusicas.length;
  tocarMusicaAtual();
}

function unskipMusicaFundo() {
  if (playlistMusicas.length <= 1) return;
  indiceMusicaAtual =
    (indiceMusicaAtual - 1 + playlistMusicas.length) % playlistMusicas.length;
  tocarMusicaAtual();
}

function definirVolumeMusicaFundo(valor) {
  // valor entre 0.0 e 1.0
  localStorage.setItem(CHAVE_VOLUME_MUSICA, valor);
  const audio = document.getElementById("audio-player-fundo");

  if (audio) {
    audio.volume = valor;
  }
  if (ytPlayerFundo && typeof ytPlayerFundo.setVolume === "function") {
    ytPlayerFundo.setVolume(valor * 100);
  }
}

function obterVolumeGuardado() {
  const vol = localStorage.getItem(CHAVE_VOLUME_MUSICA);
  return vol !== null ? parseFloat(vol) : 0.5;
}

function estaSilenciado() {
  return localStorage.getItem(CHAVE_MUTE_MUSICA) !== "nao";
}

function tentarTocarMusicaFundo() {
  const silenciado = estaSilenciado();
  const audio = document.getElementById("audio-player-fundo");
  if (!audio) return;

  audio.muted = silenciado;
  audio.volume = obterVolumeGuardado();
  if (!silenciado) {
    audio.play().catch(() => {});
  }
}

function iniciarPlayerYoutube(videoId) {
  youtubeIdPendente = videoId;

  if (typeof YT === "undefined" || !YT.Player) {
    return;
  }

  criarOuAtualizarPlayerYoutube(videoId);
}

function criarOuAtualizarPlayerYoutube(videoId) {
  const silenciado = estaSilenciado();
  const volume = obterVolumeGuardado() * 100;

  if (ytPlayerFundo && typeof ytPlayerFundo.loadVideoById === "function") {
    ytPlayerFundo.loadVideoById(videoId);
    if (silenciado) {
      ytPlayerFundo.mute();
    } else {
      ytPlayerFundo.unMute();
      ytPlayerFundo.setVolume(volume);
      ytPlayerFundo.playVideo();
    }
    return;
  }

  ytPlayerFundo = new YT.Player("youtube-player-fundo", {
    videoId: videoId,
    playerVars: {
      autoplay: silenciado ? 0 : 1,
      loop: 1,
      playlist: videoId,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
    },
    events: {
      onReady: function (e) {
        e.target.setVolume(volume);
        if (silenciado) {
          e.target.mute();
        } else {
          e.target.unMute();
          e.target.playVideo();
        }
      },
    },
  });
}

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
  if (estaSilenciado()) {
    playMusicaFundo();
  } else {
    pauseMusicaFundo();
  }
}

// Arranque
window.addEventListener("DOMContentLoaded", () => {
  carregarMusicaFundoSite();
});
