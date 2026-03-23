import {
  createBookmarkAtRoot,
  ensureFolderPath,
  ensurePendingFolder,
  findBookmarksByUrl,
  getBookmarkNode,
  getBookmarkRootContainerId,
  getFolderCatalogForRoot,
  getPreferredCreationRootId,
  getRootContainers,
  moveBookmarkToFolder,
} from '../bookmarks/service';
import { flashActionError, flashActionSuccess, setActionState, showToast } from '../action/service';
import { captureBookmarkContent } from '../capture/service';
import { classifyBookmark } from '../classification/service';
import { createJob, getJob, listRecentJobs, markJobStatus, updateJob } from '../jobs/storage';
import { hasRequiredApiSettings, loadSettings, saveSettings } from '../settings/storage';
import type { BookmarkJob, ManagementSnapshot, PopupSnapshot } from '../../shared/types';
import { normalizeUrlForMatch, serializePath, toErrorMessage, uniqueId } from '../../shared/utils';

const activeJobs = new Map<string, Promise<void>>();
const pendingActionRequests = new Map<string, Array<{ tabId?: number }>>();

function queuePendingActionRequest(url: string, request: { tabId?: number }): void {
  const key = normalizeUrlForMatch(url);
  const queue = pendingActionRequests.get(key) ?? [];
  queue.push(request);
  pendingActionRequests.set(key, queue);
}

function releasePendingActionRequest(url: string, request: { tabId?: number }): void {
  const key = normalizeUrlForMatch(url);
  const queue = pendingActionRequests.get(key);

  if (!queue?.length) {
    return;
  }

  const index = queue.findIndex((item) => item.tabId === request.tabId);

  if (index !== -1) {
    queue.splice(index, 1);
  }

  if (!queue.length) {
    pendingActionRequests.delete(key);
  }
}

export function consumePendingActionRequest(url: string): { tabId?: number } | undefined {
  const key = normalizeUrlForMatch(url);
  const queue = pendingActionRequests.get(key);

  if (!queue?.length) {
    return undefined;
  }

  const request = queue.shift();

  if (!queue.length) {
    pendingActionRequests.delete(key);
  }

  return request;
}

async function moveToPending(job: BookmarkJob, sourceRootId: string | null, errorMessage: string): Promise<void> {
  if (!sourceRootId) {
    await markJobStatus(job.id, 'failed', { error: errorMessage });
    return;
  }

  try {
    const settings = await loadSettings();
    const pendingFolder = await ensurePendingFolder(sourceRootId, settings.pendingFolderName);

    try {
      await moveBookmarkToFolder(job.bookmarkId, pendingFolder.id);
    } catch {
      // Ignore move errors during failure fallback so the job state is still recorded.
    }

    await markJobStatus(job.id, 'failed', {
      error: errorMessage,
      targetPath: [settings.pendingFolderName],
      finalFolderId: pendingFolder.id,
      sourceRootId,
    });
  } catch (pendingError) {
    await markJobStatus(job.id, 'failed', {
      error: `${errorMessage}; pending fallback failed: ${toErrorMessage(pendingError)}`,
      sourceRootId,
    });
  }
}

