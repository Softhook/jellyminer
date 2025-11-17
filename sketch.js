// --- START OF FILE sketch.js ---

// --- Game Configuration ---
const GRAVITY_FORCE = 0.1;
const THRUST_FORCE = 0.16;
const LIFT_FACTOR = 0.012;
const TURN_SPEED = 2.5; // Base turn speed
const DAMPING_FACTOR = 0.985; // Base air drag
const GROUND_FRICTION = 0.95;
const BULLET_SPEED = 10;
const SHOOT_COOLDOWN_FRAMES = 18; // Base cooldown
const RESPAWN_DELAY_FRAMES = 120;
const BALLOON_RESPAWN_FRAMES = 360;
const MAX_CLOUDS = 5;
const CLOUD_BASE_SPEED = 0.3;
const MIN_TAKEOFF_SPEED = 1.8;
const MAX_LANDING_SPEED = 2.5; // Speed above which crash might occur (unless Trampoline)
const MAX_PARTICLES = 250;
const PLANE_COLLISION_THRESHOLD_FACTOR = 0.8; // Multiplier for combined radii
const STALL_ANGLE_THRESHOLD = -70;
const STALL_RECOVERY_ANGLE = -50;
const STALL_EFFECT_FACTOR = 0.2;
const MAX_SPEED_FOR_SOUND = 8;
const PROPELLER_BLUR_COLOR = [100, 100, 100, 150];
const PROPELLER_STOPPED_COLOR = [0];
const PLANE_BASE_SIZE = 22; // Define fixed plane size



// ==========================
// --- BubbleProjectile Class --- (No changes needed)
// ==========================
class BubbleProjectile { // Unchanged from previous version
    constructor(x, y, angle, ownerId) { this.position = createVector(x, y); this.velocity = p5.Vector.fromAngle(radians(angle), BUBBLE_SPEED); this.ownerId = ownerId; this.size = 25; this.life = 240; this.wobbleOffset = random(100); this.wobbleMagnitude = this.size * 0.05; }
    update() { this.velocity.y -= GRAVITY_FORCE * 0.05; this.velocity.mult(0.995); this.position.add(this.velocity); this.life--; }
    display() { push(); translate(this.position.x, this.position.y); let wobbleX = sin(frameCount * 3 + this.wobbleOffset) * this.wobbleMagnitude; let wobbleY = cos(frameCount * 2.5 + this.wobbleOffset * 1.2) * this.wobbleMagnitude; let currentSize = this.size * (1 + sin(frameCount + this.wobbleOffset) * 0.03); noFill(); strokeWeight(2.5); stroke(BUBBLE_STROKE_COLOR[0],BUBBLE_STROKE_COLOR[1],BUBBLE_STROKE_COLOR[2], BUBBLE_STROKE_COLOR[3]); ellipse(wobbleX, wobbleY, currentSize, currentSize); fill(BUBBLE_FILL_COLOR[0],BUBBLE_FILL_COLOR[1],BUBBLE_FILL_COLOR[2], BUBBLE_FILL_COLOR[3]); noStroke(); ellipse(wobbleX, wobbleY, currentSize, currentSize); noFill(); stroke(255, 255, 255, 150); strokeWeight(1.5); arc(wobbleX - currentSize * 0.2, wobbleY - currentSize * 0.2, currentSize * 0.6, currentSize * 0.6, 150, 300); pop(); }
    isOffscreen() { return (this.life <= 0 || this.position.x < -this.size * 2 || this.position.x > width + this.size * 2 || this.position.y < -this.size * 2 || this.position.y > height + this.size); }
    checkCollision(target, targetIsBalloon = false) { // Uses target.size for planes
        if (!target || typeof target.isAlive === 'undefined' || !target.isAlive) return false;
        if (target instanceof Plane && (target.id === this.ownerId || target.respawnTimer > 0)) return false;
        if (!target.position || typeof target.position.x === 'undefined') return false;
        let targetRadius;
        if (targetIsBalloon) { if (typeof target.radius === 'undefined') return false; targetRadius = target.radius; }
        else { if (typeof target.size === 'undefined') return false; targetRadius = target.size * 0.8; } // Use fixed plane size
        let distanceSq = (this.position.x - target.position.x)**2 + (this.position.y - target.position.y)**2;
        let radiiSq = (targetRadius + this.size / 2)**2;
        return distanceSq < radiiSq;
    }
    hitEffect(plane) { plane.hit(false, this); } // Let plane.hit handle the bubbling logic
    checkCollisionHut(hutObj) { return false; }
}

