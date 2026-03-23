import type { Browser } from '@wxt-dev/browser';

import { ensureActionContextMenu, registerActionContextMenuHandler, setActionState } from '../features/action/service';
import {
  consumePendingActionRequest,
  enqueueBookmark,
  getManagementSnapshot,
  getPopupSnapshot,
  handleActionClick,
  retryJob,
  saveSettings,
} from '../features/orchestrator/service';
import browser from '../shared/browser';
import { MESSAGE_TYPES } from '../shared/constants';
import type { RuntimeRequest, SaveSettingsRequest } from '../shared/types';

export default defineBackground(() => {
  void ensureActionContextMenu();
  registerActionContextMenuHandler();
  void setActionState('idle');

  browser.runtime.onInstalled.addListener(() => {
    void ensureActionContextMenu();
    void setActionState('idle');
  });

  browser.runtime.onStartup.addListener(() => {
    void ensureActionContextMenu();
    void setActionState('idle');
  });

  browser.action.onClicked.addListener((tab: Browser.tabs.Tab) => {
    void handleActionClick(tab);
  });

  browser.bookmarks.onCreated.addListener((bookmarkId: string, node: Browser.bookmarks.BookmarkTreeNode) => {
    if (!node.url) {
      return;
    }

    const pendingAction = consumePendingActionRequest(node.url);

    if (pendingAction) {
      void enqueueBookmark(bookmarkId, {
        triggerSource: 'action',
        triggerTabId: pendingAction.tabId,
      });
      return;
    }

    void enqueueBookmark(bookmarkId, {
      triggerSource: 'bookmark-created',
    });
  });

  browser.runtime.onMessage.addListener((message: RuntimeRequest) => {
    switch (message?.type) {
      case MESSAGE_TYPES.getManagementSnapshot:
        return getManagementSnapshot();
      case MESSAGE_TYPES.getPopupSnapshot:
        return getPopupSnapshot();
      case MESSAGE_TYPES.getSettings:
        return getManagementSnapshot().then((snapshot) => snapshot.settings);
      case MESSAGE_TYPES.saveSettings:
        return saveSettings((message as SaveSettingsRequest).settings);
      case MESSAGE_TYPES.retryJob:
        return retryJob(message.jobId);
      default:
        return undefined;
    }
  });
});
