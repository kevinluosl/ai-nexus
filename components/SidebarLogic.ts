import { DemoId } from '../types';

/**
 * 侧边栏菜单项数据接口
 * 定义了侧边栏每个导航按钮所需的数据结构
 */
export interface SidebarItemData {
  /** 
   * Demo 的唯一标识符，用于路由切换 
   */
  id: DemoId;
  
  /** 
   * 显示在侧边栏的主要标题 
   */
  label: string;
  
  /** 
   * 显示在标题下方的简短描述 (仅在侧边栏展开时可见) 
   */
  description: string;
  
  /** 
   * 图标名称映射字符串，用于在 UI 组件中动态加载 Lucide 图标 
   */
  iconName: 'LayoutDashboard' | 'Hand';
}

/**
 * 侧边栏菜单配置常量
 * 这是一个静态配置数组，定义了导航栏中显示的各个 Demo 项目。
 * 如果需要添加新的 Demo，请在此数组中追加配置对象。
 */
export const SIDEBAR_MENU_ITEMS: SidebarItemData[] = [
  {
    id: DemoId.DASHBOARD,
    label: '首页',
    iconName: 'LayoutDashboard',
    description: 'AI编程项目集合'
  },
  {
    id: DemoId.HAND_TRACKING,
    label: '手部跟踪',
    iconName: 'Hand',
    description: '像素大作战'
  },
];