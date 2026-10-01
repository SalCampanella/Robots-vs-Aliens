const canvas = document.getElementById("canvas1");
const ctx = canvas.getContext("2d");
canvas.width = 900;
canvas.height = 600;

// global variables
let gameState = "start";
const cellSize = 100;
const cellGap = 3;
const prepDurationMs = 10000; // 10 seconds
let waveStartTime = 0;
let numberOfScraps = 150;
let spawnIntervalMs = 10000;
const minSpawnIntervalMs = 2000;
let lastSpawnTime = 0;
let frame = 0;
let gameOver = false;
let chosenDefender = 1;
let wave = 1;

let unlocked = [true, false, false, false];
const gameGrid = [];
const defenders = [];
const enemies = [];
const enemyPositions = [];
const projectiles = [];
const scraps = [];

// mouse
const mouse = {
  x: 10,
  y: 10,
  width: 0.1,
  height: 0.1,
  clicked: false,
};
canvas.addEventListener("mousedown", function () {
  mouse.clicked = true;
});
canvas.addEventListener("mouseup", function () {
  mouse.clicked = false;
});

let canvasPosition = canvas.getBoundingClientRect();
canvas.addEventListener("mousemove", function (e) {
  mouse.x = e.x - canvasPosition.left;
  mouse.y = e.y - canvasPosition.top;
});
canvas.addEventListener("mouseleave,", function () {
  mouse.x = undefined;
  mouse.y = undefined;
});

// game board
const controlsBar = {
  width: canvas.width,
  height: cellSize,
};
class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = cellSize;
    this.height = cellSize;
  }
  draw() {
    if (mouse.x && mouse.y && collision(this, mouse)) {
      ctx.strokeStyle = "black";
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }
}
function createGrid() {
  for (let y = cellSize; y < canvas.height; y += cellSize) {
    for (let x = 0; x < canvas.width; x += cellSize) {
      gameGrid.push(new Cell(x, y));
    }
  }
}
createGrid();
function handleGameGrid() {
  for (let i = 0; i < gameGrid.length; i++) {
    gameGrid[i].draw();
  }
}

const startButton = { x: 350, y: 320, width: 200, height: 60 };
const infoButton = { x: 350, y: 400, width: 200, height: 60 };
const backButton = { x: 350, y: 520, width: 200, height: 50 };
function drawMenuButton(btn, label) {
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgb(230,230,230)";
  ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
  ctx.strokeStyle = "black";
  ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
  ctx.fillStyle = "black";
  ctx.font = "28px Orbitron";
  ctx.textAlign = "center";
  ctx.fillText(label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 10);
  ctx.textAlign = "left"; // reset — everything else in the file assumes left alignment
}

function drawStartScreen() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.font = "60px Orbitron";
  ctx.textAlign = "center";
  ctx.fillText("Robots vs. Aliens", canvas.width / 2, 200);
  ctx.textAlign = "left";

  drawMenuButton(startButton, "Start Game");
  drawMenuButton(infoButton, "Info");
}

function drawInfoScreen() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.font = "40px Orbitron";
  ctx.textAlign = "center";
  ctx.fillText("Defenders", canvas.width / 2, 60);
  ctx.textAlign = "left";

  let y = 100;
  defenderTypes.forEach((type) => {
    ctx.drawImage(
      type.image,
      0,
      0,
      type.spriteWidth,
      type.spriteWidth,
      60,
      y,
      70,
      70,
    );
    ctx.fillStyle = "black";
    ctx.font = "24px Orbitron";
    ctx.fillText(type.name + " - " + type.cost + " scrap", 150, y + 25);
    ctx.font = "18px sans-serif";
    ctx.fillText(type.description, 150, y + 50);
    y += 100;
  });

  drawMenuButton(backButton, "Back");
}

// projectiles
class Projectile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    this.power = 20;
    this.speed = 5;

    this.spriteWidth = 132;
    this.spriteHeight = 132;
    this.flyFrames = [4, 6];
    this.impactFrames = [0, 3];
    this.frameX = this.flyFrames[0];
    this.state = "flying";
  }
  update() {
    if (this.state === "flying") {
      this.x += this.speed;
      if (frame % 5 === 0) {
        if (this.frameX < this.flyFrames[1]) this.frameX++;
        else this.frameX = this.flyFrames[0];
      }
    } else {
      if (frame % 5 === 0 && this.frameX < this.impactFrames[1]) {
        this.frameX++;
      }
    }
  }
  triggerImpact() {
    this.state = "impact";
    this.frameX = this.impactFrames[0];
  }
  isImpactDone() {
    return this.state === "impact" && this.frameX >= this.impactFrames[1];
  }
  draw() {
    ctx.drawImage(
      defenderBullet,
      this.frameX * this.spriteWidth,
      0,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y,
      this.width,
      this.height,
    );
  }
}

