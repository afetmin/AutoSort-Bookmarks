import { JOB_LIST_LIMIT, MAX_JOB_HISTORY, STORAGE_KEYS } from '../../shared/constants';
import browser from '../../shared/browser';
import type { BookmarkJob, JobStatus } from '../../shared/types';

function sortJobsDescending(jobs: BookmarkJob[]): BookmarkJob[] {
  return [...jobs].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function persistJobs(jobs: BookmarkJob[]): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.jobs]: sortJobsDescending(jobs).slice(0, MAX_JOB_HISTORY),
  });
}

export async function loadJobs(): Promise<BookmarkJob[]> {
  const stored = await browser.storage.local.get(STORAGE_KEYS.jobs);
  const jobs = (stored[STORAGE_KEYS.jobs] as BookmarkJob[] | undefined) ?? [];
  return sortJobsDescending(jobs);
}

export async function listRecentJobs(limit = JOB_LIST_LIMIT): Promise<BookmarkJob[]> {
  const jobs = await loadJobs();
  return jobs.slice(0, limit);
}

export async function getJob(jobId: string): Promise<BookmarkJob | undefined> {
  const jobs = await loadJobs();
  return jobs.find((job) => job.id === jobId);
}

export async function createJob(job: BookmarkJob): Promise<BookmarkJob> {
  const jobs = await loadJobs();
  jobs.unshift(job);
  await persistJobs(jobs);
  return job;
}

export async function updateJob(jobId: string, patch: Partial<BookmarkJob>): Promise<BookmarkJob> {
  const jobs = await loadJobs();
  const index = jobs.findIndex((job) => job.id === jobId);

  if (index === -1) {
    throw new Error(`Job ${jobId} not found`);
  }

  const updated: BookmarkJob = {
    ...jobs[index],
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };

  jobs[index] = updated;
  await persistJobs(jobs);
  return updated;
}

export async function markJobStatus(
  jobId: string,
  status: JobStatus,
  patch: Partial<BookmarkJob> = {},
): Promise<BookmarkJob> {
  return updateJob(jobId, {
    ...patch,
    status,
  });
}
