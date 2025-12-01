// script.js

// ---------- CONFIG ----------
const API_BASE_URL = "https://pokeapi.co/api/v2/pokemon";
const THUMBNAIL_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const ARTWORK_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

// Key for localStorage
const STORAGE_KEY = "pokedex-caught";

// ---------- STATE ----------
let nextPageUrl = API_BASE_URL + "?offset=0&limit=20";
let caughtIds = []; // store Pokémon ids as strings
const pokemonById = {}; // id -> { id, name }

// ---------- DOM REFERENCES ----------
const gridEl = document.querySelector("#pokemon-grid");
const loadMoreBtn = document.querySelector("#load-more");
const detailsEl = document.querySelector("#pokemon-details");
const caughtListEl = document.querySelector("#caught-list");
const caughtCountEl = document.querySelector("#caught-count");

// ---------- HELPERS ----------

// Returns the Pokémon's id as a string from a URL like: https://pokeapi.co/api/v2/pokemon/1/
function getPokemonIdFromUrl(url) {
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1]; // last segment
}

function getThumbnailUrl(id) {
  return THUMBNAIL_BASE_URL + "/" + id + ".png";
}

function getArtworkUrl(id) {
  return ARTWORK_BASE_URL + "/" + id + ".png";
}

function loadCaughtFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  try {
    const ids = JSON.parse(stored);
    if (Array.isArray(ids)) {
      caughtIds = ids.map(String);
    }
  } catch (error) {
    console.error("Failed to parse caught Pokémon from storage", error);
  }
}

function saveCaughtToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(caughtIds));
}

function isCaught(id) {
  return caughtIds.includes(String(id));
}

// ---------- RENDER HELPERS ----------

function createPokemonCard(pokemon) {
  const id = String(pokemon.id);
  const name = pokemon.name;

  const card = document.createElement("button");
  card.type = "button";
  card.className = "pokemon-card";
  card.dataset.id = id;
  card.setAttribute("aria-label", "View details for " + name);

  if (isCaught(id)) {
    card.classList.add("caught");
  }

  const img = document.createElement("img");
  img.src = getThumbnailUrl(id);
  img.alt = name + " thumbnail";

  // Pokémon number line like #1
  const numberEl = document.createElement("span");
  numberEl.className = "pokemon-number";
  numberEl.textContent = "#" + id;

  const nameEl = document.createElement("span");
  nameEl.className = "pokemon-name";
  nameEl.textContent = name;

  card.appendChild(img);
  card.appendChild(numberEl);
  card.appendChild(nameEl);

  if (isCaught(id)) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "Caught";
    card.appendChild(badge);
  }

  // Click to load details
  card.addEventListener("click", function () {
    showPokemonDetails(id);
  });

  return card;
}

function renderPokemonGrid(pokemonArray) {
  pokemonArray.forEach(function (pokemon) {
    const card = createPokemonCard(pokemon);
    gridEl.appendChild(card);
  });
}

function updateCardCaughtState(id) {
  const card = gridEl.querySelector('.pokemon-card[data-id="' + id + '"]');
  if (!card) return;

  if (isCaught(id)) {
    card.classList.add("caught");
  } else {
    card.classList.remove("caught");
  }

  // Remove old badge if any
  const oldBadge = card.querySelector(".badge");
  if (oldBadge) oldBadge.remove();

  if (isCaught(id)) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "Caught";
    card.appendChild(badge);
  }
}

function renderCaughtList() {
  caughtListEl.innerHTML = "";

  const sortedIds = caughtIds
    .slice()
    .sort(function (a, b) {
      return Number(a) - Number(b);
    });

  sortedIds.forEach(function (id) {
    const info = pokemonById[id];
    const li = document.createElement("li");
    li.className = "caught-list-item";
    li.textContent = info ? info.name : "Pokémon #" + id;
    caughtListEl.appendChild(li);
  });

  caughtCountEl.textContent = String(sortedIds.length);
}

