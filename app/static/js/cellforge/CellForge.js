import { ORGANELLES } from './utils/cellData.js';
import { updateInspector } from './viewer.js';

export class CellForge {
    constructor() {
        this.selectedModel = 'stable_fast_3d';
        this.selectedOrganelle = null;
        this.isLoading = false;
        this.viewer = null;

        this.init();
        this.bindEvents();
    }

    init() {
        // Initialize UI components
        if (window.feather) feather.replace();
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
        document.querySelectorAll('.cf-model-option').forEach(option => {
            const isSelected = option.dataset.model === modelId;
            option.classList.toggle('selected', isSelected);
        });

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
            if (textSpan) {
                textSpan.textContent = labels[modelId] || "Generate 3D Model";
            } else if (btn.textContent.includes("Generate")) {
                btn.textContent = (labels[modelId] || "Generate 3D Model");
            }
        });
    }

    bindEvents() {
        document.getElementById('close-inspector').onclick = () => {
            document.getElementById('organelle-info').classList.remove('open');
        };

        // Model selection
        document.querySelectorAll('.cf-model-option').forEach(option => {
            option.onclick = () => this.handleModelSelect(option.dataset.model);
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
        formData.append('image', file);
        formData.append('model_id', this.selectedModel);

        await this.generateModel(formData);
    }

    async handleUrlGenerate() {
        const url = document.getElementById('cell-url').value;
        if (!url) return;

        const formData = new FormData();
        formData.append('image_url', url);
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
            if (data.status === 'success') {
                this.loadModel(data.model_data);
            } else {
                this.showError(data.message, data.fallback_suggestion);
            }
        } catch (error) {
            this.showError("Generation failed. Please try again.");
        } finally {
            this.setLoading(false);
        }
    }

    loadModel(base64Data) {
        if (window.loadCellModel) {
            window.loadCellModel(base64Data);
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
                <span class="organelle-dot" style="background: ${organelle.color}"></span>
                <span class="organelle-name">${organelle.name}</span>
            `;
            item.onclick = () => this.handleOrganelleSelect(id);
            list.appendChild(item);
        });
    }

    updateUI() {
        document.querySelectorAll('.organelle-item').forEach(item => {
            const name = item.querySelector('.organelle-name').textContent;
            const organelle = Object.values(ORGANELLES).find(o => o.name === name);
            const isSelected = organelle && organelle.id === this.selectedOrganelle;
            item.classList.toggle('active', isSelected);
        });
    }

    takeScreenshot() {
        if (window.takeStudioScreenshot) window.takeStudioScreenshot();
    }

    exportGLB() {
        if (window.exportStudioGLB) window.exportStudioGLB();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.cellForge = new CellForge();
});
