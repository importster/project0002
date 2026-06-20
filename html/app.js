const COLORS = [
    { id: 'red', name: '赤', en: 'Red', hex: '#E53E3E' },
    { id: 'blue', name: '青', en: 'Blue', hex: '#3182CE' },
    { id: 'green', name: '緑', en: 'Green', hex: '#38A169' },
    { id: 'pink', name: 'ピンク', en: 'Pink', hex: '#ED64A6' },
    { id: 'orange', name: 'オレンジ', en: 'Orange', hex: '#DD6B20' },
    { id: 'yellow', name: 'イエロー', en: 'Yellow', hex: '#D69E2E' },
    { id: 'black', name: 'ブラック', en: 'Black', hex: '#1A202C' },
    { id: 'white', name: 'ホワイト', en: 'White', hex: '#FFFFFF' },
    { id: 'purple', name: '紫', en: 'Purple', hex: '#805AD5' },
    { id: 'brown', name: 'ブラウン', en: 'Brown', hex: '#975A16' },
    { id: 'cyan', name: 'シアン', en: 'Cyan', hex: '#00B5D8' },
    { id: 'lime', name: 'ライム', en: 'Lime', hex: '#48BB78' },
    { id: 'maroon', name: 'マルーン', en: 'Maroon', hex: '#800000' },
    { id: 'rose', name: 'ローズ', en: 'Rose', hex: '#D53F8C' },
    { id: 'banana', name: 'バナナ', en: 'Banana', hex: '#ECC94B' },
    { id: 'gray', name: 'グレー', en: 'Gray', hex: '#718096' },
    { id: 'tan', name: 'タン', en: 'Tan', hex: '#B7791F' },
    { id: 'coral', name: 'コーラル', en: 'Coral', hex: '#FF7F50' }
];

let state = {
    selectedIds: [],
    rounds: [{}], // Array of objects: { colorId: { vote: 'like'|'dislike', no: boolean } }
    currentRoundIndex: 0,
    phase: 'selection',
    voteMode: 'like'
};

// --- DOM Elements ---
const selectionPhase = document.getElementById('selection-phase');
const votingPhase = document.getElementById('voting-phase');
const colorGridSelection = document.getElementById('color-grid-selection');
const colorGridVoting = document.getElementById('color-grid-voting');
const selectionCount = document.getElementById('selection-count');
const proceedBtn = document.getElementById('proceed-btn');
const roundTitle = document.getElementById('round-title');
const modeLikeBtn = document.getElementById('mode-like');
const modeDislikeBtn = document.getElementById('mode-dislike');
const modeNoBtn = document.getElementById('mode-no');
const resetBtn = document.getElementById('reset-btn');
const clearVotesBtn = document.getElementById('clear-votes-btn');
const nextRoundBtn = document.getElementById('next-round-btn');

// --- Initialization ---
function init() {
    loadState();
    // Migrating old state if necessary
    if (state.votes && !state.rounds) {
        state.rounds = [state.votes];
        delete state.votes;
        state.currentRoundIndex = 0;
    }
    render();
}

function loadState() {
    const saved = localStorage.getItem('colorVoteState_v2');
    if (saved) {
        state = JSON.parse(saved);
    }
}

function saveState() {
    localStorage.setItem('colorVoteState_v2', JSON.stringify(state));
}

// --- Logic ---
function toggleColorSelection(id) {
    const index = state.selectedIds.indexOf(id);
    if (index > -1) {
        state.selectedIds.splice(index, 1);
    } else if (state.selectedIds.length < 15) {
        state.selectedIds.push(id);
    }
    saveState();
    render();
}

function handleVote(id) {
    const round = state.rounds[state.currentRoundIndex];
    if (!round[id]) round[id] = { vote: null, no: false };

    if (state.voteMode === 'no') {
        round[id].no = !round[id].no;
    } else {
        if (round[id].vote === state.voteMode) {
            round[id].vote = null;
        } else {
            round[id].vote = state.voteMode;
        }
    }
    saveState();
    render();
}

function nextRound() {
    state.rounds.push({});
    state.currentRoundIndex++;
    saveState();
    render();
}

function setPhase(newPhase) {
    state.phase = newPhase;
    saveState();
    render();
}

function setVoteMode(mode) {
    state.voteMode = mode;
    saveState();
    render();
}

function resetAll() {
    if (confirm('全てのデータをリセットして最初からやり直しますか？')) {
        state = {
            selectedIds: [],
            rounds: [{}],
            currentRoundIndex: 0,
            phase: 'selection',
            voteMode: 'like'
        };
        localStorage.removeItem('colorVoteState_v2');
        saveState();
        render();
    }
}

function clearCurrentRound() {
    state.rounds[state.currentRoundIndex] = {};
    saveState();
    render();
}

// --- Rendering ---
function render() {
    if (state.phase === 'selection') {
        selectionPhase.classList.remove('hidden');
        votingPhase.classList.add('hidden');
        renderSelectionGrid();
    } else {
        selectionPhase.classList.add('hidden');
        votingPhase.classList.remove('hidden');
        renderVotingGrid();
    }

    selectionCount.textContent = state.selectedIds.length;
    proceedBtn.disabled = state.selectedIds.length !== 15;

    roundTitle.textContent = `第${state.currentRoundIndex + 1}回 投票画面`;
    modeLikeBtn.classList.toggle('active', state.voteMode === 'like');
    modeDislikeBtn.classList.toggle('active', state.voteMode === 'dislike');
    modeNoBtn.classList.toggle('active', state.voteMode === 'no');
}

function renderSelectionGrid() {
    colorGridSelection.innerHTML = '';
    COLORS.forEach(color => {
        const card = document.createElement('div');
        card.className = `color-card ${state.selectedIds.includes(color.id) ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="swatch" style="background-color: ${color.hex}"></div>
            <div class="color-name">${color.name}<br><small>${color.en}</small></div>
        `;
        card.onclick = () => toggleColorSelection(color.id);
        colorGridSelection.appendChild(card);
    });
}

function renderVotingGrid() {
    colorGridVoting.innerHTML = '';
    const round = state.rounds[state.currentRoundIndex];
    const selectedColors = COLORS.filter(c => state.selectedIds.includes(c.id));
    
    selectedColors.forEach(color => {
        const data = round[color.id] || { vote: null, no: false };
        const card = document.createElement('div');
        card.className = 'color-card';
        
        let badgesHtml = '<div class="badge-container">';
        if (data.vote === 'like') badgesHtml += '<div class="vote-badge">❤️</div>';
        if (data.vote === 'dislike') badgesHtml += '<div class="vote-badge">💔</div>';
        if (data.no) badgesHtml += '<div class="vote-badge">✖</div>';
        badgesHtml += '</div>';

        card.innerHTML = `
            ${badgesHtml}
            <div class="swatch" style="background-color: ${color.hex}"></div>
            <div class="color-name">${color.name}</div>
        `;
        card.onclick = () => handleVote(color.id);
        colorGridVoting.appendChild(card);
    });
}

// --- Event Listeners ---
proceedBtn.onclick = () => setPhase('voting');
modeLikeBtn.onclick = () => setVoteMode('like');
modeDislikeBtn.onclick = () => setVoteMode('dislike');
modeNoBtn.onclick = () => setVoteMode('no');
resetBtn.onclick = resetAll;
clearVotesBtn.onclick = clearCurrentRound;
nextRoundBtn.onclick = nextRound;

init();