function handleProjectiles() {
  for (let i = 0; i < projectiles.length; i++) {
    let p = projectiles[i];
    p.update();
    p.draw();

    if (p.state === "flying") {
      for (let j = 0; j < enemies.length; j++) {
        if (enemies[j] && collision(p, enemies[j])) {
          enemies[j].health -= p.power;
          p.triggerImpact();
          break;
        }
      }
      if (p.state === "flying" && boss && collision(p, boss)) {
        boss.health -= p.power;
        p.triggerImpact();
        if (boss.health <= 0) {
          bossDefeated = true;
          let idx = enemyPositions.indexOf(boss.y);
          if (idx !== -1) enemyPositions.splice(idx, 1);
          boss = null;
        }
      }
      if (p.state === "flying" && p.x > canvas.width) {
        projectiles.splice(i, 1);
        i--;
      }
    } else if (p.isImpactDone()) {
      projectiles.splice(i, 1);
      i--;
    }
  }
}

// defenders
const defenderTypes = [
  {
    id: 1,
    image: null,
    src: "Sprites/defender1.png",
    cost: 100,
    idleFrames: [17, 24],
    shootingFrames: [0, 16],
    role: "attacker",
    name: "Attacker",
    description: "Fires projectiles at aliens in its row.",
    shootRange: 500,
    spriteWidth: 194,
    spriteHeight: 194,
  },
  {
    id: 2,
    image: null,
    src: "Sprites/defender2.png",
    cost: 50,
    idleFrames: [0, 12],
    shootingFrames: [13, 24],
    role: "economy",
    name: "Scavenger",
    description:
      "Does not attack. Periodically drops scrap for extra resources.",
    spriteWidth: 194,
    spriteHeight: 194,
  },
  {
    id: 3,
    image: null,
    src: "Sprites/blocker.png",
    cost: 50,
    idleFrames: [0, 4],
    shootingFrames: [0, 4],
    role: "blocker",
    name: "Wall",
    description:
      "High health, does not attack. Blocks aliens from advancing further.",
    health: 200,
    spriteWidth: 260,
    spriteHeight: 260,
  },
];

defenderTypes.forEach((type) => {
  const img = new Image();
  img.src = type.src;
  type.image = img;
});

const defenderBullet = new Image();
defenderBullet.src = "Sprites/defender_bullet.png";

class Defender {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = cellSize - cellGap * 2;
    this.height = cellSize - cellGap * 2;
    this.shooting = false;
    this.shootNow = false;
    this.frameX = 0;
    this.frameY = 0;

    this.typeConfig = defenderTypes.find((t) => t.id === chosenDefender);
    this.health = this.typeConfig.health || 100;
    this.spriteWidth = this.typeConfig.spriteWidth;
    this.spriteHeight = this.typeConfig.spriteHeight;
    this.minFrame = this.typeConfig.idleFrames[0];
    this.maxFrame = this.typeConfig.idleFrames[1];

    this.state = "idle";
    this.scrapTimer = 0;
    this.scrapInterval = 600; // frames between scrap drops
    this.releaseFrame = 20; // the frame within shootingFrames where the scrap actually appears
    this.hasDroppedThisCycle = false;
  }
  draw() {
    ctx.fillStyle = "black";
    ctx.font = "30px Orbitron";
    ctx.fillText(Math.floor(this.health), this.x + 15, this.y + 30);
    ctx.drawImage(
      this.typeConfig.image,
      this.frameX * this.spriteWidth,
      0,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y,
      this.width,
      this.height,
    );
  }
  update() {
    if (this.typeConfig.role === "economy") {
      if (waveComplete()) return;
      if (this.state === "idle") {
        this.scrapTimer++;
        if (frame % 10 === 0) {
          if (this.frameX < this.typeConfig.idleFrames[1]) this.frameX++;
          else this.frameX = this.typeConfig.idleFrames[0];
        }
        if (this.scrapTimer >= this.scrapInterval) {
          this.state = "acting";
          this.frameX = this.typeConfig.shootingFrames[0];
          this.hasDroppedThisCycle = false;
        }
      } else {
        if (frame % 10 === 0) {
          if (this.frameX < this.typeConfig.shootingFrames[1]) {
            this.frameX++;
          } else {
            this.state = "idle";
            this.frameX = this.typeConfig.idleFrames[0];
            this.scrapTimer = 0;
          }

          if (this.frameX === this.releaseFrame && !this.hasDroppedThisCycle) {
            scraps.push(new Scraps(this.x, this.y));
            this.hasDroppedThisCycle = true;
          }
        }
      }
      return;
    }

    if (frame % 10 === 0) {
      if (this.frameX < this.maxFrame) this.frameX++;
      else this.frameX = this.minFrame;
      if (this.frameX === 15) this.shootNow = true;
    }

    const frames = this.shooting
      ? this.typeConfig.shootingFrames
      : this.typeConfig.idleFrames;
    this.minFrame = frames[0];
    this.maxFrame = frames[1];

    if (this.shooting && this.shootNow && this.typeConfig.role === "attacker") {
      projectiles.push(new Projectile(this.x + 70, this.y + 35));
      this.shootNow = false;
    }
  }
}

