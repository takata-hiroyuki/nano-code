import { createOpenAI } from "../src/providers/openai";
import { generateText } from "../src/core/generate-text";
import  type { Message } from "../src/types";
import { isConstructorDeclaration } from "typescript";

const openai = createOpenAI();
const model = openai('gpt-5-mini');
const messages: Message[] = [
    {role: "system", content: "あなたは親切なアシスタントです。"},
    {role: "user", content: "Tsの非同期処理について教えて"}
];

console.log('ループスタート！')
let i: number = 0;
while (true) {
    i++;
    console.log(`${i}回目のループ`);
    
    const response = await generateText( {model, messages});
    //console.log(response.text);

    messages.push({
        role: "assistant",
        content: response.text
    });
    console.log(`finishReason: ${response.finishReason}`);
    if (response.finishReason === 'stop') break;
}

console.log('終了');
for (const m of messages){
    console.log(`messages: ${m.content}`);
}


