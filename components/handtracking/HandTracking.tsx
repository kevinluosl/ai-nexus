import React, { useState } from 'react';
import { Loader2, Camera, AlertTriangle, Play, RefreshCw, Trophy, Bomb, Skull, Crown, X, Hand, Info } from 'lucide-react';
import { useHandTracking } from './HandTrackingLogic';

/**
 * 手部跟踪 Demo 主界面组件
 * 包含游戏 Canvas、HUD (抬头显示)、模态框及状态控制逻辑。
 */
export const HandTracking: React.FC = () => {
  // 从自定义 Hook 中解构游戏逻辑和状态
  const {
    videoRef,
    canvasRef,
    isModelLoaded,
    error,
    cameraActive,
    startCamera,
    startGame,
    resetToStandby,
    score,
    level,
    bombsRemaining,
    gameStatus,
    submitScore,
    leaderboard,
    levelUpMsg,
    showTutorialToast
  } = useHandTracking();

  // 本地 UI 状态
  const [playerName, setPlayerName] = useState(''); // 玩家输入的名字
  const [isSubmitting, setIsSubmitting] = useState(false); // 提交分数 loading 状态
  const [showLeaderboard, setShowLeaderboard] = useState(false); // 排行榜弹窗开关

  /**
   * 处理分数提交表单
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    setIsSubmitting(true);
    await submitScore(playerName);
    setIsSubmitting(false);
    setPlayerName(''); 
    resetToStandby(); // 保存成功后回到待机画面
  };

  return (
    <div className="h-full w-full flex flex-col p-6 overflow-hidden relative">
      {/* --- 顶部 Header --- */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <span className="w-2 h-8 bg-cyan-500 rounded-sm inline-block"></span>
            手部跟踪 - 像素大作战
          </h2>
          <p className="text-zinc-400 text-sm md:text-base">
            双指/三指抓取小人 | 五指捏合投掷炸弹 | 阻止小人通过屏幕！
          </p>
        </div>
        
        {/* 顶部按钮区 */}
        <div className="flex gap-3">
          <button 
             onClick={() => setShowLeaderboard(true)}
             className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-yellow-500 hover:text-yellow-400 font-semibold rounded-lg border border-zinc-700 transition-all flex items-center gap-2"
          >
             <Crown size={18} />
             <span className="hidden md:inline">排行榜</span>
          </button>
        </div>
      </div>

      {/* --- 游戏主区域 --- */}
      <div className="flex-1 bg-black/40 rounded-2xl border border-zinc-800 overflow-hidden relative shadow-2xl backdrop-blur-sm flex">
        
        <div className="relative flex-1 h-full bg-black overflow-hidden">
          {/* Loading 状态 */}
          {!isModelLoaded && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-cyan-500 z-50 bg-zinc-950/80">
              <Loader2 size={48} className="animate-spin mb-4" />
              <p className="text-zinc-300 font-mono animate-pulse">正在加载神经网络...</p>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 z-50 bg-zinc-950/90 p-8 text-center">
              <AlertTriangle size={48} className="mb-4" />
              <p className="text-lg font-bold">系统错误</p>
              <p className="text-zinc-400 mt-2 max-w-md">{error}</p>
            </div>
          )}

          {/* --- 中央交互层: 开始按钮 --- */}
          {/* 仅在非游戏进行中且无错误时显示 */}
          {isModelLoaded && !error && gameStatus !== 'PLAYING' && gameStatus !== 'GAME_OVER' && gameStatus !== 'LEVEL_UP' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
                <div className="pointer-events-auto">
                    {!cameraActive ? (
                        // 初始状态：开启摄像头按钮
                        <button 
                          onClick={startCamera}
                          className="group relative px-8 py-6 bg-zinc-900/90 hover:bg-cyan-950/90 text-cyan-400 border border-cyan-500/30 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all hover:scale-105 flex flex-col items-center gap-3 backdrop-blur-md"
                        >
                           <Camera size={48} className="group-hover:animate-pulse" />
                           <span className="text-xl font-bold tracking-widest uppercase">开启摄像头</span>
                           <span className="text-xs text-zinc-500">允许访问摄像头以进行动作捕捉</span>
                        </button>
                    ) : (
                        // 待机状态：开始游戏按钮 (支持捏合触发)
                        <button 
                          onClick={startGame}
                          className="group relative px-12 py-8 bg-cyan-600/90 hover:bg-cyan-500/90 text-white rounded-3xl shadow-[0_0_40px_rgba(34,211,238,0.4)] transition-all hover:scale-110 flex flex-col items-center gap-4 backdrop-blur-sm animate-in zoom-in duration-300"
                        >
                           <div className="p-4 bg-white/20 rounded-full">
                             <Play size={48} className="fill-white" />
                           </div>
                           <div className="text-center">
                             <span className="block text-3xl font-black italic tracking-tighter shadow-black drop-shadow-lg">开始挑战</span>
                             <div className="flex items-center justify-center gap-2 text-cyan-100/90 font-mono mt-2 text-sm bg-black/20 px-3 py-1 rounded-full">
                                <Hand size={16} />
                                <span>捏合或点击开始</span>
                             </div>
                           </div>
                        </button>
                    )}
                </div>
            </div>
          )}
          
          {/* --- 临时教程 Toast 提示 --- */}
          {/* 首次游戏时短暂显示的操作指引 */}
          {showTutorialToast && (
             <div className="absolute top-10 left-0 right-0 z-50 flex justify-center pointer-events-none animate-in slide-in-from-top-4 fade-in duration-500">
                <div className="bg-black/70 backdrop-blur-md border border-cyan-500/30 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Hand size={20} className="text-cyan-400" />
                        <span className="font-bold text-sm">双指抓取小人</span>
                    </div>
                    <div className="w-[1px] h-4 bg-zinc-600"></div>
                    <div className="flex items-center gap-2">
                        <Bomb size={20} className="text-red-400" />
                        <span className="font-bold text-sm">五指炸弹 (限5颗)</span>
                    </div>
                    <div className="w-[1px] h-4 bg-zinc-600"></div>
                    <div className="flex items-center gap-2">
                        <Skull size={20} className="text-yellow-400" />
                        <span className="font-bold text-sm">阻止小人通过</span>
                    </div>
                </div>
             </div>
          )}

          {/* --- 升级全屏提示动画 --- */}
          {gameStatus === 'LEVEL_UP' && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
                <div className="animate-in zoom-in spin-in-3 duration-500">
                   <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-red-500 drop-shadow-[0_0_25px_rgba(251,191,36,0.8)] scale-110 animate-bounce">
                      {levelUpMsg}
                   </h1>
                </div>
                <div className="mt-8 text-2xl font-bold text-cyan-300 font-mono tracking-widest animate-pulse drop-shadow-lg">
                   NEXT LEVEL LOADING...
                </div>
            </div>
          )}

          {/* --- 排行榜悬浮窗 --- */}
          {showLeaderboard && (
             <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-zinc-900/95 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden m-4">
                   <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
                      <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                        <Crown size={20} className="text-yellow-500" />
                        排行榜 (Top 5)
                      </h3>
                      <button onClick={() => setShowLeaderboard(false)} className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-700 rounded transition-colors">
                        <X size={20} />
                      </button>
                   </div>
                   
                   <div className="p-4 max-h-[60vh] overflow-y-auto">
                      {leaderboard.length === 0 ? (
                        <div className="text-center p-8 text-zinc-500">
                          <Trophy size={40} className="mx-auto mb-2 opacity-20" />
                          <p>暂无记录，快去创造历史吧!</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {leaderboard.map((record, i) => (
                            <div key={i} className={`p-4 rounded-xl border flex items-center justify-between transition-transform hover:scale-[1.01] ${i===0 ? 'bg-gradient-to-r from-yellow-900/20 to-zinc-900 border-yellow-500/30 shadow-lg' : 'bg-zinc-800/40 border-zinc-800'}`}>
                                <div className="flex items-center gap-4">
                                  {/* 排名徽章 */}
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black font-mono ${i===0?'bg-yellow-500 text-black':'bg-zinc-700 text-zinc-400'}`}>
                                    {i+1}
                                  </div>
                                  <div>
                                    <div className={`font-bold ${i===0?'text-yellow-400 text-lg':'text-zinc-200'}`}>{record.name}</div>
                                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                                       <span>{new Date(record.date).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                   <div className="text-xl font-black font-mono text-white">{record.score} <span className="text-xs text-zinc-500 font-normal">pts</span></div>
                                   <div className="text-xs text-cyan-400 font-bold uppercase">Level {record.level}</div>
                                </div>
                            </div>
                          ))}
                        </div>
                      )}
                   </div>
                </div>
             </div>
          )}

          {/* --- 游戏结束结算弹窗 --- */}
          {gameStatus === 'GAME_OVER' && (
             <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
               <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
                 <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Skull size={32} />
                 </div>
                 <h2 className="text-3xl font-black text-white mb-2">挑战失败</h2>
                 <p className="text-zinc-400 mb-6">小人突破了防线！最终成绩</p>
                 
                 <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-zinc-800 p-4 rounded-xl">
                      <div className="text-xs text-zinc-500 uppercase font-bold">分数</div>
                      <div className="text-3xl font-mono text-white">{score}</div>
                    </div>
                    <div className="bg-zinc-800 p-4 rounded-xl">
                      <div className="text-xs text-zinc-500 uppercase font-bold">关卡</div>
                      <div className="text-3xl font-mono text-cyan-400">{level}</div>
                    </div>
                 </div>

                 <form onSubmit={handleSubmit} className="mb-6">
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       placeholder="输入名字记录战绩" 
                       className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                       value={playerName}
                       onChange={(e) => setPlayerName(e.target.value)}
                       maxLength={10}
                       required
                     />
                     <button 
                       type="submit" 
                       disabled={isSubmitting}
                       className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                     >
                       保存
                     </button>
                   </div>
                 </form>

                 <button 
                   onClick={() => { startGame(); }}
                   className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
                 >
                   不保存，直接重试
                 </button>
               </div>
             </div>
          )}

          {/* --- 游戏渲染层 (Video + Canvas) --- */}
          <div className="relative w-full h-full flex items-center justify-center">
             {/* 摄像头画面 (镜像翻转) */}
             <video
               ref={videoRef}
               className="absolute w-auto h-full max-w-full object-contain"
               autoPlay playsInline muted
               style={{ transform: 'scaleX(-1)' }} 
             />
             {/* 游戏内容绘制层 */}
             <canvas
               ref={canvasRef}
               className="absolute w-auto h-full max-w-full object-contain z-10 pointer-events-none"
             />
             
             {/* --- HUD (抬头显示) --- */}
             {/* 仅在游戏进行或升级时显示 */}
             {(gameStatus === 'PLAYING' || gameStatus === 'LEVEL_UP') && (
               <>
                  <div className="absolute top-6 left-6 z-30 flex flex-col gap-2">
                    {/* 分数显示 */}
                    <div className="bg-zinc-900/80 backdrop-blur-md border border-yellow-500/30 p-4 rounded-xl flex items-center gap-4 shadow-lg shadow-yellow-500/10">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                        <Trophy size={20} />
                      </div>
                      <div>
                        <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider">Score</p>
                        <p className="text-2xl font-black text-white font-mono leading-none">{score}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                        {/* 关卡显示 */}
                        <div className="bg-zinc-900/80 backdrop-blur-md border border-cyan-500/30 p-2 px-4 rounded-xl flex items-center gap-3">
                        <span className="text-cyan-400 font-bold text-xl font-mono">Lv.{level}</span>
                        <div className="h-4 w-[1px] bg-zinc-700"></div>
                        <span className="text-xs text-zinc-400">每关10分</span>
                        </div>
                        
                        {/* 炸弹数量 HUD */}
                        <div className={`bg-zinc-900/80 backdrop-blur-md border ${bombsRemaining > 0 ? 'border-red-500/30' : 'border-zinc-700'} p-2 px-4 rounded-xl flex items-center gap-3`}>
                            <Bomb size={20} className={bombsRemaining > 0 ? "text-red-500 fill-red-500/20" : "text-zinc-600"} />
                            <span className={`font-bold text-xl font-mono ${bombsRemaining > 0 ? "text-red-400" : "text-zinc-600"}`}>
                                x{bombsRemaining}
                            </span>
                        </div>
                    </div>
                  </div>

                  {/* 右上角状态与控制 */}
                  <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
                    <div className="bg-black/50 backdrop-blur text-green-400 border border-green-500/30 px-3 py-1 rounded text-xs font-mono flex items-center gap-2">
                      <Play size={10} className="fill-green-400" />
                      LIVE
                    </div>
                    <button 
                      onClick={resetToStandby}
                      className="bg-black/50 backdrop-blur text-zinc-400 border border-zinc-700 hover:bg-zinc-800 px-3 py-1 rounded text-xs font-mono flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw size={10} />
                      退出
                    </button>
                  </div>
               </>
             )}
             
             {/* 底部操作提示 */}
             {gameStatus === 'PLAYING' && (
                <div className="absolute bottom-6 left-6 z-20 opacity-50">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono bg-black/40 p-2 rounded">
                      <Bomb size={12} /> 五指炸弹 | <Hand size={12} /> 双指抓取
                  </div>
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};