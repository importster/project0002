const COLORS = [
    { id: 'red', name: '赤', en: 'Red', hex: '#C61111' },
    { id: 'blue', name: '青', en: 'Blue', hex: '#132ED2' },
    { id: 'green', name: '緑', en: 'Green', hex: '#11802D' },
    { id: 'pink', name: 'ピンク', en: 'Pink', hex: '#EE54BB' },
    { id: 'orange', name: 'オレンジ', en: 'Orange', hex: '#F07D0D' },
    { id: 'yellow', name: 'イエロー', en: 'Yellow', hex: '#F6F657' },
    { id: 'black', name: 'ブラック', en: 'Black', hex: '#3F474E' },
    { id: 'white', name: 'ホワイト', en: 'White', hex: '#D7E1F1' },
    { id: 'purple', name: '紫', en: 'Purple', hex: '#6B2FBC' },
    { id: 'brown', name: 'ブラウン', en: 'Brown', hex: '#71491E' },
    { id: 'cyan', name: 'シアン', en: 'Cyan', hex: '#38E2DD' },
    { id: 'lime', name: 'ライム', en: 'Lime', hex: '#50F039' },
    { id: 'maroon', name: 'マルーン', en: 'Maroon', hex: '#6B2B3C' },
    { id: 'rose', name: 'ローズ', en: 'Rose', hex: '#ECC0D3' },
    { id: 'banana', name: 'バナナ', en: 'Banana', hex: '#FFFDBE' },
    { id: 'gray', name: 'グレー', en: 'Gray', hex: '#8397A7' },
    { id: 'tan', name: 'タン', en: 'Tan', hex: '#9F9888' },
    { id: 'coral', name: 'コーラル', en: 'Coral', hex: '#EC7578' }
];

let state = {
    discardedIds: [], // Phase 1: 3 colors to remove
    selectedIds: [],  // The 15 colors to keep
    rounds: [{}],     // { colorId: { vote, no, tags: { sourceColorId: 'fit'|'not-fit' } } }
    currentRoundIndex: 0,
    phase: 'selection',
    voteMode: 'like',
    sourceColorId: null // For tagging
};

// --- DOM Elements ---
const selectionPhase = document.getElementById('selection-phase');
const votingPhase = document.getElementById('voting-phase');
const colorGridSelection = document.getElementById('color-grid-selection');
const colorGridVoting = document.getElementById('color-grid-voting');
const selectionCount = document.getElementById('selection-count');
const proceedBtn = document.getElementById('proceed-btn');
const roundTitle = document.getElementById('round-title');
const modeButtons = {
    like: document.getElementById('mode-like'),
    dislike: document.getElementById('mode-dislike'),
    no: document.getElementById('mode-no'),
    fit: document.getElementById('mode-fit'),
    notFit: document.getElementById('mode-not-fit')
};
const statusBar = document.getElementById('status-bar');
const sourceColorList = document.getElementById('source-color-list');
const roundMenu = document.getElementById('round-menu');
const resetBtn = document.getElementById('reset-btn');
const clearVotesBtn = document.getElementById('clear-votes-btn');
const nextRoundBtn = document.getElementById('next-round-btn');

// --- Initialization ---
function init() {
    loadState();
    render();
}

function loadState() {
    const saved = localStorage.getItem('colorVoteState_v3');
    if (saved) {
        state = JSON.parse(saved);
    }
}

function saveState() {
    localStorage.setItem('colorVoteState_v3', JSON.stringify(state));
}

// --- Logic ---
function toggleDiscardColor(id) {
    const index = state.discardedIds.indexOf(id);
    if (index > -1) {
        state.discardedIds.splice(index, 1);
    } else if (state.discardedIds.length < 3) {
        state.discardedIds.push(id);
    }
    saveState();
    render();
}

function proceedToVoting() {
    state.selectedIds = COLORS.filter(c => !state.discardedIds.includes(c.id)).map(c => c.id);
    state.phase = 'voting';
    saveState();
    render();
}

function handleVote(targetId) {
    const round = state.rounds[state.currentRoundIndex];
    if (!round[targetId]) round[targetId] = { vote: null, no: false, tags: {} };

    if (state.voteMode === 'like' || state.voteMode === 'dislike') {
        round[targetId].vote = (round[targetId].vote === state.voteMode) ? null : state.voteMode;
    } else if (state.voteMode === 'no') {
        round[targetId].no = !round[targetId].no;
    } else if (state.voteMode === 'fit' || state.voteMode === 'not-fit') {
        if (state.sourceColorId) {
            const tagValue = (state.voteMode === 'fit') ? 'fit' : 'not-fit';
            if (round[targetId].tags[state.sourceColorId] === tagValue) {
                delete round[targetId].tags[state.sourceColorId];
            } else {
                round[targetId].tags[state.sourceColorId] = tagValue;
            }
        }
    }
    saveState();
    render();
}

function selectSourceColor(id) {
    state.sourceColorId = (state.sourceColorId === id) ? null : id;
    saveState();
    render();
}

function setVoteMode(mode) {
    state.voteMode = mode;
    if (mode !== 'fit' && mode !== 'not-fit') {
        state.sourceColorId = null;
    }
    saveState();
    render();
}

