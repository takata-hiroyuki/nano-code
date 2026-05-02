import { test, expect, afterAll } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { readFile } from './readFile.ts';

const workspaceRoot = path.resolve(process.cwd(), './workspace');
const testFilePath = path.join(workspaceRoot, 'readFile.test.txt');
const hugeFilePath = path.join(workspaceRoot, 'readFile.huge.test.txt');

async function cleanup() {
  await Promise.all([
    fs.rm(testFilePath, { force: true }),
    fs.rm(hugeFilePath, { force: true }),
  ]);
}

await cleanup();

await fs.writeFile(testFilePath, 'Hello, readFile test!');

test('readFile はワークスペース内のファイルを読み込める', async () => {
  const result = await readFile.execute({ path: 'readFile.test.txt' });
  expect(result).toBe('Hello, readFile test!');
});

test('readFile はワークスペース外のパスを拒否する', async () => {
  await expect(readFile.execute({ path: '../outside.txt' })).rejects.toThrow(
    'アクセス拒否'
  );
});

test('readFile は 100KB を超えるファイルを拒否する', async () => {
  const huge = 'a'.repeat(100 * 1024 + 1);
  await fs.writeFile(hugeFilePath, huge);
  await expect(readFile.execute({ path: 'readFile.huge.test.txt' })).rejects.toThrow(
    'ファイルサイズが大きすぎます'
  );
});

afterAll(async () => {
  await cleanup();
});
