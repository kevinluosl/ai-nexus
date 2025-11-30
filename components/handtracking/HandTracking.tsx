import React from 'react';
import { Loader2, Camera, AlertTriangle, Play, RefreshCw } from 'lucide-react';
import { useHandTracking } from './HandTrackingLogic';

/**
 * 手部跟踪组件 (视图层)
 * 负责 UI 渲染，通过 useHandTracking Hook 获取状态和处理函数
 */
export const HandTracking: React.FC = () => {
  const {
    videoRef,
    canvasRef,
    isModelLoaded,
    error,
    cameraActive,
    startCamera,
    resetGame
  } = useHandTracking();

  return (
    <div className="h-full w-full flex flex-col p-6 overflow-hidden">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <span className="w-2 h-8 bg-cyan-500 rounded-sm inline-block"></span>
            手部跟踪
          </h2>
          <p className="text-zinc-400">
            用手捏合即可抓起屏幕中的小人！基于 MediaPipe 的实时交互。
          </p>
        </div>
        
        <div className="flex gap-3">
          {cameraActive && (
            <button 
              onClick={resetGame}
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg border border-zinc-700 transition-all flex items-center gap-2"
            >
              <RefreshCw size={18} />
              重置游戏
            </button>
          )}

          {!cameraActive && isModelLoaded && !error && (
            <button 
              onClick={startCamera}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <Camera size={20} />
              启动传感器
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-black/40 rounded-2xl border border-zinc-800 overflow-hidden relative shadow-2xl backdrop-blur-sm">
        {/* 加载状态 */}
        {!isModelLoaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-cyan-500 z-50 bg-zinc-950/80">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="text-zinc-300 font-mono animate-pulse">正在加载神经网络...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 z-50 bg-zinc-950/90 p-8 text-center">
            <AlertTriangle size={48} className="mb-4" />
            <p className="text-lg font-bold">系统错误</p>
            <p className="text-zinc-400 mt-2 max-w-md">{error}</p>
          </div>
        )}

        {/* 待机/空状态 */}
        {!cameraActive && isModelLoaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 z-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center mb-4">
              <Camera size={32} />
            </div>
            <p className="text-zinc-500 uppercase tracking-widest text-sm">等待输入流</p>
          </div>
        )}

        {/* 视频与 Canvas 层 */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
           {/* 视频层: CSS 镜像翻转，作为用户的“镜子” */}
           <video
             ref={videoRef}
             className="absolute w-auto h-full max-w-full object-contain"
             autoPlay
             playsInline
             muted
             style={{ transform: 'scaleX(-1)' }} 
           />
           {/* Canvas 层 */}
           <canvas
             ref={canvasRef}
             className="absolute w-auto h-full max-w-full object-contain z-10 pointer-events-none"
           />
           
           {/* 技术参数浮层 */}
           {cameraActive && (
             <div className="absolute top-4 right-4 z-20 flex gap-2">
               <div className="bg-black/50 backdrop-blur text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded text-xs font-mono flex items-center gap-2">
                 <Play size={10} className="fill-cyan-400" />
                 GAME ACTIVE
               </div>
               <div className="bg-black/50 backdrop-blur text-zinc-400 border border-zinc-700 px-3 py-1 rounded text-xs font-mono">
                 30 FPS
               </div>
             </div>
           )}
           
           {/* 视觉装饰元素 */}
           <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-500/20 rounded-tl-xl pointer-events-none" />
           <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-xl pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-xl pointer-events-none" />
           <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-500/20 rounded-br-xl pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
