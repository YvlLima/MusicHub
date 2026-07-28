// ==========================================
// CONFIGURAÇÕES E ESTADO GLOBAL DE AUTENTICAÇÃO
// ==========================================
var API_URL = API_URL || "https://musichub-backend-bf0h.onrender.com/api";

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
let resetAguardaCodigo = false;
let resetDados = { username: "", email: "" };

function aplicarModoLogin() {
  modoAuth = "login";
  resetAguardaCodigo = false;
  resetDados = { username: "", email: "" };

  document.getElementById("titulo-auth").innerText = "ENTRAR NO HUB";
  document.getElementById("btn-submit-auth").innerText = "ENTRAR";
  document.getElementById("texto-troca-auth").innerText =
    "Ainda não tens conta?";
  document.getElementById("link-troca-auth").innerText = "Registar";

  document.getElementById("campo-registo-pfp").style.display = "none";
  document.getElementById("auth-email").style.display = "none";
  document.getElementById("container-confirm-pass").style.display = "none";
  document.getElementById("reset-codigo").style.display = "none";
  document.getElementById("link-recuperar-pass").style.display = "block";

  document.getElementById("auth-email").required = false;
  document.getElementById("auth-confirm-password").required = false;
  document.getElementById("reset-codigo").required = false;
  document.getElementById("auth-password").required = true;
  document.getElementById("auth-password").placeholder = "PALAVRA-PASSE";
  document.getElementById("auth-password").style.display = "block";
  document
    .getElementById("auth-password")
    .closest(".campo-pass").style.display = "block";

  document.getElementById("auth-username").readOnly = false;
  document.getElementById("auth-email").readOnly = false;
  document.getElementById("auth-password").readOnly = false;

  const info = document.getElementById("auth-info");
  if (info) info.remove();
}

function aplicarModoRegisto() {
  modoAuth = "register";
  resetAguardaCodigo = false;
  resetDados = { username: "", email: "" };

  document.getElementById("titulo-auth").innerText = "CRIAR CONTA";
  document.getElementById("btn-submit-auth").innerText = "REGISTAR";
  document.getElementById("texto-troca-auth").innerText = "Já tens conta?";
  document.getElementById("link-troca-auth").innerText = "Entrar";

  document.getElementById("campo-registo-pfp").style.display = "block";
  document.getElementById("auth-email").style.display = "block";
  document.getElementById("container-confirm-pass").style.display = "block";
  document.getElementById("reset-codigo").style.display = "none";
  document.getElementById("link-recuperar-pass").style.display = "none";

  document.getElementById("auth-email").required = true;
  document.getElementById("auth-confirm-password").required = true;
  document.getElementById("reset-codigo").required = false;
  document.getElementById("auth-password").required = true;
  document.getElementById("auth-password").placeholder = "PALAVRA-PASSE";
  document.getElementById("auth-password").style.display = "block";
  document
    .getElementById("auth-password")
    .closest(".campo-pass").style.display = "block";

  document.getElementById("auth-username").readOnly = false;
  document.getElementById("auth-email").readOnly = false;
  document.getElementById("auth-password").readOnly = false;

  const info = document.getElementById("auth-info");
  if (info) info.remove();
}

