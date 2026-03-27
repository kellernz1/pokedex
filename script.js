let allPokemon = [];
let currentPokemonList = [];
let currentPokemonIndex = 0;
let currentPokemon = null;
let isLoading = false;
let allGenerationsLoaded = false;

// Configurações
const POKEMONS_PER_LOAD = 30; // 30 Pokémon por clique
const MAX_POKEMONS = 1025; // Até 9ª geração

// Inicializar a Pokédex
async function initPokedex() {
    try {
        document.getElementById('pokemonGrid').innerHTML = '<div class="loading"></div>';
        
        // Carregar apenas 1ª geração inicialmente (151 Pokémon)
        await loadPokemonBatch(151);
        currentPokemonList = allPokemon.slice(0, POKEMONS_PER_LOAD);
        displayPokemonGrid();
        createLoadMoreButton();
        
        console.log('✅ Pokédex iniciada! Clique "Carregar Mais" para continuar.');
    } catch (error) {
        console.error('Erro ao carregar Pokémon:', error);
        document.getElementById('pokemonGrid').innerHTML = 
            '<div class="error">Erro ao carregar Pokémon. Tente novamente!</div>';
    }
}

// Carregar lote de Pokémon
async function loadPokemonBatch(limit) {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);
    const data = await response.json();
    
    // Adicionar novos Pokémon
    const newPokemon = data.results.slice(allPokemon.length);
    allPokemon.push(...newPokemon);
    
    console.log(`✅ Carregados ${newPokemon.length} Pokémon! Total: ${allPokemon.length}/${MAX_POKEMONS}`);
}

// Criar botão "Carregar Mais"
function createLoadMoreButton() {
    const grid = document.getElementById('pokemonGrid');
    
    // Remove botão anterior se existir
    const existingBtn = grid.querySelector('.load-more-container');
    if (existingBtn) existingBtn.remove();
    
    if (allPokemon.length >= MAX_POKEMONS) {
        // Todos carregados
        grid.insertAdjacentHTML('beforeend', `
            <div class="load-more-container" style="grid-column: 1/-1;">
                <div class="complete-message">
                    🎉 <strong>Todos os ${MAX_POKEMONS} Pokémon</strong> foram carregados!
                </div>
            </div>
        `);
        return;
    }
    
    // Botão carregar mais
    grid.insertAdjacentHTML('beforeend', `
        <div class="load-more-container" style="grid-column: 1/-1;">
            <button class="load-more-btn" onclick="loadMorePokemon()">
                📥 Carregar Mais ${POKEMONS_PER_LOAD} Pokémon
                <span class="load-count">(${allPokemon.length + 1} - ${Math.min(allPokemon.length + POKEMONS_PER_LOAD, MAX_POKEMONS)})</span>
            </button>
        </div>
    `);
}

// Carregar mais Pokémon
async function loadMorePokemon() {
    const loadBtn = document.querySelector('.load-more-btn');
    if (isLoading || !loadBtn) return;
    
    isLoading = true;
    loadBtn.textContent = '⏳ Carregando...';
    loadBtn.disabled = true;
    
    try {
        // Calcular próximo lote
        const nextStart = allPokemon.length + 1;
        const nextLimit = Math.min(nextStart + POKEMONS_PER_LOAD - 1, MAX_POKEMONS);
        
        // Carregar até o próximo lote
        await loadPokemonBatch(nextLimit);
        
        // Mostrar novos Pokémon
        const newStart = currentPokemonList.length;
        currentPokemonList = allPokemon.slice(0, Math.min(allPokemon.length, newStart + POKEMONS_PER_LOAD));
        await displayPokemonGrid();
        
        // Recriar botão atualizado
        createLoadMoreButton();
        
    } catch (error) {
        console.error('Erro ao carregar mais Pokémon:', error);
        loadBtn.textContent = '❌ Erro ao carregar';
    } finally {
        isLoading = false;
        if (loadBtn) {
            loadBtn.disabled = false;
            if (allPokemon.length < MAX_POKEMONS) {
                loadBtn.textContent = `📥 Carregar Mais ${POKEMONS_PER_LOAD} Pokémon`;
            }
        }
    }
}

// Exibir grid de Pokémon (otimizado)
async function displayPokemonGrid() {
    const grid = document.getElementById('pokemonGrid');
    
    // Só renderizar novos cards
    const existingCards = grid.querySelectorAll('.pokemon-card');
    const cardsToShow = currentPokemonList.slice(existingCards.length);
    
    for (let pokemonData of cardsToShow) {
        try {
            const pokemon = await fetchPokemonData(pokemonData.name);
            const card = createPokemonCard(pokemon);
            grid.appendChild(card);
        } catch (error) {
            console.error(`Erro ao carregar ${pokemonData.name}:`, error);
        }
    }
}

