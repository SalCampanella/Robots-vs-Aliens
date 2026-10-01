# Robots vs. Aliens

A tower-defence game built with vanilla JavaScript and the HTML5 Canvas API. Place robot defenders to hold off waves of alien invaders, manage your scrap economy, and survive a final boss encounter.

## Gameplay

- **4 waves**, each tougher than the last, capped off by a boss fight
- **3 defender types**, each with a distinct role:
  - **Attacker** — fires projectiles at aliens in its row
  - **Scavenger** — doesn't attack, periodically drops scrap for extra resources
  - **Wall** — high health, blocks aliens from advancing, doesn't attack
- **4 alien types** — fast/fragile, slow/tanky, and two ranged attackers with different engagement ranges
- **Boss fight** on the final wave — a flying enemy that moves between rows and attacks from a distance while regular aliens keep spawning
- Scrap economy — earn resources by collecting dropped scrap, spend it to place defenders

## How to play

1. Open `index.html` in a browser (or serve the folder locally)
2. Click a defender card at the top to select it, then click a tile on the grid to place it
3. Survive each wave, then click "Next Wave" once it's cleared
4. Defeat the boss on wave 4 to win

## Tech

- HTML5 Canvas for all rendering (no game engine/framework)
- Vanilla JavaScript — sprite sheets, frame-based animation, and a state machine per entity type
- Plain CSS for layout

## Project structure

- `index.html` — page shell
- `style.css` — layout and background
- `script.js` — all game logic
- image assets — sprite sheets for defenders, aliens, projectiles, and the boss
