// Jelly Miner - 2 Player Soft-Body Demo
// Controls: Player1 W/A/S/D, Player2 Arrow keys. R to restart.

let jellies = [];
let gems = [];
let scores = [0, 0];
const GEM_COUNT = 8;
const GRAVITY = 0.35;
const TIMESTEP = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  noStroke();

  resetGame();
}

function resetGame() {
  jellies = [];
  scores = [0, 0];
  // Create two jellies at left and right
  jellies.push(new Jelly(width * 0.25, height * 0.35, 60, color(230, 100, 180), {up:87,left:65,right:68,down:83})); // WASD
  jellies.push(new Jelly(width * 0.75, height * 0.35, 60, color(120, 200, 120), {up:38,left:37,right:39,down:40})); // arrows

  gems = [];
  for (let i = 0; i < GEM_COUNT; i++) gems.push(randomGem());
}

function randomGem() {
  return {x: random(80, width-80), y: random(120, height-140), r: random(10,16), hue: random(360)};
}

function draw() {
  background(20, 26, 40);
  // subtle gradient
  for (let y=0;y<height;y+=8){
    let t = map(y,0,height,0,1);
    fill(20 + 40*t, 26 + 30*t, 40 + 50*t);
    rect(0,y,width,8);
  }

  // Update and draw gems
  for (let g of gems) {
    push(); translate(g.x, g.y);
    colorMode(HSL);
    fill(g.hue, 80, 60);
    ellipse(0,0,g.r*2.2,g.r*2.2);
    fill(0,0,100,0.9);
    stroke(255,255,255,60);
    strokeWeight(1);
    pop();
    noStroke();
  }

  // Update physics steps (sub-steps for stability)
  let steps = 3;
  for (let s=0;s<steps;s++){
    for (let j of jellies) j.simulate();
    for (let j of jellies) j.applySprings();
  }

  // Draw jellies
  for (let i=0;i<jellies.length;i++){
    jellies[i].display();
    // check gem collection
    for (let gi = gems.length-1; gi>=0; gi--) {
      if (jellies[i].touches(gems[gi])) { scores[i]++; gems.splice(gi,1); gems.push(randomGem()); }
    }
  }

  // Draw UI
  drawUI();
}

function drawUI(){
  fill(255); textSize(20); textAlign(LEFT,TOP);
  text('Player 1: ' + scores[0], 18, 18);
  textAlign(RIGHT,TOP);
  text('Player 2: ' + scores[1], width-18, 18);
  textAlign(CENTER,TOP);
  textSize(14);
  fill(200); text('Collect gems. R to restart.', width/2, 18+4);
}

function keyPressed(){
  if (key === 'r' || key === 'R') resetGame();
  for (let j of jellies) j.keyPressed(keyCode);
}
function keyReleased(){ for (let j of jellies) j.keyReleased(keyCode); }

class Jelly {
  constructor(x,y,r,col,controls){
    this.pos = createVector(x,y);
    this.radius = r;
    this.color = col;
    this.controls = controls;
    // center particle
    this.center = {pos:createVector(x,y), vel:createVector(0,0), mass:1};
    // ring nodes
    this.nodes = [];
    this.nodeCount = 16;
    for (let i=0;i<this.nodeCount;i++){
      let a = map(i,0,this.nodeCount,0,360);
      let px = x + cos(a)*r;
      let py = y + sin(a)*r;
      this.nodes.push({pos:createVector(px,py), vel:createVector(0,0), mass:0.6});
    }
    // springs config
    this.stiffnessRadial = 0.08;
    this.stiffnessStructural = 0.12;
    this.damping = 0.92;
    this.input = {left:false,right:false,up:false,down:false};
  }

  keyPressed(kc){
    if (kc === this.controls.left) this.input.left = true;
    if (kc === this.controls.right) this.input.right = true;
    if (kc === this.controls.up) this.input.up = true;
    if (kc === this.controls.down) this.input.down = true;
  }
  keyReleased(kc){
    if (kc === this.controls.left) this.input.left = false;
    if (kc === this.controls.right) this.input.right = false;
    if (kc === this.controls.up) this.input.up = false;
    if (kc === this.controls.down) this.input.down = false;
  }

