import { getLanguage, pickText, type LocalizedString } from '@/ui/i18n';
import { hideCenterToast, showCenterToast } from '@/ui/toast/centerToastController';

export type NotifyType = 'success' | 'error' | 'warning' | 'info';

type TextLike = string | LocalizedString;

export type NotifyOptions = {
  title: TextLike;
  message?: TextLike;
  durationMs?: number;
};

function show(type: NotifyType, { title, message, durationMs }: NotifyOptions) {
  const lang = getLanguage();
  showCenterToast({
    type,
    title: pickText(title, lang),
    message: message ? pickText(message, lang) : undefined,
    durationMs,
  });
}

export const notify = {
  success: (title: TextLike, message?: TextLike, durationMs?: number) =>
    show('success', { title, message, durationMs }),
  error: (title: TextLike, message?: TextLike, durationMs?: number) =>
    show('error', { title, message, durationMs }),
  warning: (title: TextLike, message?: TextLike, durationMs?: number) =>
    show('warning', { title, message, durationMs }),
  info: (title: TextLike, message?: TextLike, durationMs?: number) =>
    show('info', { title, message, durationMs }),
  hide: () => hideCenterToast(),
};
