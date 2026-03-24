import { MIN_CONFIDENCE, MODEL_REQUEST_TIMEOUT_MS } from '../../shared/constants';
import type {
  BookmarkFolderPath,
  ClassificationResult,
  ExtensionSettings,
  PageCapture,
} from '../../shared/types';
import { cleanText, normalizeFolderSegment, serializePath, truncate } from '../../shared/utils';

interface QueryIntent {
  query: string;
}

function buildChatCompletionsUrl(endpoint: string): string {
  const trimmed = endpoint.trim();

  if (!trimmed) {
    throw new Error('API endpoint is required');
  }

  if (trimmed.endsWith('/chat/completions')) {
    return trimmed;
  }

  return `${trimmed.replace(/\/$/, '')}/chat/completions`;
}

function extractApiErrorMessage(payload: unknown, fallback: string): string {
  const data = payload as {
    error?: {
      message?: string;
    };
  };

  return cleanText(data?.error?.message) || fallback;
}

async function requestChatCompletion(
  settings: ExtensionSettings,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
): Promise<unknown> {
  if (!settings.apiKey) {
    throw new Error('API key is missing');
  }

  if (!settings.model) {
    throw new Error('Model is missing');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildChatCompletionsUrl(settings.apiEndpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: settings.model,
        temperature: settings.temperature,
        messages,
      }),
    });

    const payload = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new Error(extractApiErrorMessage(payload, `Model request failed with ${response.status}`));
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Model request timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(
  capture: PageCapture,
  folders: BookmarkFolderPath[],
  inputMaxChars: number,
  pendingFolderName: string,
): string {
  const queryIntent = extractQueryIntent(capture.url, capture.title);
  const folderLines = folders.length
    ? folders.map((folder) => `- ${folder.displayPath}`).join('\n')
    : '- No existing folders yet';

  return [
    'You classify browser bookmarks into bookmark folders.',
    'Return strict JSON only with this shape:',
    '{"targetPath":["Folder","Optional Subfolder"],"confidence":0.0,"summary":"short reason"}',
    'Rules:',
    '- targetPath must contain one or two non-empty segments',
    '- choose the best folder path based on page content, do not force an existing folder when it is semantically unrelated',
    '- never return a third level folder',
    `- never use the reserved pending folder named "${pendingFolderName}"`,
    '- ignore ads, sidebars, trending modules, unrelated snippets, and generic navigation text',
    '- classify by the core topic of the page, not by incidental named entities that appear in snippets',
    queryIntent
      ? '- if the page is a search results page, classify by the underlying query topic instead of the visible result snippets'
      : '- when page text is noisy, trust the title and meta description more than unrelated body fragments',
    '- confidence must be a number between 0 and 1',
    '',
    queryIntent ? 'Page type: likely search results page' : 'Page type: regular webpage',
    queryIntent ? `Search query: ${queryIntent.query}` : 'Search query: N/A',
    `Page title: ${capture.title}`,
    `Page url: ${capture.url}`,
    `Meta description: ${capture.metaDescription || 'N/A'}`,
    `Excerpt: ${capture.excerpt || 'N/A'}`,
    `Readable text:\n${truncate(capture.readableText, inputMaxChars) || 'N/A'}`,
    '',
    'Available folders:',
    folderLines,
  ].join('\n');
}

function parseSearchQuery(url: URL): string {
  const candidateKeys = ['wd', 'word', 'q', 'query', 'keyword', 'search', 'text'];

  for (const key of candidateKeys) {
    const value = cleanText(url.searchParams.get(key));

    if (value) {
      return value;
    }
  }

  return '';
}

function hasSearchSignals(titleValue: string, pathname: string, queryKeys: string[]): boolean {
  const loweredTitle = titleValue.toLowerCase();
  const loweredPath = pathname.toLowerCase();

  if (
    loweredTitle.includes('搜索') ||
    loweredTitle.includes('搜索结果') ||
    loweredTitle.includes('search') ||
    loweredTitle.includes('results')
  ) {
    return true;
  }

  if (/(^|\/)(search|query|find|results?|s)(\/|$)/i.test(loweredPath)) {
    return true;
  }

  return queryKeys.length > 0;
}

function extractQueryIntent(urlValue: string, titleValue: string): QueryIntent | null {
  try {
    const url = new URL(urlValue);
    const query = parseSearchQuery(url);
    const queryKeys = ['wd', 'word', 'q', 'query', 'keyword', 'search', 'text'].filter((key) =>
      cleanText(url.searchParams.get(key)),
    );

    if (!query) {
      return null;
    }

    if (hasSearchSignals(titleValue, url.pathname, queryKeys)) {
      return { query };
    }

    return null;
  } catch {
    return null;
  }
}

function extractAssistantText(payload: unknown): string {
  const data = payload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part?.text ?? '')
      .join('')
      .trim();
  }

  return '';
}

function extractJson(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model response did not include JSON');
  }

  return raw.slice(start, end + 1);
}

function normalizeTargetPath(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((segment) => normalizeFolderSegment(String(segment))).filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(/[>/|]+|\/+/)
      .map((segment) => normalizeFolderSegment(segment))
      .filter(Boolean);
  }

  return [];
}

function validateResult(rawText: string): ClassificationResult {
  const parsed = JSON.parse(extractJson(rawText)) as Record<string, unknown>;
  const targetPath = normalizeTargetPath(parsed.targetPath ?? parsed.path ?? parsed.folderPath);
  const confidenceRaw = Number(parsed.confidence ?? 0);
  const confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw;
  const summary = cleanText(String(parsed.summary ?? parsed.reason ?? '') || serializePath(targetPath));

  if (targetPath.length === 0) {
    throw new Error('Model returned an empty folder path');
  }

  if (targetPath.length > 2) {
    throw new Error('Model returned a folder path deeper than two levels');
  }

  if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) {
    throw new Error(`Model confidence ${confidenceRaw} is below the accepted threshold`);
  }

  return {
    targetPath,
    confidence,
    summary,
    rawResponse: rawText,
  };
}

export async function classifyBookmark(
  settings: ExtensionSettings,
  capture: PageCapture,
  folders: BookmarkFolderPath[],
): Promise<ClassificationResult> {
  const payload = await requestChatCompletion(settings, [
    {
      role: 'system',
      content: 'You are a strict bookmark-folder classifier. Return JSON only and obey the folder depth rules.',
    },
    {
      role: 'user',
      content: buildPrompt(capture, folders, settings.inputMaxChars, settings.pendingFolderName),
    },
  ]);
  const rawText = extractAssistantText(payload);

  if (!rawText) {
    throw new Error('Model response did not contain message content');
  }

  return validateResult(rawText);
}

export async function testModelSettings(settings: ExtensionSettings): Promise<void> {
  const payload = await requestChatCompletion(settings, [
    {
      role: 'system',
      content: 'You are validating API connectivity for a browser extension settings page.',
    },
    {
      role: 'user',
      content: 'Reply with OK only.',
    },
  ]);
  const rawText = extractAssistantText(payload);

  if (!rawText) {
    throw new Error('Model response did not contain message content');
  }
}