function handleDefenders() {
  for (let i = 0; i < defenders.length; i++) {
    defenders[i].draw();
    defenders[i].update();

    const range = defenders[i].typeConfig.shootRange ?? Infinity; // blocker/economy don't care, so no limit
    let inRange = enemies.some(
      (e) =>
        e.y === defenders[i].y &&
        e.x - defenders[i].x >= 0 &&
        e.x - defenders[i].x <= range,
    );
    if (
      !inRange &&
      boss &&
      boss.y === defenders[i].y &&
      boss.x - defenders[i].x >= 0 &&
      boss.x - defenders[i].x <= range
    ) {
      inRange = true;
    }
    defenders[i].shooting = inRange;

    for (let j = 0; j < enemies.length; j++) {
      if (defenders[i] && collision(defenders[i], enemies[j])) {
        enemies[j].movement = 0;
        let now = performance.now();
        if (
          now - enemies[j].lastMeleeAttackTime >=
          enemies[j].meleeIntervalMs
        ) {
          defenders[i].health -= enemies[j].meleeDamage;
          enemies[j].lastMeleeAttackTime = now;
        }
      }
      if (defenders[i] && defenders[i].health <= 0) {
        defenders.splice(i, 1);
        i--;
        enemies[j].movement = enemies[j].speed;
      }
    }
  }
}

const card1 = {
  x: 10,
  y: 10,
  width: 70,
  height: 85,
};
const card2 = {
  x: 90,
  y: 10,
  width: 70,
  height: 85,
};
const card3 = {
  x: 170,
  y: 10,
  width: 70,
  height: 85,
};

function chooseDefender() {
  let card1stroke = "black",
    card2stroke = "black",
    card3stroke = "black";

  if (collision(mouse, card1) && mouse.clicked) {
    chosenDefender = 1;
  } else if (collision(mouse, card2) && mouse.clicked) {
    chosenDefender = 2;
  } else if (collision(mouse, card3) && mouse.clicked) {
    chosenDefender = 3;
  }

  if (chosenDefender === 1) card1stroke = "gold";
  else if (chosenDefender === 2) card2stroke = "gold";
  else if (chosenDefender === 3) card3stroke = "gold";

  const type1 = defenderTypes.find((t) => t.id === 1);
  const type2 = defenderTypes.find((t) => t.id === 2);
  const type3 = defenderTypes.find((t) => t.id === 3);

  ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(card1.x, card1.y, card1.width, card1.height);
  ctx.strokeStyle = card1stroke;
  ctx.strokeRect(card1.x, card1.y, card1.width, card1.height);
  ctx.drawImage(type1.image, 0, 0, 194, 194, 0, 5, 194 / 2, 194 / 2);
  ctx.fillStyle = "gold";
  ctx.font = "20px sans-serif";
  let cost1Text = String(type1.cost);
  let cost1Width = ctx.measureText(cost1Text).width;
  ctx.fillText(
    cost1Text,
    card1.x + (card1.width - cost1Width) / 2,
    card1.y + card1.height - 5,
  );

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(card2.x, card2.y, card2.width, card2.height);
  ctx.strokeStyle = card2stroke;
  ctx.strokeRect(card2.x, card2.y, card2.width, card2.height);
  ctx.drawImage(type2.image, 0, 0, 194, 194, 80, 5, 194 / 2, 194 / 2);
  ctx.fillStyle = "gold";
  ctx.font = "20px sans-serif";
  let cost2Text = String(type2.cost);
  let cost2Width = ctx.measureText(cost2Text).width;
  ctx.fillText(
    cost2Text,
    card2.x + (card2.width - cost2Width) / 2,
    card2.y + card2.height - 5,
  );

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(card3.x, card3.y, card3.width, card3.height);
  ctx.strokeStyle = card3stroke;
  ctx.strokeRect(card3.x, card3.y, card3.width, card3.height);
  ctx.drawImage(type3.image, 0, 0, 290, 290, 162, 10, 194 / 2, 194 / 2);
  ctx.fillStyle = "gold";
  ctx.font = "20px sans-serif";
  let cost3Text = String(type3.cost);
  let cost3Width = ctx.measureText(cost3Text).width;
  ctx.fillText(
    cost3Text,
    card3.x + (card3.width - cost3Width) / 2,
    card3.y + card3.height - 5,
  );
}

const wave1 = { x: 600, y: 25, width: 40, height: 40 };
const wave2 = { x: 650, y: 25, width: 40, height: 40 };
const wave3 = { x: 700, y: 25, width: 40, height: 40 };
const waveB = { x: 750, y: 25, width: 40, height: 40 };

