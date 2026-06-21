const COLORS = [
    { id: 'red', name: '赤', en: 'Red', hex: '#C61111' },
    { id: 'blue', name: '青', en: 'Blue', hex: '#132ED2' },
    { id: 'green', name: '緑', en: 'Green', hex: '#11802D' },
    { id: 'pink', name: 'ピンク', en: 'Pink', hex: '#EE54BB' },
    { id: 'orange', name: 'オレンジ', en: 'Orange', hex: '#F07D0D' },
    { id: 'yellow', name: '黄色', en: 'Yellow', hex: '#F6F657' },
    { id: 'black', name: '黒', en: 'Black', hex: '#3F474E' },
    { id: 'white', name: '白', en: 'White', hex: '#D7E1F1' },
    { id: 'purple', name: '紫', en: 'Purple', hex: '#6B2FBC' },
    { id: 'brown', name: '茶', en: 'Brown', hex: '#71491E' },
    { id: 'cyan', name: 'シアン', en: 'Cyan', hex: '#38E2DD' },
    { id: 'lime', name: 'ライム', en: 'Lime', hex: '#50F039' },
    { id: 'maroon', name: '小豆', en: 'Maroon', hex: '#6B2B3C' },
    { id: 'rose', name: 'ローズ', en: 'Rose', hex: '#ECC0D3' },
    { id: 'banana', name: 'バナナ', en: 'Banana', hex: '#FFFDBE' },
    { id: 'gray', name: 'グレー', en: 'Gray', hex: '#8397A7' },
    { id: 'tan', name: 'タン', en: 'Tan', hex: '#9F9888' },
    { id: 'coral', name: 'コーラル', en: 'Coral', hex: '#EC7578' }
];

let state = {
    discardedIds: [],
    selectedIds: [],
    rounds: [{}],
    currentRoundIndex: 0,
    phase: 'selection',
    voteMode: 'haverole',
    sourceColorId: null,
    preferencePanelOpen: false,
    colorMemos: {},
    ejectedpedRanges: {},  // 追放カラー管理（指定ラウンド以降に反映） { colorId: 追放開始ラウンド番号 }
    excludedRanges: {}  // 死亡カラー管理（指定ラウンド以降に反映） { colorId: 死亡開始ラウンド番号 }
};

// --- DOM Elements ---
const selectionPhase = document.getElementById('selection-phase');
const votingPhase = document.getElementById('voting-phase');
const colorGridSelection = document.getElementById('color-grid-selection');
const colorGridVoting = document.getElementById('color-grid-voting');
const selectionCount = document.getElementById('selection-count');
const proceedBtn = document.getElementById('proceed-btn');
const roundTitle = document.getElementById('round-title');
const statusBar = document.getElementById('status-bar');
const sourceColorList = document.getElementById('source-color-list');
const roundMenu = document.getElementById('round-menu');
const resetBtn = document.getElementById('reset-btn');
const clearVotesBtn = document.getElementById('clear-votes-btn');
const nextRoundBtn = document.getElementById('next-round-btn');

const preferenceToggleBtn = document.getElementById('mode-preference-toggle');
const preferenceSubPanel = document.getElementById('preference-sub-panel');

const modeButtons = {
    haverole: document.getElementById('mode-haverole'),
    engineer: document.getElementById('mode-engineer'),
    scientist: document.getElementById('mode-scientist'),
    detective: document.getElementById('mode-detective'),
    tracker: document.getElementById('mode-tracker'),
    noisemaker: document.getElementById('mode-noisemaker'),
    no: document.getElementById('mode-usedbutton'),
    ejected: document.getElementById('mode-ejected'),
    exclude: document.getElementById('mode-death'),
    nokill: document.getElementById('mode-nokill'),
    notFit: document.getElementById('mode-not-fit')
};

// --- Initialization ---
function init() {
    loadState();
    render();
}

