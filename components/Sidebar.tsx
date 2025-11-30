import React from 'react';
import { DemoId } from '../types';
import { Hand, LayoutDashboard, Cpu, ChevronLeft, ChevronRight } from 'lucide-react';
import { SIDEBAR_MENU_ITEMS, SidebarItemData } from './SidebarLogic';

interface SidebarProps {
  activeDemo: DemoId;
  onSelectDemo: (id: DemoId) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

/**
 * 图标映射组件
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
 * 支持展开/收缩
 */
export const Sidebar: React.FC<SidebarProps> = ({ activeDemo, onSelectDemo, isCollapsed, onToggle }) => {
  return (
    <div 
      className={`
        h-full bg-zinc-900/90 border-r border-zinc-800 flex flex-col backdrop-blur-md transition-all duration-300 ease-in-out relative z-50
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Header */}
      <div className={`p-6 border-b border-zinc-800 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} overflow-hidden`}>
        <div className="w-8 h-8 min-w-[32px] rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Cpu size={20} />
        </div>
        
        <div className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
          <h1 className="font-bold text-lg tracking-wider text-white whitespace-nowrap">AI NEXUS</h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest whitespace-nowrap">Glint LABS v1.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1">
        {SIDEBAR_MENU_ITEMS.map((item) => {
          const isActive = activeDemo === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectDemo(item.id)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-3 rounded-lg transition-all duration-200 group text-left relative
                ${isActive 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-transparent'
                }
              `}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={`${isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                <IconRenderer name={item.iconName} size={24} />
              </span>
              
              <div className={`transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                <div className="font-medium text-sm whitespace-nowrap">{item.label}</div>
                <div className="text-[10px] opacity-70 truncate max-w-[140px]">{item.description}</div>
              </div>
              
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-4 border-t border-zinc-800 flex flex-col gap-4">
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