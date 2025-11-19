// Jelly Miner - 2 Player Dwarf Miners digging through bouncy jelly
// Object-oriented: Cave (jelly field), Dwarf (player soft-body), Weapon (bouncy projectile), Gem
// Controls: Player1 WASD to move, F to shoot. Player2 Arrow keys to move, K to shoot. R to restart.

let game;

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  noStroke();
  game = new Game();
}

function draw() {
  background(18, 22, 30);
  game.update();
  game.draw();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); game.onResize(); }

function keyPressed() { game.onKeyPressed(keyCode); }
function keyReleased() { game.onKeyReleased(keyCode); }

// Enter fullscreen on any mouse press or touch (user gesture required by browsers)
function mousePressed() {
  if (!fullscreen()) {
    fullscreen(true);
    // small delay then resize canvas to new size
    setTimeout(() => { resizeCanvas(windowWidth, windowHeight); if (game && game.onResize) game.onResize(); }, 250);
  }
}
function touchStarted() { mousePressed(); }

// ------------------ Game class ------------------
class Game {
  constructor() {
    this.reset();
  }
  reset() {
    this.gravity = 0.55;
    this.cave = new Cave(40, 28); // spacing, nodeRadius
    this.gems = [];
    this.weapons = [];
    this.particles = [];
    this.scores = [0,0];

    // Create two dwarfs
    this.dwarfs = [];
    this.dwarfs.push(new Dwarf(width*0.25, height*0.2, color(200, 130, 80), {
      left:65, right:68, up:87, down:83, shoot:70 // A D W S, F to shoot
    }, 0));
    this.dwarfs.push(new Dwarf(width*0.75, height*0.2, color(120,200,180), {
      left:37, right:39, up:38, down:40, shoot:75 // arrow keys, K to shoot
    }, 1));

    // Scatter gems inside the cave region
    for (let i=0;i<12;i++) this.gems.push(new Gem(random(120, width-120), random(140, height-120)));
  }

  onResize(){ this.cave.buildGrid(); }

  onKeyPressed(kc){ if (kc === 82) this.reset(); // R to restart
    for (let d of this.dwarfs) d.keyPressed(kc); }
  onKeyReleased(kc){ for (let d of this.dwarfs) d.keyReleased(kc); }

  spawnWeapon(x,y,angle,ownerId){ this.weapons.push(new Weapon(x,y,angle,ownerId)); }

  update(){
    // update dwarfs
    for (let d of this.dwarfs) d.update(this);
    // update weapons
    for (let i=this.weapons.length-1;i>=0;i--){ let w=this.weapons[i]; w.update(this); if (w.isDead) this.weapons.splice(i,1); }
    // update particles
    for (let i=this.particles.length-1;i>=0;i--){ let p=this.particles[i]; p.update(); if (p.life<=0) this.particles.splice(i,1); }
    // gems collection
    for (let gi=this.gems.length-1; gi>=0; gi--){ let g=this.gems[gi]; for (let di=0; di<this.dwarfs.length; di++){ let d=this.dwarfs[di]; if (d.canCollect(g, this.cave)) { this.scores[di]++; this.gems.splice(gi,1); this.gems.push(new Gem(random(120, width-120), random(140, height-120))); break; } } }
  }

  draw(){
    // subtle gradient background
    for (let y=0;y<height;y+=8){ let t=map(y,0,height,0,1); fill(18 + 18*t, 22+18*t, 30+20*t); rect(0,y,width,8); }

    // draw cave first (jelly field)
    this.cave.draw();

    // draw gems (gems slightly glow if exposed)
    for (let g of this.gems) g.draw(this.cave);

    // draw dwarfs
    for (let d of this.dwarfs) d.draw(this.cave);

    // draw weapons
    for (let w of this.weapons) w.draw();

    // draw small particles
    for (let p of this.particles) p.draw();

    // UI
    fill(255); textSize(18); textAlign(LEFT,TOP);
    text(`Player 1: ${this.scores[0]}`, 18, 18);
    textAlign(RIGHT,TOP);
    text(`Player 2: ${this.scores[1]}`, width-18, 18);
    textAlign(CENTER,TOP);
    fill(200); textSize(13); text('Dig the jelly to free gems. WASD + F and Arrows + K. R to restart.', width/2, 18+4);
  }
}

// ------------------ Cave (jelly) ------------------
class CaveNode {
  constructor(x,y,r){ this.pos = createVector(x,y); this.r = r; this.maxR = r; }
}

