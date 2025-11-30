import React from 'react';
import { DemoId } from '../types';
import { Hand, LayoutDashboard, Cpu } from 'lucide-react';
import { SIDEBAR_MENU_ITEMS, SidebarItemData } from './SidebarLogic';

interface SidebarProps {
  activeDemo: DemoId;
  onSelectDemo: (id: DemoId) => void;
}

/**
 * 图标映射组件
 * 根据逻辑层提供的 iconName 渲染对应的 Lucide 图标
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
 * 渲染左侧导航菜单
 */
export const Sidebar: React.FC<SidebarProps> = ({ activeDemo, onSelectDemo }) => {
  return (
    <div className="w-64 h-full bg-zinc-900/90 border-r border-zinc-800 flex flex-col backdrop-blur-md">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Cpu size={20} />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-wider text-white">AI NEXUS</h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Glint LABS v1.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {SIDEBAR_MENU_ITEMS.map((item) => {
          const isActive = activeDemo === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectDemo(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group text-left
                ${isActive 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-transparent'
                }
              `}
            >
              <span className={`${isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                <IconRenderer name={item.iconName} />
              </span>
              <div>
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-[10px] opacity-70 truncate max-w-[140px]">{item.description}</div>
              </div>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-zinc-400">系统在线</span>
          </div>
          <div className="text-[10px] text-zinc-600 font-mono">
            GPU 加速: 开启
          </div>
        </div>
      </div>
    </div>
  );
};
