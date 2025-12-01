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
let nextPageUrl = `${API_BASE_URL}?offset=0&limit=20`;
let caughtSet = new Set(); // Pokémon ids as strings
const pokemonMap = new Map(); // id -> { id, name }

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
  return `${THUMBNAIL_BASE_URL}/${id}.png`;
}

function getArtworkUrl(id) {
  return `${ARTWORK_BASE_URL}/${id}.png`;
}

function loadCaughtFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  try {
    const ids = JSON.parse(stored);
    caughtSet = new Set(ids.map(String));
  } catch (error) {
    console.error("Failed to parse caught Pokémon from storage", error);
  }
}

function saveCaughtToStorage() {
  const ids = Array.from(caughtSet);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function isCaught(id) {
  return caughtSet.has(String(id));
}

// ---------- RENDER HELPERS ----------

function createPokemonCard(pokemon) {
  const { id, name } = pokemon;

  const card = document.createElement("button");
  card.type = "button";
  card.className = "pokemon-card";
  card.dataset.id = id;
  card.setAttribute("aria-label", `View details for ${name}`);

  if (isCaught(id)) {
    card.classList.add("caught");
  }

  const img = document.createElement("img");
  img.src = getThumbnailUrl(id);
  img.alt = `${name} thumbnail`;

  // Pokémon number line like #001
  const numberEl = document.createElement("span");
  numberEl.className = "pokemon-number";
  numberEl.textContent = `#${String(id).padStart(3, "0")}`;

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
  card.addEventListener("click", () => {
    showPokemonDetails(id, name);
  });

  return card;
}

function renderPokemonGrid(pokemonArray) {
  pokemonArray.forEach((pokemon) => {
    const card = createPokemonCard(pokemon);
    gridEl.appendChild(card);
  });
}

function updateCardCaughtState(id) {
  const card = gridEl.querySelector(`.pokemon-card[data-id="${id}"]`);
  if (!card) return;

  card.classList.toggle("caught", isCaught(id));

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

  const ids = Array.from(caughtSet).sort((a, b) => Number(a) - Number(b));

  ids.forEach((id) => {
    const info = pokemonMap.get(id);
    const li = document.createElement("li");
    li.className = "caught-list-item";
    li.textContent = info ? info.name : `Pokémon #${id}`;
  });

  caughtCountEl.textContent = ids.length.toString();
}

// ---------- FETCH & DATA FLOW ----------

async function fetchPokemonPage() {
  if (!nextPageUrl) return;

  try {
    const response = await fetch(nextPageUrl);
    if (!response.ok) {
      throw new Error("Failed to load Pokémon list");
    }

    const data = await response.json();
    nextPageUrl = data.next;

    const simplePokemonList = data.results.map((entry) => {
      const id = getPokemonIdFromUrl(entry.url);
      const pokemon = {
        id,
        name: entry.name,
      };
      pokemonMap.set(id, pokemon);
      return pokemon;
    });

    renderPokemonGrid(simplePokemonList);
    renderCaughtList();
  } catch (error) {
    console.error(error);
  }
}

async function showPokemonDetails(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}/`);
    if (!response.ok) {
      throw new Error("Failed to load Pokémon details");
    }

    const data = await response.json();

    const name = data.name;
    const types = data.types.map((t) => t.type.name);
    const abilities = data.abilities.map((a) => a.ability.name);
    const height = data.height;
    const weight = data.weight;

    // Make sure map has it
    if (!pokemonMap.has(String(id))) {
      pokemonMap.set(String(id), { id: String(id), name });
    }

    const caught = isCaught(id);

    detailsEl.innerHTML = `
      <div class="details-header">
        <img src="${getArtworkUrl(id)}" alt="${name} official artwork" />
        <div>
          <h3 class="details-name">${name}</h3>
          <p class="details-meta">#${String(id).padStart(3, "0")}</p>
          <p class="details-meta">
            Height: ${height} • Weight: ${weight}
          </p>
        </div>
      </div>

      <div class="details-body">
        <div>
          <strong>Types:</strong>
          <ul class="chip-list">
            ${types
              .map(
                (type) =>
                  `<li class="chip" style="text-transform: capitalize;">${type}</li>`
              )
              .join("")}
          </ul>
        </div>
        <div>
          <strong>Abilities:</strong>
          <ul class="chip-list">
            ${abilities
              .map(
                (ability) =>
                  `<li class="chip" style="text-transform: capitalize;">${ability}</li>`
              )
              .join("")}
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
  } catch (error) {
    console.error(error);
    detailsEl.innerHTML = `
      <p class="placeholder-text">
        Unable to load Pokémon details right now. Please try again.
      </p>
    `;
  }
}

// ---------- EVENT LISTENERS ----------

// Load more button
loadMoreBtn.addEventListener("click", () => {
  fetchPokemonPage();
});

// Toggle caught from details panel (event delegation)
detailsEl.addEventListener("click", (event) => {
  const target = event.target;

  if (target.classList.contains("js-toggle-caught")) {
    const id = target.dataset.id;
    if (!id) return;

    if (isCaught(id)) {
      caughtSet.delete(String(id));
    } else {
      caughtSet.add(String(id));
    }

    saveCaughtToStorage();
    updateCardCaughtState(id);
    renderCaughtList();

    // Update button label + style
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
