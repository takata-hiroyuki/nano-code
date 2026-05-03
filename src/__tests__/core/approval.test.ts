
import { test, expect, mock } from 'bun:test';
import { requestApproval } from '../../core/approval.ts';

test('requestApproval はユーザーが y を入力した場合に true を返す', async () => {
  // readline.createInterface をモック
  mock.module('readline', () => ({
    createInterface: mock((options: any) => {
      return {
        question: mock((prompt: string, callback: (answer: string) => void) => {
          // 非同期で 'y' を返す
          setImmediate(() => callback('y'));
        }),
        close: mock(() => {})
      };
    })
  }));

  // モジュールを再度読み込む
  const { requestApproval: requestApprovalMocked } = await import('../../core/approval.ts');
  const result = await requestApprovalMocked('testTool', { param: 'value' });

  expect(result).toBe(true);
});

test('requestApproval はユーザーが n を入力した場合に false を返す', async () => {
  mock.module('readline', () => ({
    createInterface: mock((options: any) => {
      return {
        question: mock((prompt: string, callback: (answer: string) => void) => {
          setImmediate(() => callback('n'));
        }),
        close: mock(() => {})
      };
    })
  }));

  const { requestApproval: requestApprovalMocked } = await import('../../core/approval.ts');
  const result = await requestApprovalMocked('testTool', { param: 'value' });

  expect(result).toBe(false);
});

test('requestApproval はユーザーが Y (大文字) を入力した場合に true を返す', async () => {
  mock.module('readline', () => ({
    createInterface: mock((options: any) => {
      return {
        question: mock((prompt: string, callback: (answer: string) => void) => {
          setImmediate(() => callback('Y'));
        }),
        close: mock(() => {})
      };
    })
  }));

  const { requestApproval: requestApprovalMocked } = await import('../../core/approval.ts');
  const result = await requestApprovalMocked('testTool', { param: 'value' });

  expect(result).toBe(true);
});
