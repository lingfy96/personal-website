import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

/**
 * 初始化发光月球 3D 动画
 * 使用原始月球真实材质纹理贴图，还原最纯正的月球视觉效果与平滑转动
 * @param {HTMLElement} container - 挂载动效的 DOM 容器
 * @param {Object} options - 可选配置项
 * @returns {Function} destroy - 销毁清理函数
 */
export function initMoonAnimation(container, options = {}) {
    if (!container) {
        console.error("Moon Animation: 缺少有效的挂载容器");
        return;
    }

    // 1. 基础场景设置
    const scene = new THREE.Scene();
    
    const width = container.clientWidth || 380;
    const height = container.clientHeight || 380;
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35; 
    container.appendChild(renderer.domElement);

    container.style.overflow = 'hidden';

    // 2. 宇宙星空背景
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ 
        color: 0xCFE2FE, 
        size: 0.022, 
        transparent: true, 
        opacity: 0.75 
    });
    const starVertices = [];
    for (let i = 0; i < 3500; i++) {
        starVertices.push(
            (Math.random() - 0.5) * 30, 
            (Math.random() - 0.5) * 30, 
            (Math.random() - 0.5) * 20 - 5
        );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // 3. 月球球体与原生贴图加载
    const textureLoader = new THREE.TextureLoader();
    const photoUrl = options.textureUrl || './assets/photo/moon.jpg';
    
    const moonTexture = textureLoader.load(photoUrl);
    moonTexture.generateMipmaps = true;

    const moonGroup = new THREE.Group();
    moonGroup.scale.setScalar(1.35);
    scene.add(moonGroup);

    const moonGeometry = new THREE.SphereGeometry(1.2, 64, 64); 
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

    // 4. 镜头外发光大气散色 (Atmospheric Limb Glow)
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
    const glowGeometry = new THREE.SphereGeometry(1.42, 64, 64);
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    moonGroup.add(glowMesh);

    // 5. 光照系统：主日光 + 边缘补光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85); 
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(5, 2, 4);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x1F4FFF, 1.2);
    rimLight.position.set(-6, -2, -3);
    scene.add(rimLight);

    // 6. 动画驱动循环：顺畅优雅的自转
    let animationFrameId;

    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        moon.rotation.y += 0.0015;
        stars.rotation.y -= 0.00008;

        renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        if (!newWidth || !newHeight) return;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', onResize);

    // 7. 销毁清理方法
    return function destroy() {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onResize);
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