// =====================
// --- Cloud Class --- (Unchanged)
// =====================
 class Cloud { constructor() { this.pos = createVector(0,0); this.vel = createVector(0,0); this.size = 100; this.puffOffsets = []; this.numPuffs = 7; this.opacity = 200; this.speedFactor = 1; this.direction = 1; this.reset(); this.pos.x = random(width); } reset() { this.direction = random() < 0.5 ? -1 : 1; this.size = random(100, 190); let startX = this.direction > 0 ? -this.size * 1.5 : width + this.size * 1.5; this.pos = createVector(startX, random(height * 0.1, height * 0.6)); this.speedFactor = random(0.5, 1.5); this.vel = createVector(CLOUD_BASE_SPEED * this.direction * this.speedFactor, 0); this.numPuffs = floor(random(6, 12)); this.puffOffsets = []; for (let i = 0; i < this.numPuffs; i++) { let puffX = random(-this.size * 0.7, this.size * 0.7); let puffY = random(-this.size * 0.3, this.size * 0.3); let puffR = random(this.size * 0.4, this.size * 0.9) * random(0.8, 1.2); this.puffOffsets.push({ x: puffX, y: puffY, r: puffR }); } this.opacity = random(190, 240); } update() { this.pos.add(this.vel); if ( (this.vel.x > 0 && this.pos.x - this.size * 1.5 > width) || (this.vel.x < 0 && this.pos.x + this.size * 1.5 < 0) ) { this.reset(); } if (this.pos.y < -this.size || this.pos.y > height + this.size) { this.reset(); } } display() { push(); noStroke(); translate(this.pos.x, this.pos.y); fill(CLOUD_SHADOW[0], CLOUD_SHADOW[1], CLOUD_SHADOW[2], this.opacity * 0.6); ellipse(0, this.size * 0.25, this.size * 1.3, this.size * 0.7); fill(CLOUD_COLOR[0], CLOUD_COLOR[1], CLOUD_COLOR[2], this.opacity); for (let puff of this.puffOffsets) { ellipse(puff.x, puff.y, puff.r, puff.r * 0.85); } pop(); } }

