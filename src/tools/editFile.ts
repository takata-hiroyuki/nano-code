import * as fs from 'fs/promises';
import * as path from 'path';

const WORKSPACE_ROOT = path.resolve(process.cwd(), './workspace');

async function editFileExecute(args: {
    path: string;
    oldText: string;
    newText: string;
}): Promise<string> {
    const absolutePath = path.resolve(WORKSPACE_ROOT, args.path);
    
    // ワークスペース内かチェック（ディレクトリトラバーサル対策）
    const allowedPrefix = WORKSPACE_ROOT + path.sep;
    if (!absolutePath.startsWith(allowedPrefix) && absolutePath !== WORKSPACE_ROOT){
        throw new Error(`アクセス拒否：　${args.path}はワークスペース外です。`);
    }

    const content = await fs.readFile(absolutePath, 'utf-8');

    // 曖昧性チェック（変更対象が一意に特定できるか確認）
    const matches = content.split(args.oldText).length -1;
    if (matches === 0) {
        const preview = args.oldText.length > 50 ? `${args.oldText.slice(0, 50)}...` : args.oldText;
        throw new Error(`変更対象のテキストが見つかりません：　${preview}`);
    }
    if (matches > 1) {
        throw new Error(`変更対象のテキストが複数見つかりました（${matches}箇所）。変更対象を一意に特定できるようにしてください。`);
    };

    // テキストを検索・置換して書き込み
    const newContent = content.replace(args.oldText, args.newText);
    await fs.writeFile(absolutePath, newContent, 'utf-8');

    return `ファイルを更新しました：　${args.oldText.slice(0, 30)}... → ${args.newText.slice(0, 30)}...`;
}

export const editFile = {
    name: "editFile",
    description: "ファイルの一部を編集する。oldTextで指定した箇所をnewTextに置き換える。oldTextが複数箇所見つかる場合はエラーを返すため、一位に特定できる範囲を指定すること。ファイル全体を読み書きするよりトークン消費が少ない。",
    needsApproval: true,
    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "編集するファイルのパス"
            },
            oldText: {
                type: "string",
                description: "変更前のテキスト（一意に特定できる範囲を指定）"
            },
            newText: {
                type: "string",
                description: "変更後のテキスト"
            }
        },
        required: ["path", "oldText", "newText"]
    },
    execute: editFileExecute
}