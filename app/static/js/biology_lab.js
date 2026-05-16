import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- CONFIG & STATE ---
let scene, camera, renderer, controls, raycaster;
const mouse = new THREE.Vector2();
let currentComponents = [];
let tourIndex = 0;
let tourInterval = null;
let isTouring = false;

// --- INITIALIZATION ---
function init() {
    const container = document.getElementById('ai-canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 10, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x6366f1, 2, 100);
    pointLight.position.set(10, 20, 10);
    scene.add(pointLight);

    raycaster = new THREE.Raycaster();

    // Environment
    createStarfield();

    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onCanvasClick);

    setupUIListeners();

    // Check Visibility for animation loop
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                renderer.setAnimationLoop(animate);
            } else {
                renderer.setAnimationLoop(null);
            }
        });
    }, { threshold: 0.1 });
    observer.observe(container);

    if (window.feather) feather.replace();
}

function createStarfield() {
    const geo = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 5000; i++) {
        vertices.push(
            THREE.MathUtils.randFloatSpread(500),
            THREE.MathUtils.randFloatSpread(500),
            THREE.MathUtils.randFloatSpread(500)
        );
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const mat = new THREE.PointsMaterial({ size: 0.5, color: 0x4f46e5, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(geo, mat));
}

function onWindowResize() {
    const container = document.getElementById('ai-canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// --- UI LISTENERS ---
function setupUIListeners() {
    // Model Selector
    document.querySelectorAll('.model-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.model-option').forEach(o => {
                o.classList.remove('selected', 'border-indigo-500/50', 'bg-indigo-500/10');
                o.classList.add('border-white/10');
            });
            opt.classList.add('selected', 'border-indigo-500/50', 'bg-indigo-500/10');
            opt.classList.remove('border-white/10');
        };
    });

    // Upload
    const uploadBtn = document.getElementById('upload-trigger-btn');
    const fileInput = document.getElementById('bio-upload');
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        if (e.target.files.length > 0) handleUpload(e.target.files[0]);
    };

    // Demo
    document.getElementById('demo-btn').onclick = loadDemo;

    // URL Analyze
    document.getElementById('bio-url-btn').onclick = () => {
        const url = document.getElementById('bio-url-input').value.trim();
        if (url) handleUpload(null, url);
    };

    // HUD
    document.getElementById('reset-btn').onclick = () => {
        animateCameraTo(new THREE.Vector3(0, 5, 15), new THREE.Vector3(0, 0, 0));
    };
    document.getElementById('start-tour-btn').onclick = toggleTour;

    // Chat
    document.getElementById('ai-chat-form').onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('ai-chat-input');
        const msg = input.value.trim();
        if (msg) {
            sendChatMessage(msg);
            input.value = '';
        }
    };

    document.getElementById('close-ai-info').onclick = () => {
        document.getElementById('ai-info-panel').classList.add('hidden');
    };

    document.getElementById('ask-specialist-btn').onclick = () => {
        const title = document.getElementById('ai-panel-title').textContent;
        sendChatMessage(`Tell me more about the ${title} in this cell.`);
    };

    document.getElementById('upload-new-btn').onclick = () => location.reload();
}

// --- FLOWS ---
async function handleUpload(file, url = null) {
    showLoading(true);
    const modelId = document.querySelector('.model-option.selected').dataset.model;

    // First, identify biological components
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (url) formData.append('url', url);
    formData.append('model_id', modelId);

    try {
        const resp = await fetch('/api/biology-lab/analyse', {
            method: 'POST',
            body: formData
        });
        const data = await resp.json();

        if (data.error) throw new Error(data.error);

        buildScene(data.components);
        enterImmersiveMode(data);

        // Second, try to generate a real 3D model artifact (mirror CellForge)
        // We do this in the background to show the procedurally generated scene first
        fetch('/api/cellforge/generate', {
            method: 'POST',
            body: formData
        }).then(res => res.json()).then(modelData => {
            if (modelData.model_data) {
                console.log("3D Artifact Generated:", modelData.provider);
                addGuideMessage(`I've also generated a reconstructed 3D model using ${modelData.provider}. Processing complete.`);
            }
        }).catch(err => console.warn("3D generation skipped or failed:", err));

    } catch (err) {
        alert("Analysis Error: " + err.message);
        showLoading(false);
    }
}