function choosewave() {
  // wave 1
  let wave1stroke = "black";
  ctx.lineWidth = 1;
  ctx.fillStyle = "rgb(255, 255, 255)";
  ctx.strokeStyle = wave1stroke;
  ctx.fillRect(wave1.x, wave1.y, wave1.width, wave1.height);
  ctx.strokeRect(wave1.x, wave1.y, wave1.width, wave1.height);
  ctx.fillStyle = "black";
  ctx.font = "30px sans-serif";
  ctx.fillText("1", 612, 55);
  // wave 2
  let wave2stroke = "black";
  ctx.lineWidth = 1;
  if (!unlocked[1]) {
    ctx.fillStyle = "rgb(200, 200, 200)";
  } else {
    ctx.fillStyle = "rgb(255, 255, 255)";
  }
  ctx.strokeStyle = wave2stroke;
  ctx.fillRect(wave2.x, wave2.y, wave2.width, wave2.height);
  ctx.strokeRect(wave2.x, wave2.y, wave2.width, wave2.height);
  ctx.fillStyle = "black";
  ctx.font = "30px sans-serif";
  ctx.fillText("2", 662, 55);
  // wave 3
  let wave3stroke = "black";
  ctx.lineWidth = 1;
  if (!unlocked[2]) {
    ctx.fillStyle = "rgb(200, 200, 200)";
  } else {
    ctx.fillStyle = "rgb(255, 255, 255)";
  }
  ctx.strokeStyle = wave3stroke;
  ctx.fillRect(wave3.x, wave3.y, wave3.width, wave3.height);
  ctx.strokeRect(wave3.x, wave3.y, wave3.width, wave3.height);
  ctx.fillStyle = "black";
  ctx.font = "30px sans-serif";
  ctx.fillText("3", 712, 55);
  //wave B
  let waveBstroke = "black";
  ctx.lineWidth = 1;
  if (!unlocked[3]) {
    ctx.fillStyle = "rgb(200, 200, 200)";
  } else {
    ctx.fillStyle = "rgb(255, 255, 255)";
  }
  ctx.strokeStyle = waveBstroke;
  ctx.fillRect(waveB.x, waveB.y, waveB.width, waveB.height);
  ctx.strokeRect(waveB.x, waveB.y, waveB.width, waveB.height);
  ctx.fillStyle = "black";
  ctx.font = "30px sans-serif";
  ctx.fillText("B", 760, 55);
}

