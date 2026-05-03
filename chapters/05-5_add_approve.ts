import { ListBatchJobsResponse, ToolResponse } from "@google/genai";
import { generateText } from "../src/core/generate-text";
import type { Message } from "../src/types";
import { readFile } from "../src/tools/readFile";
import { writeFile } from "../src/tools/writeFile";
import { editFile } from "../src/tools/editFile";
import { execCommand } from "../src/tools/execCommand";
import { createOpenAI } from "../src/providers/openai";
import  type { Tool } from "../src/types";
import { requestApproval } from "../src/core/approval";

async function executeTool(tool: Tool, args: any): Promise<string>{
    try {
        return await tool.execute(args);
    } catch (error: any){
        return `エラー：　${error.message}`; // エージェントを止めないためにエラーは投げない
    }
}

async function generate(userMessage: string): Promise<string> {
    const tools = [ readFile, writeFile, editFile, execCommand ];
    const openai = createOpenAI();
    const model = openai('gpt-5-mini');
    const messages: Message[] = [
        {role: "system", content: "あなたはファイル操作ができるアシスタントです。"},
        {role: "user", content: userMessage}
    ];

    let finalText = '';

    while (true){
        const response = await generateText({model, messages, tools});
        console.log(`llm response:${JSON.stringify(response)}`)
        if(response.text){
            finalText = response.text;
            console.log('llmのresponse.text', response.text);
        }

        if(response.toolCalls && response.toolCalls.length > 0){
            messages.push({
                role: "assistant",
                content: response.text || "",
                toolCalls: response.toolCalls
            });

            for (const toolCall of response.toolCalls){
                console.log(`ツール実行；${JSON.stringify(toolCall)}`);
                const tool = tools.find( t => t.name === toolCall.name);
                if (!tool) throw new Error(`Unknown tool: ${tool}`);

                // 承認を追加
                if (tool.needsApproval) {
                    const approved = await requestApproval(
                        toolCall.name,
                        toolCall.args,
                    );

                    if (!approved){
                        messages.push({
                            role: "tool",
                            toolCallId: toolCall.toolCallId,
                            name: toolCall.name,
                            content: "ユーザーによってキャンセルされました。別の方法を検討して下さい。"
                        });
                        continue;
                    }
                }


                const result = await executeTool(tool, toolCall.args);

                messages.push({
                    role: "tool",
                    toolCallId: toolCall.toolCallId,
                    name: toolCall.name,
                    content: result
                });
            }
            continue;
        }

        messages.push({
            role: "assistant",
            content: response.text
        });
        console.log(`response: ${JSON.stringify(response)}`)
        console.log(`finishReason: ${response.finishReason}`);
        if(response.finishReason === 'stop') break;
    }
    for (const m of messages){
        console.log(m);
    }
    return finalText;
}

await generate("python.mdの中身を教えて");