function loadDemo() {
    const demoData = {
        components: [
            { id: 'nucleus', name: 'Nucleus', type: 'nucleus', color: '#6366f1', size: 'large', description: 'Control center containing DNA', function: 'Regulates cell activities', facts: ['Contains 46 chromosomes', 'Nuclear envelope with pores'], position_hint: 'center' },
            { id: 'mitochondria-1', name: 'Mitochondria', type: 'mitochondria', color: '#f59e0b', size: 'medium', description: 'Powerhouse of the cell', function: 'Produces ATP energy', facts: ['Has its own DNA', 'Found in most eukaryotic cells'], position_hint: 'inner' },
            { id: 'membrane', name: 'Cell Membrane', type: 'membrane', color: '#10b981', size: 'large', description: 'Semi-permeable barrier', function: 'Controls cell entry/exit', facts: ['Phospholipid bilayer', 'Protects cell contents'], position_hint: 'outer' },
            { id: 'golgi', name: 'Golgi Apparatus', type: 'golgi', color: '#ef4444', size: 'medium', description: 'Packaging center', function: 'Modifies and sorts proteins', facts: ['Named after Camillo Golgi', 'Stack of flattened sacs'], position_hint: 'inner' },
            { id: 'ribosome-1', name: 'Ribosome', type: 'ribosome', color: '#fbbf24', size: 'small', description: 'Protein factory', function: 'Protein synthesis', facts: ['Can be free or bound', 'Made of RNA and protein'], position_hint: 'scattered' },
            { id: 'ribosome-2', name: 'Ribosome', type: 'ribosome', color: '#fbbf24', size: 'small', description: 'Protein factory', function: 'Protein synthesis', facts: ['Essential for life', 'Translates mRNA'], position_hint: 'scattered' },
            { id: 'er', name: 'Endoplasmic Reticulum', type: 'endoplasmic_reticulum', color: '#8b5cf6', size: 'medium', description: 'Transport network', function: 'Synthesizes lipids and proteins', facts: ['Rough ER has ribosomes', 'Smooth ER detoxifies'], position_hint: 'inner' },
            { id: 'lysosome', name: 'Lysosome', type: 'lysosome', color: '#f97316', size: 'small', description: 'Waste disposal', function: 'Digests macromolecules', facts: ['Contains digestive enzymes', 'pH is acidic'], position_hint: 'scattered' }
        ],
        count: 8
    };
    buildScene(demoData.components);
    enterImmersiveMode(demoData);
}

function showLoading(show) {
    const overlay = document.getElementById('bio-loading');
    if (show) overlay.classList.remove('hidden');
    else overlay.classList.add('hidden');
}

function enterImmersiveMode(data) {
    showLoading(false);
    document.getElementById('intro-ui').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('hud-panel').classList.remove('opacity-0', 'pointer-events-none');
    document.getElementById('build-section').classList.remove('opacity-0', 'pointer-events-none');
    document.getElementById('component-count').textContent = `${data.count} Detected`;

    // Populate Sidebar & Tags
    const list = document.getElementById('component-list');
    const tagsContainer = document.getElementById('component-tags');
    list.innerHTML = '';
    tagsContainer.innerHTML = '';

    data.components.forEach(c => {
        // Sidebar Item
        const item = document.createElement('div');
        item.className = 'p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all group';
        item.innerHTML = `
            <div class="w-2 h-2 rounded-full" style="background-color: ${c.color}"></div>
            <span class="text-xs text-white/80 group-hover:text-white">${c.name}</span>
        `;
        item.onclick = () => selectComponent(c.id);
        list.appendChild(item);

        // Tag
        const tag = document.createElement('button');
        tag.className = 'px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-bold text-white hover:bg-white/10 transition-all';
        tag.style.borderColor = `${c.color}44`;
        tag.textContent = c.name.toUpperCase();
        tag.onclick = () => selectComponent(c.id);
        tagsContainer.appendChild(tag);
    });

    addGuideMessage(`Analysis complete. I've identified ${data.count} biological structures. You can click them in the 3D view or select from the list to explore details.`);

    currentComponents = data.components;
    window.currentComponents = data.components;
}

