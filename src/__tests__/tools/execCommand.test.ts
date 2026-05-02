import { test, expect, afterAll } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseCommand, execCommand } from '../../tools/execCommand.ts';

const workspaceRoot = path.resolve(process.cwd(), './workspace');
const testFilePath = path.join(workspaceRoot, 'execCommand.test.txt');

async function cleanup() {
  await fs.rm(testFilePath, { force: true });
}

await cleanup();
await fs.writeFile(testFilePath, 'execCommand test', 'utf-8');

test('parseCommand はスペースで分割できる', () => {
  expect(parseCommand('git status')).toEqual(['git', 'status']);
});

test('parseCommand は引用符を保持して引数を分割する', () => {
  expect(parseCommand('git commit -m "hello world"')).toEqual(['git', 'commit', '-m', 'hello world']);
});

test('parseCommand はダブルクォート内のエスケープを扱う', () => {
  expect(parseCommand('git commit -m "hello \"world\""')).toEqual(['git', 'commit', '-m', 'hello world']);
});

test('execCommand は許可されたコマンドを実行できる', async () => {
  const output = await execCommand.execute({ command: 'ls execCommand.test.txt' });
  expect(output).toContain('execCommand.test.txt');
});

test('execCommand は危険な文字を含むコマンドを拒否する', async () => {
  await expect(execCommand.execute({ command: 'ls && echo vulnerable' })).rejects.toThrow('コマンド連結・置換文字を含むコマンドは実行できません');
});

test('execCommand はワークスペース外のパスを拒否する', async () => {
  await expect(execCommand.execute({ command: 'ls ../outside.txt' })).rejects.toThrow('ワークスペース外を参照しています');
});

afterAll(async () => {
  await cleanup();
});
