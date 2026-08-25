    // 基础交互统一初始化
    feather.replace();

    // =============== 移动端/触控设备检测与 3D 降级 ===============
    const isTouch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
    const isMobile = window.innerWidth < 768 || isTouch;
    if (isMobile) document.documentElement.classList.add('mobile-degrade');

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

    htmlEl.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    updateThemeIcon(true);

    themeToggleBtn.addEventListener('click', () => {
      const isDark = !htmlEl.classList.contains('dark');
      if (isDark) {
        htmlEl.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon(true);
      } else {
        htmlEl.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        updateThemeIcon(false);
      }
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark } }));
    });

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
                    return `<span class="hero-char" style="color: #EDA634; -webkit-text-stroke: 0px;">${finalString[index]}</span>`;
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
        for(let i=0; i<5; i++) { marqueeTrack.appendChild(textSpan.cloneNode(true)); }
        let marqueeTween = gsap.to(marqueeTrack, { xPercent: -50, repeat: -1, duration: 5, ease: "none", paused: true });
        marqueeContainer.addEventListener('mouseenter', () => { marqueeContainer.classList.add('is-active'); marqueeTween.play(); });
        marqueeContainer.addEventListener('mouseleave', () => { marqueeContainer.classList.remove('is-active'); marqueeTween.pause(); gsap.to(marqueeTrack, { xPercent: 0, duration: 0.5, ease: "power2.out" }); });
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
      { title: "Carnival", artist: "Sonic Youth", videoSrc: "./Music/Just%20Passing%20By.mp4", poster: "./game/坦克大战/9cbc5ae8b1c98eae4ce19401d2f6fc80.jpg", coverColor: "#FF4F97", labelColor: "#3A5DFF", track: { name: "Just Passing By", time: "1:52" } }
    ];

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
        albumEl.innerHTML = `
            <div class="vinyl-record-wrapper"><div class="vinyl-record"><div class="vinyl-label" style="--label-color: ${album.labelColor}"><div class="vinyl-hole"></div></div></div></div>
            <div class="vinyl-sleeve">
                <div class="vinyl-sleeve-spine"></div>
                <div class="vinyl-sleeve-front" style="position: absolute; width: 100%; height: 100%; background-color: #111; background-image: linear-gradient(135deg, rgba(0,0,0,0.1), rgba(0,0,0,0.45)), url('${album.poster || './game/坦克大战/9cbc5ae8b1c98eae4ce19401d2f6fc80.jpg'}'); background-size: cover; background-position: center; overflow: hidden; display: flex; align-items: center; justify-content: center; z-index: 1;">
                    <video id="album-video-${i}" src="${album.videoSrc}" preload="metadata" loop muted playsinline poster="${album.poster || './game/坦克大战/9cbc5ae8b1c98eae4ce19401d2f6fc80.jpg'}" onerror="this.style.display='none'; this.parentElement.style.backgroundImage='linear-gradient(135deg, rgba(0,0,0,0.12), rgba(0,0,0,0.44)), url(\'${album.poster || './game/坦克大战/9cbc5ae8b1c98eae4ce19401d2f6fc80.jpg'}\')';" style="position: absolute; width: 100%; height: 100%; object-fit: cover; z-index: 0;"></video>
                    <div class="album-play-overlay" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.25); opacity: 0; transition: opacity 0.3s; z-index: 2; pointer-events: none;"><i data-feather="play-circle" style="width: 64px; height: 64px; color: #F3E6C7; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));"></i></div>
                    <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.1); z-index: 1; pointer-events: none;"></div>
                    <div class="album-progress-bar" style="position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: rgba(0,0,0,0.35); z-index: 3; cursor: pointer;"><div class="album-progress-fill" style="height: 100%; width: 0%; background: #70f3ff;"></div></div>
                    <div class="album-actions" style="position: absolute; bottom: 10px; right: 10px; display: flex; gap: 6px; z-index: 4;">
                        <button class="album-btn-zoom" title="放大" style="width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(0,0,0,0.55); color: #F3E6C7; display: flex; align-items: center; justify-content: center; cursor: pointer;"><i data-feather="maximize-2" style="width: 14px; height: 14px;"></i></button>
                        <a class="album-btn-download" href="${album.videoSrc}" download title="下载" style="width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(0,0,0,0.55); color: #F3E6C7; display: flex; align-items: center; justify-content: center; text-decoration: none;"><i data-feather="download" style="width: 14px; height: 14px;"></i></a>
                    </div>
                </div>
            </div>
        `;
        albumEl.addEventListener('click', () => handleAlbumClick(i));
        sliderContainer.appendChild(albumEl);

        const vid = document.getElementById(`album-video-${i}`);
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
            title: '商业企划PPT',
            desc: '为顶尖商业赛事设计的路演全套幻灯片，采用极简排版与高对比度色彩，提升数据可视化的信息传达效率。',
            images: ['./ppt1.jpg', './ppt2.jpg', './ppt3.jpg']
        },
        'project2': {
            title: '年终总结模板',
            desc: '专为职场精英打造的年终汇报PPT模板，内置多种图表与逻辑动画，让年终复盘更具说服力。',
            images: ['./ppt4.jpg', './ppt5.jpg', './ppt6.jpg']
        },
        'project3': {
            title: '课程答辩演示',
            desc: '大学期末核心课程的答辩展示，清晰梳理研究脉络，运用大图压屏与留白艺术，获得专业最高分。',
            images: ['./ppt7.jpg', './ppt8.jpg', './ppt9.jpg']
        }
    };

    let pptCardsObj = [];
    let pptCurrentIndex = 0;

    window.openPPTCarousel = function(id) {
        const data = pptProjects[id];
        if(!data) return;

        document.getElementById('ppt-detail-title').innerText = data.title;
        document.getElementById('ppt-detail-desc').innerText = data.desc;

        const scene = document.getElementById('ppt-stack-scene');
        scene.innerHTML = '';
        pptCardsObj = [];
        pptCurrentIndex = 0;

        data.images.forEach((src, i) => {
            const el = document.createElement('div');
            el.className = 'absolute inset-0 bg-cover bg-center border-[4px] border-[#1A1A1A] cursor-pointer shadow-[0_30px_60px_rgba(0,0,0,0.6)] rounded-lg overflow-hidden';
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

    const pptOverlay = document.getElementById('ppt-carousel-overlay');
    
    // 监听滚轮直接切换索引，摒弃原生卡顿阻尼，改用 GSAP 丝滑强控落位
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

    // GSAP 驱动的 3D Cover Flow 核心函数，极致平滑无穿模
    function updatePPTGallery() {
        pptCardsObj.forEach((c, i) => {
            let offset = i - pptCurrentIndex; 
            let targetX = offset * 240; 
            let targetZ = isMobile ? 0 : (Math.abs(offset) === 0 ? 100 : -Math.abs(offset) * 150); 
            let targetRY = isMobile ? 0 : (offset === 0 ? 0 : -Math.sign(offset) * 45); 
            let targetScale = offset === 0 ? 1 : 0.85;
            let opacity = Math.abs(offset) > 2 ? 0 : 1;
            let overlayOpacity = offset === 0 ? 0 : 0.6; 

            gsap.to(c.el, {
                x: targetX,
                z: targetZ,
                rotationY: targetRY,
                scale: targetScale,
                opacity: opacity,
                duration: 0.6,
                ease: "power3.out",
                zIndex: 1000 - Math.abs(offset)
            });

            gsap.to(c.overlay, {
                opacity: overlayOpacity,
                duration: 0.6,
                ease: "power3.out"
            });
        });
    }

    // =============== 资质证书 Framer-like Cover Flow ===============
    const certImages = [
      "./AIcertificates/102d2774e028f87def477768ef55f5c9.jpg",
      "./AIcertificates/1d28f9969420e151e866ac6e647f36ec.jpg",
      "./AIcertificates/3006334a03a6485c097bd7d08169eb70.jpg",
      "./AIcertificates/35a03a21290dc8ccc301e6a2543b7d03.jpg",
      "./AIcertificates/4d73f5a3b9ae01b4d82d84842160e23b.jpg",
      "./AIcertificates/88b36c66bfcd3084360bbf981d6771d6.jpg",
      "./AIcertificates/8babadccf1716c5180330f8d8c0ef35d.jpg",
      "./AIcertificates/d09de460c21743af2d9ba0320aff5b62.png",
      "./AIcertificates/d7e0152f8e04d17e680376c26769bde3.jpg",
      "./AIcertificates/d89e0e67a6dfabcf196cc663ebed7723.jpg",
      "./AIcertificates/e88fb5ec76894e142ac4ff60dcca0596.jpg",
      "./AIcertificates/e9619014a6a114cae3f34306b4a845a2.jpg"
    ];

    const mcConfig = { collapsedWidth: 80, hoverWidth: 180, collapsedHeight: 56, hoverHeight: 126, openSize: 600, gap: 12, influence: 200, blur: 2 };
    let mcOpenIndex = null; let mcTarget = Array(certImages.length).fill(0); let mcCur = Array(certImages.length).fill(0);
    let mcLoopId = 0; let isClosing = false; let mcCloseTimer = null; const mcCards = [];

    function initMagneticCarousel() {
       const mcContainer = document.getElementById('magnetic-carousel-container');
       if (!mcContainer) return;
       if (mcContainer.getBoundingClientRect().width === 0) return; 
       if (mcCards.length > 0) {
           if (!isTouch) { mcTarget = certImages.map(() => 0); startMcLoop(); }
           return;
       }

       certImages.forEach((src, i) => {
          const card = document.createElement('div'); card.className = "mc-card"; card.style.backgroundImage = `url(${src})`;
          card.onclick = (e) => { e.stopPropagation(); if (mcOpenIndex === i) closeMc(); else openMc(i); };
          mcContainer.appendChild(card); mcCards.push(card);
       });

       if (isTouch) {
          mcContainer.classList.add('mc-static');
          return;
       }

       mcContainer.addEventListener('mousemove', (e) => {
          if (mcOpenIndex !== null) return;
          const rect = mcContainer.getBoundingClientRect(); const cx = e.clientX - rect.left;
          const n = certImages.length; const totalBase = n * mcConfig.collapsedWidth + (n - 1) * mcConfig.gap;
          const startX = (rect.width - totalBase) / 2;
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

        if (isTouch) {
            el.classList.add('sticker-static');
            return;
        }

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
      if(Math.random() > 0.5) { p.style.color = '#DD201B'; p.style.textShadow = '0 0 5px #EDA634'; }
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
    function triggerGlitch() { 
        if(!bgFyl) return; 
        bgFyl.classList.add('glitch-active'); 
        setTimeout(() => { bgFyl.classList.remove('glitch-active'); }, 400); 
    }
    
    let lastGlitchScroll = window.pageYOffset || document.documentElement.scrollTop;
    let isScrollingParticle; 
    window.addEventListener('scroll', () => {
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        if (Math.abs(currentScroll - lastGlitchScroll) > 400) { 
            triggerGlitch();
            lastGlitchScroll = currentScroll;
        }
        if(Math.random() > 0.4) createParticle(); 
        clearTimeout(isScrollingParticle); 
        isScrollingParticle = setTimeout(() => {}, 66);
    });

    document.querySelectorAll('.count-up').forEach(el => {
      const val = parseInt(el.getAttribute('data-val')); const numAnim = new countUp.CountUp(el, val, { duration: 2.5, useEasing: true });
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => { if (!numAnim.error) numAnim.start(); } });
    });

    function splitTextForAnime(selector) {
      const el = document.querySelector(selector); if (!el) return null; const text = el.innerText; el.innerHTML = '';
      text.split('').forEach((char, i) => { el.innerHTML += `<span class="inline-block char" data-line="${i}">${char}</span>`; });
      return document.querySelectorAll(`${selector} .char`);
    }
    const charsAnim = splitTextForAnime('#motto-text');
    if (charsAnim) {
      const tl = anime.timeline({ loop: true });
      tl.add({ targets: charsAnim, translateY: [ (el) => parseInt(el.dataset.line) % 2 ? "100%" : "-100%", "0%" ], opacity: [0, 1], easing: "easeInOutExpo", duration: 800, delay: anime.stagger(80, {from: 'center'}) })
        .add({ targets: charsAnim, translateY: [ "0%", (el) => parseInt(el.dataset.line) % 2 ? "-100%" : "100%" ], opacity: [1, 0], easing: "easeInOutExpo", duration: 800, delay: anime.stagger(80, {from: 'center'}) }, '+=3000');
    }

    function createContactHtml(isHeader) {
      const email = 'wyyt1339@163.com'; const phone = '18289400309';
      const copyFn = `navigator.clipboard.writeText(this.dataset.val); alert('已复制至剪贴板！');`;
      if(isHeader) {
        return `<button data-val="${phone}" onclick="${copyFn}" class="flex items-center gap-2 font-mono font-bold px-4 py-2 border-4 border-brand-dark bg-white text-brand-dark hover:bg-brand-yellow shadow-[4px_4px_0px_0px_#1A1A1A] transition-all"><i data-feather="phone" class="w-5 h-5"></i> ${phone}</button><button data-val="${email}" onclick="${copyFn}" class="flex items-center gap-2 font-mono font-bold px-4 py-2 border-4 border-brand-dark bg-white text-brand-dark hover:bg-brand-blue hover:text-white shadow-[4px_4px_0px_0px_#1A1A1A] transition-all"><i data-feather="mail" class="w-5 h-5"></i> ${email}</button>`;
      } else {
        return `<button data-val="wechat_id" onclick="${copyFn}" class="w-14 h-14 bg-brand-cream dark:bg-[#1A1A1A] border-4 border-brand-cream dark:border-brand-cream text-brand-dark dark:text-brand-cream flex items-center justify-center hover:bg-brand-red hover:border-brand-red hover:text-white transition-colors"><i data-feather="message-circle" class="w-6 h-6"></i></button><button data-val="${email}" onclick="${copyFn}" class="w-14 h-14 bg-brand-cream dark:bg-[#1A1A1A] border-4 border-brand-cream dark:border-brand-cream text-brand-dark dark:text-brand-cream flex items-center justify-center hover:bg-brand-red hover:border-brand-red hover:text-white transition-colors"><i data-feather="mail" class="w-6 h-6"></i></button><button data-val="${phone}" onclick="${copyFn}" class="w-14 h-14 bg-brand-cream dark:bg-[#1A1A1A] border-4 border-brand-cream dark:border-brand-cream text-brand-dark dark:text-brand-cream flex items-center justify-center hover:bg-brand-red hover:border-brand-red hover:text-white transition-colors"><i data-feather="phone" class="w-6 h-6"></i></button>`;
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
            if(btnSelector === '.tab-btn') { 
                b.classList.remove('active', 'bg-brand-red', 'text-brand-cream', 'shadow-[6px_6px_0px_0px_#145A8F]'); 
                b.classList.add('bg-white', 'dark:bg-[#1A1A1A]'); 
            } 
            else { 
                b.classList.remove('active', 'border-brand-dark', 'text-brand-dark', 'dark:text-brand-cream', 'dark:border-brand-cream'); 
                b.classList.add('border-transparent', 'text-gray-500'); 
            }
          });
          if(btnSelector === '.tab-btn') { 
              btn.classList.add('active', 'bg-brand-red', 'text-brand-cream', 'shadow-[6px_6px_0px_0px_#145A8F]'); 
              btn.classList.remove('bg-white', 'dark:bg-[#1A1A1A]'); 
          } 
          else { 
              btn.classList.add('active', 'border-brand-dark', 'text-brand-dark', 'dark:text-brand-cream', 'dark:border-brand-cream'); 
              btn.classList.remove('border-transparent', 'text-gray-500'); 
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
  