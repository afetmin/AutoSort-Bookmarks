import browser from '../../shared/browser';
import type { Browser } from '@wxt-dev/browser';
import { MESSAGE_TYPES } from '../../shared/constants';
import type { CapturePageRequest, PageCapture } from '../../shared/types';
import { cleanText, normalizeUrlForMatch, truncate } from '../../shared/utils';

function fallbackCapture(title: string, url: string): PageCapture {
  return {
    title: cleanText(title),
    url,
    metaDescription: '',
    excerpt: cleanText(title),
    readableText: cleanText(title),
    contentSource: 'fallback',
    capturedAt: new Date().toISOString(),
  };
}

async function findMatchingTab(url: string): Promise<Browser.tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({});
  const target = normalizeUrlForMatch(url);

  return tabs.find((tab: Browser.tabs.Tab) => !!tab.url && normalizeUrlForMatch(tab.url) === target);
}

function normalizeCapture(capture: PageCapture, title: string, url: string, maxChars: number): PageCapture {
  const readableText = truncate(cleanText(capture.readableText), maxChars);
  const metaDescription = cleanText(capture.metaDescription);
  const excerpt = cleanText(capture.excerpt || readableText.slice(0, 280));

  if (!readableText) {
    return fallbackCapture(title, url);
  }

  return {
    title: cleanText(capture.title) || cleanText(title),
    url,
    metaDescription,
    excerpt,
    readableText,
    contentSource: capture.contentSource,
    capturedAt: new Date().toISOString(),
  };
}

export async function captureBookmarkContent(
  title: string,
  url: string,
  maxChars: number,
): Promise<PageCapture> {
  const matchingTab = await findMatchingTab(url);

  if (!matchingTab?.id) {
    return fallbackCapture(title, url);
  }

  try {
    const message: CapturePageRequest = {
      type: MESSAGE_TYPES.capturePage,
      maxChars,
    };

    const response = (await browser.tabs.sendMessage(matchingTab.id, message)) as PageCapture | undefined;

    if (!response) {
      return fallbackCapture(title, url);
    }

    return normalizeCapture(response, title, url, maxChars);
  } catch {
    return fallbackCapture(title, url);
  }
}