function loadState() {
    const saved = localStorage.getItem('colorVoteState_v8');
    if (saved) {
        state = JSON.parse(saved);
    }
    // 古いデータ構造からのマイグレーション・安全弁
    if (!state.colorMemos || typeof state.colorMemos !== 'object') state.colorMemos = {};
    if (!state.ejectedpedRanges || typeof state.ejectedpedRanges !== 'object') state.ejectedpedRanges = {};
    if (!state.excludedRanges || typeof state.excludedRanges !== 'object') state.excludedRanges = {};
}

function saveState() {
    localStorage.setItem('colorVoteState_v8', JSON.stringify(state));
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
    const prefModes = ['haverole', 'engineer', 'scientist', 'detective', 'tracker', 'noisemaker'];
    const currentRoundNum = state.currentRoundIndex + 1;
    
    if (prefModes.includes(state.voteMode)) {
        const currentRound = state.rounds[state.currentRoundIndex];
        const isAlreadyTargetMode = currentRound[targetId] && currentRound[targetId].vote === state.voteMode;

        state.rounds.forEach(round => {
            if (!round[targetId]) round[targetId] = { vote: null, tags: {} };
            round[targetId].vote = isAlreadyTargetMode ? null : state.voteMode;
        });
    } else if (state.voteMode === 'no') {
        const targetTagValue = `no-round-${currentRoundNum}`;
        const currentRound = state.rounds[state.currentRoundIndex];
        
        let hasAnyNoTag = false;
        if (currentRound[targetId] && currentRound[targetId].tags['global']) {
            hasAnyNoTag = currentRound[targetId].tags['global'].some(t => t.startsWith('no-round-'));
        }

        state.rounds.forEach(round => {
            if (!round[targetId]) round[targetId] = { vote: null, tags: {} };
            if (!round[targetId].tags['global']) round[targetId].tags['global'] = [];
            
            const arr = round[targetId].tags['global'];
            if (hasAnyNoTag) {
                round[targetId].tags['global'] = arr.filter(t => !t.startsWith('no-round-'));
            } else {
                if (!arr.includes(targetTagValue)) arr.push(targetTagValue);
            }
            if (round[targetId].tags['global'].length === 0) delete round[targetId].tags['global'];
        });
    } else if (state.voteMode === 'ejected') {
        // 追放処理（このラウンド以降に反映するトグル）
        if (state.ejectedpedRanges[targetId]) {
            delete state.ejectedpedRanges[targetId];
        } else {
            state.ejectedpedRanges[targetId] = currentRoundNum;
        }
    } else if (state.voteMode === 'exclude') {
        // 死亡処理（このラウンド以降に反映するトグル）
        if (state.excludedRanges[targetId]) {
            delete state.excludedRanges[targetId];
        } else {
            state.excludedRanges[targetId] = currentRoundNum;
        }
    } else if (state.voteMode === 'nokill' || state.voteMode === 'not-fit') {
        const round = state.rounds[state.currentRoundIndex];
        if (!round[targetId]) round[targetId] = { vote: null, tags: {} };
        const sourceId = state.sourceColorId;
        
        if (sourceId) {
            const tagValue = state.voteMode;
            if (!round[targetId].tags[sourceId]) round[targetId].tags[sourceId] = [];
            const arr = round[targetId].tags[sourceId];
            const idx = arr.indexOf(tagValue);

            if (idx > -1) {
                arr.splice(idx, 1);
            } else {
                if (tagValue === 'nokill') {
                    const notFitIdx = arr.indexOf('not-fit');
                    if (notFitIdx > -1) arr.splice(notFitIdx, 1);
                } else if (tagValue === 'not-fit') {
                    const nokillIdx = arr.indexOf('nokill');
                    if (nokillIdx > -1) arr.splice(nokillIdx, 1);
                }
                arr.push(tagValue);
            }
            if (arr.length === 0) delete round[targetId].tags[sourceId];
        }
    }
    saveState();
    render();
}

