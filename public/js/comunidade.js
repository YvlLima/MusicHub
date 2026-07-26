// ==========================================
// 1. SISTEMA DE SEGUIR NO PERFIL / MODAL
// ==========================================
async function alternarSeguir(targetUsername, btnElement) {
  const token =
    tokenJWT ||
    localStorage.getItem("token_jwt") ||
    localStorage.getItem("tokenJWT") ||
    localStorage.getItem("token");

  if (!token) {
    return mostrarToast("PRECISAS DE ESTAR AUTENTICADO!");
  }

  try {
    const resposta = await fetch(`${API_URL}/follow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUsername }),
    });

    const dados = await resposta.json();
    if (!resposta.ok) return mostrarToast(dados.erro || "ERRO!");

    mostrarToast(dados.mensagem);

    if (btnElement) {
      if (dados.acao === "followed") {
        btnElement.classList.remove("btn-principal");
        btnElement.classList.add("btn-seguindo");
        btnElement.innerText = "DEIXAR DE SEGUIR";
      } else {
        btnElement.classList.remove("btn-seguindo");
        btnElement.classList.add("btn-principal");
        btnElement.innerText = "SEGUIR";
      }
    }
  } catch (err) {
    mostrarToast("ERRO DE LIGAÇÃO!");
  }
}

// ==========================================
// 2. DADOS SOCIAIS NO PERFIL PRÓPRIO
// ==========================================
async function carregarDadosSociaisPerfil() {
  if (!utilizadorDados || !utilizadorDados.username) return;

  try {
    const res = await fetch(
      `${API_URL}/users/${utilizadorDados.username}/social`,
    );
    const dados = await res.json();
    if (res.ok) {
      const elSeguidores = document.getElementById("total-seguidores");
      const elSeguindo = document.getElementById("total-seguindo");
      if (elSeguidores) elSeguidores.innerText = dados.followers;
      if (elSeguindo) elSeguindo.innerText = dados.following;
    }
  } catch (err) {
    console.error("Erro ao carregar stats sociais:", err);
  }

  try {
    const res = await fetch(`${API_URL}/my-following`, {
      headers: { Authorization: `Bearer ${tokenJWT}` },
    });
    const dados = await res.json();

    const container = document.getElementById("lista-seguindo-perfil");
    if (!container) return;

    if (res.ok && dados.following && dados.following.length > 0) {
      container.innerHTML = dados.following
        .map(
          (user) => `
        <div class="item-favorito">
          <span>${user}</span>
          <button type="button" class="btn-sm btn-perigo" onclick="alternarSeguir('${user}', this)">DEIXAR DE SEGUIR</button>
        </div>
      `,
        )
        .join("");
    } else {
      container.innerHTML =
        "<p style='opacity:0.6;'>Ainda não segues nenhum utilizador.</p>";
    }
  } catch (err) {
    console.error("Erro ao carregar lista de seguimentos:", err);
  }
}

// ==========================================
// 3. PÁGINA E PERFIS DA COMUNIDADE
// ==========================================
async function carregarPaginaComunidade() {
  const container = document.getElementById("lista-comunidade");
  if (!container) return;

  const token =
    tokenJWT ||
    localStorage.getItem("token_jwt") ||
    localStorage.getItem("tokenJWT") ||
    localStorage.getItem("token");

  if (!token) {
    container.innerHTML =
      "<p style='color: #888;'>Precisas de iniciar sessão para ver a comunidade.</p>";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dados = await res.json();

    if (!res.ok) {
      container.innerHTML = `<p style='color: #888;'>${dados.erro || "Erro ao carregar utilizadores."}</p>`;
      return;
    }

    if (!dados.utilizadores || dados.utilizadores.length === 0) {
      container.innerHTML =
        "<p style='color: #888;'>Nenhum utilizador encontrado.</p>";
      return;
    }

    container.innerHTML = dados.utilizadores
      .map((u) => {
        const numSeguidores = Number(u.followers) || 0;
        const numSeguindo = Number(u.following) || 0;

        return `
          <div class="card-membro-comunidade" onclick="abrirPerfilMembro('${u.username}')">
            <div class="membro-info">
              <img src="${u.pfp}" class="membro-pfp" />
              <div>
                <strong class="membro-nome">${u.username}</strong>
                <div class="membro-stats-mini">
                  <span><strong id="card-followers-${u.username}">${numSeguidores}</strong> seguidores</span>
                  <span>•</span>
                  <span><strong id="card-following-${u.username}">${numSeguindo}</strong> a seguir</span>
                </div>
              </div>
            </div>
            <button 
              type="button"
              class="btn-hud ${u.ja_segue ? "btn-seguindo" : "btn-principal"}" 
              onclick="event.stopPropagation(); alternarSeguirComunidade('${u.username}', this)">
              ${u.ja_segue ? "A SEGUIR" : "SEGUIR"}
            </button>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Erro na comunidade:", err);
  }
}

async function alternarSeguirComunidade(username, btn) {
  const jaSegue = btn.classList.contains("btn-seguindo");

  const elemSeguidoresCard = document.getElementById(
    `card-followers-${username}`,
  );
  let totalSeguidores = elemSeguidoresCard
    ? parseInt(elemSeguidoresCard.innerText || "0", 10)
    : 0;

  // Actualização na interface
  if (jaSegue) {
    btn.classList.remove("btn-seguindo");
    btn.classList.add("btn-principal");
    btn.innerText = "SEGUIR";
    if (elemSeguidoresCard)
      elemSeguidoresCard.innerText = Math.max(0, totalSeguidores - 1);
  } else {
    btn.classList.remove("btn-principal");
    btn.classList.add("btn-seguindo");
    btn.innerText = "A SEGUIR";
    if (elemSeguidoresCard) elemSeguidoresCard.innerText = totalSeguidores + 1;
  }

  const token =
    tokenJWT ||
    localStorage.getItem("token_jwt") ||
    localStorage.getItem("tokenJWT") ||
    localStorage.getItem("token");

  try {
    const resposta = await fetch(`${API_URL}/follow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUsername: username }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || "ERRO AO SEGUIR!");
      if (jaSegue) {
        btn.classList.remove("btn-principal");
        btn.classList.add("btn-seguindo");
        btn.innerText = "A SEGUIR";
        if (elemSeguidoresCard) elemSeguidoresCard.innerText = totalSeguidores;
      } else {
        btn.classList.remove("btn-seguindo");
        btn.classList.add("btn-principal");
        btn.innerText = "SEGUIR";
        if (elemSeguidoresCard) elemSeguidoresCard.innerText = totalSeguidores;
      }
    } else {
      mostrarToast(dados.mensagem);
    }
  } catch (err) {
    mostrarToast("ERRO DE LIGAÇÃO!");
    if (jaSegue) {
      btn.classList.remove("btn-principal");
      btn.classList.add("btn-seguindo");
      btn.innerText = "A SEGUIR";
      if (elemSeguidoresCard) elemSeguidoresCard.innerText = totalSeguidores;
    } else {
      btn.classList.remove("btn-seguindo");
      btn.classList.add("btn-principal");
      btn.innerText = "SEGUIR";
      if (elemSeguidoresCard) elemSeguidoresCard.innerText = totalSeguidores;
    }
  }
}

async function abrirPerfilMembro(username) {
  try {
    const res = await fetch(`${API_URL}/users/${username}/full-profile`);
    const dados = await res.json();
    if (!res.ok) return mostrarToast(dados.erro || "Erro ao carregar perfil.");

    document.getElementById("out-pfp").src =
      dados.user.pfp || "imagens/pfp.png";
    document.getElementById("out-username").innerText = dados.user.username;
    document.getElementById("out-seguidores").innerText = dados.stats.followers;
    document.getElementById("out-seguindo").innerText = dados.stats.following;

    const btnSeguir = document.getElementById("out-btn-seguir");
    btnSeguir.onclick = async () => {
      await alternarSeguir(username, btnSeguir);
      abrirPerfilMembro(username);
      carregarPaginaComunidade();
    };

    const artistas = dados.likes.filter((item) => item.tipo === "artista");
    const albuns = dados.likes.filter((item) => item.tipo === "album");

    document.getElementById("out-favoritos-artistas").innerHTML =
      artistas.length
        ? artistas
            .map(
              (a) => `
              <div class="item-favorito">
                <img src="${a.imagem}" alt="${a.nome}">
                <span>${a.nome}</span>
              </div>`,
            )
            .join("")
        : "<p style='font-size: 0.75rem; color: #666;'>Sem artistas favoritos.</p>";

    document.getElementById("out-favoritos-albuns").innerHTML = albuns.length
      ? albuns
          .map(
            (a) => `
            <div class="item-favorito">
              <img src="${a.imagem}" alt="${a.nome}">
              <span>${a.nome}</span>
            </div>`,
          )
          .join("")
      : "<p style='font-size: 0.75rem; color: #666;'>Sem álbuns favoritos.</p>";

    document.getElementById("modal-ver-perfil").style.display = "flex";
  } catch (err) {
    mostrarToast("Erro ao abrir perfil.");
  }
}

function fecharModalPerfil() {
  document.getElementById("modal-ver-perfil").style.display = "none";
}
