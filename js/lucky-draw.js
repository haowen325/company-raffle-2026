document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const prizeInput = document.getElementById('prizeInput');
    const nameInput = document.getElementById('nameInput');
    const titleInput = document.getElementById('titleInput');
    const groupTitleInput = document.getElementById('groupTitleInput'); // New
    const subtitleInput = document.getElementById('subtitleInput'); // New
    const allowRepeatCheckbox = document.getElementById('allowRepeat');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    // Header Section
    const headerTitle = document.getElementById('headerTitle');
    const groupTitleDisplay = document.getElementById('groupTitleDisplay');
    const subtitleDisplay = document.getElementById('subtitleDisplay');

    // Tabs & Panels
    const tabDraw = document.getElementById('tabDraw');
    const tabSettings = document.getElementById('tabSettings');
    const drawModePanel = document.getElementById('drawModePanel');
    const settingsModePanel = document.getElementById('settingsModePanel');
    const prizeListDisplay = document.getElementById('prizeListDisplay');
    const settingsHistoryList = document.getElementById('settingsHistoryList'); // New

    // Main Display (inside content)
    const currentPrizeLabel = document.getElementById('currentPrizeLabel');
    const winnerDisplay = document.getElementById('winnerDisplay');
    const celebrationOverlay = document.getElementById('celebrationOverlay'); // New
    const celebrationPrize = document.getElementById('celebrationPrize'); // New
    const celebrationWinner = document.getElementById('celebrationWinner'); // New
    const mainActionBtn = document.getElementById('mainActionBtn');
    const resetBtn = document.getElementById('resetBtn');
    const resultsList = document.getElementById('resultsList');
    const drawAllowRepeatCheckbox = document.getElementById('drawAllowRepeat');
    const sheetsUrlInput = document.getElementById('sheetsUrlInput'); // New
    const eventDateInput = document.getElementById('eventDateInput'); // New

    // Modal Elements
    // Modal & Quick Add Elements
    const remainingModal = document.getElementById('remainingModal');
    const viewParticipantsBtn = document.getElementById('viewParticipantsBtn');
    const closeSpan = document.querySelector('.close-modal');
    const remainingList = document.getElementById('remainingList');
    const quickAddPrizeBtn = document.getElementById('quickAddPrizeBtn');

    // --- State ---

    let prizeConfig = [];
    let participants = [];
    let allParticipants = [];
    let prizeDrawCounts = {};
    let resultsHistory = []; // { prizeId, prizeName, winnerName, timestamp } - Current list
    let persistentHistory = []; // Backup of all draws until cleared
    let isRolling = false;
    let rollInterval;
    let selectedPrizeIndex = -1;
    let isStopping = false;

    // --- Sample Data ---
    const samplePrizes = [
        "特獎：Apple iPhone 15 Pro (256GB) x 1",
        "頭獎：Sony 65吋 4K 智慧電視 x 1",
        "二獎：Dyson 無線吸塵器 x 2",
        "三獎：Switch OLED 遊戲主機 x 3",
        "四獎：百貨公司禮券 5,000元 x 5",
        "五獎：高級空氣清淨機 x 5",
        "六獎：星巴克隨行杯 x 10",
        "安慰獎：現金紅包 2,000元 x 20"
    ];

    const sampleNames = [
        "陳建弘", "林怡君", "黃志明", "張雅婷", "李俊傑", "王淑芬",
        "吳冠宇", "劉惠雯", "蔡志強", "楊佩珊", "許家豪", "鄭婉婷",
        "謝明哲", "洪佳琪", "郭瑋倫", "曾筱涵", "賴建國", "廖美玲",
        "徐家瑋", "周怡萱", "袁志忠", "鄧雅雯", "彭冠廷", "鍾宜君",
        "蘇郁婷", "葉冠宏", "莊欣怡", "呂建宏", "江佳穎", "何志偉"
    ];

    // --- DOM Elements for New Inputs ---
    const prizeRowsContainer = document.getElementById('prizeRowsContainer');
    const addPrizeRowBtn = document.getElementById('addPrizeRowBtn');

    // Quick Add Modal Elements
    const quickAddModal = document.getElementById('quickAddModal');
    const closeQuickAdd = document.querySelector('.close-quick-add');
    const confirmQuickAddBtn = document.getElementById('confirmQuickAddBtn');
    const qaTitle = document.getElementById('qaTitle');
    const qaContent = document.getElementById('qaContent');
    const qaCount = document.getElementById('qaCount');

    // --- Initialization ---
    function init() {
        // Initial Load from Samples to Config
        initFromSamples();

        // Render
        renderPrizeSettingsRows();
        renderPrizeList();
        updateUIState();

        setupModal();
        setupQuickAdd();
        setupSettingsRowActions();
    }

    function initFromSamples() {
        const rawPrizes = samplePrizes;
        prizeConfig = rawPrizes.map((line, index) => parseSinglePrizeLine(line, index));
        allParticipants = sampleNames;
        participants = [...allParticipants];

        // Init counts
        prizeDrawCounts = {};
        prizeConfig.forEach(p => prizeDrawCounts[p.id] = 0);

        // Load Sheets URL from LocalStorage
        const savedUrl = localStorage.getItem('lucky_draw_sheets_url');
        if (savedUrl && sheetsUrlInput) {
            sheetsUrlInput.value = savedUrl;
        }

        const savedGroupTitle = localStorage.getItem('lucky_draw_group_title');
        if (savedGroupTitle && groupTitleInput) {
            groupTitleInput.value = savedGroupTitle;
        }

        const savedSubtitle = localStorage.getItem('lucky_draw_subtitle');
        if (savedSubtitle && subtitleInput) {
            subtitleInput.value = savedSubtitle;
        }

        // Set default Event Date to today
        if (eventDateInput) {
            eventDateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    // --- Settings UI Logic ---
    function setupSettingsRowActions() {
        if (addPrizeRowBtn) {
            addPrizeRowBtn.addEventListener('click', () => {
                addSettingsRow();
            });
        }
    }

    function addSettingsRow(data = { title: '', content: '', total: 1 }) {
        const row = document.createElement('div');
        row.className = 'prize-row';
        row.innerHTML = `
            <input type="text" class="row-title" placeholder="獎項名稱(特獎)" value="${data.title}">
            <input type="text" class="row-content" placeholder="獎品內容(iPhone)" value="${data.content}">
            <input type="number" class="row-count" placeholder="數量" value="${data.total}" min="1">
            <button class="delete-row-btn" title="刪除">&times;</button>
        `;

        row.querySelector('.delete-row-btn').addEventListener('click', () => {
            row.remove();
        });

        prizeRowsContainer.appendChild(row);
    }

    function renderPrizeSettingsRows() {
        prizeRowsContainer.innerHTML = '';
        prizeConfig.forEach(p => {
            addSettingsRow({
                title: p.title,
                content: p.content,
                total: p.total
            });
        });
    }

    function readPrizeSettingsRows() {
        const rows = document.querySelectorAll('.prize-row');
        const newConfig = [];
        rows.forEach((row, index) => {
            const title = row.querySelector('.row-title').value.trim();
            const content = row.querySelector('.row-content').value.trim();
            const count = parseInt(row.querySelector('.row-count').value.trim()) || 1;

            if (title || content) {
                newConfig.push({
                    id: index,
                    title: title,
                    content: content,
                    name: `${title}${content ? '：' + content : ''}`, // Fallback Fullname
                    total: count
                });
            }
        });
        return newConfig;
    }

    // --- Quick Add Logic (New Modal) ---
    function setupQuickAdd() {
        if (quickAddPrizeBtn) {
            quickAddPrizeBtn.addEventListener('click', () => {
                if (isRolling || isStopping) return;
                // Reset inputs
                qaTitle.value = "";
                qaContent.value = "";
                qaCount.value = "1";
                quickAddModal.style.display = 'flex';
                qaTitle.focus();
            });
        }

        if (closeQuickAdd) {
            closeQuickAdd.addEventListener('click', () => {
                quickAddModal.style.display = 'none';
            });
        }

        if (confirmQuickAddBtn) {
            confirmQuickAddBtn.addEventListener('click', () => {
                const title = qaTitle.value.trim();
                const content = qaContent.value.trim();
                const count = parseInt(qaCount.value) || 1;

                if (!title) {
                    alert("請輸入獎項標題！");
                    return;
                }

                // Add to Config
                const newId = prizeConfig.length > 0 ? Math.max(...prizeConfig.map(p => p.id)) + 1 : 0;
                const newPrize = {
                    id: newId,
                    title: title,
                    content: content,
                    name: `${title}${content ? '：' + content : ''}`,
                    total: count
                };

                prizeConfig.push(newPrize);
                prizeDrawCounts[newId] = 0;

                // Sync UI
                renderPrizeList();
                addSettingsRow(newPrize); // Add to Settings List immediately

                quickAddModal.style.display = 'none';
                alert(`已加碼：${title} x ${count}`);
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target == quickAddModal) {
                quickAddModal.style.display = 'none';
            }
        });
    }

    function setupModal() {
        if (viewParticipantsBtn) {
            viewParticipantsBtn.addEventListener('click', () => {
                renderParticipantsList();
                const modalTitle = remainingModal.querySelector('h2');
                if (modalTitle) modalTitle.textContent = "👥 未中獎名單 (剩餘 " + participants.length + " 人)";
                remainingModal.style.display = 'flex';
            });
        }
        if (closeSpan) {
            closeSpan.addEventListener('click', () => {
                remainingModal.style.display = 'none';
            });
        }
        window.addEventListener('click', (event) => {
            if (event.target == remainingModal) {
                remainingModal.style.display = 'none';
            }
        });
    }

    function renderParticipantsList() {
        remainingList.innerHTML = '';

        if (participants.length === 0) {
            remainingList.innerHTML = '<li style="padding:1rem; text-align:center; color:#888;">目前無人可抽！</li>';
            return;
        }

        participants.forEach(name => {
            const li = document.createElement('li');
            li.className = 'remaining-item';
            li.innerHTML = `<span>${name}</span>`;
            remainingList.appendChild(li);
        });
    }

    // Reuse parsing logic
    function parseSinglePrizeLine(line, index = 0) {
        let fullString = line;
        let count = 1;
        const match = line.match(/(.*)[xX\*]\s*(\d+)$/);
        if (match) {
            fullString = match[1].trim();
            count = parseInt(match[2], 10);
        }

        // Split Title and Content by Colon (Fullwidth ： or Halfwidth :)
        let title = fullString;
        let content = "";

        const colonMatch = fullString.match(/^(.*?)[：:](.*)$/);
        if (colonMatch) {
            title = colonMatch[1].trim();
            content = colonMatch[2].trim();
        }

        return {
            id: index,
            name: fullString, // Full name for backward compat / fallback
            title: title,
            content: content,
            total: count
        };
    }

    // --- Core Updates ---

    function saveSettings() {
        // Read Participants
        const rawNames = nameInput.value.split('\n').map(s => s.trim()).filter(s => s !== '');

        // Read Prizes from Rows
        const newConfig = readPrizeSettingsRows();

        if (newConfig.length === 0) {
            alert("獎項清單不能為空！");
            return;
        }

        // Logic to preserve history (match by title+content or just title?)
        // Let's try to match by ID if possible, but IDs change on full rewrite.
        // Actually, renderPrizeSettingsRows re-creates lines, so we just blindly replace config.
        // We match history by Name/Title usually.

        prizeConfig = newConfig;
        allParticipants = rawNames;

        // Re-init draw counts for new items, keep old if possible? 
        // Simpler: Reset counts to calculated history
        prizeDrawCounts = {};
        prizeConfig.forEach(p => prizeDrawCounts[p.id] = 0);

        resultsHistory.forEach(record => {
            // Fuzzy match logic
            const p = prizeConfig.find(pc => pc.title === record.prizeTitle && pc.content === record.prizeContent);
            if (p) {
                prizeDrawCounts[p.id] = (prizeDrawCounts[p.id] || 0) + 1;
                record.prizeId = p.id;
            } else {
                record.prizeId = 9999;
            }
        });

        recalculateParticipantPool();
        renderPrizeList();
        renderResultsListSorted(); // Re-sort with new IDs

        // Save URL to LocalStorage
        if (sheetsUrlInput) {
            localStorage.setItem('lucky_draw_sheets_url', sheetsUrlInput.value.trim());
        }

        if (groupTitleInput) {
            localStorage.setItem('lucky_draw_group_title', groupTitleInput.value.trim());
        }

        if (subtitleInput) {
            localStorage.setItem('lucky_draw_subtitle', subtitleInput.value.trim());
        }

        switchTab('draw');
        updateUIState();
        alert("設定已更新！");
    }

    // Overwrite saveSettingsBtn listener
    // Note: We need to replace the old saveSettingsBtn listener. 
    // Since we're replacing the whole block, just ensure we bind the new logic.
    // However, the original code had `parseInputs`. We are replacing `parseInputs` usage in init/save.

    saveSettingsBtn.addEventListener('click', () => {
        if (isRolling || isStopping) return;
        saveSettings();
    });

    function recalculateParticipantPool() {
        let pool = [...allParticipants];
        const allowRepeat = drawAllowRepeatCheckbox ? drawAllowRepeatCheckbox.checked : allowRepeatCheckbox.checked;

        if (!allowRepeat) {
            const winners = new Set(resultsHistory.map(r => r.winnerName));
            pool = pool.filter(p => !winners.has(p));
        }
        participants = pool;
    }

    function renderPrizeList() {
        prizeListDisplay.innerHTML = '';
        prizeConfig.forEach((prize) => {
            const drawn = prizeDrawCounts[prize.id] || 0;
            const isFullyDrawn = drawn >= prize.total;
            const li = document.createElement('li');
            li.className = 'prize-item';

            // Layout: Title as Badge/Bold, Content as text
            const displayTitle = prize.content ? `<span style="font-weight:bold; color:var(--primary-color); margin-right:5px;">${prize.title}</span>` : `<span style="font-weight:bold;">${prize.title}</span>`;
            const displayContent = prize.content ? `<span>${prize.content}</span>` : '';

            li.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:flex-start; line-height:1.4;">
                    <div>${displayTitle} ${displayContent}</div>
                </div>
                <span style="font-size: 0.85em; color: #666; white-space:nowrap;">(${drawn}/${prize.total})</span>
            `;
            if (isFullyDrawn) li.classList.add('drawn');
            else if (prize.id === selectedPrizeIndex) li.classList.add('active');

            li.addEventListener('click', () => {
                if (!isRolling && !isStopping && !isFullyDrawn) selectPrize(prize.id);
            });
            prizeListDisplay.appendChild(li);
        });
    }

    function selectPrize(id) {
        selectedPrizeIndex = id;
        if (drawAllowRepeatCheckbox && allowRepeatCheckbox) {
            drawAllowRepeatCheckbox.checked = allowRepeatCheckbox.checked;
        }

        // Reset winner display for the new selection
        winnerDisplay.textContent = "???";
        winnerDisplay.classList.remove('highlight-winner');

        renderPrizeList();
        updateUIState();
    }

    function updateUIState() {
        const titleVal = titleInput.value.trim();
        if (titleVal) headerTitle.textContent = titleVal;

        if (groupTitleDisplay && groupTitleInput) {
            groupTitleDisplay.textContent = groupTitleInput.value.trim();
            groupTitleDisplay.style.display = groupTitleInput.value.trim() ? 'block' : 'none';
        }

        if (subtitleDisplay && subtitleInput) {
            subtitleDisplay.textContent = subtitleInput.value.trim();
            subtitleDisplay.style.display = subtitleInput.value.trim() ? 'block' : 'none';
        }

        const prize = prizeConfig.find(p => p.id === selectedPrizeIndex);

        if (isStopping) {
            mainActionBtn.textContent = "抽獎中...";
            mainActionBtn.disabled = true;
            mainActionBtn.classList.remove('btn-stop');
            mainActionBtn.classList.add('btn-start');
            if (drawAllowRepeatCheckbox) drawAllowRepeatCheckbox.disabled = true;
        } else if (isRolling) {
            mainActionBtn.textContent = "停止";
            mainActionBtn.disabled = false;
            mainActionBtn.classList.remove('btn-start');
            mainActionBtn.classList.add('btn-stop');
            if (drawAllowRepeatCheckbox) drawAllowRepeatCheckbox.disabled = true;
        } else {
            mainActionBtn.textContent = "開始抽獎";
            mainActionBtn.classList.remove('btn-stop');
            mainActionBtn.classList.add('btn-start');
            if (drawAllowRepeatCheckbox) drawAllowRepeatCheckbox.disabled = false;

            if (prize) {
                const drawn = prizeDrawCounts[prize.id] || 0;
                const isFullyDrawn = drawn >= prize.total;

                // Richer Display
                if (prize.content) {
                    currentPrizeLabel.innerHTML = `<span style="font-size:1.2em; color:var(--primary-color);font-weight:bold;">${prize.title}</span><br/><span style="font-size:1em; color:#555;">${prize.content}</span> (第 ${Math.min(drawn + 1, prize.total)} 位)`;
                } else {
                    currentPrizeLabel.textContent = `準備抽：${prize.title} (第 ${Math.min(drawn + 1, prize.total)} 位)`;
                }

                if (isFullyDrawn) {
                    mainActionBtn.textContent = "本獎項已抽完";
                    mainActionBtn.disabled = true;
                    mainActionBtn.classList.remove('btn-stop');
                    mainActionBtn.classList.add('btn-start'); // Set back to start style but disabled
                } else {
                    mainActionBtn.disabled = false;
                }
            } else {
                currentPrizeLabel.textContent = "請從左側點選要抽的獎項";
                mainActionBtn.disabled = true;
            }
        }
    }

    // --- Game Logic ---

    function toggleDraw() {
        if (isStopping) return;
        if (isRolling) stopDraw();
        else startDraw();
    }

    function startDraw() {
        if (selectedPrizeIndex === -1) {
            alert("請先從左側選擇一個獎項！");
            return;
        }
        recalculateParticipantPool();
        if (participants.length === 0) {
            alert("參加名單已空！無法繼續抽獎。\n(若需重複中獎，請勾選「本次抽獎允許重複中獎」)");
            return;
        }
        isRolling = true;
        winnerDisplay.classList.remove('highlight-winner');
        tabDraw.disabled = true;
        tabSettings.disabled = true;
        prizeListDisplay.style.pointerEvents = 'none';
        winnerDisplay.textContent = "Rolling...";
        updateUIState();
        clearInterval(rollInterval);
        rollInterval = setInterval(() => {
            const r = Math.floor(Math.random() * participants.length);
            winnerDisplay.textContent = participants[r];
        }, 50);
    }

    function stopDraw() {
        if (!isRolling) return;
        isStopping = true;
        updateUIState();
        let speed = 50;
        let steps = 0;
        const maxSteps = 15;
        function slowLoop() {
            clearInterval(rollInterval);
            const r = Math.floor(Math.random() * participants.length);
            winnerDisplay.textContent = participants[r];
            speed += 40;
            steps++;
            if (steps < maxSteps) rollInterval = setInterval(slowLoop, speed);
            else finalizeWinner();
        }
        slowLoop();
    }

    function finalizeWinner() {
        isRolling = false;
        isStopping = false;
        clearInterval(rollInterval);
        const winnerIndex = Math.floor(Math.random() * participants.length);
        const winnerName = participants[winnerIndex];
        winnerDisplay.textContent = winnerName;
        winnerDisplay.classList.add('highlight-winner');

        // --- Trigger Celebration ---
        showCelebration(winnerName);

        recordResult(winnerName);
        prizeListDisplay.style.pointerEvents = 'auto';
        tabDraw.disabled = false;
        tabSettings.disabled = false;
        renderPrizeList();
        updateUIState();
    }

    // --- Celebration Functions ---
    function showCelebration(winnerName) {
        if (!celebrationOverlay) return;

        const prize = prizeConfig.find(p => p.id === selectedPrizeIndex);
        celebrationPrize.textContent = prize ? prize.name : "";
        celebrationWinner.textContent = winnerName;
        celebrationOverlay.style.display = 'flex';

        // 1. Instant big explosion
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#e60012', '#ffcc00', '#ffffff', '#ffeb3b']
        });

        // 2. Continuous fireworks sequence
        const end = Date.now() + (5 * 1000); // 5 seconds of fireworks
        const colors = ['#e60012', '#ffcc00'];

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end && celebrationOverlay.style.display === 'flex') {
                requestAnimationFrame(frame);
            }
        }());
    }

    if (celebrationOverlay) {
        celebrationOverlay.addEventListener('click', () => {
            celebrationOverlay.style.display = 'none';
        });
    }

    function recordResult(winnerName) {
        const prize = prizeConfig.find(p => p.id === selectedPrizeIndex);
        if (!prize) return;

        prizeDrawCounts[prize.id] = (prizeDrawCounts[prize.id] || 0) + 1;
        resultsHistory.push({
            prizeId: prize.id,
            prizeName: prize.name,
            prizeTitle: prize.title,
            prizeContent: prize.content,
            winnerName: winnerName,
            timestamp: Date.now()
        });

        // Also save to persistent backup
        persistentHistory.push({ ...resultsHistory[resultsHistory.length - 1] });

        // Sync to Google Sheets
        syncToGoogleSheets(resultsHistory[resultsHistory.length - 1]);

        renderResultsListSorted();

        const allowRepeat = drawAllowRepeatCheckbox ? drawAllowRepeatCheckbox.checked : allowRepeatCheckbox.checked;
        if (!allowRepeat) {
            const idx = participants.indexOf(winnerName);
            if (idx > -1) participants.splice(idx, 1);
        }
        const drawn = prizeDrawCounts[prize.id];
        // Disabled auto-reset of selectedPrizeIndex to keep prize info visible
        // if (drawn >= prize.total) selectedPrizeIndex = -1;
    }

    function syncToGoogleSheets(record) {
        if (!sheetsUrlInput || !sheetsUrlInput.value.trim()) return;

        const url = sheetsUrlInput.value.trim();
        const data = {
            groupTitle: groupTitleInput ? groupTitleInput.value.trim() : "",
            eventName: titleInput.value.trim(),
            eventDate: eventDateInput ? eventDateInput.value : "",
            prizeTitle: record.prizeTitle,
            prizeContent: record.prizeContent,
            winnerName: record.winnerName,
            drawId: record.timestamp // Use timestamp as unique ID
        };

        // GAS requires POST. We use mode: 'no-cors' for simple cross-origin POST if not returning JSON.
        // Note: With no-cors, we can't read the response, but the data will be sent.
        console.log("Attempting to sync to Google Sheets:", url);
        console.log("Payload:", data);

        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'text/plain' // Using text/plain to avoid preflight in some cases
            },
            body: JSON.stringify(data)
        }).then(() => {
            console.log("Data sent to Google Sheets (Request sent)");
        }).catch(err => {
            console.error("Failed to sync to Google Sheets:", err);
            alert("同步失敗，請檢查網路連線或網址。");
        });
    }

    function renderResultsListSorted() {
        resultsList.innerHTML = '';
        const sortedHistory = [...resultsHistory].sort((a, b) => {
            if (a.prizeId !== b.prizeId) return a.prizeId - b.prizeId;
            return b.timestamp - a.timestamp;
        });
        sortedHistory.forEach(record => {
            addResultToDOM(record);
        });
    }

    function addResultToDOM(record) {
        const li = document.createElement('li');
        li.className = 'result-item';

        // Structure: 
        // Small Grey: Title
        // Small Grey: Content (if any)
        // Big Black: Winner

        let prizeDisplay = `<span>${record.prizeTitle}</span>`;
        if (record.prizeContent) {
            prizeDisplay += `<span style="margin-left:5px; color:#aaa; font-weight:normal;">${record.prizeContent}</span>`;
        } else {
            // Fallback if no separate title/content stored (legacy)
            if (!record.prizeTitle && record.prizeName) {
                prizeDisplay = `<span>${record.prizeName}</span>`;
            }
        }

        li.innerHTML = `
            <div class="result-prize">${prizeDisplay}</div>
            <span class="result-name">${record.winnerName}</span>
        `;
        resultsList.appendChild(li);
    }

    // --- Render History In Settings ---
    function renderSettingsHistory() {
        if (!settingsHistoryList) return;
        settingsHistoryList.innerHTML = '';
        if (persistentHistory.length === 0) {
            settingsHistoryList.innerHTML = '<li style="color:#999;">尚未有中獎紀錄</li>';
            return;
        }
        // Same sort as main list
        const sortedHistory = [...persistentHistory].sort((a, b) => {
            if (a.prizeId !== b.prizeId) return a.prizeId - b.prizeId;
            return b.timestamp - a.timestamp;
        });
        sortedHistory.forEach(r => {
            const li = document.createElement('li');
            li.style.cssText = 'border-bottom:1px solid #eee; padding:5px 0; font-size:0.9rem;';
            li.innerHTML = `<span style="color:#666;">[${r.prizeName}]</span> <b>${r.winnerName}</b>`;
            settingsHistoryList.appendChild(li);
        });
    }

    // --- Tab Switching ---
    function switchTab(mode) {
        if (isRolling || isStopping) return;

        const container = document.querySelector('.container');
        if (mode === 'draw') {
            tabDraw.classList.add('active');
            tabSettings.classList.remove('active');
            drawModePanel.style.display = 'block';
            settingsModePanel.style.display = 'none';
            if (container) container.classList.remove('settings-active');
        } else {
            tabDraw.classList.remove('active');
            tabSettings.classList.add('active');
            drawModePanel.style.display = 'none';
            settingsModePanel.style.display = 'block';
            if (container) container.classList.add('settings-active');

            // Render History whenever entering settings
            renderSettingsHistory();
        }
    }

    tabDraw.addEventListener('click', () => switchTab('draw'));
    tabSettings.addEventListener('click', () => switchTab('settings'));

    // --- Actions ---
    mainActionBtn.addEventListener('click', toggleDraw);

    resetBtn.addEventListener('click', () => {
        if (confirm("確定要【重置所有結果】嗎？\n這將會：\n1. 清空所有中獎紀錄\n2. 重新載入所有人名\n3. 重置獎項數量")) {
            parseInputs(true);
            selectedPrizeIndex = -1;
            winnerDisplay.textContent = "???";
            winnerDisplay.classList.remove('highlight-winner');
            renderPrizeList();
            renderResultsListSorted(); // Clear list
            renderSettingsHistory(); // Clear settings logs
            updateUIState();
            alert("已全部重置！");
        }
    });

    // Old saveSettingsBtn listener has been replaced in the block above.
    // Keeping reset button logic:

    resetBtn.addEventListener('click', () => {
        if (confirm("確定要【重置目前抽獎結果】嗎？\n(這將會清空右側名單並恢復獎項數量，但設定頁面的「歷史紀錄」會保留)")) {
            // Reset counts based on new empty results
            resultsHistory = [];

            // Re-init pool and counts
            prizeDrawCounts = {};
            prizeConfig.forEach(p => prizeDrawCounts[p.id] = 0);
            recalculateParticipantPool();

            selectedPrizeIndex = -1;
            winnerDisplay.textContent = "???";
            winnerDisplay.classList.remove('highlight-winner');

            renderPrizeList();
            renderResultsListSorted();
            updateUIState();
            alert("目前結果已重置！");
        }
    });

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm("確定要【清空所有歷史紀錄備份】嗎？此動作無法復原。")) {
                persistentHistory = [];
                renderSettingsHistory();
                alert("歷史紀錄已清空！");
            }
        });
    }

    const clearPrizesBtn = document.getElementById('clearPrizesBtn');
    if (clearPrizesBtn) {
        clearPrizesBtn.addEventListener('click', () => {
            prizeRowsContainer.innerHTML = '';
        });
    }

    const clearNamesBtn = document.getElementById('clearNamesBtn');
    if (clearNamesBtn) {
        clearNamesBtn.addEventListener('click', () => {
            nameInput.value = '';
        });
    }

    const helpBtn = document.getElementById('helpBtn');
    const sheetsHelpModal = document.getElementById('sheetsHelpModal');
    const closeHelpModal = document.getElementById('closeHelpModal');

    if (helpBtn && sheetsHelpModal) {
        helpBtn.addEventListener('click', () => {
            sheetsHelpModal.style.display = 'flex';
        });
    }

    if (closeHelpModal && sheetsHelpModal) {
        closeHelpModal.addEventListener('click', () => {
            sheetsHelpModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target == sheetsHelpModal) {
            sheetsHelpModal.style.display = 'none';
        }
    });

    const copyCodeBtn = document.getElementById('copyCodeBtn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            const code = document.getElementById('gasCodeSnippet').innerText;
            navigator.clipboard.writeText(code).then(() => {
                const originalText = copyCodeBtn.textContent;
                copyCodeBtn.textContent = '✅ 已複製！';
                copyCodeBtn.style.background = '#28a745';
                setTimeout(() => {
                    copyCodeBtn.textContent = originalText;
                    copyCodeBtn.style.background = '#4285f4';
                }, 2000);
            }).catch(err => {
                console.error('無法複製程式碼: ', err);
                alert('複製失敗，請手動選取複製。');
            });
        });
    }

    const testSheetsBtn = document.getElementById('testSheetsBtn');
    if (testSheetsBtn) {
        testSheetsBtn.addEventListener('click', () => {
            if (!sheetsUrlInput.value.trim()) {
                alert("請先輸入 Google Sheets URL！");
                return;
            }
            const testRecord = {
                prizeTitle: "測試連線",
                prizeContent: "這是一則測試訊息",
                winnerName: "測試系統"
            };
            syncToGoogleSheets(testRecord);
            alert("已送出測試請求！請查看您的 Google Sheet。");
        });
    }

    const syncManualBtn = document.getElementById('syncManualBtn');
    if (syncManualBtn) {
        syncManualBtn.addEventListener('click', async () => {
            if (!sheetsUrlInput.value.trim()) {
                alert("請先輸入 Google Sheets URL！");
                return;
            }
            if (resultsHistory.length === 0) {
                alert("目前尚無中獎紀錄可補傳。");
                return;
            }

            // Replaced confirm with direct action for mobile compatibility
            syncManualBtn.disabled = true;
            const originalText = syncManualBtn.textContent;
            syncManualBtn.textContent = "傳送中...";

            for (let i = 0; i < resultsHistory.length; i++) {
                syncToGoogleSheets(resultsHistory[i]);
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            syncManualBtn.disabled = false;
            syncManualBtn.textContent = originalText;
            alert(`已補傳 ${resultsHistory.length} 筆紀錄！`);
        });
    }

    const loadExampleBtn = document.getElementById('loadExampleBtn');
    if (loadExampleBtn) {
        loadExampleBtn.addEventListener('click', () => {
            initFromSamples();
            renderPrizeSettingsRows();
            nameInput.value = sampleNames.join('\n');
            alert("範例資料已載入！請點擊「儲存並更新」。");
        });
    }

    // Run Init
    init();

});
