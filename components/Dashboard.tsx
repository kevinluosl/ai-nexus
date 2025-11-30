import React from 'react';
import { Sparkles, ArrowRight, Hand } from 'lucide-react';
import { DemoId } from '../types';
import { DASHBOARD_CONTENT } from './DashboardLogic';

interface DashboardProps {
  onNavigate: (id: DemoId) => void;
}

// Static mapping for Tailwind classes to ensure they are detected by the scanner/CDN
const COLOR_VARIANTS: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

/**
 * 首页组件 (视图层)
 * 展示欢迎信息和 Demo 入口卡片
 */
export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { header, sectionTitle, cards, techStack } = DASHBOARD_CONTENT;

  return (
    <div className="h-full w-full flex flex-col p-12 overflow-y-auto">
       <div className="max-w-4xl mx-auto w-full">
          {/* Header Section */}
          <div className="mb-12">
            <h1 className="text-5xl font-black text-white mb-6 tracking-tight leading-tight">
              {header.titlePrefix} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">{header.titleGradient}</span><br />
              {header.titleSuffix}
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed">
              {header.description}
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-500 rounded-full"></span>
              {sectionTitle}
            </h2>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card, index) => {
              if (card.isPlaceholder) {
                return (
                  <div key={index} className="p-6 rounded-xl bg-zinc-900 border border-dashed border-zinc-800 opacity-60">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 text-zinc-600 flex items-center justify-center mb-4">
                      <div className="w-6 h-6 rounded-full border-2 border-zinc-600" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-400 mb-2">{card.title}</h3>
                    <p className="text-zinc-600 mb-4 h-20">{card.description}</p>
                    <div className="text-zinc-600 text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                      {card.placeholderText}
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={index}
                  onClick={() => card.id && onNavigate(card.id as DemoId)}
                  className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-800/50 cursor-pointer transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Hand size={120} />
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-cyan-900/30 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-zinc-500 mb-4 h-20">{card.description}</p>
                  <div className="text-cyan-500 text-sm font-semibold flex items-center gap-2">
                    立即体验 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Tech Stack Footer */}
          <div className="mt-12 p-6 rounded-lg bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800/50">
             <h4 className="text-zinc-500 text-xs font-mono uppercase mb-4">技术架构 (Tech Stack)</h4>
             <div className="flex flex-wrap gap-2">
                {techStack.map((tech, index) => {
                  const colorClass = COLOR_VARIANTS[tech.color] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
                  return (
                    <span key={index} className={`px-3 py-1 rounded-full border text-xs font-mono ${colorClass}`}>
                      {tech.label}
                    </span>
                  );
                })}
             </div>
          </div>
       </div>
    </div>
  );
};