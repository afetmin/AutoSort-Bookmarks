import browser from '../../shared/browser';
import type { Browser } from '@wxt-dev/browser';
import { MAX_FOLDER_DEPTH } from '../../shared/constants';
import type { BookmarkFolderPath, FolderCatalogRoot } from '../../shared/types';
import { cleanText, normalizeFolderSegment, serializePath } from '../../shared/utils';

type BookmarkNode = Browser.bookmarks.BookmarkTreeNode;

function isFolder(node: BookmarkNode): boolean {
  return !node.url;
}

function rootLabel(node: BookmarkNode): string {
  return cleanText(node.title) || 'Bookmarks';
}

function findFolderByTitle(nodes: BookmarkNode[] | undefined, title: string): BookmarkNode | undefined {
  const key = normalizeFolderSegment(title).toLowerCase();

  return nodes?.find((node) => isFolder(node) && normalizeFolderSegment(node.title).toLowerCase() === key);
}

function flattenFolders(node: BookmarkNode, segments: string[] = []): BookmarkFolderPath[] {
  const folders: BookmarkFolderPath[] = [];

  for (const child of node.children ?? []) {
    if (!isFolder(child)) {
      continue;
    }

    const nextSegments = [...segments, cleanText(child.title)];

    if (nextSegments.length <= MAX_FOLDER_DEPTH) {
      folders.push({
        id: child.id,
        title: cleanText(child.title),
        depth: nextSegments.length as 1 | 2,
        segments: nextSegments,
        displayPath: serializePath(nextSegments),
      });
    }

    if (nextSegments.length < MAX_FOLDER_DEPTH) {
      folders.push(...flattenFolders(child, nextSegments));
    }
  }

  return folders;
}

export async function getBookmarkNode(bookmarkId: string): Promise<BookmarkNode | null> {
  const nodes = await browser.bookmarks.get(bookmarkId);
  return nodes[0] ?? null;
}

export async function findBookmarksByUrl(url: string): Promise<BookmarkNode[]> {
  const nodes = await browser.bookmarks.search({ url });
  return nodes.filter((node) => !!node.url);
}

export async function getBookmarkRootContainerId(bookmarkId: string): Promise<string | null> {
  let current = await getBookmarkNode(bookmarkId);

  while (current?.parentId) {
    if (current.parentId === '0') {
      return current.id;
    }

    current = await getBookmarkNode(current.parentId);
  }

  return null;
}

export async function getRootContainers(): Promise<FolderCatalogRoot[]> {
  const [root] = await browser.bookmarks.getTree();

  return (root.children ?? [])
    .filter((node: BookmarkNode) => isFolder(node))
    .map((node: BookmarkNode) => ({
      id: node.id,
      title: rootLabel(node),
      paths: flattenFolders(node),
    }));
}

export async function getPreferredCreationRootId(): Promise<string> {
  const roots = await getRootContainers();

  if (roots.length === 0) {
    throw new Error('No bookmark root containers available');
  }

  const preferred =
    roots.find((root) => /bookmark(?:s)? bar|toolbar|书签栏|收藏夹栏/i.test(root.title)) ??
    roots.find((root) => !/mobile|移动/i.test(root.title) && !/other|unsorted|others|其他/i.test(root.title)) ??
    roots.find((root) => /other|unsorted|others|其他/i.test(root.title)) ??
    roots.find((root) => !/mobile|移动/i.test(root.title)) ??
    roots[0];

  return preferred.id;
}

export async function createBookmarkAtRoot(rootId: string, title: string, url: string): Promise<BookmarkNode> {
  return browser.bookmarks.create({
    parentId: rootId,
    title,
    url,
  });
}

export async function getFolderCatalogForRoot(rootId: string): Promise<BookmarkFolderPath[]> {
  const [subtree] = await browser.bookmarks.getSubTree(rootId);
  return subtree ? flattenFolders(subtree) : [];
}

export async function ensureFolderPath(rootId: string, segments: string[]): Promise<BookmarkNode> {
  const normalized = segments.map(normalizeFolderSegment).filter(Boolean);

  if (normalized.length === 0 || normalized.length > MAX_FOLDER_DEPTH) {
    throw new Error(`Folder path depth must be between 1 and ${MAX_FOLDER_DEPTH}`);
  }

  let [current] = await browser.bookmarks.getSubTree(rootId);

  if (!current) {
    throw new Error(`Root folder ${rootId} not found`);
  }

  for (const segment of normalized) {
    const existing = findFolderByTitle(current.children, segment);

    if (existing) {
      current = existing;
      continue;
    }

    current = await browser.bookmarks.create({
      parentId: current.id,
      title: segment,
    });
  }

  return current;
}

export async function ensurePendingFolder(rootId: string, pendingFolderName: string): Promise<BookmarkNode> {
  return ensureFolderPath(rootId, [pendingFolderName]);
}

export async function moveBookmarkToFolder(bookmarkId: string, folderId: string): Promise<void> {
  await browser.bookmarks.move(bookmarkId, {
    parentId: folderId,
  });
}