export async function enqueueBookmark(
  bookmarkId: string,
  options: { triggerSource?: BookmarkJob['triggerSource']; triggerTabId?: number } = {},
): Promise<BookmarkJob | null> {
  const bookmark = await getBookmarkNode(bookmarkId);

  if (!bookmark?.url) {
    return null;
  }

  const now = new Date().toISOString();
  const sourceRootId = await getBookmarkRootContainerId(bookmarkId);
  const job: BookmarkJob = {
    id: uniqueId(),
    bookmarkId,
    url: bookmark.url,
    title: bookmark.title,
    sourceRootId,
    triggerSource: options.triggerSource ?? 'bookmark-created',
    triggerTabId: options.triggerTabId,
    status: 'queued',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  await createJob(job);
  void runJob(job.id);
  return job;
}

export async function runJob(jobId: string): Promise<void> {
  const existing = activeJobs.get(jobId);

  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const job = await getJob(jobId);

    if (!job) {
      return;
    }

    const attemptAt = new Date().toISOString();
    const settings = await loadSettings();

    await updateJob(jobId, {
      status: 'capturing',
      attempts: job.attempts + 1,
      lastAttemptAt: attemptAt,
      error: undefined,
    });

    try {
      const bookmark = await getBookmarkNode(job.bookmarkId);

      if (!bookmark?.url) {
        throw new Error('Bookmark no longer exists');
      }

      const sourceRootId = job.sourceRootId ?? (await getBookmarkRootContainerId(job.bookmarkId));

      if (!sourceRootId) {
        throw new Error('Could not resolve bookmark root folder');
      }

      const capture = await captureBookmarkContent(bookmark.title, bookmark.url, settings.inputMaxChars);
      await markJobStatus(jobId, 'classifying', {
        title: capture.title,
        excerpt: capture.excerpt,
        sourceRootId,
      });

      const folders = await getFolderCatalogForRoot(sourceRootId);
      const classification = await classifyBookmark(settings, capture, folders);

      await markJobStatus(jobId, 'moving', {
        targetPath: classification.targetPath,
        confidence: classification.confidence,
        summary: classification.summary,
      });

      const targetFolder = await ensureFolderPath(sourceRootId, classification.targetPath);
      await moveBookmarkToFolder(job.bookmarkId, targetFolder.id);

      await markJobStatus(jobId, 'complete', {
        finalFolderId: targetFolder.id,
        sourceRootId,
        error: undefined,
      });

      if (job.triggerSource === 'action') {
        await flashActionSuccess(job.triggerTabId, classification.targetPath);
        await showToast(
          job.triggerTabId,
          'success',
          '收藏成功',
          `已收藏到 ${serializePath(classification.targetPath)}`,
        );
      }
    } catch (error) {
      const latestJob = (await getJob(jobId)) ?? job;

      if (latestJob.triggerSource === 'action') {
        await flashActionError(latestJob.triggerTabId, toErrorMessage(error));
      }

      await moveToPending(latestJob, latestJob.sourceRootId, toErrorMessage(error));
    }
  })().finally(() => {
    activeJobs.delete(jobId);
  });

  activeJobs.set(jobId, promise);
  return promise;
}

export async function retryJob(jobId: string): Promise<BookmarkJob> {
  const job = await getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await runJob(jobId);
  return (await getJob(jobId)) as BookmarkJob;
}

export async function handleActionClick(tab: { id?: number; title?: string; url?: string }): Promise<void> {
  const url = tab.url?.trim();

  if (!url || !/^https?:\/\//i.test(url)) {
    await flashActionError(tab.id, 'Current page cannot be bookmarked');
    return;
  }

  const settings = await loadSettings();

  if (!hasRequiredApiSettings(settings)) {
    await flashActionError(tab.id, '未配置 API，请右键图标打开设置');
    await showToast(tab.id, 'error', '未配置 API', '请右键扩展图标打开设置');
    return;
  }

  await setActionState('loading', {
    tabId: tab.id,
    title: 'AutoSort Bookmarks: Creating bookmark',
  });

  const existingBookmarks = await findBookmarksByUrl(url);

  if (existingBookmarks.length) {
    const job = await enqueueBookmark(existingBookmarks[0].id, {
      triggerSource: 'action',
      triggerTabId: tab.id,
    });

    if (!job) {
      await flashActionError(tab.id, 'Could not enqueue bookmark');
    }

    return;
  }

  const pendingRequest = { tabId: tab.id };
  queuePendingActionRequest(url, pendingRequest);

  try {
    const rootId = await getPreferredCreationRootId();
    await createBookmarkAtRoot(rootId, tab.title?.trim() || 'Untitled Bookmark', url);
  } catch (error) {
    releasePendingActionRequest(url, pendingRequest);
    await flashActionError(tab.id, toErrorMessage(error));
  }
}

export async function getManagementSnapshot(): Promise<ManagementSnapshot> {
  const [settings, jobs, folders] = await Promise.all([loadSettings(), listRecentJobs(), getRootContainers()]);
  return { settings, jobs, folders };
}

export async function getPopupSnapshot(): Promise<PopupSnapshot> {
  const [settings, jobs] = await Promise.all([loadSettings(), listRecentJobs(6)]);
  return { settings, jobs };
}

export { saveSettings };