// ==========================
// --- Hot Air Balloon Class --- (Unchanged)
// ==========================
class Balloon { constructor(x, y) { this.basePos = createVector(x, y); this.pos = this.basePos.copy(); this.position = this.pos; this.bobbleOffset = 0; this.bobbleSpeed = 0.6; this.driftSpeed = random(0.1, 0.3) * (random() > 0.5 ? 1 : -1); this.radius = 30; this.visualRadius = 30; this.basketSize = { w: 25, h: 18 }; this.ropeLength = 25; this.isAlive = true; this.respawnTimer = 0; }
    update() { if (this.respawnTimer > 0) { this.respawnTimer--; if (this.respawnTimer <= 0) { this.respawn(); } return; } if (!this.isAlive) return; this.bobbleOffset = sin(frameCount * this.bobbleSpeed) * 6; this.basePos.x += this.driftSpeed; if (this.driftSpeed > 0 && this.basePos.x > width + this.visualRadius * 2) { this.basePos.x = -this.visualRadius * 2; } else if (this.driftSpeed < 0 && this.basePos.x < -this.visualRadius * 2) { this.basePos.x = width + this.visualRadius * 2; } this.pos.y = this.basePos.y + this.bobbleOffset; this.pos.x = this.basePos.x; }
    display() { if (this.respawnTimer > 0 && !this.isAlive) { if (floor(this.respawnTimer / 8) % 2 !== 0) { return; } } else if (!this.isAlive && this.respawnTimer <= 0) { return; } push(); translate(this.pos.x, this.pos.y); noStroke(); let basketTopY = this.visualRadius * 0.8 + this.ropeLength; let basketBottomY = basketTopY + this.basketSize.h; let basketCenterX = 0; stroke(BALLOON_ROPE); strokeWeight(1.5); line(basketCenterX - this.basketSize.w * 0.4, basketTopY, -this.visualRadius * 0.5, this.visualRadius * 0.7); line(basketCenterX + this.basketSize.w * 0.4, basketTopY, this.visualRadius * 0.5, this.visualRadius * 0.7); line(basketCenterX, basketTopY - 3, 0, this.visualRadius * 0.8); fill(BALLOON_BASKET); rect(basketCenterX, basketTopY + this.basketSize.h / 2, this.basketSize.w, this.basketSize.h, 3); fill(BALLOON_BASKET[0]*0.8, BALLOON_BASKET[1]*0.8, BALLOON_BASKET[2]*0.8); rect(basketCenterX, basketTopY + 2, this.basketSize.w, 4, 2); stroke(BALLOON_BASKET[0]*0.7, BALLOON_BASKET[1]*0.7, BALLOON_BASKET[2]*0.7, 180); strokeWeight(1); for(let i = 1; i < 4; i++){ line(basketCenterX - this.basketSize.w/2, basketTopY + i * (this.basketSize.h/4), basketCenterX + this.basketSize.w/2, basketTopY + i*(this.basketSize.h/4)); } for(let i = 1; i < 5; i++){ line(basketCenterX - this.basketSize.w/2 + i*(this.basketSize.w/5), basketTopY, basketCenterX - this.basketSize.w/2 + i*(this.basketSize.w/5), basketBottomY); } noStroke(); let numPanels = BALLOON_COLORS.length * 2; for (let i = 0; i < numPanels; i++) { fill(BALLOON_COLORS[i % BALLOON_COLORS.length]); arc(0, 0, this.visualRadius * 2.1, this.visualRadius * 2.3, i * (360.0 / numPanels) - 90 - (360.0/numPanels)*0.1, (i + 1) * (360.0 / numPanels) - 90 + (360.0/numPanels)*0.1, PIE); } noFill(); stroke(255, 255, 255, 30); strokeWeight(this.visualRadius * 0.5); arc(0,0, this.visualRadius*1.8, this.visualRadius*2.0, -150, -30); stroke(0, 0, 0, 40); strokeWeight(this.visualRadius * 0.6); arc(0,0, this.visualRadius*1.8, this.visualRadius*2.0, 30, 150); pop(); noStroke(); }
    hit() { if (!this.isAlive) return; this.isAlive = false; this.respawnTimer = BALLOON_RESPAWN_FRAMES; createExplosion(this.pos.x, this.pos.y, 25, EXPLOSION_COLORS.slice(0, 3).concat([BALLOON_BASKET])); let powerUpType = random(POWERUP_TYPES); let newPowerUp = new PowerUp(this.pos.x, this.pos.y, powerUpType); powerUps.push(newPowerUp); if(audioStarted && soundNodesStarted && powerUpSpawnSound && explosionNoise) { powerUpSpawnSound.play(explosionNoise); } }
    respawn() { this.isAlive = true; this.basePos.x = random(width * 0.1, width * 0.9); this.basePos.y = random(height * 0.15, height * 0.55); this.driftSpeed = random(0.1, 0.3) * (random() > 0.5 ? 1 : -1); this.pos = this.basePos.copy(); this.position = this.pos; this.bobbleOffset = 0; }
 }

// =======================
// --- Particle Class --- (Unchanged)
// =======================
 class Particle { constructor(x, y, baseColor) { this.pos = createVector(x, y); let angle = random(360); let speed = random(1, 5); this.vel = p5.Vector.fromAngle(radians(angle), speed); this.vel.y += random(-0.5, 0.5); this.lifespan = random(30, 70); this.baseColor = color(baseColor); this.size = random(4, 12); this.decay = random(0.88, 0.96); this.gravity = 0.05; } update() { this.pos.add(this.vel); this.vel.mult(0.95); this.vel.y += this.gravity; this.lifespan -= 1; this.size *= this.decay; } display() { push(); noStroke(); let currentAlpha = map(this.lifespan, 0, 50, 0, alpha(this.baseColor)); fill(red(this.baseColor), green(this.baseColor), blue(this.baseColor), max(0, currentAlpha)); ellipse(this.pos.x, this.pos.y, this.size, this.size); pop(); } isDead() { return this.lifespan <= 0 || this.size < 1; } }

