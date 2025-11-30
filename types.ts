export enum DemoId {
  HAND_TRACKING = 'HAND_TRACKING',
  DASHBOARD = 'DASHBOARD',
}

export interface DemoItem {
  id: DemoId;
  label: string;
  icon: React.ReactNode;
  description: string;
}
