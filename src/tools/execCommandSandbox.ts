import { spawn } from 'child_process';
import * as path from 'path';
import type { Tool } from '../types';
import { Sandbox } from '../core/sandbox';
import { config } from '../config';
import { execCommand, parseCommand } from './execCommand';

const WORKSPACE_ROOT = path.resolve(process.cwd(), './workspace');
const ALLOWED_COMMANDS = ['bun', 'ls', 'git', 'gh'];
const MAX_OUTPUT_LENGTH = 2048; // 出力の最大長（文字数）

// 環境変数はホワイトリスト方式（機密情報の漏洩防止）
const SAFE_ENV = {
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: '/tmp',
    LANG: process.env.LANG || 'C.utf-8',
};

async function execCommandSandboxExecute(
    args: Record<string, unknown>
): Promise<string>{
    const command = args.command as string;

    const dangerousChars = /[;&`$]/;
    if (dangerousChars.test(command)) throw new Error('シェルメタ文字を含むコマンドは実行できません');

    const parts = parseCommand(command);
    const commandName = parts[0];
    const commandArgs = parts.slice(1);

    if (!ALLOWED_COMMANDS.includes(commandName)) throw new Error(`コマンド ${commandName}は許可されていません`);

    // サンドボックス分岐
    if (process.platform === 'linux' && config.sandbox){
        const sandbox = new Sandbox();
        const result = await sandbox.run(commandName, commandArgs, {
            allowNetwork: false,
            env: SAFE_ENV
        });
        if ( result.exitCode !== 0 ) throw new Error(`Command failed: ${result.stderr}`);
        return result.stdout;
    }

    // 通常実行
    return new Promise((resolve, reject) => {
        const child = spawn(commandName, commandArgs, {
            cwd: WORKSPACE_ROOT,
            timeout: 30000,
            shell: false,
        });

        let stdout = '';
        let stderr = '';
        let outputTruncated = false;

        child.stdout.on('data', (data: Buffer) => {
            const chunk = data.toString();
            if(stdout.length + chunk.length > MAX_OUTPUT_LENGTH){
                stdout += chunk.slice(0, MAX_OUTPUT_LENGTH - stdout.length);
                outputTruncated = true;
            } else {
                stdout += chunk;
            }
        });

        child.stderr.on('data', (data: Buffer) => {
            const chunk = data.toString();
            if(stderr.length + chunk.length > MAX_OUTPUT_LENGTH){
                stderr += chunk.slice(0, MAX_OUTPUT_LENGTH - stderr.length);
                outputTruncated = true;
            }else {
                stderr += chunk;
            }
        });
        
        child.on('close', (code: number | null) => {
            let result = '';

            if (stdout) result += stdout;
            if (stderr) result += (result ? '\n' : '') + `[stderr] ${stderr}`;
            if (outputTruncated) result += '\n[出力は最大長を超えたため切り捨てられました]';
            if (code !== 0) result += `\n[終了コード： ${code} ]`;

            resolve(result || '(出力なし)');
        });

        child.on('error', (err: Error) => {
            reject(new Error(`コマンドの実行に失敗しました：　${err.message}`));
        });
    });
}

export const execCommandSandbox: Tool = {
    name: 'execCommand',
    description: 'ワークスペース内で許可されたコマンドを実行',
    needsApproval: true,
    parameters: {
        type: 'object',
        properties: {
            command: { type: 'string', description: '実行するコマンド' },
        },
        required: ['command'],
    },
    execute: execCommandSandboxExecute,
}