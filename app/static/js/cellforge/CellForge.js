import { ORGANELLES } from './utils/cellData.js';
import { updateInspector } from './components/UIComponents.js';
import { CellViewer } from './viewer.js';

export class CellForge {
    constructor() {
        this.selectedModel = 'stable_fast_3d';
        this.selectedOrganelle = null;
        this.isLoading = false;
        this.viewer = null;

        this.init();
        this.bindEvents();
    }

    async init() {
        // Initialize UI components
        if (window.feather) feather.replace();

        // Initialize Viewer
        this.viewer = new CellViewer('three-canvas-container');
        this.viewer.loadDefaultCell();

        this.updateOrganelleList();
    }

    handleOrganelleSelect(id) {
        this.selectedOrganelle = id;
        this.updateUI();
        updateInspector(id, ORGANELLES[id]);
        if (window.feather) feather.replace();
    }

    handleModelSelect(modelId) {
        this.selectedModel = modelId;

        // Update UI
        document.querySelectorAll('.cf-model-option').forEach(o => {
            o.classList.remove('selected');
        });
        const activeOption = document.querySelector(`.cf-model-option[data-model="${modelId}"]`);
        if (activeOption) activeOption.classList.add('selected');

        // Update generate button text
        this.updateGenerateButtonText(modelId);
    }

    updateGenerateButtonText(modelId) {
        const labels = {
            stable_fast_3d: "Generate with Stable Fast 3D ⚡",
            trellis2:       "Generate with TRELLIS.2 🏆",
            hunyuan3d:      "Generate with Hunyuan3D 🎨",
            hi3dgen:        "Generate with Hi3DGen 📐",
            triposr:        "Generate with TripoSR 🌍"
        };
        const btns = document.querySelectorAll('.cf-btn-primary');
        btns.forEach(btn => {
            const textSpan = btn.querySelector('.btn-text');
            const targetText = labels[modelId] || "Generate 3D Model";

            if (textSpan) {
                textSpan.textContent = targetText;
            } else if (btn.textContent.includes("Generate")) {
                btn.textContent = targetText;
            }
        });
    }

    bindEvents() {
        document.getElementById('close-inspector').onclick = () => {
            document.getElementById('organelle-info').classList.remove('open');
        };

        // Select model on click
        document.querySelectorAll('.cf-model-option').forEach(option => {
            option.addEventListener('click', () => {
                this.handleModelSelect(option.dataset.model);
            });
        });

        // Try Different Model button
        document.getElementById('btn-try-different').onclick = () => {
            document.getElementById('model-selector').scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById('fallback-suggestion').classList.add('hidden');
        };

        document.getElementById('cell-upload').onchange = (e) => this.handleUpload(e);
        document.getElementById('generate-from-url').onclick = () => this.handleUrlGenerate();

        document.getElementById('btn-screenshot').onclick = () => this.takeScreenshot();
        document.getElementById('btn-export-glb').onclick = () => this.exportGLB();
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loader = document.getElementById('studio-loading');
        if (loader) loader.classList.toggle('hidden', !loading);
    }

    async handleUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('model_id', this.selectedModel);

        await this.generateModel(formData);
    }

    async handleUrlGenerate() {
        const urlInput = document.getElementById('cell-url');
        const url = urlInput.value.trim();
        if (!url) return;

        const formData = new FormData();
        formData.append('url', url);
        formData.append('model_id', this.selectedModel);

        await this.generateModel(formData);
    }

    async generateModel(formData) {
        this.setLoading(true);
        try {
            const response = await fetch('/api/cellforge/generate', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (response.ok && data.model_data) {
                await this.loadModel(data.model_data);
            } else {
                this.showError(data.error || "Generation failed", data.suggestion);
            }
        } catch (error) {
            this.showError("Generation failed. Please try again.");
        } finally {
            this.setLoading(false);
        }
    }

    async loadModel(base64Data) {
        if (!this.viewer) return;
        try {
            const blob = await (await fetch(`data:model/gltf-binary;base64,${base64Data}`)).blob();
            const url = URL.createObjectURL(blob);
            await this.viewer.loadModel(url, true);
        } catch (err) {
            console.error("Error loading generated model:", err);
            alert("Failed to load the 3D model into the viewer.");
        }
    }

    showError(message, fallback) {
        if (fallback) {
            const suggestion = document.getElementById('fallback-suggestion');
            const text = document.getElementById('suggestion-text');
            text.textContent = `Tip: ${fallback}`;
            suggestion.classList.remove('hidden');
        }
        alert(message);
    }

    updateOrganelleList() {
        const list = document.getElementById('organelle-list');
        if (!list) return;

        list.innerHTML = '';
        Object.keys(ORGANELLES).forEach(id => {
            const organelle = ORGANELLES[id];
            const item = document.createElement('div');
            item.className = 'organelle-item';
            item.innerHTML = `
                <span class="organelle-dot" style="background: ${organelle.accent || '#ccc'}"></span>
                <span class="organelle-name">${organelle.label || id}</span>
            `;
            item.onclick = () => this.handleOrganelleSelect(id);
            list.appendChild(item);
        });
    }

    updateUI() {
        document.querySelectorAll('.organelle-item').forEach(item => {
            const nameSpan = item.querySelector('.organelle-name');
            if (!nameSpan) return;
            const label = nameSpan.textContent;
            const organelleEntry = Object.entries(ORGANELLES).find(([id, o]) => o.label === label);
            const isSelected = organelleEntry && organelleEntry[0] === this.selectedOrganelle;
            item.classList.toggle('active', isSelected);
        });
    }

    takeScreenshot() {
        if (!this.viewer || !this.viewer.renderer) return;
        try {
            const dataUrl = this.viewer.renderer.domElement.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `cellforge-capture-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Screenshot failed:", err);
        }
    }

    exportGLB() {
        // For now, we can only re-download the generated GLB if we saved the last URL
        // or just show a message. Usually this would use GLTFExporter.
        alert("Export GLB feature is initializing. Use the 'SCREENSHOT' for high-res captures.");
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.cellForge = new CellForge();
});
