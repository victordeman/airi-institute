import * as THREE from 'three';

export class HandTracker {
    constructor(video, canvas, scene, camera, renderer, physics, controls, onGesture) {
        this.video = video;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.physics = physics;
        this.controls = controls;
        this.onGesture = onGesture;

        this.hands = null;
        this.camera_utils = null;

        this.isActive = false;
        this.lastResults = null;
        this.grabbedNode = null;
        this.pinchHoldStartTime = 0;
        this.pinchHoldNode = null;
        this.lastPalmDist = 0;
        this.lastIndexDist = 0;
        this.lastPalmCenter = null;

        this.raycaster = new THREE.Raycaster();
        this.handPos2D = new THREE.Vector2();

        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();

        this.gestureLabel = "";
        this.labelPos = { x: 0, y: 0 };
    }

    async init() {
        // Wait for MediaPipe to be available — poll for up to 5 seconds
        let attempts = 0;
        while (typeof Hands === 'undefined' && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (typeof Hands === 'undefined') {
            throw new Error('MediaPipe Hands failed to load. Check CDN URLs.');
        }

        this.hands = new Hands({
            locateFile: (file) => `/static/vendor/mediapipe/${file}`
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: window.innerWidth < 768 ? 0 : 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));

        this.camera_utils = new Camera(this.video, {
            onFrame: async () => {
                if (this.isActive) {
                    await this.hands.send({ image: this.video });
                }
            },
            width: 1280,
            height: 720
        });
    }

    async start() {
        if (!this.hands) await this.init();

        this.isActive = true;
        this.physics.isActive = true;
        this.scene.background = null;
        this.controls.enabled = false;

        await this.camera_utils.start();

        document.getElementById('fps-counter').classList.remove('hidden');
        document.getElementById('hand-controls-legend').classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('hand-controls-legend').style.opacity = '1';
        }, 100);
    }

    stop() {
        this.isActive = false;
        this.physics.isActive = false;
        this.physics.reset();
        this.scene.background = new THREE.Color(0x020617);
        this.controls.enabled = true;

        if (this.camera_utils) this.camera_utils.stop();

        document.getElementById('fps-counter').classList.add('hidden');
        const legend = document.getElementById('hand-controls-legend');
        legend.style.opacity = '0';
        setTimeout(() => legend.classList.add('hidden'), 500);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.grabbedNode = null;
    }

    onResults(results) {
        this.lastResults = results;
        this.updateFPS();
        if (this.isActive) {
            this.processGestures(results);
            this.drawHandOverlay(results);
        }
    }

    updateFPS() {
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate > 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            document.getElementById('fps-counter').textContent = `FPS: ${this.fps}`;
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            // Adaptive complexity
            if (this.fps < 20) {
                this.hands.setOptions({ modelComplexity: 0 });
            } else if (this.fps > 25 && window.innerWidth >= 768) {
                this.hands.setOptions({ modelComplexity: 1 });
            }
        }
    }

    processGestures(results) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.gestureLabel = "";
            this.physics.nodes.forEach(n => n.attractedBy = null);
            if (this.grabbedNode) {
                 this.grabbedNode.grabbed = false;
                 this.grabbedNode = null;
                 this.onGesture('RELEASE', null);
            }
            return;
        }

        const landmarks = results.multiHandLandmarks;

        if (landmarks.length === 1) {
            this.handleSingleHand(landmarks[0]);
        } else if (landmarks.length === 2) {
            this.handleTwoHands(landmarks[0], landmarks[1]);
        }
    }

    handleSingleHand(landmarks) {
        const palmCenter = this.getPalmCenter(landmarks);
        const worldPalmPos = this.normalisedToWorld(palmCenter);
        this.labelPos = { x: palmCenter.x * this.canvas.width, y: palmCenter.y * this.canvas.height };

        const isPinching = this.checkPinch(landmarks);
        const isOpen = this.checkOpenPalm(landmarks);

        if (isPinching) {
            this.handlePinch(worldPalmPos, palmCenter);
        } else if (isOpen) {
            this.handleOpenPalm(worldPalmPos, palmCenter);
        } else {
            this.gestureLabel = "";
            this.lastPalmCenter = null;
            this.physics.nodes.forEach(n => n.attractedBy = null);
            if (this.grabbedNode) {
                this.grabbedNode.grabbed = false;
                this.grabbedNode = null;
                this.onGesture('RELEASE', null);
            }
            this.pinchHoldNode = null;
        }
    }

    handleOpenPalm(worldPalmPos, palmCenter) {
        if (palmCenter.y < 0.5) {
            this.gestureLabel = "ROTATE SCENE";
            if (this.lastPalmCenter) {
                const dx = palmCenter.x - this.lastPalmCenter.x;
                const dy = palmCenter.y - this.lastPalmCenter.y;

                const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
                const radius = offset.length();

                let phi = Math.atan2(offset.x, offset.z);
                let theta = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));

                phi -= dx * 4;
                theta += dy * 2;
                theta = Math.max(0.1, Math.min(Math.PI - 0.1, theta));

                this.camera.position.x = this.controls.target.x + radius * Math.sin(theta) * Math.sin(phi);
                this.camera.position.y = this.controls.target.y + radius * Math.cos(theta);
                this.camera.position.z = this.controls.target.z + radius * Math.sin(theta) * Math.cos(phi);
                this.camera.lookAt(this.controls.target);
            }
            this.lastPalmCenter = palmCenter;
        } else {
            this.lastPalmCenter = null;
            this.gestureLabel = "GRAVITY FIELD";
            const radius = 150;
            this.physics.nodes.forEach(node => {
                if (node.mesh.position.distanceTo(worldPalmPos) < radius) {
                    node.attractedBy = worldPalmPos;
                } else {
                    node.attractedBy = null;
                }
            });
        }
    }

    handlePinch(worldPalmPos, palmCenter) {
        this.handPos2D.set(palmCenter.x * 2 - 1, -(palmCenter.y * 2 - 1));
        this.raycaster.setFromCamera(this.handPos2D, this.camera);

        const meshes = this.physics.nodes.map(n => {
             if (n.mesh.type === 'Group') {
                 return n.mesh.children.find(c => c.type === 'Mesh');
             }
             return n.mesh;
        }).filter(Boolean);

        const intersects = this.raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const node = this.physics.nodes.find(n => n.mesh === hitMesh || (n.mesh.type === 'Group' && n.mesh.children.includes(hitMesh)));

            if (node) {
                if (!this.grabbedNode) {
                    this.grabbedNode = node;
                    node.grabbed = true;
                    this.gestureLabel = "GRABBING";
                    this.onGesture('GRAB', node);
                }

                // Pinch + Hold
                if (this.pinchHoldNode === node) {
                    if (performance.now() - this.pinchHoldStartTime > 1500) {
                        this.onGesture('PINCH_HOLD', node);
                        this.pinchHoldNode = null;
                    }
                } else {
                    this.pinchHoldNode = node;
                    this.pinchHoldStartTime = performance.now();
                }
            }
        }

        if (this.grabbedNode) {
            this.grabbedNode.mesh.position.copy(worldPalmPos);
            this.gestureLabel = "GRABBING";
        }
    }

    handleTwoHands(h1, h2) {
        const p1 = this.getPalmCenter(h1);
        const p2 = this.getPalmCenter(h2);
        const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

        const i1 = h1[8]; // Index tip
        const i2 = h2[8];
        const indexDist = Math.sqrt(Math.pow(i1.x - i2.x, 2) + Math.pow(i1.y - i2.y, 2));

        if (this.lastPalmDist > 0) {
            const diff = dist - this.lastPalmDist;
            if (diff > 0.05) {
                this.gestureLabel = "SCATTER";
                this.physics.applyExplosion(new THREE.Vector3(0,0,0), 100);

                // Trigger flash
                const flash = document.getElementById('flash-overlay');
                if (flash) {
                    flash.style.opacity = '1';
                    setTimeout(() => flash.style.opacity = '0', 150);
                }
            }
        }

        if (this.lastIndexDist > 0) {
            const diff = indexDist - this.lastIndexDist;
            if (Math.abs(diff) > 0.01) {
                this.gestureLabel = "ZOOM";
                this.camera.position.z -= diff * 1000;
            }
        }

        this.lastPalmDist = dist;
        this.lastIndexDist = indexDist;
        this.labelPos = { x: (p1.x + p2.x) / 2 * this.canvas.width, y: (p1.y + p2.y) / 2 * this.canvas.height };
    }

    getPalmCenter(landmarks) {
        return {
            x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
            y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3
        };
    }

    checkPinch(landmarks) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const dist = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
        return dist < 0.05;
    }

    checkOpenPalm(landmarks) {
        const isExtended = (tip, base) => landmarks[tip].y < landmarks[base].y;
        return isExtended(8, 5) && isExtended(12, 9) && isExtended(16, 13) && isExtended(20, 17);
    }

    normalisedToWorld(pos) {
        const vec = new THREE.Vector3(pos.x * 2 - 1, -(pos.y * 2 - 1), 0.5);
        vec.unproject(this.camera);
        const dir = vec.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        return this.camera.position.clone().add(dir.multiplyScalar(distance));
    }

    drawHandOverlay(results) {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.scale(-1, 1);
        this.ctx.translate(-this.canvas.width, 0);

        if (results.multiHandLandmarks) {
            results.multiHandLandmarks.forEach((landmarks) => {
                if (typeof drawConnectors !== 'undefined') {
                    drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, { color: 'rgba(255, 255, 255, 0.3)', lineWidth: 1 });
                }

                for (let i = 0; i < landmarks.length; i++) {
                    const landmark = landmarks[i];
                    const x = landmark.x * this.canvas.width;
                    const y = landmark.y * this.canvas.height;

                    if ([4, 8, 12, 16, 20].includes(i)) {
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                        this.ctx.fill();
                    } else {
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                        this.ctx.fill();
                    }
                }

                const palm = this.getPalmCenter(landmarks);
                const px = palm.x * this.canvas.width;
                const py = palm.y * this.canvas.height;

                this.ctx.beginPath();
                this.ctx.arc(px, py, 12, 0, 2 * Math.PI);
                this.ctx.fillStyle = '#4ade80';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#4ade80';
                this.ctx.fill();
                this.ctx.shadowBlur = 0;

                const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.2;
                this.ctx.beginPath();
                this.ctx.arc(px, py, 12 * pulse, 0, 2 * Math.PI);
                this.ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
                this.ctx.stroke();

                if (this.checkOpenPalm(landmarks)) {
                    this.ctx.beginPath();
                    this.ctx.arc(px, py, 50, 0, 2 * Math.PI);
                    this.ctx.strokeStyle = '#4ade80';
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }

                if (this.grabbedNode && this.checkPinch(landmarks)) {
                    const nodeScreenPos = this.grabbedNode.mesh.position.clone().project(this.camera);
                    const nx = (nodeScreenPos.x * 0.5 + 0.5) * this.canvas.width;
                    const ny = (-nodeScreenPos.y * 0.5 + 0.5) * this.canvas.height;

                    this.ctx.save();
                    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.canvas.width - px, py);
                    this.ctx.lineTo(nx, ny);
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                    this.ctx.restore();
                }

                if (this.pinchHoldNode && this.checkPinch(landmarks)) {
                    const elapsed = performance.now() - this.pinchHoldStartTime;
                    const progress = Math.min(1, elapsed / 1500);

                    this.ctx.beginPath();
                    this.ctx.arc(px, py, 30, -Math.PI/2, -Math.PI/2 + progress * Math.PI * 2);
                    this.ctx.strokeStyle = '#818cf8';
                    this.ctx.lineWidth = 4;
                    this.ctx.stroke();
                }
            });
        }

        if (this.gestureLabel) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.font = 'bold 12px monospace';
            this.ctx.fillStyle = '#4ade80';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.gestureLabel, this.canvas.width - this.labelPos.x, this.labelPos.y + 40);
        }

        this.ctx.restore();
    }
}