class Cave {
  constructor(spacing=36, nodeRadius=28){ this.spacing = spacing; this.nodeRadius = nodeRadius; this.nodes = []; this.buildGrid(); }
  buildGrid(){
    this.nodes = [];
    // create nodes in a loose grid covering most of the canvas
    let margin = 60;
    for (let y = margin; y < height - margin; y += this.spacing){
      for (let x = margin; x < width - margin; x += this.spacing){
        // create some variation: leave top area more open
        if (y < height*0.12 && random() < 0.85) continue;
        let r = this.nodeRadius * random(0.85, 1.15);
        this.nodes.push(new CaveNode(x + random(-this.spacing*0.25,this.spacing*0.25), y + random(-this.spacing*0.25,this.spacing*0.25), r));
      }
    }
  }
  // return first node that overlaps point
  findNodeAt(x,y){
    for (let n of this.nodes){ let d = dist(x,y,n.pos.x,n.pos.y); if (d < n.r) return n; }
    return null;
  }
  // get all nodes within radius
  nodesInRange(x,y,rad){ let out=[]; for (let n of this.nodes){ if (dist(x,y,n.pos.x,n.pos.y) < rad + n.r) out.push(n); } return out; }

  // digging: reduce node radius by amount; if radius small, remove node
  dig(node, amount){ if (!node) return; node.r -= amount; if (node.r < 3) { // remove
      let idx = this.nodes.indexOf(node); if (idx>=0) this.nodes.splice(idx,1); }
  }

  draw(){
    // draw soft overlapping jelly circles
    push(); blendMode(BLEND);
    for (let n of this.nodes){ fill(145, 90, 190, 150); ellipse(n.pos.x, n.pos.y, n.r*2, n.r*2); }
    // light highlight
    for (let n of this.nodes){ fill(220,160,230,12); ellipse(n.pos.x-5, n.pos.y-8, n.r*1.6, n.r*1.6); }
    pop();
  }
}

// ------------------ Dwarf player ------------------
class Dwarf {
  constructor(x,y,col,controls,id){
    this.id = id;
    this.pos = createVector(x,y);
    this.vel = createVector(0,0);
    this.radius = 20; // visual body
    this.mass = 1.6;
    this.color = col;
    this.controls = controls;
    this.input = {left:false,right:false,up:false,down:false,shoot:false};
    this.shootCooldown = 0;
    this.groundBounce = 0.3;
    this.facing = 1; // 1 = right, -1 = left
    this.stunned = false;
    this.stunTimer = 0;
    this.birdPhase = random(0, TWO_PI);
    this.birdCount = 3;
  }
  keyPressed(kc){
    if (this.stunned) return; // ignore inputs while stunned
    if (kc === this.controls.left) this.input.left = true;
    if (kc === this.controls.right) this.input.right = true;
    if (kc === this.controls.up) this.input.up = true;
    if (kc === this.controls.down) {
      this.input.down = true;
      // pressing down also shoots a weapon downward
      this.shootDown();
    }
    if (kc === this.controls.shoot) this.tryShoot();
  }
  keyReleased(kc){ if (kc === this.controls.left) this.input.left = false; if (kc===this.controls.right) this.input.right=false; if (kc===this.controls.up) this.input.up=false; if (kc===this.controls.down) this.input.down=false; }

    tryShoot(){ if (this.shootCooldown<=0){ // shoot a weapon primarily in the facing horizontal direction
        if (this.stunned) return; // cannot shoot while stunned
        let ang = this.facing === -1 ? 180 : 0;
      // small random spread
      ang += random(-10,10);
      game.spawnWeapon(this.pos.x + cos(ang)*this.radius*1.2, this.pos.y + sin(ang)*this.radius*1.2, ang, this.id);
      this.shootCooldown = 18; }
    }

    shootDown(){
      if (this.stunned) return;
      if (this.shootCooldown>0) return;
      let ang = 90; // downwards
      ang += random(-6,6);
      game.spawnWeapon(this.pos.x + cos(ang)*this.radius*1.2, this.pos.y + sin(ang)*this.radius*1.2, ang, this.id);
      this.shootCooldown = 18;
    }

  stun(frames){ this.stunTimer = max(this.stunTimer, frames); this.stunned = true; }

