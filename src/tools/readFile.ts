import * as fs from 'fs/promises';
import * as path from 'path';

const WORKSPACE_ROOT = path.resolve(process.cwd(), './workspace');

// 読み込み可能なファイルサイズの上限（LLMコンテキストウィンドウ保護）
const MAX_FILE_SIZE = 100 * 1024; // 100 KB

async function readFileExecute(args: { path: string}): Promise<string> {
    const absolutePath = path.resolve(WORKSPACE_ROOT, args.path);
    
    // ワークスペース内かチェック（ディレクトリトラバーサル対策）
    const allowedPrefix = WORKSPACE_ROOT + path.sep;
    if (!absolutePath.startsWith(allowedPrefix) && absolutePath !== WORKSPACE_ROOT){
        throw new Error(`アクセス拒否：　${args.path}はワークスペース外です。`);
    }

    // シンボリックリンクを解決して実パスを検証
    const realPath = await fs.realpath(absolutePath);
    if (!realPath.startsWith(allowedPrefix) && realPath !== WORKSPACE_ROOT){
        throw new Error(`アクセス拒否：　${args.path}はシンボリック経由でワークスペース外を参照しています。`);
    }

    // ファイルサイズをチェック
    try {
        const stat = await fs.stat(absolutePath);
        if(!stat.isFile()) throw new Error(`通常のファイルではありません：　${args.path}`);
        if(stat.size > MAX_FILE_SIZE) throw new Error(
            `ファイルサイズが大きすぎます（${stat.size} bytes）。最大許容サイズは ${MAX_FILE_SIZE} bytes です。`
        );
    } catch (error: any) {
        if(error.code === 'ENOENT') throw new Error(`ファイルが見つかりません：　${args.path}`);
        throw error;
    }

    // ファイルの読み込み
    const content = await fs.readFile(absolutePath, 'utf-8');
    return content;
}

export const readFile = {
    name: 'readFile',
    description: "ワークスペース内の指定されたパスのファイル内容を文字列として読み込む。ファイルが存在しない場合はエラーを返す。100KBを超える巨大ファイルは読み込めない（コンテキストウィンドウ保護のため）。相対パスまたは絶対パスを指定できる",
    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "読み込みファイルのパス（例：'README.md', 'src/index.ts'）"
            }
        },
        required: ['path']
    },
    execute: readFileExecute
}