function aplicarModoRecuperar(mostrarCodigo = false) {
  modoAuth = "recover";
  resetAguardaCodigo = mostrarCodigo;

  document.getElementById("titulo-auth").innerText = mostrarCodigo
    ? "CONFIRMAR CÓDIGO"
    : "RECUPERAR PASSWORD";
  document.getElementById("btn-submit-auth").innerText = mostrarCodigo
    ? "CONFIRMAR"
    : "ENVIAR CÓDIGO";
  document.getElementById("texto-troca-auth").innerText = "Lembrouste-te?";
  document.getElementById("link-troca-auth").innerText = "Entrar";

  document.getElementById("campo-registo-pfp").style.display = "none";
  document.getElementById("auth-email").style.display = mostrarCodigo
    ? "none"
    : "block";
  document.getElementById("container-confirm-pass").style.display =
    mostrarCodigo ? "none" : "block";
  document.getElementById("reset-codigo").style.display = mostrarCodigo
    ? "block"
    : "none";
  document.getElementById("link-recuperar-pass").style.display = "none";

  document.getElementById("auth-email").required = !mostrarCodigo;
  document.getElementById("auth-confirm-password").required = !mostrarCodigo;
  document.getElementById("reset-codigo").required = mostrarCodigo;
  document.getElementById("auth-password").required = !mostrarCodigo;
  document.getElementById("auth-password").placeholder = mostrarCodigo
    ? "PALAVRA-PASSE"
    : "NOVA PALAVRA-PASSE";

  document.getElementById("auth-username").readOnly = mostrarCodigo;
  document.getElementById("auth-email").readOnly = mostrarCodigo;
  document.getElementById("auth-password").readOnly = mostrarCodigo;
  document.getElementById("auth-password").style.display = mostrarCodigo
    ? "none"
    : "block";
  document
    .getElementById("auth-password")
    .closest(".campo-pass").style.display = mostrarCodigo ? "none" : "block";

  let info = document.getElementById("auth-info");
  if (mostrarCodigo) {
    if (!info) {
      info = document.createElement("p");
      info.id = "auth-info";
      info.className = "auth-info";
      document
        .getElementById("form-auth")
        .insertBefore(info, document.getElementById("reset-codigo"));
    }
    info.innerText = `Enviamos um código para ${resetDados.email}. Insere-o abaixo para confirmar a nova password.`;
  } else if (info) {
    info.remove();
  }
}

// ==========================================
// CONTROLO DE INTERFACE DA AUTENTICAÇÃO
// ==========================================
function alternarModoAuth(e) {
  e.preventDefault();

  if (modoAuth === "login") {
    aplicarModoRegisto();
  } else {
    aplicarModoLogin();
  }
}

function alternarModoRecuperar(e) {
  e.preventDefault();
  aplicarModoRecuperar(false);
  document.getElementById("form-auth").reset();
}

function enviarEmailResetCodigo(destinoEmail, nomeUtilizador, codigo) {
  if (!destinoEmail || typeof emailjs === "undefined") return Promise.resolve();
  return emailjs.send("service_wwb9l28", "template_b05m25i", {
    to_name: nomeUtilizador,
    email: destinoEmail,
    codigo,
    message: `O teu código de recuperação de password é: ${codigo}. Válido por 15 minutos.`,
  });
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

  if (modoAuth === "recover") {
    if (resetAguardaCodigo) return confirmarCodigoRecuperacao();
    return pedirCodigoRecuperacao();
  }

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

async function pedirCodigoRecuperacao() {
  const username = document.getElementById("auth-username").value.trim();
  const email = document.getElementById("auth-email").value.trim();
  const newPassword = document.getElementById("auth-password").value.trim();
  const confirmPassword = document
    .getElementById("auth-confirm-password")
    .value.trim();

  if (!username || !email || !newPassword || !confirmPassword) {
    return mostrarToast("PREENCHE TODOS OS CAMPOS!");
  }

  if (newPassword !== confirmPassword) {
    return mostrarToast("AS PASSWORDS NÃO COINCIDEM!");
  }

  if (!validarRequisitosPassword(newPassword)) {
    return mostrarToast(
      "PASS FRACA! MIN 8 CHARS, 1 MAIÚS, 1 MINÚS, 1 NUM, 1 ESP.",
    );
  }

  try {
    const resposta = await fetch(`${API_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, newPassword }),
    });

    const dados = await resposta.json();
    if (!resposta.ok) return mostrarToast(dados.erro || "ERRO!");

    if (!dados.emailEnviado && dados.codigo) {
      try {
        await enviarEmailResetCodigo(dados.email, dados.username, dados.codigo);
      } catch (err) {
        console.error("Erro ao enviar email de reset:", err);
      }
    }

    resetDados = { username: dados.username, email: dados.email };
    document.getElementById("auth-username").value = dados.username;
    document.getElementById("auth-email").value = dados.email;
    document.getElementById("reset-codigo").value = "";
    aplicarModoRecuperar(true);
    mostrarToast(dados.mensagem || "CÓDIGO ENVIADO PARA O TEU E-MAIL!");
  } catch (err) {
    mostrarToast("SERVIDOR OFFLINE OU BLOQUEADO!");
  }
}

async function confirmarCodigoRecuperacao() {
  const code = document.getElementById("reset-codigo").value.trim();

  if (!/^\d{6}$/.test(code)) {
    return mostrarToast("INSERE UM CÓDIGO VÁLIDO DE 6 DÍGITOS!");
  }

  try {
    const resposta = await fetch(`${API_URL}/verify-reset-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: resetDados.username,
        email: resetDados.email,
        code,
      }),
    });

    const dados = await resposta.json();
    if (!resposta.ok) return mostrarToast(dados.erro || "ERRO!");

    mostrarToast(dados.mensagem || "PASSWORD ALTERADA COM SUCESSO!");
    document.getElementById("form-auth").reset();
    aplicarModoLogin();
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