  update(game){
    // cooldown
    if (this.shootCooldown>0) this.shootCooldown--;
    // handle stun timer
    if (this.stunTimer > 0) { this.stunTimer--; this.stunned = true; } else { this.stunned = false; }
    // controls produce force; dwarfs dig by pushing against cave nodes
    let thrust = createVector(0,0);
    if (!this.stunned) {
      if (this.input.left) { thrust.x -= 0.9; this.facing = -1; }
      if (this.input.right) { thrust.x += 0.9; this.facing = 1; }
      if (this.input.up) thrust.y -= 1.1;
      if (this.input.down) thrust.y += 0.45;
    } else {
      // while stunned slow down gradually
      this.vel.mult(0.92);
    }

    // gravity
    thrust.y += game.gravity * this.mass;
    // apply
    this.vel.add(p5.Vector.div(thrust, this.mass));
    // simple air damping
    this.vel.mult(0.985);
    this.pos.add(this.vel);

    // keep within canvas
    if (this.pos.x < 12) { this.pos.x = 12; this.vel.x *= -0.3; }
    if (this.pos.x > width-12) { this.pos.x = width-12; this.vel.x *= -0.3; }
    if (this.pos.y < 12) { this.pos.y = 12; this.vel.y *= -0.3; }
    if (this.pos.y > height-12) { this.pos.y = height-12; this.vel.y *= -0.35; }

    // interaction with cave nodes: push and dig
    // look for nearby nodes
    let nearby = game.cave.nodesInRange(this.pos.x, this.pos.y, this.radius + game.cave.nodeRadius*1.2);
    for (let n of nearby){
      let toNode = p5.Vector.sub(n.pos, this.pos);
      let d = toNode.mag();
      if (d <= 0.001) continue;
      let overlap = (this.radius + n.r) - d;
      if (overlap > 0){
        // normal
        let normal = toNode.copy().normalize();
        // push dwarf out of node slightly
        let push = normal.copy().mult(-overlap * 0.5);
        this.pos.add(push);
        // reflect a bit of velocity
        let vn = this.vel.dot(normal);
        if (vn > 0) this.vel.sub(p5.Vector.mult(normal, vn * (0.8 + random()*0.2)));

        // determine if player is actively pushing into the wall (dig)
        // only dig when the player provides input — prevents digging by simply sitting still
        let inputVec = createVector(0,0);
        if (this.input.left) inputVec.x -= 1;
        if (this.input.right) inputVec.x += 1;
        if (this.input.up) inputVec.y -= 1;
        if (this.input.down) inputVec.y += 1;
        let inputMag = inputVec.mag();
        if (inputMag > 0.12) { // require active input (allows sideways and diagonal-down digging)
          let inputNorm = inputVec.copy().normalize();
          let pushDot = -inputNorm.dot(normal || createVector(0,0));
          // require a meaningful component of the input pushing into the node
          if (pushDot > 0.12) {
            let pressure = constrain(pushDot * 1.8, 0, 1.8);
            // increase digging speed
            let digAmount = 1.6 * pressure;
            game.cave.dig(n, digAmount);
            // spawn particles when digging
            for (let k=0;k<2;k++) game.particles.push(new ParticleEffect(this.pos.x + random(-6,6), this.pos.y + random(-6,6), color(255,230,200), random(6,12)));
          }
        }
      }
    }

  }

  draw(cave){
    // shadow
    push(); fill(0,0,0,80); ellipse(this.pos.x+6, this.pos.y+8, this.radius*1.6, this.radius*0.7); pop();
    // body
    push(); translate(this.pos.x, this.pos.y);
    fill(this.color.levels[0], this.color.levels[1], this.color.levels[2]); ellipse(0,0,this.radius*2.2,this.radius*2.2);
    // helmet/hat
    fill(60); arc(0,-4,this.radius*1.5,this.radius*1.2,180,0,CHORD);
    // face
    fill(220); ellipse(-4,-2,6,6); ellipse(6,-2,6,6);
    // simple pick indicator when pressing dig (down)
    if (this.input.down) { stroke(255,200,100); strokeWeight(3); line(0,6,0,12); noStroke(); }
    pop();

    // stunned cartoon birds above head
    if (this.stunned) {
      for (let i = 0; i < this.birdCount; i++) {
        let t = frameCount * 6 + this.birdPhase * (i+1) * 10;
        let bx = this.pos.x + cos(t + i*90) * (this.radius * 0.9);
        let by = this.pos.y - this.radius * 1.8 + sin(t * 0.9 + i) * 8;
        push(); translate(bx, by); rotate(sin(t*0.05 + i) * 0.4);
        noFill(); stroke(255,220,120); strokeWeight(2);
        // small curved line representing a cartoon bird
        arc(0, 0, 14, 10, 200, 340);
        pop();
      }
    }
  }

