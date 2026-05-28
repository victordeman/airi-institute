/**
 * XR Tour Engine for AIRI Institute Immersive Experiences
 * Orchestrates camera movements, narration, and hotspots for <model-viewer>
 */

class XRTour {
    constructor(config) {
        this.modelViewer = document.querySelector(config.modelViewer);
        this.playBtn = document.querySelector(config.playBtn);
        this.pauseBtn = document.querySelector(config.pauseBtn);
        this.replayBtn = document.querySelector(config.replayBtn);
        this.subtitleOverlay = document.querySelector(config.subtitleOverlay);
        this.subtitleText = document.querySelector(config.subtitleText);
        this.tourProgress = document.querySelector(config.tourProgress);
        this.controlsOverlay = document.querySelector(config.controlsOverlay);

        // Scope hotspots to the model viewer if possible
        if (typeof config.hotspots === 'string' && this.modelViewer) {
            this.hotspots = this.modelViewer.querySelectorAll(config.hotspots);
        } else {
            this.hotspots = document.querySelectorAll(config.hotspots);
        }

        this.script = config.script;
        this.audioPath = config.audioPath || null;

        this.isPlaying = false;
        this.isPaused = false;
        this.tourTimeout = null;
        this.currentStep = 0;
        this.startTime = 0;
        this.remainingTime = 0;

        this.init();
    }

    init() {
        if (this.playBtn) this.playBtn.addEventListener('click', () => this.startTour());
        if (this.replayBtn) this.replayBtn.addEventListener('click', () => this.startTour());
        if (this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.togglePause());
    }

    runStep(stepIndex, delay = null) {
        if (!this.isPlaying || stepIndex >= this.script.length) {
            this.endTour();
            return;
        }

        this.currentStep = stepIndex;
        const step = this.script[stepIndex];
        const nextStep = this.script[stepIndex + 1];
        const stepDuration = nextStep ? (nextStep.time - step.time) * 1000 : 5000;
        const actualDelay = delay !== null ? delay : stepDuration;

        // Update UI
        if (this.subtitleText) {
            this.subtitleText.textContent = step.text;
            this.subtitleOverlay.classList.remove('opacity-0');
        }

        // Update Camera & Lighting
        if (this.modelViewer) {
            this.modelViewer.cameraOrbit = step.orbit;
            this.modelViewer.fieldOfView = step.fov;
            this.modelViewer.exposure = step.exposure;
        }

        // Manage Hotspots - scope to current viewer
        this.hotspots.forEach(h => h.classList.remove('active'));
        if (step.hotspot && this.modelViewer) {
            const activeHotspot = this.modelViewer.querySelector(`[slot="${step.hotspot}"]`);
            if (activeHotspot) activeHotspot.classList.add('active');
        }

        // Progress Bar
        if (this.tourProgress) {
            const progress = ((stepIndex + 1) / this.script.length) * 100;
            this.tourProgress.style.width = `${progress}%`;
        }

        // Narration
        if (delay === null) {
            this.speak(step.text, step.audioId);
        }

        this.startTime = Date.now();
        this.remainingTime = actualDelay;

        this.tourTimeout = setTimeout(() => {
            this.runStep(stepIndex + 1);
        }, actualDelay);
    }

    startTour() {
        this.isPlaying = true;
        this.isPaused = false;
        this.currentStep = 0;

        if (this.playBtn) this.playBtn.classList.add('hidden');
        if (this.pauseBtn) {
            this.pauseBtn.classList.remove('hidden');
            this.pauseBtn.innerHTML = '<i data-feather="pause" class="w-8 h-8 fill-current"></i>';
            if (window.feather) feather.replace();
        }

        if (this.controlsOverlay) {
            this.controlsOverlay.classList.add('opacity-0');
            // Adding hover classes if they exist in the parent
            const parent = this.controlsOverlay.parentElement;
            if (parent && parent.classList.contains('group/viewer')) {
                this.controlsOverlay.classList.add('group-hover/viewer:opacity-100');
            }
        }

        if (this.replayBtn) this.replayBtn.classList.add('hidden');

        if (this.modelViewer) this.modelViewer.autoRotate = false;
        this.runStep(0);
    }

    togglePause() {
        if (!this.isPlaying) return;

        if (!this.isPaused) {
            this.isPaused = true;
            clearTimeout(this.tourTimeout);
            this.remainingTime -= (Date.now() - this.startTime);
            if (window.speechSynthesis) window.speechSynthesis.pause();
            if (this.currentAudio) this.currentAudio.pause();

            if (this.pauseBtn) {
                this.pauseBtn.innerHTML = '<i data-feather="play" class="w-8 h-8 fill-current"></i>';
                if (window.feather) feather.replace();
            }
            if (this.controlsOverlay) this.controlsOverlay.classList.remove('opacity-0');
        } else {
            this.isPaused = false;
            if (window.speechSynthesis) window.speechSynthesis.resume();
            if (this.currentAudio) this.currentAudio.play().catch(e => console.warn(e));

            if (this.pauseBtn) {
                this.pauseBtn.innerHTML = '<i data-feather="pause" class="w-8 h-8 fill-current"></i>';
                if (window.feather) feather.replace();
            }
            if (this.controlsOverlay) this.controlsOverlay.classList.add('opacity-0');
            this.runStep(this.currentStep, this.remainingTime);
        }
    }

    endTour() {
        this.isPlaying = false;
        this.isPaused = false;
        if (this.subtitleOverlay) this.subtitleOverlay.classList.add('opacity-0');

        if (this.playBtn) this.playBtn.classList.remove('hidden');
        if (this.pauseBtn) this.pauseBtn.classList.add('hidden');
        if (this.controlsOverlay) {
            this.controlsOverlay.classList.remove('opacity-0');
            const parent = this.controlsOverlay.parentElement;
            if (parent && parent.classList.contains('group/viewer')) {
                this.controlsOverlay.classList.remove('group-hover/viewer:opacity-100');
            }
        }

        if (this.replayBtn) this.replayBtn.classList.remove('hidden');
        if (this.modelViewer) {
            this.modelViewer.autoRotate = true;
            this.modelViewer.exposure = 1.0;
        }
        if (this.tourProgress) this.tourProgress.style.width = '0%';
        this.hotspots.forEach(h => h.classList.remove('active'));
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
    }

    speak(text, audioId = null) {
        // Stop any current audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }

        // Use real audio if audioId is provided
        if (audioId) {
            const audio = document.getElementById(audioId);
            if (audio) {
                this.currentAudio = audio;
                audio.play().catch(e => console.warn("Audio play failed:", e));
                return;
            }
        }

        // Fallback to Web Speech API
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.85;
            utterance.pitch = 1.0;

            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-NG'));
            if (preferredVoice) utterance.voice = preferredVoice;

            window.speechSynthesis.speak(utterance);
        }
    }
}

window.XRTour = XRTour;