  simulate(){
    // apply gravity to all nodes and center
    for (let n of this.nodes){ n.vel.y += GRAVITY * 0.25; }
    this.center.vel.y += GRAVITY * 0.15;

    // player forces applied to center
    let f = createVector(0,0);
    if (this.input.left) f.x -= 0.6;
    if (this.input.right) f.x += 0.6;
    if (this.input.up) f.y -= 0.9;
    if (this.input.down) f.y += 0.3;
    this.center.vel.add(p5.Vector.div(f, this.center.mass));

    // integrate velocities
    this.center.pos.add(p5.Vector.mult(this.center.vel, TIMESTEP));
    this.center.vel.mult(this.damping);
    for (let n of this.nodes){ n.pos.add(p5.Vector.mult(n.vel, TIMESTEP)); n.vel.mult(this.damping); }

    // simple ground collision
    for (let n of this.nodes){ if (n.pos.y > height-24) { n.pos.y = height-24; if (n.vel.y>0) n.vel.y *= -0.3; } if (n.pos.x < 12) { n.pos.x = 12; if (n.vel.x<0) n.vel.x *= -0.3; } if (n.pos.x > width-12) { n.pos.x = width-12; if (n.vel.x>0) n.vel.x *= -0.3; } }
    if (this.center.pos.y > height-40) { this.center.pos.y = height-40; if (this.center.vel.y>0) this.center.vel.y *= -0.35; }
  }

  applySprings(){
    // radial springs: center <-> node
    for (let i=0;i<this.nodeCount;i++){
      let n = this.nodes[i];
      let desired = p5.Vector.sub(n.pos, this.center.pos).normalize().mult(this.radius);
      let target = p5.Vector.add(this.center.pos, desired);
      let diff = p5.Vector.sub(target, n.pos);
      let adjust = p5.Vector.mult(diff, this.stiffnessRadial);
      n.pos.add(adjust);
      // apply equal and opposite to center (weighted by mass)
      this.center.pos.sub(p5.Vector.mult(adjust, 0.5));
      // structural springs between adjacent nodes
      let next = this.nodes[(i+1)%this.nodeCount];
      let curDist = p5.Vector.dist(n.pos, next.pos);
      let rest = 2 * this.radius * sin(180/this.nodeCount * PI/180); // approximate arc
      let delta = p5.Vector.sub(next.pos, n.pos);
      let diffLen = (curDist - rest);
      if (curDist > 0){
        let corr = p5.Vector.mult(delta.normalize(), diffLen * this.stiffnessStructural * 0.5);
        n.pos.add(corr);
        next.pos.sub(corr);
      }
    }
  }

  display(){
    // fill shape using center and nodes
    fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], 160);
    beginShape();
    vertex(this.center.pos.x, this.center.pos.y);
    for (let n of this.nodes) vertex(n.pos.x, n.pos.y);
    endShape(CLOSE);

    // soft outline
    stroke(255,255,255,40); strokeWeight(2);
    noFill(); beginShape(); for (let n of this.nodes) vertex(n.pos.x, n.pos.y); endShape(CLOSE);
    noStroke();

    // small sparkle for center
    fill(255,255,255,200); ellipse(this.center.pos.x, this.center.pos.y, 6,6);
  }

  touches(gem){
    // check if any node or center is close to gem
    let d = dist(this.center.pos.x, this.center.pos.y, gem.x, gem.y);
    if (d < gem.r + this.radius*0.35) return true;
    for (let n of this.nodes){ if (dist(n.pos.x,n.pos.y,gem.x,gem.y) < gem.r + 6) return true; }
    return false;
  }
}

function windowResized(){ resizeCanvas(windowWidth, windowHeight); }
