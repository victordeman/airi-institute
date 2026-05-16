import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- CONFIG & STATE ---
let scene, camera, renderer, controls, raycaster;
const mouse = new THREE.Vector2();
const components = [];
let tourIndex = 0;
let tourInterval = null;
let selectedModel = 'llava';

// --- INITIALIZATION ---
function init() {
    const viewport = document.getElementById('bio-viewport');
    const canvas = document.getElementById('bio-canvas');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    camera = new THREE.PerspectiveCamera(60, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    raycaster = new THREE.Raycaster();

    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('click', onCanvasClick);

    // Animation visibility observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                renderer.setAnimationLoop(animate);
            } else {
                renderer.setAnimationLoop(null);
            }
        });
    }, { threshold: 0.1 });
    observer.observe(viewport);

    setupEventListeners();
    if (window.feather) feather.replace();
}

function onWindowResize() {
    const viewport = document.getElementById('bio-viewport');
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
}

// --- CORE LOGIC ---

function handleModelSelect(modelId) {
    selectedModel = modelId;

    // Update UI
    document.querySelectorAll('.cf-model-option').forEach(o => {
        o.classList.remove('selected');
    });
    const activeOption = document.querySelector(`.cf-model-option[data-model="${modelId}"]`);
    if (activeOption) activeOption.classList.add('selected');

    // Update generate button text
    updateGenerateButtonText(modelId);
    if (window.feather) feather.replace();
}

function updateGenerateButtonText(modelId) {
    const labels = {
        llava: "Analyse with LLaVA-1.5 ⚡",
        florence: "Analyse with Florence-2 🏆",
        moondream: "Analyse with Moondream 2 🎨"
    };
    const btns = document.querySelectorAll('.cf-btn-primary');
    btns.forEach(btn => {
        const textSpan = btn.querySelector('.btn-text');
        const targetText = labels[modelId] || "Analyse Image with AI";

        if (textSpan) {
            textSpan.textContent = targetText;
        } else if (btn.textContent.includes("Analyse")) {
            btn.textContent = targetText;
        }
    });
}

function setupEventListeners() {
    // Model selection
    document.querySelectorAll('.cf-model-option').forEach(option => {
        option.addEventListener('click', () => {
            handleModelSelect(option.dataset.model);
        });
    });

    // Upload Handlers
    const fileInput = document.getElementById('bio-image-input');
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files[0]);
        }
    });

    document.getElementById('bio-url-btn').addEventListener('click', () => {
        const url = document.getElementById('bio-url-input').value;
        if (url) handleImageUpload(url);
    });

    document.getElementById('demo-btn').addEventListener('click', loadDemo);
    document.getElementById('start-tour-btn').addEventListener('click', () => {
        document.getElementById('upload-panel').scrollIntoView({ behavior: 'smooth' });
    });

    // HUD buttons
    document.getElementById('guided-tour-btn').addEventListener('click', toggleGuidedTour);
    document.getElementById('reset-view-btn').addEventListener('click', resetView);
    document.getElementById('upload-new-btn').addEventListener('click', () => {
        location.reload();
    });

    // Chat
    document.getElementById('guide-send').addEventListener('click', () => {
        const input = document.getElementById('guide-input');
        if (input.value.trim()) {
            sendGuideMessage(input.value.trim());
            input.value = '';
        }
    });

    document.getElementById('guide-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('guide-send').click();
        }
    });

    document.getElementById('detail-close').addEventListener('click', () => {
        document.getElementById('detail-card').style.display = 'none';
    });
}