function selectSourceColor(id) {
    if (state.voteMode === 'no' || state.voteMode === 'ejected' || state.voteMode === 'exclude') return;
    state.sourceColorId = (state.sourceColorId === id) ? null : id;
    saveState();
    render();
}

function setVoteMode(mode) {
    state.voteMode = mode;
    const autoClearSourceModes = ['haverole', 'engineer', 'scientist', 'detective', 'tracker', 'noisemaker', 'no', 'ejected', 'exclude'];
    if (autoClearSourceModes.includes(mode)) {
        state.sourceColorId = null;
    }
    
    const prefModes = ['haverole', 'engineer', 'scientist', 'detective', 'tracker', 'noisemaker'];
    state.preferencePanelOpen = prefModes.includes(mode);
    
    saveState();
    render();
}

function togglePreferencePanel() {
    state.preferencePanelOpen = !state.preferencePanelOpen;
    const prefModes = ['haverole', 'engineer', 'scientist', 'detective', 'tracker', 'noisemaker'];
    if (state.preferencePanelOpen && !prefModes.includes(state.voteMode)) {
        state.voteMode = 'haverole';
    }
    saveState();
    render();
}

function nextRound() {
    const newRound = {};
    const currentRound = state.rounds[state.currentRoundIndex] || {};
    
    state.selectedIds.forEach(targetId => {
        if (currentRound[targetId]) {
            newRound[targetId] = {
                vote: currentRound[targetId].vote,
                tags: {}
            };
            if (currentRound[targetId].tags['global']) {
                newRound[targetId].tags['global'] = [...currentRound[targetId].tags['global']];
            }
        }
    });

    state.rounds.push(newRound);
    state.currentRoundIndex = state.rounds.length - 1;
    saveState();
    render();
}

function goToRound(index) {
    state.currentRoundIndex = index;
    saveState();
    render();
}

// データリセット
function resetAll() {
    if (confirm('全てのデータをリセットして最初からやり直しますか？')) {
        state = {
            discardedIds: [],
            selectedIds: [],
            rounds: [{}],
            currentRoundIndex: 0,
            phase: 'selection',
            voteMode: 'haverole',
            sourceColorId: null,
            preferencePanelOpen: false,
            colorMemos: {},
            ejectedpedRanges: {},
            excludedRanges: {}
        };
        localStorage.removeItem('colorVoteState_v8');
        saveState();
        render();
    }
}

function clearCurrentRound() {
    const round = state.rounds[state.currentRoundIndex];
    Object.keys(round).forEach(targetId => {
        Object.keys(round[targetId].tags).forEach(sourceId => {
            if (sourceId !== 'global') delete round[targetId].tags[sourceId];
        });
    });
    saveState();
    render();
}

// --- Rendering ---
function render() {
    if (state.phase === 'selection') {
        if(selectionPhase) selectionPhase.classList.remove('hidden');
        if(votingPhase) votingPhase.classList.add('hidden');
        renderSelectionGrid();
    } else {
        if(selectionPhase) selectionPhase.classList.add('hidden');
        if(votingPhase) votingPhase.classList.remove('hidden');
        renderVotingGrid();
        renderSourceList();
        renderRoundMenu();
    }

    if(selectionCount) selectionCount.textContent = state.discardedIds.length;
    if(proceedBtn) proceedBtn.disabled = state.discardedIds.length !== 3;

    if (preferenceSubPanel && preferenceToggleBtn) {
        if (state.preferencePanelOpen) {
            preferenceSubPanel.classList.remove('hidden');
            preferenceToggleBtn.classList.add('active');
            preferenceToggleBtn.textContent = '役職▲';
        } else {
            preferenceSubPanel.classList.add('hidden');
            preferenceToggleBtn.classList.remove('active');
            preferenceToggleBtn.textContent = '役職▲';
        }
    }

    Object.keys(modeButtons).forEach(k => {
        if (modeButtons[k]) {
            modeButtons[k].classList.toggle('active', state.voteMode === k);
        }
    });
    
    const prefModes = ['haverole', 'engineer', 'scientist', 'detective', 'tracker', 'noisemaker'];
    if (preferenceToggleBtn) {
        preferenceToggleBtn.classList.toggle('active', prefModes.includes(state.voteMode));
    }

    updateStatusBar();
}

