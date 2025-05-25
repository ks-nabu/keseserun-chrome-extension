# 🙈 消せるん (Keseserun)

指定したIDやclassの要素を簡単に非表示/表示切り替えできるChrome拡張機能です。

## ✨ 機能

- **ID・Class指定**: `#header`, `.advertisement` などのセレクタで要素を非表示
- **タグ名指定**: `div`, `span` などのタグ名で生要素（IDやclass無し）を一括非表示
- **混在指定**: `#header, .sidebar, div, span` のように複数種類を同時指定可能
- **復元機能**: 個別復元 & 一括復元に対応
- **状態保持**: ページリロード後も非表示状態を維持
- **リアルタイム管理**: 現在非表示中の要素をリスト表示

## 🚀 インストール方法

### 開発者モードでのインストール

1. このリポジトリをダウンロードまたはクローン
```bash
git clone https://github.com/ks-nabu/keseserun-chrome-extension.git
```

2. Chromeで `chrome://extensions/` を開く

3. 「デベロッパーモード」をオンにする

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. ダウンロードしたフォルダを選択

## 💡 使用方法

### 基本的な使い方

1. **拡張機能アイコンをクリック**してポップアップを開く

2. **セレクタを入力**:
   - ID指定: `#header`
   - Class指定: `.advertisement`
   - タグ名: `div`（IDやclass無しの要素のみ）
   - 複数指定: `#header, .sidebar, div`

3. **「非表示にする」ボタン**をクリック

4. **元に戻す**場合は同じセレクタを入力して「元に戻す」ボタン

### クイック選択機能

- プルダウンメニューからタグ名を選択すると自動でフォームに追加されます

### 非表示中要素の管理

- 現在非表示中の要素がリスト表示されます
- 個別の「表示」ボタンで一つずつ復元可能
- 「すべて元に戻す」で一括復元

## 🎯 使用例

### 広告を消す
```
.advertisement, #ad-banner, .popup-ad
```

### ヘッダーとフッターを消す
```
#header, #footer, .navbar
```

### 装飾のないdiv要素を整理
```
div
```

### 複合的な整理
```
#sidebar, .widget, div, span, .banner
```

## 🛠️ 技術仕様

- **対応ブラウザ**: Chrome (Manifest V3)
- **権限**: `activeTab`, `storage`, `scripting`
- **フレームワーク**: Vanilla JavaScript
- **ストレージ**: Chrome Storage API

## 📂 ファイル構成

```
├── manifest.json      # 拡張機能の設定
├── popup.html         # ポップアップUI
├── popup.css          # スタイルシート
├── popup.js           # ポップアップの制御
├── content.js         # ページ内で動作するスクリプト
└── icons/             # アイコンファイル
```

## 🔧 開発者向け情報

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/ks-nabu/keseserun-chrome-extension.git

# フォルダに移動
cd keseserun-chrome-extension

# Chrome拡張機能として読み込み
```

### アーキテクチャ

- **popup.js**: UI制御とChrome APIとの通信
- **content.js**: DOM操作と要素の非表示/表示処理
- **Storage**: 非表示状態の永続化

### カスタマイズ

セレクタの正規化ロジックやUI要素は各ファイルで簡単にカスタマイズできます。

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルをご覧ください。

## 🙏 謝辞

- ウェブページの不要な要素を簡単に非表示にしたいというニーズから生まれました
- フリーランスの開発現場やデモンストレーションでの利用を想定しています

## 📞 サポート

- 🐛 **バグ報告**: [Issues](https://github.com/ks-nabu/keseserun-chrome-extension/issues)
- 💡 **機能要望**: [Issues](https://github.com/ks-nabu/keseserun-chrome-extension/issues)