// Floating Messages
const floatingMessages = [];
class floatingMessage {
  constructor(value, x, y, size, color) {
    this.value = value;
    this.x = x;
    this.y = y;
    this.size = size;
    this.lifeSpan = 0;
    this.color = color;
    this.opacity = 1;
  }
  update() {
    this.y -= 0.3;
    this.lifeSpan += 1;
    if (this.opacity > 0.03) this.opacity -= 0.03;
  }
  draw() {
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.font = this.size + "px Orbitron";
    ctx.fillText(this.value, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}
function handleFloatingMessages() {
  for (let i = 0; i < floatingMessages.length; i++) {
    floatingMessages[i].update();
    floatingMessages[i].draw();
    if (floatingMessages[i].lifeSpan >= 50) {
      floatingMessages.splice(i, 1);
      i--;
    }
  }
}

// enemies
const enemyTypes = [
  {
    image: null,
    src: "Sprites/enemy1.png",
    speedRange: [0.6, 0.7],
    health: 60,
    isRanged: false,
    meleeDamage: 10,
    meleeIntervalMs: 700,
    walkFrames: [0, 4],
    spriteWidth: 256,
    spriteHeight: 256,
  },
  {
    image: null,
    src: "Sprites/enemy2.png",
    speedRange: [0.2, 0.3],
    health: 160,
    isRanged: false,
    meleeDamage: 20,
    meleeIntervalMs: 1000,
    walkFrames: [0, 8],
    spriteWidth: 256,
    spriteHeight: 256,
  },
  {
    image: null,
    src: "Sprites/enemy3.png",
    speedRange: [0.3, 0.4],
    health: 100,
    isRanged: true,
    attackRange: 250,
    attackDamage: 10,
    walkFrames: [7, 10],
    shootFrames: [0, 6],
    releaseFrame: 2,
    shootTickRate: 16,
    spriteWidth: 292,
    spriteHeight: 292,
    bulletSrc: "Sprites/enemy3_bullet.png",
    bulletImage: null,
    bulletFlyFrames: [4, 7],
    bulletImpactFrames: [0, 3],
    bulletSpriteWidth: 132,
    bulletSpriteHeight: 132,
  },
  {
    image: null,
    src: "Sprites/enemy4.png",
    speedRange: [0.25, 0.35],
    health: 120,
    isRanged: true,
    attackRange: 400,
    attackDamage: 25,
    walkFrames: [9, 13],
    shootFrames: [0, 8],
    releaseFrame: 1,
    shootTickRate: 26,
    spriteWidth: 516,
    spriteHeight: 516,
    bulletSrc: "Sprites/enemy4_bullet.png",
    bulletImage: null,
    bulletFlyFrames: [0, 3],
    bulletImpactFrames: [4, 8],
    bulletSpriteWidth: 260,
    bulletSpriteHeight: 260,
  },
];

enemyTypes.forEach((type) => {
  const img = new Image();
  img.src = type.src;
  type.image = img;

  if (type.bulletSrc) {
    const bulletImg = new Image();
    bulletImg.src = type.bulletSrc;
    type.bulletImage = bulletImg;
  }
});

class Enemy {
  constructor(verticalPosition) {
    this.x = canvas.width;
    this.y = verticalPosition;
    this.width = cellSize - cellGap * 2;
    this.height = cellSize - cellGap * 2;

    this.typeConfig = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    this.enemyType = this.typeConfig.image;

    const [minSpeed, maxSpeed] = this.typeConfig.speedRange;
    this.speed = Math.random() * (maxSpeed - minSpeed) + minSpeed;
    this.movement = this.speed;

    this.health = this.typeConfig.health;
    this.maxHealth = this.health;

    this.isRanged = this.typeConfig.isRanged;
    this.attackRange = this.typeConfig.attackRange || 0;
    this.attackDamage = this.typeConfig.attackDamage || 0;
    this.hasFiredThisCycle = false;

    this.meleeDamage = this.typeConfig.meleeDamage || 0;
    this.meleeIntervalMs = this.typeConfig.meleeIntervalMs || 500;
    this.lastMeleeAttackTime = 0;

    this.state = "walking";
    this.frameX = this.typeConfig.walkFrames[0];
    this.spriteWidth = this.typeConfig.spriteWidth;
    this.spriteHeight = this.typeConfig.spriteHeight;
  }
  update() {
    if (this.isRanged) {
      let targetInRange = defenders.some(
        (d) =>
          d.y === this.y &&
          this.x - d.x > 0 &&
          this.x - d.x <= this.attackRange,
      );
      if (targetInRange) {
        if (this.state !== "shooting") {
          this.state = "shooting";
          this.frameX = this.typeConfig.shootFrames[0];
          this.hasFiredThisCycle = false;
        }
        this.movement = 0;
      } else {
        if (this.state !== "walking") {
          this.state = "walking";
          this.frameX = this.typeConfig.walkFrames[0];
        }
        this.movement = this.speed;
      }
    }

    this.x -= this.movement;

    const frames =
      this.isRanged && this.state === "shooting"
        ? this.typeConfig.shootFrames
        : this.typeConfig.walkFrames;
    const tickRate =
      this.isRanged && this.state === "shooting"
        ? this.typeConfig.shootTickRate
        : 10;

    if (frame % tickRate === 0) {
      if (this.frameX < frames[1]) {
        this.frameX++;
      } else {
        this.frameX = frames[0];
        this.hasFiredThisCycle = false;
      }

      if (
        this.isRanged &&
        this.state === "shooting" &&
        this.frameX === this.typeConfig.releaseFrame &&
        !this.hasFiredThisCycle
      ) {
        enemyProjectiles.push(
          new EnemyProjectile(
            this.x,
            this.y + this.height / 2,
            this.attackDamage,
            this.typeConfig,
          ),
        );
        this.hasFiredThisCycle = true;
      }
    }
  }
  draw() {
    ctx.fillStyle = "black";
    ctx.font = "30px Orbitron";
    ctx.fillText(Math.floor(this.health), this.x + 15, this.y + 30);
    ctx.drawImage(
      this.enemyType,
      this.frameX * this.spriteWidth,
      0,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y,
      this.width,
      this.height,
    );
  }
}

function handleEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    enemies[i].update();
    enemies[i].draw();
    if (enemies[i].x < 0) {
      gameOver = true;
    }
    if (enemies[i].health <= 0) {
      enemiesDefeatedThisWave += 1;
      const findThisIndex = enemyPositions.indexOf(enemies[i].y);
      enemyPositions.splice(findThisIndex, 1);
      enemies.splice(i, 1);
      i--;
    }
  }
  let now = performance.now();
  let elapsed = now - waveStartTime;
  if (
    elapsed > prepDurationMs &&
    now - lastSpawnTime >= spawnIntervalMs &&
    enemiesSpawnedThisWave < enemiesPerWave &&
    !bossDefeated
  ) {
    let verticalPosition =
      Math.floor(Math.random() * 5 + 1) * cellSize + cellGap;
    enemies.push(new Enemy(verticalPosition));
    enemyPositions.push(verticalPosition);
    enemiesSpawnedThisWave += 1;
    lastSpawnTime = now;
    if (wave === 1) {
      if (spawnIntervalMs > minSpawnIntervalMs) spawnIntervalMs -= 500;
    } else if (wave === 2) {
      if (spawnIntervalMs > minSpawnIntervalMs) spawnIntervalMs -= 650;
    } else if (wave === 3) {
      if (spawnIntervalMs > minSpawnIntervalMs) spawnIntervalMs -= 800;
    }
  }
}

const enemyProjectiles = [];
class EnemyProjectile {
  constructor(x, y, damage, typeConfig) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    this.speed = 4;
    this.damage = damage;
    this.image = typeConfig.bulletImage;
    this.flyFrames = typeConfig.bulletFlyFrames;
    this.impactFrames = typeConfig.bulletImpactFrames;
    this.spriteWidth = typeConfig.bulletSpriteWidth;
    this.spriteHeight = typeConfig.bulletSpriteHeight;
    this.frameX = this.flyFrames[0];
    this.state = "flying";
  }
  update() {
    if (this.state === "flying") {
      this.x -= this.speed;
      if (frame % 5 === 0) {
        if (this.frameX < this.flyFrames[1]) this.frameX++;
        else this.frameX = this.flyFrames[0];
      }
    } else {
      // play impact animation
      if (frame % 5 === 0 && this.frameX < this.impactFrames[1]) {
        this.frameX++;
      }
    }
  }
  triggerImpact() {
    this.state = "impact";
    this.frameX = this.impactFrames[0];
  }
  isImpactDone() {
    return this.state === "impact" && this.frameX >= this.impactFrames[1];
  }
  draw() {
    ctx.drawImage(
      this.image,
      this.frameX * this.spriteWidth,
      0,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y,
      this.width,
      this.height,
    );
  }
}

