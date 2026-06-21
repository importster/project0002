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
    rounds: [{}],     // { colorId: { vote, tags: { sourceColorId: 'fit'|'not-fit'|'no' } } }
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
    if (!round[targetId]) round[targetId] = { vote: null, tags: {} };

    if (state.voteMode === 'like' || state.voteMode === 'dislike') {
        round[targetId].vote = (round[targetId].vote === state.voteMode) ? null : state.voteMode;
    } else if (state.voteMode === 'no' || state.voteMode === 'fit' || state.voteMode === 'not-fit') {
        const sourceId = (state.voteMode === 'no') ? (state.sourceColorId || 'global') : state.sourceColorId;
        
        if (sourceId) {
            const tagValue = state.voteMode;
            
            // Ensure tags[sourceColorId] is an array (with migration path from old string state)
            if (!round[targetId].tags[sourceId]) {
                round[targetId].tags[sourceId] = [];
            } else if (!Array.isArray(round[targetId].tags[sourceId])) {
                round[targetId].tags[sourceId] = [round[targetId].tags[sourceId]];
            }

            const arr = round[targetId].tags[sourceId];
            const idx = arr.indexOf(tagValue);

            if (idx > -1) {
                arr.splice(idx, 1);
            } else {
                // Mutual exclusivity check: 'fit' and 'not-fit' should not overlap
                if (tagValue === 'fit') {
                    const notFitIdx = arr.indexOf('not-fit');
                    if (notFitIdx > -1) arr.splice(notFitIdx, 1);
                } else if (tagValue === 'not-fit') {
                    const fitIdx = arr.indexOf('fit');
                    if (fitIdx > -1) arr.splice(fitIdx, 1);
                }
                arr.push(tagValue);
            }

            // Clean up empty tag array
            if (arr.length === 0) {
                delete round[targetId].tags[sourceId];
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
    if (mode === 'like' || mode === 'dislike') {
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
    const isTagMode = state.voteMode === 'fit' || state.voteMode === 'not-fit' || state.voteMode === 'no';
    if (isTagMode) {
        if (state.voteMode === 'no') {
            if (!state.sourceColorId) {
                statusBar.textContent = 'ダメ モード：中央の色をクリックして単体の「ダメ ✖」タグを付与します（左の色を選択すると相性タグになります）';
            } else {
                const sourceColor = COLORS.find(c => c.id === state.sourceColorId);
                statusBar.textContent = `[${sourceColor.name}] に対して ダメ（✖）な色を中央から選んでください`;
            }
        } else {
            if (!state.sourceColorId) {
                statusBar.textContent = '左のリストから元の色（ソース）を選んでください';
            } else {
                const sourceColor = COLORS.find(c => c.id === state.sourceColorId);
                statusBar.textContent = `[${sourceColor.name}] に対して ${state.voteMode === 'fit' ? '合う' : '合わない'} 色を中央から選んでください`;
            }
        }
    } else {
        statusBar.textContent = `${state.voteMode === 'like' ? '好き' : '嫌い'} モード：中央の色をクリックしてください`;
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
        const data = round[color.id] || { vote: null, tags: {} };
        const card = document.createElement('div');
        card.className = 'color-card';
        
        // バッジ
        let badgesHtml = '<div class="badge-container">';
        if (data.vote === 'like') badgesHtml += '<div class="vote-badge">❤️</div>';
        if (data.vote === 'dislike') badgesHtml += '<div class="vote-badge">💔</div>';
        badgesHtml += '</div>';

        // タグ
        let tagsHtml = '<div class="tag-list">';
        Object.keys(data.tags).forEach(sourceId => {
            const sourceColor = COLORS.find(c => c.id === sourceId);
            if (!sourceColor && sourceId !== 'global') return;

            const values = Array.isArray(data.tags[sourceId])
                ? data.tags[sourceId]
                : [data.tags[sourceId]]; // support old string format if any

            values.forEach(type => {
                let label = '';
                if (type === 'fit') label = '→合';
                else if (type === 'not-fit') label = '→不';
                else if (type === 'no') label = '→×';
                
                if (sourceId === 'global') {
                    tagsHtml += `<div class="tag ${type}">ダメ ✖</div>`;
                } else if (sourceColor) {
                    tagsHtml += `<div class="tag ${type}">${sourceColor.name} ${label}</div>`;
                }
            });
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