// ==============================
// --- RainbowParticle Class --- (Unchanged)
// ==============================
class RainbowParticle { constructor(x, y, assignedColor) { this.pos = createVector(x, y); this.vel = p5.Vector.random2D().mult(random(0.1, 0.4)); this.vel.y -= random(0.05, 0.15); this.lifespan = RAINBOW_TRAIL_PARTICLE_LIFESPAN; this.initialLifespan = this.lifespan; this.baseColor = color(assignedColor); this.size = random(3, 7); this.gravity = 0.01; } update() { this.pos.add(this.vel); this.vel.mult(0.97); this.vel.y += this.gravity; this.lifespan -= 1; } display() { push(); noStroke(); let currentAlpha = map(this.lifespan, 0, this.initialLifespan, 0, alpha(this.baseColor)); let shimmer = sin(frameCount * 5 + this.pos.x * 0.1) * 0.1 + 0.95; fill(red(this.baseColor) * shimmer, green(this.baseColor) * shimmer, blue(this.baseColor) * shimmer, max(0, currentAlpha)); ellipse(this.pos.x, this.pos.y, this.size, this.size); pop(); } isDead() { return this.lifespan <= 0; } }

// ===============================================
// --- Helper Function to Create Explosions --- (Unchanged)
// ===============================================
 function createExplosion(x, y, count, colors, isBomb = false) { if (audioStarted && soundNodesStarted) { if (isBomb && bombExplosionSoundEnv && bombExplosionNoise) { bombExplosionSoundEnv.play(bombExplosionNoise); } else if (!isBomb && explosionSoundEnv && explosionNoise) { explosionSoundEnv.play(explosionNoise); } } if (particles.length > MAX_PARTICLES) return; for (let i = 0; i < count; i++) { let chosenColor = random(colors); if (particles.length < MAX_PARTICLES) { particles.push(new Particle(x, y, chosenColor)); } else { break; } } }

