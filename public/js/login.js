// ==========================================
// CONFIGURAÇÕES E ESTADO GLOBAL DE AUTENTICAÇÃO
// ==========================================
const API_URL = "https://musichub-backend-bf0h.onrender.com/api";

let registoPfpBase64 = "";
let novaPfpBase64 = "";
let utilizadorDados =
  JSON.parse(localStorage.getItem("utilizador_ativo")) || null;
let tokenJWT =
  localStorage.getItem("token_jwt") ||
  localStorage.getItem("tokenJWT") ||
  localStorage.getItem("token") ||
  "";
let modoAuth = "login";

// ==========================================
// CONTROLO DE INTERFACE DA AUTENTICAÇÃO
// ==========================================
function alternarModoAuth(e) {
  e.preventDefault();
  const titulo = document.getElementById("titulo-auth");
  const btn = document.getElementById("btn-submit-auth");
  const texto = document.getElementById("texto-troca-auth");
  const link = document.getElementById("link-troca-auth");

  const campoPfp = document.getElementById("campo-registo-pfp");
  const campoEmail = document.getElementById("auth-email");
  const campoConfirmPass = document.getElementById("container-confirm-pass");

  if (modoAuth === "login") {
    modoAuth = "register";
    titulo.innerText = "CRIAR CONTA";
    btn.innerText = "REGISTAR";
    texto.innerText = "Já tens conta?";
    link.innerText = "Entrar";

    campoPfp.style.display = "block";
    campoEmail.style.display = "block";
    campoConfirmPass.style.display = "block";
    campoEmail.required = true;
    document.getElementById("auth-confirm-password").required = true;
  } else {
    modoAuth = "login";
    titulo.innerText = "ENTRAR NO HUB";
    btn.innerText = "ENTRAR";
    texto.innerText = "Ainda não tens conta?";
    link.innerText = "Registar";

    campoPfp.style.display = "none";
    campoEmail.style.display = "none";
    campoConfirmPass.style.display = "none";
    campoEmail.required = false;
    document.getElementById("auth-confirm-password").required = false;
  }
}

function carregarPFPRegisto(e) {
  const file = e.target.files[0];
  if (!file) {
    registoPfpBase64 = "";
    document.getElementById("preview-registo-pfp").src = "imagens/pfp.png";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    registoPfpBase64 = event.target.result;
    document.getElementById("preview-registo-pfp").src = registoPfpBase64;
  };
  reader.readAsDataURL(file);
}

// ==========================================
// PROCESSAMENTO DE LOGIN / REGISTO
// ==========================================
async function processarAuth(e) {
  e.preventDefault();
  const user = document.getElementById("auth-username").value.trim();
  const pass = document.getElementById("auth-password").value.trim();

  const isRegister = modoAuth === "register";
  const endpoint = isRegister ? "/register" : "/login";

  const emailInput = isRegister
    ? document.getElementById("auth-email").value.trim()
    : "";

  const payload = isRegister
    ? {
        username: user,
        email: emailInput,
        password: pass,
        pfp: registoPfpBase64 || "imagens/pfp.png",
      }
    : { username: user, password: pass };

  if (isRegister && !validarRequisitosPassword(pass)) {
    mostrarToast("PASS FRACA! MIN 8 CHARS, 1 MAIÚS, 1 MINÚS, 1 NUM, 1 ESP.");
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const dados = await resposta.json();

    if (!resposta.ok) return mostrarToast(dados.erro || "ERRO!");

    tokenJWT = dados.token;
    utilizadorDados = dados.user || { username: user, email: emailInput };
    localStorage.setItem("token_jwt", tokenJWT);
    localStorage.setItem("utilizador_ativo", JSON.stringify(utilizadorDados));

    if (isRegister && emailInput) {
      enviarEmailFeedback(emailInput, user);
    }

    iniciarHub();
  } catch (err) {
    mostrarToast("SERVIDOR OFFLINE OU BLOQUEADO!");
  }
}

function iniciarHub() {
  window.location.href = "index.html";
}

function terminarSessao() {
  localStorage.removeItem("utilizador_ativo");
  localStorage.removeItem("token_jwt");
  tokenJWT = "";
  utilizadorDados = null;
  window.location.href = "login.html";
}

// ==========================================
// GESTÃO DO PERFIL DO UTILIZADOR
// ==========================================
function carregarPFP(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    novaPfpBase64 = event.target.result;
    document.getElementById("pfp-preview").src = novaPfpBase64;
  };
  reader.readAsDataURL(file);
}

function abrirPerfil() {
  if (!utilizadorDados) return;

  document.getElementById("perfil-username").value = utilizadorDados.username;
  document.getElementById("perfil-email").value = utilizadorDados.email || "";
  document.getElementById("pfp-preview").src =
    utilizadorDados.pfp || "imagens/pfp.png";

  document.getElementById("seccao-perfil").style.display = "block";
  document
    .getElementById("seccao-perfil")
    .scrollIntoView({ behavior: "smooth" });

  carregarFavoritosPerfil();
  carregarDadosSociaisPerfil();
}

