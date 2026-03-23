import type { Browser } from '@wxt-dev/browser';

import browser from '../../shared/browser';
import { MESSAGE_TYPES } from '../../shared/constants';
import type { ShowToastRequest } from '../../shared/types';
import { serializePath } from '../../shared/utils';

type ActionVisualState = 'idle' | 'loading' | 'success' | 'error';

const MENU_ID_OPEN_SETTINGS = 'bookmark-ai:open-settings';
const ICON_SIZES = ['16', '32', '48', '64', '128', '256'] as const;
type IconSize = (typeof ICON_SIZES)[number];

const STATE_ICON_DIRECTORIES: Record<ActionVisualState, string> = {
  idle: 'state-icons/idle',
  loading: 'state-icons/loading',
  success: 'state-icons/success',
  error: 'state-icons/error',
};

const stateIconPaths: Record<ActionVisualState, Record<IconSize, string>> = (() => {
  const statePaths = {} as Record<ActionVisualState, Record<IconSize, string>>;

  for (const state of Object.keys(STATE_ICON_DIRECTORIES) as ActionVisualState[]) {
    const directory = STATE_ICON_DIRECTORIES[state];
    const sizeMap = {} as Record<IconSize, string>;

    for (const size of ICON_SIZES) {
      sizeMap[size] = browser.runtime.getURL(`${directory}/${size}.png`);
    }

    statePaths[state] = sizeMap;
  }

  return statePaths;
})();

export async function setActionState(
  state: ActionVisualState,
  options: { tabId?: number; title?: string } = {},
): Promise<void> {
  const { tabId, title } = options;

  await browser.action.setIcon({
    ...(tabId != null ? { tabId } : {}),
    path: stateIconPaths[state],
  });

  const badgeText = state === 'error' ? '!' : '';

  await browser.action.setBadgeText({
    ...(tabId != null ? { tabId } : {}),
    text: badgeText,
  });

  if (state === 'loading' || state === 'error') {
    await browser.action.setBadgeBackgroundColor({
      ...(tabId != null ? { tabId } : {}),
      color: state === 'loading' ? '#1594DC' : '#C44870',
    });
  }

  await browser.action.setTitle({
    ...(tabId != null ? { tabId } : {}),
    title:
      title ??
      (state === 'loading'
        ? 'AutoSort Bookmarks: Processing'
        : state === 'success'
          ? 'AutoSort Bookmarks: Saved'
          : state === 'error'
            ? 'AutoSort Bookmarks: Failed'
            : 'AutoSort Bookmarks'),
  });
}

export async function flashActionSuccess(tabId: number | undefined, path: string[]): Promise<void> {
  await setActionState('success', {
    tabId,
    title: `AutoSort Bookmarks: Saved to ${serializePath(path)}`,
  });

}

export async function flashActionError(tabId: number | undefined, message: string): Promise<void> {
  await setActionState('error', {
    tabId,
    title: `AutoSort Bookmarks: ${message}`,
  });
}

export async function showToast(
  tabId: number | undefined,
  tone: ShowToastRequest['tone'],
  title: string,
  message: string,
): Promise<void> {
  if (tabId == null) {
    return;
  }

  try {
    await browser.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.showToast,
      tone,
      title,
      message,
    } satisfies ShowToastRequest);
  } catch {
    // Ignore missing content script or restricted pages.
  }
}

export async function ensureActionContextMenu(): Promise<void> {
  try {
    await browser.contextMenus.removeAll();
    browser.contextMenus.create({
      id: MENU_ID_OPEN_SETTINGS,
      title: 'Bookmark Settings',
      contexts: ['action'],
    });
  } catch {
    // Context menus can be unavailable in some dev sessions.
  }
}

export function registerActionContextMenuHandler(): void {
  browser.contextMenus.onClicked.addListener((info: Browser.contextMenus.OnClickData) => {
    if (info.menuItemId === MENU_ID_OPEN_SETTINGS) {
      void browser.tabs.create({
        url: browser.runtime.getURL('options.html'),
      });
    }
  });
}
