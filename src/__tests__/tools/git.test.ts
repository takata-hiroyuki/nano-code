import { test, expect, mock } from 'bun:test';
import { validateBranchName, createBranch, commit, pushBranch } from '../../tools/git.ts';

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

test('createBranch は新しいブランチを作成する', async () => {
  // execCommand をモック
  const mockExecCommand = mock(() => Promise.resolve('Switched to a new branch \'feature/test\''));
  mock.module('../../tools/execCommand.ts', () => ({
    execCommand: { execute: mockExecCommand }
  }));

  const result = await createBranch.execute({
    branchName: 'feature/test'
  });

  expect(result).toContain('ブランチを作成しました：feature/test');
  expect(mockExecCommand).toHaveBeenCalledWith({
    command: 'git checkout -B feature/test'
  });
});

test('createBranch は危険なブランチ名を拒否する', async () => {
  await expect(createBranch.execute({
    branchName: '-dangerous'
  })).rejects.toThrow('無効なブランチ名形式です');
});

test('commit は変更をコミットする', async () => {
  // execCommand をモック
  const mockExecCommand = mock((args: any) => {
    if (args.command === 'git status --porcelain') {
      return Promise.resolve('M file1.txt\nA file2.txt');
    }
    if (args.command.includes('git add')) {
      return Promise.resolve('');
    }
    if (args.command.includes('git commit')) {
      return Promise.resolve('[main abc1234] Test commit');
    }
    return Promise.resolve('');
  });
  mock.module('../../tools/execCommand.ts', () => ({
    execCommand: { execute: mockExecCommand }
  }));

  const result = await commit.execute({
    message: 'Test commit',
    files: ['file1.txt', 'file2.txt']
  });

  expect(result).toContain('コミットしました：Test commit');
  expect(mockExecCommand).toHaveBeenCalledTimes(4); // status + 2 adds + commit
});

test('commit は変更がない場合はコミットしない', async () => {
  // execCommand をモック（変更なし）
  const mockExecCommand = mock((args: any) => {
    if (args.command === 'git status --porcelain') {
      return Promise.resolve('');
    }
    return Promise.resolve('');
  });
  mock.module('../../tools/execCommand.ts', () => ({
    execCommand: { execute: mockExecCommand }
  }));

  const result = await commit.execute({
    message: 'Test commit',
    files: ['file1.txt']
  });

  expect(result).toBe('コミットする変更がありません');
  expect(mockExecCommand).toHaveBeenCalledTimes(1); // status only
});

test('pushBranch はブランチをリモートにプッシュする', async () => {
  // execCommand をモック
  const mockExecCommand = mock(() => Promise.resolve('Branch \'feature/test\' set up to track remote branch \'feature/test\' from \'origin\'.'));
  mock.module('../../tools/execCommand.ts', () => ({
    execCommand: { execute: mockExecCommand }
  }));

  const result = await pushBranch.execute({
    branchName: 'feature/test'
  });

  expect(result).toContain('ブランチをプッシュしました：feature/test');
  expect(mockExecCommand).toHaveBeenCalledWith({
    command: 'git push -u origin feature/test'
  });
});

test('pushBranch は危険なブランチ名を拒否する', async () => {
  await expect(pushBranch.execute({
    branchName: '-dangerous'
  })).rejects.toThrow('無効なブランチ名形式です');
});