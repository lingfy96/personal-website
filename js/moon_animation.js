import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

/**
 * 初始化唯美发光月球动效
 * @param {HTMLElement} container - 要挂载动效的 DOM 容器
 * @param {Object} options - 可选配置项
 * @returns {Function} destroy - 返回一个销毁函数，用于清理内存（适用于 Vue/React 等单页应用）
 */
export function initMoonAnimation(container, options = {}) {
    if (!container) {
        console.error("Moon Animation: 缺少有效的挂载容器");
        return;
    }

    // 1. 基础场景设置
    const scene = new THREE.Scene();
    
    // 使用容器的宽高而不是 window，这样可以作为局部组件嵌入
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 摄影级过曝模拟
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 2.2; 
    container.appendChild(renderer.domElement);

    // 背景保持透明，让星空与月球自然融入页面整体布局
    container.style.overflow = 'hidden';

    // 2. 星空背景
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ 
        color: 0xeef2ff, 
        size: 0.02, 
        transparent: true, 
        opacity: 0.7 
    });
    const starVertices = [];
    for(let i = 0; i < 4000; i++) {
        starVertices.push(
            (Math.random() - 0.5) * 30, 
            (Math.random() - 0.5) * 30, 
            (Math.random() - 0.5) * 20 - 5
        );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // 3. 1:1 还原的月球材质
    // ▼▼ 月球贴图：使用本地月亮图片 ▼▼
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous'); 
    const moonTexture = textureLoader.load(options.textureUrl || './assets/photo/moon.jpg');

    const moonGroup = new THREE.Group();
    moonGroup.scale.setScalar(1.35); // 月球整体放大
    scene.add(moonGroup);

    const moonGeometry = new THREE.SphereGeometry(1.2, 128, 128); 
    const moonMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff, 
        map: moonTexture,
        bumpMap: moonTexture, 
        bumpScale: 0.001,  
        roughness: 0.6,    
        metalness: 0.0,
        emissive: 0x333b47, // 底色垫光
        emissiveIntensity: 0.5
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.rotation.z = Math.PI / 10; 
    moon.rotation.y = -Math.PI / 4; 
    moonGroup.add(moon);

    // 4. 摄影机镜头光晕 (Bloom Shader)
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
                float intensity = pow(0.55 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
                gl_FragColor = vec4(0.95, 0.97, 1.0, 1.0) * intensity * 2.0; 
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    const glowGeometry = new THREE.SphereGeometry(1.45, 64, 64);
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    moonGroup.add(glowMesh);

    // 5. 光照系统
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); 
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    scene.add(mainLight);

    // 6. 动画与自适应逻辑
    const clock = new THREE.Clock();
    const transitionDuration = 3.0; 
    const startLightPos = new THREE.Vector3(8, 0, -4);
    const targetLightPos = new THREE.Vector3(0, 0, 5); 
    let animationFrameId;

    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        moon.rotation.y += 0.0005; // 极慢自转
        stars.rotation.y -= 0.0001;

        const elapsedTime = clock.getElapsedTime();
        let progress = Math.min(elapsedTime / transitionDuration, 1.0);
        let easeProgress = 1 - Math.pow(1 - progress, 3);
        
        mainLight.position.lerpVectors(startLightPos, targetLightPos, easeProgress);

        renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', onResize);

    // 7. 暴露出销毁方法，防止 SPA 框架路由跳转时内存泄漏
    return function destroy() {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onResize);
        container.removeChild(renderer.domElement);
        
        // 释放 Three.js 内存
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
