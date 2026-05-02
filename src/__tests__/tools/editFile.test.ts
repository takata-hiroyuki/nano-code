import { test, expect, afterAll } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { editFile } from '../../tools/editFile.ts';

const workspaceRoot = path.resolve(process.cwd(), './workspace');
const testFilePath = path.join(workspaceRoot, 'editFile.test.txt');

async function cleanup() {
  await fs.rm(testFilePath, { force: true });
}

await cleanup();
await fs.writeFile(testFilePath, 'Line one\nLine two\nLine three\n', 'utf-8');

test('editFile は一意のテキストを置き換える', async () => {
  const result = await editFile.execute({
    path: 'editFile.test.txt',
    oldText: 'Line two',
    newText: 'Edited line two',
  });

  expect(result).toContain('ファイルを更新しました');

  const content = await fs.readFile(testFilePath, 'utf-8');
  expect(content).toBe('Line one\nEdited line two\nLine three\n');
});

test('editFile は oldText が見つからない場合にエラーを返す', async () => {
  await expect(
    editFile.execute({
      path: 'editFile.test.txt',
      oldText: 'Nonexistent text',
      newText: 'Nothing',
    })
  ).rejects.toThrow('変更対象のテキストが見つかりません');
});

test('editFile は oldText が複数ある場合にエラーを返す', async () => {
  await fs.writeFile(testFilePath, 'Repeat\nRepeat\nUnique\n', 'utf-8');

  await expect(
    editFile.execute({
      path: 'editFile.test.txt',
      oldText: 'Repeat',
      newText: 'Changed',
    })
  ).rejects.toThrow('変更対象のテキストが複数見つかりました');
});

afterAll(async () => {
  await cleanup();
});
