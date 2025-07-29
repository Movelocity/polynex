import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function copyToClipboard(text: string) {
  let textArea: HTMLTextAreaElement | null = null;
  let success = false;
  try {
    textArea = document.createElement("textarea");
    textArea.value = text;
    // 使文本区域在屏幕外，防止干扰视图
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    success = document.execCommand('copy');
  } catch (err) {
    console.error('写入剪贴板失败', err);
  } finally {
    if (textArea) {
      document.body.removeChild(textArea);
    }
  }
  return success;
}