function fecharPerfil() {
  document.getElementById("seccao-perfil").style.display = "none";
}

async function guardarPerfil(e) {
  e.preventDefault();
  if (!utilizadorDados || !tokenJWT) {
    mostrarToast("AUTENTICA-TE PRIMEIRO!");
    return;
  }

  const novoUsername = document.getElementById("perfil-username").value.trim();
  const email = document.getElementById("perfil-email").value.trim();
  const novaPass = document.getElementById("perfil-password").value.trim();
  const fotoAtual = novaPfpBase64 || utilizadorDados.pfp || "imagens/pfp.png";

  if (!novoUsername) {
    mostrarToast("O NOME DE UTILIZADOR É OBRIGATÓRIO!");
    return;
  }

  if (novaPass && !validarRequisitosPassword(novaPass)) {
    mostrarToast("PASS FRACA! MIN 8 CHARS, 1 MAIÚS, 1 MINÚS, 1 NUM, 1 ESP.");
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/update-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenJWT}`,
      },
      body: JSON.stringify({
        currentUsername: utilizadorDados.username,
        newUsername: novoUsername,
        email: email,
        newPassword: novaPass || null,
        pfp: fotoAtual,
      }),
    });

    const dados = await resposta.json();
    if (!resposta.ok) return mostrarToast(dados.erro || "ERRO AO GUARDAR!");

    if (dados.token) {
      tokenJWT = dados.token;
      localStorage.setItem("token_jwt", tokenJWT);
    }

    utilizadorDados.username = novoUsername;
    utilizadorDados.email = email;
    utilizadorDados.pfp = fotoAtual;
    localStorage.setItem("utilizador_ativo", JSON.stringify(utilizadorDados));

    mostrarToast("PERFIL ATUALIZADO COM SUCESSO!");
    document.getElementById("perfil-password").value = "";
    novaPfpBase64 = "";
    fecharPerfil();
    carregarLikesBD();
  } catch (err) {
    mostrarToast("ERRO DE AUTENTICAÇÃO OU SERVIDOR OFFLINE!");
  }
}

async function eliminarPropriaConta() {
  if (!utilizadorDados || !tokenJWT) return;

  const confirmou = await confirmarAcao(
    "Tens a certeza que queres eliminar a tua conta? Esta ação é irreversível.",
    "ELIMINAR MINHA CONTA",
  );

  if (!confirmou) return;

  try {
    const resposta = await fetch(`${API_URL}/delete-profile`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenJWT}`,
      },
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO ELIMINAR CONTA!");
      return;
    }

    mostrarToast("CONTA ELIMINADA COM SUCESSO!");
    fecharPerfil();
    terminarSessao();
    carregarLikesBD();
  } catch (err) {
    mostrarToast("ERRO DE LIGAÇÃO AO SERVIDOR!");
  }
}

async function carregarFavoritosPerfil() {
  const containerArtistas = document.getElementById("lista-favoritos-artistas");
  const containerAlbuns = document.getElementById("lista-favoritos-albuns");

  if (!containerArtistas || !containerAlbuns || !utilizadorDados) return;

  try {
    const resposta = await fetch(
      `${API_URL}/likes?username=${utilizadorDados.username}`,
    );
    const dados = await resposta.json();
    if (!resposta.ok) return;

    containerArtistas.innerHTML = "";
    containerAlbuns.innerHTML = "";

    let temArtistas = false;
    let temAlbuns = false;

    dados.deuLike.forEach((itemId) => {
      const btnOriginal = document.querySelector(
        `button[onclick*='${itemId}']`,
      );
      if (btnOriginal) {
        const cartaoOriginal = btnOriginal.closest(".cartao");
        if (cartaoOriginal) {
          const titulo = cartaoOriginal.querySelector("h3").innerText;
          const img = cartaoOriginal.querySelector("img").src;

          const itemDiv = document.createElement("div");
          itemDiv.className = "item-favorito";
          itemDiv.innerHTML = `
            <img src="${img}" alt="${titulo}">
            <span>${titulo}</span>
          `;

          if (itemId.startsWith("album_")) {
            containerAlbuns.appendChild(itemDiv);
            temAlbuns = true;
          } else {
            containerArtistas.appendChild(itemDiv);
            temArtistas = true;
          }
        }
      }
    });

    if (!temArtistas) {
      containerArtistas.innerHTML =
        "<p style='color: #666; font-size: 0.8rem;'>Nenhum artista favorito.</p>";
    }
    if (!temAlbuns) {
      containerAlbuns.innerHTML =
        "<p style='color: #666; font-size: 0.8rem;'>Nenhum álbum favorito.</p>";
    }
  } catch (err) {
    console.error("Erro ao carregar favoritos:", err);
  }
}
