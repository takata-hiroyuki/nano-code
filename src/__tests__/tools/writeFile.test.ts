import { test, expect, afterAll } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { writeFile } from '../../tools/writeFile.ts';

const workspaceRoot = path.resolve(process.cwd(), './workspace');
const testFilePath = path.join(workspaceRoot, 'writeFile.test.txt');
const nestedFilePath = path.join(workspaceRoot, 'nested', 'dir', 'writeFile.test.txt');

async function cleanup() {
  await Promise.all([
    fs.rm(testFilePath, { force: true }),
    fs.rm(nestedFilePath, { force: true }),
  ]);
}

await cleanup();

test('writeFile はワークスペース内にファイルを書き込む', async () => {
  const message = await writeFile.execute({
    path: 'writeFile.test.txt',
    content: 'Hello, writeFile test!',
  });

  expect(message).toBe('ファイルを書き込みました：　writeFile.test.txt');

  const created = await fs.readFile(testFilePath, 'utf-8');
  expect(created).toBe('Hello, writeFile test!');
});

test('writeFile はネストされたディレクトリを自動作成して書き込む', async () => {
  const message = await writeFile.execute({
    path: 'nested/dir/writeFile.test.txt',
    content: 'Nested write test',
  });

  expect(message).toBe('ファイルを書き込みました：　nested/dir/writeFile.test.txt');

  const created = await fs.readFile(nestedFilePath, 'utf-8');
  expect(created).toBe('Nested write test');
});

test('writeFile はワークスペース外のパスを書き込もうとすると拒否される', async () => {
  await expect(
    writeFile.execute({ path: '../outside.txt', content: 'bad' })
  ).rejects.toThrow('アクセス拒否');
});

afterAll(async () => {
  await cleanup();
});