const DEMO_COMPONENTS = [
    {
      id: "nucleus",
      name: "Nucleus",
      type: "nucleus",
      color: "#6366f1",
      size: "large",
      description: "Control center of the cell",
      function: "Contains DNA and directs all cell activities",
      facts: [
        "Contains 46 chromosomes in human cells",
        "Surrounded by double membrane",
        "Communicates via nuclear pores"
      ],
      position_hint: "center"
    },
    {
      id: "mitochondria",
      name: "Mitochondria",
      type: "mitochondria",
      color: "#f59e0b",
      size: "medium",
      description: "Powerhouse of the cell",
      function: "Produces ATP through cellular respiration",
      facts: [
        "Has its own DNA",
        "Generates 90% of cell energy",
        "Thought to be ancient bacteria"
      ],
      position_hint: "inner"
    },
    {
      id: "cell_membrane",
      name: "Cell Membrane",
      type: "membrane",
      color: "#10b981",
      size: "large",
      description: "Protective outer boundary",
      function: "Controls what enters and exits the cell",
      facts: [
        "Made of phospholipid bilayer",
        "Contains protein channels",
        "Selectively permeable"
      ],
      position_hint: "outer"
    },
    {
      id: "golgi",
      name: "Golgi Apparatus",
      type: "golgi",
      color: "#ef4444",
      size: "medium",
      description: "Cell's postal system",
      function: "Packages and ships proteins",
      facts: [
        "Named after Camillo Golgi",
        "Stack of flattened membranes",
        "Modifies proteins for export"
      ],
      position_hint: "inner"
    },
    {
      id: "ribosome",
      name: "Ribosomes",
      type: "ribosome",
      color: "#fbbf24",
      size: "small",
      description: "Protein factories",
      function: "Synthesize proteins from RNA",
      facts: [
        "Smallest organelle",
        "Found free or on ER",
        "Made of RNA and protein"
      ],
      position_hint: "scattered"
    },
    {
      id: "er",
      name: "Endoplasmic Reticulum",
      type: "endoplasmic_reticulum",
      color: "#8b5cf6",
      size: "medium",
      description: "The cell's transport network",
      function: "Transport system for proteins and other compounds",
      facts: [
        "Two types: Smooth and Rough",
        "Continuous with the nuclear envelope",
        "Critical for protein folding"
      ],
      position_hint: "inner"
    },
    {
        id: "chloroplast",
        name: "Chloroplast",
        type: "chloroplast",
        color: "#22c55e",
        size: "medium",
        description: "Food producers of the plant cell",
        function: "Convert light energy into sugars (Photosynthesis)",
        facts: [
          "Only found in plant cells and algae",
          "Contains chlorophyll pigment",
          "Has its own double membrane"
        ],
        position_hint: "inner"
    },
    {
        id: "lysosome",
        name: "Lysosome",
        type: "lysosome",
        color: "#f97316",
        size: "small",
        description: "Cellular recycling center",
        function: "Digests excess or worn-out organelles, food particles, and viruses",
        facts: [
          "Contain digestive enzymes",
          "Break down waste products",
          "Can trigger self-destruction of the cell (apoptosis)"
        ],
        position_hint: "scattered"
    }
];

function loadDemo() {
    document.getElementById('upload-panel').style.display = 'none';
    document.getElementById('bio-viewport').style.display = 'block';
    document.getElementById('build-section').style.display = 'block';
    window.currentComponents = DEMO_COMPONENTS;
    buildBioScene(DEMO_COMPONENTS);
    populateComponentList(DEMO_COMPONENTS);
    populateComponentTags(DEMO_COMPONENTS);

    document.getElementById('guide-intro-text').textContent =
      "I've loaded a demo human cell for you. It contains the essential organelles: Nucleus, Mitochondria, Golgi Apparatus, and more. Click any of them in 3D to explore!";
}

async function handleImageUpload(fileOrUrl) {
    showLoading(`Uploading & Analysing image with ${selectedModel.toUpperCase()} AI...`);

    const formData = new FormData();
    if (fileOrUrl instanceof File) {
        formData.append("file", fileOrUrl);
    } else {
        formData.append("url", fileOrUrl);
    }
    formData.append("model_id", selectedModel);

    try {
        const response = await fetch("/api/biology-lab/analyse", {
            method: "POST",
            body: formData
        });
        const data = await response.json();

        if (data.error) {
            alert(data.message || data.error);
            hideLoading();
            return;
        }

        document.getElementById('upload-panel').style.display = 'none';
        document.getElementById('bio-viewport').style.display = 'block';
        document.getElementById('build-section').style.display = 'block';

        window.currentComponents = data.components;
        buildBioScene(data.components);
        populateComponentList(data.components);
        populateComponentTags(data.components);

        const names = data.components.map(c => c.name).join(', ');
        document.getElementById('guide-intro-text').textContent =
          `I can see ${data.count} biological structures in your image: ${names}. Click any component in the 3D view to learn more, or ask me anything!`;

    } catch (err) {
        console.error(err);
        alert("Failed to analyse image. Please try again.");
    } finally {
        hideLoading();
    }
}

function showLoading(text) {
    document.getElementById('upload-zone').style.display = 'none';
    document.querySelector('.bio-upload-divider').style.display = 'none';
    document.querySelector('.bio-url-input').style.display = 'none';
    document.getElementById('bio-loading').style.display = 'block';
    document.getElementById('bio-loading-text').textContent = text;
}

function hideLoading() {
    document.getElementById('bio-loading').style.display = 'none';
}

function clearScene() {
    while(scene.children.length > 0){
        const obj = scene.children[0];
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
        scene.remove(obj);
    }
    // Re-add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
}

