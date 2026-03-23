import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../../shared/constants';
import browser from '../../shared/browser';
import type { ExtensionSettings } from '../../shared/types';
import { clamp, cleanText } from '../../shared/utils';

function normalizeSettings(input?: Partial<ExtensionSettings>): ExtensionSettings {
  return {
    apiEndpoint: cleanText(input?.apiEndpoint || DEFAULT_SETTINGS.apiEndpoint),
    apiKey: cleanText(input?.apiKey || ''),
    model: cleanText(input?.model || DEFAULT_SETTINGS.model),
    temperature: clamp(Number(input?.temperature ?? DEFAULT_SETTINGS.temperature), 0, 1),
    inputMaxChars: clamp(Number(input?.inputMaxChars ?? DEFAULT_SETTINGS.inputMaxChars), 1200, 12000),
    pendingFolderName: cleanText(input?.pendingFolderName || DEFAULT_SETTINGS.pendingFolderName),
  };
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await browser.storage.local.get(STORAGE_KEYS.settings);
  return normalizeSettings(stored[STORAGE_KEYS.settings] as Partial<ExtensionSettings> | undefined);
}

export async function saveSettings(input: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const next = normalizeSettings({
    ...current,
    ...input,
  });

  await browser.storage.local.set({
    [STORAGE_KEYS.settings]: next,
  });

  return next;
}

export function hasRequiredApiSettings(settings: ExtensionSettings): boolean {
  return Boolean(settings.apiEndpoint && settings.apiKey && settings.model);
}
