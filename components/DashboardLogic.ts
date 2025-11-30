import { DemoId } from '../types';

/**
 * 首页内容配置
 * 包含标题、描述和卡片数据
 */
export const DASHBOARD_CONTENT = {
  header: {
    titlePrefix: 'AI',
    titleGradient: '编程能力展示',
    titleSuffix: '及开源项目探索',
    description: '探索浏览器端人工智能的前沿技术。本平台旨在创造各种 Demo，展示实时计算机视觉、生成式模型以及相关开源项目在 Web 环境下的无限可能性。'
  },
  sectionTitle: '推荐 Demo',
  cards: [
    {
      id: DemoId.HAND_TRACKING,
      title: '手部跟踪 (Hand Tracking)',
      description: '基于 MediaPipe 的高性能手部骨骼检测，完全在客户端运行，利用 WebAssembly 和 GPU 加速实现实时交互。',
      iconType: 'Hand',
      isPlaceholder: false
    },
    {
      id: 'LLM_PLACEHOLDER',
      title: '生成式 LLM',
      description: '基于 Gemini 2.5 Flash 的自然语言处理与生成能力展示。',
      iconType: 'Sparkles',
      isPlaceholder: true,
      placeholderText: '敬请期待'
    }
  ],
  techStack: [
    { label: 'React 19', color: 'blue' },
    { label: 'Tailwind CSS', color: 'cyan' },
    { label: 'MediaPipe / TensorFlow', color: 'amber' },
    { label: 'WebGL', color: 'purple' }
  ]
};
