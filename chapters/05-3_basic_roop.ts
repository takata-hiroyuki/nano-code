import { createOpenAI } from "../src/providers/openai";
import { generateText } from "../src/core/generate-text";
import  type { Message } from "../src/types";
import { readFile } from "../src/tools/readFile";

const tools = [ readFile ];
const openai = createOpenAI();
const model = openai('gpt-5-mini');
const messages: Message[] = [
    {role: "system", content: "あなたは親切なアシスタントです。"},
    
    {role: "user", content: "test.txtの中身を教えて"}
];

const response = await generateText( {model, messages, tools});

if (response.toolCalls && response.toolCalls.length > 0){
    const toolCall = response.toolCalls[0];
    if (!toolCall){
        console.log('ツールがからです');
    }
    console.log(`ツール；${toolCall?.name}`);

    const tool = tools.findLast(t => t.name === toolCall?.name);
    if (tool) {
        const result = await tool.execute(toolCall.args);
        console.log(`結果： ${result.slice( 0, 50)}`);

        messages.push({
            role: 'assistant',
            content: response.text,
            toolCalls: response.toolCalls
        });
        messages.push({
            role: 'tool',
            toolCallId: toolCall.toolCallId,
            name: toolCall.name,
            content: result
        });
    };
    console.log('ツール利用終了');
} else {
    console.log('ツール呼び出しなしで終了');
}
for (const m of messages){
    console.log(m);
    console.log(`messages: ${m.content}`);
}

