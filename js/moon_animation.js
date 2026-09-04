/**
 * 初始化发光月球 3D 动画
 * 使用原始月球真实材质纹理贴图，还原最纯正的月球视觉效果与平滑转动
 *
 * 移动端优化（本次新增）：
 *   1. 纹理优先加载 WebP，体积较原图降低约 82%
 *   2. 按性能档位下调几何体分段、星空粒子数与渲染分辨率（DPR 上限 1.5）
 *   3. 离屏自动暂停 rAF；标签页隐藏时暂停；低端设备锁 30fps
 *   4. resize 改为 rAF 节流，避免横竖屏切换时连续重建渲染缓冲
 *
 * @param {HTMLElement} container - 挂载动效的 DOM 容器
 * @param {Object} options - 可选配置项
 * @returns {Function} destroy - 销毁清理函数
 */
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

export function initMoonAnimation(container, options = {}) {
    if (!container) {
        console.error("Moon Animation: 缺少有效的挂载容器");
        return;
    }

    // ---------- 性能档位判定 ----------
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowCore = (navigator.hardwareConcurrency || 8) <= 4;
    // 省电档：移动端 / 低端机 / 用户要求减少动效
    const LITE = isMobile || prefersReduced || lowCore;

    const SEGMENTS   = LITE ? 32 : 64;    // 球体分段：三角形数随之降至约 1/4
    const STAR_COUNT = LITE ? 1000 : 3500;
    const MAX_DPR    = LITE ? 1.5 : 2;
    const TARGET_FPS = LITE ? 30 : 60;    // 月球自转极慢，30fps 肉眼无差
    const FRAME_MS   = 1000 / TARGET_FPS;

    // ---------- 1. 基础场景设置 ----------
    const scene = new THREE.Scene();

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 380;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.8;

    const renderer = new THREE.WebGLRenderer({
        antialias: !LITE,      // 移动端关闭 MSAA，改用 DPR 保证观感
        alpha: true,
        powerPreference: LITE ? 'low-power' : 'default'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    container.style.overflow = 'hidden';

    // ---------- 2. 宇宙星空背景 ----------
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xCFE2FE,
        size: 0.022,
        transparent: true,
        opacity: 0.75
    });
    const starVertices = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
        const o = i * 3;
        starVertices[o]     = (Math.random() - 0.5) * 30;
        starVertices[o + 1] = (Math.random() - 0.5) * 30;
        starVertices[o + 2] = (Math.random() - 0.5) * 20 - 5;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // ---------- 3. 月球球体与原生贴图加载 ----------
    const textureLoader = new THREE.TextureLoader();
    // 优先 WebP（同目录已由 scripts/optimize_images.py 生成），不支持时回退原图
    const textureUrl = options.textureUrl
        || (supportsWebP() ? './assets/photo/moon.webp' : './assets/photo/moon.jpg');

    const moonTexture = textureLoader.load(textureUrl);
    moonTexture.generateMipmaps = true;
    moonTexture.minFilter = THREE.LinearMipmapLinearFilter;

    const moonGroup = new THREE.Group();
    moonGroup.scale.setScalar(1.35);
    scene.add(moonGroup);

    const moonGeometry = new THREE.SphereGeometry(1.2, SEGMENTS, SEGMENTS);
    const moonMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        map: moonTexture,
        bumpMap: moonTexture,
        bumpScale: 0.025,
        roughness: 0.82,
        metalness: 0.02,
        emissive: 0x162032,
        emissiveIntensity: 0.35
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.rotation.z = Math.PI / 12; // 优雅倾角
    moonGroup.add(moon);

    // ---------- 4. 镜头外发光大气散色 (Atmospheric Limb Glow) ----------
    const glowMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 3.5);
                gl_FragColor = vec4(0.7, 0.85, 1.0, 1.0) * intensity * 1.6;
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    const glowGeometry = new THREE.SphereGeometry(1.42, SEGMENTS, SEGMENTS);
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    moonGroup.add(glowMesh);

    // ---------- 5. 光照系统：主日光 + 边缘补光 ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(5, 2, 4);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x1F4FFF, 1.2);
    rimLight.position.set(-6, -2, -3);
    scene.add(rimLight);

    // ---------- 6. 动画驱动循环 ----------
    let animationFrameId = 0;
    let running = true;      // 综合开关：可见 && 在视口内 && 标签页在前台
    let inViewport = true;
    let pageVisible = !document.hidden;
    let lastFrameAt = 0;

    function frame(now) {
        animationFrameId = requestAnimationFrame(frame);
        if (!running) return;

        // 帧率上限：省电档锁 30fps，未到间隔直接跳过本帧渲染
        if (now - lastFrameAt < FRAME_MS) return;
        lastFrameAt = now;

        moon.rotation.y += 0.0015;
        stars.rotation.y -= 0.00008;

        renderer.render(scene, camera);
    }

    function syncRunning() {
        const shouldRun = inViewport && pageVisible;
        if (shouldRun === running) return;
        running = shouldRun;
        // 恢复运行时重置时间戳，避免累积出一帧超长跳跃
        lastFrameAt = 0;
    }

    animationFrameId = requestAnimationFrame(frame);

    // 离屏暂停：月球位于首屏，向下滚动后继续渲染纯属浪费 GPU 与电量
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            entries.forEach(en => { inViewport = en.isIntersecting; });
            syncRunning();
        }, { threshold: 0 }).observe(container);
    }

    const onVisibilityChange = () => {
        pageVisible = !document.hidden;
        syncRunning();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // ---------- 7. 尺寸自适应（rAF 节流） ----------
    let resizeRaf = 0;
    const onResize = () => {
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(() => {
            resizeRaf = 0;
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            if (!newWidth || !newHeight) return;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        });
    };
    window.addEventListener('resize', onResize, { passive: true });
    // 移动端横竖屏切换后视口尺寸才最终确定，补一次延迟校正
    window.addEventListener('orientationchange', () => setTimeout(onResize, 250), { passive: true });

    // ---------- 8. 销毁清理 ----------
    return function destroy() {
        cancelAnimationFrame(animationFrameId);
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }

        moonGeometry.dispose();
        moonMaterial.dispose();
        glowGeometry.dispose();
        glowMaterial.dispose();
        starGeometry.dispose();
        starMaterial.dispose();
        moonTexture.dispose();
        renderer.dispose();
    };
}

/** 检测浏览器是否支持 WebP 解码（结果按会话缓存） */
let _webp = null;
function supportsWebP() {
    if (_webp !== null) return _webp;
    try {
        const c = document.createElement('canvas');
        if (!c.getContext || !c.getContext('2d')) { _webp = false; return _webp; }
        _webp = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) {
        _webp = false;
    }
    return _webp;
}
