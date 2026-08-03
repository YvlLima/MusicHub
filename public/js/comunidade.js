// ==========================================
// 0. CATÁLOGO GLOBAL DE MÍDIA E AUXILIAR
// ==========================================
const catalogoMidia = {
  lon3r: { nome: "Lon3r Johny", imagem: "imagens/pfp.png" },
  carti: { nome: "Playboi Carti", imagem: "imagens/pfp.png" },
  ken: { nome: "Ken Carson", imagem: "imagens/pfp.png" },
  zara_g: { nome: "Zara G", imagem: "imagens/pfp.png" },
  album_94: { nome: "94", imagem: "imagens/pfp.png" },
  album_wlr: { nome: "Whole Lotta Red", imagem: "imagens/pfp.png" },
  album_agc: { nome: "A Great Chaos (Deluxe)", imagem: "imagens/pfp.png" },
};

let cacheItensAprovados = {};

async function carregarCatalogoAprovados() {
  try {
    const res = await fetch(`${API_URL}/candidaturas/aprovadas`);
    const dados = await res.json();
    if (res.ok && dados.aprovados) {
      dados.aprovados.forEach((item) => {
        const idUnico = `cand_${item.id}`;
        const ehAlbum = Boolean(item.album_title);
        cacheItensAprovados[idUnico] = {
          nome: ehAlbum ? item.album_title : item.artist_name || "Item",
          imagem: item.album_cover || item.artist_photo || "imagens/pfp.png",
          tipo: ehAlbum ? "album" : "artista",
        };
      });
    }
  } catch (err) {
    console.error("Erro ao carregar catálogo de aprovados:", err);
  }
}

const deparaLegado = {
  lon3r: "cand_1",
  carti: "cand_2",
  ken: "cand_3",
  album_94: "cand_4",
  album_wlr: "cand_5",
  album_agc: "cand_6",
};

function obterInfoMidia(id) {
  const idChave = deparaLegado[id] || id;
  if (cacheItensAprovados[idChave]) {
    return cacheItensAprovados[idChave];
  }
  if (catalogoMidia[id]) {
    return {
      ...catalogoMidia[id],
      tipo: String(id).startsWith("album_") ? "album" : "artista",
    };
  }
  return {
    nome: id,
    imagem: "imagens/pfp.png",
    tipo: String(id).startsWith("album_") ? "album" : "artista",
  };
}