// ==========================
// --- PowerUp Class --- (Added Cloud Disguise display)
// ==========================
class PowerUp { constructor(x, y, type) { this.position = createVector(x, y); this.velocity = createVector(random(-0.5, 0.5), POWERUP_FALL_SPEED); this.type = type; this.color = color(POWERUP_COLORS[type] || [255, 255, 255]); this.size = POWERUP_SIZE; this.lifespan = POWERUP_DURATION_FRAMES * 1.5; this.rotation = 0; this.rotationSpeed = random(-2, 2); }
    update() { this.position.add(this.velocity); this.velocity.y += GRAVITY_FORCE * 0.2; this.velocity.mult(0.99); this.lifespan--; this.rotation += this.rotationSpeed; if (this.position.y > GROUND_Y - this.size / 2) { this.position.y = GROUND_Y - this.size / 2; this.velocity.y *= -0.4; this.velocity.x *= 0.8; } }
    display() { push(); translate(this.position.x, this.position.y); rotate(this.rotation); stroke(0); strokeWeight(2); fill(this.color); let s = this.size;
        if (this.type === 'RapidFire') { for (let i = 0; i < 4; i++) { rect(0, 0, s * 0.3, s * 0.8, 2); rotate(45); } fill(255,255,255); noStroke(); ellipse(0,0, s*0.3, s*0.3); }
        else if (this.type === 'SpeedBoost') { beginShape(); vertex(0, -s * 0.6); vertex(s * 0.5, 0); vertex(0, s * 0.2); vertex(-s * 0.5, 0); endShape(CLOSE); stroke(255,255,255, 150); strokeWeight(1.5); line(0, -s*0.2, 0, s*0.5); line(-s*0.2, s*0.1, -s*0.2, s*0.6); line(s*0.2, s*0.1, s*0.2, s*0.6); }
        else if (this.type === 'Shield') { ellipse(0, 0, s, s); fill(255, 255, 255, 180); noStroke(); ellipse(0, 0, s * 0.6, s * 0.6); }
        else if (this.type === 'TripleShot') { let w = s * 0.2; let h = s * 0.5; let spacing = w * 1.5; rect(-spacing, 0, w, h, 1); rect(0, 0, w, h, 1); rect(spacing, 0, w, h, 1); }
        else if (this.type === 'Bomb') { ellipse(0, 0, s, s); fill(0); noStroke(); ellipse(0, 0, s*1.05, s*1.05); fill(this.color); ellipse(0, 0, s, s); stroke(255, 200, 0); strokeWeight(2.5); noFill(); arc(0, -s * 0.4, s*0.4, s*0.4, 180, 300); fill(255, 50, 0); noStroke(); ellipse(s*0.2*cos(300), -s*0.4 + s*0.2*sin(300), 4, 4); }
        else if (this.type === 'Trampoline') { noFill(); strokeWeight(3); arc(0, s*0.1, s*0.8, s*0.6, 180, 360); line(-s*0.4, s*0.1, -s*0.5, s*0.4); line(s*0.4, s*0.1, s*0.5, s*0.4); line(-s*0.5, s*0.4, s*0.5, s*0.4); }
        else if (this.type === 'ChickenLauncher') { fill(CHICKEN_BODY_COLOR); ellipse(0, s*0.1, s*0.8, s*0.6); ellipse(s*0.3, -s*0.1, s*0.4, s*0.3); fill(CHICKEN_ACCENT_COLOR); rect(s*0.25, -s*0.3, s*0.15, s*0.1, 1); }
        else if (this.type === 'BubbleGun') { ellipse(0, 0, s, s); noFill(); stroke(255, 255, 255, 150); strokeWeight(1.5); arc(-s*0.2, -s*0.2, s*0.5, s*0.5, 150, 300); }
        else if (this.type === 'ReverseGun') { beginShape(); vertex(s*0.4, 0); vertex(-s*0.1, -s*0.3); vertex(-s*0.1, s*0.3); endShape(CLOSE); rect(-s*0.3, 0, s*0.3, s*0.2); }
        else if (this.type === 'RainbowTrail') { noFill(); strokeWeight(s * 0.15); for(let i=0; i<RAINBOW_COLORS.length; i++) { stroke(RAINBOW_COLORS[i]); arc(0,0, s*0.8, s*0.8, -90 + i*(180/RAINBOW_COLORS.length), -90 + (i+1)*(180/RAINBOW_COLORS.length)); } }
        // --- Cloud Disguise Powerup Item Display ---
        else if (this.type === 'CloudDisguise') {
            noStroke();
            let c = this.color;
            fill(c.levels[0], c.levels[1], c.levels[2], 200); // Use the light gray-blue
            // Draw a few simple overlapping ellipses to represent a cloud
            ellipse(0, 0, s * 0.9, s * 0.7);
            ellipse(-s * 0.35, s * 0.15, s * 0.6, s * 0.5);
            ellipse(s * 0.35, s * 0.1, s * 0.7, s * 0.6);
            // Optional: Add a subtle highlight
            fill(255, 255, 255, 80);
            ellipse(s*0.1, -s*0.1, s*0.4, s*0.3);
        }
        else { rect(0, 0, s, s); } // Default box
        pop(); noStroke(); }
    isOffscreen() { return this.lifespan <= 0 || this.position.y > height + this.size * 2; }
    checkCollision(plane) { // Uses fixed plane.size
        if (!plane || !plane.isAlive || plane.respawnTimer > 0 || typeof plane.size === 'undefined' || typeof plane.position === 'undefined') return false;
        // Collision uses plane's actual size, not visual disguise size
        let distanceSq = (this.position.x - plane.position.x)**2 + (this.position.y - plane.position.y)**2;
        let radiiSq = (plane.size * 0.8 + this.size / 2)**2; // Use fixed plane size
        return distanceSq < radiiSq;
    }
}


