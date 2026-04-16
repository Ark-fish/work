(function(){
    "use strict";

    // ---------- 游戏状态 ----------
    let gameState = {
        day: 1,
        stage: 1,
        prestige: 30,
        protection: 0,
        camels: 3,
        guards: 0,
        workers: 3,
        goods: { silk: 10, porcelain: 0, tea: 8, grain: 15 },
        gold: 20,
        selectedProtection: [],
        clues: [],
        cards: { bargain: 0, taxFree: 0, defense: 0, rest: 0 },
        gameOver: false,
        consecutiveFailure: 0,
        fullProtection: false,
        stagesCompleted: 0
    };

    // 事件库
    const events = {
    "偶遇回程商队": {
        id: 1,
        description: "遇见边塞返程商队，就地开展物资交易。",
        options: [
            { text: "公平等价交换", effect: { goods: { grain: 5 }, prestige: 3 } },
            { text: "借父亲威望压价", effect: { goods: { grain: 8 }, prestige: -5 } },
            { text: "拒绝交易赶路", effect: { day: -1 } }
        ]
    },
    "边关守军征税": {
        id: 2,
        description: "守军查验货物，按律征收过境税费。",
        options: [
            { text: "足额缴税", effect: { goods: { silk: -2 } } },
            { text: "威望抵扣减税", effect: { goods: { silk: -1 }, prestige: -8 } },
            { text: "拒缴闯关", effect: { goods: { silk: -4 }, prestige: -15 } }
        ]
    },
    "农户以物换粮": {
        id: 3,
        description: "边境农户用粮草交换丝绸布匹。",
        options: [
            { text: "温和议价交换", effect: { goods: { silk: -2, grain: 10 }, prestige: 3 } },
            { text: "强势压价交易", effect: { goods: { silk: -2, grain: 14 }, prestige: -6 } },
            { text: "拒绝交换", effect: { prestige: -2 } }
        ]
    },
    "民间货摊淘货": {
        id: 4,
        description: "路边小摊售卖杂货，藏有老旧物件。",
        options: [
            { text: "花费2贯淘货", effect: { gold: -2, goods: { grain: 3 }, chance: { clue: 0.3, card: "taxFree" } } },
            { text: "放弃淘货", effect: {} }
        ]
    },
    "边塞酒肆打探": {
        id: 5,
        description: "边塞酒肆可休整、打探消息、招募护卫。",
        options: [
            { text: "花费3贯休整", effect: { gold: -3 } },
            { text: "花费4贯打探消息", effect: { gold: -4, chance: { clue: 0.8 } } },
            { text: "花费6贯招募护卫", effect: { gold: -6, guards: 2 } }
        ]
    },
    "落难旧吏求助": {
        id: 6,
        description: "曾任职边关的落魄小吏，求助干粮并愿告知旧事。",
        options: [
            { text: "赠粮草+收留同行", effect: { goods: { grain: -3 }, gold: 5, clue: "线索2：父亲旧闻碎片" } },
            { text: "仅赠粮草遣散", effect: { goods: { grain: -1 }, prestige: 4 } },
            { text: "无视离开", effect: { prestige: -5 } }
        ]
    },
    "胡商结伴同行": {
        id: 7,
        description: "同乡粟特商队请求结伴，降低行程风险。",
        options: [
            { text: "同意结伴（平分收益）", effect: { clue: "线索4：父亲旧商队信息" } },
            { text: "拒绝独行", effect: {} }
        ]
    },
    "匪盗拦路滋扰": {
        id: 8,
        description: "小股匪盗劫掠商队，需快速应对。",
        options: [
            { text: "派出护卫抵抗", effect: { condition: { guards: 2 }, else: { goods: { silk: -5, tea: -5 } } } },
            { text: "缴纳8贯买路钱", effect: { gold: -8 } },
            { text: "亮出父亲名号威慑", effect: { condition: { prestige: 50 }, then: { clue: "线索5：父亲与盗匪往来凭证" }, else: { goods: { silk: -10, tea: -8, grain: -15 }, prestige: -20 } } }
        ]
    },
    "官府招募押运": {
        id: 9,
        description: "边关军官招募商队押运物资，许诺重赏。",
        options: [
            { text: "接受押运任务", effect: { gold: 15, prestige: 12, clue: "线索6：父亲押运案卷" } },
            { text: "拒绝任务", effect: {} }
        ]
    },
    "突发沙尘天气": {
        id: 10,
        description: "河西风沙漫天，必须立刻抉择。",
        options: [
            { text: "就地避风", effect: { goods: { grain: -4 } } },
            { text: "加速冲出风沙", effect: { day: -1, chance: { loss: 0.4 } } }
        ]
    },
    "边塞绿洲休整": {
        id: 11,
        description: "抵达河西唯一绿洲，可休整寻旧迹。",
        options: [
            { text: "全员休整1天", effect: { day: 1 } },
            { text: "简单休整即走", effect: {} },
            { text: "寻找父亲旧记号", effect: { chance: { clue: 0.4 } } }
        ]
    },
    "城镇售卖货物": {
        id: 12,
        description: "抵达河西城镇，可售卖货物换钱财。",
        options: [
            { text: "市价售卖", effect: { goods: { silk: -1 }, gold: 2 } },
            { text: "商行高价售卖", effect: { goods: { silk: -1 }, gold: 3, prestige: -4 } },
            { text: "打听父亲旧事", effect: { clue: "线索8：父亲商帮口碑" } }
        ]
    }
};

    const protectionConfig = {
        1: { days: 12, cost: 10 },
        2: { days: 24, cost: 18 },
        3: { days: 36, cost: 26 },
        all: { days: 72, cost: 43 }
    };

    // DOM 元素
    const elements = {
        gameStart: document.getElementById('gameStart'),
        gamePlay: document.getElementById('gamePlay'),
        gameEnd: document.getElementById('gameEnd'),
        startBtn: document.getElementById('startBtn'),
        restartBtn: document.getElementById('restartBtn'),
        prestige: document.getElementById('prestige'),
        day: document.getElementById('day'),
        stage: document.getElementById('stage'),
        protection: document.getElementById('protection'),
        camels: document.getElementById('camels'),
        guards: document.getElementById('guards'),
        workers: document.getElementById('workers'),
        goods: document.getElementById('goods'),
        gold: document.getElementById('gold'),
        eventTitle: document.getElementById('eventTitle'),
        eventDescription: document.getElementById('eventDescription'),
        eventOptions: document.getElementById('eventOptions'),
        eventFooterTitle: document.getElementById('eventFooterTitle'),
        eventFooterDesc: document.getElementById('eventFooterDesc'),
        totalDays: document.getElementById('totalDays'),
        finalPrestige: document.getElementById('finalPrestige'),
        finalGold: document.getElementById('finalGold'),
        finalCaravan: document.getElementById('finalCaravan'),
        finalClues: document.getElementById('finalClues')
    };

    const statItems = document.querySelectorAll('.stat-item');
    const globalResetBtn = document.getElementById('globalResetBtn');
    const toggleStatusBtn = document.getElementById('toggleStatusBtn');
    const playerStatusOuter = document.getElementById('playerStatusOuter');

    // ---------- 面板拖拽/缩放相关 ----------
    let isDragging = false;
    let isResizing = false;
    let resizeDir = '';
    let dragStartX = 0, dragStartY = 0;
    let panelStartLeft = 0, panelStartTop = 0;
    let panelStartWidth = 0, panelStartHeight = 0;

    const MIN_WIDTH = 200;
    const MIN_HEIGHT = 150;
    const EDGE_THRESHOLD = 12;

    let savedPanelStyle = '';

    function normalizePanelPosition() {
        const rect = playerStatusOuter.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(playerStatusOuter);
        const transform = computedStyle.transform;

        if (transform && transform !== 'none') {
            playerStatusOuter.style.transition = 'none';
            const currentLeft = rect.left;
            const currentTop = rect.top;
            playerStatusOuter.style.transform = 'none';
            playerStatusOuter.style.left = currentLeft + 'px';
            playerStatusOuter.style.top = currentTop + 'px';
            playerStatusOuter.style.right = 'auto';
        } else {
            playerStatusOuter.style.left = rect.left + 'px';
            playerStatusOuter.style.top = rect.top + 'px';
            playerStatusOuter.style.right = 'auto';
        }
        playerStatusOuter.style.width = rect.width + 'px';
        playerStatusOuter.style.height = rect.height + 'px';
    }

    function clampPanelPosition() {
        const rect = playerStatusOuter.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        let left = parseFloat(playerStatusOuter.style.left) || rect.left;
        let top = parseFloat(playerStatusOuter.style.top) || rect.top;
        const width = rect.width;
        const height = rect.height;

        left = Math.max(20, Math.min(left, winW - width - 20));
        top = Math.max(20, Math.min(top, winH - height - 20));

        playerStatusOuter.style.left = left + 'px';
        playerStatusOuter.style.top = top + 'px';
        playerStatusOuter.style.right = 'auto';
    }

    function getResizeDirection(e) {
        const rect = playerStatusOuter.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        const onRight = offsetX > rect.width - EDGE_THRESHOLD && offsetX <= rect.width;
        const onBottom = offsetY > rect.height - EDGE_THRESHOLD && offsetY <= rect.height;

        if (onRight && onBottom) return 'se';
        if (onRight) return 'e';
        if (onBottom) return 's';
        return '';
    }

    function updateCursor(e) {
        const dir = getResizeDirection(e);
        if (dir === 'e' || dir === 's') {
            playerStatusOuter.style.cursor = dir === 'e' ? 'ew-resize' : 'ns-resize';
        } else if (dir === 'se') {
            playerStatusOuter.style.cursor = 'nwse-resize';
        } else {
            playerStatusOuter.style.cursor = 'default';
        }
    }

    function onPanelMouseDown(e) {
        if (e.button !== 0) return;

        const dir = getResizeDirection(e);
        if (dir) {
            e.preventDefault();
            isResizing = true;
            resizeDir = dir;
            const rect = playerStatusOuter.getBoundingClientRect();
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            panelStartWidth = rect.width;
            panelStartHeight = rect.height;
            panelStartLeft = rect.left;
            panelStartTop = rect.top;

            normalizePanelPosition();
            playerStatusOuter.style.transition = 'none';
        } else {
            const target = e.target;
            if (target.closest('button') || target.closest('a') || target.closest('input')) {
                return;
            }
            e.preventDefault();
            isDragging = true;
            const rect = playerStatusOuter.getBoundingClientRect();
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            panelStartLeft = rect.left;
            panelStartTop = rect.top;

            normalizePanelPosition();
            playerStatusOuter.style.transition = 'none';
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
        if (isDragging) {
            e.preventDefault();
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            let newLeft = panelStartLeft + dx;
            let newTop = panelStartTop + dy;

            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const width = playerStatusOuter.offsetWidth;
            const height = playerStatusOuter.offsetHeight;

            newLeft = Math.max(20, Math.min(newLeft, winW - width - 20));
            newTop = Math.max(20, Math.min(newTop, winH - height - 20));

            playerStatusOuter.style.left = newLeft + 'px';
            playerStatusOuter.style.top = newTop + 'px';
            playerStatusOuter.style.right = 'auto';
        } else if (isResizing) {
            e.preventDefault();
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;

            let newWidth = panelStartWidth;
            let newHeight = panelStartHeight;

            if (resizeDir.includes('e')) {
                newWidth = Math.max(MIN_WIDTH, panelStartWidth + dx);
            }
            if (resizeDir.includes('s')) {
                newHeight = Math.max(MIN_HEIGHT, panelStartHeight + dy);
            }

            const maxW = window.innerWidth - panelStartLeft - 20;
            const maxH = window.innerHeight - panelStartTop - 20;
            newWidth = Math.min(newWidth, maxW);
            newHeight = Math.min(newHeight, maxH);

            playerStatusOuter.style.width = newWidth + 'px';
            playerStatusOuter.style.height = newHeight + 'px';
        } else {
            updateCursor(e);
        }
    }

    function onMouseUp(e) {
        if (isDragging || isResizing) {
            clampPanelPosition();
            playerStatusOuter.style.transition = '';
        }
        isDragging = false;
        isResizing = false;
        resizeDir = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    }

    function initDraggableResizable() {
        playerStatusOuter.addEventListener('mousedown', onPanelMouseDown);
        playerStatusOuter.addEventListener('mousemove', updateCursor);
        playerStatusOuter.addEventListener('mouseleave', () => {
            playerStatusOuter.style.cursor = 'default';
        });
        playerStatusOuter.addEventListener('dragstart', (e) => e.preventDefault());
    }

    function resetPanelToDefault() {
        playerStatusOuter.removeAttribute('style');
        const isVisible = playerStatusOuter.style.display !== 'none';
        playerStatusOuter.style.display = isVisible ? 'block' : 'none';
        savedPanelStyle = '';
    }

    // ---------- 游戏逻辑函数 ----------
    function updateUI() {
        elements.prestige.textContent = gameState.prestige;
        elements.day.textContent = gameState.day;
        elements.protection.textContent = gameState.protection;
        elements.camels.textContent = gameState.camels;
        elements.guards.textContent = gameState.guards;
        elements.workers.textContent = gameState.workers;
        elements.gold.textContent = `${gameState.gold}贯`;
        const goodsText = Object.entries(gameState.goods)
            .filter(([, count]) => count > 0)
            .map(([good, count]) => {
                const names = { silk: '丝绸', porcelain: '瓷器', tea: '茶叶', grain: '粮草' };
                return `${names[good]} x${count}`;
            })
            .join(', ');
        elements.goods.textContent = goodsText || '无';
        
        if (gameState.day <= 30) elements.stage.textContent = '近郊段';
        else if (gameState.day <= 60) elements.stage.textContent = '边塞段';
        else elements.stage.textContent = '河西段';
    }

    function applyEventEffect(effect) {
        if (effect.day) gameState.day = Math.max(1, gameState.day + effect.day);
        if (effect.prestige) gameState.prestige = Math.min(100, Math.max(0, gameState.prestige + effect.prestige));
        if (effect.gold) gameState.gold = Math.max(0, gameState.gold + effect.gold);
        if (effect.camels) gameState.camels = Math.max(0, gameState.camels + effect.camels);
        if (effect.guards) gameState.guards = Math.max(0, gameState.guards + effect.guards);
        if (effect.workers) gameState.workers = Math.max(0, gameState.workers + effect.workers);
        if (effect.goods) {
            for (let [good, change] of Object.entries(effect.goods)) {
                gameState.goods[good] = Math.max(0, gameState.goods[good] + change);
            }
        }
        if (effect.clue && !gameState.clues.includes(effect.clue)) {
            gameState.clues.push(effect.clue);
            alert(`📜 获得线索：${effect.clue}`);
        }
        if (effect.condition) {
            let met = true;
            for (let [key, val] of Object.entries(effect.condition)) {
                if (gameState[key] < val) met = false;
            }
            if (met && effect.then) applyEventEffect(effect.then);
            else if (!met && effect.else) applyEventEffect(effect.else);
        }
        if (effect.chance) {
            for (let [type, prob] of Object.entries(effect.chance)) {
                if (Math.random() < prob) {
                    if (type === 'clue') {
                        const c = '线索+1';
                        if (!gameState.clues.includes(c)) { gameState.clues.push(c); alert(c); }
                    } else if (type === 'loss') {
                        if (Math.random() < 0.5) gameState.goods.silk = Math.max(0, gameState.goods.silk - 2);
                        else gameState.camels = Math.max(0, gameState.camels - 1);
                    } else if (type === 'card' && gameState.cards.taxFree !== undefined) {
                        gameState.cards.taxFree++;
                    }
                }
            }
        }
    }

    // 处理“返回都城”按钮逻辑
    function handleReturnToCapital() {
        if (gameState.gold >= 10) {
            // 重置行程相关数值
            gameState.day = 1;
            gameState.stage = 1;
            gameState.protection = 0;
            // 返回开始界面
            elements.gamePlay.style.display = 'none';
            elements.gameStart.style.display = 'block';
            // 清空底部事件描述
            elements.eventFooterTitle.textContent = '事件标题';
            elements.eventFooterDesc.textContent = '事件描述';
            elements.eventOptions.innerHTML = '';
            updateUI();
            alert('运气不佳，花费10贯返回都城休整，重新开始商途。');
            // 扣除10贯已在按钮点击时处理？不，这里我们规定点击即扣除，所以先扣除再判断。
            // 但为了逻辑清晰，我们在点击时先扣除10贯。
        } else {
            alert('钱财不足10贯，无力返回都城，商队破产……');
            gameState.gameOver = true;
            endGame();
        }
    }

function triggerRandomEvent() {
    let pool = Object.keys(events);
    if (gameState.protection > 0) pool = pool.filter(key => key !== '匪盗拦路滋扰');
    
    const key = pool[Math.floor(Math.random() * pool.length)];
    const ev = events[key];
    
    // 更新底部文字
    elements.eventFooterTitle.textContent = key;
    elements.eventFooterDesc.textContent = ev.description;
    
    // 获取图画框元素
    const eventCard = document.getElementById('eventCard');
    
    // 清除之前插入的所有普通图片（<img class="event-image">）
    const oldImgs = eventCard.querySelectorAll('img.event-image');
    oldImgs.forEach(img => img.remove());
    
    // 根据事件 id 处理背景图与图片插入
    if (ev.id === 10) {
        // 事件10：背景图替换为 event10.png，不插入任何 img
        eventCard.style.backgroundImage = "url('../img/event10.png')";
        // 确保背景样式与默认一致
        eventCard.style.backgroundSize = "cover";
        eventCard.style.backgroundPosition = "bottom center";
        eventCard.style.backgroundRepeat = "no-repeat";
    } else {
        // 其他事件：恢复默认背景图 otherbackground.jpg
        eventCard.style.backgroundImage = "url('../img/otherbackground.jpg')";
        eventCard.style.backgroundSize = "cover";
        eventCard.style.backgroundPosition = "bottom center";
        eventCard.style.backgroundRepeat = "no-repeat";
        
        // 插入普通事件图片（靠右浮动）
        const img = document.createElement('img');
        img.src = `img/event${ev.id}.png`;
        img.alt = key;
        img.className = 'event-image';
        eventCard.appendChild(img);
    }
    
    // 生成选项按钮（原有逻辑保持不变）
    elements.eventOptions.innerHTML = '';
    let anyEnabled = false;
    
    ev.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'event-option';
        btn.textContent = opt.text;
        if ((opt.effect.gold || 0) < 0 && gameState.gold < Math.abs(opt.effect.gold)) {
            btn.disabled = true;
        } else {
            anyEnabled = true;
        }
        btn.addEventListener('click', () => {
            applyEventEffect(opt.effect);
            nextDay();
        });
        elements.eventOptions.appendChild(btn);
    });
    
    // 无可用选项处理（同前）
    if (!anyEnabled) {
        elements.eventOptions.innerHTML = '';
        const returnBtn = document.createElement('button');
        returnBtn.className = 'event-option';
        returnBtn.textContent = '运气不佳，返回都城 (花费10贯)';
        returnBtn.addEventListener('click', () => {
            if (gameState.gold >= 10) {
                gameState.gold -= 10;
                updateUI();
                gameState.day = 1;
                gameState.stage = 1;
                gameState.protection = 0;
                elements.gamePlay.style.display = 'none';
                elements.gameStart.style.display = 'block';
                elements.eventFooterTitle.textContent = '事件标题';
                elements.eventFooterDesc.textContent = '事件描述';
                elements.eventOptions.innerHTML = '';
                alert('破财消灾，花费10贯返回都城，商途重新开始。');
            } else {
                alert('身无分文，无法返回都城，商队破产……');
                gameState.gameOver = true;
                endGame();
            }
        });
        elements.eventOptions.appendChild(returnBtn);
    }
    
    updateUI();
}

    function nextDay() {
        gameState.day++;
        if (gameState.day > 90) { endGame(); return; }
        if (gameState.protection > 0) gameState.protection--;
        
        const totalGoods = gameState.goods.silk + gameState.goods.tea + gameState.goods.grain;
        if ((gameState.goods.grain <= 0 && gameState.camels <= 0) || (gameState.gold <= 0 && totalGoods <= 0)) {
            gameState.gameOver = true;
            endGame();
            return;
        }
        if (gameState.consecutiveFailure >= 2) { gameState.gameOver = true; endGame(); return; }
        
        let newStage = gameState.day <= 30 ? 1 : (gameState.day <= 60 ? 2 : 3);
        if (newStage > gameState.stage) {
            gameState.stage = newStage;
            gameState.stagesCompleted++;
            if (gameState.protection > 0) {
                alert('🛡️ 保护期生效，跳过关卡');
            } else {
                if (gameState.guards >= 2) {
                    gameState.consecutiveFailure = 0;
                } else {
                    gameState.consecutiveFailure++;
                    gameState.goods.grain = Math.max(0, gameState.goods.grain - 3);
                }
            }
        }
        triggerRandomEvent();
    }

    function startGame() {
        const sel = gameState.selectedProtection[0];
        if (!sel) { alert('请选择保护档位'); return; }
        if (gameState.gold < protectionConfig[sel].cost) { alert('钱财不足'); return; }
        gameState.gold -= protectionConfig[sel].cost;
        gameState.protection = protectionConfig[sel].days;
        gameState.fullProtection = (sel === 'all');
        elements.gameStart.style.display = 'none';
        elements.gamePlay.style.display = 'flex';
        updateUI();
        triggerRandomEvent();
    }

    function endGame() {
        elements.gamePlay.style.display = 'none';
        elements.gameEnd.style.display = 'block';
        elements.totalDays.textContent = gameState.day - 1;
        elements.finalPrestige.textContent = gameState.prestige;
        elements.finalGold.textContent = gameState.gold;
        elements.finalCaravan.textContent = `${gameState.camels}骆驼, ${gameState.guards}护卫, ${gameState.workers}人手`;
        elements.finalClues.textContent = gameState.clues.length;
        
        let msg = gameState.gameOver ? '破产结局……' :
            (gameState.gold >= 100 && gameState.clues.length >= 8 ? '🎉 传奇/完美结局！' :
            (gameState.clues.length >= 8 ? '昭雪结局' : (gameState.gold >= 50 ? '行商结局' : '旅程结束')));
        alert(msg);
        
        elements.eventFooterTitle.textContent = '';
        elements.eventFooterDesc.textContent = '';
    }

    function resetStatLocks() {
        statItems.forEach(item => item.classList.add('locked'));
    }

    function initGame() {
        gameState = {
            day: 1, stage: 1, prestige: 30, protection: 0, camels: 3, guards: 0, workers: 3,
            goods: { silk: 10, porcelain: 0, tea: 8, grain: 15 }, gold: 20,
            selectedProtection: [], clues: [],
            cards: { bargain: 0, taxFree: 0, defense: 0, rest: 0 },
            gameOver: false, consecutiveFailure: 0, fullProtection: false, stagesCompleted: 0
        };
        updateUI();
        elements.gameStart.style.display = 'block';
        elements.gamePlay.style.display = 'none';
        elements.gameEnd.style.display = 'none';
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        gameState.selectedProtection = [];
        resetStatLocks();
        playerStatusOuter.style.display = 'none';
        resetPanelToDefault();
        elements.eventFooterTitle.textContent = '事件标题';
        elements.eventFooterDesc.textContent = '事件描述';
        document.getElementById('eventCard').innerHTML = ''; // 清空图片
    }

    function toggleStatusPanel() {
        if (playerStatusOuter.style.display === 'none') {
            if (savedPanelStyle) {
                playerStatusOuter.style.cssText = savedPanelStyle;
            } else {
                playerStatusOuter.style.display = 'block';
                normalizePanelPosition();
            }
            playerStatusOuter.style.display = 'block';
        } else {
            const style = playerStatusOuter.style;
            const importantProps = ['left', 'top', 'width', 'height', 'display', 'transform', 'right'];
            let styleStr = '';
            for (let prop of importantProps) {
                if (style[prop]) {
                    styleStr += `${prop}: ${style[prop]}; `;
                }
            }
            savedPanelStyle = styleStr;
            playerStatusOuter.style.display = 'none';
        }
    }

    // 事件绑定
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            gameState.selectedProtection = [this.dataset.stage];
        });
    });
    elements.startBtn.addEventListener('click', startGame);
    elements.restartBtn.addEventListener('click', () => { initGame(); });

    statItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            item.classList.toggle('locked');
        });
    });

    globalResetBtn.addEventListener('click', () => {
        initGame();
        resetPanelToDefault();
    });

    toggleStatusBtn.addEventListener('click', toggleStatusPanel);

    initDraggableResizable();
    initGame();
})();