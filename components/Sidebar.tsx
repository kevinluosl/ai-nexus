import React from 'react';
import { DemoId } from '../types';
import { Hand, LayoutDashboard, Cpu, ChevronLeft, ChevronRight } from 'lucide-react';
import { SIDEBAR_MENU_ITEMS, SidebarItemData } from './SidebarLogic';

/**
 * 侧边栏组件 Props 接口定义
 */
interface SidebarProps {
  /** 当前激活选中的 Demo ID */
  activeDemo: DemoId;
  
  /** 切换 Demo 的回调函数 */
  onSelectDemo: (id: DemoId) => void;
  
  /** 侧边栏是否处于折叠状态 */
  isCollapsed: boolean;
  
  /** 切换折叠/展开状态的回调函数 */
  onToggle: () => void;
}

/**
 * 图标渲染辅助组件
 * 根据传入的字符串名称动态渲染对应的 Lucide React 图标组件。
 * 
 * @param name - 图标名称
 * @param size - 图标尺寸 (默认 20px)
 */
const IconRenderer: React.FC<{ name: SidebarItemData['iconName']; size?: number }> = ({ name, size = 20 }) => {
  switch (name) {
    case 'LayoutDashboard': return <LayoutDashboard size={size} />;
    case 'Hand': return <Hand size={size} />;
    default: return null;
  }
};

/**
 * 侧边栏组件 (视图层)
 * 负责渲染应用的左侧导航区域，支持响应式展开和收缩动画。
 */
export const Sidebar: React.FC<SidebarProps> = ({ activeDemo, onSelectDemo, isCollapsed, onToggle }) => {
  return (
    <div 
      // 容器样式：
      // h-full: 占满高度
      // backdrop-blur-md: 毛玻璃效果背景
      // transition-all: 处理宽度变化的平滑过渡
      className={`
        h-full bg-zinc-900/90 border-r border-zinc-800 flex flex-col backdrop-blur-md transition-all duration-300 ease-in-out relative z-50
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* --- 顶部 Header 区域 --- */}
      <div className={`p-6 border-b border-zinc-800 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} overflow-hidden`}>
        {/* Logo 图标 */}
        <div className="w-8 h-8 min-w-[32px] rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Cpu size={20} />
        </div>
        
        {/* 标题文字 (折叠时隐藏) */}
        <div className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
          <h1 className="font-bold text-lg tracking-wider text-white whitespace-nowrap">AI NEXUS</h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest whitespace-nowrap">Glint LABS v1.0</p>
        </div>
      </div>

      {/* --- 导航菜单区域 --- */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1">
        {SIDEBAR_MENU_ITEMS.map((item) => {
          const isActive = activeDemo === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectDemo(item.id)}
              // 按钮样式：
              // 根据 isActive 状态切换选中/未选中的背景色和边框
              // group 类用于处理内部元素的 hover 状态
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-3 rounded-lg transition-all duration-200 group text-left relative
                ${isActive 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-transparent'
                }
              `}
              title={isCollapsed ? item.label : undefined} // 折叠时鼠标悬停显示 tooltip
            >
              {/* 图标 */}
              <span className={`${isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                <IconRenderer name={item.iconName} size={24} />
              </span>
              
              {/* 文本区域 (折叠时隐藏) */}
              <div className={`transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                <div className="font-medium text-sm whitespace-nowrap">{item.label}</div>
                <div className="text-[10px] opacity-70 truncate max-w-[140px]">{item.description}</div>
              </div>
              
              {/* 选中状态指示点 (仅在展开时显示) */}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* --- 底部 Footer / 折叠开关区域 --- */}
      <div className="p-4 border-t border-zinc-800 flex flex-col gap-4">
         {/* 系统状态信息 (仅在展开时显示) */}
         {!isCollapsed && (
          <div className="p-3 rounded bg-zinc-950 border border-zinc-800 transition-opacity duration-300">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-zinc-400 whitespace-nowrap">系统在线</span>
            </div>
            <div className="text-[10px] text-zinc-600 font-mono whitespace-nowrap">
              GPU 加速: 开启
            </div>
          </div>
         )}

         {/* 折叠/展开按钮 */}
         <button 
           onClick={onToggle}
           className="w-full flex items-center justify-center p-2 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
         >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
         </button>
      </div>
    </div>
  );
};