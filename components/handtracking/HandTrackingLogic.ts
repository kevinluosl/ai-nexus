import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { saveScore, getTopScores } from '../../utils/db';

// ==========================================
// 游戏常量定义 (Game Constants)
// ==========================================

const GRAVITY = 0.6;
const GROUND_OFFSET = 80;
const CHARACTER_WIDTH = 80;
const CHARACTER_HEIGHT = 120;
const BOMB_COOLDOWN = 500;
const SCORE_TO_PASS_LEVEL = 10; // 每关需要多少分才能晋级

// 手势阈值 (迟滞/Hysteresis) - V3 极速触发算法
const PINCH_START_DIST = 60; 
const PINCH_STOP_DIST = 100;  
const GRAB_MAGNET_RADIUS = 120;

// ==========================================
// 鼓励语录库 (Encouragement Messages)
// ==========================================
const LEVEL_MESSAGES = {
  easy: [
    "初露锋芒！", "手速不错！", "热身完毕！", "轻松拿捏！", "旗开得胜！", 
    "这就过啦？", "有点意思！", "稳扎稳打！"
  ],
  medium: [
    "渐入佳境！", "操作犀利！", "反应神速！", "势不可挡！", "令人惊叹！", 
    "还有谁？！", "行云流水！", "大显身手！"
  ],
  hard: [
    "神乎其技！", "超越极限！", "主宰比赛！", "传说诞生！", "光速反应！", 
    "你是AI吗？", "独孤求败！", "觉醒时刻！", "封神之战！"
  ]
};

// ==========================================
// 类型定义 (Type Definitions)
// ==========================================

interface Character {
  id: number;
  x: number;
  y: number;
  vx: number;         // 当前水平速度
  originalSpeed: number; // 原始基准速度 (用于Trick后加速)
  vy: number;         // 垂直速度
  state: 'RUNNING' | 'GRABBED' | 'FALLING' | 'JUMPING';
  legFrame: number;
  isDead: boolean;    // 是否被炸飞出屏幕
  
  // AI 行为状态
  isTricking: boolean; // 是否正在做假动作(往回跑)
  hasTricked: boolean; // 是否已经做过假动作(防止重复触发)
  trickTimer: number;  // 假动作倒计时
}

interface Bomb {
  id: number;
  x: number;
  y: number;
  vy: number;
  active: boolean;
}

export type GameStatus = 'IDLE' | 'STANDBY' | 'PLAYING' | 'LEVEL_UP' | 'GAME_OVER';

interface GameState {
  characters: Character[];
  bombs: Bomb[];
  level: number;
  score: number;       // 总分
  levelScore: number;  // 当前关卡得分
  lastTime: number;
  lastBombTime: number;
  status: GameStatus;
  
  grabbedCharId: number; 
  isPinching: boolean;   
  
  levelUpMessage: string; 
}