function nextRound() {
    state.rounds.push({});
    state.currentRoundIndex = state.rounds.length - 1;
    saveState();
    render();
}

function goToRound(index) {
    state.currentRoundIndex = index;
    saveState();
    render();
}

function resetAll() {
    if (confirm('全てのデータをリセットして最初からやり直しますか？')) {
        state = {
            discardedIds: [],
            selectedIds: [],
            rounds: [{}],
            currentRoundIndex: 0,
            phase: 'selection',
            voteMode: 'like',
            sourceColorId: null
        };
        localStorage.removeItem('colorVoteState_v3');
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
        renderSourceList();
        renderRoundMenu();
    }

    // Phase 1 UI
    selectionCount.textContent = state.discardedIds.length;
    proceedBtn.disabled = state.discardedIds.length !== 3;

    // Phase 2 UI
    Object.keys(modeButtons).forEach(m => {
        modeButtons[m].classList.toggle('active', state.voteMode === (m === 'notFit' ? 'not-fit' : m));
    });

    updateStatusBar();
}

function updateStatusBar() {
    if (state.voteMode === 'fit' || state.voteMode === 'not-fit') {
        if (!state.sourceColorId) {
            statusBar.textContent = '左のリストから元の色（ソース）を選んでください';
        } else {
            const sourceColor = COLORS.find(c => c.id === state.sourceColorId);
            statusBar.textContent = `[${sourceColor.name}] に対して ${state.voteMode === 'fit' ? '合う' : '合わない'} 色を中央から選んでください`;
        }
    } else {
        statusBar.textContent = `${state.voteMode === 'like' ? '好き' : state.voteMode === 'dislike' ? '嫌い' : 'ダメ'} モード実行中：中央の色をクリックしてください`;
    }
}

function renderSelectionGrid() {
    colorGridSelection.innerHTML = '';
    COLORS.forEach(color => {
        const card = document.createElement('div');
        card.className = `color-card ${state.discardedIds.includes(color.id) ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="swatch" style="background-color: ${color.hex}"></div>
            <div class="color-name">${color.name}</div>
        `;
        card.onclick = () => toggleDiscardColor(color.id);
        colorGridSelection.appendChild(card);
    });
}

function renderVotingGrid() {
    colorGridVoting.innerHTML = '';
    const round = state.rounds[state.currentRoundIndex] || {};
    const selectedColors = COLORS.filter(c => state.selectedIds.includes(c.id));
    
    selectedColors.forEach(color => {
        const data = round[color.id] || { vote: null, no: false, tags: {} };
        const card = document.createElement('div');
        card.className = 'color-card';
        
        // バッジ
        let badgesHtml = '<div class="badge-container">';
        if (data.vote === 'like') badgesHtml += '<div class="vote-badge">❤️</div>';
        if (data.vote === 'dislike') badgesHtml += '<div class="vote-badge">💔</div>';
        if (data.no) badgesHtml += '<div class="vote-badge">✖</div>';
        badgesHtml += '</div>';

        // タグ
        let tagsHtml = '<div class="tag-list">';
        Object.keys(data.tags).forEach(sourceId => {
            const sourceColor = COLORS.find(c => c.id === sourceId);
            const type = data.tags[sourceId];
            tagsHtml += `<div class="tag ${type}">${sourceColor.name} ${type === 'fit' ? '→合' : '→×'}</div>`;
        });
        tagsHtml += '</div>';

        card.innerHTML = `
            ${badgesHtml}
            <div class="swatch" style="background-color: ${color.hex}"></div>
            <div class="color-name">${color.name}</div>
            ${tagsHtml}
        `;
        card.onclick = () => handleVote(color.id);
        colorGridVoting.appendChild(card);
    });
}

function renderSourceList() {
    sourceColorList.innerHTML = '';
    const selectedColors = COLORS.filter(c => state.selectedIds.includes(c.id));
    selectedColors.forEach(color => {
        const item = document.createElement('div');
        item.className = `source-item ${state.sourceColorId === color.id ? 'active' : ''}`;
        item.innerHTML = `
            <div class="mini-swatch" style="background-color: ${color.hex}"></div>
            <span>${color.name}</span>
        `;
        item.onclick = () => selectSourceColor(color.id);
        sourceColorList.appendChild(item);
    });
}

function renderRoundMenu() {
    roundMenu.innerHTML = '';
    state.rounds.forEach((_, i) => {
        const item = document.createElement('div');
        item.className = `round-item ${state.currentRoundIndex === i ? 'active' : ''}`;
        item.textContent = `第${i + 1}回`;
        item.onclick = () => goToRound(i);
        roundMenu.appendChild(item);
    });
    roundTitle.textContent = `第${state.currentRoundIndex + 1}回 投票画面`;
}

// --- Event Listeners ---
proceedBtn.onclick = proceedToVoting;
modeButtons.like.onclick = () => setVoteMode('like');
modeButtons.dislike.onclick = () => setVoteMode('dislike');
modeButtons.no.onclick = () => setVoteMode('no');
modeButtons.fit.onclick = () => setVoteMode('fit');
modeButtons.notFit.onclick = () => setVoteMode('not-fit');
resetBtn.onclick = resetAll;
clearVotesBtn.onclick = clearCurrentRound;
nextRoundBtn.onclick = nextRound;

init();
