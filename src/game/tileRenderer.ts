import type { Player } from '../types';

export const MAP_COLS = 20;
export const MAP_ROWS = 16;
export const TILE_SIZE = 32; // base tile size

// Tile types
export const TileType = {
  WATER_DEEP: 0,
  WATER_SHALLOW: 1,
  SAND: 2,
  GRASS: 3,
  PATH: 4,
  FLOWER_RED: 5,
  FLOWER_YELLOW: 6,
  TREE: 7,
  FENCE: 8,
  DOCK: 9,
  BUILDING_CENTER: 10,
  BUILDING_MART: 11,
  SIGNPOST: 12,
} as const;

export type TileTypeValue = typeof TileType[keyof typeof TileType];

// 20x16 Map Layout:
// Left: Ocean & Beach & Pier
// Center: Town Plaza, Paths, Pokémon Center (Red roof)
// Right: Poké Mart (Blue roof), Trees, Fences, Flower gardens
export const MAP_DATA: number[][] = [
  // Row 0 - Top border: Trees and buildings
  [0, 0, 1, 2, 3, 7, 7, 10, 10, 10, 10, 3, 11, 11, 11, 11, 7, 7, 7, 7],
  // Row 1 - Buildings facade
  [0, 0, 1, 2, 3, 7, 7, 10, 10, 10, 10, 3, 11, 11, 11, 11, 7, 7, 7, 7],
  // Row 2 - Building entrance & front paths
  [0, 0, 1, 2, 3, 3, 3, 4, 4, 4, 4, 3, 4, 4, 4, 4, 3, 7, 7, 7],
  // Row 3 - Path crossroad
  [0, 0, 1, 2, 3, 5, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 7, 7],
  // Row 4 - Plaza center
  [0, 0, 1, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 5, 7],
  // Row 5 - Plaza with signpost
  [0, 0, 1, 2, 2, 3, 4, 4, 4, 12, 4, 4, 4, 4, 4, 4, 4, 3, 6, 7],
  // Row 6 - Pier connection & Plaza south
  [0, 1, 1, 2, 2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 7],
  // Row 7 - Pier extending into water
  [9, 9, 9, 9, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 7],
  // Row 8 - Town square grass & paths
  [0, 1, 1, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 5, 3, 7],
  // Row 9 - South plaza
  [0, 0, 1, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 3, 3, 3, 6, 3, 3, 7],
  // Row 10 - Lower path
  [0, 0, 1, 2, 3, 5, 3, 3, 4, 4, 4, 4, 3, 3, 8, 8, 8, 8, 3, 7],
  // Row 11 - Garden enclosure
  [0, 0, 1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 3, 8, 5, 6, 5, 8, 3, 7],
  // Row 12 - Beach curve
  [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 3, 8, 6, 5, 6, 8, 3, 7],
  // Row 13 - South water border
  [0, 0, 0, 1, 1, 2, 2, 3, 4, 4, 4, 4, 3, 3, 8, 8, 8, 3, 3, 7],
  // Row 14 - Trees along south
  [0, 0, 0, 0, 1, 2, 2, 3, 4, 4, 4, 4, 3, 3, 3, 3, 3, 7, 7, 7],
  // Row 15 - Bottom border
  [0, 0, 0, 0, 1, 1, 2, 3, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
];

// Check if a grid tile coordinate is walkable
export function isWalkable(x: number, y: number): boolean {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return false;
  const tile = MAP_DATA[y][x];

  // Non-walkable tiles: deep water, buildings, trees, fences
  if (tile === TileType.WATER_DEEP || tile === TileType.WATER_SHALLOW) return false;
  if (tile === TileType.BUILDING_CENTER || tile === TileType.BUILDING_MART) return false;
  if (tile === TileType.TREE || tile === TileType.FENCE) return false;

  return true;
}

// -------------------------------------------------------------
// Canvas Procedural Drawing Functions (Pure 16-bit GBA aesthetic)
// -------------------------------------------------------------

// Draw animated water tile
function drawWater(ctx: CanvasRenderingContext2D, px: number, py: number, isShallow: boolean, time: number) {
  const baseColor = isShallow ? '#2b7ec9' : '#1d5a99';
  const highlightColor = isShallow ? '#65b2f7' : '#3381cc';

  ctx.fillStyle = baseColor;
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Animated wave ripples
  const waveOffset = Math.sin(time / 400 + (px + py) / 40) * 4;
  ctx.fillStyle = highlightColor;
  ctx.fillRect(px + 4 + waveOffset, py + 8, 12, 2);
  ctx.fillRect(px + 14 - waveOffset, py + 20, 10, 2);

  // Sparkle speck
  if ((px + py) % 64 === 0) {
    const sparkleAlpha = (Math.sin(time / 250 + px) + 1) / 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha * 0.8})`;
    ctx.fillRect(px + 10, py + 14, 2, 2);
  }
}

// Draw sandy beach tile
function drawSand(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#e5c986';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Subtle sand speckles
  ctx.fillStyle = '#d4b76e';
  ctx.fillRect(px + 4, py + 6, 2, 2);
  ctx.fillRect(px + 18, py + 14, 2, 2);
  ctx.fillRect(px + 10, py + 24, 2, 2);
  ctx.fillRect(px + 26, py + 22, 2, 2);
}

// Draw lush grass tile
function drawGrass(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#58b358';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Grass blade patterns
  ctx.fillStyle = '#489c48';
  ctx.fillRect(px + 6, py + 10, 2, 4);
  ctx.fillRect(px + 8, py + 8, 2, 4);
  ctx.fillRect(px + 20, py + 18, 2, 4);
  ctx.fillRect(px + 22, py + 16, 2, 4);

  // Light highlights
  ctx.fillStyle = '#6ac96a';
  ctx.fillRect(px + 6, py + 8, 2, 2);
  ctx.fillRect(px + 20, py + 16, 2, 2);
}

// Draw cobblestone / dirt path tile
function drawPath(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#e0cb99';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Cobble stones
  ctx.fillStyle = '#cbaf77';
  ctx.fillRect(px + 2, py + 4, 10, 8);
  ctx.fillRect(px + 16, py + 8, 12, 8);
  ctx.fillRect(px + 6, py + 18, 12, 10);
  ctx.fillRect(px + 22, py + 20, 8, 8);

  // Light pebble highlights
  ctx.fillStyle = '#fae9bf';
  ctx.fillRect(px + 3, py + 5, 8, 2);
  ctx.fillRect(px + 17, py + 9, 10, 2);
}

// Draw flowers
function drawFlower(ctx: CanvasRenderingContext2D, px: number, py: number, color: 'red' | 'yellow') {
  drawGrass(ctx, px, py);

  const petalColor = color === 'red' ? '#f04343' : '#fbc02d';
  const centerColor = color === 'red' ? '#ffffff' : '#e65100';

  // Petals
  ctx.fillStyle = petalColor;
  ctx.fillRect(px + 8, py + 10, 4, 4);
  ctx.fillRect(px + 12, py + 6, 4, 4);
  ctx.fillRect(px + 16, py + 10, 4, 4);
  ctx.fillRect(px + 12, py + 14, 4, 4);

  // Center
  ctx.fillStyle = centerColor;
  ctx.fillRect(px + 12, py + 10, 4, 4);

  // Second small flower
  ctx.fillStyle = petalColor;
  ctx.fillRect(px + 22, py + 20, 6, 6);
  ctx.fillStyle = centerColor;
  ctx.fillRect(px + 24, py + 22, 2, 2);
}

// Draw wooden pier / dock tile
function drawDock(ctx: CanvasRenderingContext2D, px: number, py: number) {
  // Water underneath
  drawWater(ctx, px, py, true, 0);

  // Wooden planks
  ctx.fillStyle = '#9c6b3e';
  ctx.fillRect(px, py + 2, TILE_SIZE, TILE_SIZE - 4);

  // Planks lines & shading
  ctx.fillStyle = '#6e451f';
  ctx.fillRect(px, py + 2, TILE_SIZE, 2);
  ctx.fillRect(px, py + 10, TILE_SIZE, 2);
  ctx.fillRect(px, py + 18, TILE_SIZE, 2);
  ctx.fillRect(px, py + 26, TILE_SIZE, 2);
  ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);

  // Nails
  ctx.fillStyle = '#3a220e';
  ctx.fillRect(px + 4, py + 6, 2, 2);
  ctx.fillRect(px + TILE_SIZE - 6, py + 6, 2, 2);
  ctx.fillRect(px + 4, py + 22, 2, 2);
  ctx.fillRect(px + TILE_SIZE - 6, py + 22, 2, 2);
}

// Draw wooden fence
function drawFence(ctx: CanvasRenderingContext2D, px: number, py: number) {
  drawGrass(ctx, px, py);

  ctx.fillStyle = '#c7945d';
  // Horizontal rails
  ctx.fillRect(px, py + 8, TILE_SIZE, 4);
  ctx.fillRect(px, py + 18, TILE_SIZE, 4);

  // Vertical posts
  ctx.fillStyle = '#ab733e';
  ctx.fillRect(px + 4, py + 4, 6, 22);
  ctx.fillRect(px + 20, py + 4, 6, 22);

  // Post points
  ctx.fillStyle = '#c7945d';
  ctx.fillRect(px + 5, py + 2, 4, 2);
  ctx.fillRect(px + 21, py + 2, 4, 2);
}

// Draw GBA style Pokémon Tree (2-tier pine/round tree)
function drawTree(ctx: CanvasRenderingContext2D, px: number, py: number) {
  // Underlying grass
  drawGrass(ctx, px, py);

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 28, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  ctx.fillStyle = '#875128';
  ctx.fillRect(px + 12, py + 18, 8, 10);
  ctx.fillStyle = '#593214';
  ctx.fillRect(px + 16, py + 18, 4, 10);

  // Bottom foliage layer
  ctx.fillStyle = '#1e5f2b';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 16, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mid foliage layer
  ctx.fillStyle = '#2f883f';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 13, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top highlight foliage
  ctx.fillStyle = '#51b964';
  ctx.beginPath();
  ctx.ellipse(px + 14, py + 10, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Draw wooden signpost / quest board in plaza
function drawSignpost(ctx: CanvasRenderingContext2D, px: number, py: number) {
  drawPath(ctx, px, py);

  // Post
  ctx.fillStyle = '#613919';
  ctx.fillRect(px + 14, py + 16, 4, 12);

  // Board
  ctx.fillStyle = '#a66838';
  ctx.fillRect(px + 4, py + 6, 24, 14);
  ctx.strokeStyle = '#4e280c';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 4, py + 6, 24, 14);

  // Board writing lines
  ctx.fillStyle = '#3a1f0a';
  ctx.fillRect(px + 8, py + 10, 16, 2);
  ctx.fillRect(px + 8, py + 14, 12, 2);

  // Pushpins
  ctx.fillStyle = '#e63946';
  ctx.fillRect(px + 6, py + 4, 3, 3);
  ctx.fillStyle = '#f1fa8c';
  ctx.fillRect(px + 23, py + 4, 3, 3);
}

// Draw full Red-Roof Building (Pokémon Center - 4x2 tiles wide)
export function drawPokemonCenter(ctx: CanvasRenderingContext2D, startX: number, startY: number) {
  const w = TILE_SIZE * 4;
  const h = TILE_SIZE * 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(startX + 4, startY + h - 4, w, 8);

  // Wall base
  ctx.fillStyle = '#f5e8db';
  ctx.fillRect(startX, startY + 24, w, h - 24);
  ctx.fillStyle = '#dbc4b0';
  ctx.fillRect(startX + w - 6, startY + 24, 6, h - 24);

  // Red Tiled Roof
  ctx.fillStyle = '#c72626';
  ctx.fillRect(startX - 4, startY, w + 8, 26);
  ctx.fillStyle = '#e94c4c'; // Roof ridge highlight
  ctx.fillRect(startX - 2, startY + 2, w + 4, 6);
  ctx.fillStyle = '#8f1717'; // Roof shadow
  ctx.fillRect(startX - 4, startY + 22, w + 8, 4);

  // Center Gabel / Roof Peak with Pokéball emblem
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(startX + w / 2 - 16, startY - 4, 32, 20);
  ctx.fillStyle = '#c72626';
  ctx.fillRect(startX + w / 2 - 14, startY - 2, 28, 6);

  // Pokéball symbol
  const cx = startX + w / 2;
  const cy = startY + 8;
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.arc(cx, cy, 7, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();

  // Glass Sliding Door
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(startX + w / 2 - 16, startY + 36, 32, 28);
  ctx.fillStyle = '#63b3ed';
  ctx.fillRect(startX + w / 2 - 13, startY + 40, 11, 24);
  ctx.fillRect(startX + w / 2 + 2, startY + 40, 11, 24);
  // Door glass reflection
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(startX + w / 2 - 11, startY + 42, 3, 16);
  ctx.fillRect(startX + w / 2 + 4, startY + 42, 3, 16);

  // Windows with warm light
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(startX + 12, startY + 36, 20, 18);
  ctx.fillRect(startX + w - 32, startY + 36, 20, 18);
  ctx.fillStyle = '#fef08a'; // Warm yellow light
  ctx.fillRect(startX + 14, startY + 38, 16, 14);
  ctx.fillRect(startX + w - 30, startY + 38, 16, 14);

  // Sign text
  ctx.fillStyle = '#c72626';
  ctx.font = 'bold 9px "Galmuri9", "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('포켓몬 센터', cx, startY + 32);
}

// Draw full Blue-Roof Building (Poké Mart - 4x2 tiles wide)
export function drawPokeMart(ctx: CanvasRenderingContext2D, startX: number, startY: number) {
  const w = TILE_SIZE * 4;
  const h = TILE_SIZE * 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(startX + 4, startY + h - 4, w, 8);

  // Wall base
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(startX, startY + 24, w, h - 24);
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(startX + w - 6, startY + 24, 6, h - 24);

  // Blue Tiled Roof
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(startX - 4, startY, w + 8, 26);
  ctx.fillStyle = '#3b82f6'; // Roof ridge highlight
  ctx.fillRect(startX - 2, startY + 2, w + 4, 6);
  ctx.fillStyle = '#1e3a8a'; // Roof shadow
  ctx.fillRect(startX - 4, startY + 22, w + 8, 4);

  // Center Shop Sign (Blue/Orange)
  const cx = startX + w / 2;
  ctx.fillStyle = '#f97316';
  ctx.fillRect(startX + w / 2 - 20, startY + 6, 40, 14);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(startX + w / 2 - 20, startY + 6, 40, 14);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px "Galmuri9", "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MART', cx, startY + 17);

  // Door
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(startX + 16, startY + 36, 26, 28);
  ctx.fillStyle = '#93c5fd';
  ctx.fillRect(startX + 18, startY + 39, 22, 25);

  // Large Shop Display Window
  ctx.fillStyle = '#374151';
  ctx.fillRect(startX + 52, startY + 36, 56, 20);
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(startX + 54, startY + 38, 52, 16);
  // Display items (potion bottles, balls)
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(startX + 60, startY + 44, 6, 8);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(startX + 74, startY + 44, 6, 8);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(startX + 88, startY + 44, 6, 8);

  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 9px "Galmuri9", "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('프렌들리숍', cx, startY + 32);
}

// -------------------------------------------------------------
// Pixel Player Sprite Rendering (16-bit GBA Character style)
// -------------------------------------------------------------

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  currentX: number,
  currentY: number,
  time: number
) {
  const px = currentX * TILE_SIZE;
  const py = currentY * TILE_SIZE;

  // Jump animation offset
  let jumpY = 0;
  if (player.lastAction === 'jump' && player.lastActionTime) {
    const elapsed = time - player.lastActionTime;
    if (elapsed < 600) {
      const progress = elapsed / 600;
      jumpY = -Math.sin(progress * Math.PI) * 16;
    }
  }

  // Soft oval drop shadow under feet (stays on ground even when jumping)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 28, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const charY = py + jumpY;

  // Walking step oscillation
  const stepOffset = player.isMoving ? Math.sin(time / 100) * 2 : 0;
  const leftLegOffset = player.isMoving ? Math.sin(time / 120) * 3 : 0;
  const rightLegOffset = player.isMoving ? -Math.sin(time / 120) * 3 : 0;

  // Directional rendering
  const dir = player.direction || 'down';
  const shirtColor = player.color || '#3b82f6';
  const skinColor = '#fed7aa';
  const pantsColor = '#1e293b';
  const shoesColor = '#ffffff';

  ctx.save();
  ctx.translate(px, charY);

  // 1. Shoes & Legs
  ctx.fillStyle = pantsColor;
  ctx.fillRect(11, 20 + leftLegOffset, 4, 6);
  ctx.fillRect(17, 20 + rightLegOffset, 4, 6);

  ctx.fillStyle = shoesColor;
  ctx.fillRect(10, 25 + leftLegOffset, 5, 3);
  ctx.fillRect(17, 25 + rightLegOffset, 5, 3);

  // 2. Torso / Shirt / Backpack
  ctx.fillStyle = shirtColor;
  ctx.fillRect(10, 13, 12, 8); // Torso

  // Backpack or Jacket detail
  if (dir === 'up') {
    // Backpack visible on back
    ctx.fillStyle = '#d97706';
    ctx.fillRect(11, 14, 10, 6);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(12, 16, 8, 3);
  } else if (dir === 'down') {
    // Shirt collar / zipper
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(15, 13, 2, 4);
  } else if (dir === 'left') {
    // Side profile left
    ctx.fillStyle = '#d97706'; // Side bag
    ctx.fillRect(17, 14, 4, 6);
  } else if (dir === 'right') {
    // Side profile right
    ctx.fillStyle = '#d97706'; // Side bag
    ctx.fillRect(11, 14, 4, 6);
  }

  // 3. Hands / Arms
  ctx.fillStyle = skinColor;
  if (dir === 'left') {
    ctx.fillRect(12, 16 + stepOffset, 3, 4);
  } else if (dir === 'right') {
    ctx.fillRect(17, 16 - stepOffset, 3, 4);
  } else {
    ctx.fillRect(8, 15 + leftLegOffset, 3, 4);
    ctx.fillRect(21, 15 + rightLegOffset, 3, 4);
  }

  // 4. Head & Face
  ctx.fillStyle = skinColor;
  ctx.fillRect(11, 6, 10, 8);

  // Eyes (only visible facing down, left, right)
  ctx.fillStyle = '#0f172a';
  if (dir === 'down') {
    ctx.fillRect(13, 9, 2, 2);
    ctx.fillRect(17, 9, 2, 2);
    // Rosy cheeks
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(11, 11, 2, 1);
    ctx.fillRect(19, 11, 2, 1);
  } else if (dir === 'left') {
    ctx.fillRect(11, 9, 2, 2);
  } else if (dir === 'right') {
    ctx.fillRect(19, 9, 2, 2);
  }

  // 5. Hair & Cap (Pokémon Trainer Cap style)
  const capColor = shirtColor;
  if (dir === 'up') {
    // Back of cap and hair
    ctx.fillStyle = '#451a03'; // Brown hair base
    ctx.fillRect(10, 10, 12, 4);
    ctx.fillStyle = capColor;
    ctx.fillRect(10, 3, 12, 7);
  } else if (dir === 'down') {
    // Front cap visor & hair bangs
    ctx.fillStyle = capColor;
    ctx.fillRect(10, 3, 12, 6);
    ctx.fillStyle = '#ffffff'; // White crest on front of cap
    ctx.fillRect(14, 4, 4, 3);
    // Visor brim
    ctx.fillStyle = '#334155';
    ctx.fillRect(9, 7, 14, 2);
  } else if (dir === 'left') {
    ctx.fillStyle = capColor;
    ctx.fillRect(11, 3, 10, 6);
    ctx.fillStyle = '#334155'; // Brim pointing left
    ctx.fillRect(8, 7, 5, 2);
  } else if (dir === 'right') {
    ctx.fillStyle = capColor;
    ctx.fillRect(11, 3, 10, 6);
    ctx.fillStyle = '#334155'; // Brim pointing right
    ctx.fillRect(19, 7, 5, 2);
  }

  // Action visual effects (Heart, Wave, Alert)
  if (player.lastAction && player.lastActionTime) {
    const actionElapsed = time - player.lastActionTime;
    if (actionElapsed < 1600) {
      const floatY = -Math.min(actionElapsed / 40, 20);

      if (player.lastAction === 'heart') {
        ctx.fillStyle = '#ef4444';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💖', 16, floatY);
      } else if (player.lastAction === 'wave') {
        ctx.fillStyle = '#eab308';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👋', 16, floatY);
      } else if (player.lastAction === 'alert') {
        // Red exclamation mark bubble
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(11, floatY - 14, 10, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, floatY - 12, 4, 6);
        ctx.fillRect(14, floatY - 4, 4, 2);
      }
    }
  }

  ctx.restore();

  // -------------------------------------------------------------
  // Player Name Tag
  // -------------------------------------------------------------
  ctx.save();
  const nameY = charY - 8;
  const name = player.name || '참가자';
  ctx.font = 'bold 10px "Galmuri9", "Press Start 2P", monospace';
  const nameMetrics = ctx.measureText(name);
  const tagWidth = nameMetrics.width + 12;
  const tagHeight = 16;
  const tagX = px + 16 - tagWidth / 2;

  // Tag background & border
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(tagX, nameY - 12, tagWidth, tagHeight, 4);
  ctx.fill();

  ctx.strokeStyle = player.color || '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tag text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, px + 16, nameY - 4);
  ctx.restore();

  // -------------------------------------------------------------
  // 5-Second Retro Pixel Speech Bubble
  // -------------------------------------------------------------
  if (player.lastSpokenText && player.lastSpokenTime) {
    const elapsed = time - player.lastSpokenTime;
    const TOTAL_DURATION = 5000;

    if (elapsed < TOTAL_DURATION) {
      // Calculate opacity fade out during the last 800ms
      let opacity = 1.0;
      if (elapsed > TOTAL_DURATION - 800) {
        opacity = (TOTAL_DURATION - elapsed) / 800;
      }

      // Pop-in bounce effect during first 200ms
      let scale = 1.0;
      if (elapsed < 200) {
        scale = 0.7 + (elapsed / 200) * 0.3;
      }

      drawSpeechBubble(ctx, px + 16, nameY - 16, player.lastSpokenText, opacity, scale);
    }
  }
}

// Draw crisp pixel speech bubble with word wrapping
function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  targetX: number,
  targetY: number,
  text: string,
  opacity: number,
  scale: number
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.translate(targetX, targetY);
  ctx.scale(scale, scale);

  ctx.font = 'bold 11px "Galmuri9", "Press Start 2P", monospace';
  const maxLineLength = 16;
  const lines: string[] = [];

  // Simple word wrapping
  let currentLine = '';
  for (let i = 0; i < text.length; i++) {
    currentLine += text[i];
    if (currentLine.length >= maxLineLength || text[i] === '\n') {
      lines.push(currentLine.trim());
      currentLine = '';
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  // Limit to 3 lines max in bubble
  const displayLines = lines.slice(0, 3);
  if (lines.length > 3) {
    displayLines[2] = displayLines[2].slice(0, 13) + '...';
  }

  let maxWidth = 40;
  displayLines.forEach(line => {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  });

  const paddingH = 10;
  const paddingV = 7;
  const lineHeight = 14;
  const bubbleWidth = maxWidth + paddingH * 2;
  const bubbleHeight = displayLines.length * lineHeight + paddingV * 2;

  const bx = -bubbleWidth / 2;
  const by = -bubbleHeight - 8;

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(bx + 2, by + 2, bubbleWidth, bubbleHeight);

  // Bubble background (bright retro cream white)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx, by, bubbleWidth, bubbleHeight);

  // Pixel border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bubbleWidth, bubbleHeight);

  // Pointer Tail pointing down to character
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-4, by + bubbleHeight - 1);
  ctx.lineTo(0, by + bubbleHeight + 7);
  ctx.lineTo(4, by + bubbleHeight - 1);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-4, by + bubbleHeight);
  ctx.lineTo(0, by + bubbleHeight + 7);
  ctx.lineTo(4, by + bubbleHeight);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw text lines
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  displayLines.forEach((line, idx) => {
    ctx.fillText(line, 0, by + paddingV + idx * lineHeight);
  });

  ctx.restore();
}

// -------------------------------------------------------------
// Main Render Map Function
// -------------------------------------------------------------

export function renderMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
) {
  // Clear canvas
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, width, height);

  // Render ground tiles
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const tile = MAP_DATA[r][c];
      const px = c * TILE_SIZE;
      const py = r * TILE_SIZE;

      switch (tile) {
        case TileType.WATER_DEEP:
          drawWater(ctx, px, py, false, time);
          break;
        case TileType.WATER_SHALLOW:
          drawWater(ctx, px, py, true, time);
          break;
        case TileType.SAND:
          drawSand(ctx, px, py);
          break;
        case TileType.GRASS:
          drawGrass(ctx, px, py);
          break;
        case TileType.PATH:
          drawPath(ctx, px, py);
          break;
        case TileType.FLOWER_RED:
          drawFlower(ctx, px, py, 'red');
          break;
        case TileType.FLOWER_YELLOW:
          drawFlower(ctx, px, py, 'yellow');
          break;
        case TileType.DOCK:
          drawDock(ctx, px, py);
          break;
        case TileType.FENCE:
          drawFence(ctx, px, py);
          break;
        case TileType.TREE:
          drawTree(ctx, px, py);
          break;
        case TileType.SIGNPOST:
          drawSignpost(ctx, px, py);
          break;
        default:
          drawGrass(ctx, px, py);
          break;
      }
    }
  }

  // Draw Buildings (Center at col 7-10, row 0-1, Mart at col 12-15, row 0-1)
  drawPokemonCenter(ctx, 7 * TILE_SIZE, 0);
  drawPokeMart(ctx, 12 * TILE_SIZE, 0);
}