// --- THREE.JS BUILDER ---
function buildScene(componentsData) {
    // Clear previous
    while(scene.children.length > 0) {
        const obj = scene.children[0];
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
        scene.remove(obj);
    }

    createStarfield();
    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pl = new THREE.PointLight(0x6366f1, 2, 100);
    pl.position.set(10, 20, 10);
    scene.add(pl);

    componentsData.forEach((comp, idx) => {
        let geo, mat, mesh;
        const color = new THREE.Color(comp.color);

        if (comp.type === 'nucleus') {
            geo = new THREE.SphereGeometry(3, 64, 64);
        } else if (comp.type === 'membrane') {
            geo = new THREE.TorusGeometry(8, 0.2, 16, 100);
        } else if (comp.type === 'mitochondria') {
            geo = new THREE.CapsuleGeometry(0.8, 1.5, 4, 16);
        } else if (comp.type === 'golgi' || comp.type === 'endoplasmic_reticulum') {
            geo = new THREE.TorusKnotGeometry(1.2, 0.4, 64, 8);
        } else if (comp.type === 'rod') {
            geo = new THREE.CylinderGeometry(0.3, 0.3, 2, 12);
        } else {
            geo = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 32, 32);
        }

        mat = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.85,
            shininess: 100,
            emissive: color,
            emissiveIntensity: 0.1
        });

        mesh = new THREE.Mesh(geo, mat);

        // Position
        if (comp.position_hint === 'center') {
            mesh.position.set(0, 0, 0);
        } else if (comp.position_hint === 'outer') {
            const angle = (idx / componentsData.length) * Math.PI * 2;
            mesh.position.set(Math.cos(angle) * 8, 0, Math.sin(angle) * 8);
        } else {
            const radius = 4 + Math.random() * 3;
            const angle = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 5;
            mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        }

        mesh.userData = comp;
        mesh.userData.isComponent = true;
        if (comp.type === 'nucleus') mesh.userData.pulse = true;
        scene.add(mesh);

        // Label
        addLabel(mesh, comp.name, color);
    });

    // Outer Cell Sphere (Faint)
    const shellGeo = new THREE.SphereGeometry(12, 64, 64);
    const shellMat = new THREE.MeshPhongMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.05,
        side: THREE.BackSide,
        wireframe: true
    });
    scene.add(new THREE.Mesh(shellGeo, shellMat));
}

function addLabel(mesh, text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 128, 20);
    ctx.fill();
    ctx.strokeStyle = `#${color.getHexString()}`;
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), labelMat);
    label.position.copy(mesh.position).add(new THREE.Vector3(0, mesh.geometry.type === 'SphereGeometry' ? 4 : 2, 0));
    label.userData.isLabel = true;
    scene.add(label);
}

// --- INTERACTIONS ---
function onCanvasClick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children.filter(o => o.userData.isComponent));

    if (intersects.length > 0) {
        selectComponent(intersects[0].object.userData.id);
    }
}

function selectComponent(id) {
    const mesh = scene.children.find(o => o.userData.id === id);
    if (!mesh) return;

    // Reset others
    scene.children.forEach(o => {
        if (o.userData.isComponent) o.material.emissiveIntensity = 0.1;
    });

    mesh.material.emissiveIntensity = 0.8;
    showDetail(mesh.userData);
    animateCameraTo(mesh.position.clone().add(new THREE.Vector3(0, 5, 8)), mesh.position);
}

