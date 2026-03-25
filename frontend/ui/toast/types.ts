export type CenterToastType = 'success' | 'error' | 'warning' | 'info';

export type CenterToastPayload = {
  type: CenterToastType;
  title: string;
  message?: string;
  durationMs?: number;
};
