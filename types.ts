export enum DemoId {
  HAND_TRACKING = 'HAND_TRACKING',
  YOLO_TEST = 'YOLO_TEST',
  DASHBOARD = 'DASHBOARD',
}

export interface DemoItem {
  id: DemoId;
  label: string;
  icon: React.ReactNode;
  description: string;
}