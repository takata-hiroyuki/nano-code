import {ChildProcess, spawn} from 'child_process';
import { scrypt, scryptSync } from 'crypto';
import * as path from 'path';

const WORKSPACE_ROOT = path.resolve(process.cwd(), './workspace');

// 許可されたコマンド
const ALLOWED_COMMANDS = ['bun', 'ls', 'git', 'gh']

// 出力サイズの上限（文字数）
const MAX_OUTPUT_LENGTH = 2048;

// 危険な文字の正規表現
const dangerousChars = /[;&`$`]/;

// ===================
// parseCommand: コマンド文字列の解析
// ===================

type Quote = '""' | "'" | null;

export function parseCommand(input: string): string[]{

    const tokens: string[] = [];
    let current = '';
    let quote: Quote = null;
    let escaped = false;

    for(let i = 0; i < input.length; i++){
        const ch = input[i];
        if (quote) {
            if (escaped){
                current += ch;
                escaped = false;
                continue;
            }
            if (ch === '\\' && quote === '"'){
                escaped = true;
                continue;
            }
            if (ch === quote){
                quote = null;
                continue;
            }
            current += ch;
            continue;
        }

        // クォート開始
        if (ch === '"' || ch === "'"){
            quote = ch;
            continue;
        }

        // 空白で分割
        if (/\s/.test(ch)){
            if (current.length > 0){
                tokens.push(current);
                current = '';
            }
            continue;
        } 
        current += ch;
    }

    if (quote) throw new Error(`クォートが閉じられていません：　${quote}`);
    if (current.length > 0) tokens.push(current);

    return tokens;
}

// ===================
// execCommandExecute: 安全なコマンドの実行
// ===================

async function execCommandExecute(args: {command: string}): Promise<string>{
    // 危険文字チェック
    if (dangerousChars.test(args.command)) throw new Error(`コマンド連結・置換文字を含むコマンドは実行できません。：　${args.command}`);

    // コマンドの解析
    const parts = parseCommand(args.command);
    if (parts.length === 0) throw new Error('コマンドが空です。');
    
    const commandName = parts[0];
    const commandArgs = parts.slice(1);

    // ホワイトリストチェック
    if (!ALLOWED_COMMANDS.includes(commandName)) throw new Error(`許可されていないコマンドです。：　${commandName}。許可されているコマンド；　${ALLOWED_COMMANDS.join(', ')}`);

    // パス引数の検証（ワークスペース内かチェック）
    for (const arg of commandArgs){
        if (arg.includes('/') || arg.includes('\\')){
            const resolvedPath = path.resolve(WORKSPACE_ROOT, arg);
            if(!resolvedPath.startsWith(WORKSPACE_ROOT + path.sep) && resolvedPath !== WORKSPACE_ROOT) throw new Error(`コマンド引数のパスがワークスペース外を参照しています。：　${arg}`);
        }
    }

    // spawn() で実行（shell: falseでコマンドインジェクション対策）
    return new Promise ((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        let outputTruncated = false;

        const child = spawn(commandName, commandArgs, {
            cwd: WORKSPACE_ROOT,
            timeout: 30 * 1000, // タイムアウト30秒
            shell: false
        });

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

// ===================
// ツール定義
// ===================

export const execCommand = {
    name: 'execCommand',
    description: "ワークスペース内で許可された汎用コマンドを実行する。利用可能なコマンドはbun、ls、cat、grep、find、pwd、mkdir、git、ghに限定される。コマンド連結や置換を防止するため、& ; ` $ などの文字を含むコマンドは拒否される。コマンド引数にパスが含まれる場合はワークスペース内に限定される。出力は最大2048文字までで、それを超える場合は切り捨てられる。",
    parameters: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: '実行するコマンド（例："bun test", "ls -la src/"）'
            },
        },
        required: ['command'],
    },
    execute: execCommandExecute,
}