  canCollect(gem, cave){
    // gem can be collected if dwarf is close and the cave nodes covering gem are small/removed
    if (dist(this.pos.x,this.pos.y,gem.x,gem.y) > this.radius + gem.r*0.9) return false;
    // if any node still covers gem strongly, prevent collection
    let blocking = false;
    for (let n of cave.nodesInRange(gem.x, gem.y, 8)){
      if (n.r > 6) { blocking = true; break; }
    }
    return !blocking;
  }
}

// ------------------ Weapon (bouncy) ------------------
class Weapon {
  constructor(x,y,angle,ownerId){ this.pos = createVector(x,y); this.vel = p5.Vector.fromAngle(radians(angle)).mult(8); this.r = 8; this.owner = ownerId; this.bounces = 6; this.life = 420; this.isDead=false; }
  update(game){
    this.vel.y += game.gravity * 0.6; // weapon affected by gravity
    this.pos.add(this.vel);
    this.life--; if (this.life<=0) this.isDead=true;

    // collide with cave nodes: reflect velocity and reduce node (damage scales with impact speed)
    let nodes = game.cave.nodesInRange(this.pos.x, this.pos.y, this.r + game.cave.nodeRadius*1.2);
    for (let n of nodes){
      let toNode = p5.Vector.sub(this.pos, n.pos);
      let d = toNode.mag();
      if (d <= 0.001) continue;
      let overlap = (this.r + n.r) - d;
      if (overlap > 0){
        let normal = toNode.copy().normalize();
        // reflect velocity
        let vn = this.vel.dot(normal);
        if (vn < 0) { // only reflect if moving into node
          this.vel.sub(p5.Vector.mult(normal, 1.9 * vn));
          this.vel.mult(0.94);
          this.bounces--; if (this.bounces<=0) this.isDead=true;
        }
        // stronger carve: scale with impact speed
        let speedFactor = constrain(this.vel.mag() / 8, 0.5, 3.0);
        let damage = 1.6 * speedFactor; // base increased damage
        game.cave.dig(n, damage);
        // also damage nearby nodes lightly for splash carving
        let neighbors = game.cave.nodesInRange(n.pos.x, n.pos.y, n.r + 18);
        for (let nn of neighbors){ if (nn !== n) game.cave.dig(nn, damage * 0.35); }
        // enhanced spark
        game.particles.push(new ParticleEffect(this.pos.x + random(-6,6), this.pos.y + random(-6,6), color(255,200,100), random(6,12)));
      }
    }

    // collide with dwarfs (other than owner): simple hit and bounce
    for (let d of game.dwarfs){
      if (d.id === this.owner) continue;
      let dd = dist(this.pos.x,this.pos.y,d.pos.x,d.pos.y);
      if (dd < this.r + d.radius*0.8){ // hit
        // knock dwarf slightly
        let impulse = p5.Vector.sub(d.pos, this.pos).normalize().mult(3);
        d.vel.add(impulse);
        // stun the hit dwarf for longer and show particles
        d.stun(360); // frames (4x longer)
        this.isDead = true;
        game.particles.push(new ParticleEffect(this.pos.x, this.pos.y, color(255,80,60), 18));
        break;
      }
    }
  }
  draw(){ push(); translate(this.pos.x,this.pos.y); fill(255,220,100); ellipse(0,0,this.r*2,this.r*2); fill(220,180,60); ellipse(-3,-3,this.r*1.1,this.r*1.1); pop(); }
}

// ------------------ Gem ------------------
class Gem {
  constructor(x,y){ this.x=x; this.y=y; this.r=random(8,14); this.h = random(320); }
  draw(cave){ // glow more if exposed
    // exposure = inverse of nearby node coverage
    let nearby = cave.nodesInRange(this.x,this.y, 18);
    let cover = 0; for (let n of nearby) cover += map(n.r,0, n.maxR, 1, 0); cover = constrain(cover, 0, 1);
    let alpha = map(cover,0,1,255,40);
    push(); translate(this.x,this.y); colorMode(HSL); fill(this.h,80,60,alpha); ellipse(0,0,this.r*2,this.r*2); pop(); colorMode(RGB);
  }
}

// ------------------ Simple particle effect ------------------
class ParticleEffect {
  constructor(x,y,col,size){ this.pos = createVector(x,y); this.vel = p5.Vector.random2D().mult(random(0.5,2)); this.life = 30 + random(20); this.col = col; this.size = size; }
  update(){ this.pos.add(this.vel); this.vel.mult(0.94); this.vel.y += 0.08; this.life--; }
  draw(){ push(); fill(red(this.col), green(this.col), blue(this.col), map(this.life,0,60,0,220)); ellipse(this.pos.x, this.pos.y, this.size, this.size); pop(); }
}

