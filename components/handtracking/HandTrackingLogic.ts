import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { saveScore, getTopScores } from '../../utils/db';

// ==========================================
// 游戏常量定义 (Game Constants)
// ==========================================

/** 重力加速度，影响物体下落速度 (像素/帧^2) */
const GRAVITY = 0.6;

/** 地面距离 Canvas底部的偏移量 */
const GROUND_OFFSET = 80;

/** 小人角色的显示宽度 */
const CHARACTER_WIDTH = 80;

/** 小人角色的显示高度 */
const CHARACTER_HEIGHT = 120;

/** 炸弹投掷的冷却时间 (毫秒)，防止连续误触 */
const BOMB_COOLDOWN = 500;

/** 通过当前关卡所需的得分 */
const SCORE_TO_PASS_LEVEL = 10; 

/** 玩家最大可持有的炸弹数量 */
const MAX_BOMBS = 5; 

// --- 手势交互阈值 (基于 V3 磁吸算法) ---

/** 
 * 开始抓取（捏合）的距离阈值 (像素)。
 * 当拇指与食指/中指距离小于此值时，视为触发抓取。
 * 设置为 60 较宽泛，实现“极速触发”。
 */
const PINCH_START_DIST = 60; 

/** 
 * 停止抓取（松开）的距离阈值 (像素)。
 * 只有当手指距离大于此值时，才会松开物体。
 * 设置为 100 形成较大的“迟滞区间”(Hysteresis)，防止抖动导致物体掉落。
 */
const PINCH_STOP_DIST = 100;  

/** 
 * 磁吸判定的搜索半径 (像素)。
 * 手指中心点进入小人周围此半径内，即可锁定目标。
 */
const GRAB_MAGNET_RADIUS = 120;

// ==========================================
// 鼓励语录库 (Encouragement Messages)
// ==========================================
/**
 * 根据关卡难度分级的鼓励语
 */
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

/**
 * 游戏角色(小人)的数据结构
 */
interface Character {
  /** 唯一标识符 */
  id: number;
  /** 当前 X 坐标 (像素) */
  x: number;
  /** 当前 Y 坐标 (像素) */
  y: number;
  /** 当前水平速度 */
  vx: number;         
  /** 原始基准速度 (用于 AI 假动作结束后恢复加速) */
  originalSpeed: number; 
  /** 垂直速度 (用于跳跃和下落) */
  vy: number;         
  /** 
   * 当前状态:
   * RUNNING: 正常奔跑
   * GRABBED: 被玩家抓取中
   * FALLING: 被松开或被炸飞后的下落/击飞状态
   * JUMPING: AI 触发的跳跃状态
   */
  state: 'RUNNING' | 'GRABBED' | 'FALLING' | 'JUMPING';
  /** 动画帧索引 (用于控制走路/挣扎动画的播放) */
  legFrame: number;
  /** 是否死亡 (被炸飞出屏幕，等待移除) */
  isDead: boolean;    
  
  // --- AI 行为属性 ---
  /** 是否正在执行折返跑(假动作) */
  isTricking: boolean; 
  /** 标记是否已经执行过一次假动作 (防止无限折返) */
  hasTricked: boolean; 
  /** 假动作持续时间的计时器 */
  trickTimer: number;  
}

/**
 * 炸弹对象数据结构
 */
interface Bomb {
  id: number;
  x: number;
  y: number;
  vy: number;
  /** 炸弹是否处于激活状态 (碰撞后失效) */
  active: boolean;
}

/**
 * 补给包对象 (从天而NR的绿色炸弹补给)
 */
interface SupplyDrop {
  id: number;
  x: number;
  y: number;
  vy: number;
}

/**
 * 游戏全局状态枚举
 */
export type GameStatus = 'IDLE' | 'STANDBY' | 'PLAYING' | 'LEVEL_UP' | 'GAME_OVER';

/**
 * 游戏核心状态存储对象 (Ref 引用类型)
 * 使用 Ref 而不是 State 以避免在高频 requestAnimationFrame 循环中触发 React 重渲染
 */
interface GameState {
  characters: Character[];
  bombs: Bomb[];
  supplyDrops: SupplyDrop[]; 
  level: number;
  score: number;       // 累计总分
  levelScore: number;  // 当前关卡内得分
  bombsRemaining: number; // 剩余弹药数
  lastTime: number;    // 上一帧的时间戳 (用于计算 dt)
  lastBombTime: number; // 上一次投掷炸弹的时间戳
  status: GameStatus;
  
  /** 当前抓取的角色 ID，-1 表示未抓取 */
  grabbedCharId: number; 
  /** 当前是否处于捏合手势状态 */
  isPinching: boolean;
  
  /** 当前关卡是否已经生成过一次补给 (每关限一次) */
  hasDropSpawned: boolean; 
  /** 升级时显示的随机鼓励语 */
  levelUpMessage: string; 
}