function buildBioScene(componentsData) {
    clearScene();

    componentsData.forEach((comp, index) => {
        let geometry, material, mesh;

        const colors = {
            nucleus: 0x6366f1,
            mitochondria: 0xf59e0b,
            cell_membrane: 0x10b981,
            membrane: 0x10b981,
            endoplasmic_reticulum: 0x8b5cf6,
            golgi_apparatus: 0xef4444,
            golgi: 0xef4444,
            ribosome: 0xfbbf24,
            vacuole: 0x06b6d4,
            chloroplast: 0x22c55e,
            lysosome: 0xf97316,
            cytoplasm: 0xe2e8f0,
            default: 0x94a3b8
        };

        const colorHex = comp.color || colors[comp.type] || colors[comp.id.toLowerCase()] || colors.default;
        const color = new THREE.Color(colorHex);

        if (comp.type === 'nucleus') {
            geometry = new THREE.SphereGeometry(1.5, 32, 32);
        } else if (comp.type === 'membrane') {
            geometry = new THREE.TorusGeometry(3, 0.15, 16, 100);
        } else if (comp.type === 'rod') {
            geometry = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 12);
        } else if (comp.type === 'mitochondria') {
            geometry = new THREE.CapsuleGeometry(0.4, 0.8, 4, 16);
        } else if (comp.type === 'golgi_apparatus' || comp.type === 'golgi' || comp.type === 'endoplasmic_reticulum') {
            geometry = new THREE.TorusKnotGeometry(0.6, 0.2, 64, 8);
        } else if (comp.type === 'chloroplast') {
            geometry = new THREE.CapsuleGeometry(0.5, 0.6, 4, 16);
        } else if (comp.type === 'vacuole') {
            geometry = new THREE.SphereGeometry(1.2, 16, 16);
        } else if (comp.type === 'ribosome') {
            geometry = new THREE.SphereGeometry(0.15, 8, 8);
        } else if (comp.type === 'lysosome') {
            geometry = new THREE.SphereGeometry(0.5, 16, 16);
        } else {
            geometry = new THREE.SphereGeometry(0.4 + Math.random() * 0.4, 16, 16);
        }

        material = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.85,
            shininess: 80
        });

        mesh = new THREE.Mesh(geometry, material);

        const angle = (index / componentsData.length) * Math.PI * 2;
        const radius = (comp.type === 'nucleus' || comp.position_hint === 'center') ? 0 : 2 + Math.random() * 2;
        mesh.position.set(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 2,
            Math.sin(angle) * radius
        );

        mesh.userData = {
            componentId: comp.id,
            componentName: comp.name,
            description: comp.description,
            function: comp.function,
            facts: comp.facts,
            type: comp.type,
            color: colorHex
        };

        if (comp.type === 'nucleus') {
            mesh.userData.pulse = true;
        }

        scene.add(mesh);
        addLabel(mesh, comp.name, color);
    });

    // Add outer membrane shell
    const membraneGeo = new THREE.SphereGeometry(4.5, 32, 32);
    const membraneMat = new THREE.MeshPhongMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(membraneGeo, membraneMat));
}

function addLabel(mesh, text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Pill background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.8)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 108, 54);
    ctx.fill();

    // Border
    ctx.strokeStyle = `#${color.getHexString()}`;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Cyan glow for the text
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 10;
    ctx.fillText(text.toUpperCase(), 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const labelGeo = new THREE.PlaneGeometry(2, 0.5);
    const labelMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeo, labelMat);

    // Position label above mesh
    label.position.set(mesh.position.x, mesh.position.y + 1.5, mesh.position.z);
    label.userData.isLabel = true;
    scene.add(label);
}

function onCanvasClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children.filter(obj => obj.type === 'Mesh' && !obj.userData.isLabel));

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj.userData.componentId) {
            showComponentDetail(obj.userData);
            highlightComponent(obj);
        }
    }
}

function highlightComponent(mesh) {
    scene.children.forEach(obj => {
        if (obj.type === 'Mesh' && obj.userData.componentId) {
            obj.material.emissive = new THREE.Color(0x000000);
        }
    });
    if (mesh.material.emissive) {
        mesh.material.emissive = new THREE.Color(0x333333);
    }
}

function showComponentDetail(data) {
    document.getElementById('detail-title').textContent = data.componentName;
    document.getElementById('detail-subtitle').textContent = data.type.toUpperCase();
    document.getElementById('detail-body').innerHTML = `
      <div class="detail-section">
        <h4>Function</h4>
        <p>${data.function}</p>
      </div>
      <div class="detail-section">
        <h4>Description</h4>
        <p>${data.description}</p>
      </div>
      <div class="detail-section">
        <h4>Key Facts</h4>
        <ul>${data.facts.map(f => `<li>${f}</li>`).join('')}</ul>
      </div>
      <button class="ask-guide-btn" id="ask-guide-btn-inline">
        Ask Biology Guide →
      </button>
    `;
    document.getElementById('detail-card').style.display = 'block';

    document.getElementById('ask-guide-btn-inline').onclick = () => {
        askGuideAbout(data.componentName);
    };
}

