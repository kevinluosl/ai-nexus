import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// ==========================================
// 游戏常量定义 (Game Constants)
// ==========================================

/** 重力加速度，影响小人下落的速度 */
const GRAVITY = 0.6;
/** 小人的奔跑速度 */
const RUN_SPEED = 4;
/** 地面距离底部的像素偏移量 */
const GROUND_OFFSET = 40;
/** 小人的像素尺寸 */
const CHARACTER_SIZE = 40;

// ==========================================
// 类型定义 (Type Definitions)
// ==========================================

/**
 * 游戏状态接口
 * 包含小人的位置、速度、当前动作状态以及动画帧信息
 */
interface GameState {
  x: number;          // X轴坐标
  y: number;          // Y轴坐标
  vx: number;         // X轴速度
  vy: number;         // Y轴速度
  state: 'RUNNING' | 'GRABBED' | 'FALLING'; // 当前状态
  lastTime: number;   // 上一帧的时间戳
  legFrame: number;   // 腿部动画帧计数器
}

/**
 * 手部跟踪逻辑 Hook
 * 封装了 MediaPipe 模型加载、摄像头流处理、游戏循环和 Canvas 渲染逻辑
 */
export const useHandTracking = () => {
  // ==========================================
  // Refs & State (引用与状态)
  // ==========================================
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  // MediaPipe 检测器实例
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  // 动画循环的 ID
  const requestRef = useRef<number | null>(null);

  // 游戏状态 Ref
  const gameState = useRef<GameState>({
    x: -50,
    y: 0,
    vx: RUN_SPEED,
    vy: 0,
    state: 'RUNNING',
    lastTime: 0,
    legFrame: 0
  });

  // ==========================================
  // 辅助绘制函数 (Helper Drawing Functions)
  // ==========================================

  /**
   * 绘制像素风格小人
   * @param ctx Canvas 上下文
   * @param x 中心 X 坐标
   * @param y 中心 Y 坐标
   * @param state 当前状态
   * @param frame 动画帧
   */
  const drawPixelMan = (ctx: CanvasRenderingContext2D, x: number, y: number, state: string, frame: number) => {
    ctx.save();
    ctx.translate(x, y);

    // 颜色定义
    ctx.fillStyle = '#facc15'; // yellow-400
    if (state === 'GRABBED') ctx.fillStyle = '#f87171'; // red-400

    // 身体
    ctx.fillRect(-10, -15, 20, 30);

    // 头部
    ctx.fillStyle = '#fef08a'; // yellow-200
    ctx.fillRect(-8, -28, 16, 12);

    // 眼睛
    ctx.fillStyle = '#000';
    const eyeSize = state === 'GRABBED' ? 3 : 2;
    ctx.fillRect(2, -24, eyeSize, eyeSize);
    ctx.fillRect(-4, -24, eyeSize, eyeSize); 
    
    // 嘴巴
    if (state === 'GRABBED') {
      ctx.fillRect(-2, -20, 6, 4);
    }

    // 手臂绘制
    ctx.strokeStyle = ctx.fillStyle = '#facc15';
    ctx.lineWidth = 4;
    
    if (state === 'GRABBED') {
      const wiggle = Math.sin(Date.now() / 50) * 10;
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(-20, -25 + wiggle);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(10, -10);
      ctx.lineTo(20, -25 - wiggle);
      ctx.stroke();
    } else {
      const armSwing = Math.sin(frame) * 10;
      ctx.beginPath();
      ctx.moveTo(-5, -10);
      ctx.lineTo(5 + armSwing, 0);
      ctx.stroke();
    }

    // 腿部绘制
    ctx.strokeStyle = '#facc15';
    if (state === 'GRABBED') {
      const legWiggle = Math.cos(Date.now() / 50) * 5;
      ctx.beginPath();
      ctx.moveTo(-5, 15);
      ctx.lineTo(-10 + legWiggle, 25);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(5, 15);
      ctx.lineTo(10 - legWiggle, 25);
      ctx.stroke();
    } else {
      const legOffset = Math.sin(frame) * 10;
      ctx.beginPath();
      ctx.moveTo(-5, 15);
      ctx.lineTo(-5 - legOffset, 25);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(5, 15);
      ctx.lineTo(5 + legOffset, 25);
      ctx.stroke();
    }

    ctx.restore();
  };

  /**
   * 绘制手部骨骼连线和关键点
   * 包含了坐标翻转逻辑以适配镜像显示
   */
  const drawHand = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    const connectorColor = "#06b6d4"; // cyan-500
    const landmarkColor = "#ffffff";
    const landmarkBorder = "#0891b2"; // cyan-600
    const lineWidth = 3;
    const radius = 4;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // 手部骨骼连接定义
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],           // 拇指
      [0, 5], [5, 6], [6, 7], [7, 8],           // 食指
      [0, 9], [9, 10], [10, 11], [11, 12],      // 中指
      [0, 13], [13, 14], [14, 15], [15, 16],    // 无名指
      [0, 17], [17, 18], [18, 19], [19, 20],    // 小指
      [5, 9], [9, 13], [13, 17]                 // 掌心
    ];

    const getPoint = (idx: number) => {
      return {
        x: (1 - landmarks[idx].x) * width, // 翻转 X 轴
        y: landmarks[idx].y * height
      };
    };

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = connectorColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    connections.forEach(([start, end]) => {
      const p1 = getPoint(start);
      const p2 = getPoint(end);
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    landmarks.forEach((_, i) => {
      const p = getPoint(i);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = landmarkColor;
      ctx.fill();
      ctx.strokeStyle = landmarkBorder;
      ctx.stroke();
    });
  };

  /**
   * 更新游戏物理状态并绘制小人
   */
  const updateAndDrawGame = useCallback((ctx: CanvasRenderingContext2D, allLandmarks: any[][], time: number) => {
    const game = gameState.current;
    const canvas = ctx.canvas;
    const groundY = canvas.height - GROUND_OFFSET;
    
    // 计算时间增量
    const dt = (time - game.lastTime) / 16.67; 
    game.lastTime = time;

    // --- 交互逻辑 ---
    let pinchPoint: { x: number, y: number } | null = null;
    let isPinching = false;

    if (allLandmarks && allLandmarks.length > 0) {
      for (const landmarks of allLandmarks) {
        const thumb = landmarks[4];
        const index = landmarks[8];

        const thumbX = (1 - thumb.x) * canvas.width;
        const thumbY = thumb.y * canvas.height;
        const indexX = (1 - index.x) * canvas.width;
        const indexY = index.y * canvas.height;

        const distance = Math.hypot(thumbX - indexX, thumbY - indexY);
        const pinchThresholdPx = 60; 

        if (distance < pinchThresholdPx) {
          isPinching = true;
          pinchPoint = {
            x: (thumbX + indexX) / 2,
            y: (thumbY + indexY) / 2
          };
          
          ctx.beginPath();
          ctx.arc(pinchPoint.x, pinchPoint.y, 10, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fill();
          break;
        }
      }
    }

    // --- 状态机转换 ---
    if (game.state === 'RUNNING' || game.state === 'FALLING') {
      if (isPinching && pinchPoint) {
        const dx = pinchPoint.x - game.x;
        const dy = pinchPoint.y - game.y;
        if (Math.abs(dx) < CHARACTER_SIZE * 1.5 && Math.abs(dy) < CHARACTER_SIZE * 1.5) {
          game.state = 'GRABBED';
        }
      }
    } else if (game.state === 'GRABBED') {
      if (!isPinching) {
        game.state = 'FALLING';
        game.vx = RUN_SPEED;
        game.vy = 0;
      }
    }

    // --- 物理更新 ---
    if (game.state === 'GRABBED' && pinchPoint) {
      game.x += (pinchPoint.x - game.x) * 0.2;
      game.y += (pinchPoint.y - game.y) * 0.2;
      game.vy = 0;
    } else {
      if (game.state === 'RUNNING') {
        game.x += game.vx * dt;
        game.y = groundY - CHARACTER_SIZE / 2;
        game.legFrame += 0.2 * dt;
      } else if (game.state === 'FALLING') {
        game.x += game.vx * dt;
        game.vy += GRAVITY * dt;
        game.y += game.vy * dt;

        if (game.y >= groundY - CHARACTER_SIZE / 2) {
          game.y = groundY - CHARACTER_SIZE / 2;
          game.vy = 0;
          game.state = 'RUNNING';
        }
      }
    }

    if (game.x > canvas.width + 50) {
      game.x = -50;
    }

    // --- 绘制 ---
    drawPixelMan(ctx, game.x, game.y, game.state, game.legFrame);
    
    ctx.beginPath();
    ctx.moveTo(0, groundY + 20);
    ctx.lineTo(canvas.width, groundY + 20);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 4;
    ctx.stroke();
  }, []); // 依赖项为空，因为使用了 ref

  // ==========================================
  // 初始化与核心循环 (Init & Main Loop)
  // ==========================================

  /** 初始化模型 */
  const initializeHandLandmarker = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });
      setIsModelLoaded(true);
    } catch (err: any) {
      setError(`加载 AI 模型失败: ${err.message}`);
      console.error(err);
    }
  }, []);

  /** 预测循环 */
  const predictWebcam = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !handLandmarkerRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    let startTimeMs = performance.now();
    
    try {
      const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);
      
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      updateAndDrawGame(ctx, results.landmarks, startTimeMs);

      if (results.landmarks) {
        for (const landmarks of results.landmarks) {
          drawHand(ctx, landmarks);
        }
      }
      ctx.restore();
      
      requestRef.current = requestAnimationFrame(predictWebcam);
    } catch (err) {
      console.error(err);
    }
  }, [updateAndDrawGame]);

  useEffect(() => {
    initializeHandLandmarker();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeHandLandmarker]);

  /** 启动摄像头 */
  const startCamera = async () => {
    if (!handLandmarkerRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
        setCameraActive(true);
        resetGame();
      }
    } catch (err: any) {
      setError(`无法访问摄像头: ${err.message}. 请允许摄像头权限。`);
    }
  };

  /** 重置游戏 */
  const resetGame = () => {
    gameState.current.x = -50;
    gameState.current.vx = RUN_SPEED;
    gameState.current.state = 'RUNNING';
  };

  return {
    videoRef,
    canvasRef,
    isModelLoaded,
    error,
    cameraActive,
    startCamera,
    resetGame
  };
};