function handleEnemyProjectiles() {
  for (let i = 0; i < enemyProjectiles.length; i++) {
    let p = enemyProjectiles[i];
    p.update();
    p.draw();

    if (p.state === "flying") {
      for (let j = 0; j < defenders.length; j++) {
        if (defenders[j] && collision(p, defenders[j])) {
          defenders[j].health -= p.damage;
          p.triggerImpact();
          break;
        }
      }
      if (p.state === "flying" && p.x < 0) {
        enemyProjectiles.splice(i, 1);
        i--;
      }
    } else if (p.isImpactDone()) {
      enemyProjectiles.splice(i, 1);
      i--;
    }
  }
}

//Boss
const bossFlying = new Image();
bossFlying.src = "Sprites/boss_flying.png";
const bossAttack = new Image();
bossAttack.src = "Sprites/boss_attack.png";
const bossBulletImg = new Image();
bossBulletImg.src = "Sprites/boss_bullet.png";

const ROWS = [1, 2, 3, 4, 5].map((n) => n * cellSize + cellGap);

let boss = null;
let bossDefeated = false;

class Boss {
  constructor() {
    this.x = canvas.width + 80;
    this.xStop = 550; // how far in it flies before stoping
    this.y = ROWS[Math.floor(Math.random() * ROWS.length)];
    this.targetY = this.y;

    this.width = cellSize - cellGap * 2; // hitbox
    this.height = cellSize - cellGap * 2;
    this.drawWidth = 230; // visual size
    this.drawHeight = 150;

    this.health = 500;
    this.maxHealth = 500;
    this.attackDamage = 100;

    this.flySpeed = 2;
    this.rowMoveSpeed = 2;

    this.state = "entering"; // 'entering' | 'flying' | 'attacking'
    this.frameX = 0;
    this.hasFiredThisCycle = false;
    this.tickRate = 24;

    this.flyFrames = [0, 11];
    this.attackFrames = [0, 12];
    this.releaseFrame = 5;

    this.flySpriteWidth = 1156;
    this.flySpriteHeight = 900;
    this.attackSpriteWidth = 1156;
    this.attackSpriteHeight = 900;
  }
  getSafeX() {
    const offsetX = (this.drawWidth - this.width) / 2; // how far the sprite sticks out left of the hitbox
    const margin = 100; // gap between the boss's left edge and the nearest defender
    let rightmost = 0;
    for (const d of defenders) {
      rightmost = Math.max(rightmost, d.x + d.width);
    }
    const desired = rightmost + margin + offsetX;
    const maxX = canvas.width - (this.width + offsetX); // don't let the sprite poke out the right edge
    return Math.min(Math.max(this.xStop, desired), maxX);
  }

  rowsWithDefenders() {
    return ROWS.filter((r) => defenders.some((d) => d.y === r));
  }

  rowHasTarget() {
    return defenders.some((d) => d.y === this.y);
  }

  // returns false if there are no defenders anywhere to go to
  pickNewRow() {
    const occupied = this.rowsWithDefenders();
    const others = occupied.filter((r) => r !== this.y);
    if (others.length > 0) {
      this.targetY = others[Math.floor(Math.random() * others.length)];
      return true;
    }
    if (occupied.includes(this.y)) {
      this.targetY = this.y; // only this row has defenders so stay and keep attacking
      return true;
    }
    return false;
  }

  update() {
    let elapsed = performance.now() - waveStartTime;
    if (elapsed < prepDurationMs) {
      // idle flap in place during prep
      if (frame % this.tickRate === 0) {
        if (this.frameX < this.flyFrames[1]) this.frameX++;
        else this.frameX = this.flyFrames[0];
      }
      return;
    }

    const safeX = this.getSafeX();

    if (this.state === "entering") {
      this.x -= this.flySpeed;
      if (this.x <= safeX) {
        this.state = "waiting"; // the waiting logic below picks the first row
      }
    } else {
      // keep a safe distance from defenders
      if (this.x < safeX) this.x = Math.min(this.x + this.flySpeed, safeX);
      else if (this.x > safeX) this.x = Math.max(this.x - this.flySpeed, safeX);

      if (this.state === "waiting") {
        // hover until there is a defender to attack
        if (this.pickNewRow()) this.state = "flying";
      }

      if (this.state === "flying") {
        if (this.y < this.targetY) {
          this.y = Math.min(this.y + this.rowMoveSpeed, this.targetY);
        } else if (this.y > this.targetY) {
          this.y = Math.max(this.y - this.rowMoveSpeed, this.targetY);
        }
        if (this.y === this.targetY) {
          if (this.rowHasTarget()) {
            this.state = "attacking";
            this.frameX = this.attackFrames[0];
            this.hasFiredThisCycle = false;
            enemyPositions.push(this.y);
          } else {
            this.state = "waiting"; // the defenders left this row while it was flying
          }
        }
      }
    }

    if (frame % this.tickRate === 0) {
      if (this.state === "attacking") {
        if (this.frameX < this.attackFrames[1]) {
          this.frameX++;
        } else {
          this.frameX = this.attackFrames[0];
          this.hasFiredThisCycle = false;
        }

        if (this.frameX === this.releaseFrame && !this.hasFiredThisCycle) {
          if (this.rowHasTarget()) {
            enemyProjectiles.push(
              new EnemyProjectile(
                this.x,
                this.y + this.height / 2,
                this.attackDamage,
                {
                  bulletImage: bossBulletImg,
                  bulletFlyFrames: [6, 9],
                  bulletImpactFrames: [0, 5],
                  bulletSpriteWidth: 260,
                  bulletSpriteHeight: 260,
                },
              ),
            );
          }
          this.hasFiredThisCycle = true;

          let oldY = this.y;
          const found = this.pickNewRow();
          let idx = enemyPositions.indexOf(oldY);
          if (idx !== -1) enemyPositions.splice(idx, 1);
          this.state = found ? "flying" : "waiting";
          this.frameX = this.flyFrames[0];
        }
      } else {
        // flying and waiting both use the flap animation
        if (this.frameX < this.flyFrames[1]) this.frameX++;
        else this.frameX = this.flyFrames[0];
      }
    }
  }

