import * as path from 'path';
import { Agent } from '../src/core/agent';
import { loadInstructions } from '../src/core/prompt';
import { createModelFromEnv } from '../src/providers/modelFactory';
import { readFile } from '../src/tools/readFile';
import { writeFile } from '../src/tools/writeFile';
import { editFile } from '../src/tools/editFile';
import { execCommand } from '../src/tools/execCommand';
import { parseArgs } from 'util';
import { config } from 'process';

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('使い方：bun run agent "<タスクの説明>"');
        console.error(`例：bun run agent "calcurator.tsの関数にテストを追加して下さい。"`);
        process.exit(1);
    }
    const userPrompt = args.join(' ');
    const model = createModelFromEnv();
    const workspaceRoot = path.resolve(process.cwd(), 'workspace');
    const instructions = loadInstructions(workspaceRoot);

    // 自動承認モード（yolo）追加
    const { values } = parseArgs({
        args: process.argv.slice(2),
        options: {
            'yolo' : { type: 'boolean', default: false },
        },
        allowPositionals: true,
    })
    const yoloMode = values['yolo'];

    const agent = new Agent({
        name: 'nano-code',
        model,
        //instructions: yoloMode ? ciInstructions: defaultInstructions,
        instructions,
        tools: {
            readFile,
            writeFile,
            editFile,
            execCommand,
        },
        maxSteps: 15,
        approveFunc: yoloMode ? async () => true : undefined,
        verbose: true,
    });

    console.log('エージェント起動\n');
    console.log(`タスク：　${userPrompt}\n`);
    console.log('-'.repeat(60) + '\n');

    try {
        const result = await agent.generate(userPrompt);
        console.log(result.text);
        console.log('\n' + '-'.repeat(60));
        console.log('タスク完了');
    } catch (error) {
        console.error('\n予期しないエラー:', error);
        process.exit(1);
    }
}

main();