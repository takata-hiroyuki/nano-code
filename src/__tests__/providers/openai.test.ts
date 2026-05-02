import { test, expect, mock, afterAll } from 'bun:test';
import { createOpenAI } from '../../providers/openai.ts';
import type { Message, Tool } from '../types.ts';
import { LLMApiError } from '../../types.ts';

// OpenAI SDK をモック
const mockCreate = mock(() => Promise.resolve({
  choices: [{
    message: { content: 'Mocked response' },
    finish_reason: 'stop'
  }],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 5,
    total_tokens: 15
  }
}));

// APIError クラスを定義
class MockAPIError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'APIError';
  }
}

// OpenAI クラスをモック
mock.module('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate
      }
    };
  },
  APIError: MockAPIError
}));

test('createOpenAI は正常な生成結果を返す', async () => {
  const provider = createOpenAI({ apiKey: 'test-key' });
  const model = provider('gpt-4');

  const messages: Message[] = [
    { role: 'user', content: 'Hello' }
  ];

  const result = await model.doGenerate({ messages });

  expect(result.text).toBe('Mocked response');
  expect(result.finishReason).toBe('stop');
  expect(result.usage).toEqual({
    promptTokens: 10,
    completionTokens: 5,
    totalTokens: 15
  });
});

test('createOpenAI はツールコールを含む生成結果を返す', async () => {
  mockCreate.mockImplementationOnce(() => Promise.resolve({
    choices: [{
      message: {
        content: 'Calling tool',
        tool_calls: [{
          id: 'call_123',
          type: 'function',
          function: {
            name: 'test_tool',
            arguments: '{"arg": "value"}'
          }
        }]
      },
      finish_reason: 'tool_calls'
    }],
    usage: {
      prompt_tokens: 20,
      completion_tokens: 10,
      total_tokens: 30
    }
  }));

  const provider = createOpenAI();
  const model = provider('gpt-4');

  const messages: Message[] = [
    { role: 'user', content: 'Use tool' }
  ];

  const tools: Tool[] = [{
    name: 'test_tool',
    description: 'A test tool',
    parameters: { type: 'object', properties: { arg: { type: 'string' } } },
    execute: async () => 'result'
  }];

  const result = await model.doGenerate({ messages, tools });

  expect(result.text).toBe('Calling tool');
  expect(result.finishReason).toBe('tool_calls');
  expect(result.toolCalls).toEqual([{
    toolCallId: 'call_123',
    name: 'test_tool',
    args: { arg: 'value' }
  }]);
});

test('createOpenAI は API エラーを LLMApiError に変換する', async () => {
  mockCreate.mockImplementationOnce(() => {
    const error = new Error('Rate limit exceeded');
    (error as any).status = 429;
    (error as any).code = 'rate_limit_exceeded';
    throw error;
  });

  const provider = createOpenAI();
  const model = provider('gpt-4');

  const messages: Message[] = [
    { role: 'user', content: 'Error test' }
  ];

  try {
    await model.doGenerate({ messages });
    expect(false).toBe(true); // Should not reach here
  } catch (error) {
    expect(error).toBeInstanceOf(LLMApiError);
    expect((error as LLMApiError).status).toBe(429);
    expect((error as LLMApiError).provider).toBe('openai');
  }
});

test('createOpenAI はメッセージを正しく変換する', async () => {
  let capturedMessages: any[] = [];

  mockCreate.mockImplementationOnce((params: any) => {
    capturedMessages = params.messages;
    return Promise.resolve({
      choices: [{
        message: { content: 'OK' },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
    });
  });

  const provider = createOpenAI();
  const model = provider('gpt-4');

  const messages: Message[] = [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'User message' },
    { role: 'assistant', content: 'Assistant response', toolCalls: [{
      toolCallId: 'call_1',
      name: 'tool1',
      args: { param: 'value' }
    }] },
    { role: 'tool', toolCallId: 'call_1', name: 'tool1', content: 'Tool result' }
  ];

  await model.doGenerate({ messages });

  expect(capturedMessages).toEqual([
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'User message' },
    {
      role: 'assistant',
      content: 'Assistant response',
      tool_calls: [{
        id: 'call_1',
        type: 'function',
        function: { name: 'tool1', arguments: '{"param":"value"}' }
      }]
    },
    { role: 'tool', tool_call_id: 'call_1', content: 'Tool result' }
  ]);
});