function updateStatusBar() {
    if (!statusBar) return;
    const isTagMode = state.voteMode === 'nokill' || state.voteMode === 'not-fit' || state.voteMode === 'no' || state.voteMode === 'ejected' || state.voteMode === 'exclude';
    /*if (isTagMode) {
        if (state.voteMode === 'no') {
            statusBar.textContent = 'ダメ モード：中央の色をクリックして全ラウンド共通の「ダメ ✖」タグを付与します';
        } else if (state.voteMode === 'ejected') {
            statusBar.textContent = '追放 モード：カラーをクリックして、このラウンド以降の画面から半透明化（最下部へ移動）します';
        } else if (state.voteMode === 'exclude') {
            statusBar.textContent = '死亡 モード：カラーをクリックして、このラウンド以降の画面から非活性化（最下部へ移動）します';
        } else {
            if (!state.sourceColorId) {
                statusBar.textContent = '左のリストから元の色（ソース）を選んでください';
            } else {
                const sourceColor = COLORS.find(c => c.id === state.sourceColorId);
                statusBar.textContent = `[${sourceColor ? sourceColor.name : ''}] に対して ${state.voteMode === 'nokill' ? '合う' : '合わない'} 色を中央から選んでください`;
            }
        }
    } else {
        let modeText = '';
        if (state.voteMode === 'haverole') modeText = '役職持ち';
        if (state.voteMode === 'engineer') modeText = 'エンジニア';
        if (state.voteMode === 'scientist') modeText = '科学者';
        if (state.voteMode === 'detective') modeText = '探偵';
        if (state.voteMode === 'tracker') modeText = 'トラッカー';
        if (state.voteMode === 'noisemaker') modeText = 'ノイズメーカー';
        statusBar.textContent = `${modeText} モード：中央の色をクリックしてください`;
    }*/
}

function renderSelectionGrid() {
    if (!colorGridSelection) return;
    colorGridSelection.innerHTML = '';
    COLORS.forEach(color => {
        const isDiscarded = state.discardedIds.includes(color.id);
        const card = document.createElement('div');
        card.className = `color-card ${isDiscarded ? 'selected' : ''}`;
        
        let badgeHtml = '';
        if (isDiscarded) {
            badgeHtml = '<div class="selection-badge">✖ 死亡</div>';
        }

        card.innerHTML = `
            ${badgeHtml}
            <div class="swatch" style="background-color: ${color.hex}"></div>
            <div class="color-name">${color.name}</div>
        `;
        card.onclick = () => toggleDiscardColor(color.id);
        colorGridSelection.appendChild(card);
    });
}

