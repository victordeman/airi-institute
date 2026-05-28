import * as THREE from 'three';

export class GesturePhysics {
    constructor(nodes) {
        this.nodes = nodes.map(node => {
            // Ensure we are tracking the group if it's a pioneer node
            const target = node.parent && node.parent.type === 'Group' ? node.parent : node;

            return {
                mesh: target,
                velocity: new THREE.Vector3(),
                homePosition: target.position.clone(),
                mass: this.getMass(node.userData.data?.size),
                grabbed: false,
                attractedBy: null
            };
        });
        this.damping = 0.92;
        this.springK = 0.05;
        this.separationRadius = 30;
        this.separationForce = 0.5;
        this.isActive = false;
    }

    getMass(size) {
        switch(size) {
            case 'giant': return 4;
            case 'large': return 3;
            case 'medium': return 2;
            case 'small': return 1;
            default: return 1.5;
        }
    }

    update() {
        if (!this.isActive) return;

        this.nodes.forEach(node => {
            if (node.grabbed) {
                // If grabbed, velocity is handled by the grabber (HandTracker)
                // but we might want to keep track of it for momentum on release
                return;
            }

            // 1. Attraction force (Gravity Field)
            if (node.attractedBy) {
                const force = new THREE.Vector3().subVectors(node.attractedBy, node.mesh.position);
                const distSq = force.lengthSq();
                if (distSq > 1) {
                    // F = G * (m1*m2) / r^2. Simplified.
                    force.normalize().multiplyScalar(1000 / (distSq + 100));
                    node.velocity.add(force.divideScalar(node.mass));
                }
            }

            // 2. Spring back to home
            const springForce = new THREE.Vector3().subVectors(node.homePosition, node.mesh.position);
            node.velocity.add(springForce.multiplyScalar(this.springK));

            // 3. Separation force
            this.nodes.forEach(other => {
                if (node === other) return;
                const dir = new THREE.Vector3().subVectors(node.mesh.position, other.mesh.position);
                const dist = dir.length();
                const minDist = this.separationRadius;
                if (dist < minDist && dist > 0) {
                    node.velocity.add(dir.normalize().multiplyScalar(this.separationForce));
                }
            });

            // 4. Apply damping and update position
            node.velocity.multiplyScalar(this.damping);
            node.mesh.position.add(node.velocity);
        });
    }

    applyExplosion(center, strength = 50) {
        this.nodes.forEach(node => {
            const dir = new THREE.Vector3().subVectors(node.mesh.position, center);
            node.velocity.add(dir.normalize().multiplyScalar(strength / node.mass));
        });
    }

    reset() {
        this.nodes.forEach(node => {
            node.attractedBy = null;
            node.grabbed = false;
            node.velocity.set(0, 0, 0);
        });
    }
}
