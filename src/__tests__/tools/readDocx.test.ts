import { describe, it, expect, vi, beforeAll } from 'vitest';
import { listDocxFiles, extractDocumentXml, extractTextFromWordXml, readDocx } from '../../tools/readDocx.ts'
import JSZip from 'jszip';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('readDocxツールのテスト', () => {
  const xmlText = '<w:document><w:body><w:p><w:t>Hello World</w:t></w:p></w:body></w:document>';
  let mockBuf: Uint8Array;

  // テスト開始前にJSZipを使用して有効な.docx（ZIP）バッファを作成
  beforeAll(async () => {
    const zip = new JSZip();
    zip.file('word/document.xml', xmlText);
    mockBuf = await zip.generateAsync({ type: 'uint8array' });
  });

  describe('ユニットテスト', () => {
    it('listDocxFiles: docx内のファイル一覧を特定できること', async () => {
      const res = await listDocxFiles(mockBuf);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.value).toContain('word/document.xml');
    });

    it('extractDocumentXml: word/document.xmlの内容を抽出できること', async () => {
      const res = await extractDocumentXml(mockBuf);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.value).toBe(xmlText);
    });

    it('extractTextFromWordXml: 入れ子になったXMLオブジェクトからテキストを抽出できること', () => {
      const mockParsed = {
        'w:document': {
          'w:body': {
            'w:p': [
              { 'w:r': [{ 'w:t': ['Hello'] }] },
              { 'w:r': [{ 'w:t': [' '] }] },
              { 'w:r': [{ 'w:t': [{ _: 'World' }] }] }
            ],
          },
        },
      };
      const text = extractTextFromWordXml(mockParsed);
      expect(text).toBe('Hello World');
    });
  });

  describe('統合テスト (execute)', () => {
    it('execute: docxを読み込んで整形されたテキストを返すこと', async () => {
      // fs 系のメソッドをモックして実ファイルへのアクセスを回避
      const realpathSpy = vi.spyOn(fs, 'realpath').mockImplementation(async (p) => p.toString());
      const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue({
        isFile: () => true,
        size: mockBuf.length
      } as any);

      // Bun.file をスパイしてモック化
      const spy = vi.spyOn(Bun, 'file').mockReturnValue({
        arrayBuffer: () => Promise.resolve(mockBuf.buffer)
      } as any);

      const result = await readDocx.execute({ path: 'test.docx' });
      expect(result).toBe('Hello World');
      
      realpathSpy.mockRestore();
      statSpy.mockRestore();
      spy.mockRestore();
    });

    it('execute: XML抽出に失敗した場合にエラーを投げること', async () => {
      const realpathSpy = vi.spyOn(fs, 'realpath').mockImplementation(async (p) => p.toString());
      const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue({ isFile: () => true, size: 4 } as any);

      const emptyBuf = new Uint8Array([0, 0, 0, 0]); // 不正なZIP
      const spy = vi.spyOn(Bun, 'file').mockReturnValue({
        arrayBuffer: () => Promise.resolve(emptyBuf.buffer)
      } as any);
      
      await expect(readDocx.execute({ path: 'invalid.docx' })).rejects.toThrow();
      
      realpathSpy.mockRestore();
      statSpy.mockRestore();
      spy.mockRestore();
    });

    it('execute: ワークスペース外のパスを拒否すること', async () => {
      await expect(readDocx.execute({ path: '../outside.docx' })).rejects.toThrow('アクセス拒否');
    });

    it('execute: シンボリックリンク経由でワークスペース外を参照している場合に拒否すること', async () => {
      // fs.realpath がワークスペース外を返すようにモック
      const realpathSpy = vi.spyOn(fs, 'realpath').mockResolvedValue('/outside/workspace/actual.docx');
      
      await expect(readDocx.execute({ path: 'symlink.docx' })).rejects.toThrow('シンボリック経由でワークスペース外を参照しています');
      
      realpathSpy.mockRestore();
    });

    it('execute: 1MBを超えるファイルを拒否すること', async () => {
      const realpathSpy = vi.spyOn(fs, 'realpath').mockImplementation(async (p) => p.toString());
      const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue({
        isFile: () => true,
        size: 2 * 1024 * 1024 // 2MB (制限の1MBを超える)
      } as any);
      
      await expect(readDocx.execute({ path: 'huge.docx' })).rejects.toThrow('ファイルサイズが大きすぎます');
      
      realpathSpy.mockRestore();
      statSpy.mockRestore();
    });
  });
});