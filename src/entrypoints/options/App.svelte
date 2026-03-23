<script lang="ts">
  import { onMount } from 'svelte';

  import { testModelSettings } from '../../features/classification/service';
  import { listRecentJobs } from '../../features/jobs/storage';
  import { loadSettings, saveSettings as persistSettings } from '../../features/settings/storage';
  import browser from '../../shared/browser';
  import { MESSAGE_TYPES } from '../../shared/constants';
  import type { BookmarkJob, ExtensionSettings } from '../../shared/types';
  import { cleanText } from '../../shared/utils';

  const defaultSettings: ExtensionSettings = {
    apiEndpoint: '',
    apiKey: '',
    model: '',
    temperature: 0.2,
    inputMaxChars: 6000,
    pendingFolderName: 'Bookmark Inbox',
  };

  let loading = true;
  let saving = false;
  let testing = false;
  let pageError = '';
  let saveMessage = '';
  let actionMessage = '';
  let actionMessageTone: 'idle' | 'success' | 'error' = 'idle';
  let jobs: BookmarkJob[] = [];
  let settingsForm: ExtensionSettings = { ...defaultSettings };
  let showAllLogs = false;

  const refresh = async () => {
    loading = true;
    pageError = '';

    try {
      const [settings, recentJobs] = await Promise.all([loadSettings(), listRecentJobs()]);
      settingsForm = { ...settings };
      jobs = recentJobs;
    } catch (caught) {
      pageError = caught instanceof Error ? caught.message : String(caught);
    } finally {
      loading = false;
    }
  };

  function resetActionMessage(): void {
    actionMessage = '';
    actionMessageTone = 'idle';
  }

  const saveSettings = async () => {
    saving = true;
    saveMessage = '';
    resetActionMessage();

    try {
      settingsForm = await persistSettings(settingsForm);
      saveMessage = '配置已保存';
      await refresh();
      actionMessage = '配置已保存';
      actionMessageTone = 'success';
    } catch (caught) {
      actionMessage = caught instanceof Error ? caught.message : String(caught);
      actionMessageTone = 'error';
    } finally {
      saving = false;
    }
  };

  const testSettings = async () => {
    testing = true;
    saveMessage = '';
    resetActionMessage();

    try {
      if (!cleanText(settingsForm.apiEndpoint)) {
        throw new Error('请先填写 API 地址');
      }

      if (!cleanText(settingsForm.apiKey)) {
        throw new Error('请先填写 API 密钥');
      }

      if (!cleanText(settingsForm.model)) {
        throw new Error('请先填写模型名称');
      }

      await testModelSettings(settingsForm);
      actionMessage = `测试成功，模型 ${settingsForm.model} 可用`;
      actionMessageTone = 'success';
    } catch (caught) {
      actionMessage = caught instanceof Error ? caught.message : String(caught);
      actionMessageTone = 'error';
    } finally {
      testing = false;
    }
  };

  const retryJob = async (jobId: string) => {
    await browser.runtime.sendMessage({
      type: MESSAGE_TYPES.retryJob,
      jobId,
    });
    await refresh();
  };

  function visibleJobs(items: BookmarkJob[]): BookmarkJob[] {
    return showAllLogs ? items : items.slice(0, 8);
  }

  function statusLabel(job: BookmarkJob): string {
    if (job.status === 'complete') {
      return 'SUCCESS';
    }

    if (job.status === 'failed') {
      return job.targetPath?.length ? 'FALLBACK' : 'FAILED';
    }

    if (job.status === 'moving' || job.status === 'classifying' || job.status === 'capturing') {
      return 'ACTIVE';
    }

    return 'QUEUED';
  }

  function statusClass(job: BookmarkJob): string {
    if (job.status === 'complete') {
      return 'is-success';
    }

    if (job.status === 'failed') {
      return job.targetPath?.length ? 'is-fallback' : 'is-failed';
    }

    if (job.status === 'moving' || job.status === 'classifying' || job.status === 'capturing') {
      return 'is-active';
    }

    return 'is-idle';
  }

  function jobMeta(job: BookmarkJob): string {
    const folderLabel = job.targetPath?.join(' / ') || 'Pending';
    const timeLabel = new Date(job.updatedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${folderLabel}  /  ${timeLabel}`;
  }

  onMount(() => {
    void refresh();

    const handleStorageChange = () => {
      void refresh();
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  });
</script>

<svelte:head>
  <title>书签管理工作台</title>
</svelte:head>

<div class="page-shell">
  <main class="workspace">
    <section class="workspace-head">
      <div>
        <h1>管理工作台</h1>
        <p>配置你的 AI 收藏整理流程，并在这里查看最近的处理记录与结果。</p>
      </div>
      <button class="refresh-button" on:click={refresh}>刷新</button>
    </section>

    {#if loading}
      <section class="panel muted-panel">正在加载工作台数据…</section>
    {:else if pageError}
        <section class="panel error-panel">{pageError}</section>
    {:else}
      <div class="workspace-grid">
        <section class="panel pipeline-panel">
          <div class="panel-header">
            <div>
              <h2>处理流水线</h2>
              <p class="panel-subtitle">最近处理过的收藏会显示在这里。(仅保留最近 20 条记录)</p>
            </div>
            <span class="section-pill">进行中</span>
          </div>

          <div class="pipeline-list">
            {#if visibleJobs(jobs).length}
              {#each visibleJobs(jobs) as job}
                <article class={`pipeline-item ${statusClass(job)}`}>
                  <div class="item-bar"></div>
                  <div class="item-copy">
                    <strong>{job.title || job.url}</strong>
                    <p>{job.error ? `Failed: ${job.error}` : jobMeta(job)}</p>
                  </div>
                  <div class="item-actions">
                    <span class={`status-pill ${statusClass(job)}`}>{statusLabel(job)}</span>
                    {#if job.status === 'failed'}
                      <button class="retry-button" on:click={() => retryJob(job.id)}>重试</button>
                    {/if}
                  </div>
                </article>
              {/each}
            {:else}
              <article class="pipeline-empty">
                <strong>还没有处理记录</strong>
                <p>点击扩展图标后，新的收藏任务会出现在这里。</p>
              </article>
            {/if}
          </div>

          {#if jobs.length > 8}
            <button class="view-logs" on:click={() => (showAllLogs = !showAllLogs)}>
              {showAllLogs ? '收起列表' : '查看全部记录'}
            </button>
          {/if}
        </section>

        <section class="panel config-panel">
          <div class="panel-header">
            <div>
              <h2>API 配置</h2>
              <p class="panel-subtitle">修改后会立即作用到后续收藏任务。</p>
            </div>
          </div>

          <div class="form-grid">
            <label class="field wide">
              <span>API 地址</span>
              <input bind:value={settingsForm.apiEndpoint} placeholder="https://api.openai.com/v1" />
            </label>

            <label class="field wide">
              <span>API 密钥</span>
              <div class="secret-field">
                <input bind:value={settingsForm.apiKey} type="password" placeholder="sk-..." />
                <span class="eye">◉</span>
              </div>
            </label>

            <label class="field">
              <span>模型</span>
              <input bind:value={settingsForm.model} placeholder="例如：gpt-4o-mini" />
            </label>

            <label class="field">
              <span>失败后进入的目录</span>
              <input bind:value={settingsForm.pendingFolderName} placeholder="待整理" />
            </label>
          </div>

          <div class="action-row">
            <button class="test-button" on:click={testSettings} disabled={saving || testing}>
              {testing ? '测试中' : '测试'}
            </button>
            <button class="save-button" on:click={saveSettings} disabled={saving || testing}>
              {saving ? '正在保存配置' : '保存配置'}
            </button>
          </div>

          <p class={`save-note ${actionMessageTone !== 'idle' ? `is-${actionMessageTone}` : ''}`}>
            {actionMessage || saveMessage || '保存后会立即作用到后续所有收藏整理任务。'}
          </p>
        </section>
      </div>
    {/if}
  </main>
</div>