// Criar card do Pokémon
function createPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.onclick = () => showPokemonModal(pokemon);
    
    const id = pokemon.id.toString().padStart(4, '0');
    
    card.innerHTML = `
        <div class="pokemon-id">#${id}</div>
        <img class="pokemon-image" src="${pokemon.sprites.front_default}" alt="${pokemon.name}" loading="lazy">
        <div class="pokemon-name">${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</div>
        <div class="pokemon-types">
            ${pokemon.types.map(type => 
                `<span class="type-badge type-${type.type.name}">${type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)}</span>`
            ).join('')}
        </div>
    `;
    return card;
}

// Buscar dados do Pokémon
async function fetchPokemonData(nameOrUrl) {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrUrl}`);
    if (!response.ok) throw new Error('Pokémon não encontrado');
    return await response.json();
}

// Pesquisar Pokémon
async function searchPokemon() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const grid = document.getElementById('pokemonGrid');
    
    if (query === '') {
        currentPokemonList = allPokemon.slice(0, POKEMONS_PER_LOAD);
        grid.innerHTML = '<div class="loading">Carregando Pokémon...</div>';
        displayPokemonGrid();
        createLoadMoreButton();
        return;
    }

    grid.innerHTML = '<div class="loading">Procurando Pokémon...</div>';
    
    try {
        const filtered = allPokemon.filter(p => 
            p.name.includes(query) || 
            p.name.toLowerCase().startsWith(query)
        );
        
        if (filtered.length === 0) {
            const pokemon = await fetchPokemonData(query);
            currentPokemonList = [pokemon];
        } else {
            currentPokemonList = filtered.slice(0, 48);
        }
        
        await displayPokemonGrid();
        createSearchCompleteMessage(filtered.length);
        
    } catch (error) {
        grid.innerHTML = '<div class="error">Pokémon não encontrado! 😢<br><small>Tente outro nome</small></div>';
    }
}

function createSearchCompleteMessage(count) {
    const grid = document.getElementById('pokemonGrid');
    grid.insertAdjacentHTML('beforeend', `
        <div class="search-complete" style="grid-column: 1/-1; text-align: center; padding: 20px; background: rgba(76, 175, 80, 0.1); border-radius: 15px; margin-top: 20px;">
            🔍 Encontrados <strong>${count}</strong> resultados para sua pesquisa!
        </div>
    `);
}

// Mostrar modal detalhado
function showPokemonModal(pokemon) {
    currentPokemon = pokemon;
    document.getElementById('modalPokemonImage').src = pokemon.sprites.other['official-artwork']?.front_default || pokemon.sprites.front_default;
    document.getElementById('modalPokemonName').textContent = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    document.getElementById('modalPokemonId').textContent = `#${pokemon.id.toString().padStart(4, '0')}`;
    
    const typesContainer = document.getElementById('modalPokemonTypes');
    typesContainer.innerHTML = pokemon.types.map(type => 
        `<span class="type-badge type-${type.type.name}">${type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)}</span>`
    ).join('');
    
    displayStats(pokemon.stats);
    document.getElementById('pokemonModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    currentPokemonIndex = allPokemon.findIndex(p => p.name === pokemon.name);
}

// Exibir stats
function displayStats(stats) {
    const statsContainer = document.getElementById('modalStats');
    statsContainer.innerHTML = stats.map((stat) => {
        const maxStat = 255;
        const percentage = (stat.base_stat / maxStat) * 100;
        return `
            <div class="stat-item">
                <div style="font-weight: bold; margin-bottom: 5px;">${stat.stat.name.toUpperCase()}</div>
                <div style="font-size: 1.2rem; color: #2196F3;">${stat.base_stat}</div>
                <div class="stat-bar">
                    <div class="stat-fill" style="width: ${percentage}%; background: linear-gradient(90deg, #4CAF50, #2196F3);"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Navegação entre Pokémon
async function previousPokemon() {
    if (currentPokemonIndex > 0) {
        currentPokemonIndex--;
        const pokemon = await fetchPokemonData(allPokemon[currentPokemonIndex].name);
        showPokemonModal(pokemon);
    }
}

async function nextPokemon() {
    if (currentPokemonIndex < allPokemon.length - 1) {
        currentPokemonIndex++;
        const pokemon = await fetchPokemonData(allPokemon[currentPokemonIndex].name);
        showPokemonModal(pokemon);
    }
}

// Fechar modal
function closeModal() {
    document.getElementById('pokemonModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Alternar modo claro/escuro
function toggleMode() {
    const body = document.body;
    const button = document.querySelector('.mode-toggle');
    
    if (body.classList.contains('light')) {
        body.classList.remove('light');
        body.classList.add('dark');
        button.textContent = '☀️ Light Mode';
    } else {
        body.classList.remove('dark');
        body.classList.add('light');
        button.textContent = '🌙 Dark Mode';
    }
}

// Event listeners
document.getElementById('pokemonModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Inicializar quando a página carregar
window.addEventListener('load', initPokedex);

