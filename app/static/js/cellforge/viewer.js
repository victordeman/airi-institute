import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class CellViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container #${containerId} not found`);
            return;
        }

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5efdf);

        this.camera = new THREE.PerspectiveCamera(35, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 0.1, 6.05);

        const existingCanvas = this.container.querySelector('canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: existingCanvas || undefined,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });

        if (!existingCanvas) {
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.container.appendChild(this.renderer.domElement);
        } else {
            // Respect the fixed size if canvas was already provided
            this.renderer.setPixelRatio(window.devicePixelRatio);
        }

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;
        this.renderer.shadowMap.enabled = true;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 3.3;
        this.controls.maxDistance = 6.4;

        this.initLights();
        this.initResizeHandler();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        this.currentModel = null;
        this.loader = new GLTFLoader();
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.82);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xfff7ed, 3.4);
        mainLight.position.set(4, 5, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.set(1024, 1024);
        this.scene.add(mainLight);

        const backLight = new THREE.DirectionalLight(0xdbeafe, 1.65);
        backLight.position.set(-4.5, 2.6, 3);
        this.scene.add(backLight);

        const pinkLight = new THREE.PointLight(0xf9a8d4, 1.35);
        pinkLight.position.set(0, -3.2, 2.4);
        this.scene.add(pinkLight);

        const greenLight = new THREE.PointLight(0xb8f7a6, 0.75);
        greenLight.position.set(-2.4, 1.2, 1.6);
        this.scene.add(greenLight);
    }

    initResizeHandler() {
        const resizeObserver = new ResizeObserver(() => {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            if (width === 0 || height === 0) return;
            
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
        resizeObserver.observe(this.container);
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    loadModel(url, isGenerated = false) {
        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                this.clearScene();
                const model = gltf.scene;

                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        if (node.material) {
                            const materials = Array.isArray(node.material) ? node.material : [node.material];
                            materials.forEach((material) => {
                                material.side = THREE.DoubleSide;
                                material.envMapIntensity = Math.max(material.envMapIntensity || 0, 1.15);
                                material.needsUpdate = true;
                            });
                        }
                    }
                });

                if (isGenerated) {
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    const longest = Math.max(size.x, size.y, size.z) || 1;
                    model.position.sub(center);
                    model.scale.setScalar(3.25 / longest);
                } else {
                    model.scale.setScalar(1.22);
                    model.rotation.set(-0.08, -0.42, 0.05);
                }

                this.currentModel = model;
                this.scene.add(model);
                resolve(model);
            }, undefined, reject);
        });
    }

    loadDefaultCell() {
        this.clearScene();
        const group = new THREE.Group();
        group.scale.setScalar(1.22);
        group.rotation.set(-0.08, -0.42, 0.05);

        // Membrane
        const membraneGeo = new THREE.SphereGeometry(1.32, 64, 64);
        const membraneMat = new THREE.MeshPhysicalMaterial({
            color: '#cfd9ea',
            transparent: true,
            opacity: 0.62,
            roughness: 0.34,
            metalness: 0.03,
            transmission: 0.14,
            clearcoat: 0.58,
            clearcoatRoughness: 0.2
        });
        const membrane = new THREE.Mesh(membraneGeo, membraneMat);
        group.add(membrane);

        // Nucleus
        const nucleusGroup = new THREE.Group();
        nucleusGroup.position.set(-0.2, 0.12, 0.28);
        nucleusGroup.rotation.set(0.2, -0.12, -0.32);

        const nucleusMain = new THREE.Mesh(
            new THREE.SphereGeometry(0.48, 32, 32),
            new THREE.MeshPhysicalMaterial({ color: '#6f3a9b', roughness: 0.36, clearcoat: 0.32 })
        );
        nucleusMain.scale.set(0.72, 0.5, 0.44);
        nucleusGroup.add(nucleusMain);
        group.add(nucleusGroup);

        // Mitochondria (simple capsule representation)
        const mitoGeo = new THREE.CapsuleGeometry(0.1, 0.4, 8, 16);
        const mitoMat = new THREE.MeshStandardMaterial({ color: '#df7046', emissive: '#c2410c', emissiveIntensity: 0.22 });

        const mito1 = new THREE.Mesh(mitoGeo, mitoMat);
        mito1.position.set(-0.78, -0.55, 0.48);
        group.add(mito1);

        const mito2 = new THREE.Mesh(mitoGeo, mitoMat);
        mito2.position.set(0.7, 0.1, 0.46);
        group.add(mito2);

        this.currentModel = group;
        this.scene.add(group);
    }

    clearScene() {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            this.currentModel.traverse(node => {
                if (node.isMesh) {
                    node.geometry.dispose();
                    if (Array.isArray(node.material)) {
                        node.material.forEach(m => m.dispose());
                    } else {
                        node.material.dispose();
                    }
                }
            });
            this.currentModel = null;
        }
    }
}

export { CellViewer };
