import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';
import * as path from 'path';

export type ViewerResult<T> = { ok: true; value: T } | { ok: false; error: string };
const WORKSPACE_ROOT = path.resolve(process.cwd(), './workspace');
/**
 * 
 * @param url 
 * urlからdocxファイルのテキストを返す
 */

async function readDocxExecute(args: {path: string}): Promise<string>{
    const absolutePath = path.resolve(WORKSPACE_ROOT, args.path);
    try {
        const buffer = await Bun.file(absolutePath).arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // ドキュメント内容を抽出
        const xmlRes = await extractDocumentXml(bytes);
        //console.log(`xmlRes: ${JSON.stringify(xmlRes)}`);
        if (xmlRes.ok) {
        console.log('Document XML extracted successfully.');

        // XML をパースしてテキストを抽出
        const parsed = await parseStringPromise(xmlRes.value);
        //console.log(`parsed: ${JSON.stringify(parsed)}`);
        const text = extractTextFromWordXml(parsed);
        console.log('Extracted text:');
        return text;
        } else {
            throw new Error(`Error extracting XML: ${xmlRes.error}`);
        }
    } catch (error) {
        throw new Error(`Error: ${error}`);
    }
}

/**
 * .docx（ZIP）バッファ内のファイル名を列挙します。
 * JSZip を使用して ZIP をロードし、ファイル名を返します。
 */
export async function listDocxFiles(bytes: Uint8Array): Promise<ViewerResult<string[]>> {
  try {
    const zip = await JSZip.loadAsync(bytes);
    const files = Object.keys(zip.files);
    return { ok: true, value: files };
  } catch (e) {
    return { ok: false, error: `exception: ${String(e)}` };
  }
}

/**
 * .docx バッファから word/document.xml を抽出します。
 * JSZip を使用して ZIP をロードし、word/document.xml をテキストとして返します。
 */
export async function extractDocumentXml(bytes: Uint8Array): Promise<ViewerResult<string>> {
  try {
    const zip = await JSZip.loadAsync(bytes);
    const file = zip.file('word/document.xml');
    if (!file) {
      return { ok: false, error: 'word/document.xml not found' };
    }
    const content = await file.async('text');
    return { ok: true, value: content };
  } catch (e) {
    return { ok: false, error: `exception: ${String(e)}` };
  }
}

// Word XML からテキストを抽出する関数
export function extractTextFromWordXml(obj: any): string {
  let text = '';

  function traverse(node: any) {
    if (typeof node === 'object' && node !== null) {
      // w:t タグ内のテキストを抽出
      if (node['w:t']) {
        if (Array.isArray(node['w:t'])) {
          node['w:t'].forEach((t: any) => {
            if (typeof t === 'string') {
              text += t;
            } else if (t._) {
              text += t._;
            }
          });
        } else if (typeof node['w:t'] === 'string') {
          text += node['w:t'];
        } else if (node['w:t']._) {
          text += node['w:t']._;
        }
      }
      // 再帰的に子ノードを探索
      Object.values(node).forEach(traverse);
    }
  }

  traverse(obj);
  return text.replace(/\s+/g, ' ').trim(); // 余分な空白を整理
}

export const readDocx = {
    name: 'readDocxFile',
    description: "パスのワードファイルを読み込む",
    needsApproval: false,
    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "読み込みファイルのパス（例：'sample.docx'）",
            }
        },
        required: ['path']
    },
    execute: readDocxExecute
}