export const useHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameStatus, setGameStatus] = useState<GameStatus>('IDLE');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [levelUpMsg, setLevelUpMsg] = useState('');

  const spriteRef = useRef<HTMLImageElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const bombIdCounter = useRef(0);
  const charIdCounter = useRef(0);

  const gameState = useRef<GameState>({
    characters: [],
    bombs: [],
    level: 1,
    score: 0,
    levelScore: 0,
    lastTime: 0,
    lastBombTime: 0,
    status: 'IDLE',
    grabbedCharId: -1,
    isPinching: false,
    levelUpMessage: ''
  });

  // ==========================================
  // 游戏算法与逻辑 (Game Logic)
  // ==========================================

  const spawnCharacters = (lvl: number): Character[] => {
    // 关卡 1 至少 2 人
    // 关卡 2: 3人, 关卡 3: 5人 ...
    let count = Math.floor(2 + Math.pow(lvl - 1, 1.3));
    if (count > 25) count = 25; 

    const chars: Character[] = [];
    for (let i = 0; i < count; i++) {
      const baseSpeed = 1.0 + (lvl * 0.2);
      const randomFactor = 0.7 + Math.random() * 0.6; 
      let finalSpeed = baseSpeed * randomFactor;
      
      if (finalSpeed > 6.0) finalSpeed = 6.0; 
      if (finalSpeed < 0.8) finalSpeed = 0.8;

      const startX = -100 - (Math.random() * 200) - (i * (120 + Math.random() * 100));

      chars.push({
        id: charIdCounter.current++,
        x: startX,
        y: 0, 
        vx: finalSpeed,
        originalSpeed: finalSpeed,
        vy: 0,
        state: 'RUNNING',
        legFrame: Math.random() * 4,
        isDead: false,
        isTricking: false,
        hasTricked: false,
        trickTimer: 0
      });
    }
    return chars;
  };

  const startGame = () => {
    gameState.current.level = 1;
    gameState.current.score = 0;
    gameState.current.levelScore = 0;
    gameState.current.status = 'PLAYING';
    gameState.current.bombs = [];
    gameState.current.characters = spawnCharacters(1);
    gameState.current.grabbedCharId = -1;
    gameState.current.isPinching = false;
    
    setScore(0);
    setLevel(1);
    setGameStatus('PLAYING');
  };

  const resetToStandby = () => {
    gameState.current.status = 'STANDBY';
    gameState.current.characters = []; 
    gameState.current.bombs = [];
    gameState.current.grabbedCharId = -1;
    setGameStatus('STANDBY');
  };

  const triggerLevelUp = () => {
    const currentLevel = gameState.current.level;
    gameState.current.status = 'LEVEL_UP';
    setGameStatus('LEVEL_UP');

    let pool: string[] = [];
    if (currentLevel <= 3) {
      pool = LEVEL_MESSAGES.easy;
    } else if (currentLevel <= 7) {
      pool = LEVEL_MESSAGES.medium;
    } else {
      pool = LEVEL_MESSAGES.hard;
    }
    const msg = pool[Math.floor(Math.random() * pool.length)];
    gameState.current.levelUpMessage = msg;
    setLevelUpMsg(msg);

    setTimeout(() => {
      nextLevel();
    }, 2500);
  };

  const nextLevel = () => {
    const nextLvl = gameState.current.level + 1;
    gameState.current.level = nextLvl;
    gameState.current.levelScore = 0; 
    gameState.current.bombs = [];
    gameState.current.characters = spawnCharacters(nextLvl);
    gameState.current.grabbedCharId = -1;
    gameState.current.status = 'PLAYING';
    
    setLevel(nextLvl);
    setGameStatus('PLAYING');
  };

  const gameOver = () => {
    gameState.current.status = 'GAME_OVER';
    setGameStatus('GAME_OVER');
  };

  const submitScore = async (name: string) => {
    await saveScore(name, gameState.current.score, gameState.current.level);
    refreshLeaderboard();
  };

  const refreshLeaderboard = async () => {
    const list = await getTopScores(5);
    setLeaderboard(list);
  };

  // ==========================================
  // 资源加载 (Asset Loading)
  // ==========================================
  
  const createFallbackSprite = () => {
    const canvas = document.createElement('canvas');
    const w = 64; const h = 64;
    canvas.width = w * 4; canvas.height = h * 2; 
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const C = { HAIR: '#1a1a1a', SKIN: '#f5d0b0', WHITE: '#ffffff', JEANS: '#2563eb', SHOES: '#854d0e', BLACK: '#000000', MOUTH: '#ef4444' };
    const r = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    const drawHead = (ox: number, oy: number, surprised: boolean) => {
        r(ox + 16, oy + 4, 32, 12, C.HAIR); r(ox + 14, oy + 8, 4, 12, C.HAIR); r(ox + 46, oy + 8, 4, 12, C.HAIR);
        r(ox + 18, oy + 16, 28, 20, C.SKIN);
        r(ox + 20, oy + 22, 10, 6, C.BLACK); r(ox + 22, oy + 23, 6, 4, C.WHITE); r(ox + 34, oy + 22, 10, 6, C.BLACK); r(ox + 36, oy + 23, 6, 4, C.WHITE); r(ox + 30, oy + 24, 4, 2, C.BLACK);
        if (surprised) { r(ox + 28, oy + 32, 8, 6, C.MOUTH); } else { r(ox + 28, oy + 32, 8, 2, C.BLACK); }
    };
    for (let i = 0; i < 4; i++) {
        const ox = i * w; const oy = 0; const by = (i % 2 === 0) ? 0 : 2;
        drawHead(ox, oy + by, false);
        r(ox + 20, oy + 36 + by, 24, 16, C.WHITE);
        if (i === 0 || i === 2) { r(ox + 16, oy + 36 + by, 4, 12, C.SKIN); r(ox + 44, oy + 36 + by, 4, 12, C.SKIN); } else if (i === 1) { r(ox + 14, oy + 34 + by, 4, 12, C.SKIN); r(ox + 46, oy + 38 + by, 4, 12, C.SKIN); } else { r(ox + 14, oy + 38 + by, 4, 12, C.SKIN); r(ox + 46, oy + 34 + by, 4, 12, C.SKIN); }
        r(ox + 28, oy + 52 + by, 8, 4, C.JEANS);
        if (i === 0) { r(ox + 22, oy + 52 + by, 8, 12, C.JEANS); r(ox + 34, oy + 52 + by, 8, 12, C.JEANS); r(ox + 22, oy + 64 + by, 10, 4, C.SHOES); r(ox + 34, oy + 64 + by, 10, 4, C.SHOES); } else if (i === 1) { r(ox + 22, oy + 52 + by, 8, 12, C.JEANS); r(ox + 36, oy + 50 + by, 8, 10, C.JEANS); r(ox + 22, oy + 64 + by, 10, 4, C.SHOES); r(ox + 36, oy + 60 + by, 10, 4, C.SHOES); } else if (i === 2) { r(ox + 22, oy + 52 + by, 8, 12, C.JEANS); r(ox + 34, oy + 52 + by, 8, 12, C.JEANS); r(ox + 22, oy + 64 + by, 10, 4, C.SHOES); r(ox + 34, oy + 64 + by, 10, 4, C.SHOES); } else { r(ox + 18, oy + 50 + by, 8, 10, C.JEANS); r(ox + 34, oy + 52 + by, 8, 12, C.JEANS); r(ox + 18, oy + 60 + by, 10, 4, C.SHOES); r(ox + 34, oy + 64 + by, 10, 4, C.SHOES); }
    }
    for (let i = 0; i < 4; i++) {
        const ox = i * w; const oy = h; const sx = (i % 2 === 0) ? -2 : 2;
        drawHead(ox + sx, oy, true);
        r(ox + 20 + sx, oy + 36, 24, 16, C.WHITE);
        r(ox + 12 + sx, oy + 24, 6, 16, C.SKIN); r(ox + 46 + sx, oy + 24, 6, 16, C.SKIN);
        if (i % 2 === 0) { r(ox + 20 + sx, oy + 52, 8, 10, C.JEANS); r(ox + 36 + sx, oy + 56, 8, 10, C.JEANS); r(ox + 20 + sx, oy + 62, 8, 4, C.SHOES); r(ox + 36 + sx, oy + 66, 8, 4, C.SHOES); } else { r(ox + 20 + sx, oy + 56, 8, 10, C.JEANS); r(ox + 36 + sx, oy + 52, 8, 10, C.JEANS); r(ox + 20 + sx, oy + 66, 8, 4, C.SHOES); r(ox + 36 + sx, oy + 62, 8, 4, C.SHOES); }
    }
    return canvas.toDataURL();
  };

  useEffect(() => {
    const loadFallback = () => {
      const fallbackSrc = createFallbackSprite();
      const fallbackImg = new Image();
      fallbackImg.src = fallbackSrc;
      fallbackImg.onload = () => { spriteRef.current = fallbackImg; };
    };
    const img = new Image();
    img.src = 'images/people.png'; 
    img.onload = () => { spriteRef.current = img; };
    img.onerror = () => {
      const img2 = new Image();
      img2.src = 'people.png';
      img2.onload = () => { spriteRef.current = img2; };
      img2.onerror = loadFallback;
    };
    refreshLeaderboard();
  }, []);

  // ==========================================
  // 更新循环 (Update Loop)
  // ==========================================

  const addScore = (points: number) => {
    gameState.current.score += points;
    gameState.current.levelScore += points;
    setScore(gameState.current.score);

    if (gameState.current.levelScore >= SCORE_TO_PASS_LEVEL && gameState.current.status === 'PLAYING') {
      triggerLevelUp();
    }
  };

  const drawSpriteMan = (ctx: CanvasRenderingContext2D, x: number, y: number, state: string, frame: number) => {
    const img = spriteRef.current;
    if (!img) return;
    const frameIndex = Math.floor(frame) % 4;
    const spriteW = img.width / 4;
    const spriteH = img.height / 2;
    // JUMPING 状态也使用第2排(挣扎/惊讶)的图，看起来像是在空中手舞足蹈
    let row = (state === 'GRABBED' || state === 'FALLING' || state === 'JUMPING') ? 1 : 0;
    const sx = frameIndex * spriteW;
    const sy = row * spriteH;
    ctx.drawImage(img, sx, sy, spriteW, spriteH, x - CHARACTER_WIDTH / 2, y - CHARACTER_HEIGHT / 2, CHARACTER_WIDTH, CHARACTER_HEIGHT);
  };

  const updateAndDrawGame = useCallback((ctx: CanvasRenderingContext2D, allLandmarks: any[][], time: number) => {
    const game = gameState.current;
    const canvas = ctx.canvas;
    
    if (game.status === 'GAME_OVER') return;

    ctx.imageSmoothingEnabled = false;
    const groundY = canvas.height - GROUND_OFFSET;
    const dt = (time - game.lastTime) / 16.67; 
    game.lastTime = time;

    // --- 绘制地面 ---
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // ==========================================
    // STANDBY (待机模式: 氛围动画)
    // ==========================================
    if (game.status === 'STANDBY') {
        if (Math.random() < 0.015) { 
            game.characters.push({
                id: charIdCounter.current++,
                x: -100,
                y: groundY - CHARACTER_HEIGHT / 2,
                vx: 1.5 + Math.random(),
                originalSpeed: 1.5,
                vy: 0,
                state: 'RUNNING',
                legFrame: 0,
                isDead: false,
                isTricking: false,
                hasTricked: false,
                trickTimer: 0
            });
        }
        const activeChars: Character[] = [];
        for (const char of game.characters) {
            char.x += char.vx * dt;
            char.legFrame += 0.15 * dt;
            drawSpriteMan(ctx, char.x, char.y, 'RUNNING', char.legFrame);
            if (char.x < canvas.width + 100) {
                activeChars.push(char);
            }
        }
        game.characters = activeChars;
        return; 
    }

    const isLevelUp = game.status === 'LEVEL_UP';

    // ==========================================
    // PLAYING / LEVEL_UP 共用渲染逻辑
    // ==========================================

    // --- 手势检测 ---
    let pinchPoint: { x: number, y: number } | null = null;
    let pinchDist = 1000;
    let isFiveFingerPinch = false; 

    if (allLandmarks && allLandmarks.length > 0) {
      const landmarks = allLandmarks[0]; 
      
      const getPx = (idx: number) => ({
           x: (1 - landmarks[idx].x) * canvas.width,
           y: landmarks[idx].y * canvas.height
      });

      const thumbTip = getPx(4);
      const indexTip = getPx(8);
      const middleTip = getPx(12);
      const ringTip = getPx(16);
      const pinkyTip = getPx(20);

      const distIndex = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
      const distMiddle = Math.hypot(middleTip.x - thumbTip.x, middleTip.y - thumbTip.y);
      const distRing = Math.hypot(ringTip.x - thumbTip.x, ringTip.y - thumbTip.y);
      const distPinky = Math.hypot(pinkyTip.x - thumbTip.x, pinkyTip.y - thumbTip.y);
      
      if (game.grabbedCharId === -1 && distIndex < 60 && distMiddle < 60 && distRing < 60 && distPinky < 60) {
        isFiveFingerPinch = true;
        pinchPoint = thumbTip;
      } 
      else {
        if (distIndex < distMiddle) {
             pinchPoint = { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 };
             pinchDist = distIndex;
        } else {
             pinchPoint = { x: (thumbTip.x + middleTip.x) / 2, y: (thumbTip.y + middleTip.y) / 2 };
             pinchDist = distMiddle;
        }
        if (distIndex < 60 && distMiddle < 60) {
             pinchPoint = { x: (thumbTip.x + indexTip.x + middleTip.x) / 3, y: (thumbTip.y + indexTip.y + middleTip.y) / 3 };
        }
      }
    }

    // --- 抓取状态更新 ---
    if (game.isPinching) {
        if (pinchDist > PINCH_STOP_DIST || isFiveFingerPinch) {
            game.isPinching = false;
        }
    } else {
        if (pinchDist < PINCH_START_DIST && !isFiveFingerPinch) {
            game.isPinching = true;
        }
    }

    // --- 炸弹生成 ---
    if (!isLevelUp && isFiveFingerPinch && pinchPoint && (time - game.lastBombTime > BOMB_COOLDOWN)) {
      game.bombs.push({
        id: bombIdCounter.current++,
        x: pinchPoint.x,
        y: pinchPoint.y,
        vy: 0,
        active: true
      });
      game.lastBombTime = time;
    }

    // --- 炸弹物理更新 ---
    const activeBombs: Bomb[] = [];
    for (const bomb of game.bombs) {
      if (!isLevelUp) {
        bomb.vy += GRAVITY * dt;
        bomb.y += bomb.vy * dt;
      }

      let hit = false;
      for (const char of game.characters) {
          if (char.isDead) continue;
          
          const dx = bomb.x - char.x;
          const dy = bomb.y - char.y;
          const hitW = CHARACTER_WIDTH * 0.8;
          const hitH = CHARACTER_HEIGHT * 0.8;

          if (Math.abs(dx) < hitW && Math.abs(dy) < hitH && bomb.active && !isLevelUp) {
            hit = true;
            addScore(1);
            char.x -= 150;
            if (char.y > groundY - CHARACTER_HEIGHT) {
                char.y -= 40; char.vy = -8; char.state = 'FALLING';
            }
            ctx.beginPath(); ctx.arc(bomb.x, bomb.y, 50, 0, Math.PI * 2); ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; ctx.fill();
            ctx.beginPath(); ctx.arc(bomb.x, bomb.y, 25, 0, Math.PI * 2); ctx.fillStyle = 'rgba(252, 211, 77, 0.8)'; ctx.fill();
            break; 
          }
      }

      if (!hit && bomb.y < groundY + 15) {
        activeBombs.push(bomb);
      } else if (!hit) {
        ctx.beginPath(); ctx.arc(bomb.x, groundY, 15, 0, Math.PI * 2); ctx.fillStyle = 'rgba(100,100,100,0.5)'; ctx.fill();
      }
    }
    game.bombs = activeBombs;

    // --- 抓取目标判定逻辑 ---
    if (!isLevelUp && game.grabbedCharId === -1 && game.isPinching && pinchPoint) {
        let minDist = Infinity;
        let foundId = -1;

        for (const char of game.characters) {
            if (char.isDead) continue;
            // 只能抓取 RUNNING 或 JUMPING 的小人 (FALLING 不可抓)
            if (char.state !== 'RUNNING' && char.state !== 'JUMPING') continue;

            const dx = pinchPoint.x - char.x;
            const dy = pinchPoint.y - char.y;
            const dist = Math.hypot(dx, dy); 
            
            if (dist < GRAB_MAGNET_RADIUS) {
                if (dist < minDist) {
                    minDist = dist;
                    foundId = char.id;
                }
            }
        }

        if (foundId !== -1) {
            game.grabbedCharId = foundId; 
            const char = game.characters.find(c => c.id === foundId);
            if (char) {
                char.state = 'GRABBED';
                char.isTricking = false; // 被抓时停止假动作
                addScore(1); 
            }
        }
    }
    
    // 松开逻辑
    if (!game.isPinching && game.grabbedCharId !== -1) {
        const char = game.characters.find(c => c.id === game.grabbedCharId);
        if (char) {
            char.state = 'FALLING';
            // 松手时恢复水平速度，但不要立即太快
            char.vx = char.originalSpeed; 
            char.vy = 0;
        }
        game.grabbedCharId = -1; 
    }

    // --- 小人物理与AI更新 ---
    for (const char of game.characters) {
        if (char.isDead) continue;

        // 1. 被抓取状态
        if (char.id === game.grabbedCharId && pinchPoint && !isLevelUp) {
            char.x += (pinchPoint.x - char.x) * 0.5;
            char.y += (pinchPoint.y - char.y) * 0.5;
            char.vy = 0;
            char.legFrame += 0.25 * dt; 
        } 
        else {
            // 2. 自由运动状态
            
            // --- AI 行为逻辑 (Level 2+) ---
            if (game.level >= 2 && char.state === 'RUNNING' && !isLevelUp) {
                // 如果当前没有在做假动作，且从未做过假动作，有概率触发
                if (!char.isTricking && !char.hasTricked && Math.random() < 0.008) { 
                    const action = Math.random();
                    if (action < 0.4) {
                        // 行为A: 跳跃 - 跳得更高
                        char.vy = -16; // Increased from -12
                        char.state = 'JUMPING';
                    } else {
                        // 行为B: 折返跑 (假动作)
                        char.isTricking = true;
                        char.trickTimer = 45; // 往回跑 45 帧 (约0.75秒)
                        char.vx = -2.5; // 倒退速度
                    }
                }
            }

            // 处理假动作计时
            if (char.isTricking) {
                char.trickTimer -= dt;
                if (char.trickTimer <= 0) {
                    char.isTricking = false;
                    char.hasTricked = true; // 标记已做过假动作
                    char.vx = char.originalSpeed * 1.5; // 假动作结束后加速到1.5倍
                }
            } else if (char.state === 'RUNNING') {
                 // 如果做过假动作，保持 1.5 倍速度，不减速
                if (!char.hasTricked && char.vx > char.originalSpeed) {
                    char.vx -= 0.05 * dt;
                    if (char.vx < char.originalSpeed) char.vx = char.originalSpeed;
                }
            }

            // --- 物理更新 ---
            if (char.state === 'RUNNING') {
                const moveSpeed = isLevelUp ? 0 : char.vx;
                char.x += moveSpeed * dt;
                char.y = groundY - CHARACTER_HEIGHT / 2;
                char.legFrame += (isLevelUp ? 0.05 : 0.15) * dt;
            } 
            else if (char.state === 'FALLING' || char.state === 'JUMPING') {
                char.x += char.vx * dt;
                char.vy += GRAVITY * dt;
                char.y += char.vy * dt;
                char.legFrame += 0.2 * dt; 
                
                // 落地检测
                if (char.y >= groundY - CHARACTER_HEIGHT / 2) {
                    char.y = groundY - CHARACTER_HEIGHT / 2;
                    char.vy = 0;
                    char.state = 'RUNNING'; 
                    // 落地后重置 AI 状态
                    if (char.vx < 0) char.vx = char.originalSpeed; 
                }
            }
        }

        // 失败检测
        if (!isLevelUp && char.x > canvas.width + 20) {
            gameOver();
            return;
        }

        // 边界限制
        if (char.x < -300) char.x = -300;
        
        drawSpriteMan(ctx, char.x, char.y, char.state, char.legFrame);
    }

  }, [nextLevel, gameOver]);

  // ==========================================
  // 初始化 (Init)
  // ==========================================

  const drawHand = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
     const connectorColor = "#06b6d4"; const landmarkColor = "#ffffff";
     const width = ctx.canvas.width; const height = ctx.canvas.height;
     const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
     const getPoint = (idx: number) => ({ x: (1 - landmarks[idx].x) * width, y: landmarks[idx].y * height });
     ctx.lineWidth = 2; ctx.strokeStyle = connectorColor; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
     connections.forEach(([s, e]) => { const p1 = getPoint(s); const p2 = getPoint(e); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); });
     landmarks.forEach((_, i) => { const p = getPoint(i); ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI); ctx.fillStyle = landmarkColor; ctx.fill(); });
  };

  const initializeHandLandmarker = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`, delegate: "GPU" },
        runningMode: "VIDEO", numHands: 2
      });
      setIsModelLoaded(true);
    } catch (err: any) { setError(err.message); }
  }, []);

  const predictWebcam = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !handLandmarkerRef.current) return;
    const video = videoRef.current; const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
    let startTimeMs = performance.now();
    try {
      const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);
      ctx.save(); ctx.clearRect(0, 0, canvas.width, canvas.height);
      updateAndDrawGame(ctx, results.landmarks, startTimeMs);
      ctx.globalAlpha = 0.6;
      if (results.landmarks) { for (const l of results.landmarks) drawHand(ctx, l); }
      ctx.globalAlpha = 1.0; ctx.restore();
      requestRef.current = requestAnimationFrame(predictWebcam);
    } catch (err) { console.error(err); }
  }, [updateAndDrawGame]);

  useEffect(() => {
    initializeHandLandmarker();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [initializeHandLandmarker]);

  const startCamera = async () => {
    if (!handLandmarkerRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
        setCameraActive(true);
        gameState.current.status = 'STANDBY';
        setGameStatus('STANDBY');
      }
    } catch (err: any) { setError(err.message); }
  };

  return {
    videoRef, canvasRef, isModelLoaded, error, cameraActive,
    startCamera, startGame, resetToStandby,
    score, level, gameStatus, submitScore, leaderboard, levelUpMsg
  };
};