// ---------- FETCH & DATA FLOW ----------

function fetchPokemonPage() {
  if (!nextPageUrl) return;

  fetch(nextPageUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load Pokémon list");
      }
      return response.json();
    })
    .then(function (data) {
      nextPageUrl = data.next;

      const simplePokemonList = data.results.map(function (entry) {
        const id = getPokemonIdFromUrl(entry.url);
        const pokemon = {
          id: id,
          name: entry.name,
        };
        pokemonById[id] = pokemon;
        return pokemon;
      });

      renderPokemonGrid(simplePokemonList);
      renderCaughtList();
    })
    .catch(function (error) {
      console.error(error);
    });
}

function showPokemonDetails(id) {
  const url = API_BASE_URL + "/" + id + "/";

  fetch(url)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load Pokémon details");
      }
      return response.json();
    })
    .then(function (data) {
      const name = data.name;
      const types = data.types.map(function (t) {
        return t.type.name;
      });
      const abilities = data.abilities.map(function (a) {
        return a.ability.name;
      });
      const height = data.height;
      const weight = data.weight;

      if (!pokemonById[id]) {
        pokemonById[id] = { id: id, name: name };
      }

      const caught = isCaught(id);

      const typesHtml = types
        .map(function (type) {
          return '<li class="chip" style="text-transform: capitalize;">' + type + "</li>";
        })
        .join("");

      const abilitiesHtml = abilities
        .map(function (ability) {
          return '<li class="chip" style="text-transform: capitalize;">' + ability + "</li>";
        })
        .join("");

      detailsEl.innerHTML = `
        <div class="details-header">
          <img src="${getArtworkUrl(id)}" alt="${name} official artwork" />
          <div>
            <h3 class="details-name">${name}</h3>
            <p class="details-meta">#${id}</p>
            <p class="details-meta">
              Height: ${height} • Weight: ${weight}
            </p>
          </div>
        </div>

        <div class="details-body">
          <div>
            <strong>Types:</strong>
            <ul class="chip-list">
              ${typesHtml}
            </ul>
          </div>
          <div>
            <strong>Abilities:</strong>
            <ul class="chip-list">
              ${abilitiesHtml}
            </ul>
          </div>
        </div>

        <div class="details-actions">
          <button
            class="btn ${caught ? "btn-secondary" : "btn-primary"} js-toggle-caught"
            data-id="${id}"
          >
            ${caught ? "Release" : "Mark as caught"}
          </button>
        </div>
      `;
    })
    .catch(function (error) {
      console.error(error);
      detailsEl.innerHTML = `
        <p class="placeholder-text">
          Unable to load Pokémon details right now. Please try again.
        </p>
      `;
    });
}

// ---------- EVENT LISTENERS ----------

// Load more button
loadMoreBtn.addEventListener("click", function () {
  fetchPokemonPage();
});

// Toggle caught from details panel (event delegation)
detailsEl.addEventListener("click", function (event) {
  const target = event.target;

  if (target.classList.contains("js-toggle-caught")) {
    const id = target.getAttribute("data-id");
    if (!id) return;

    if (isCaught(id)) {
      // remove
      caughtIds = caughtIds.filter(function (storedId) {
        return storedId !== String(id);
      });
    } else {
      // add
      caughtIds.push(String(id));
    }

    saveCaughtToStorage();
    updateCardCaughtState(id);
    renderCaughtList();

    const nowCaught = isCaught(id);
    target.textContent = nowCaught ? "Release" : "Mark as caught";
    target.classList.toggle("btn-primary", !nowCaught);
    target.classList.toggle("btn-secondary", nowCaught);
  }
});

// ---------- INITIALIZE ----------
function init() {
  loadCaughtFromStorage();
  renderCaughtList();
  fetchPokemonPage();
}

// Run once DOM is ready
document.addEventListener("DOMContentLoaded", init);
