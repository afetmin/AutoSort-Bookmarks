import type { ExtensionSettings } from './types';

export const STORAGE_KEYS = {
  jobs: 'bookmark-ai:jobs',
  settings: 'bookmark-ai:settings',
} as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  inputMaxChars: 6000,
  pendingFolderName: 'Bookmark Inbox',
};

export const MAX_JOB_HISTORY = 20;
export const JOB_LIST_LIMIT = 20;
export const MAX_FOLDER_DEPTH = 2;
export const MIN_CONFIDENCE = 0.45;
export const DEFAULT_CAPTURE_EXCERPT_LENGTH = 280;
export const MODEL_REQUEST_TIMEOUT_MS = 10000;

export const MESSAGE_TYPES = {
  capturePage: 'bookmark-ai:capture-page',
  showToast: 'bookmark-ai:show-toast',
  getManagementSnapshot: 'bookmark-ai:get-management-snapshot',
  getPopupSnapshot: 'bookmark-ai:get-popup-snapshot',
  getSettings: 'bookmark-ai:get-settings',
  saveSettings: 'bookmark-ai:save-settings',
  retryJob: 'bookmark-ai:retry-job',
} as const;