function renderVotingGrid() {
    if (!colorGridVoting) return;
    colorGridVoting.innerHTML = '';
    const round = state.rounds[state.currentRoundIndex] || {};
    const selectedColors = COLORS.filter(c => state.selectedIds.includes(c.id));
    const currentRoundNum = state.currentRoundIndex + 1;
    
    // 3段階並び替えロジック（通常(0) < 現在追放(1) < 現在死亡(2)）
    const sortedColors = [...selectedColors].sort((a, b) => {
        const aejectedped = (state.ejectedpedRanges[a.id] && currentRoundNum >= state.ejectedpedRanges[a.id]) ? 1 : 0;
        const bejectedped = (state.ejectedpedRanges[b.id] && currentRoundNum >= state.ejectedpedRanges[b.id]) ? 1 : 0;
        
        const aExcluded = (state.excludedRanges[a.id] && currentRoundNum >= state.excludedRanges[a.id]) ? 2 : 0;
        const bExcluded = (state.excludedRanges[b.id] && currentRoundNum >= state.excludedRanges[b.id]) ? 2 : 0;
        
        const scoreA = Math.max(aejectedped, aExcluded);
        const scoreB = Math.max(bejectedped, bExcluded);
        return scoreA - scoreB;
    });
    
    sortedColors.forEach(color => {
        const data = round[color.id] || { vote: null, tags: {} };
        const card = document.createElement('div');
        
        // 現在のラウンド番号が、設定された開始ラウンド以上かどうかで状態判定
        const isejectedpedNow = (state.ejectedpedRanges[color.id] && currentRoundNum >= state.ejectedpedRanges[color.id]);
        const isExcludedNow = (state.excludedRanges[color.id] && currentRoundNum >= state.excludedRanges[color.id]);
        
        if (isExcludedNow) {
            card.className = 'color-card excluded';
        } else if (isejectedpedNow) {
            card.className = 'color-card ejectedped';
        } else {
            card.className = 'color-card';
        }
        
        let globalTagsHtml = '';
        
        // 過去の歴史に関わらず、設定されていれば何ラウンド目から死亡・追放したかのタグを常時表示
        if (state.excludedRanges[color.id]) {
            globalTagsHtml += `<div class="tag exclude-tag" style="margin-bottom: 8px;">死亡 🚫 (第${state.excludedRanges[color.id]}回～)</div>`;
        }
        if (state.ejectedpedRanges[color.id]) {
            globalTagsHtml += `<div class="tag ejected-tag" style="margin-bottom: 8px;">追放 🏴 (第${state.ejectedpedRanges[color.id]}回～)</div>`;
        }
        
        // ダメタグ
        if (data.tags['global']) {
            const values = Array.isArray(data.tags['global']) ? data.tags['global'] : [data.tags['global']];
            values.forEach(type => {
                if (type.startsWith('no-round-')) {
                    const rNum = type.replace('no-round-', '');
                    globalTagsHtml += `<div class="tag no" style="margin-bottom: 8px;">ボタン使用済み (第${rNum}回)</div>`;
                }
            });
        }

        let voteTagHtml = '<div class="vote-tag-placeholder"></div>';
        if (data.vote === 'haverole') voteTagHtml = '<div class="tag like-tag">⭐ 役職持ち</div>';
        else if (data.vote === 'engineer') voteTagHtml = '<div class="tag like-tag">🔧 エンジ</div>';
        else if (data.vote === 'scientist') voteTagHtml = '<div class="tag like-tag">🧪 科学者</div>';
        else if (data.vote === 'detective') voteTagHtml = '<div class="tag like-tag">🔍 探偵</div>';
        else if (data.vote === 'tracker') voteTagHtml = '<div class="tag like-tag">🐾 トラカ</div>';
        else if (data.vote === 'noisemaker') voteTagHtml = '<div class="tag like-tag">🔊 ノイズ</div>';

        let relationTagsHtml = '';
        let hasRelation = false;
        Object.keys(data.tags).forEach(sourceId => {
            if (sourceId === 'global') return;
            const sourceColor = COLORS.find(c => c.id === sourceId);
            if (!sourceColor) return;

            const values = Array.isArray(data.tags[sourceId]) ? data.tags[sourceId] : [data.tags[sourceId]];
            values.forEach(type => {
                let label = '';
                if (type === 'nokill') label = '無理';
                else if (type === 'not-fit') label = '→不';
                relationTagsHtml += `<div class="tag ${type}">${sourceColor.name}から${label}</div>`;
                hasRelation = true;
            });
        });

        let relationContainerHtml = '';
        if (hasRelation) {
            relationContainerHtml = `
                <div class="card-tags-container">
                    <div class="relation-tags">
                        ${relationTagsHtml}
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            ${globalTagsHtml}
            <div class="card-main-row">
                <div class="vote-tag-container">
                    ${voteTagHtml}
                </div>
                <div class="color-core-info">
                    <div class="swatch" style="background-color: ${color.hex}; margin: 0;"></div>
                    <div class="color-name" style="margin-top: 4px;">${color.name}</div>
                </div>
                <div style="flex: 1;"></div>
            </div>
            ${relationContainerHtml}
        `;
        
        const textarea = document.createElement('textarea');
        textarea.className = 'color-memo-input';
        textarea.placeholder = 'メモを入力...';
        textarea.setAttribute('data-color-id', color.id);
        textarea.value = state.colorMemos[color.id] || '';
        
        textarea.oninput = (e) => {
            state.colorMemos[color.id] = e.target.value;
            saveState();
        };
        
        textarea.onclick = (e) => e.stopPropagation();
        textarea.onmousedown = (e) => e.stopPropagation();
        textarea.onkeydown = (e) => e.stopPropagation();

        card.appendChild(textarea);
        card.onclick = () => handleVote(color.id);
        colorGridVoting.appendChild(card);
    });
}

function renderSourceList() {
    if (!sourceColorList) return;
    sourceColorList.innerHTML = '';
    const selectedColors = COLORS.filter(c => state.selectedIds.includes(c.id));
    selectedColors.forEach(color => {
        const item = document.createElement('div');
        item.className = `source-item ${state.sourceColorId === color.id ? 'active' : ''}`;
        
        if (state.voteMode === 'no' || state.voteMode === 'ejected' || state.voteMode === 'exclude') {
            item.style.opacity = '0.5';
            item.style.cursor = 'not-allowed';
        } else {
            item.style.opacity = '1';
            item.style.cursor = 'pointer';
        }
        item.innerHTML = `
            <div class="mini-swatch" style="background-color: ${color.hex}"></div>
            <span>${color.name}</span>
        `;
        item.onclick = () => selectSourceColor(color.id);
        sourceColorList.appendChild(item);
    });
}

function renderRoundMenu() {
    if (!roundMenu) return;
    roundMenu.innerHTML = '';
    state.rounds.forEach((_, i) => {
        const item = document.createElement('div');
        item.className = `round-item ${state.currentRoundIndex === i ? 'active' : ''}`;
        item.textContent = `第${i + 1}回`;
        item.onclick = () => goToRound(i);
        roundMenu.appendChild(item);
    });
    if(roundTitle) roundTitle.textContent = `第${state.currentRoundIndex + 1}回 投票画面`;
}

// --- Event Listeners ---
if(proceedBtn) proceedBtn.onclick = proceedToVoting;
if(preferenceToggleBtn) preferenceToggleBtn.onclick = togglePreferencePanel;

if(modeButtons.haverole) modeButtons.haverole.onclick = () => setVoteMode('haverole');
if(modeButtons.engineer) modeButtons.engineer.onclick = () => setVoteMode('engineer');
if(modeButtons.scientist) modeButtons.scientist.onclick = () => setVoteMode('scientist');
if(modeButtons.detective) modeButtons.detective.onclick = () => setVoteMode('detective');
if(modeButtons.tracker) modeButtons.tracker.onclick = () => setVoteMode('tracker');
if(modeButtons.noisemaker) modeButtons.noisemaker.onclick = () => setVoteMode('noisemaker');
if(modeButtons.no) modeButtons.no.onclick = () => setVoteMode('no');
if(modeButtons.ejected) modeButtons.ejected.onclick = () => setVoteMode('ejected');
if(modeButtons.exclude) modeButtons.exclude.onclick = () => setVoteMode('exclude');
if(modeButtons.nokill) modeButtons.nokill.onclick = () => setVoteMode('nokill');
if(modeButtons.notFit) modeButtons.notFit.onclick = () => setVoteMode('not-fit');

if(resetBtn) resetBtn.onclick = resetAll;
if(clearVotesBtn) clearVotesBtn.onclick = clearCurrentRound;
if(nextRoundBtn) nextRoundBtn.onclick = nextRound;

init();