import { test, expect, mock, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { validateBranchName, writeTempFile, createPullRequest, createIssueComment } from '../../tools/github.ts';

const workspaceRoot = path.resolve(process.cwd(), 'workspace');

// テスト用の一時ファイルクリーンアップ
async function cleanupTempFiles() {
  const files = fs.readdirSync(workspaceRoot).filter(f => f.startsWith('.pr-body-') || f.startsWith('.issue-comment-'));
  for (const file of files) {
    try {
      fs.unlinkSync(path.join(workspaceRoot, file));
    } catch { /* ignore */ }
  }
}

afterAll(async () => {
  await cleanupTempFiles();
});

test('validateBranchName は有効なブランチ名を許可する', () => {
  expect(() => validateBranchName('feature/new-feature')).not.toThrow();
  expect(() => validateBranchName('main')).not.toThrow();
  expect(() => validateBranchName('fix/bug-123')).not.toThrow();
});

test('validateBranchName は危険なブランチ名を拒否する', () => {
  expect(() => validateBranchName('-dangerous')).toThrow('無効なブランチ名形式です');
  expect(() => validateBranchName(':dangerous')).toThrow('無効なブランチ名形式です');
  expect(() => validateBranchName('--delete')).toThrow('無効なブランチ名形式です');
});

test('writeTempFile は一時ファイルを作成して内容を書き込む', () => {
  const content = 'test content';
  const tempPath = writeTempFile(content, 'test');

  expect(fs.existsSync(tempPath)).toBe(true);
  expect(fs.readFileSync(tempPath, 'utf-8')).toBe(content);

  // クリーンアップ
  fs.unlinkSync(tempPath);
});

test('createPullRequest は新規PRを作成する', async () => {
  // execCommand をモック
  const mockExecCommand = mock(() => Promise.resolve(''));
  mock.module('../../tools/execCommand.ts', () => ({
    execCommand: { execute: mockExecCommand }
  }));

  const result = await createPullRequest.execute({
    title: 'Test PR',
    body: 'Test body',
    base: 'main',
    head: 'feature/test'
  });

  expect(result).toContain('PRを作成しました');
  expect(mockExecCommand).toHaveBeenCalledTimes(2); // 既存PRチェック + PR作成
});

test('createPullRequest は既存PRを更新する', async () => {
  // execCommand をモック（既存PRあり）
  const mockExecCommand = mock((args: any) => {
    if (args.command.includes('gh pr list')) {
      return Promise.resolve('[{"number": 123, "title": "Existing PR"}]');
    }
    return Promise.resolve('');
  });
  mock.module('../../tools/execCommand.ts', () => ({
    execCommand: { execute: mockExecCommand }
  }));

  const result = await createPullRequest.execute({
    title: 'Test PR',
    body: 'Test body',
    base: 'main',
    head: 'feature/test'
  });

  expect(result).toContain('既存のPR #123を更新しました');
  expect(mockExecCommand).toHaveBeenCalledTimes(2); // 既存PRチェック + PR更新
});

test('createIssueComment はIssueにコメントを投稿する', async () => {
  // execCommand をモック
  const mockExecCommand = mock(() => Promise.resolve(''));
  mock.module('../../tools/execCommand.ts', () => ({
    execCommand: { execute: mockExecCommand }
  }));

  const result = await createIssueComment.execute({
    issueNumber: 42,
    body: 'Test comment'
  });

  expect(result).toBe('コメントを投稿しました');
  expect(mockExecCommand).toHaveBeenCalledTimes(1);
});

test('createPullRequest と createIssueComment は一時ファイルをクリーンアップする', async () => {
  // execCommand をモック
  const mockExecCommand = mock(() => Promise.resolve(''));
  mock.module('../../tools/execCommand.ts', () => ({
    execCommand: { execute: mockExecCommand }
  }));

  await createPullRequest.execute({
    title: 'Test PR',
    body: 'Test body',
    base: 'main',
    head: 'feature/test'
  });

  await createIssueComment.execute({
    issueNumber: 42,
    body: 'Test comment'
  });

  // 一時ファイルがクリーンアップされていることを確認
  const files = fs.readdirSync(workspaceRoot).filter(f => f.startsWith('.pr-body-') || f.startsWith('.issue-comment-'));
  expect(files.length).toBe(0);
});