  draw() {
    ctx.fillStyle = "black";
    ctx.font = "30px Orbitron";
    ctx.fillText(Math.floor(this.health), this.x + 15, this.y - 15);

    const isAttacking = this.state === "attacking";
    const img = isAttacking ? bossAttack : bossFlying;
    if (!img.naturalWidth) return; // image not loaded yet

    const frameCount = isAttacking ? 13 : 12;
    const sw = img.naturalWidth / frameCount;
    const sh = img.naturalHeight;

    const drawW = 230;
    const drawH = drawW * (sh / sw);
    const offsetX = (drawW - this.width) / 2;
    const offsetY = (drawH - this.height) / 2;

    ctx.drawImage(
      img,
      this.frameX * sw,
      0,
      sw,
      sh,
      this.x - offsetX,
      this.y - offsetY,
      drawW,
      drawH,
    );
  }
}

function handleBoss() {
  if (boss) {
    boss.update();
    boss.draw();
  }
}

// scraps
const scrap = new Image();
scrap.src = "Sprites/ScrapChest_sprite.png";
class Scraps {
  constructor(x, y) {
    this.x = x !== undefined ? x : Math.random() * (canvas.width - cellSize);
    this.y =
      y !== undefined ? y : (Math.floor(Math.random() * 5) + 1) * cellSize + 25;
    this.width = cellSize * 0.6;
    this.height = cellSize * 0.6;
    this.amount = 20;

    this.frameX = 0;
    this.frameY = 0;
    this.minFrame = 0;
    this.maxFrame = 6;
    this.spriteWidth = 260;
    this.spriteHeight = 260;
    this.collecting = false; // true once the player has hovered over it
  }
  update() {
    if (this.collecting && frame % 8 === 0) {
      if (this.frameX < this.maxFrame) this.frameX++;
    }
  }
  draw() {
    ctx.drawImage(
      scrap,
      this.frameX * this.spriteWidth,
      0,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y,
      this.width,
      this.height,
    );
  }
}

function handleScraps() {
  if (frame % 500 === 0 && !waveComplete()) {
    scraps.push(new Scraps());
  }
  for (let i = 0; i < scraps.length; i++) {
    scraps[i].update();
    scraps[i].draw();

    if (
      !scraps[i].collecting &&
      mouse.x &&
      mouse.y &&
      collision(scraps[i], mouse)
    ) {
      scraps[i].collecting = true; // start the open animation
      numberOfScraps += scraps[i].amount;
      floatingMessages.push(
        new floatingMessage("+" + scraps[i].amount, 400, 85, 30, "gold"),
      );
    }

    if (scraps[i].collecting && scraps[i].frameX >= scraps[i].maxFrame) {
      scraps.splice(i, 1); // remove only once the animation has finished playing
      i--;
    }
  }
}

const nextwave = {
  x: 375,
  y: 400,
  width: 100,
  height: 50,
};

const retryButton = {
  x: 375,
  y: 400,
  width: 100,
  height: 50,
};

// utilities
function handleGameStatus() {
  ctx.fillStyle = "gold";
  ctx.font = "30px Orbitron";
  ctx.fillText("Scrap: " + numberOfScraps, 280, 60);

  let elapsed = performance.now() - waveStartTime;
  if (elapsed < prepDurationMs && !gameOver) {
    let secondsLeft = Math.ceil((prepDurationMs - elapsed) / 1000);
    ctx.fillStyle = "black";
    ctx.font = "40px Orbitron";
    ctx.fillText("Wave starts in: " + secondsLeft, 220, 200);
  }

  if (gameOver) {
    ctx.fillStyle = "black";
    ctx.font = "90px Orbitron";
    ctx.fillText("GAME OVER", 135, 330);

    ctx.lineWidth = 1;
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.strokeStyle = "black";
    ctx.fillRect(
      retryButton.x,
      retryButton.y,
      retryButton.width,
      retryButton.height,
    );
    ctx.strokeRect(
      retryButton.x,
      retryButton.y,
      retryButton.width,
      retryButton.height,
    );
    ctx.fillStyle = "black";
    ctx.font = "20px sans-serif";
    ctx.fillText("Retry", 405, 430);
  }

  if (waveComplete()) {
    ctx.fillStyle = "black";
    ctx.font = "60px Orbitron";
    ctx.fillText("Wave COMPLETE", 130, 300);
    ctx.font = "30px Orbitron";
    ctx.fillText("All enemies defeated!", 134, 340);
    if (wave < 4) {
      unlocked[wave] = true; // finishing wave unlocks next wave

      ctx.lineWidth = 1;
      ctx.fillStyle = "rgb(255, 255, 255)";
      ctx.strokeStyle = "black";
      ctx.fillRect(nextwave.x, nextwave.y, nextwave.width, nextwave.height);
      ctx.strokeRect(nextwave.x, nextwave.y, nextwave.width, nextwave.height);
      ctx.fillStyle = "black";
      ctx.font = "20px sans-serif";
      ctx.fillText("Next Wave", 378, 430);
    } else {
      ctx.fillStyle = "black";
      ctx.font = "40px Orbitron";
      ctx.fillText("YOU WIN THE GAME!", 150, 430);
    }
  }
}
let enemiesSpawnedThisWave = 0;
let enemiesPerWave = 10;
let enemiesDefeatedThisWave = 0;

