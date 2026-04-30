// ツール定義の型
export type Tool = {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema相当
    execute: (args: Record<string, unknown>) => Promise<string>;
};

// ツール呼び出しの型
export type ToolCall = {
    toolCallId: string;
    name: string;
    args: Record<string, unknown>;
};

// ツール実行結果の型（会話履歴に追加する）
export type ToolResult = {
    toolCallId: string;
    result: string;
};

// Message型；会話の最小単位
export type Message = 
    | {role: 'user'| 'system'; content: string}
    | {role: 'assistant'; content: string; toolCalls?: ToolCall[]}
    | {role: 'tool'; toolCallId: string; name: string; content: string;};

// Usage型；トークン使用量のメタデータ
export type Usage = {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
};

// GenerateTextResult型；統一された出力形式
export type GenerateTextResult = {
    text: string;
    finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error';
    toolCalls?: ToolCall[];
    usage?: Usage;
};

// generateTextに渡すパラメータ
export type GenerateParams = {
    messages: Message[];
    tools?: Tool[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
};

// 言語モデルのインターフェース
export interface LanguageModel {
    doGenerate(params: GenerateParams): Promise<GenerateTextResult>;
};

// プロバイダー関数の型
export type Provider = (modelId: string) => LanguageModel;

// LLM APIのエラーの統一型
export class LLMApiError extends Error {
    constructor(
        public status: number,
        public provider: string,
        public code?: string,
        message?: string,
        public raw?: unknown
    ){
        super(message || `LLM API Error: ${provider} returned ${status}`);
        this.name = 'LLMApiError'
    }
}