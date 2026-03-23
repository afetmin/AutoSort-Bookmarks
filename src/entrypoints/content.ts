import { Readability } from '@mozilla/readability';

import browser from '../shared/browser';
import { DEFAULT_CAPTURE_EXCERPT_LENGTH, MESSAGE_TYPES } from '../shared/constants';
import type { CapturePageRequest, PageCapture, RuntimeRequest, ShowToastRequest } from '../shared/types';
import { cleanText, truncate } from '../shared/utils';

function getMetaContent(selector: string): string {
  return cleanText(document.querySelector<HTMLMetaElement>(selector)?.content);
}

function fallbackReadableText(maxChars: number): string {
  const textBlocks = Array.from(document.querySelectorAll('main p, article p, p, li'))
    .map((element) => cleanText(element.textContent))
    .filter((value) => value.length > 40);

  return truncate(textBlocks.join('\n\n'), maxChars);
}

function extractPageContent(maxChars: number): PageCapture {
  const clonedDocument = document.cloneNode(true) as Document;
  const article = new Readability(clonedDocument).parse();
  const readableText = truncate(cleanText(article?.textContent) || fallbackReadableText(maxChars), maxChars);
  const metaDescription =
    getMetaContent('meta[name="description"]') || getMetaContent('meta[property="og:description"]');
  const excerpt = truncate(cleanText(article?.excerpt) || readableText, DEFAULT_CAPTURE_EXCERPT_LENGTH);

  return {
    title: cleanText(article?.title) || cleanText(document.title),
    url: window.location.href,
    metaDescription,
    excerpt,
    readableText,
    contentSource: article?.textContent ? 'readability' : readableText ? 'dom' : 'fallback',
    capturedAt: new Date().toISOString(),
  };
}

function ensureToastHost(): HTMLDivElement {
  let host = document.getElementById('bookmark-ai-toast-host') as HTMLDivElement | null;

  if (!host) {
    host = document.createElement('div');
    host.id = 'bookmark-ai-toast-host';
    host.style.cssText = [
      'position:fixed',
      'top:16px',
      'right:16px',
      'z-index:2147483647',
      'display:flex',
      'flex-direction:column',
      'gap:10px',
      'pointer-events:none',
      'font-family:"Avenir Next","Segoe UI",sans-serif',
    ].join(';');
    document.documentElement.appendChild(host);
  }

  return host;
}

function renderToast(request: ShowToastRequest): void {
  const host = ensureToastHost();
  const toast = document.createElement('div');
  const accent = request.tone === 'success' ? '#2f8fd9' : request.tone === 'error' ? '#c45b6a' : '#6d7f95';

  toast.style.cssText = [
    'min-width:240px',
    'max-width:296px',
    'padding:12px 14px',
    'border-radius:6px',
    'background:rgba(249,251,255,0.82)',
    'backdrop-filter:blur(14px)',
    '-webkit-backdrop-filter:blur(14px)',
    'color:#1d2736',
    'box-shadow:0 8px 20px rgba(32,55,90,0.1)',
    'border:1px solid rgba(166,186,210,0.92)',
    'transform:translateY(-8px)',
    'opacity:0',
    'transition:opacity 180ms ease, transform 180ms ease',
  ].join(';');

  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:5px;">
      <span style="display:inline-flex;width:10px;height:10px;border-radius:999px;background:${accent};box-shadow:0 0 0 6px ${accent}20;"></span>
      <strong style="font-size:14px;line-height:1.2;">${request.title}</strong>
    </div>
    <div style="font-size:13px;line-height:1.45;color:#5e6b7d;">${request.message}</div>
  `;

  host.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      toast.remove();
    }, 220);
  }, 2600);
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  main() {
    browser.runtime.onMessage.addListener((message: RuntimeRequest) => {
      if (message?.type === MESSAGE_TYPES.capturePage) {
        const request = message as CapturePageRequest;
        return Promise.resolve(extractPageContent(request.maxChars));
      }

      if (message?.type === MESSAGE_TYPES.showToast) {
        renderToast(message as ShowToastRequest);
      }

      return undefined;
    });
  },
});
