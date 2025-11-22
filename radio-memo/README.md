# ラジオメモ / Radio Memo

[日本語](#日本語) | [English](#english)

---

## 日本語

### 概要

ラジオメモは、ラジオ受信ログを記録・管理するためのオフライン対応ウェブアプリケーションです。アマチュア無線や短波放送の愛好家が、受信した局の情報を簡単に記録できます。

### 主な機能

#### ログ管理
- **ログの追加**: バンド、周波数、コールサイン、QTH、RSレポート、メモ、UTC時刻を記録
- **ログの削除**: 各エントリに削除ボタンを配置、確認ダイアログで誤操作を防止
- **バンド選択**: LF (Long Wave)、MF (Medium Wave)、HF (Short Wave)、VHF、UHFから選択
- **自動単位変換**:
  - LF/MFバンド: kHz表示
  - HF/VHF/UHFバンド: MHz表示
- **UTC時刻記録**: ログ作成時のUTC時刻を自動設定
- **ページネーション**: 最新10件ずつ表示

#### データ管理
- **エクスポート機能**: 全ログをCSV形式でダウンロード
  - UTF-8エンコード（BOM付き）でExcel対応
  - UUID付きでデータの一意性を保証
  - タイムスタンプ付きファイル名で自動生成
- **インポート機能**: CSV形式でログを一括インポート
  - UUID-based重複検出: 同じUUIDのログは自動スキップ
  - コンテンツベース重複検出: 時刻、周波数、メモが同一のログも自動スキップ
  - インポート結果を通知（新規追加件数、重複スキップ件数）

#### オフライン機能
- **Service Worker**: アプリ全体をキャッシュしてオフラインで動作
- **IndexedDB**: Dexieを使用したローカルデータベース
- **PWA対応**: インストール可能なプログレッシブウェブアプリ

#### ユーザーインターフェース
- **ミニマリストデザイン**: テキスト中心の装飾のないUI、モノスペースフォント採用
- **レスポンシブデザイン**: モバイルとデスクトップの両方に対応
- **メモの自動省略**: 長いメモは3行まで表示、クリックで全文表示
- **長いURL対応**: ShazamリンクなどのURLも画面幅に収まるよう自動改行
- **設定メニュー**: ページ下部の設定ボタンからエクスポート・インポート機能にアクセス
- **直感的な操作**: シンプルで分かりやすいUI

### 技術スタック

- **HTML5**: セマンティックなマークアップ
- **CSS3**: モダンなスタイリング、フレックスボックスレイアウト
- **JavaScript (ES6+)**: モジュール化された機能実装
- **Dexie.js**: IndexedDBのラッパーライブラリ
- **Service Worker**: オフライン機能とキャッシング
- **PWA**: プログレッシブウェブアプリケーション技術

### データ構造

各ログレコードには以下の情報が含まれます：

- **UUID**: 一意識別子（重複検出に使用）
- **バンド**: LF、MF、HF、VHF、UHF
- **周波数**: 数値（単位は自動判定）
- **コールサイン**: 相手局の識別符号
- **QTH**: 相手局の位置情報
- **RSレポート**: 信号強度（RS形式、59〜51）
- **メモ**: 任意のテキスト
- **タイムスタンプ**: UTC時刻

### 使い方

1. **新しいログを追加**
   - 「新しいログ」ボタンをクリック
   - バンドを選択（周波数単位が自動調整されます）
   - 周波数を入力
   - メモを入力（オプション）
   - UTC時刻が自動設定されます
   - 「保存」をクリック

2. **ログを閲覧**
   - ログ一覧で最新10件を表示
   - ページネーションで前後のページに移動
   - 長いメモはクリックで全文表示

3. **ログを削除**
   - 各ログの削除ボタンをクリック
   - 確認ダイアログで「OK」を選択

4. **エクスポート**
   - ページ下部の「設定」ボタンをクリック
   - 「エクスポート」を選択
   - CSV形式でダウンロード

5. **インポート**
   - ページ下部の「設定」ボタンをクリック
   - 「インポート」を選択
   - CSVファイルを選択
   - 重複は自動的にスキップされます

### ブラウザ対応

- Chrome / Edge（推奨）
- Firefox
- Safari
- モバイルブラウザ（iOS Safari、Chrome Mobile）

### ライセンス

このプロジェクトはオープンソースです。

---

## English

### Overview

Radio Memo is an offline-capable web application for recording and managing radio reception logs. Perfect for amateur radio operators and shortwave broadcast enthusiasts to easily log station information.

### Key Features

#### Log Management
- **Add Logs**: Record band, frequency, callsign, QTH, RS report, memo, and UTC time
- **Delete Logs**: Delete button on each entry with confirmation dialog to prevent accidental deletion
- **Band Selection**: Choose from LF (Long Wave), MF (Medium Wave), HF (Short Wave), VHF, and UHF
- **Automatic Unit Conversion**:
  - LF/MF bands: kHz display
  - HF/VHF/UHF bands: MHz display
- **UTC Time Recording**: Automatically sets UTC time when creating logs
- **Pagination**: Display 10 most recent records per page

#### Data Management
- **Export Function**: Download all logs in CSV format
  - UTF-8 encoding with BOM (Excel compatible)
  - UUID-based data uniqueness guarantee
  - Auto-generated filename with timestamp
- **Import Function**: Bulk import logs from CSV
  - UUID-based duplicate detection: Automatically skips logs with same UUID
  - Content-based duplicate detection: Also skips logs with identical time, frequency, and memo
  - Import result notification (new records added, duplicates skipped)

#### Offline Capabilities
- **Service Worker**: Caches entire app for offline operation
- **IndexedDB**: Local database using Dexie
- **PWA Ready**: Installable Progressive Web Application

#### User Interface
- **Minimalist Design**: Text-focused interface with no visual decorations, monospaced font throughout
- **Responsive Design**: Works on both mobile and desktop
- **Auto-truncating Memos**: Long memos display up to 3 lines, click to expand
- **Long URL Support**: URLs like Shazam links wrap automatically to fit screen width
- **Settings Menu**: Access export/import functions via settings button at bottom of page
- **Intuitive Operation**: Simple and clear UI

### Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with flexbox layout
- **JavaScript (ES6+)**: Modular feature implementation
- **Dexie.js**: IndexedDB wrapper library
- **Service Worker**: Offline functionality and caching
- **PWA**: Progressive Web Application technologies

### Data Structure

Each log record contains:

- **UUID**: Unique identifier (used for duplicate detection)
- **Band**: LF, MF, HF, VHF, or UHF
- **Frequency**: Numeric value (unit automatically determined)
- **Callsign**: Station identification
- **QTH**: Station location
- **RS Report**: Signal strength (RS format, 59-51)
- **Memo**: Optional text
- **Timestamp**: UTC time

### Usage

1. **Add New Log**
   - Click "新しいログ" (New Log) button
   - Select band (frequency unit adjusts automatically)
   - Enter frequency
   - Enter memo (optional)
   - UTC time is set automatically
   - Click "保存" (Save)

2. **View Logs**
   - Log list shows 10 most recent records
   - Use pagination to navigate between pages
   - Click on long memos to expand and view full text

3. **Delete Logs**
   - Click the delete button on each log entry
   - Confirm deletion in the dialog

4. **Export**
   - Click "設定" (Settings) button at bottom of page
   - Select "エクスポート" (Export)
   - Download in CSV format

5. **Import**
   - Click "設定" (Settings) button at bottom of page
   - Select "インポート" (Import)
   - Choose CSV file
   - Duplicates are automatically skipped

### Browser Support

- Chrome / Edge (Recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

### License

This project is open source.

---

## Development

Built with vanilla JavaScript for simplicity and performance. No framework dependencies required.

**Author**: [nelforzo.github.io](https://nelforzo.github.io)
