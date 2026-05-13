import { CellViewer } from './viewer.js';
import { ORGANELLES } from './utils/cellData.js';
import { renderOrganelleList, updateInspector } from './components/UIComponents.js';
import { exportObjectAsGlb } from './utils/downloads.js';

class CellForgeApp {
    constructor() {
        this.viewer = new CellViewer('three-canvas-container');
        this.selectedOrganelle = 'membrane';
        this.isLoading = false;

        this.init();
    }

    init() {
        this.viewer.loadDefaultCell();
        this.updateUI();
        this.bindEvents();
        if (window.feather) feather.replace();
    }

    updateUI() {
        renderOrganelleList(ORGANELLES, this.selectedOrganelle, (id) => this.handleOrganelleSelect(id));
        const data = ORGANELLES[this.selectedOrganelle];
        if (data) {
            document.getElementById('lab-notes').innerHTML = `<p class="text-xs text-slate-600 leading-relaxed">${data.description}</p>`;
        }
    }

    handleOrganelleSelect(id) {
        this.selectedOrganelle = id;
        this.updateUI();
        updateInspector(id, ORGANELLES[id]);
        if (window.feather) feather.replace();
    }

    bindEvents() {
        document.getElementById('close-inspector').onclick = () => {
            document.getElementById('organelle-info').classList.remove('open');
        };

        document.getElementById('cell-upload').onchange = (e) => this.handleUpload(e);
        document.getElementById('generate-from-url').onclick = () => this.handleUrlGenerate();

        document.getElementById('btn-screenshot').onclick = () => this.takeScreenshot();
        document.getElementById('btn-export-glb').onclick = () => this.exportGLB();
    }

    setLoading(loading, message = "Generating your 3D model...") {
        this.isLoading = loading;
        const loader = document.getElementById('studio-loading');
        const msgElem = document.getElementById('loading-message');
        if (loader) {
            loader.classList.toggle('hidden', !loading);
            if (message) msgElem.textContent = message;
        }
    }

    async handleUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        await this.generate3D(formData);
    }

    async handleUrlGenerate() {
        const url = document.getElementById('cell-url').value.trim();
        if (!url) return;

        const formData = new FormData();
        formData.append('url', url);

        await this.generate3D(formData);
    }

    async generate3D(formData) {
        this.setLoading(true);
        try {
            const resp = await fetch('/api/cellforge/generate', {
                method: 'POST',
                body: formData
            });
            const data = await resp.json();
            if (data.status === 'success' && data.model_url) {
                await this.viewer.loadModel(data.model_url, true);
                document.getElementById('active-cell-name').textContent = "Custom Specimen";
                document.getElementById('active-cell-type').textContent = "AI-Generated 3D Reconstruct";
                document.getElementById('status-text').textContent = "AI Generation Success";
                document.getElementById('status-dot').style.background = "#10b981";
            } else {
                alert(data.detail || data.message || "Generation failed");
            }
        } catch (err) {
            console.error(err);
            alert("Error connecting to AI pipeline");
        } finally {
            this.setLoading(false);
        }
    }

    takeScreenshot() {
        const link = document.createElement('a');
        link.download = 'cellforge-screenshot.png';
        link.href = this.viewer.renderer.domElement.toDataURL('image/png');
        link.click();
    }

    async exportGLB() {
        if (!this.viewer.currentModel) return;
        try {
            await exportObjectAsGlb(this.viewer.currentModel, 'cell-model');
        } catch (err) {
            console.error(err);
            alert("GLB Export failed");
        }
    }
}

// Start app
window.addEventListener('DOMContentLoaded', () => {
    window.cellForgeApp = new CellForgeApp();
});
