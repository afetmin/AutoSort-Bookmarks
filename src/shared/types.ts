export type JobStatus = 'queued' | 'capturing' | 'classifying' | 'moving' | 'complete' | 'failed';

export interface ExtensionSettings {
  apiEndpoint: string;
  apiKey: string;
  model: string;
  temperature: number;
  inputMaxChars: number;
  pendingFolderName: string;
}

export interface PageCapture {
  title: string;
  url: string;
  metaDescription: string;
  excerpt: string;
  readableText: string;
  contentSource: 'readability' | 'dom' | 'fallback';
  capturedAt: string;
}

export interface BookmarkFolderPath {
  id: string;
  title: string;
  depth: 1 | 2;
  segments: string[];
  displayPath: string;
}

export interface FolderCatalogRoot {
  id: string;
  title: string;
  paths: BookmarkFolderPath[];
}

export interface ClassificationResult {
  targetPath: string[];
  confidence: number;
  summary: string;
  reasoning?: string;
  rawResponse?: string;
}

export interface BookmarkJob {
  id: string;
  bookmarkId: string;
  url: string;
  title: string;
  sourceRootId: string | null;
  triggerSource?: 'action' | 'bookmark-created';
  triggerTabId?: number;
  status: JobStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastAttemptAt?: string;
  error?: string;
  targetPath?: string[];
  summary?: string;
  confidence?: number;
  excerpt?: string;
  finalFolderId?: string;
}

export interface ManagementSnapshot {
  jobs: BookmarkJob[];
  settings: ExtensionSettings;
  folders: FolderCatalogRoot[];
}

export interface PopupSnapshot {
  jobs: BookmarkJob[];
  settings: ExtensionSettings;
}

export interface CapturePageRequest {
  type: 'bookmark-ai:capture-page';
  maxChars: number;
}

export interface ShowToastRequest {
  type: 'bookmark-ai:show-toast';
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface GetManagementSnapshotRequest {
  type: 'bookmark-ai:get-management-snapshot';
}

export interface GetPopupSnapshotRequest {
  type: 'bookmark-ai:get-popup-snapshot';
}

export interface GetSettingsRequest {
  type: 'bookmark-ai:get-settings';
}

export interface SaveSettingsRequest {
  type: 'bookmark-ai:save-settings';
  settings: Partial<ExtensionSettings>;
}

export interface RetryJobRequest {
  type: 'bookmark-ai:retry-job';
  jobId: string;
}

export type RuntimeRequest =
  | CapturePageRequest
  | ShowToastRequest
  | GetManagementSnapshotRequest
  | GetPopupSnapshotRequest
  | GetSettingsRequest
  | SaveSettingsRequest
  | RetryJobRequest;