let todosArtistasFavoritosPerfil = [];
let todosAlbunsFavoritosPerfil = [];
let limiteArtistasFavoritosPerfil = 5;
let limiteAlbunsFavoritosPerfil = 5;

function construirItemFavorito(item) {
  const eAlbum = item.tipo === "album";
  const titulo = eAlbum ? item.album_title : item.artist_name;
  const img = eAlbum
    ? item.album_cover || "imagens/pfp.png"
    : item.artist_photo || "imagens/pfp.png";

  const itemDiv = document.createElement("div");
  itemDiv.className = "item-favorito";
  itemDiv.innerHTML = `
    <img src="${img}" alt="${escapeHTML(titulo)}">
    <span>${escapeHTML(titulo)}</span>
  `;
  return itemDiv;
}

function renderizarFavoritosPerfil() {
  const containerArtistas = document.getElementById("lista-favoritos-artistas");
  const containerAlbuns = document.getElementById("lista-favoritos-albuns");
  const botoesArtistas = document.getElementById("botoes-favoritos-artistas");
  const botoesAlbuns = document.getElementById("botoes-favoritos-albuns");

  if (containerArtistas) {
    containerArtistas.innerHTML = "";
    if (todosArtistasFavoritosPerfil.length > 0) {
      todosArtistasFavoritosPerfil
        .slice(0, limiteArtistasFavoritosPerfil)
        .forEach((item) => {
          containerArtistas.appendChild(construirItemFavorito(item));
        });
    } else {
      containerArtistas.innerHTML =
        "<p style='color: #666; font-size: 0.8rem;'>Nenhum artista favorito.</p>";
    }
  }

  if (botoesArtistas) {
    let html = "";
    if (limiteArtistasFavoritosPerfil < todosArtistasFavoritosPerfil.length) {
      html += `
        <button type="button" class="btn-hud" onclick="verMaisArtistasFavoritosPerfil()">VER MAIS</button>
        <button type="button" class="btn-hud" onclick="verTudoArtistasFavoritosPerfil()">VER TUDO</button>
      `;
    }
    if (limiteArtistasFavoritosPerfil > 5) {
      html += `<button type="button" class="btn-hud" onclick="verMenosArtistasFavoritosPerfil()">VER MENOS</button>`;
    }
    botoesArtistas.innerHTML = html;
  }

  if (containerAlbuns) {
    containerAlbuns.innerHTML = "";
    if (todosAlbunsFavoritosPerfil.length > 0) {
      todosAlbunsFavoritosPerfil
        .slice(0, limiteAlbunsFavoritosPerfil)
        .forEach((item) => {
          containerAlbuns.appendChild(construirItemFavorito(item));
        });
    } else {
      containerAlbuns.innerHTML =
        "<p style='color: #666; font-size: 0.8rem;'>Nenhum álbum favorito.</p>";
    }
  }

  if (botoesAlbuns) {
    let html = "";
    if (limiteAlbunsFavoritosPerfil < todosAlbunsFavoritosPerfil.length) {
      html += `
        <button type="button" class="btn-hud" onclick="verMaisAlbunsFavoritosPerfil()">VER MAIS</button>
        <button type="button" class="btn-hud" onclick="verTudoAlbunsFavoritosPerfil()">VER TUDO</button>
      `;
    }
    if (limiteAlbunsFavoritosPerfil > 5) {
      html += `<button type="button" class="btn-hud" onclick="verMenosAlbunsFavoritosPerfil()">VER MENOS</button>`;
    }
    botoesAlbuns.innerHTML = html;
  }
}

