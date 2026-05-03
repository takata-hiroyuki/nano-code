import { Agent } from './../src/core/agent';
import { createOpenAI } from '../src/providers/openai';
import { readFile } from '../src/tools/readFile';
import { writeFile } from '../src/tools/writeFile';
import { editFile } from '../src/tools/editFile';
import { execCommand } from '../src/tools/execCommand';

const openai = createOpenAI();
const model = openai('gpt-5-mini');

export const codingAgent = new Agent({
    name: 'nano-code',
    instructions: 'あなたはツールが使えるアシスタントです。',
    model,
    tools: { readFile, writeFile, editFile, execCommand },
    maxSteps: 20,
    verbose: true,
});

const result = await codingAgent.generate('pythonの特徴をまとめてpython.mdにまとめて下さい');
console.log(result.text);