import type { CenterToastPayload } from './types';

export type CenterToastController = {
  show: (payload: CenterToastPayload) => void;
  hide: () => void;
};

let controller: CenterToastController | null = null;

export function registerCenterToastController(next: CenterToastController | null) {
  controller = next;
}

export function showCenterToast(payload: CenterToastPayload) {
  controller?.show(payload);
}

export function hideCenterToast() {
  controller?.hide();
}