function showDetail(data) {
    const panel = document.getElementById('ai-info-panel');
    document.getElementById('ai-panel-title').textContent = data.name;
    document.getElementById('ai-panel-type').textContent = data.type;

    let html = `
        <div class="space-y-4">
            <div>
                <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Description</h4>
                <p class="text-sm leading-relaxed text-white/80">${data.description}</p>
            </div>
            <div>
                <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Biological Function</h4>
                <p class="text-sm leading-relaxed text-white/80">${data.function}</p>
            </div>
            <div>
                <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Key Facts</h4>
                <ul class="space-y-2">
                    ${data.facts.map(f => `
                        <li class="flex items-start gap-2 text-xs text-white/60">
                            <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 flex-shrink-0"></span>
                            ${f}
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;

    document.getElementById('ai-panel-content').innerHTML = html;
    panel.classList.remove('hidden');
    if (window.feather) feather.replace();
}

function animateCameraTo(pos, target) {
    const duration = 1000;
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();

    function update(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);

        camera.position.lerpVectors(startPos, pos, ease);
        controls.target.lerpVectors(startTarget, target, ease);

        if (t < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// --- TOUR ---
function toggleTour() {
    if (isTouring) stopTour();
    else startTour();
}

function startTour() {
    if (currentComponents.length === 0) return;
    isTouring = true;
    tourIndex = 0;
    document.getElementById('start-tour-btn').innerHTML = '<i data-feather="square" class="w-3 h-3"></i> Stop Tour';
    if (window.feather) feather.replace();

    runTourStep();
    tourInterval = setInterval(runTourStep, 6000);
}

function stopTour() {
    isTouring = false;
    clearInterval(tourInterval);
    document.getElementById('start-tour-btn').innerHTML = '<i data-feather="play" class="w-3 h-3"></i> Guided Tour';
    if (window.feather) feather.replace();
}

function runTourStep() {
    if (tourIndex >= currentComponents.length) {
        stopTour();
        return;
    }
    const comp = currentComponents[tourIndex];
    selectComponent(comp.id);
    addGuideMessage(`Exploring the ${comp.name}. ${comp.description}`);
    tourIndex++;
}

// --- CHAT ---
async function sendChatMessage(msg) {
    const body = document.getElementById('ai-chat-body');
    const userDiv = document.createElement('div');
    userDiv.className = 'bg-white/10 border border-white/20 p-4 rounded-2xl ml-8';
    userDiv.innerHTML = `<span class="english-label" style="font-size: 10px; margin-bottom: 4px;">User</span><p class="description-text" style="font-size: 14px; color: #ffffff;">${msg}</p>`;
    body.appendChild(userDiv);
    body.scrollTop = body.scrollHeight;

    try {
        const res = await fetch('/api/biology-lab/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, components: currentComponents })
        });
        const data = await res.json();
        addGuideMessage(data.response || data.error);
    } catch (err) {
        addGuideMessage("Error: Could not reach the Biology Specialist.");
    }
}

function addGuideMessage(text) {
    const body = document.getElementById('ai-chat-body');
    const aiDiv = document.createElement('div');
    aiDiv.className = 'bg-emerald-600/20 border border-emerald-500/30 p-4 rounded-2xl mr-8';
    aiDiv.innerHTML = `<span class="english-label" style="font-size: 10px; margin-bottom: 4px;">Specialist</span><p class="description-text" style="font-size: 14px; color: #ffffff;">${text}</p>`;
    body.appendChild(aiDiv);
    body.scrollTop = body.scrollHeight;
}

// --- LOOP ---
function animate() {
    controls.update();

    scene.children.forEach(o => {
        if (o.userData.pulse) {
            const scale = 1 + Math.sin(Date.now() * 0.002) * 0.05;
            o.scale.setScalar(scale);
        }
        if (o.userData.isLabel) {
            o.lookAt(camera.position);
        }
    });

    renderer.render(scene, camera);
}

init();
