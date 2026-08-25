// universe.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('solar-system-canvas');
if(container) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 8000);
    camera.position.set(0, 1000, 1600); 
    
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 100;
    controls.maxDistance = 4000; 

    function updateCameraOffset() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if(window.innerWidth < 768) {
            camera.setViewOffset(w, h, 0, h * 0.1, w, h);
        } else {
            camera.setViewOffset(w, h, w * 0.075, h * 0.16, w, h);
        }
    }
    updateCameraOffset();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffee, 4, 3000); 
    pointLight.position.set(0, 0, 0); 
    scene.add(pointLight);

    function createProceduralTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(512, 256);
        
        for (let i = 0; i < imgData.data.length; i += 4) {
            let val = Math.random() * 255;
            if (type === 'earth') {
                let isLand = Math.random() > 0.6;
                imgData.data[i] = isLand ? val*0.2 : val*0.1;       
                imgData.data[i+1] = isLand ? val*0.8 : val*0.3;     
                imgData.data[i+2] = isLand ? val*0.2 : 255 - val*0.5; 
            } else if (type === 'jupiter' || type === 'saturn') {
                let row = Math.floor((i / 4) / 512);
                let stripe = Math.sin(row * 0.05) * 50 + Math.random() * 20;
                imgData.data[i] = 180 + stripe;
                imgData.data[i+1] = 130 + stripe;
                imgData.data[i+2] = 80 + stripe;
            } else if (type === 'moon' || type === 'mercury') {
                imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = val * 0.5 + 50;
            } else if (type === 'mars') {
                imgData.data[i] = 180 + val * 0.3;
                imgData.data[i+1] = 60 + val * 0.2;
                imgData.data[i+2] = 20 + val * 0.1;
            } else {
                imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = val;
            }
            imgData.data[i+3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        return new THREE.CanvasTexture(canvas);
    }

    const sunVertexShader = `
        varying vec2 vUv; varying vec3 vPosition;
        void main() { vUv = uv; vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `;
    const sunFragmentShader = `
        uniform float time; varying vec2 vUv; varying vec3 vPosition;
        void main() {
            float noise = sin(vPosition.x * 0.1 + time) * cos(vPosition.y * 0.1 + time) * sin(vPosition.z * 0.1 + time);
            vec3 color1 = vec3(1.0, 0.2, 0.0); vec3 color2 = vec3(1.0, 0.8, 0.0);
            vec3 finalColor = mix(color1, color2, noise + 0.5);
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;
    const sunUniforms = { time: { value: 0 } };
    const sunMaterial = new THREE.ShaderMaterial({
        vertexShader: sunVertexShader, fragmentShader: sunFragmentShader, uniforms: sunUniforms
    });
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(80, 64, 64), sunMaterial);
    scene.add(sunMesh);
    sunMesh.userData = { name: "太阳", desc: "太阳系的中心恒星，提供光和热。", radius: "696,340 km", temp: "5,500 °C", orbit: "-" };

    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending });
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 32), glowMaterial);
    scene.add(sunGlow);

    const planetsData = [
        { name: "水星", r: 8, dist: 150, speed: 0.04, color: 0x888888, type: 'mercury', temp: "167 °C", desc: "距离太阳最近的行星，表面布满环形山。" },
        { name: "金星", r: 16, dist: 220, speed: 0.015, color: 0xe3bb76, type: 'venus', temp: "462 °C", desc: "拥有极其浓厚的大气层和温室效应。" },
        { name: "地球", r: 18, dist: 300, speed: 0.01, color: 0x2233ff, type: 'earth', temp: "15 °C", desc: "我们的家园，唯一已知存在生命的星球。" },
        { name: "火星", r: 10, dist: 380, speed: 0.008, color: 0xc1440e, type: 'mars', temp: "-63 °C", desc: "红色的沙漠行星，拥有太阳系最高的山峰。" },
        { name: "木星", r: 44, dist: 550, speed: 0.002, color: 0xd39c7e, type: 'jupiter', temp: "-108 °C", desc: "太阳系最大的气态巨行星，有著名的大红斑。" },
        { name: "土星", r: 36, dist: 750, speed: 0.0009, color: 0xead6b8, type: 'saturn', temp: "-139 °C", desc: "以其绚丽壮观的星环系统闻名。", hasRing: true },
        { name: "天王星", r: 24, dist: 950, speed: 0.0004, color: 0x4b70dd, type: 'uranus', temp: "-197 °C", desc: "几乎是横躺着围绕太阳公转的冰巨星。" },
        { name: "海王星", r: 22, dist: 1100, speed: 0.0001, color: 0x274687, type: 'neptune', temp: "-201 °C", desc: "距离最远的行星，表面有极其强烈的风暴。" }
    ];

    const planets = [];
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.5, transparent: true, opacity: 1.0 });

    planetsData.forEach(p => {
        const orbitGeo = new THREE.RingGeometry(p.dist, p.dist + 1, 128);
        const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
        orbitMesh.rotation.x = Math.PI / 2;
        scene.add(orbitMesh);

        const tex = createProceduralTexture(p.type);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.2 });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 32, 32), mat);
        
        if(p.type === 'earth') {
            const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
            const clouds = new THREE.Mesh(new THREE.SphereGeometry(p.r + 1, 32, 32), cloudMat);
            mesh.add(clouds);
            const moonTex = createProceduralTexture('moon');
            const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 16), new THREE.MeshStandardMaterial({map: moonTex}));
            mesh.add(moon);
            mesh.moon = moon;
        }
        
        if(p.hasRing) {
            const ringGeo = new THREE.BufferGeometry();
            const ringCount = 3000;
            const ringPos = new Float32Array(ringCount * 3);
            for(let i=0; i<ringCount; i++) {
                const r = p.r + 8 + Math.random() * 20;
                const theta = Math.random() * Math.PI * 2;
                ringPos[i*3] = r * Math.cos(theta);
                ringPos[i*3+1] = (Math.random() - 0.5) * 1;
                ringPos[i*3+2] = r * Math.sin(theta);
            }
            ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
            const ringMat = new THREE.PointsMaterial({ color: 0xead6b8, size: 1.5, transparent: true, opacity: 0.6 });
            const ring = new THREE.Points(ringGeo, ringMat);
            ring.rotation.x = 0.2;
            mesh.add(ring);
        }

        mesh.userData = { name: p.name, desc: p.desc, radius: (p.r * 800) + " km", temp: p.temp, orbit: (1/p.speed).toFixed(0) + " 天" };
        scene.add(mesh);
        planets.push({ mesh, data: p, angle: Math.random() * Math.PI * 2 });
    });

    const astGeo = new THREE.BufferGeometry();
    const astCount = 8000; 
    const astPos = new Float32Array(astCount * 3);
    const astColors = new Float32Array(astCount * 3);
    for(let i=0; i<astCount; i++) {
        const r = 460 + Math.random() * 50;
        const theta = Math.random() * Math.PI * 2;
        astPos[i*3] = r * Math.cos(theta);
        astPos[i*3+1] = (Math.random() - 0.5) * 12;
        astPos[i*3+2] = r * Math.sin(theta);
        const c = new THREE.Color().setHSL(0.1, 0.3, Math.random() * 0.5 + 0.2);
        astColors[i*3] = c.r; astColors[i*3+1] = c.g; astColors[i*3+2] = c.b;
    }
    astGeo.setAttribute('position', new THREE.BufferAttribute(astPos, 3));
    astGeo.setAttribute('color', new THREE.BufferAttribute(astColors, 3));
    const astMat = new THREE.PointsMaterial({ size: 3.0, vertexColors: true, color: 0xffffff });
    const asteroidBelt = new THREE.Points(astGeo, astMat);
    scene.add(asteroidBelt);

    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 8000; 
    const starsPos = new Float32Array(starsCount * 3);
    for(let i=0; i<starsCount * 3; i++) { starsPos[i] = (Math.random() - 0.5) * 6000; }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    const cometGeo = new THREE.SphereGeometry(2, 16, 16);
    const cometMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const comet = new THREE.Mesh(cometGeo, cometMat);
    scene.add(comet);
    let cometAngle = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let focusedPlanet = null;
    let isAligned = false;

    const infoPanel = document.getElementById('planet-info-panel');

    container.addEventListener('click', (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
        mouse.y = - ( (event.clientY - rect.top) / rect.height ) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const targets = [sunMesh, ...planets.map(p => p.mesh)];
        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
            const target = intersects[0].object;
            focusedPlanet = target;
            
            document.getElementById('pi-name').innerText = target.userData.name;
            document.getElementById('pi-radius').innerText = target.userData.radius;
            document.getElementById('pi-temp').innerText = target.userData.temp;
            document.getElementById('pi-orbit').innerText = target.userData.orbit;
            document.getElementById('pi-desc').innerText = target.userData.desc;
            infoPanel.classList.add('visible');

            const tPos = new THREE.Vector3();
            target.getWorldPosition(tPos);
            const offset = target === sunMesh ? 300 : target.geometry.parameters.radius * 6 + 50;
            
            gsap.to(camera.position, {
                x: tPos.x + offset, y: tPos.y + offset/2, z: tPos.z + offset,
                duration: 1.5, ease: "power3.inOut"
            });
            gsap.to(controls.target, {
                x: tPos.x, y: tPos.y, z: tPos.z,
                duration: 1.5, ease: "power3.inOut"
            });
        } else {
            focusedPlanet = null;
            infoPanel.classList.remove('visible');
            gsap.to(camera.position, { x: 0, y: 1000, z: 1600, duration: 1.5, ease: "power3.inOut" });
            gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power3.inOut" });
        }
    });

    container.addEventListener('dblclick', () => {
        isAligned = !isAligned;
        planets.forEach((p, idx) => {
            if(isAligned) {
                gsap.to(p, { angle: 0, duration: 2 + idx*0.2, ease: "power2.inOut" });
            } else {
                gsap.to(p, { angle: Math.random() * Math.PI * 2, duration: 2 + idx*0.2, ease: "power2.inOut" });
            }
        });
    });

    window.addEventListener('themeChanged', (e) => {
        const isDark = e.detail.isDark;
        const targetColorHex = isDark ? 0xffffff : 0x050505; 
        orbitMat.color.setHex(targetColorHex);
        starsMat.color.setHex(targetColorHex);
        astMat.color.setHex(isDark ? 0xffffff : 0x222222); 
        ambientLight.intensity = isDark ? 0.5 : 1.5; 
        pointLight.intensity = isDark ? 4 : 3;
        sunGlow.material.opacity = isDark ? 0.2 : 0.3;
        sunGlow.material.color.setHex(isDark ? 0xff4500 : 0xff0000);
    });

    const isInitDark = true; 
    const initColorHex = isInitDark ? 0xffffff : 0x050505;
    orbitMat.color.setHex(initColorHex);
    starsMat.color.setHex(initColorHex);
    astMat.color.setHex(isInitDark ? 0xffffff : 0x222222);
    ambientLight.intensity = isInitDark ? 0.5 : 1.5;
    pointLight.intensity = isInitDark ? 4 : 3;
    sunGlow.material.opacity = isInitDark ? 0.2 : 0.3;
    sunGlow.material.color.setHex(isInitDark ? 0xff4500 : 0xff0000);

    function animate(time) {
        requestAnimationFrame(animate);
        sunUniforms.time.value = time * 0.001;
        sunMesh.rotation.y += 0.005;

        planets.forEach(p => {
            if(!isAligned) p.angle -= p.data.speed;
            p.mesh.position.x = Math.cos(p.angle) * p.data.dist;
            p.mesh.position.z = Math.sin(p.angle) * p.data.dist;
            p.mesh.rotation.y += 0.02;
            if(p.mesh.moon) {
                p.mesh.moon.position.x = Math.cos(p.angle * 12) * 25;
                p.mesh.moon.position.z = Math.sin(p.angle * 12) * 25;
            }
        });

        asteroidBelt.rotation.y -= 0.001;

        cometAngle += 0.01;
        comet.position.x = Math.cos(cometAngle) * 700;
        comet.position.z = Math.sin(cometAngle) * 100;
        comet.position.y = Math.sin(cometAngle * 2) * 30;

        if(focusedPlanet) {
            const tPos = new THREE.Vector3();
            focusedPlanet.getWorldPosition(tPos);
            controls.target.copy(tPos);
        }

        controls.update();
        renderer.render(scene, camera);
    }
    animate(0);

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        updateCameraOffset();
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}