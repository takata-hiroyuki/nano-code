import { createOpenAI } from "../src/providers/openai";
import { createGoogle } from "../src/providers/google";
import { generateText } from "../src/core/generate-text";
import type { Message } from "../src/types";

const messages: Message[] = [
    {
        role: 'user',
        content: 'AIエージェントとはなんですか？'
    }
];

const openai = createOpenAI();
const result1 = await generateText({model: openai('gpt-5-mini'), messages });
console.log('openai: ', result1.text);

const google = createGoogle();
const result2 = await generateText({model: google('gemini-2.5-flash'), messages});
console.log('google: ', result2.text);