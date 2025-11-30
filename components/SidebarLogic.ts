import { DemoId } from '../types';

/**
 * 侧边栏菜单项数据接口
 */
export interface SidebarItemData {
  id: DemoId;
  label: string;
  description: string;
  iconName: 'LayoutDashboard' | 'Hand';
}

/**
 * 侧边栏菜单配置
 * 定义了导航栏中显示的各个 Demo 项目
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