/**
 * 手部跟踪与游戏逻辑的主要 Hook
 */
export const useHandTracking = () => {
  // DOM 引用
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // React 状态 (用于 UI 渲染)
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  // 游戏 HUD 显示状态
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [bombsRemaining, setBombsRemaining] = useState(MAX_BOMBS);
  const [gameStatus, setGameStatus] = useState<GameStatus>('IDLE');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [levelUpMsg, setLevelUpMsg] = useState('');
  const [showTutorialToast, setShowTutorialToast] = useState(false);

  // 内部引用
  const spriteRef = useRef<HTMLImageElement | null>(null); // 精灵图资源
  const handLandmarkerRef = useRef<HandLandmarker | null>(null); // MediaPipe 实例
  const requestRef = useRef<number | null>(null); // 动画帧 ID
  
  // ID 计数器
  const bombIdCounter = useRef(0);
  const charIdCounter = useRef(0);
  const dropIdCounter = useRef(0);

  // 游戏核心逻辑状态 (不直接驱动 UI)
  const gameState = useRef<GameState>({
    characters: [],
    bombs: [],
    supplyDrops: [],
    level: 1,
    score: 0,
    levelScore: 0,
    bombsRemaining: MAX_BOMBS,
    lastTime: 0,
    lastBombTime: 0,
    status: 'IDLE',
    grabbedCharId: -1,
    isPinching: false,
    hasDropSpawned: false,
    levelUpMessage: ''
  });

  // ==========================================
  // 游戏算法与逻辑 (Game Logic)
  // ==========================================

  /**
   * 生成关卡怪物算法
   * 根据当前关卡等级，计算生成的小人数量和速度
   * @param lvl - 当前关卡等级
   */
  const spawnCharacters = (lvl: number): Character[] => {
    // 数量增长公式: Level 1=2个, Level 2=3个, Level 3=5个... 指数增长
    let count = Math.floor(2 + Math.pow(lvl - 1, 1.3));
    if (count > 25) count = 25; // 硬上限，防止性能崩溃

    const chars: Character[] = [];
    for (let i = 0; i < count; i++) {
      // 速度随关卡增加
      const baseSpeed = 1.0 + (lvl * 0.2);
      // 增加随机因子，让每个小人速度不同
      const randomFactor = 0.7 + Math.random() * 0.6; 
      let finalSpeed = baseSpeed * randomFactor;
      
      // 速度限制
      if (finalSpeed > 6.0) finalSpeed = 6.0; 
      if (finalSpeed < 0.8) finalSpeed = 0.8;

      // 随机生成在屏幕左侧外部，错开位置
      const startX = -100 - (Math.random() * 200) - (i * (120 + Math.random() * 100));

      chars.push({
        id: charIdCounter.current++,
        x: startX,
        y: 0, // y 坐标在渲染时会根据地面高度动态计算
        vx: finalSpeed,
        originalSpeed: finalSpeed,
        vy: 0,
        state: 'RUNNING',
        legFrame: Math.random() * 4, // 随机初始动画帧
        isDead: false,
        isTricking: false,
        hasTricked: false,
        trickTimer: 0
      });
    }
    return chars;
  };

  /**
   * 开始新游戏
   * 重置所有分数、关卡和状态
   */
  const startGame = () => {
    // 重置 GameState Ref
    gameState.current.level = 1;
    gameState.current.score = 0;
    gameState.current.levelScore = 0;
    gameState.current.bombs = [];
    gameState.current.supplyDrops = [];
    gameState.current.hasDropSpawned = false;
    gameState.current.bombsRemaining = MAX_BOMBS;
    gameState.current.characters = spawnCharacters(1);
    gameState.current.grabbedCharId = -1;
    gameState.current.isPinching = false;
    
    // 同步 React State
    setScore(0);
    setLevel(1);
    setBombsRemaining(MAX_BOMBS);

    // 首次游戏教程逻辑
    const hasSeenTutorial = localStorage.getItem('has_seen_tutorial');
    if (!hasSeenTutorial) {
        setShowTutorialToast(true);
        localStorage.setItem('has_seen_tutorial', 'true');
        // 3秒后自动关闭提示 Toast
        setTimeout(() => {
            setShowTutorialToast(false);
        }, 3000);
    } else {
        setShowTutorialToast(false);
    }

    gameState.current.status = 'PLAYING';
    setGameStatus('PLAYING');
  };

  /**
   * 重置回待机模式
   * 游戏结束后调用，清空数据并显示背景动画
   */
  const resetToStandby = () => {
    gameState.current.status = 'STANDBY';
    gameState.current.characters = []; 
    gameState.current.bombs = [];
    gameState.current.supplyDrops = [];
    gameState.current.grabbedCharId = -1;
    setGameStatus('STANDBY');
  };

  /**
   * 触发升级流程
   * 暂停游戏逻辑，显示升级动画和鼓励语
   */
  const triggerLevelUp = () => {
    const currentLevel = gameState.current.level;
    gameState.current.status = 'LEVEL_UP';
    setGameStatus('LEVEL_UP');

    // 根据难度选择鼓励语
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

    // 2.5秒后进入下一关
    setTimeout(() => {
      nextLevel();
    }, 2500);
  };

  /**
   * 进入下一关
   * 增加难度，生成新一波怪物
   */
  const nextLevel = () => {
    const nextLvl = gameState.current.level + 1;
    gameState.current.level = nextLvl;
    gameState.current.levelScore = 0; 
    gameState.current.bombs = [];
    gameState.current.supplyDrops = [];
    gameState.current.hasDropSpawned = false; // 重置补给生成标记
    
    // 注意：不再自动补充炸弹，弹药通过游戏内掉落获取
    
    gameState.current.characters = spawnCharacters(nextLvl);
    gameState.current.grabbedCharId = -1;
    gameState.current.status = 'PLAYING';
    
    setLevel(nextLvl);
    setBombsRemaining(gameState.current.bombsRemaining);
    setGameStatus('PLAYING');
  };

  /**
   * 游戏结束逻辑
   */
  const gameOver = () => {
    gameState.current.status = 'GAME_OVER';
    setGameStatus('GAME_OVER');
  };

  /**
   * 提交分数到 IndexedDB
   */
  const submitScore = async (name: string) => {
    await saveScore(name, gameState.current.score, gameState.current.level);
    refreshLeaderboard();
  };

  /**
   * 刷新排行榜数据
   */
  const refreshLeaderboard = async () => {
    const list = await getTopScores(5);
    setLeaderboard(list);
  };

  // ==========================================
  // 资源加载 (Asset Loading)
  // ==========================================
  
  /**
   * 动态生成备用像素小人精灵图
   * 当外部图片加载失败时，使用 Canvas 绘制一个程序化生成的像素小人。
   * 包含两排动画：第一排走路，第二排被抓/挣扎。
   */
  const createFallbackSprite = () => {
    const canvas = document.createElement('canvas');
    const w = 64; const h = 64;
    canvas.width = w * 4; canvas.height = h * 2; 
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // 调色板
    const C = { HAIR: '#1a1a1a', SKIN: '#f5d0b0', WHITE: '#ffffff', JEANS: '#2563eb', SHOES: '#854d0e', BLACK: '#000000', MOUTH: '#ef4444' };
    
    // 简易绘制矩形函数
    const r = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    
    // 绘制头部通用逻辑
    const drawHead = (ox: number, oy: number, surprised: boolean) => {
        r(ox + 16, oy + 4, 32, 12, C.HAIR); r(ox + 14, oy + 8, 4, 12, C.HAIR); r(ox + 46, oy + 8, 4, 12, C.HAIR);
        r(ox + 18, oy + 16, 28, 20, C.SKIN);
        // 眼睛和眼镜
        r(ox + 20, oy + 22, 10, 6, C.BLACK); r(ox + 22, oy + 23, 6, 4, C.WHITE); r(ox + 34, oy + 22, 10, 6, C.BLACK); r(ox + 36, oy + 23, 6, 4, C.WHITE); r(ox + 30, oy + 24, 4, 2, C.BLACK);
        // 嘴巴 (惊讶 vs 平静)
        if (surprised) { r(ox + 28, oy + 32, 8, 6, C.MOUTH); } else { r(ox + 28, oy + 32, 8, 2, C.BLACK); }
    };
    
    // 第一排：走路动画
    for (let i = 0; i < 4; i++) {
        const ox = i * w; const oy = 0; const by = (i % 2 === 0) ? 0 : 2; // 身体上下起伏
        drawHead(ox, oy + by, false);
        // 身体 T恤
        r(ox + 20, oy + 36 + by, 24, 16, C.WHITE);
        // 手臂摆动逻辑
        if (i === 0 || i === 2) { r(ox + 16, oy + 36 + by, 4, 12, C.SKIN); r(ox + 44, oy + 36 + by, 4, 12, C.SKIN); } else if (i === 1) { r(ox + 14, oy + 34 + by, 4, 12, C.SKIN); r(ox + 46, oy + 38 + by, 4, 12, C.SKIN); } else { r(ox + 14, oy + 38 + by, 4, 12, C.SKIN); r(ox + 46, oy + 34 + by, 4, 12, C.SKIN); }
        // 腿部动作
        r(ox + 28, oy + 52 + by, 8, 4, C.JEANS);
        if (i === 0) { r(ox + 22, oy + 52 + by, 8, 12, C.JEANS); r(ox + 34, oy + 52 + by, 8, 12, C.JEANS); r(ox + 22, oy + 64 + by, 10, 4, C.SHOES); r(ox + 34, oy + 64 + by, 10, 4, C.SHOES); } else if (i === 1) { r(ox + 22, oy + 52 + by, 8, 12, C.JEANS); r(ox + 36, oy + 50 + by, 8, 10, C.JEANS); r(ox + 22, oy + 64 + by, 10, 4, C.SHOES); r(ox + 36, oy + 60 + by, 10, 4, C.SHOES); } else if (i === 2) { r(ox + 22, oy + 52 + by, 8, 12, C.JEANS); r(ox + 34, oy + 52 + by, 8, 12, C.JEANS); r(ox + 22, oy + 64 + by, 10, 4, C.SHOES); r(ox + 34, oy + 64 + by, 10, 4, C.SHOES); } else { r(ox + 18, oy + 50 + by, 8, 10, C.JEANS); r(ox + 34, oy + 52 + by, 8, 12, C.JEANS); r(ox + 18, oy + 60 + by, 10, 4, C.SHOES); r(ox + 34, oy + 64 + by, 10, 4, C.SHOES); }
    }
    
    // 第二排：被抓/挣扎动画
    for (let i = 0; i < 4; i++) {
        const ox = i * w; const oy = h; const sx = (i % 2 === 0) ? -2 : 2; // 身体左右摇晃
        drawHead(ox + sx, oy, true);
        r(ox + 20 + sx, oy + 36, 24, 16, C.WHITE);
        // 手臂举起
        r(ox + 12 + sx, oy + 24, 6, 16, C.SKIN); r(ox + 46 + sx, oy + 24, 6, 16, C.SKIN);
        // 腿部乱蹬
        if (i % 2 === 0) { r(ox + 20 + sx, oy + 52, 8, 10, C.JEANS); r(ox + 36 + sx, oy + 56, 8, 10, C.JEANS); r(ox + 20 + sx, oy + 62, 8, 4, C.SHOES); r(ox + 36 + sx, oy + 66, 8, 4, C.SHOES); } else { r(ox + 20 + sx, oy + 56, 8, 10, C.JEANS); r(ox + 36 + sx, oy + 52, 8, 10, C.JEANS); r(ox + 20 + sx, oy + 66, 8, 4, C.SHOES); r(ox + 36 + sx, oy + 62, 8, 4, C.SHOES); }
    }
    return canvas.toDataURL();
  };

  // 初始化加载图片资源
  useEffect(() => {
    const loadFallback = () => {
      const fallbackSrc = createFallbackSprite();
      const fallbackImg = new Image();
      fallbackImg.src = fallbackSrc;
      fallbackImg.onload = () => { spriteRef.current = fallbackImg; };
    };
    
    // 优先尝试加载外部图片，失败则使用备用生成器
    const img = new Image();
    img.src = 'images/people.png'; 
    img.onload = () => { spriteRef.current = img; };
    img.onerror = () => {
      // 再次尝试根路径
      const img2 = new Image();
      img2.src = 'people.png';
      img2.onload = () => { spriteRef.current = img2; };
      img2.onerror = loadFallback;
    };
    refreshLeaderboard();
  }, []);

  // ==========================================
  // 更新循环与渲染 (Update Loop & Rendering)
  // ==========================================

  const addScore = (points: number) => {
    gameState.current.score += points;
    gameState.current.levelScore += points;
    setScore(gameState.current.score);

    // 检查是否达到过关条件
    if (gameState.current.levelScore >= SCORE_TO_PASS_LEVEL && gameState.current.status === 'PLAYING') {
      triggerLevelUp();
    }
  };

  /**
   * 绘制像素小人
   * @param ctx - Canvas 上下文
   * @param x - 中心 X 坐标
   * @param y - 中心 Y 坐标
   * @param state - 当前状态 (决定使用哪一排动画)
   * @param frame - 当前帧数 (决定使用哪一列动画)
   */
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

  /**
   * 主游戏循环函数 (每帧调用)
   * 负责处理所有物理计算、AI 行为、手势检测和画面绘制
   */
  const updateAndDrawGame = useCallback((ctx: CanvasRenderingContext2D, allLandmarks: any[][], time: number) => {
    const game = gameState.current;
    const canvas = ctx.canvas;
    
    if (game.status === 'GAME_OVER') return;

    // 禁用平滑，保留像素艺术风格
    ctx.imageSmoothingEnabled = false;
    const groundY = canvas.height - GROUND_OFFSET;
    // 计算时间增量 dt，用于帧率无关的物理计算
    const dt = (time - game.lastTime) / 16.67; 
    game.lastTime = time;

    // --- 1. 手势检测 (核心逻辑) ---
    // 将手势检测放在最前面，以便在 STANDBY 模式下也能响应“捏合开始”按钮
    
    let pinchPoint: { x: number, y: number } | null = null;
    let pinchDist = 1000;
    let isFiveFingerPinch = false; 

    if (allLandmarks && allLandmarks.length > 0) {
      const landmarks = allLandmarks[0]; 
      
      // 辅助函数：将归一化坐标转换为 Canvas 像素坐标
      // 注意：x 轴做了镜像翻Rr，以符合镜像显示的逻辑 (1 - x)
      const getPx = (idx: number) => ({
           x: (1 - landmarks[idx].x) * canvas.width,
           y: landmarks[idx].y * canvas.height
      });

      // 获取关键点: 拇指(4), 食指(8), 中指(12), 无名指(16), 小指(20)
      const thumbTip = getPx(4);
      const indexTip = getPx(8);
      const middleTip = getPx(12);
      const ringTip = getPx(16);
      const pinkyTip = getPx(20);

      // 计算各手指到拇指的距离
      const distIndex = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
      const distMiddle = Math.hypot(middleTip.x - thumbTip.x, middleTip.y - thumbTip.y);
      const distRing = Math.hypot(ringTip.x - thumbTip.x, ringTip.y - thumbTip.y);
      const distPinky = Math.hypot(pinkyTip.x - thumbTip.x, pinkyTip.y - thumbTip.y);
      
      // 检测五指捏合 (炸弹手势)
      // 条件：未抓取物体，且所有手指都靠近拇指
      if (game.grabbedCharId === -1 && distIndex < 60 && distMiddle < 60 && distRing < 60 && distPinky < 60) {
        isFiveFingerPinch = true;
        pinchPoint = thumbTip;
      } 
      else {
        // 检测抓取手势 (双指或三指)
        // 优先使用距离较近的指尖作为中心点
        if (distIndex < distMiddle) {
             pinchPoint = { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 };
             pinchDist = distIndex;
        } else {
             pinchPoint = { x: (thumbTip.x + middleTip.x) / 2, y: (thumbTip.y + middleTip.y) / 2 };
             pinchDist = distMiddle;
        }
        
        // 修正：如果食指和中指都很近，取三指中心，更稳定
        if (distIndex < 60 && distMiddle < 60) {
             pinchPoint = { x: (thumbTip.x + indexTip.x + middleTip.x) / 3, y: (thumbTip.y + indexTip.y + middleTip.y) / 3 };
        }
      }
    }

    // --- 更新捏合状态 (迟滞算法) ---
    // 使用双阈值防止临界点抖动
    if (game.isPinching) {
        // 如果正在捏合，需要距离大于停止阈值才算松开
        if (pinchDist > PINCH_STOP_DIST || isFiveFingerPinch) {
            game.isPinching = false;
        }
    } else {
        // 如果未捏合，距离小于开始阈值才算捏合
        if (pinchDist < PINCH_START_DIST && !isFiveFingerPinch) {
            game.isPinching = true;
        }
    }

    // --- 绘制地面线条 ---
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // ==========================================
    // STANDBY (待机模式: 氛围动画 + 按钮交互)
    // ==========================================
    if (game.status === 'STANDBY') {
        // 随机生成背景中走路的“路人”小人
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
        
        // 更新并绘制路人
        const activeChars: Character[] = [];
        for (const char of game.characters) {
            char.x += char.vx * dt;
            char.legFrame += 0.15 * dt;
            drawSpriteMan(ctx, char.x, char.y, 'RUNNING', char.legFrame);
            // 移出屏幕后销毁
            if (char.x < canvas.width + 100) {
                activeChars.push(char);
            }
        }
        game.characters = activeChars;

        // --- 按钮碰撞检测 (Pinch to Start) ---
        if (pinchPoint) {
             // 绘制手势光标
            ctx.beginPath();
            ctx.arc(pinchPoint.x, pinchPoint.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = game.isPinching ? '#22d3ee' : 'rgba(34, 211, 238, 0.5)';
            ctx.fill();
            
            // 按钮判定区域 (屏幕中心大致范围，对应 UI 上的 Start 按钮)
            const btnW = 320;
            const btnH = 150;
            const btnX = canvas.width / 2 - btnW / 2;
            const btnY = canvas.height / 2 - btnH / 2;
            
            // 检测是否在按钮范围内
            if (pinchPoint.x > btnX && pinchPoint.x < btnX + btnW &&
                pinchPoint.y > btnY && pinchPoint.y < btnY + btnH) {
                
                // 绘制高亮虚线框作为反馈
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 4;
                ctx.lineDashOffset = (Date.now() / 20) % 20; // 蚂蚁线动画
                ctx.setLineDash([10, 5]);
                ctx.strokeRect(btnX, btnY, btnW, btnH);
                ctx.setLineDash([]);
                
                // 如果在范围内触发捏合，开始游戏
                if (game.isPinching) {
                     startGame();
                }
            }
        }
        
        return; // 待机模式下不执行后续的游戏逻辑
    }

    const isLevelUp = game.status === 'LEVEL_UP';

    // ==========================================
    // PLAYING / LEVEL_UP 共用渲染逻辑
    // ==========================================
    
    // 绘制游戏中的手势光标
    if (pinchPoint && !isLevelUp) {
        ctx.beginPath();
        ctx.arc(pinchPoint.x, pinchPoint.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = game.isPinching ? '#22d3ee' : 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }

    // --- 补给包生成与逻辑 (Level 3+) ---
    // 第三关开始，随机掉落弹药补给
    if (game.level >= 3 && !game.hasDropSpawned && game.status === 'PLAYING') {
        // 约 0.5% 概率每帧尝试生成
        if (Math.random() < 0.005) {
            game.supplyDrops.push({
                id: dropIdCounter.current++,
                x: 100 + Math.random() * (canvas.width - 200),
                y: -50,
                vy: 2.0 // 缓慢下落速度
            });
            game.hasDropSpawned = true; // 标记本关已生成
        }
    }

    // 更新并绘制补给包
    const activeDrops: SupplyDrop[] = [];
    for (const drop of game.supplyDrops) {
        drop.y += drop.vy * dt;
        
        // 绘制绿色医疗包/弹药箱样式
        ctx.save();
        ctx.translate(drop.x, drop.y);
        ctx.scale(1.2, 1.2);
        // 绿色主体
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fillStyle = '#10b981'; ctx.fill();
        // 高光
        ctx.beginPath(); ctx.arc(-4, -4, 4, 0, Math.PI * 2); ctx.fillStyle = '#6ee7b7'; ctx.fill();
        // 装饰线
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(4, -22, 8, -18); ctx.strokeStyle = '#d1fae5'; ctx.lineWidth = 2; ctx.stroke();
        // 十字标志
        ctx.fillStyle = 'white'; ctx.fillRect(-8, -2, 16, 4); ctx.fillRect(-2, -8, 4, 16);
        ctx.restore();

        // 拾取检测 (捏合判定)
        let picked = false;
        if (pinchPoint && game.isPinching) {
            const dx = pinchPoint.x - drop.x;
            const dy = pinchPoint.y - drop.y;
            if (Math.hypot(dx, dy) < 60) {
                // 拾取成功
                picked = true;
                if (game.bombsRemaining < MAX_BOMBS) {
                    game.bombsRemaining++;
                    setBombsRemaining(game.bombsRemaining);
                }
                // 播放简单的拾取特效
                ctx.beginPath(); ctx.arc(drop.x, drop.y, 40, 0, Math.PI*2); ctx.fillStyle = 'rgba(16, 185, 129, 0.5)'; ctx.fill();
            }
        }

        if (!picked && drop.y < canvas.height + 50) {
            activeDrops.push(drop);
        }
    }
    game.supplyDrops = activeDrops;


    // --- 炸弹生成逻辑 ---
    // 条件：非升级状态 + 五指捏合 + 有弹药 + 冷却完毕
    if (!isLevelUp && isFiveFingerPinch && pinchPoint && (time - game.lastBombTime > BOMB_COOLDOWN)) {
      if (game.bombsRemaining > 0) {
          game.bombs.push({
            id: bombIdCounter.current++,
            x: pinchPoint.x,
            y: pinchPoint.y,
            vy: 0,
            active: true
          });
          game.lastBombTime = time;
          game.bombsRemaining--; // 扣除弹药
          setBombsRemaining(game.bombsRemaining);
      }
    }

    // --- 炸弹物理与碰撞更新 ---
    const activeBombs: Bomb[] = [];
    for (const bomb of game.bombs) {
      if (!isLevelUp) {
        bomb.vy += GRAVITY * dt;
        bomb.y += bomb.vy * dt;
      }

      // 碰撞检测：炸弹 vs 每一个小人
      let hit = false;
      for (const char of game.characters) {
          if (char.isDead) continue;
          
          const dx = bomb.x - char.x;
          const dy = bomb.y - char.y;
          const hitW = CHARACTER_WIDTH * 0.8;
          const hitH = CHARACTER_HEIGHT * 0.8;

          // 简单的矩形碰撞判定
          if (Math.abs(dx) < hitW && Math.abs(dy) < hitH && bomb.active && !isLevelUp) {
            hit = true;
            addScore(1);
            // 击退效果
            char.x -= 150;
            // 击飞浮空效果
            if (char.y > groundY - CHARACTER_HEIGHT) {
                char.y -= 40; char.vy = -8; char.state = 'FALLING';
            }
            // 爆炸特效
            ctx.beginPath(); ctx.arc(bomb.x, bomb.y, 50, 0, Math.PI * 2); ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; ctx.fill();
            ctx.beginPath(); ctx.arc(bomb.x, bomb.y, 25, 0, Math.PI * 2); ctx.fillStyle = 'rgba(252, 211, 77, 0.8)'; ctx.fill();
            break; // 一颗炸弹只能炸一个
          }
      }

      // 如果炸弹未击中且未落地，继续保留
      if (!hit && bomb.y < groundY + 15) {
        activeBombs.push(bomb);
        
        // --- 绘制炸弹本体 ---
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#18181b'; // 黑色弹体
        ctx.fill();
        
        // 高光
        ctx.beginPath();
        ctx.arc(bomb.x - 4, bomb.y - 4, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#52525b'; 
        ctx.fill();
        
        // 引信
        ctx.beginPath();
        ctx.moveTo(bomb.x, bomb.y - 12);
        ctx.quadraticCurveTo(bomb.x + 4, bomb.y - 22, bomb.x + 8, bomb.y - 18);
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 引信火花粒子
        if (Math.random() > 0.2) {
             ctx.beginPath();
             ctx.arc(bomb.x + 8, bomb.y - 18, 2 + Math.random() * 2, 0, Math.PI * 2);
             ctx.fillStyle = Math.random() > 0.5 ? '#ef4444' : '#f59e0b';
             ctx.fill();
        }
        
      } else if (!hit) {
        // 落地后的烟尘效果 (一帧闪过)
        ctx.beginPath(); ctx.arc(bomb.x, groundY, 15, 0, Math.PI * 2); ctx.fillStyle = 'rgba(100,100,100,0.5)'; ctx.fill();
      }
    }
    game.bombs = activeBombs;

    // --- 抓取目标判定逻辑 (V3 磁吸算法) ---
    // 仅在非捏合状态下寻找新目标
    if (!isLevelUp && game.grabbedCharId === -1 && game.isPinching && pinchPoint) {
        let minDist = Infinity;
        let foundId = -1;

        for (const char of game.characters) {
            if (char.isDead) continue;
            // 规则：只能抓取 RUNNING 或 JUMPING 的小人 (FALLING 状态不可抓，防刷分)
            if (char.state !== 'RUNNING' && char.state !== 'JUMPING') continue;

            const dx = pinchPoint.x - char.x;
            const dy = pinchPoint.y - char.y;
            const dist = Math.hypot(dx, dy); 
            
            // 磁吸半径判定
            if (dist < GRAB_MAGNET_RADIUS) {
                if (dist < minDist) {
                    minDist = dist;
                    foundId = char.id;
                }
            }
        }

        // 成功锁定目标
        if (foundId !== -1) {
            game.grabbedCharId = foundId; 
            const char = game.characters.find(c => c.id === foundId);
            if (char) {
                char.state = 'GRABBED';
                char.isTricking = false; // 被抓时强制停止假动作
                addScore(1); 
            }
        }
    }
    
    // --- 松开逻辑 ---
    if (!game.isPinching && game.grabbedCharId !== -1) {
        const char = game.characters.find(c => c.id === game.grabbedCharId);
        if (char) {
            char.state = 'FALLING'; // 松手后进入下落状态
            // 恢复水平速度，确保小人继续往前走
            char.vx = char.originalSpeed; 
            char.vy = 0;
        }
        game.grabbedCharId = -1; // 释放锁定
    }

    // --- 小人物理与 AI 行为更新 (核心循环) ---
    for (const char of game.characters) {
        if (char.isDead) continue;

        // 1. 被抓取状态
        if (char.id === game.grabbedCharId && pinchPoint && !isLevelUp) {
            // 使用 Lerp (线性插值) 实现平滑拖拽，产生“吸附感”
            char.x += (pinchPoint.x - char.x) * 0.6;
            char.y += (pinchPoint.y - char.y) * 0.6;
            char.vy = 0;
            char.legFrame += 0.25 * dt; // 被抓时拼命挣扎的动画
        } 
        else {
            // 2. 自由运动状态
            
            // --- AI 行为逻辑 (Level 2+ 开启) ---
            if (game.level >= 2 && char.state === 'RUNNING' && !isLevelUp) {
                // 如果当前没有在做假动作，且从未做过，有极低概率(0.8%/帧)触发 AI 行为
                if (!char.isTricking && !char.hasTricked && Math.random() < 0.008) { 
                    const action = Math.random();
                    if (action < 0.4) {
                        // 行为A: 跳跃 - 向上施加垂直速度
                        char.vy = -16; 
                        char.state = 'JUMPING';
                    } else {
                        // 行为B: 折返跑 (假动作)
                        char.isTricking = true;
                        char.trickTimer = 45; // 倒退持续约 0.75 秒
                        char.vx = -2.5; // 设置倒退速度
                    }
                }
            }

            // 处理假动作计时
            if (char.isTricking) {
                char.trickTimer -= dt;
                if (char.trickTimer <= 0) {
                    char.isTricking = false;
                    char.hasTricked = true; // 标记已完成
                    char.vx = char.originalSpeed * 1.5; // 假动作结束后爆发加速
                }
            } else if (char.state === 'RUNNING') {
                 // 如果做过假动作，保持 1.5 倍速度，不减速，增加后续难度
                if (!char.hasTricked && char.vx > char.originalSpeed) {
                    // 平滑恢复正常速度 (如果被其他因素加速了)
                    char.vx -= 0.05 * dt;
                    if (char.vx < char.originalSpeed) char.vx = char.originalSpeed;
                }
            }

            // --- 物理更新 ---
            if (char.state === 'RUNNING') {
                const moveSpeed = isLevelUp ? 0 : char.vx;
                char.x += moveSpeed * dt;
                char.y = groundY - CHARACTER_HEIGHT / 2; // 贴地行走
                char.legFrame += (isLevelUp ? 0.05 : 0.15) * dt;
            } 
            else if (char.state === 'FALLING' || char.state === 'JUMPING') {
                char.x += char.vx * dt;
                char.vy += GRAVITY * dt; // 应用重力
                char.y += char.vy * dt;
                char.legFrame += 0.2 * dt; 
                
                // 落地检测
                if (char.y >= groundY - CHARACTER_HEIGHT / 2) {
                    char.y = groundY - CHARACTER_HEIGHT / 2;
                    char.vy = 0;
                    char.state = 'RUNNING'; 
                    // 落地后确保恢复正确的速度方向 (防止因碰撞导致的倒退残留)
                    if (char.vx < 0) char.vx = char.originalSpeed; 
                }
            }
        }

        // 失败检测：小人跑出屏幕右侧
        if (!isLevelUp && char.x > canvas.width + 20) {
            gameOver();
            return;
        }

        // 左侧边界限制，防止被炸飞太远回不来
        if (char.x < -300) char.x = -300;
        
        // 绘制角色
        drawSpriteMan(ctx, char.x, char.y, char.state, char.legFrame);
    }

  }, [nextLevel, gameOver, startGame]);

  // ==========================================
  // MediaPipe 初始化与摄像头处理
  // ==========================================

  // 绘制手部骨骼连线辅助函数 (调试用，也用于增强科技感)
  const drawHand = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
     const connectorColor = "#06b6d4"; const landmarkColor = "#ffffff";
     const width = ctx.canvas.width; const height = ctx.canvas.height;
     const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
     const getPoint = (idx: number) => ({ x: (1 - landmarks[idx].x) * width, y: landmarks[idx].y * height });
     ctx.lineWidth = 2; ctx.strokeStyle = connectorColor; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
     // 绘制连线
     connections.forEach(([s, e]) => { const p1 = getPoint(s); const p2 = getPoint(e); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); });
     // 绘制关键点
     landmarks.forEach((_, i) => { const p = getPoint(i); ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI); ctx.fillStyle = landmarkColor; ctx.fill(); });
  };

  /** 初始化 MediaPipe HandLandmarker */
  const initializeHandLandmarker = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { 
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`, 
            delegate: "GPU" 
        },
        runningMode: "VIDEO", 
        numHands: 2
      });
      setIsModelLoaded(true);
    } catch (err: any) { setError(err.message); }
  }, []);

  /** 摄像头帧处理循环 */
  const predictWebcam = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !handLandmarkerRef.current) return;
    const video = videoRef.current; const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // 确保 Canvas 尺寸匹配视频流
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
    
    let startTimeMs = performance.now();
    try {
      const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);
      
      ctx.save(); 
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 执行游戏逻辑更新
      updateAndDrawGame(ctx, results.landmarks, startTimeMs);
      
      // 绘制半透明手部骨骼
      ctx.globalAlpha = 0.6;
      if (results.landmarks) { for (const l of results.landmarks) drawHand(ctx, l); }
      ctx.globalAlpha = 1.0; 
      ctx.restore();
      
      // 请求下一帧
      requestRef.current = requestAnimationFrame(predictWebcam);
    } catch (err) { console.error(err); }
  }, [updateAndDrawGame]);

  // 组件挂载时初始化
  useEffect(() => {
    initializeHandLandmarker();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [initializeHandLandmarker]);

  /** 启动摄像头并开始预测 */
  const startCamera = async () => {
    if (!handLandmarkerRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
        setCameraActive(true);
        // 摄像头启动后进入待机模式，等待玩家手势开始
        gameState.current.status = 'STANDBY';
        setGameStatus('STANDBY');
      }
    } catch (err: any) { setError(err.message); }
  };

  return {
    videoRef, canvasRef, isModelLoaded, error, cameraActive,
    startCamera, startGame, resetToStandby, dismissTutorial: () => {}, 
    score, level, bombsRemaining, gameStatus, submitScore, leaderboard, levelUpMsg, showTutorialToast
  };
};