import { test, expect } from 'bun:test';
import { Agent } from '../../core/agent.ts';
import type { Message, LanguageModel } from '../../types.ts';

test('manageContext はコンテキストが上限未満ならそのまま返す', () => {
  const stubModel: LanguageModel = {
    async doGenerate() {
      return { text: '', finishReason: 'stop' };
    }
  };
  const agent = new Agent({
    name: 'test',
    instructions: 'test instructions',
    model: stubModel,
    tools: {},
  });

  const messages: Message[] = [
    { role: 'system', content: 'system' },
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'world' }
  ];

  const result = (agent as any).manageContext(messages);

  expect(result).toBe(messages);
});

test('manageContext は大きなツール結果を省略し、古い履歴を削除してコンテキストを収める', () => {
  const stubModel: LanguageModel = {
    async doGenerate() {
      return { text: '', finishReason: 'stop' };
    }
  };
  const agent = new Agent({
    name: 'test',
    instructions: 'test instructions',
    model: stubModel,
    tools: {},
  });

  const systemMessage: Message = { role: 'system', content: 'system' };
  const longToolMessage: Message = {
    role: 'tool',
    toolCallId: 'tool-1',
    name: 'readFile',
    content: 'x'.repeat(500)
  };

  const middleMessages: Message[] = Array.from({ length: 6 }, (_, index) => ({
    role: 'assistant',
    content: 'middle-' + (index + 1) + '-' + 'a'.repeat(5000)
  }));

  const recentMessages: Message[] = Array.from({ length: 4 }, (_, index) => ({
    role: 'user',
    content: `recent-${index + 1}`
  }));

  const allMessages = [systemMessage, longToolMessage, ...middleMessages, ...recentMessages];
  const result = (agent as any).manageContext(allMessages);

  expect(result[0]).toBe(systemMessage);
  expect(result.slice(-4)).toEqual(recentMessages);
  expect(result.length).toBeLessThan(allMessages.length);
  expect(result).not.toContain(middleMessages[0]);
  expect(result).not.toContain(longToolMessage);
});
