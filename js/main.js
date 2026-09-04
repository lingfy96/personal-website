    // =============== 全局捕获并忽略良性 ResizeObserver 循环提醒 ===============
    window.addEventListener('error', (e) => {
      if (
        e.message &&
        (e.message.includes('ResizeObserver') ||
         e.message.includes('undelivered notifications') ||
         e.message.includes('limit exceeded'))
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
    });

    // 基础交互统一初始化
    feather.replace();

    // =============== 移动端/触控设备检测与 3D 降级 ===============
    const isTouch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
    const isMobile = window.innerWidth < 768 || isTouch;
    if (isMobile) document.documentElement.classList.add('mobile-degrade');

    // =============== 性能档位判定（供后续动效分支使用） ===============
    // 移动端、低端设备（核心数 ≤4）、或用户开启「减少动态效果」时，一律走省电档
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLowEndDevice = (navigator.hardwareConcurrency || 8) <= 4;
    const PERF_LITE = isMobile || prefersReducedMotion || isLowEndDevice;
    document.documentElement.classList.toggle('perf-lite', PERF_LITE);

    /**
     * rAF 节流：把高频事件回调压缩到每帧最多执行一次。
     * 滚动 / resize 期间不做任何同步布局读取，全部推迟到下一帧统一处理。
     */
    function rafThrottle(fn) {
      let ticking = false;
      return function (...args) {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          fn.apply(this, args);
        });
      };
    }

    /**
     * WebP 能力检测（结果缓存）。
     * CSS background-image 无法使用 <picture> 做降级，只能在 JS 侧改写路径。
     */
    const SUPPORTS_WEBP = (function () {
      try {
        const c = document.createElement('canvas');
        if (!c.getContext || !c.getContext('2d')) return false;
        return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      } catch (e) {
        return false;
      }
    })();

    /** 把 jpg/png 路径改写成同目录同名 .webp（由 scripts/optimize_images.py 生成） */
    function webpUrl(path) {
      if (!SUPPORTS_WEBP || typeof path !== 'string') return path;
      if (/^https?:/i.test(path)) return path;         // 外链不动
      return path.replace(/\.(jpe?g|png)$/i, '.webp');
    }

    // =============== 教育背景跑道文字无缝循环克隆 ===============
    document.querySelectorAll('.runway-text-column').forEach(col => {
        const track = col.querySelector('.runway-track');
        const group = track.querySelector('.runway-word-group');
        if(track && group) {
            // 通过 JS 自动克隆 9 份，大幅削减 HTML 冗余代码，配合 CSS transform 实现顺滑循环
            for(let i=0; i<9; i++) {
                track.appendChild(group.cloneNode(true));
            }
        }
    });

    // =============== 主题切换 ===============
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    function updateThemeIcon(isDark) {
      const iconSpan = document.getElementById('theme-icon');
      if(iconSpan) {
        iconSpan.outerHTML = `<i data-feather="${isDark ? 'sun' : 'moon'}" id="theme-icon" class="w-5 h-5"></i>`;
        feather.replace();
      }
    }

    // 默认亮光模式；仅记住用户主动切换的选择（theme_v2 为新键，忽略旧版强制写入的 dark）
    const savedTheme = localStorage.getItem('theme_v2');
    const isDarkInit = savedTheme === 'dark';
    htmlEl.classList.toggle('dark', isDarkInit);
    updateThemeIcon(isDarkInit);

    themeToggleBtn.addEventListener('click', () => {
      const isDark = !htmlEl.classList.contains('dark');
      if (isDark) {
        htmlEl.classList.add('dark');
        localStorage.setItem('theme_v2', 'dark');
        updateThemeIcon(true);
      } else {
        htmlEl.classList.remove('dark');
        localStorage.setItem('theme_v2', 'light');
        updateThemeIcon(false);
      }
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark } }));
    });

    // =============== 实践经历 iframe：高度自适应，消除内部滚动 ===============
    const timelineFrame = document.querySelector('.timeline-frame');
    if (timelineFrame) {
      let rAFId = null;
      let lastHeight = 0;
      const fitFrame = () => {
        if (rAFId) cancelAnimationFrame(rAFId);
        rAFId = requestAnimationFrame(() => {
          try {
            const doc = timelineFrame.contentDocument;
            if (!doc || !doc.body) return;
            const newHeight = Math.max(doc.body.scrollHeight, doc.documentElement ? doc.documentElement.scrollHeight : 0);
            if (newHeight > 0 && Math.abs(newHeight - lastHeight) > 2) {
              lastHeight = newHeight;
              timelineFrame.style.height = newHeight + 'px';
            }
          } catch (e) {
            // 忽略跨域或未就绪异常
          }
        });
      };
      timelineFrame.addEventListener('load', () => {
        fitFrame();
        try {
          const doc = timelineFrame.contentDocument;
          if (doc && doc.body) {
            const ro = new ResizeObserver(() => {
              fitFrame();
            });
            ro.observe(doc.body);
          }
        } catch (e) {}
      });
    }

    // =============== 首屏文字动效 ===============
    document.querySelectorAll('.cyber-hover').forEach(el => {
        el.addEventListener('mouseenter', () => el.classList.add('is-active'));
        el.addEventListener('mouseleave', () => el.classList.remove('is-active'));
    });

    const scrambleChars = '!<>-_\\/[]{}—=+*^?#________';
    function scrambleText(element) {
        if(element.isScrambling) return;
        element.isScrambling = true;
        const finalString = element.getAttribute('data-final') || element.innerText.trim();
        let iterations = 0;
        const maxIterations = 20;
        element.classList.add('is-hollow');
        const interval = setInterval(() => {
            const scrambled = finalString.split('').map((char, index) => {
                if(char === ' ') return ' ';
                if(index < Math.floor(iterations / (maxIterations/finalString.length))) {
                    return `<span class="hero-char" style="color: #1F4FFF; -webkit-text-stroke: 0px;">${finalString[index]}</span>`;
                }
                return `<span class="hero-char">${scrambleChars[Math.floor(Math.random() * scrambleChars.length)]}</span>`;
            }).join('');
            element.innerHTML = scrambled;
            iterations++;
            if(iterations > maxIterations) {
                clearInterval(interval);
                element.innerHTML = finalString.split('').map(c => `<span class="hero-char">${c}</span>`).join('');
                element.classList.remove('is-hollow');
                element.isScrambling = false;
            }
        }, 30);
    }
    
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) {
      const text = heroTitle.innerText.trim();
      heroTitle.setAttribute('data-final', text);
      heroTitle.innerHTML = text.split('').map(c => `<span class="hero-char">${c}</span>`).join('');
      gsap.from('.hero-char', { rotationX: isMobile ? 0 : 90, y: -100, opacity: 0, duration: 0.8, delay: 0.2, ease: "back.out(1.7)", stagger: 0.1, transformOrigin: "bottom" });
      heroTitle.addEventListener('mouseenter', () => scrambleText(heroTitle));
    }

    const marqueeContainer = document.querySelector('.marquee-container');
    const marqueeTrack = document.getElementById('hero-marquee');
    if (marqueeContainer && marqueeTrack) {
        const textSpan = marqueeTrack.querySelector('span');
        // 克隆足够数量保证无缝连贯滚动
        for(let i=0; i<8; i++) { 
          marqueeTrack.appendChild(textSpan.cloneNode(true)); 
        }
        // 设为始终不间断自动平滑滑动 (Always auto-sliding)
        let marqueeTween = gsap.to(marqueeTrack, { 
          xPercent: -50, 
          repeat: -1, 
          duration: PERF_LITE ? 28 : 18,   // 省电档放慢，降低每秒重绘次数
          ease: "none" 
        });

        // 首屏滚出视口后暂停补间：后台持续跑的 tween 会一直占用主线程
        if ('IntersectionObserver' in window) {
          new IntersectionObserver((entries) => {
            entries.forEach(en => {
              if (en.isIntersecting) marqueeTween.resume();
              else marqueeTween.pause();
            });
          }, { threshold: 0 }).observe(marqueeContainer);
        }

        // 鼠标悬停微速缓速或略微互动，不完全停滞保持丝滑感
        marqueeContainer.addEventListener('mouseenter', () => { 
          marqueeContainer.classList.add('is-active'); 
          gsap.to(marqueeTween, { timeScale: 0.6, duration: 0.5 });
        });
        marqueeContainer.addEventListener('mouseleave', () => { 
          marqueeContainer.classList.remove('is-active'); 
          gsap.to(marqueeTween, { timeScale: 1, duration: 0.5 });
        });
    }

    // 数字分身交互台词动态循环
    const digitalSpeech = document.getElementById('digital-twin-speech');
    const avatarCard = document.getElementById('digital-avatar-card');
    if (digitalSpeech && avatarCard) {
      const speeches = [
        "系统初始化完毕。你好，我是专属数字分身。输入问题调取我的知识库记录。",
        "QUANTUM CORE // 核心架构已部署，WebGL 渲染引擎就绪",
        ">> 检索日志：AI 智能体架构 · 沉浸式前端 · 跨界策展",
        ">> 实践沉淀：语文科代表教务统筹（连续三年独任）",
        ">> CONNECT：点击右下角量子核心唤醒全息终端"
      ];
      let speechIndex = 0;
      const rotateSpeech = () => {
        speechIndex = (speechIndex + 1) % speeches.length;
        gsap.to(digitalSpeech, { opacity: 0, y: -4, duration: 0.25, onComplete: () => {
          digitalSpeech.innerText = speeches[speechIndex];
          gsap.to(digitalSpeech, { opacity: 1, y: 0, duration: 0.3 });
        }});
      };
      let speechTimer = setInterval(rotateSpeech, 4000);

      // 分身卡片滚出视口后停掉轮播定时器：离屏元素没必要继续跑动画
      if ('IntersectionObserver' in window && avatarCard) {
        new IntersectionObserver((entries) => {
          entries.forEach(en => {
            if (en.isIntersecting && !speechTimer) {
              speechTimer = setInterval(rotateSpeech, 4000);
            } else if (!en.isIntersecting && speechTimer) {
              clearInterval(speechTimer);
              speechTimer = null;
            }
          });
        }, { threshold: 0 }).observe(avatarCard);
      }

      avatarCard.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('button')) return;
        const trigger = document.getElementById('core-trigger');
        if (trigger) trigger.click();
      });
    }

    document.querySelectorAll('.liquid-btn').forEach(btn => {
        gsap.from(btn, { scale: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.1, delay: 0.5 });
        if (!isTouch) {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: 'power2.out' });
                btn.classList.add('is-active');
            });
            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.3)' });
                btn.classList.remove('is-active');
            });
        }
    });

    const kineticBtn = document.querySelector('.kinetic-btn');
    if(kineticBtn) {
        gsap.from(kineticBtn, { y: 50, opacity: 0, duration: 0.6, delay: 1 });
        kineticBtn.addEventListener('mouseenter', () => {
            kineticBtn.classList.add('is-active');
            setTimeout(() => kineticBtn.classList.remove('is-active'), 600); 
        });
    }

    // =============== Dock 放大镜 ===============
    const dockPanel = document.querySelector('.dock-panel');
    const dockItems = document.querySelectorAll('.dock-item');
    const baseItemSize = 60;
    const maxMagnification = 100;
    const distanceThreshold = 200;

    if (dockPanel) {
      if (!isTouch) {
        dockPanel.addEventListener('mousemove', (e) => {
          dockItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const dist = Math.abs(e.clientX - centerX);
            let newSize = baseItemSize;
            if (dist < distanceThreshold) {
              const progress = 1 - (dist / distanceThreshold);
              newSize = baseItemSize + (maxMagnification - baseItemSize) * Math.pow(progress, 1.5);
            }
            gsap.to(item, { width: newSize, height: newSize, duration: 0.15, ease: "none" });
          });
        });
        dockPanel.addEventListener('mouseleave', () => {
          dockItems.forEach(item => { gsap.to(item, { width: baseItemSize, height: baseItemSize, duration: 0.6, ease: "elastic.out(1, 0.5)" }); });
        });
      }
    }

    // =============== 音乐板块：视频封面挂载与播放联动引擎 ===============
    const albumsData = [
      { title: "Carnival", artist: "Sonic Youth", videoSrc: "./assets/music/just-passing-by.mp4", /* poster intentionally omitted to derive from video filename */ coverColor: "#FFFFFF", labelColor: "#1A1A1A", track: { name: "Just Passing By", time: "1:52" } }
    ];

    // 规范化 poster：如果没有显式 poster，则尝试用同名 jpg（保留 URL 编码形式），避免误引用游戏封面图片
    albumsData.forEach(album => {
      if (!album.poster) {
        try {
          album.poster = album.videoSrc.replace(/\.mp4(\?.*)?$/i, '.jpg$1');
        } catch (e) {
          album.poster = '';
        }
      }
    });

    let currentSliderAlbum = 0; let playingTrack = null; let isPlaying = false; let isSyncingVideo = false;

    function initMusicOverlay() {
      const musicContainer = document.querySelector('.music-container');
      if (!musicContainer || musicContainer.querySelector('.music-video-overlay')) return;
      const overlay = document.createElement('div');
      overlay.className = 'music-video-overlay';
      overlay.style.cssText = 'position: absolute; inset: 0; background: #000; z-index: 100; display: none; align-items: center; justify-content: center;';
      overlay.innerHTML = `
        <video class="overlay-video" preload="metadata" loop playsinline muted style="width: 100%; height: 100%; object-fit: contain;"></video>
        <button class="overlay-close" style="position: absolute; top: 16px; right: 16px; width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(255,255,255,0.25); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i data-feather="x" style="width: 20px; height: 20px;"></i></button>
      `;
      musicContainer.appendChild(overlay);
      const closeBtn = overlay.querySelector('.overlay-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const ovid = overlay.querySelector('.overlay-video');
          const returnTime = ovid ? ovid.currentTime : 0;
          const wasPlaying = overlay.dataset.wasPlaying === 'true';
          const albumIndex = parseInt(overlay.dataset.albumIndex || '0', 10);
          if (ovid) { ovid.pause(); ovid.currentTime = 0; }
          overlay.style.display = 'none';
          const activeVid = document.getElementById(`album-video-${albumIndex}`);
          if (activeVid) {
            activeVid.currentTime = returnTime;
            if (wasPlaying) {
              activeVid.muted = false;
              activeVid.play().catch(() => {});
            }
          }
        });
      }
    }

    function initSliderDOM() {
      const sliderContainer = document.getElementById('vinyl-slider');
      if(!sliderContainer) return;
      initMusicOverlay();
      sliderContainer.innerHTML = '';
      albumsData.forEach((album, i) => {
        const albumEl = document.createElement('div');
        albumEl.className = 'slider-album';
        albumEl.id = `slider-album-${i}`;
        // 如果没有显式 poster，优先从 videoSrc 推断同名 jpg（保留编码），避免误用游戏封面
        const posterPath = (album.poster && album.poster.trim()) ? album.poster : album.videoSrc.replace(/\.mp4(\?.*)?$/i, '.jpg$1');
        albumEl.innerHTML = `
            <div class="vinyl-record-wrapper"><div class="vinyl-record"><div class="vinyl-label" style="--label-color: ${album.labelColor}"><div class="vinyl-hole"></div></div></div></div>
            <div class="vinyl-sleeve">
                <div class="vinyl-sleeve-spine"></div>
                <div class="vinyl-sleeve-front" style="position: absolute; width: 100%; height: 100%; background-color: #111; background-image: linear-gradient(135deg, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('${posterPath}'); background-size: cover; background-position: center; overflow: hidden; display: flex; align-items: center; justify-content: center; z-index: 1;">
                    <video id="album-video-${i}" src="${album.videoSrc}" preload="metadata" loop muted playsinline poster="${posterPath}" style="position: absolute; width: 100%; height: 100%; object-fit: cover; z-index: 0;"></video>
                    <div class="album-play-overlay" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.25); opacity: 0; transition: opacity 0.3s; z-index: 2; pointer-events: none;"><i data-feather="play-circle" style="width: 64px; height: 64px; color: #FFFFFF; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));"></i></div>
                    <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.1); z-index: 1; pointer-events: none;"></div>
                    <div class="album-progress-bar" style="position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: rgba(0,0,0,0.35); z-index: 3; cursor: pointer;"><div class="album-progress-fill" style="height: 100%; width: 0%; background: #FFFFFF;"></div></div>
                    <div class="album-actions" style="position: absolute; bottom: 10px; right: 10px; display: flex; gap: 6px; z-index: 4;">
                        <button class="album-btn-zoom" title="放大" style="width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(0,0,0,0.55); color: #FFFFFF; display: flex; align-items: center; justify-content: center; cursor: pointer;"><i data-feather="maximize-2" style="width: 14px; height: 14px;"></i></button>
                        <a class="album-btn-download" href="${album.videoSrc}" download title="下载" style="width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(0,0,0,0.55); color: #FFFFFF; display: flex; align-items: center; justify-content: center; text-decoration: none;"><i data-feather="download" style="width: 14px; height: 14px;"></i></a>
                    </div>
                </div>
            </div>
        `;
        albumEl.addEventListener('click', () => handleAlbumClick(i));
        sliderContainer.appendChild(albumEl);

        const vid = document.getElementById(`album-video-${i}`);
        if (vid) {
          vid.addEventListener('error', () => {
            vid.style.display = 'none';
            if (vid.parentElement) {
              vid.parentElement.style.backgroundImage = `linear-gradient(135deg, rgba(0,0,0,0.12), rgba(0,0,0,0.44)), url("${posterPath}")`;
            }
          });
        }
        const progressBar = albumEl.querySelector('.album-progress-bar');
        const progressFill = albumEl.querySelector('.album-progress-fill');
        const zoomBtn = albumEl.querySelector('.album-btn-zoom');
        const downloadBtn = albumEl.querySelector('.album-btn-download');

        if (zoomBtn) {
          zoomBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const overlay = document.querySelector('.music-video-overlay');
            const overlayVideo = overlay?.querySelector('.overlay-video');
            if (overlay && overlayVideo && vid) {
              overlay.dataset.wasPlaying = (!vid.paused).toString();
              overlay.dataset.albumIndex = i.toString();
              vid.pause();
              overlayVideo.src = vid.src;
              overlayVideo.currentTime = vid.currentTime;
              overlayVideo.muted = false;
              overlay.style.display = 'flex';
              overlayVideo.play().catch(() => {});
              if (typeof feather !== 'undefined') feather.replace();
            }
          });
        }
        if (downloadBtn) {
          downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
          });
        }

        if (vid) {
          vid.addEventListener('timeupdate', () => {
            if (progressFill && vid.duration) {
              progressFill.style.width = (vid.currentTime / vid.duration * 100) + '%';
            }
          });
          vid.addEventListener('play', () => {
            if (isSyncingVideo) return;
            isSyncingVideo = true;
            if (!isPlaying || (playingTrack && playingTrack.albumIndex !== i)) {
              playingTrack = { albumIndex: i };
              isPlaying = true;
              renderSlider();
            }
            isSyncingVideo = false;
          });
          vid.addEventListener('pause', () => {
            if (isSyncingVideo) return;
            isSyncingVideo = true;
            if (isPlaying && playingTrack && playingTrack.albumIndex === i) {
              isPlaying = false;
              renderSlider();
            }
            isSyncingVideo = false;
          });
        }
        if (progressBar && vid) {
          progressBar.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = progressBar.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (vid.duration && isFinite(vid.duration)) {
              vid.currentTime = pos * vid.duration;
            }
          });
        }
      });
      if (typeof feather !== 'undefined') feather.replace();
      renderSlider();
    }

    function renderSlider() {
      albumsData.forEach((_, i) => {
         const el = document.getElementById(`slider-album-${i}`);
         const vid = document.getElementById(`album-video-${i}`);
         if(!el) return;
         
         el.className = 'slider-album'; 
         let isThisPlaying = false;

         if(i === currentSliderAlbum) {
             el.classList.add('active');
             if(isPlaying && playingTrack && playingTrack.albumIndex === i) { 
                 el.classList.add('is-playing'); 
                 isThisPlaying = true;
             }
         } else if (albumsData.length > 1 && (i === currentSliderAlbum - 1 || (currentSliderAlbum === 0 && i === albumsData.length - 1))) {
             el.classList.add('prev');
         } else if (albumsData.length > 1 && (i === currentSliderAlbum + 1 || (currentSliderAlbum === albumsData.length - 1 && i === 0))) {
             el.classList.add('next');
         } else { 
             el.classList.add('hidden'); 
         }

         if (vid) {
             if (isThisPlaying) {
                 if (vid.paused) {
                     isSyncingVideo = true;
                     vid.muted = false;
                    vid.play().catch(() => {}).finally(() => { isSyncingVideo = false; });
                 }
             } else {
                 if (!vid.paused) {
                     isSyncingVideo = true;
                     vid.muted = true;
                     vid.pause();
                     isSyncingVideo = false;
                 }
             }
         }
      });
      
      const titleEl = document.getElementById('album-title'); const artistEl = document.getElementById('album-artist');
      if(titleEl && artistEl) { titleEl.innerText = albumsData[currentSliderAlbum].title; artistEl.innerText = albumsData[currentSliderAlbum].artist; }
      
      const trackListEl = document.getElementById('track-list');
      if(trackListEl) {
         trackListEl.innerHTML = '';
         albumsData.forEach((album, aIndex) => {
            const isTrackPlaying = (isPlaying && playingTrack && playingTrack.albumIndex === aIndex);
            const playingIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"><animate attributeName="height" values="16;4;16" dur="0.8s" repeatCount="indefinite"/></rect><rect x="14" y="4" width="4" height="16"><animate attributeName="height" values="4;16;4" dur="0.8s" repeatCount="indefinite"/></rect></svg>`;
            const pausedIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21"></polygon></svg>`;
            const row = document.createElement('div');
            row.className = `track-item-row ${isTrackPlaying ? 'playing' : ''}`;
            row.innerHTML = `<div class="flex items-center flex-1 overflow-hidden"><div class="track-icon-container shrink-0">${isTrackPlaying ? playingIcon : pausedIcon}</div><span class="truncate font-bold text-sm" title="${album.track.name}">${album.track.name}</span></div><div class="flex items-center justify-end shrink-0 text-right ml-2"><span class="text-[10px] uppercase font-black px-2 py-0.5 border-2 border-[#1A1A1A] rounded-full mr-2 opacity-90 hidden md:inline-block" style="color: #1A1A1A; background-color: ${album.coverColor};">${album.title}</span><span class="text-xs font-mono opacity-80 whitespace-nowrap">${album.track.time}</span></div>`;
            row.addEventListener('click', (e) => { playTrackFromGlobal(aIndex); e.stopPropagation(); });
            trackListEl.appendChild(row);
         });
      }
    }

    window.goToAlbum = function(index) {
       if (index < 0) index = albumsData.length - 1;
       if (index >= albumsData.length) index = 0;
       currentSliderAlbum = index; renderSlider();
    };
    window.handleAlbumClick = function(index) {
       if(currentSliderAlbum === index) {
           if(isPlaying && playingTrack && playingTrack.albumIndex === index) { isPlaying = false; } else { playingTrack = { albumIndex: index }; isPlaying = true; }
       } else { currentSliderAlbum = index; playingTrack = { albumIndex: index }; isPlaying = true; }
       renderSlider();
    };
    window.playTrackFromGlobal = function(albumIndex) {
        if (currentSliderAlbum !== albumIndex) { currentSliderAlbum = albumIndex; playingTrack = { albumIndex }; isPlaying = true; } 
        else { if (playingTrack && playingTrack.albumIndex === albumIndex) { isPlaying = !isPlaying; } else { playingTrack = { albumIndex }; isPlaying = true; } }
        renderSlider();
    };
    
    // =============== PPT 现代水平画廊 (GSAP 极致平滑强控版) ===============
    const pptProjects = {
        'project1': {
            title: '商业路演',
            desc: '为商业路演设计的全套演示内容，采用强视觉冲击的版式与数据叙事，让核心卖点一目了然。',
            images: [
                './assets/photo/ppt/1.jpg',
                './assets/photo/ppt/2.jpg',
                './assets/photo/ppt/3.jpg'
            ]
        }
    };

    // 画廊图片是 CSS background-image，无法用 <picture> 降级，
    // 在 JS 侧统一改写为 WebP（原图仍作为不支持时的兜底保留在磁盘上）
    Object.values(pptProjects).forEach(p => {
        p.images = p.images.map(webpUrl);
    });

    // ================= 智能极速懒加载与渐进加载系统 =================
    /**
     * 标记图片为已加载。
     * 关键点：不依赖 img 的 load 事件——若脚本执行时图片早已从缓存命中，
     * load 事件不会再次触发，图片会永远停留在 opacity:0。
     * 这里用 complete + naturalHeight 双判定兜底，并在解码完成后释放 will-change。
     */
    function markImageLoaded(img) {
      if (!img || img.dataset.lazySettled === '1') return;
      img.dataset.lazySettled = '1';
      img.classList.add('is-loaded');
      // 动画结束后卸掉合成层，避免大量常驻 layer 拖垮移动端内存
      img.style.willChange = 'auto';
    }

    function initLazyImages() {
        const lazyImages = document.querySelectorAll('img.lazy-img');

        lazyImages.forEach(img => {
            if (img.complete && img.naturalHeight !== 0) {
                markImageLoaded(img);   // 已命中缓存：直接点亮，不等 load 事件
            } else {
                img.addEventListener('load', () => markImageLoaded(img), { once: true });
                img.addEventListener('error', () => markImageLoaded(img), { once: true });
            }
        });

        // 真·懒加载：仅在需要时才把 data-src 写回 src
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) { img.src = img.dataset.src; }
                        observer.unobserve(img);
                    }
                });
            }, { rootMargin: '200px 0px', threshold: 0.01 });

            document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
        }
    }
    // 立即执行一次，并在 DOM 稳定后再次执行
    initLazyImages();
    window.addEventListener('load', initLazyImages);

    // ================= 全局现代轻量 Toast 提示系统 =================
    window.showCyberToast = function(message = '已复制至剪贴板！', iconName = 'check-circle') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'cyber-toast';
        toast.innerHTML = `
            <div class="flex items-center gap-2.5">
                <span class="w-2 h-2 rounded-full bg-[#00C88C] animate-pulse"></span>
                <span class="font-bold text-sm tracking-wide text-white">${message}</span>
            </div>
        `;
        container.appendChild(toast);

        // 3秒后渐隐移除
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 2200);
    };

    let pptCardsObj = [];
    let pptCurrentIndex = 0;

    window.openPPTCarousel = function(id) {
        const data = pptProjects[id];
        if(!data) return;

        const titleEl = document.getElementById('ppt-detail-title');
        const descEl = document.getElementById('ppt-detail-desc');
        const titleMobileEl = document.getElementById('ppt-detail-title-mobile');
        const descMobileEl = document.getElementById('ppt-detail-desc-mobile');

        if (titleEl) titleEl.innerText = data.title;
        if (descEl) descEl.innerText = data.desc;
        if (titleMobileEl) titleMobileEl.innerText = data.title;
        if (descMobileEl) descMobileEl.innerText = data.desc;

        const scene = document.getElementById('ppt-stack-scene');
        scene.innerHTML = '';
        pptCardsObj = [];
        pptCurrentIndex = 0;

        data.images.forEach((src, i) => {
            const el = document.createElement('div');
            el.className = 'absolute inset-0 bg-contain bg-no-repeat bg-center border-[3px] sm:border-[4px] border-[#1A1A1A] cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-xl sm:rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900';
            el.style.backgroundImage = `url(${src})`;
            el.style.transformStyle = 'preserve-3d';
            el.style.transformOrigin = 'center center'; 
            
            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 bg-black/50 pointer-events-none opacity-0';
            el.appendChild(overlay);

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                pptCurrentIndex = i;
                updatePPTGallery();
            });
            
            scene.appendChild(el);
            pptCardsObj.push({ el, overlay, i });
        });

        document.getElementById('ppt-carousel-overlay').classList.remove('hidden');
        document.getElementById('ppt-carousel-overlay').classList.add('flex');
        feather.replace();

        updatePPTGallery();
    }

    window.closePPTCarousel = function() {
        document.getElementById('ppt-carousel-overlay').classList.add('hidden');
        document.getElementById('ppt-carousel-overlay').classList.remove('flex');
    }

    window.prevPPTCard = function(e) {
        if(e) e.stopPropagation();
        if (pptCurrentIndex > 0) {
            pptCurrentIndex--;
            updatePPTGallery();
        }
    };

    window.nextPPTCard = function(e) {
        if(e) e.stopPropagation();
        if (pptCurrentIndex < pptCardsObj.length - 1) {
            pptCurrentIndex++;
            updatePPTGallery();
        }
    };

    const pptOverlay = document.getElementById('ppt-carousel-overlay');
    
    // 滚轮切换
    pptOverlay.addEventListener('wheel', (e) => {
        e.preventDefault();
        if(e.deltaY > 0 && pptCurrentIndex < pptCardsObj.length - 1) {
            pptCurrentIndex++;
            updatePPTGallery();
        } else if (e.deltaY < 0 && pptCurrentIndex > 0) {
            pptCurrentIndex--;
            updatePPTGallery();
        }
    }, { passive: false });

    // 移动端触摸手势滑动支持 (Touch Swipe)
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    pptOverlay.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isSwiping = true;
        }
    }, { passive: true });

    pptOverlay.addEventListener('touchend', (e) => {
        if (!isSwiping || e.changedTouches.length === 0) return;
        isSwiping = false;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // 判定横向滑动手势
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
            if (deltaX < 0 && pptCurrentIndex < pptCardsObj.length - 1) {
                // 左滑 -> 下一张
                pptCurrentIndex++;
                updatePPTGallery();
            } else if (deltaX > 0 && pptCurrentIndex > 0) {
                // 右滑 -> 上一张
                pptCurrentIndex--;
                updatePPTGallery();
            }
        }
    }, { passive: true });

    // GSAP 驱动的 3D Cover Flow 核心函数，极致平滑
    function updatePPTGallery() {
        pptCardsObj.forEach((c, i) => {
            let offset = i - pptCurrentIndex; 
            let targetX = isMobile ? offset * 180 : offset * 240; 
            let targetZ = isMobile ? (Math.abs(offset) === 0 ? 40 : -Math.abs(offset) * 80) : (Math.abs(offset) === 0 ? 100 : -Math.abs(offset) * 150); 
            let targetRY = isMobile ? (offset === 0 ? 0 : -Math.sign(offset) * 25) : (offset === 0 ? 0 : -Math.sign(offset) * 45); 
            let targetScale = offset === 0 ? 1 : 0.85;
            let opacity = Math.abs(offset) > 2 ? 0 : 1;
            let overlayOpacity = offset === 0 ? 0 : 0.6; 

            gsap.to(c.el, {
                x: targetX,
                z: targetZ,
                rotationY: targetRY,
                scale: targetScale,
                opacity: opacity,
                duration: 0.5,
                ease: "power3.out",
                zIndex: 1000 - Math.abs(offset)
            });

            gsap.to(c.overlay, {
                opacity: overlayOpacity,
                duration: 0.5,
                ease: "power3.out"
            });
        });
    }

    // =============== 资质证书响应式网格墙 ===============
    // 证书统计：共 27 张，按机构分组排列：阿里云/AIT(10) · 科大讯飞(3) · 华为云(6) · Datawhale联合生态(8)
    // 🔁 检查结果：0 张重复（所有主题相近证书均来自不同发证机构/不同批次）
    // 用 var 声明以避免 defer 脚本在某些环境下被提前 evaluate 时触发 TDZ
    var certImages = [
      // ===== 阿里云 / AIT 人工智能训练师体系 — 10 张 =====
      "./assets/certificates/ai/aliyun-bailian-agent.jpg",              // 阿里云 · 百炼智能体构建
      "./assets/certificates/ai/aliyun-llm-content.jpg",                // 阿里云 · 大模型内容创作
      "./assets/certificates/ai/aliyun-vision-design-basic.jpg",        // 阿里云 · AIGC视觉设计师 初级
      "./assets/certificates/ai/aliyun-vision-design-advanced.jpg",     // 阿里云 · AIGC视觉设计师 高级
      "./assets/certificates/ai/aliyun-lingma-coding.jpg",              // 阿里云 · 灵马AI编程助手
      "./assets/certificates/ai/aliyun-spring-ai.jpg",                  // 阿里云 · Spring AI 开发实战
      "./assets/certificates/ai/aliyun-rag.jpg",                        // 阿里云 · RAG应用构建与优化
      "./assets/certificates/ai/aliyun-artlab-aigc.jpg",                // 阿里云 · ArtLab AIGC创作
      "./assets/certificates/ai/ait-trainer-junior.jpg",                // AIT · 人工智能训练师 初级
      "./assets/certificates/ai/ait-trainer-advanced.jpg",              // AIT · 人工智能训练师 高级

      // ===== 科大讯飞 / AI大学堂 / 讯飞开放平台 — 3 张 =====
      "./assets/certificates/ai/iflytek-prompt-engineer.jpg",           // 讯飞AI大学堂 · Prompt工程师（2026.07）
      "./assets/certificates/ai/iflytek-agent-engineer.png",            // 讯飞AI大学堂 · 智能体工程师（2026.07）
      "./assets/certificates/ai/iflytek-rag-engineer.png",              // 讯飞AI大学堂 · RAG工程师（2026.08）

      // ===== 华为云 / 昇腾 微认证体系 — 6 张 =====
      "./assets/certificates/ai/huawei-ai-intro-micro-certification.png",   // 华为云 · 人工智能初识微认证
      "./assets/certificates/ai/huawei-ai-agent-poker-battle.png",          // 华为云 · AI Agent 人机扑克对战
      "./assets/certificates/ai/huawei-ai-voice-calculator.png",            // 华为云 · AI智能语音识别计算器
      "./assets/certificates/ai/huawei-ai-poster-enterprise-style.png",     // 华为云 · AI打造企业风格专属海报
      "./assets/certificates/ai/huawei-yolov8-object-detection-atlas.png",  // 华为云昇腾 · YOLOv8目标检测训练
      "./assets/certificates/ai/huawei-codearts-quickstart.png",            // 华为云 · 码道CodeArts实战速成

      // ===== Datawhale 联合生态认证 — 8 张 =====
      "./assets/certificates/ai/datawhale-virtai-cloud-llm-engineer.jpg",       // Datawhale×趋动云 · LLM工程师
      "./assets/certificates/ai/inspur-datawhale-llm-dev-engineer.jpg",         // Datawhale×浪潮信息 · 大模型开发工程师
      "./assets/certificates/ai/modelscope-datawhale-agent-engineer.jpg",       // Datawhale×ModelScope魔搭 · Agent工程师
      "./assets/certificates/ai/datawhale-antgroup-agent-engineer.jpg",         // Datawhale×蚂蚁集团百宝箱 · Agent工程师
      "./assets/certificates/ai/datawhale-iflytek-finetuning-engineer.jpg",     // Datawhale×科大讯飞 · Fine-tuning微调工程师
      "./assets/certificates/ai/datawhale-spark-prompt-engineer.jpg",           // Datawhale×讯飞星火 · Prompt工程师
      "./assets/certificates/ai/datawhale-sensetime-ai-data-analysis.png",      // Datawhale×商汤 · AI+数据分析能力
      "./assets/certificates/ai/datawhale-marscode-ai-coding.png"               // Datawhale×豆包MarsCode · AI+编程能力
    ];

    // 证书墙用 background-image 渲染，统一改写为 WebP：
    // 27 张合计从 5.2MB 降到 1.3MB，移动端横向滑动时效果最为明显
    for (let ci = 0; ci < certImages.length; ci++) {
      certImages[ci] = webpUrl(certImages[ci]);
    }

    // =============== 资质证书磁性动效卡片流（原始实现恢复版 + 横向滚动支持） ===============
    const mcConfig = { collapsedWidth: 80, hoverWidth: 180, collapsedHeight: 56, hoverHeight: 126, openSize: 600, gap: 12, influence: 200, blur: 2, padX: 20 };
    let mcOpenIndex = null; let mcTarget = Array(certImages.length).fill(0); let mcCur = Array(certImages.length).fill(0);
    let mcLoopId = 0; let isClosing = false; let mcCloseTimer = null; const mcCards = [];
    let mcObserver = null;

    // 懒加载：仅当卡片进入（含 preload 余量）可视范围时才真正拉取图片
    function loadMcCard(card) {
       const src = card && card.dataset && card.dataset.certSrc;
       if (!src) return;
       card.style.backgroundImage = `url(${src})`;
       delete card.dataset.certSrc;
       card.classList.remove('mc-lazy');
       card.classList.add('mc-loaded');
       if (mcObserver) mcObserver.unobserve(card);
    }

    function initMcLazyLoad(mcContainer) {
       if (!('IntersectionObserver' in window)) { mcCards.forEach(loadMcCard); return; }
       // 预取余量：移动端按 3G 思路收紧到 1.5 屏，避免横向滑动时一次性拉十几张
       const preload = isMobile ? '0px 160px' : '0px 320px';
       mcObserver = new IntersectionObserver((entries) => {
          entries.forEach(en => { if (en.isIntersecting) loadMcCard(en.target); });
       }, { root: mcContainer, rootMargin: preload, threshold: 0 });
       mcCards.forEach(c => mcObserver.observe(c));
    }

    function initMagneticCarousel() {
       const mcContainer = document.getElementById('magnetic-carousel-container');
       if (!mcContainer) return;
       if (mcContainer.getBoundingClientRect().width === 0) return;
       if (mcCards.length > 0) {
           if (!isTouch) { mcTarget = certImages.map(() => 0); startMcLoop(); }
           return;
       }

       certImages.forEach((src, i) => {
          const card = document.createElement('div'); card.className = "mc-card mc-lazy";
          card.dataset.certSrc = src;  // 先只存路径，进入视口才加载
          card.setAttribute('role', 'button');
          card.setAttribute('aria-label', `证书 ${i + 1} / ${certImages.length}`);
          card.onclick = (e) => { e.stopPropagation(); if (mcOpenIndex === i) closeMc(); else openMc(i); };
          mcContainer.appendChild(card); mcCards.push(card);
       });

       // 挂载懒加载监听（容器为 root，横向滚动按需加载）
       initMcLazyLoad(mcContainer);

       if (isTouch) {
          mcContainer.classList.add('mc-static');
          return;
       }

       mcContainer.addEventListener('mousemove', (e) => {
          if (mcOpenIndex !== null) return;
          const rect = mcContainer.getBoundingClientRect(); const cx = e.clientX - rect.left + mcContainer.scrollLeft;
          const n = certImages.length;
          const startX = mcConfig.padX;
          mcTarget = certImages.map((_, i) => {
             const center = startX + i * (mcConfig.collapsedWidth + mcConfig.gap) + mcConfig.collapsedWidth / 2;
             const dist = Math.abs(cx - center); const f = Math.max(0, 1 - dist / mcConfig.influence); return f * f * (3 - 2 * f);
          });
          startMcLoop();
       });
       mcContainer.addEventListener('mouseleave', () => { if (mcOpenIndex !== null) return; mcTarget = certImages.map(() => 0); startMcLoop(); });
       renderMcCards();
    }

    function startMcLoop() {
       if (mcLoopId) return;
       const step = () => {
          let moving = false;
          for (let i = 0; i < mcCur.length; i++) {
             const d = mcTarget[i] - mcCur[i];
             if (Math.abs(d) > 0.001) { mcCur[i] += d * 0.2; moving = true; } else { mcCur[i] = mcTarget[i]; }
          }
          renderMcCards(); mcLoopId = moving ? requestAnimationFrame(step) : 0;
       };
       mcLoopId = requestAnimationFrame(step);
    }

    function renderMcCards() {
       const backdrop = document.querySelector('.mc-backdrop');
       if (backdrop) backdrop.style.pointerEvents = mcOpenIndex !== null ? "auto" : "none";
       mcCards.forEach((card, i) => {
          let w, h, isBlurred = false, z = 2; let transition = "none";
          if (mcOpenIndex !== null) {
             transition = "all 0.3s cubic-bezier(0.44, 0, 0.56, 1)";
             if (i === mcOpenIndex) { w = mcConfig.openSize; h = mcConfig.openSize; z = 3; }
             else { w = mcConfig.collapsedWidth; h = mcConfig.collapsedHeight; isBlurred = true; }
          } else {
             const f = mcCur[i]; w = mcConfig.collapsedWidth + (mcConfig.hoverWidth - mcConfig.collapsedWidth) * f;
             h = mcConfig.collapsedHeight + (mcConfig.hoverHeight - mcConfig.collapsedHeight) * f;
             if (isClosing) transition = "all 0.3s cubic-bezier(0.44, 0, 0.56, 1)";
          }
          card.style.width = w + "px"; card.style.height = h + "px"; card.style.zIndex = z;
          card.style.transition = transition; card.style.filter = isBlurred ? `blur(${mcConfig.blur}px)` : "none"; card.style.opacity = isBlurred ? "0.6" : "1";
       });
    }

    function openMc(i) { mcTarget = mcTarget.map(() => 0); mcOpenIndex = i; openLightbox(certImages[i]); setTimeout(closeMc, 100); }
    function closeMc() {
       mcTarget = certImages.map(() => 0); mcCur = certImages.map(() => 0); mcOpenIndex = null; isClosing = true; renderMcCards();
       clearTimeout(mcCloseTimer); mcCloseTimer = setTimeout(() => { isClosing = false; renderMcCards(); startMcLoop(); }, 300);
    }

    // =============== GSAP 音乐贴纸物理抓取交互 (动态全域置顶) ===============
    let highestStickerZ = 100;
    const stickers = document.querySelectorAll('.music-sticker');
    
    stickers.forEach(el => {
        gsap.set(el, { zIndex: highestStickerZ });
        highestStickerZ++;

        el.style.touchAction = 'none';
        let isDragging = false;
        let startX, startY;

        el.addEventListener('pointerdown', (e) => {
            isDragging = true;
            el.setPointerCapture(e.pointerId);
            
            const currX = gsap.getProperty(el, "x") || 0;
            const currY = gsap.getProperty(el, "y") || 0;
            
            startX = e.clientX - currX;
            startY = e.clientY - currY;
            
            highestStickerZ++; 
            gsap.to(el, { scale: 1.15, rotate: "+=5", duration: 0.2, ease: "power2.out", zIndex: highestStickerZ });
            e.stopPropagation();
        });

        el.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            gsap.set(el, { x: e.clientX - startX, y: e.clientY - startY });
        });

        const stopDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            el.releasePointerCapture(e.pointerId);
            gsap.to(el, { scale: 1, rotate: "-=5", duration: 0.5, ease: "back.out(1.5)" });
        };

        el.addEventListener('pointerup', stopDrag);
        el.addEventListener('pointercancel', stopDrag);
    });

    // =============== 杂项动画与工具 (含故障、飞机、Tab、联系) ===============
    const plane = document.getElementById("plane-icon"); 
    const container = document.getElementById("particles-container"); 
    const charsList = ['0', '1', '+', '>', '_', '$', '■', '▲'];
    
    function createParticle() {
      if(!plane) return; const rect = plane.getBoundingClientRect(); const p = document.createElement("div"); p.className = "cyber-particle"; p.innerText = charsList[Math.floor(Math.random() * charsList.length)];
      if(Math.random() > 0.5) { p.style.color = '#FFFFFF'; p.style.textShadow = '0 0 5px #1A1A1A'; }
      p.style.left = (rect.left + rect.width / 2 + (Math.random() * 20 - 10)) + "px"; p.style.top = (rect.top - 10) + "px"; p.style.fontSize = (Math.random() * 10 + 10) + "px";
      container.appendChild(p);
      gsap.to(p, { y: "-=" + (Math.random() * 80 + 40), x: "+=" + (Math.random() * 60 - 30), opacity: 1, rotation: Math.random() * 360, duration: 0.2, onComplete: () => { gsap.to(p, { opacity: 0, duration: 0.6, onComplete: () => p.remove() }); } });
    }

    setTimeout(() => {
        const isMobile = window.innerWidth < 768; const rightOffset = isMobile ? 0 : 20; 
        gsap.fromTo(plane, { left: -100, top: -100, rotation: 135 }, { left: window.innerWidth - rightOffset - 48, top: window.innerHeight * 0.4, duration: 2.2, ease: "power2.out", onComplete: () => {
               gsap.to(plane, { rotation: 180, duration: 0.5, onComplete: () => { plane.style.left = "auto"; plane.style.right = rightOffset + "px";
                   gsap.to(plane, { top: "95%", ease: "none", scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: 0.5 } });
               } }); }
        });
    }, 300);

    const bgFyl = document.getElementById("bg-fyl"); 
    let glitchTimer = null;
    function triggerGlitch() { 
        // 省电档 / 减少动态效果偏好下，直接不触发：
        // 这个动画同时驱动 text-shadow / -webkit-text-stroke / clip-path，
        // 三者都是非合成属性，作用在 55vw 巨型文字上等于每帧全屏重绘。
        if (!bgFyl || PERF_LITE) return;
        bgFyl.classList.remove('glitch-active'); 
        // 用双 rAF 代替 `void offsetWidth` 强制同步重排：
        // 同样能重置 CSS 动画，但不会阻塞主线程、不触发 layout
        requestAnimationFrame(() => {
            requestAnimationFrame(() => bgFyl.classList.add('glitch-active'));
        });
        if (glitchTimer) clearTimeout(glitchTimer);
        glitchTimer = setTimeout(() => { bgFyl.classList.remove('glitch-active'); }, 500); 
    }
    
    // 页面初次加载时触发一次炫酷就绪闪烁
    setTimeout(() => { triggerGlitch(); }, 800);

    // 导航栏 FYL 标志点击时触发彩蛋闪烁
    const brandLogo = document.querySelector('a[href="#"]');
    if (brandLogo) {
        brandLogo.addEventListener('click', (e) => {
            triggerGlitch();
        });
    }

    let lastGlitchScroll = window.pageYOffset || document.documentElement.scrollTop;
    let lastParticleAt = 0;

    /**
     * 滚动处理：passive + rAF 节流 + 帧预算控制。
     * 原实现有两个问题：
     *   1. 监听器未声明 passive，浏览器无法提前优化滚动路径；
     *   2. 每次滚动事件有 60% 概率创建粒子，而每个粒子都要读
     *      getBoundingClientRect()（强制同步布局）+ 新建 DOM + 启动 GSAP 补间，
     *      快速滑动时一帧内可能触发十几次，直接把主线程打满。
     * 现在：整段逻辑每帧最多跑一次，粒子额外按时间间隔限流。
     */
    const handleScroll = rafThrottle(() => {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (Math.abs(currentScroll - lastGlitchScroll) > 280) {
            triggerGlitch();
            lastGlitchScroll = currentScroll;
        }

        // 省电档：完全不生成粒子（移动端粒子层已在 CSS 中隐藏，生成纯属浪费）
        if (PERF_LITE) return;

        const now = performance.now();
        if (now - lastParticleAt > 220) {          // 桌面端也限流到 ~4.5 个/秒
            lastParticleAt = now;
            if (Math.random() > 0.4) createParticle();
        }
    });

    window.addEventListener('scroll', handleScroll, { passive: true });

    document.querySelectorAll('.count-up').forEach(el => {
      const val = parseInt(el.getAttribute('data-val')); const numAnim = new countUp.CountUp(el, val, { duration: 2.5, useEasing: true });
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => { if (!numAnim.error) numAnim.start(); } });
    });

    function splitTextForAnime(selector) {
      const el = document.querySelector(selector); if (!el) return null; const text = el.innerText; el.innerHTML = '';
      text.split('').forEach((char, i) => { el.innerHTML += `<span class="inline-block char" data-line="${i}">${char}</span>`; });
      return document.querySelectorAll(`${selector} .char`);
    }
    const charsAnim = PERF_LITE ? null : splitTextForAnime('#motto-text');
    if (charsAnim) {
      // 逐字位移动画在移动端是持续的主线程负担，省电档下保留静态排版
      const tl = anime.timeline({ loop: true });
      tl.add({ targets: charsAnim, translateY: [ (el) => parseInt(el.dataset.line) % 2 ? "100%" : "-100%", "0%" ], opacity: [0, 1], easing: "easeInOutExpo", duration: 800, delay: anime.stagger(80, {from: 'center'}) })
        .add({ targets: charsAnim, translateY: [ "0%", (el) => parseInt(el.dataset.line) % 2 ? "-100%" : "100%" ], opacity: [1, 0], easing: "easeInOutExpo", duration: 800, delay: anime.stagger(80, {from: 'center'}) }, '+=3000');
    }

    function createContactHtml(isHeader) {
      const email = 'wyyt1339@163.com'; const phone = '18289400309';
      const copyFn = `navigator.clipboard.writeText(this.dataset.val); if(window.showCyberToast) { window.showCyberToast('已复制: ' + this.dataset.val); }`;
      if(isHeader) {
        return `
          <button data-val="${phone}" onclick="${copyFn}" class="group/contact flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-[#0E1628]/80 border border-slate-200/80 dark:border-slate-800/90 shadow-sm backdrop-blur-md hover:border-[#00C88C] hover:text-[#00C88C] dark:hover:border-[#00FF88] dark:hover:text-[#00FF88] transition-all duration-200 cursor-pointer select-none" title="点击复制电话">
            <span class="w-5 h-5 rounded-md bg-slate-200/60 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover/contact:bg-[#00C88C]/15 group-hover/contact:text-[#00C88C] dark:group-hover/contact:text-[#00FF88] transition-colors"><i data-feather="phone" class="w-3 h-3"></i></span>
            <span>${phone}</span>
            <span class="text-[9.5px] opacity-45 font-normal tracking-wide">COPY</span>
          </button>
          <button data-val="${email}" onclick="${copyFn}" class="group/contact flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-[#0E1628]/80 border border-slate-200/80 dark:border-slate-800/90 shadow-sm backdrop-blur-md hover:border-blue-500 hover:text-blue-600 dark:hover:border-[#00C88C] dark:hover:text-[#00C88C] transition-all duration-200 cursor-pointer select-none" title="点击复制邮箱">
            <span class="w-5 h-5 rounded-md bg-slate-200/60 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover/contact:bg-blue-500/15 group-hover/contact:text-blue-600 dark:group-hover/contact:text-[#00C88C] transition-colors"><i data-feather="mail" class="w-3 h-3"></i></span>
            <span>${email}</span>
            <span class="text-[9.5px] opacity-45 font-normal tracking-wide">COPY</span>
          </button>
        `;
      } else {
        return `<button data-val="wechat_id" onclick="${copyFn}" class="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 text-slate-800 dark:text-slate-100 flex items-center justify-center hover:bg-[#00FF88] hover:border-[#00FF88] hover:text-black transition-all shadow-sm" title="复制微信"><i data-feather="message-circle" class="w-5 h-5"></i></button><button data-val="${email}" onclick="${copyFn}" class="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 text-slate-800 dark:text-slate-100 flex items-center justify-center hover:bg-[#00FF88] hover:border-[#00FF88] hover:text-black transition-all shadow-sm" title="复制邮箱"><i data-feather="mail" class="w-5 h-5"></i></button><button data-val="${phone}" onclick="${copyFn}" class="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 text-slate-800 dark:text-slate-100 flex items-center justify-center hover:bg-[#00FF88] hover:border-[#00FF88] hover:text-black transition-all shadow-sm" title="复制电话"><i data-feather="phone" class="w-5 h-5"></i></button>`;
      }
    }
    document.getElementById('contact-info').innerHTML = createContactHtml(true);
    document.getElementById('footer-contact').innerHTML = createContactHtml(false);
    feather.replace();

    function setupTabs(btnSelector, contentSelector) {
      document.querySelectorAll(btnSelector).forEach(btn => {
        btn.addEventListener('click', (e) => {
          const targetId = btn.getAttribute(btnSelector === '.tab-btn' ? 'data-target' : 'data-subtarget');
          btn.parentElement.querySelectorAll(btnSelector).forEach(b => {
            b.classList.remove('active');
            if(btnSelector === '.sub-tab-btn') {
              b.classList.add('text-gray-400', 'dark:text-gray-500', 'border-transparent');
              b.classList.remove('border-[#1F4FFF]', 'dark:border-[#00C88C]');
            }
          });
          btn.classList.add('active');
          if(btnSelector === '.sub-tab-btn') {
            btn.classList.remove('text-gray-400', 'dark:text-gray-500', 'border-transparent');
            btn.classList.add('border-[#1F4FFF]', 'dark:border-[#00C88C]');
          }

          const container = btn.closest('section') || btn.closest('.tab-content');
          container.querySelectorAll(contentSelector).forEach(content => { content.classList.add('hidden'); content.classList.remove('block'); });
          const targetContent = document.getElementById(targetId);
          if(targetContent) {
            targetContent.classList.remove('hidden'); targetContent.classList.add('block');
            
            if(targetId === 'ai-certs') initMagneticCarousel();
            if(targetId === 'ai-music') setTimeout(renderSlider, 50);
          }
        });
      });
    }
    setupTabs('.tab-btn', '.tab-content'); setupTabs('.sub-tab-btn', '.sub-tab-content');

    window.openLightbox = function(src) { const lightbox = document.getElementById('lightbox'); document.getElementById('lightbox-img').src = src; lightbox.classList.remove('hidden'); lightbox.classList.add('flex'); }
    window.closeLightbox = function() { const lightbox = document.getElementById('lightbox'); lightbox.classList.add('hidden'); lightbox.classList.remove('flex'); }
    
    // 初始化入口延时加载以防DOM未就绪
    setTimeout(() => {
        initSliderDOM();
    }, 100);

    // ================= 数字分身卡牌开屏弹射与交互收放引擎 (Anime.js Ejection & Retract Engine) =================
    let isAvatarCardVisible = true;
    let isAnimatingAvatar = false;

    function toggleAvatarCard(userTriggered = true) {
      const targetCard = document.getElementById('digital-avatar-card');
      const launcher = document.getElementById('avatar-launch-pad');
      const badge = document.getElementById('launcher-status-badge');
      const subTip = document.getElementById('launcher-sub-tip');
      const launcherFace = document.getElementById('launcher-face-wrap');
      const pingBeacon = document.getElementById('launcher-ping-beacon');
      const dotBeacon = document.getElementById('launcher-dot-beacon');

      if (!targetCard || !launcher || isAnimatingAvatar) return;

      if (isAvatarCardVisible) {
        // ========== 1. 执行卡牌收回动效 (Retract / Complete Collapse) ==========
        isAnimatingAvatar = true;
        isAvatarCardVisible = false;

        if (launcherFace) launcherFace.setAttribute('data-expr', 'curious');

        // 收缩回缩动效
        const startRect = targetCard.getBoundingClientRect();
        const destRect = launcher.getBoundingClientRect();

        // 倒放尾迹粒子
        const trailInterval = setInterval(() => {
          createEjectTrailParticle(
            destRect.left + destRect.width / 2 + (Math.random() * 20 - 10),
            destRect.top + destRect.height / 2 + (Math.random() * 20 - 10)
          );
        }, 40);

        if (typeof anime !== 'undefined') {
          anime({
            targets: targetCard,
            opacity: [1, 0],
            scale: [1, 0.85],
            translateY: [0, 16],
            filter: ['blur(0px)', 'blur(8px)'],
            duration: 380,
            easing: 'easeInCubic',
            complete: function() {
              clearInterval(trailInterval);
              targetCard.classList.add('avatar-card-collapsed');
              targetCard.style.opacity = '0';
              targetCard.style.visibility = 'hidden';
              targetCard.style.pointerEvents = 'none';
              isAnimatingAvatar = false;

              // 更新发射坞状态
              if (badge) {
                badge.textContent = 'STANDBY';
                badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors';
              }
              if (subTip) {
                subTip.textContent = '已入舱 · 点击发射';
              }
              if (launcherFace) launcherFace.setAttribute('data-expr', 'sleep');
              if (pingBeacon) {
                pingBeacon.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60';
              }
              if (dotBeacon) {
                dotBeacon.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 border border-black/80';
              }
            }
          });
        } else {
          clearInterval(trailInterval);
          targetCard.classList.add('avatar-card-collapsed');
          targetCard.style.opacity = '0';
          targetCard.style.visibility = 'hidden';
          targetCard.style.pointerEvents = 'none';
          isAnimatingAvatar = false;
          if (badge) {
            badge.textContent = 'STANDBY';
            badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors';
          }
          if (subTip) {
            subTip.textContent = '已入舱 · 点击发射';
          }
        }

      } else {
        // ========== 2. 执行卡牌展开与高能弹射 (Eject / Deploy) ==========
        isAvatarCardVisible = true;
        targetCard.classList.remove('avatar-card-collapsed');
        targetCard.style.visibility = 'visible';
        targetCard.style.opacity = '0';
        targetCard.style.filter = 'blur(0px)';

        // 发射坞状态恢复
        if (badge) {
          badge.textContent = 'ONLINE';
          badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00FF88]/15 text-emerald-600 dark:text-[#00FF88] border border-[#00FF88]/30 transition-colors';
        }
        if (subTip) {
          subTip.textContent = '点击召唤 / 收起分身卡片';
        }
        if (pingBeacon) {
          pingBeacon.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-80';
        }
        if (dotBeacon) {
          dotBeacon.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00FF88] border border-black/80';
        }

        triggerAvatarEjectAnimation(true);
      }
    }

    function triggerAvatarEjectAnimation(forceReplay = false) {
      const launcher = document.getElementById('avatar-launch-pad');
      const targetCard = document.getElementById('digital-avatar-card');
      const launcherFace = document.getElementById('launcher-face-wrap');
      if (!launcher || !targetCard) return;

      // 确保目标卡片在动画前解除完全收缩态，以便计算位置
      targetCard.classList.remove('avatar-card-collapsed');
      targetCard.style.visibility = 'visible';
      targetCard.style.pointerEvents = 'none';

      const startRect = launcher.getBoundingClientRect();
      const targetRect = targetCard.getBoundingClientRect();

      // 如果目标或发射器尚未渲染或尺寸为0，则延后重试
      if (startRect.width === 0 || targetRect.width === 0) {
        setTimeout(() => triggerAvatarEjectAnimation(forceReplay), 200);
        return;
      }

      isAnimatingAvatar = true;

      // 发射台头像联动表情
      if (launcherFace) {
        launcherFace.setAttribute('data-expr', 'wink');
        setTimeout(() => {
          if (launcherFace) launcherFace.setAttribute('data-expr', 'idle');
        }, 1200);
      }

      // 创建或获取弹射卡牌
      let projectile = document.getElementById('avatar-flight-projectile');
      if (!projectile) {
        projectile = document.createElement('div');
        projectile.id = 'avatar-flight-projectile';
        projectile.className = 'avatar-flight-projectile';
        projectile.innerHTML = `
          <div class="projectile-inner">
            <div class="projectile-glow"></div>
            <div class="projectile-core-icon">
              <span class="projectile-dot"></span>
              <span class="projectile-label font-mono">FYLEN [ˈfaɪlən] // 量子分身</span>
            </div>
            <div class="flex items-center justify-between mt-auto">
              <div class="projectile-badge">RADAR SYNC 99.8%</div>
              <span class="text-[9px] font-mono font-bold text-[#00FF88]">LAUNCHING ▶</span>
            </div>
          </div>
        `;
        document.body.appendChild(projectile);
      }

      const isDark = document.documentElement.classList.contains('dark');
      const startLeft = startRect.left;
      const startTop = startRect.top;
      const startW = startRect.width || 60;
      const startH = startRect.height || 60;

      const destLeft = targetRect.left;
      const destTop = targetRect.top;
      const destW = targetRect.width;
      const destH = targetRect.height;

      // 初始化弹射体初始状态 (与发射台一致的正方形高圆角、荧光黄、模糊)
      projectile.style.display = 'block';
      projectile.style.left = startLeft + 'px';
      projectile.style.top = startTop + 'px';
      projectile.style.width = startW + 'px';
      projectile.style.height = startH + 'px';
      projectile.style.borderRadius = '18px';
      projectile.style.backgroundColor = '#F9F640';
      projectile.style.filter = 'blur(4px)';
      projectile.style.opacity = '0.95';
      projectile.style.transform = 'rotate(-10deg) scale(0.85)';

      // 弹射尾迹发光粒子
      const trailInterval = setInterval(() => {
        if (!projectile || projectile.style.display === 'none') {
          clearInterval(trailInterval);
          return;
        }
        const curRect = projectile.getBoundingClientRect();
        if (curRect.width > 0) {
          createEjectTrailParticle(curRect.left + curRect.width / 2, curRect.top + curRect.height / 2);
        }
      }, 40);

      // 使用 Anime.js 驱动平滑弹射抛物线轨迹
      if (typeof anime !== 'undefined') {
        anime({
          targets: projectile,
          left: [startLeft, destLeft],
          top: [startTop, destTop],
          width: [startW, destW],
          height: [startH, destH],
          borderRadius: [18, 24],
          backgroundColor: ['#F9F640', isDark ? '#161616' : '#FFFFFF'],
          filter: ['blur(4px)', 'blur(0px)'],
          rotate: [-10, 0],
          scale: [0.85, 1],
          opacity: [0.95, 1],
          duration: 1050,
          easing: 'cubicBezier(0.2, 0.9, 0.3, 1)',
          complete: function() {
            clearInterval(trailInterval);
            isAnimatingAvatar = false;
            
            // 目标卡牌触发高能冲击波
            targetCard.style.opacity = '1';
            targetCard.style.transform = 'none';
            targetCard.classList.remove('card-landed-impact');
            void targetCard.offsetWidth; // 触发重绘
            targetCard.classList.add('card-landed-impact');

            // 联动数字分身表情闪烁
            const avatarWrap = document.getElementById('avatar-face-wrap');
            if (avatarWrap) {
              avatarWrap.setAttribute('data-expr', 'wink');
              setTimeout(() => {
                if (avatarWrap) avatarWrap.setAttribute('data-expr', 'idle');
              }, 1200);
            }

            // 弹射体淡出交接
            anime({
              targets: projectile,
              opacity: [1, 0],
              duration: 240,
              easing: 'easeOutQuad',
              complete: function() {
                projectile.style.display = 'none';
              }
            });
          }
        });
      } else {
        // 降级支持
        projectile.style.transition = 'all 1s cubic-bezier(0.2, 0.9, 0.3, 1)';
        projectile.style.left = destLeft + 'px';
        projectile.style.top = destTop + 'px';
        projectile.style.width = destW + 'px';
        projectile.style.height = destH + 'px';
        projectile.style.borderRadius = '24px';
        projectile.style.backgroundColor = isDark ? '#161616' : '#FFFFFF';
        projectile.style.filter = 'blur(0px)';
        projectile.style.transform = 'rotate(0deg) scale(1)';
        setTimeout(() => {
          clearInterval(trailInterval);
          isAnimatingAvatar = false;
          targetCard.classList.add('card-landed-impact');
          projectile.style.display = 'none';
        }, 1000);
      }
    }

    function createEjectTrailParticle(x, y) {
      const p = document.createElement('div');
      p.className = 'eject-trail-particle';
      const size = Math.floor(Math.random() * 8 + 6);
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = x + (Math.random() * 24 - 12) + 'px';
      p.style.top = y + (Math.random() * 24 - 12) + 'px';
      document.body.appendChild(p);

      if (typeof anime !== 'undefined') {
        anime({
          targets: p,
          scale: [1, 0],
          opacity: [0.9, 0],
          translateX: (Math.random() - 0.5) * 40,
          translateY: (Math.random() - 0.5) * 40,
          duration: 450 + Math.random() * 300,
          easing: 'easeOutQuad',
          complete: () => {
            if (p.parentNode) p.parentNode.removeChild(p);
          }
        });
      } else {
        setTimeout(() => {
          if (p.parentNode) p.parentNode.removeChild(p);
        }, 500);
      }
    }

    // 挂载全局调用，供点击重新弹射与控制显隐
    window.toggleAvatarCard = toggleAvatarCard;
    window.triggerAvatarEjectAnimation = triggerAvatarEjectAnimation;

    // 页面初次打开自动触发弹射
    window.addEventListener('load', () => {
      setTimeout(() => {
        triggerAvatarEjectAnimation();
      }, 400);
    });
    // 兼容 DOMContentLoaded 下的极速加载
    if (document.readyState === 'complete') {
      setTimeout(() => {
        triggerAvatarEjectAnimation();
      }, 400);
    }

  