function verMaisArtistasFavoritosPerfil() {
  limiteArtistasFavoritosPerfil += 5;
  renderizarFavoritosPerfil();
}

function verTudoArtistasFavoritosPerfil() {
  limiteArtistasFavoritosPerfil = todosArtistasFavoritosPerfil.length;
  renderizarFavoritosPerfil();
}

function verMenosArtistasFavoritosPerfil() {
  limiteArtistasFavoritosPerfil = 5;
  renderizarFavoritosPerfil();
}

function verMaisAlbunsFavoritosPerfil() {
  limiteAlbunsFavoritosPerfil += 5;
  renderizarFavoritosPerfil();
}

function verTudoAlbunsFavoritosPerfil() {
  limiteAlbunsFavoritosPerfil = todosAlbunsFavoritosPerfil.length;
  renderizarFavoritosPerfil();
}

function verMenosAlbunsFavoritosPerfil() {
  limiteAlbunsFavoritosPerfil = 5;
  renderizarFavoritosPerfil();
}

async function carregarFavoritosPerfil() {
  const containerArtistas = document.getElementById("lista-favoritos-artistas");
  const containerAlbuns = document.getElementById("lista-favoritos-albuns");

  if (!containerArtistas || !containerAlbuns || !utilizadorDados) return;

  try {
    // 1. Pedir a lista de IDs aos quais o utilizador deu like
    const resLikes = await fetch(
      `${API_URL}/likes?username=${encodeURIComponent(utilizadorDados.username)}`,
    );
    const dadosLikes = await resLikes.json();
    if (!resLikes.ok || !dadosLikes.deuLike) return;

    // 2. Pedir a lista completa de conteúdos aprovados para saber quem é artista e quem é álbum
    const resAprovados = await fetch(`${API_URL}/candidaturas/aprovadas`);
    const dadosAprovados = await resAprovados.json();

    todosArtistasFavoritosPerfil = [];
    todosAlbunsFavoritosPerfil = [];
    limiteArtistasFavoritosPerfil = 5;
    limiteAlbunsFavoritosPerfil = 5;

    if (resAprovados.ok && dadosAprovados.aprovados) {
      dadosLikes.deuLike.forEach((itemId) => {
        // Extrai o ID numérico removendo o prefixo "cand_" se existir
        const idNumerico = itemId.replace("cand_", "");

        // Procura o item na lista da base de dados
        const itemInfo = dadosAprovados.aprovados.find(
          (cand) => String(cand.id) === String(idNumerico),
        );

        if (itemInfo) {
          if (itemInfo.tipo === "album") {
            todosAlbunsFavoritosPerfil.push(itemInfo);
          } else {
            todosArtistasFavoritosPerfil.push(itemInfo);
          }
        }
      });
    }

    renderizarFavoritosPerfil();
  } catch (err) {
    console.error("Erro ao carregar favoritos no perfil:", err);
  }
}
