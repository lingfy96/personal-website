document.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('core-trigger');
    const terminal = document.getElementById('terminal');
    const input = document.getElementById('cmd-input');
    const sendBtn = document.getElementById('send-btn');
    const stream = document.getElementById('chat-stream');
    const closeBtn = document.getElementById('term-close-btn');

    const coreFaceWrap = document.getElementById('core-face-wrap');
    const avatarFaceWrap = document.getElementById('avatar-face-wrap');
    const moodBadge = document.getElementById('core-mood-badge');
    const trailCanvas = document.getElementById('fylen-trail-canvas');

    const GREETING_TEXT = "你好！我是榆翎的数字分身助手，我叫 Fylen [ˈfaɪlən]，你也可以叫我量子圆球。我为你解答我知道的全部！";

    // ================= 1. 设备与状态检测 (Device & Follow State) =================
    const isMobileDevice = () => {
        return window.innerWidth <= 768 || 
               window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
               ('ontouchstart' in window && window.innerWidth <= 1024);
    };

    let isFollowEnabled = !isMobileDevice(); // 移动端默认不跟随，电脑端默认开启跟随
    let hasUserMovedMouse = false;

    // HUD 气泡通知系统 (Toast Notification)
    let toastTimer = null;
    let toastEl = null;

    function initToast() {
        toastEl = document.createElement('div');
        toastEl.className = 'fylen-hud-toast';
        toastEl.innerHTML = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span class="toast-msg"></span>
        `;
        document.body.appendChild(toastEl);
    }
    initToast();

    function showToast(htmlMessage, duration = 3200) {
        if (!toastEl) return;
        const msgSpan = toastEl.querySelector('.toast-msg');
        if (msgSpan) msgSpan.innerHTML = htmlMessage;
        toastEl.classList.add('show');

        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastEl.classList.remove('show');
        }, duration);
    }

    // ================= 2. Kimi 风格极简胶囊智能体表情系统 =================
    const EXPR_PRESETS = [
        { id: 'idle', label: '| | 待命中', name: '胶囊待命' },
        { id: 'happy', label: '^ ^ 灵动微笑', name: '月牙弯弧' },
        { id: 'wink', label: '- | 俏皮打招呼', name: '单侧眨眼' },
        { id: 'think', label: '= = 思考检索中', name: '水平扫描' },
        { id: 'curious', label: '· | 好奇张望', name: '偏角探视' },
        { id: 'dizzy', label: '> < 努力漂移中', name: '交叉晕晕' },
        { id: 'sleep', label: '- - zZ 节能休眠', name: '平静微憩' }
    ];

    let currentExprIndex = 0;
    let exprRestoreTimer = null;
    let idleSleepTimer = null;

    function setFylenExpression(exprId, moodText = '', durationMs = 0) {
        if (coreFaceWrap) coreFaceWrap.setAttribute('data-expr', exprId);
        if (avatarFaceWrap) avatarFaceWrap.setAttribute('data-expr', exprId);

        if (moodBadge) {
            const found = EXPR_PRESETS.find(e => e.id === exprId);
            moodBadge.textContent = moodText || (found ? found.label : '| | 待命中');
            moodBadge.classList.add('show');
        }

        if (exprRestoreTimer) {
            clearTimeout(exprRestoreTimer);
            exprRestoreTimer = null;
        }

        if (durationMs > 0) {
            exprRestoreTimer = setTimeout(() => {
                resetToDefaultMood();
            }, durationMs);
        }

        resetIdleTimer();
    }

    function resetToDefaultMood() {
        if (coreFaceWrap) coreFaceWrap.setAttribute('data-expr', 'idle');
        if (avatarFaceWrap) avatarFaceWrap.setAttribute('data-expr', 'idle');
        if (moodBadge) {
            moodBadge.textContent = '| | 待命中';
            moodBadge.classList.remove('show');
        }
    }

    function cycleNextExpression() {
        currentExprIndex = (currentExprIndex + 1) % EXPR_PRESETS.length;
        const target = EXPR_PRESETS[currentExprIndex];
        setFylenExpression(target.id, target.label, 2600);
    }

    function resetIdleTimer() {
        if (idleSleepTimer) clearTimeout(idleSleepTimer);
        idleSleepTimer = setTimeout(() => {
            if (!trigger || !trigger.classList.contains('is-dragging')) {
                setFylenExpression('sleep', '- - zZ 节能休眠中...', 0);
            }
        }, 18000);
    }

    // ================= 3. 荧光绿量子光轨 & 拖尾动效画布引擎 (Neon Green Trail Engine) =================
    let ctx = null;
    let dpr = window.devicePixelRatio || 1;
    let canvasW = window.innerWidth;
    let canvasH = window.innerHeight;

    function initTrailCanvas() {
        if (!trailCanvas || isMobileDevice()) return;
        ctx = trailCanvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas, { passive: true });
    }

    function resizeCanvas() {
        if (!trailCanvas || !ctx) return;
        dpr = window.devicePixelRatio || 1;
        canvasW = window.innerWidth;
        canvasH = window.innerHeight;
        trailCanvas.width = canvasW * dpr;
        trailCanvas.height = canvasH * dpr;
        trailCanvas.style.width = `${canvasW}px`;
        trailCanvas.style.height = `${canvasH}px`;
        ctx.scale(dpr, dpr);
    }

    const trailPoints = [];
    const particles = [];
    const MAX_TRAIL_POINTS = 26;

    class TrailParticle {
        constructor(x, y, vx, vy) {
            this.x = x + (Math.random() - 0.5) * 10;
            this.y = y + (Math.random() - 0.5) * 10;
            this.vx = (vx * -0.22) + (Math.random() - 0.5) * 2.0;
            this.vy = (vy * -0.22) + (Math.random() - 0.5) * 2.0;
            this.size = Math.random() * 3.2 + 1.2;
            this.life = 1.0;
            this.decay = Math.random() * 0.035 + 0.025;
            this.hue = Math.random() > 0.3 ? 150 : 165;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.94;
            this.vy *= 0.94;
            this.life -= this.decay;
            this.size *= 0.96;
            return this.life > 0 && this.size > 0.4;
        }

        draw(context) {
            if (this.life <= 0) return;
            context.save();
            context.globalAlpha = Math.max(0, this.life * 0.85);
            context.shadowBlur = 10;
            context.shadowColor = '#00FF88';
            context.fillStyle = `hsla(${this.hue}, 100%, 65%, ${this.life})`;
            context.beginPath();
            context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            context.fill();

            context.fillStyle = '#FFFFFF';
            context.beginPath();
            context.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }
    }

    function addTrailPoint(x, y, speed) {
        if (isMobileDevice() || !isFollowEnabled || isTerminalOpen()) return;

        trailPoints.unshift({
            x,
            y,
            speed,
            age: 0,
            maxAge: 16
        });

        if (trailPoints.length > MAX_TRAIL_POINTS) {
            trailPoints.pop();
        }

        if (speed > 2.5) {
            const spawnCount = Math.min(Math.floor(speed * 0.35), 4);
            for (let i = 0; i < spawnCount; i++) {
                particles.push(new TrailParticle(x, y, (trailPoints[1]?.x ? x - trailPoints[1].x : 0), (trailPoints[1]?.y ? y - trailPoints[1].y : 0)));
            }
        }
    }

    function renderNeonTrail() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvasW, canvasH);

        if (trailPoints.length > 2) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 0; i < trailPoints.length - 1; i++) {
                const p1 = trailPoints[i];
                const p2 = trailPoints[i + 1];
                const ratio = 1 - (i / trailPoints.length);
                const width = Math.max(2, ratio * 13);
                const alpha = Math.max(0, ratio * 0.5);

                ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
                ctx.lineWidth = width;
                ctx.shadowColor = '#00FF88';
                ctx.shadowBlur = 14 * ratio;

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
                ctx.stroke();
            }

            for (let i = 0; i < trailPoints.length - 1; i++) {
                const p1 = trailPoints[i];
                const p2 = trailPoints[i + 1];
                const ratio = 1 - (i / trailPoints.length);
                const width = Math.max(1, ratio * 4);
                const alpha = Math.max(0, ratio * 0.85);

                ctx.strokeStyle = i < 3 ? `rgba(255, 255, 255, ${alpha})` : `rgba(57, 255, 20, ${alpha})`;
                ctx.lineWidth = width;
                ctx.shadowColor = '#39FF14';
                ctx.shadowBlur = 8 * ratio;

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
                ctx.stroke();
            }

            ctx.restore();
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            if (p.update()) {
                p.draw(ctx);
            } else {
                particles.splice(i, 1);
            }
        }

        for (let i = trailPoints.length - 1; i >= 0; i--) {
            trailPoints[i].age++;
            if (trailPoints[i].age > trailPoints[i].maxAge) {
                trailPoints.splice(i, 1);
            }
        }
    }


    // ================= 4. 小雷达鼠标跟随 & 泊车系统 (Follow & Docking Physics) =================
    const OFFSET_X = 26;
    const OFFSET_Y = 26;
    const coreRadius = 32;
    const margin = 14;

    function getDockPosition() {
        return {
            x: Math.max(margin, window.innerWidth - 88),
            y: Math.max(margin, window.innerHeight - 88)
        };
    }

    const defaultDock = getDockPosition();
    let mouseX = defaultDock.x - OFFSET_X;
    let mouseY = defaultDock.y - OFFSET_Y;
    let radarX = defaultDock.x;
    let radarY = defaultDock.y;
    let prevRadarX = radarX;
    let prevRadarY = radarY;
    let isCoreManualDragging = false;
    let bobTime = 0;

    function isTerminalOpen() {
        return terminal && terminal.classList.contains('active');
    }

    // 监听鼠标移动（仅电脑端且未禁用跟随）
    window.addEventListener('mousemove', (e) => {
        if (isMobileDevice()) return;
        hasUserMovedMouse = true;
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (coreFaceWrap && coreFaceWrap.getAttribute('data-expr') === 'sleep') {
            setFylenExpression('wink', '- | 唤醒啦！', 1600);
        } else {
            resetIdleTimer();
        }
    }, { passive: true });

    // 主渲染与物理动画循环 (60FPS Loop)
    function animLoop() {
        bobTime += 0.04;

        if (trigger && !isCoreManualDragging) {
            const isMobile = isMobileDevice();
            const terminalOpen = isTerminalOpen();
            const canFollow = isFollowEnabled && !terminalOpen && !isMobile;

            if (isMobile) {
                // 移动端：静置于右下角，无跟随变形与画布开销
                trigger.style.transform = '';
            } else {
                let targetX = 0;
                let targetY = 0;

                if (canFollow && hasUserMovedMouse) {
                    // 处于活动跟随状态：吸附在鼠标右下方
                    targetX = mouseX + OFFSET_X;
                    targetY = mouseY + OFFSET_Y;
                } else {
                    // 终端开启、双击暂停跟随、或未移动鼠标：平稳驻泊于右下角泊位
                    const dock = getDockPosition();
                    targetX = dock.x;
                    targetY = dock.y;
                }

                // 屏幕边界碰撞保护
                targetX = Math.max(margin, Math.min(window.innerWidth - coreRadius * 2 - margin, targetX));
                targetY = Math.max(margin, Math.min(window.innerHeight - coreRadius * 2 - margin, targetY));

                // 物理弹簧惯性插值
                const followSpeed = canFollow ? 0.12 : 0.08;
                radarX += (targetX - radarX) * followSpeed;
                radarY += (targetY - radarY) * followSpeed;

                const bobOffsetY = Math.sin(bobTime) * (canFollow ? 3 : 2);

                const vx = radarX - prevRadarX;
                const vy = radarY - prevRadarY;
                const currentSpeed = Math.hypot(vx, vy);

                let tilt = 0;
                let stretchX = 1;
                let stretchY = 1;

                if (canFollow && currentSpeed > 0.8) {
                    tilt = Math.max(-26, Math.min(26, (vx * 1.6)));
                    const stretch = Math.min(currentSpeed * 0.015, 0.2);
                    stretchX = 1 + stretch;
                    stretchY = 1 - stretch * 0.6;
                    trigger.classList.add('is-moving');
                } else {
                    trigger.classList.remove('is-moving');
                }

                trigger.style.transform = `translate3d(${radarX}px, ${radarY + bobOffsetY}px, 0) rotate(${tilt}deg) scale(${stretchX}, ${stretchY})`;

                if (canFollow) {
                    const centerX = radarX + coreRadius;
                    const centerY = radarY + bobOffsetY + coreRadius;
                    addTrailPoint(centerX, centerY, currentSpeed);

                    if (currentSpeed > 18 && coreFaceWrap && coreFaceWrap.getAttribute('data-expr') === 'idle') {
                        setFylenExpression('dizzy', '> < 努力漂移中...', 1400);
                    }
                }

                prevRadarX = radarX;
                prevRadarY = radarY;
            }
        }

        renderNeonTrail();
        requestAnimationFrame(animLoop);
    }

    initTrailCanvas();
    requestAnimationFrame(animLoop);
    resetIdleTimer();


    // ================= 5. 电脑端快捷唤醒与双击退出跟随交互 =================
    // 需求 1: 电脑端点击右键随时唤醒终端面板（唤醒后跟随自动失效）
    window.addEventListener('contextmenu', (e) => {
        if (isMobileDevice()) return;

        // 如果用户在输入框或文本域内右键，保留浏览器原生菜单以便粘贴/剪切
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        e.preventDefault();

        if (terminal) {
            const isCurrentlyOpen = terminal.classList.contains('active');
            if (!isCurrentlyOpen) {
                openTerminal();
                showToast('<span class="toast-accent">⚡ 右键快捷唤醒</span> 全息终端已就绪 (跟随已自动静止)');
            } else {
                closeTerminal();
                showToast('全息终端已关闭');
            }
        }
    });

    // 需求 2: 电脑端点击左键两下退出/重新开启弹性跟随（随时出现 HUD 提醒）
    let leftClickCount = 0;
    let leftClickTimer = null;

    window.addEventListener('click', (e) => {
        if (isMobileDevice()) return;
        // 忽略右键或中键
        if (e.button !== 0) return;

        // 如果在终端内部操作，不触发全局跟随切换
        if (e.target.closest('#terminal')) return;
        // 如果在小雷达圆球本身上点击，由 trigger 自身逻辑处理
        if (e.target.closest('#core-trigger')) return;

        leftClickCount++;
        if (leftClickCount === 1) {
            leftClickTimer = setTimeout(() => {
                leftClickCount = 0;
            }, 300);
        } else if (leftClickCount === 2) {
            clearTimeout(leftClickTimer);
            leftClickCount = 0;

            // 切换跟随模式
            isFollowEnabled = !isFollowEnabled;

            if (!isFollowEnabled) {
                // 退出跟随
                setFylenExpression('idle', '| | 已静止待命', 2500);
                showToast('<span class="toast-accent">⏸ 已退出鼠标弹性跟随</span>（再次双击左键可重新开启 · 右键随时唤醒）');
            } else {
                // 开启跟随
                setFylenExpression('wink', '- | 恢复跟随中...', 2200);
                showToast('<span class="toast-accent">▶ 已开启鼠标跟随模式</span>（小雷达将随光标平滑移动）');
            }
        }
    });


    // ================= 6. 终端面板唤醒/关闭系统 =================
    function openTerminal() {
        if (!terminal) return;
        terminal.classList.add('active');
        setFylenExpression('wink', '- | 终端已就绪！', 2200);
        if (input) {
            setTimeout(() => input.focus(), 150);
        }
    }

    function closeTerminal() {
        if (!terminal) return;
        terminal.classList.remove('active');
        setFylenExpression('happy', '^ ^ 随时唤醒我~', 1800);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTerminal();
        });
    }

    // ESC 快捷键关闭终端
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isTerminalOpen()) {
            closeTerminal();
        }
    });


    // ================= 7. 小雷达手动点击与拖拽系统 =================
    if (trigger) {
        let dragStartX = 0, dragStartY = 0;
        let startRadarX = 0, startRadarY = 0;
        let hasMovedSignificantly = false;
        let lastCoreClickTime = 0;

        function onCoreStart(e) {
            if (e.button !== undefined && e.button !== 0) return;
            const coords = (e.touches && e.touches.length > 0) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
            
            isCoreManualDragging = true;
            hasMovedSignificantly = false;
            dragStartX = coords.x;
            dragStartY = coords.y;
            startRadarX = radarX;
            startRadarY = radarY;
            trigger.classList.add('is-dragging');
            setFylenExpression('dizzy', '> < 抓到我啦！');
        }

        function onCoreMove(e) {
            if (!isCoreManualDragging) return;
            const coords = (e.touches && e.touches.length > 0) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
            const dx = coords.x - dragStartX;
            const dy = coords.y - dragStartY;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                hasMovedSignificantly = true;
            }

            radarX = startRadarX + dx;
            radarY = startRadarY + dy;
            mouseX = coords.x - OFFSET_X;
            mouseY = coords.y - OFFSET_Y;

            if (!isMobileDevice()) {
                trigger.style.transform = `translate3d(${radarX}px, ${radarY}px, 0) scale(1.1)`;
                addTrailPoint(radarX + 32, radarY + 32, 12);
            }
        }

        function onCoreEnd() {
            if (!isCoreManualDragging) return;
            isCoreManualDragging = false;
            trigger.classList.remove('is-dragging');

            if (hasMovedSignificantly) {
                setFylenExpression('happy', '^ ^ 到位啦！', 2000);
            }
        }

        trigger.addEventListener('mousedown', onCoreStart);
        trigger.addEventListener('touchstart', onCoreStart, { passive: false });
        window.addEventListener('mousemove', onCoreMove);
        window.addEventListener('touchmove', onCoreMove, { passive: false });
        window.addEventListener('mouseup', onCoreEnd);
        window.addEventListener('touchend', onCoreEnd);

        trigger.addEventListener('mouseenter', () => {
            if (coreFaceWrap && coreFaceWrap.getAttribute('data-expr') === 'idle') {
                setFylenExpression('curious', '· | 发现你啦！');
            }
        });
        trigger.addEventListener('mouseleave', () => {
            if (!isCoreManualDragging && !isTerminalOpen()) {
                resetToDefaultMood();
            }
        });

        // 单击唤醒/关闭终端，双击圆球切换表情
        trigger.addEventListener('click', (e) => {
            if (hasMovedSignificantly) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const now = Date.now();
            if (now - lastCoreClickTime < 350) {
                cycleNextExpression();
                lastCoreClickTime = 0;
                return;
            }
            lastCoreClickTime = now;

            if (isTerminalOpen()) {
                closeTerminal();
            } else {
                openTerminal();
            }
        });
    }


    // ================= 8. 全息终端面板拖拽与边界自适应 =================
    if (terminal) {
        const header = terminal.querySelector('.terminal-header');
        let isTermDragging = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        function getCoords(e) {
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            return { x: e.clientX, y: e.clientY };
        }

        function onTermDragStart(e) {
            if (e.button !== undefined && e.button !== 0) return;
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) return;

            const coords = getCoords(e);
            const rect = terminal.getBoundingClientRect();

            terminal.style.left = `${rect.left}px`;
            terminal.style.top = `${rect.top}px`;
            terminal.style.bottom = 'auto';
            terminal.style.right = 'auto';

            initialLeft = rect.left;
            initialTop = rect.top;
            startX = coords.x;
            startY = coords.y;
            isTermDragging = true;
            terminal.classList.add('is-dragging');

            if (e.cancelable) e.preventDefault();
        }

        function onTermDragMove(e) {
            if (!isTermDragging) return;
            const coords = getCoords(e);
            const dx = coords.x - startX;
            const dy = coords.y - startY;

            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            const m = 10;
            const maxLeft = window.innerWidth - terminal.offsetWidth - m;
            const maxTop = window.innerHeight - terminal.offsetHeight - m;

            newLeft = Math.max(m, Math.min(maxLeft, newLeft));
            newTop = Math.max(m, Math.min(maxTop, newTop));

            terminal.style.left = `${newLeft}px`;
            terminal.style.top = `${newTop}px`;

            if (e.cancelable) e.preventDefault();
        }

        function onTermDragEnd() {
            if (!isTermDragging) return;
            isTermDragging = false;
            terminal.classList.remove('is-dragging');
        }

        if (header) {
            header.addEventListener('mousedown', onTermDragStart);
            header.addEventListener('touchstart', onTermDragStart, { passive: false });
        }

        window.addEventListener('mousemove', onTermDragMove);
        window.addEventListener('touchmove', onTermDragMove, { passive: false });
        window.addEventListener('mouseup', onTermDragEnd);
        window.addEventListener('touchend', onTermDragEnd);

        window.addEventListener('resize', () => {
            const m = 10;
            if (terminal && terminal.classList.contains('active')) {
                const rect = terminal.getBoundingClientRect();
                let newLeft = rect.left;
                let newTop = rect.top;
                if (rect.right > window.innerWidth - m) {
                    newLeft = Math.max(m, window.innerWidth - rect.width - m);
                }
                if (rect.bottom > window.innerHeight - m) {
                    newTop = Math.max(m, window.innerHeight - rect.height - m);
                }
                terminal.style.left = `${newLeft}px`;
                terminal.style.top = `${newTop}px`;
            }
        });
    }


    // ================= 9. 知识库精准检索与问答 =================
    function matchKnowledgeBase(q) {
        const query = q.toLowerCase();
        
        if (/名字|叫什么|谁|你是|介绍|身份|fylen|faɪlən|雷达|圆球/.test(query)) {
            return `>> 身份档案检索：\n${GREETING_TEXT}\n我是符榆翎（YuLing Fu）的 AI 数字分身，定位为【AI+ 创新实践者 · 创意策展 · 跨界架构】。`;
        }
        if (/座右铭|理念|格言|人生|哲学/.test(query)) {
            return `>> 核心信条检索：\n【座右铭】自洽而内求，达观而内醒。\n【核心理念】自持、自省、自达；在复杂的世界中专注内生力量与持续进化，探索 AI 与创意的跨界新航线。`;
        }
        if (/技能|擅长|特长|能力|会什么|技术|栈|prompt|rag|3d|前端/.test(query)) {
            return `>> 能力图谱检索：\n1. AI 智能体架构与 RAG 落地（提示词工程、高共情对话体系、知识库检索）\n2. 沉浸式前端交互与 3D 可视化（WebGL / Three.js / Tailwind CSS / GSAP）\n3. 视觉影像与创意策展（全案级视觉系统、PPT提案、宣传片编导剪辑）\n4. 组织统筹与教务协同（三年独任大型教务统筹）`;
        }
        if (/项目|作品|明禾|月相|宇宙|ppt|航线/.test(query)) {
            return `>> 重点项目索引：\n1. 【明禾陪伴】：基于 RAG 架构的高共情心理健康智能陪伴 Agent。\n2. 【极客航线 3D 宇宙视界】：纯前端 WebGL / Three.js 实时渲染月球地表与 Cover Flow 3D 走廊。\n3. 【视觉影像与全案策展】：校园宣传片编导与品牌级视觉设计提案。`;
        }
        if (/经历|教务|科代表|经验|背景/.test(query)) {
            return `>> 实践经历索引：\n【2023 - 2026】语文科代表教务统筹（连续三年独任）：承担日常教务闭环管理，统筹多媒体课件与作业多线程追踪，具备极高抗压与敏捷协同能力。`;
        }
        if (/联系|邮箱|合作|微信|github|社交/.test(query)) {
            return `>> 联系方式检索：\n欢迎通过页面底部的联系方式或邮件直接交流，开放 AI 智能体开发、前端动效设计、视觉策展与跨界创新项目的探讨与合作！`;
        }
        if (/表情|可爱|呆萌|萌|变身|idle|happy|sleep|dizzy|kimi/.test(query)) {
            cycleNextExpression();
            return `>> 智能体表情切换：\n小圆球 Fylen 已切换表情！采用 Kimi 风格极简胶囊智能体眼睛设计，包含待命胶囊 [ | | ]、月牙微笑 [ ^ ^ ]、俏皮单眨 [ - | ]、水平扫描 [ = = ]、偏角探视 [ · | ]、交叉晕晕 [ > < ] 与节能休眠 [ - - zZ ]。`;
        }
        if (/跟随|鼠标|拖尾|右键|双击/.test(query)) {
            return `>> 交互快捷键指南：\n1. 【右键点击】：随时唤醒/收起全息终端（唤醒后跟随自动静止）。\n2. 【双击左键】：随时退出或重新开启鼠标弹性跟随。\n3. 【单击圆球】：开启终端；【双击圆球】：切换智能体表情。`;
        }
        if (/知识库|补充|更新|markdown|md/.test(query)) {
            return `>> 知识库状态：\n当前已挂载 /avatar/knowledge_base.md 知识库文件。你可以在该文件中自由补充与扩充更多个人信息！`;
        }
        
        return `>> 知识库索引响应：\n关于 [${q}]：\n已同步检索知识库记录。榆翎专注于 AI 智能体架构、WebGL 沉浸式前端动效与视觉创意策展。输入“技能”、“项目”、“经历”或“座右铭”可获取详尽档案。`;
    }

    // ================= 10. 打字机输出流引擎 =================
    function simulateAIResponse(text) {
        if (!stream) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg ai';
        stream.appendChild(msgDiv);
        
        const textSpan = document.createElement('span');
        const cursorSpan = document.createElement('span');
        cursorSpan.className = 'cursor';
        
        msgDiv.appendChild(textSpan);
        msgDiv.appendChild(cursorSpan);

        let i = 0;
        function type() {
            if (i < text.length) {
                textSpan.innerHTML += text.charAt(i) === '\n' ? '<br>' : text.charAt(i);
                i++;
                stream.scrollTop = stream.scrollHeight;
                setTimeout(type, Math.random() * 20 + 12);
            } else {
                cursorSpan.remove();
                setFylenExpression('happy', '^ ^ 解答完毕！', 2200);
            }
        }
        type();
    }

    function handleSend() {
        if (!input) return;
        const val = input.value.trim();
        if (!val) return;

        const userMsg = document.createElement('div');
        userMsg.className = 'chat-msg user';
        userMsg.textContent = val;
        if (stream) {
            stream.appendChild(userMsg);
            stream.scrollTop = stream.scrollHeight;
        }
        input.value = '';

        setFylenExpression('think', '= = 检索中...', 2500);

        const reply = matchKnowledgeBase(val);

        setTimeout(() => {
            simulateAIResponse(reply);
        }, 350);
    }

    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }

    // 全局调用接口
    window.QuantumAvatar = {
        open: openTerminal,
        close: closeTerminal,
        toggle: function() {
            if (isTerminalOpen()) closeTerminal();
            else openTerminal();
        },
        toggleFollow: function(enable) {
            if (enable !== undefined) isFollowEnabled = Boolean(enable);
            else isFollowEnabled = !isFollowEnabled;
            showToast(isFollowEnabled ? '已开启鼠标跟随' : '已退出鼠标跟随');
        },
        setMood: function(exprId, text, duration) {
            setFylenExpression(exprId, text, duration);
        },
        cycleMood: function() {
            cycleNextExpression();
        }
    };
});