function waveComplete() {
  if (wave === 4) {
    return bossDefeated && enemies.length === 0;
  }
  return enemiesDefeatedThisWave >= enemiesPerWave && enemies.length === 0;
}

canvas.addEventListener("click", function () {
  if (gameState === "start") {
    if (collision(mouse, startButton)) {
      gameState = "playing";
      resetGame(1);
    } else if (collision(mouse, infoButton)) {
      gameState = "info";
    }
    return;
  }
  if (gameState === "info") {
    if (collision(mouse, backButton)) {
      gameState = "start";
    }
    return;
  }

  if (gameOver) {
    if (collision(mouse, retryButton)) {
      unlocked = [true, false, false, false];
      numberOfScraps = 100; //rest scrap count
      resetGame(1, false);
    }
    return;
  }

  if (waveComplete() && wave < 4 && collision(mouse, nextwave)) {
    resetGame(wave + 1, true);
    return;
  }

  // wave select buttons
  if (collision(mouse, wave1) && unlocked[0]) {
    resetGame(1);
    return;
  }
  if (collision(mouse, wave2) && unlocked[1]) {
    resetGame(2);
    return;
  }
  if (collision(mouse, wave3) && unlocked[2]) {
    resetGame(3);
    return;
  }
  if (collision(mouse, wave4) && unlocked[3]) {
    resetGame(4);
    return;
  }

  const gridPositionX = mouse.x - (mouse.x % cellSize) + cellGap;
  const gridPositionY = mouse.y - (mouse.y % cellSize) + cellGap;
  if (gridPositionY < cellSize) return;
  for (let i = 0; i < defenders.length; i++) {
    if (defenders[i].x === gridPositionX && defenders[i].y === gridPositionY)
      return;
  }
  let defenderCost = defenderTypes.find((t) => t.id === chosenDefender).cost;
  if (numberOfScraps >= defenderCost) {
    defenders.push(new Defender(gridPositionX, gridPositionY));
    numberOfScraps -= defenderCost;
  } else {
    floatingMessages.push(
      new floatingMessage("NEED MORE SCRAP", mouse.x, mouse.y, 20, "blue"),
    );
  }
});

function resetGame(newwave, keepDefenders = false) {
  wave = newwave;
  waveStartTime = performance.now();
  spawnIntervalMs = Math.max(minSpawnIntervalMs, 7000 - (wave - 1) * 2000);
  lastSpawnTime = waveStartTime - spawnIntervalMs;

  if (!keepDefenders) {
    defenders.length = 0;
  }
  enemies.length = 0;
  enemyPositions.length = 0;
  projectiles.length = 0;
  enemyProjectiles.length = 0;
  scraps.length = 0;
  floatingMessages.length = 0;
  enemiesSpawnedThisWave = 0;
  enemiesDefeatedThisWave = 0;
  enemiesPerWave = wave === 4 ? Infinity : wave * 10;
  frame = 0;
  chosenDefender = 1;

  boss = null;
  bossDefeated = false;
  if (wave === 4) {
    boss = new Boss();
  }

  const wasGameOver = gameOver;
  gameOver = false;
  if (wasGameOver) animate();
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "start") {
    drawStartScreen();
    requestAnimationFrame(animate);
    return;
  }
  if (gameState === "info") {
    drawInfoScreen();
    requestAnimationFrame(animate);
    return;
  }

  ctx.fillStyle = "blue";
  ctx.fillRect(0, 0, controlsBar.width, controlsBar.height);
  handleGameGrid();
  choosewave();
  handleDefenders();
  handleScraps();
  handleProjectiles();
  handleEnemyProjectiles();
  handleEnemies();
  handleBoss();
  chooseDefender();
  handleGameStatus();
  handleFloatingMessages();
  frame++;
  if (!gameOver) requestAnimationFrame(animate);
}
animate();

function collision(first, second) {
  if (
    !(
      first.x > second.x + second.width ||
      first.x + first.width < second.x ||
      first.y > second.y + second.height ||
      first.y + first.height < second.y
    )
  ) {
    return true;
  }
}

window.addEventListener("resize", function () {
  canvasPosition = canvas.getBoundingClientRect();
});
