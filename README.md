# Nano Code 🤖

**書籍「作って学ぶAIエージェント」学習プロジェクト**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-F9F1E1?logo=bun&logoColor=000)](https://bun.sh/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)](https://openai.com/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/features/actions)

AIエージェントをゼロから構築する学習プロジェクト。TypeScriptとBunランタイムを使用して、安全で拡張可能なAIアシスタントを実装します。

## 📚 学習の目的

このプロジェクトは「作って学ぶAIエージェント」書籍の学習を通じて、以下の技術を習得することを目指します：

- AIエージェントのアーキテクチャ設計
- ツールベースの拡張システム
- セキュリティとサンドボックスの実装
- 複数LLMプロバイダーの統合
- テスト駆動開発

## ✨ 特徴

### 🔧 多様なツール統合
- **ファイル操作**: 読み書き・編集
- **Git操作**: ブランチ管理・コミット・プッシュ
- **GitHub連携**: PR作成・Issue管理
- **コマンド実行**: 安全なシェルコマンド実行
- **Webアクセス**: 安全なHTTPリクエスト

### 🛡️ セキュリティ重視
- **サンドボックス実行**: Bubblewrapを使用したプロセス隔離
- **承認システム**: 危険な操作のユーザー確認
- **コマンドフィルタリング**: 許可リスト方式
- **環境変数制限**: 機密情報漏洩防止

### 🌐 複数LLM対応
- OpenAI GPTシリーズ
- Google Gemini
- Anthropic Claude

## 🚀 インストール

### 必要条件
- [Bun](https://bun.sh/) ランタイム
- [Git](https://git-scm.com/)
- [GitHub CLI](https://cli.github.com/) (オプション)

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/takata-hiroyuki/nano-code.git
cd nano-code

# 依存関係をインストール
bun install

# 環境変数を設定
export LLM_PROVIDER=openai
export LLM_MODEL=gpt-4o-mini
export LLM_API_KEY=your-api-key-here
```

### 開発コンテナ使用 (推奨)

VS Codeの開発コンテナ機能を使用して、隔離された開発環境を構築：

```bash
# VS Codeで開く
code .

# コマンドパレットから "Dev Containers: Reopen in Container" を実行
```

## 📖 使用方法

### 基本的な実行

```bash
# シンプルなタスク実行
bun run agent "Hello Worldと出力するプログラムを作成してください"

# 自動承認モード（危険な操作を自動承認）
bun run agent --yolo "テストファイルを作成して実行してください"

# サンドボックスモード
bun run agent --sandbox "ファイルを操作してください"
```

### GitHub Actionsでの実行

ワークフローディスパッチを使用してGitHub上で実行：

```yaml
# .github/workflows/example.yml
name: Run Nano Code
on: workflow_dispatch
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun run agent --yolo "${{ inputs.task }}"
        env:
          LLM_PROVIDER: openai
          LLM_MODEL: gpt-4o-mini
          LLM_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐
│   CLI Entry     │    │   Agent Core    │
│   (bin/cli.ts)  │◄──►│  (src/core/)    │
└─────────────────┘    └─────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
            ┌───────▼───┐ ┌──▼───┐ ┌───▼────┐
            │ Providers │ │ Tools │ │ Sandbox │
            │ (OpenAI,  │ │ (Git, │ │ (bwrap) │
            │  Google)  │ │ GitHub)│ └────────┘
            └───────────┘ └───────┘
```

### 主要コンポーネント

- **Agent Core**: エージェントのメイン処理とツール実行管理
- **Providers**: 各種LLM APIとの連携
- **Tools**: 外部ツールとの統合（ファイル、Git、GitHubなど）
- **Sandbox**: セキュリティのためのプロセス隔離

## 🔒 セキュリティ機能

### 承認システム
危険な操作（ファイル削除、コマンド実行など）はユーザー承認を要求：

```typescript
// 承認が必要なツール
const dangerousTool = {
  name: 'execCommand',
  needsApproval: true,  // 承認必須
  execute: async (args) => { /* ... */ }
};
```

### サンドボックス実行
Linux環境ではBubblewrapを使用してプロセスを隔離：

```typescript
const sandbox = new Sandbox();
await sandbox.run('dangerous-command', [], {
  allowNetwork: false,  // ネットワーク遮断
  cwd: '/safe/directory' // 作業ディレクトリ制限
});
```

## 🧪 テスト

```bash
# 全テスト実行
bun test

# 特定のテスト実行
bun test src/__tests__/core/agent.test.ts

# カバレッジレポート
bun test --coverage
```

## 📁 プロジェクト構造

```
nano-code/
├── bin/                    # CLIエントリーポイント
│   └── cli.ts
├── src/
│   ├── core/              # コア機能
│   │   ├── agent.ts       # エージェント本体
│   │   ├── approval.ts    # 承認システム
│   │   ├── generate-text.ts # LLM連携
│   │   ├── prompt.ts      # プロンプト管理
│   │   └── sandbox.ts     # サンドボックス
│   ├── providers/         # LLMプロバイダー
│   │   ├── openai.ts
│   │   ├── google.ts
│   │   └── modelFactory.ts
│   ├── tools/             # 外部ツール統合
│   │   ├── execCommand.ts
│   │   ├── git.ts
│   │   ├── github.ts
│   │   └── readFile.ts
│   └── types.ts           # 型定義
├── workspace/             # 作業ディレクトリ
├── .devcontainer/         # 開発コンテナ設定
└── .github/workflows/     # GitHub Actions
```

## 🔧 設定

### 環境変数

| 変数 | 説明 | 例 |
|------|------|----|
| `LLM_PROVIDER` | LLMプロバイダー | `openai`, `google` |
| `LLM_MODEL` | モデル名 | `gpt-4o-mini`, `gemini-pro` |
| `LLM_API_KEY` | APIキー | `sk-...` |

### 設定ファイル

`src/config.ts` で動作をカスタマイズ：

```typescript
export let config = {
  sandbox: false,           // サンドボックス有効化
  allowedDomains: [         // 許可ドメイン
    'api.github.com',
    'github.com'
  ]
};
```

## 🤝 貢献

1. Fork してブランチを作成
2. 変更を実装
3. テストを追加
4. Pull Request を作成

### 開発者向け

```bash
# 開発サーバー起動
bun run dev

# 型チェック
bun run type-check

# リント
bun run lint
```

## 📄 ライセンス

このプロジェクトは学習目的で作成されており、MITライセンスの下で公開されています。

## 📚 関連書籍

- [**作って学ぶAIエージェント**](https://example.com) - このプロジェクトの基盤となる書籍

---

**注意**: このプロジェクトは学習目的で作成されています。本番環境での使用には十分なセキュリティレビューを行ってください。