// ==========================
// --- Bomb Class --- (No changes needed)
// ==========================
class Bomb {
    constructor(x, y, ownerId, planeVelocity) { this.position = createVector(x, y); this.velocity = planeVelocity.copy().mult(0.5); this.velocity.y += BOMB_DROP_VELOCITY_Y; this.ownerId = ownerId; this.size = 12; this.fuseTimer = BOMB_FUSE_FRAMES; this.rotation = random(360); this.rotationSpeed = random(-1, 1) * (this.velocity.x > 0 ? 1 : -1); }
    update() { this.position.add(this.velocity); this.velocity.y += GRAVITY_FORCE * 1.5; this.velocity.mult(0.985); this.fuseTimer--; this.rotation += this.rotationSpeed; }
    display() { push(); translate(this.position.x, this.position.y); rotate(this.rotation); fill(50); stroke(80); strokeWeight(1); ellipse(0, 0, this.size * 1.2, this.size); fill(90); noStroke(); triangle(-this.size * 0.6, 0, -this.size * 0.9, -this.size * 0.3, -this.size * 0.9, this.size * 0.3); if (floor(this.fuseTimer / max(5, this.fuseTimer * 0.2)) % 2 === 0) { fill(255, 50 + (BOMB_FUSE_FRAMES - this.fuseTimer)*2, 0); ellipse(this.size * 0.5, 0, 4, 4); } pop(); noStroke(); }
    explode(hutObj) { createExplosion(this.position.x, this.position.y, BOMB_EXPLOSION_PARTICLES, BOMB_EXPLOSION_COLORS, true);
        for (let plane of [plane1, plane2]) {
             // Explosion checks use plane's real position/size, ignore disguise
             if (plane.isAlive && typeof plane.size !== 'undefined' && typeof plane.position !== 'undefined') {
                 let distSq = (this.position.x - plane.position.x)**2 + (this.position.y - plane.position.y)**2;
                 let radiusSq = (BOMB_EXPLOSION_RADIUS + plane.size * 0.5)**2;
                 if (distSq < radiusSq) { let hitSuccess = plane.hit(true, null); if (hitSuccess && this.ownerId !== plane.id) { if (plane.id === 1) { score2++; } else { score1++; } } }
             }
        }
        if (hutObj && typeof hutObj.x !== 'undefined') { let hutDistSq = (this.position.x - hutObj.x)**2 + (this.position.y - hutObj.y)**2; let collisionThresholdHut = BOMB_EXPLOSION_RADIUS + max(hutObj.w, hutObj.h) * 0.5; if (!hutObj.destroyed && hutDistSq < collisionThresholdHut * collisionThresholdHut) { destroyHut(hutObj); } else if (hutObj.destroyed && hutDistSq < collisionThresholdHut * collisionThresholdHut) { createExplosion(this.position.x, this.position.y, 10, HUT_RUBBLE_COLORS, true); } } }
    checkCollision(plane) {
        // Direct bomb collision uses plane's real position/size
        if (!plane || !plane.isAlive || plane.respawnTimer > 0 || typeof plane.size === 'undefined' || typeof plane.position === 'undefined') return false;
        let distanceSq = (this.position.x - plane.position.x)**2 + (this.position.y - plane.position.y)**2; let radiiSq = (plane.size * 0.7 + this.size / 2)**2; return distanceSq < radiiSq;
    }
    checkCollisionHut(hutObj) { if (!hutObj || hutObj.destroyed) return false; return (this.position.x > hutObj.x - hutObj.w / 2 && this.position.x < hutObj.x + hutObj.w / 2 && this.position.y > hutObj.y - hutObj.h / 2 && this.position.y < hutObj.y + hutObj.h / 2); }
    checkCollisionGround() { return this.position.y >= GROUND_Y - this.size / 2; }
    isOffscreen() { return (this.fuseTimer < -300 && (this.position.y > height + this.size * 5 || this.position.x < -width || this.position.x > width*2)); }
}

// ===============================
// --- RainDrop Class --- (Unchanged)
// ===============================
class RainDrop { constructor() { this.reset(); } reset() { this.z = random(0.2, 1); this.pos = createVector(random(width * 1.2), random(-height * 0.5, -20)); this.len = map(this.z, 0.2, 1, 4, 12); this.ySpeed = map(this.z, 0.2, 1, 4, 10); this.vel = createVector(0, this.ySpeed); } update() { this.pos.add(this.vel); if (this.pos.y > GROUND_Y + this.len) { this.reset(); } } display() { push(); let alpha = map(this.z, 0.2, 1, 80, 200); let weight = map(this.z, 0.2, 1, 0.5, 1.5); stroke(RAINDROP_COLOR[0], RAINDROP_COLOR[1], RAINDROP_COLOR[2], alpha); strokeWeight(weight); line(this.pos.x, this.pos.y, this.pos.x, this.pos.y + this.len); pop(); noStroke(); } }

// --- END OF FILE sketch.js ---