import { createOpenAI } from "./openai";
import { createGoogle } from "./google";
import type { LanguageModel } from "../types";

export function createModelFromEnv(): LanguageModel {
    const provider = process.env.LLM_PROVIDER;
    const modelName = process.env.LLM_MODEL;
    const apiKey = process.env.LLM_API_KEY;

    if(!provider) throw new Error('LLM_PROVIDER環境変数が設定されていません。');
    if(!modelName) throw new Error('LLM_MODEL環境変数が設定せれていません。');
    
    // プロバイダーに応じてモデル作成
    switch (provider.toLowerCase()){
        case 'openai': {
            if (apiKey && !process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = apiKey;
            const openai = createOpenAI();
            return openai(modelName);
        }
        case 'google': {
            if (apiKey && !process.env.GOOGLE_API_KEY) process.env.GOOGLE_API_KEY = apiKey;
            const google = createGoogle();
            return google(modelName);
        }
        default:
            throw new Error(`未対応のプロバイダー: ${provider}. 対応プロバイダー: openai,jgoogle`);
    }
}