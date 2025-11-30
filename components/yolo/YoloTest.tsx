import React, { useCallback } from 'react';
import { useYoloTest, DetectionResult } from './YoloTestLogic';
import { UploadCloud, ScanEye, RefreshCw, AlertTriangle, Loader2, Image as ImageIcon, Box } from 'lucide-react';

export const YoloTest: React.FC = () => {
  const {
    selectedFile,
    previewUrl,
    resultImage,
    detections,
    loading,
    error,
    handleFileChange,
    detectObjects,
    reset
  } = useYoloTest();

  // 处理拖拽上传
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, [handleFileChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="h-full w-full flex flex-col p-6 overflow-y-auto">
      {/* --- Header --- */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <span className="w-2 h-8 bg-purple-500 rounded-sm inline-block"></span>
          YOLO 目标检测
        </h2>
        <p className="text-zinc-400">
          上传图片，体验基于 YOLOv8 的实时对象识别与分类。支持多种物体同时检测。
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        
        {/* --- 左侧: 上传与控制区 --- */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          
          {/* 上传区域 */}
          <div 
            className={`
              relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px]
              ${selectedFile ? 'border-purple-500/50 bg-purple-500/5' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input 
              id="file-upload"
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            
            {selectedFile ? (
              <div className="z-10 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon size={32} />
                </div>
                <p className="font-bold text-white truncate max-w-[200px]">{selectedFile.name}</p>
                <p className="text-sm text-zinc-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                <p className="text-xs text-purple-400 mt-2">点击更换图片</p>
              </div>
            ) : (
              <div className="text-zinc-500">
                <UploadCloud size={48} className="mx-auto mb-4 text-zinc-600" />
                <p className="text-lg font-semibold text-zinc-300">点击或拖拽上传</p>
                <p className="text-sm mt-1">支持 JPG, PNG, GIF</p>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={detectObjects}
              disabled={!selectedFile || loading}
              className={`
                flex-1 py-3 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all
                ${!selectedFile || loading 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:scale-[1.02]'}
              `}
            >
              {loading ? <Loader2 className="animate-spin" /> : <ScanEye />}
              {loading ? '正在检测...' : '开始检测'}
            </button>
            
            <button
              onClick={reset}
              disabled={loading || !selectedFile}
              className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl border border-zinc-700 transition-colors disabled:opacity-50"
              title="重置"
            >
              <RefreshCw size={20} />
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 animate-in slide-in-from-top-2">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <div className="text-sm">{error}</div>
            </div>
          )}

          {/* 检测结果列表 */}
          {detections.length > 0 && (
            <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 overflow-hidden flex flex-col">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>检测结果</span>
                <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs">{detections.length} 个目标</span>
              </h3>
              <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {detections.map((det, idx) => (
                  <div key={idx} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center group hover:border-purple-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">
                         <Box size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-zinc-200 capitalize">{det.class}</div>
                        <div className="text-xs text-zinc-500 font-mono">
                          坐标: [{Math.round(det.bbox[0])}, {Math.round(det.bbox[1])}]
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-sm font-bold text-green-400">{(det.confidence * 100).toFixed(1)}%</div>
                       <div className="text-[10px] text-zinc-600">置信度</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* --- 右侧: 图像显示区 --- */}
        <div className="flex-1 bg-black/40 rounded-2xl border border-zinc-800 p-1 flex items-center justify-center relative overflow-hidden min-h-[400px]">
          
          {!previewUrl ? (
            <div className="text-zinc-600 flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-800 flex items-center justify-center mb-4">
                <ImageIcon size={40} className="opacity-50" />
              </div>
              <p>暂无图片预览</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col">
               {/* 图片容器 */}
               <div className="flex-1 relative overflow-hidden rounded-xl flex items-center justify-center bg-zinc-950/50">
                  {/* 底层：原始图片 (当没有结果时显示) */}
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${resultImage ? 'opacity-0 absolute' : 'opacity-100'}`} 
                  />
                  
                  {/* 顶层：结果图片 (检测完成后覆盖显示) */}
                  {resultImage && (
                    <img 
                      src={resultImage} 
                      alt="Detection Result" 
                      className="max-w-full max-h-full object-contain animate-in fade-in duration-500 relative z-10" 
                    />
                  )}
               </div>

               {/* 底部状态条 */}
               <div className="h-12 bg-zinc-900 border-t border-zinc-800 flex items-center px-4 justify-between shrink-0">
                  <div className="text-xs text-zinc-500 font-mono">
                    {loading ? '正在处理...' : resultImage ? '检测完成' : '等待检测'}
                  </div>
                  {resultImage && (
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                       <span className="text-xs text-green-400">已标注</span>
                    </div>
                  )}
               </div>
            </div>
          )}
          
          {/* Loading 遮罩 */}
          {loading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
              <p className="text-purple-200 font-bold tracking-widest animate-pulse">AI 正在识别...</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};