function askGuideAbout(name) {
    const msg = `Tell me more about the ${name} and its role in the cell.`;
    sendGuideMessage(msg);
}

function populateComponentList(componentsData) {
    const list = document.getElementById('component-list');
    list.innerHTML = '';
    componentsData.forEach(comp => {
        const item = document.createElement('div');
        item.className = 'component-item';
        item.innerHTML = `
            <span class="component-dot" style="background-color: ${comp.color || '#6366f1'}"></span>
            <span class="component-item-name">${comp.name}</span>
        `;
        item.onclick = () => {
            const mesh = scene.children.find(obj => obj.userData.componentId === comp.id);
            if (mesh) {
                highlightComponent(mesh);
                showComponentDetail(mesh.userData);
                animateCameraTo(mesh.position);
            }
        };
        list.appendChild(item);
    });
}

function populateComponentTags(componentsData) {
    const tags = document.getElementById('component-tags');
    tags.innerHTML = '';
    componentsData.forEach(comp => {
        const tag = document.createElement('button');
        tag.className = 'component-tag';
        tag.style.borderColor = comp.color || '#6366f1';
        tag.style.color = comp.color || '#6366f1';
        tag.textContent = comp.name;
        tag.onclick = () => {
             const mesh = scene.children.find(obj => obj.userData.componentId === comp.id);
             if (mesh) {
                 highlightComponent(mesh);
                 showComponentDetail(mesh.userData);
                 animateCameraTo(mesh.position);
             }
        };
        tags.appendChild(tag);
    });
}

function animateCameraTo(position) {
    const targetPos = position.clone().add(new THREE.Vector3(0, 2, 5));
    const startPos = camera.position.clone();
    const duration = 1000;
    const startTime = performance.now();

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        camera.position.lerpVectors(startPos, targetPos, ease);
        controls.target.lerp(position, ease);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

function toggleGuidedTour() {
    if (tourInterval) {
        stopGuidedTour();
    } else {
        startGuidedTour();
    }
}

function startGuidedTour() {
    const meshes = scene.children.filter(obj => obj.userData.componentId);
    if (meshes.length === 0) return;

    tourIndex = 0;
    document.getElementById('guided-tour-btn').textContent = '⏹ Stop Tour';

    function next() {
        if (tourIndex >= meshes.length) {
            stopGuidedTour();
            return;
        }
        const mesh = meshes[tourIndex];
        highlightComponent(mesh);
        showComponentDetail(mesh.userData);
        animateCameraTo(mesh.position);

        addGuideMessage(`Focusing on ${mesh.userData.componentName}. ${mesh.userData.description}`);

        tourIndex++;
    }

    next();
    tourInterval = setInterval(next, 8000);
}

function stopGuidedTour() {
    clearInterval(tourInterval);
    tourInterval = null;
    document.getElementById('guided-tour-btn').textContent = '▶ Guided Tour';
}

function resetView() {
    animateCameraTo(new THREE.Vector3(0,0,0));
}

// --- CHAT ---

async function sendGuideMessage(message) {
    addUserMessage(message);

    try {
        const response = await fetch("/api/biology-lab/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                components: window.currentComponents || [],
                model_id: selectedModel
            })
        });
        const data = await response.json();
        addGuideMessage(data.response || "I'm sorry, I encountered an error.");
    } catch (err) {
        console.error(err);
        addGuideMessage("Failed to connect to the Biology Guide.");
    }
}

function addUserMessage(text) {
    const chat = document.getElementById('guide-chat');
    const msg = document.createElement('div');
    msg.style.marginBottom = '1rem';
    msg.style.textAlign = 'right';
    msg.innerHTML = `
        <div style="display: inline-block; background: rgba(99, 102, 241, 0.2); padding: 0.75rem 1rem; border-radius: 12px; border-bottom-right-radius: 2px; color: white; max-width: 80%; font-size: 14px;">
            ${text}
        </div>
    `;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

function addGuideMessage(text) {
    const chat = document.getElementById('guide-chat');
    const msg = document.createElement('div');
    msg.style.marginBottom = '1rem';
    msg.innerHTML = `
        <div style="display: inline-block; background: rgba(255,255,255,0.05); padding: 0.75rem 1rem; border-radius: 12px; border-bottom-left-radius: 2px; color: #cbd5e1; max-width: 80%; font-size: 14px; border: 1px solid rgba(255,255,255,0.1);">
            ${text}
        </div>
    `;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
}

// --- ANIMATION LOOP ---
function animate() {
    controls.update();

    scene.children.forEach(obj => {
        if (obj.userData.pulse) {
            const scale = 1 + Math.sin(Date.now() * 0.002) * 0.05;
            obj.scale.setScalar(scale);
        }
        if (obj.userData.isLabel) {
            obj.lookAt(camera.position);
        }
    });

    renderer.render(scene, camera);
}

// Start
init();