let limiteArtistasExibidos = 5;
let limiteAlbunsExibidos = 5;
let dadosPerfilAtual = null;

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
      const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
      const t = traducoes[idiomaAtual] || traducoes["pt"];
      if (dados.acao === "followed") {
        btnElement.classList.remove("btn-principal");
        btnElement.classList.add("btn-seguindo");
        btnElement.innerText = t.btnDeixarSeguir || "DEIXAR DE SEGUIR";
      } else {
        btnElement.classList.remove("btn-seguindo");
        btnElement.classList.add("btn-principal");
        btnElement.innerText = t.btnSeguir || "SEGUIR";
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

    const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
    const t = traducoes[idiomaAtual] || traducoes["pt"];

    if (res.ok && dados.following && dados.following.length > 0) {
      container.innerHTML = dados.following
        .map(
          (user) => `
        <div class="item-favorito">
          <span>${user}</span>
          <button type="button" class="btn-sm btn-perigo" onclick="alternarSeguir('${user}', this)">${t.btnDeixarSeguir || "DEIXAR DE SEGUIR"}</button>
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
  await carregarCatalogoAprovados();
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

    const listaMembros = Array.isArray(dados) ? dados : (dados.utilizadores || []);

    if (listaMembros.length === 0) {
      container.innerHTML =
        "<p style='color: #888;'>Nenhum utilizador encontrado.</p>";
      return;
    }

    const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
    const t = traducoes[idiomaAtual] || traducoes["pt"];

    container.innerHTML = listaMembros
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
                  <span><strong id="card-followers-${u.username}">${numSeguidores}</strong> <span data-i18n="comunidadeSeguidores">${t.comunidadeSeguidores || "seguidores"}</span></span>
                  <span>•</span>
                  <span><strong id="card-following-${u.username}">${numSeguindo}</strong> <span data-i18n="comunidadeASeguir">${t.comunidadeASeguir || "a seguir"}</span></span>
                </div>
              </div>
            </div>
            <button 
              type="button"
              class="btn-hud ${u.ja_segue ? "btn-seguindo" : "btn-principal"}" 
              data-i18n="${u.ja_segue ? "btnASeguir" : "btnSeguir"}"
              onclick="event.stopPropagation(); alternarSeguirComunidade('${u.username}', this)">
              ${u.ja_segue ? t.btnASeguir || "A SEGUIR" : t.btnSeguir || "SEGUIR"}
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

  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  if (jaSegue) {
    btn.classList.remove("btn-seguindo");
    btn.classList.add("btn-principal");
    btn.innerText = t.btnSeguir || "SEGUIR";
    if (elemSeguidoresCard)
      elemSeguidoresCard.innerText = Math.max(0, totalSeguidores - 1);
  } else {
    btn.classList.remove("btn-principal");
    btn.classList.add("btn-seguindo");
    btn.innerText = t.btnASeguir || "A SEGUIR";
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
        btn.innerText = t.btnASeguir || "A SEGUIR";
        if (elemSeguidoresCard) elemSeguidoresCard.innerText = totalSeguidores;
      } else {
        btn.classList.remove("btn-seguindo");
        btn.classList.add("btn-principal");
        btn.innerText = t.btnSeguir || "SEGUIR";
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
      btn.innerText = t.btnASeguir || "A SEGUIR";
      if (elemSeguidoresCard) elemSeguidoresCard.innerText = totalSeguidores;
    } else {
      btn.classList.remove("btn-seguindo");
      btn.classList.add("btn-principal");
      btn.innerText = t.btnSeguir || "SEGUIR";
      if (elemSeguidoresCard) elemSeguidoresCard.innerText = totalSeguidores;
    }
  }
}

async function abrirPerfilMembro(username) {
  try {
    await carregarCatalogoAprovados();
    const res = await fetch(`${API_URL}/users/${username}/full-profile`);
    const dados = await res.json();
    if (!res.ok) return mostrarToast(dados.erro || "Erro ao carregar perfil.");

    dadosPerfilAtual = dados;
    limiteArtistasExibidos = 5;
    limiteAlbunsExibidos = 5;

    const totalSeguidores = (dados.stats && dados.stats.followers) ?? dados.seguidores ?? 0;
    const totalSeguindo = (dados.stats && dados.stats.following) ?? dados.aSeguir ?? 0;

    document.getElementById("out-pfp").src =
      dados.user.pfp || "imagens/pfp.png";
    document.getElementById("out-username").innerText = dados.user.username;
    document.getElementById("out-seguidores").innerText = totalSeguidores;
    document.getElementById("out-seguindo").innerText = totalSeguindo;

    const btnSeguir = document.getElementById("out-btn-seguir");
    btnSeguir.onclick = async () => {
      await alternarSeguir(username, btnSeguir);
      abrirPerfilMembro(username);
      carregarPaginaComunidade();
    };

    renderizarSecoesPerfilModal();
    const modal = document.getElementById("modal-ver-perfil");
    modal.style.display = "flex";
    const caixaModal = modal.querySelector(".caixa-perfil");
    if (caixaModal) caixaModal.scrollTop = 0;
  } catch (err) {
    mostrarToast("Erro ao abrir perfil.");
  }
}

function renderizarSecoesPerfilModal() {
  if (!dadosPerfilAtual) return;

  const idsLikes = dadosPerfilAtual.likes || [];
  const albunsIds = idsLikes.filter(
    (id) => obterInfoMidia(id).tipo === "album",
  );
  const artistasIds = idsLikes.filter(
    (id) => obterInfoMidia(id).tipo !== "album",
  );

  const containerArtistas = document.getElementById("out-favoritos-artistas");
  const containerAlbuns = document.getElementById("out-favoritos-albuns");

  const idiomaAtual = localStorage.getItem("idioma_preferido") || "pt";
  const t = traducoes[idiomaAtual] || traducoes["pt"];

  // ARTISTAS
  if (containerArtistas) {
    if (artistasIds.length > 0) {
      const subArtistas = artistasIds.slice(0, limiteArtistasExibidos);

      let html = "";
      subArtistas.forEach((id) => {
        const info = obterInfoMidia(id);
        html += `
          <div class="card-mini-fav">
            <img src="${info.imagem}" />
            <span>${info.nome}</span>
          </div>
        `;
      });

      if (
        limiteArtistasExibidos < artistasIds.length ||
        limiteArtistasExibidos > 5
      ) {
        html += `<div class="linha-botoes-fav">`;
        if (limiteArtistasExibidos < artistasIds.length) {
          html += `
            <button type="button" class="btn-hud" onclick="verMaisArtistasModal()">${t.btnVerMais || "VER MAIS"}</button>
            <button type="button" class="btn-hud" onclick="verTudoArtistasModal()">${t.btnVerTudo || "VER TUDO"}</button>
          `;
        }
        if (limiteArtistasExibidos > 5) {
          html += `<button type="button" class="btn-hud" onclick="verMenosArtistasModal()">${t.btnVerMenos || "VER MENOS"}</button>`;
        }
        html += `</div>`;
      }
      containerArtistas.innerHTML = html;
    } else {
      containerArtistas.innerHTML = `<p style='font-size: 0.75rem; color: #666;'>${t.perfilSemArtistas || "Sem artistas favoritos."}</p>`;
    }
  }

  // ÁLBUNS
  if (containerAlbuns) {
    if (albunsIds.length > 0) {
      const subAlbuns = albunsIds.slice(0, limiteAlbunsExibidos);

      let html = "";
      subAlbuns.forEach((id) => {
        const info = obterInfoMidia(id);
        html += `
          <div class="card-mini-fav">
            <img src="${info.imagem}" />
            <span>${info.nome}</span>
          </div>
        `;
      });

      if (limiteAlbunsExibidos < albunsIds.length || limiteAlbunsExibidos > 5) {
        html += `<div class="linha-botoes-fav">`;
        if (limiteAlbunsExibidos < albunsIds.length) {
          html += `
            <button type="button" class="btn-hud" onclick="verMaisAlbunsModal()">${t.btnVerMais || "VER MAIS"}</button>
            <button type="button" class="btn-hud" onclick="verTudoAlbunsModal()">${t.btnVerTudo || "VER TUDO"}</button>
          `;
        }
        if (limiteAlbunsExibidos > 5) {
          html += `<button type="button" class="btn-hud" onclick="verMenosAlbunsModal()">${t.btnVerMenos || "VER MENOS"}</button>`;
        }
        html += `</div>`;
      }
      containerAlbuns.innerHTML = html;
    } else {
      containerAlbuns.innerHTML = `<p style='font-size: 0.75rem; color: #666;'>${t.perfilSemAlbuns || "Sem álbuns favoritos."}</p>`;
    }
  }
}

function verMaisArtistasModal() {
  limiteArtistasExibidos += 5;
  renderizarSecoesPerfilModal();
}

function verMenosArtistasModal() {
  limiteArtistasExibidos = 5;
  renderizarSecoesPerfilModal();
}

function verTudoArtistasModal() {
  if (!dadosPerfilAtual) return;
  const artistasIds = (dadosPerfilAtual.likes || []).filter(
    (id) => !String(id).startsWith("album_"),
  );
  limiteArtistasExibidos = artistasIds.length;
  renderizarSecoesPerfilModal();
}

function verMaisAlbunsModal() {
  limiteAlbunsExibidos += 5;
  renderizarSecoesPerfilModal();
}

function verMenosAlbunsModal() {
  limiteAlbunsExibidos = 5;
  renderizarSecoesPerfilModal();
}

function verTudoAlbunsModal() {
  if (!dadosPerfilAtual) return;
  const albunsIds = (dadosPerfilAtual.likes || []).filter((id) =>
    String(id).startsWith("album_"),
  );
  limiteAlbunsExibidos = albunsIds.length;
  renderizarSecoesPerfilModal();
}

// Fechar modal via ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    fecharModalPerfil();
  }
});

function fecharModalPerfil() {
  const modal = document.getElementById("modal-ver-perfil");
  if (modal) modal.style.display = "none";
}
