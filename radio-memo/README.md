# ラジオメモ / Radio Memo

[日本語](#日本語) | [English](#english)

---

## 日本語

### 概要

ラジオメモは、ラジオ受信ログを記録・管理するためのオフライン対応ウェブアプリケーションです。アマチュア無線や短波放送の愛好家が、受信した局の情報を簡単に記録できます。

### 主な機能

#### ログ管理
- **ログの追加**: 周波数、相手局コールサイン、相手局QTH、RSレポート、備考、UTC時刻を記録
- **ログの削除**: 各エントリに削除ボタンを配置、確認ダイアログで誤操作を防止
- **周波数入力**: 周波数を入力し、単位（MHz/kHz）を選択（デフォルトはMHz）
- **自動バンド判定**: 入力された周波数と単位からバンド（LF/MF/HF/VHF/UHF）を自動計算
  - 入力中は自動で計算され、保存時に記録されます
  - 一覧表示時にバンドが表示されます
- **周波数の自動フォーマット**: 入力フィールドから離れると、自動的に3桁の小数点形式（例: 7.000）にフォーマットされます
- **UTC時刻記録**: ログ作成時のUTC時刻を自動設定、一覧表示時はローカルタイムゾーンで表示
- **ページネーション**: 最新10件ずつ表示、前後のページに移動可能

#### データ管理
- **データストレージ**: IndexedDB（Dexie.js使用）でローカルに保存
  - 大量のログを効率的に管理
  - 構造化されたクエリとインデックス
  - ブラウザのストレージ容量内で動作
- **エクスポート機能**: 全ログをCSV形式でダウンロード
  - UTF-8エンコード（BOM付き）でExcel対応
  - UUID付きでデータの一意性を保証
  - タイムスタンプとUUID付きファイル名で自動生成
  - ファイル形式: `radio-memo-export-YYYY-MM-DDTHH-MM-SS-UUID.csv`
- **インポート機能**: CSV形式でログを一括インポート
  - UUID-based重複検出: 同じUUIDのログは自動スキップ
  - コンテンツベース重複検出: 時刻、周波数、メモが同一のログも自動スキップ
  - インポート結果を通知（新規追加件数、重複スキップ件数）

#### オフライン機能
- **Service Worker**: アプリ全体をキャッシュしてオフラインで動作
  - HTML、CSS、JavaScriptファイルをキャッシュ
  - 外部ライブラリ（Dexie.js）もキャッシュ
  - ネットワーク接続なしで完全動作
- **IndexedDB**: Dexieを使用したローカルデータベース
  - データはブラウザ内に安全に保存
  - 高速なクエリとページネーション
- **PWA対応**: インストール可能なプログレッシブウェブアプリ
  - ホーム画面に追加可能（iOS/Android）
  - スタンドアロンモードで動作
  - アプリライクな体験

#### ユーザーインターフェース
- **ミニマリストデザイン**: テキスト中心の装飾のないUI、モノスペースフォント採用
- **レスポンシブデザイン**: モバイルとデスクトップの両方に対応
- **メモの自動省略**: 長いメモは3行まで表示、クリックで全文表示
- **長いURL対応**: ShazamリンクなどのURLも画面幅に収まるよう自動改行
- **設定メニュー**: ページ下部の「管理」ボタンからエクスポート・インポート機能にアクセス
- **直感的な操作**: シンプルで分かりやすいUI
- **モバイル最適化**: タッチ操作に適したボタンサイズ

### 技術スタック

- **HTML5**: セマンティックなマークアップ
- **CSS3**: モダンなスタイリング、フレックスボックスレイアウト
- **JavaScript (ES6+)**: モジュール化された機能実装、外部フレームワーク不要
- **Dexie.js 3.2.4**: IndexedDBのラッパーライブラリ（CDN経由）
- **Service Worker**: オフライン機能とキャッシング
- **PWA**: プログレッシブウェブアプリケーション技術

### データ構造

各ログレコードには以下の情報が含まれます：

- **UUID**: 一意識別子（重複検出に使用）
- **バンド**: LF、MF、HF、VHF、UHF（周波数から自動計算）
  - **LF (Longwave)**: 30-300 kHz (0.03-0.3 MHz)
  - **MF (Mediumwave)**: 300-3000 kHz (0.3-3 MHz)
  - **HF (Shortwave)**: 3-30 MHz
  - **VHF**: 30-300 MHz
  - **UHF**: 300-3000 MHz
- **周波数**: 数値（3桁の小数点形式で保存）と単位（MHz/kHz）
- **相手局コールサイン**: 相手局の識別符号（オプション）
- **相手局QTH**: 相手局の位置情報（オプション）
- **RSレポート**: 信号強度（RS形式、59〜51、フォン用、オプション）
- **備考**: 任意のテキスト（オプション）
- **タイムスタンプ**: UTC時刻（ISO 8601形式で保存）

### 使い方

#### 基本操作

1. **新しいログを追加**
   - 「新しいログ」ボタンをクリック
   - **周波数を入力**: 数値を入力（例: 7.195）
   - **単位を選択**: MHz または kHz を選択（デフォルトはMHz）
   - バンドは周波数と単位から自動的に計算されます（LF/MF/HF/VHF/UHF）
   - **相手局コールサイン**: 相手局の識別符号を入力（オプション）（例: JA1ABC）
   - **相手局QTH**: 相手局の位置情報を入力（オプション）（例: 東京都港区）
   - **RSレポート**: 信号強度を選択（オプション）（59=完璧な信号〜51=非常に弱い）
   - **備考**: 任意のメモを入力（オプション）
   - UTC時刻が自動設定されます
   - 「保存」をクリック
   - 周波数は自動的に3桁の小数点形式でフォーマットされます（例: 7.195 → 7.195, 7 → 7.000）

2. **ログを閲覧**
   - ログ一覧で最新10件を表示（最新のログが上部に表示）
   - 各ログには以下の情報が表示されます：
     - 日時（ローカルタイムゾーン）
     - バンド（LF/MF/HF/VHF/UHF）
     - 周波数（単位付き）
     - 相手局コールサイン（入力されている場合）
     - 相手局QTH（入力されている場合）
     - RSレポート（入力されている場合）
     - 備考（入力されている場合）
   - ページネーションで前後のページに移動
   - 長いメモは3行まで表示、クリックで全文表示

3. **ログを削除**
   - 各ログの「削除」ボタンをクリック
   - 確認ダイアログで「OK」を選択
   - **注意**: 削除は取り消せません

4. **エクスポート**
   - ページ下部の「管理」ボタンをクリック
   - 「エクスポート」を選択
   - CSV形式でダウンロード（Excel互換）
   - ファイルは自動的に保存されます

5. **インポート**
   - ページ下部の「管理」ボタンをクリック
   - 「インポート」を選択
   - CSVファイルを選択
   - 重複は自動的にスキップされます
   - インポート結果が表示されます（新規追加件数、重複スキップ件数）

#### PWAインストール

**デスクトップ（Chrome/Edge）:**
1. アプリをブラウザで開く
2. アドレスバーの「インストール」アイコンをクリック
3. 確認ダイアログで「インストール」をクリック

**iOS（Safari）:**
1. アプリをSafariで開く
2. 共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」を選択
4. 「追加」をタップ

**Android（Chrome）:**
1. アプリをChromeで開く
2. メニュー（⋮）から「ホーム画面に追加」を選択
3. 「追加」をタップ

### 使用上のヒント

- **定期的なバックアップ**: ブラウザのデータを消去するとログが失われます。定期的にエクスポート機能でバックアップを取ることをお勧めします
- **周波数入力のコツ**:
  - 整数を入力すると自動的に小数点以下3桁が付きます（例: 7 → 7.000）
  - 単位を間違えた場合は、ドロップダウンで変更すると自動的にバンドが再計算されます
- **メモの活用**: 長いメモ（Shazamリンクなど）も問題なく保存できます。一覧では3行まで表示され、クリックで全文を表示できます
- **オフライン使用**: 一度アプリを読み込めば、インターネット接続なしで使用できます
- **データの永続性**: データはブラウザのIndexedDBに保存されます。ブラウザのキャッシュクリアでは削除されませんが、「すべてのデータを削除」を実行すると消えるため注意してください

### ブラウザ対応

#### 推奨ブラウザ
- **Chrome / Edge** (最新版): 完全サポート
- **Firefox** (最新版): 完全サポート
- **Safari** (最新版): 完全サポート
- **モバイルブラウザ**: iOS Safari、Chrome Mobile

#### 必要な機能
- IndexedDB サポート
- Service Worker サポート
- ES6+ JavaScript サポート
- Crypto API (UUID生成用)

#### 既知の互換性
- 古いブラウザ（IE11など）では動作しません
- プライベートブラウジングモードでは一部機能が制限される場合があります

### 既知の制限事項

以下は現在の実装の制限事項です：

1. **バンドフィールドの表示**:
   - フォーム入力中、バンドは計算されていますが表示されません
   - 保存後のログ一覧では正しく表示されます
   - 入力した周波数が既知の範囲外の場合、バンドは空になります

2. **データの保存場所**:
   - データはブラウザのIndexedDBに保存されます
   - ブラウザのデータを完全に削除すると、ログも削除されます
   - 定期的なエクスポートによるバックアップを推奨します

3. **インポート時の検証**:
   - 不正なCSVファイルはエラーを引き起こす可能性があります
   - CSVファイルは正しい形式（エクスポートされたファイルの形式）で作成してください

4. **ネットワーク依存**:
   - 初回アクセス時はインターネット接続が必要です（Dexie.jsのCDN読み込みのため）
   - 一度読み込めば、以降はオフラインで完全動作します

5. **ストレージ容量**:
   - ブラウザのストレージ容量に依存します（通常は数MB〜数GB）
   - 大量のログ（数万件）を保存する場合は、ブラウザのストレージ設定を確認してください

### トラブルシューティング

#### ログが表示されない
- ブラウザのコンソールでエラーを確認してください
- ブラウザがIndexedDBをサポートしているか確認してください
- プライベートブラウジングモードを使用していないか確認してください

#### オフラインで動作しない
- 一度オンラインでアプリを完全に読み込む必要があります
- Service Workerが有効化されているか確認してください（開発者ツール → Application → Service Workers）

#### PWAがインストールできない
- HTTPSで提供されているか確認してください（localhostは例外）
- manifest.jsonが正しく読み込まれているか確認してください
- 必要なアイコンファイルが存在するか確認してください

#### データが消えた
- ブラウザの「すべてのデータを削除」を実行すると、IndexedDBのデータも削除されます
- 定期的にエクスポート機能でバックアップを作成してください
- 複数のブラウザで使用している場合、データはブラウザごとに独立しています

### セキュリティとプライバシー

- すべてのデータはローカル（ブラウザ内）に保存されます
- サーバーへのデータ送信は一切ありません
- インターネット接続は初回読み込み時のみ必要です
- エクスポートしたCSVファイルには全データが含まれるため、取り扱いに注意してください

### ライセンス

このプロジェクトはオープンソースです。

---

## English

### Overview

Radio Memo is an offline-capable web application for recording and managing radio reception logs. Perfect for amateur radio operators and shortwave broadcast enthusiasts to easily log station information.

### Key Features

#### Log Management
- **Add Logs**: Record frequency, callsign, QTH, RS report, memo, and UTC time
- **Delete Logs**: Delete button on each entry with confirmation dialog to prevent accidental deletion
- **Frequency Input**: Enter frequency and select unit (MHz/kHz, default is MHz)
- **Automatic Band Detection**: Band (LF/MF/HF/VHF/UHF) is automatically calculated from frequency and unit
  - Calculated automatically during input and saved with the log
  - Displayed in the log list view
- **Automatic Frequency Formatting**: When you leave the input field, frequency is automatically formatted to 3 decimal places (e.g., 7.000)
- **UTC Time Recording**: Automatically sets UTC time when creating logs, displays in local timezone in list view
- **Pagination**: Display 10 most recent records per page with navigation

#### Data Management
- **Data Storage**: Stored locally using IndexedDB (via Dexie.js)
  - Efficiently manages large numbers of logs
  - Structured queries and indexing
  - Works within browser storage limits
- **Export Function**: Download all logs in CSV format
  - UTF-8 encoding with BOM (Excel compatible)
  - UUID-based data uniqueness guarantee
  - Auto-generated filename with timestamp and UUID
  - Filename format: `radio-memo-export-YYYY-MM-DDTHH-MM-SS-UUID.csv`
- **Import Function**: Bulk import logs from CSV
  - UUID-based duplicate detection: Automatically skips logs with same UUID
  - Content-based duplicate detection: Also skips logs with identical time, frequency, and memo
  - Import result notification (new records added, duplicates skipped)

#### Offline Capabilities
- **Service Worker**: Caches entire app for offline operation
  - Caches HTML, CSS, and JavaScript files
  - Caches external libraries (Dexie.js)
  - Works completely without network connection
- **IndexedDB**: Local database using Dexie
  - Data stored securely in browser
  - Fast queries and pagination
- **PWA Ready**: Installable Progressive Web Application
  - Add to home screen (iOS/Android)
  - Runs in standalone mode
  - App-like experience

#### User Interface
- **Minimalist Design**: Text-focused interface with no visual decorations, monospaced font throughout
- **Responsive Design**: Works on both mobile and desktop
- **Auto-truncating Memos**: Long memos display up to 3 lines, click to expand
- **Long URL Support**: URLs like Shazam links wrap automatically to fit screen width
- **Settings Menu**: Access export/import functions via "管理" (Management) button at bottom of page
- **Intuitive Operation**: Simple and clear UI
- **Mobile Optimized**: Touch-friendly button sizes

### Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with flexbox layout
- **JavaScript (ES6+)**: Modular feature implementation, no external frameworks
- **Dexie.js 3.2.4**: IndexedDB wrapper library (via CDN)
- **Service Worker**: Offline functionality and caching
- **PWA**: Progressive Web Application technologies

### Data Structure

Each log record contains:

- **UUID**: Unique identifier (used for duplicate detection)
- **Band**: LF, MF, HF, VHF, or UHF (automatically calculated from frequency)
  - **LF (Longwave)**: 30-300 kHz (0.03-0.3 MHz)
  - **MF (Mediumwave)**: 300-3000 kHz (0.3-3 MHz)
  - **HF (Shortwave)**: 3-30 MHz
  - **VHF**: 30-300 MHz
  - **UHF**: 300-3000 MHz
- **Frequency**: Numeric value (stored with 3 decimal places) with unit (MHz/kHz)
- **Callsign**: Remote station identification (optional)
- **QTH**: Remote station location (optional)
- **RS Report**: Signal strength (RS format, 59-51, phone only, optional)
- **Memo**: Optional text
- **Timestamp**: UTC time (stored in ISO 8601 format)

### Usage

#### Basic Operations

1. **Add New Log**
   - Click "新しいログ" (New Log) button
   - **Enter frequency**: Input numeric value (e.g., 7.195)
   - **Select unit**: Choose MHz or kHz (default is MHz)
   - Band is automatically calculated from frequency and unit (LF/MF/HF/VHF/UHF)
   - **Callsign**: Enter remote station identification (optional) (e.g., JA1ABC)
   - **QTH**: Enter remote station location (optional) (e.g., Tokyo, Minato-ku)
   - **RS Report**: Select signal strength (optional) (59=Perfect signal ~ 51=Very weak)
   - **Memo**: Enter optional notes
   - UTC time is set automatically
   - Click "保存" (Save)
   - Frequency is automatically formatted to 3 decimal places (e.g., 7.195 → 7.195, 7 → 7.000)

2. **View Logs**
   - Log list shows 10 most recent records (newest at top)
   - Each log displays:
     - Date/time (local timezone)
     - Band (LF/MF/HF/VHF/UHF)
     - Frequency (with unit)
     - Callsign (if entered)
     - QTH (if entered)
     - RS Report (if entered)
     - Memo (if entered)
   - Use pagination to navigate between pages
   - Click on long memos to expand and view full text (displays up to 3 lines by default)

3. **Delete Logs**
   - Click the "削除" (Delete) button on each log entry
   - Confirm deletion in the dialog
   - **Warning**: Deletion cannot be undone

4. **Export**
   - Click "管理" (Settings) button at bottom of page
   - Select "エクスポート" (Export)
   - Download in CSV format (Excel compatible)
   - File is saved automatically

5. **Import**
   - Click "管理" (Settings) button at bottom of page
   - Select "インポート" (Import)
   - Choose CSV file
   - Duplicates are automatically skipped
   - Import results are displayed (new records added, duplicates skipped)

#### PWA Installation

**Desktop (Chrome/Edge):**
1. Open the app in browser
2. Click the "Install" icon in the address bar
3. Click "Install" in the confirmation dialog

**iOS (Safari):**
1. Open the app in Safari
2. Tap the Share button (□↑)
3. Select "Add to Home Screen"
4. Tap "Add"

**Android (Chrome):**
1. Open the app in Chrome
2. Select "Add to Home screen" from menu (⋮)
3. Tap "Add"

### Usage Tips

- **Regular Backups**: Clearing browser data will delete your logs. Regular exports are recommended for backup
- **Frequency Input Tips**:
  - Entering a whole number will automatically add 3 decimal places (e.g., 7 → 7.000)
  - If you select the wrong unit, change it in the dropdown and the band will automatically recalculate
- **Using Memos**: Long memos (like Shazam links) can be saved without issues. Lists show up to 3 lines; click to view full text
- **Offline Use**: Once the app is loaded, it works without internet connection
- **Data Persistence**: Data is stored in browser's IndexedDB. It won't be deleted by cache clearing, but will be deleted if you select "Delete all data" in browser settings

### Browser Support

#### Recommended Browsers
- **Chrome / Edge** (latest): Full support
- **Firefox** (latest): Full support
- **Safari** (latest): Full support
- **Mobile Browsers**: iOS Safari, Chrome Mobile

#### Required Features
- IndexedDB support
- Service Worker support
- ES6+ JavaScript support
- Crypto API (for UUID generation)

#### Known Compatibility
- Does not work on older browsers (IE11, etc.)
- Some features may be limited in private browsing mode

### Known Limitations

Current implementation limitations:

1. **Band Field Display**:
   - During form input, band is calculated but not displayed
   - After saving, band is correctly displayed in the log list
   - If entered frequency is outside known ranges, band will be empty

2. **Data Storage Location**:
   - Data is stored in browser's IndexedDB
   - Completely clearing browser data will delete logs
   - Regular exports for backup are recommended

3. **Import Validation**:
   - Invalid CSV files may cause errors
   - CSV files should be in the correct format (same format as exported files)

4. **Network Dependency**:
   - Internet connection required for first access (to load Dexie.js from CDN)
   - After initial load, works completely offline

5. **Storage Capacity**:
   - Depends on browser storage capacity (typically several MB to several GB)
   - For storing large numbers of logs (tens of thousands), check browser storage settings

### Troubleshooting

#### Logs Not Displaying
- Check browser console for errors
- Verify browser supports IndexedDB
- Verify not using private browsing mode

#### Not Working Offline
- App must be fully loaded online at least once
- Verify Service Worker is activated (DevTools → Application → Service Workers)

#### PWA Won't Install
- Verify served over HTTPS (localhost is exception)
- Verify manifest.json loads correctly
- Verify required icon files exist

#### Data Disappeared
- Selecting "Delete all data" in browser settings deletes IndexedDB data
- Create regular backups using export function
- Data is separate for each browser if using multiple browsers

### Security and Privacy

- All data is stored locally (in browser)
- No data transmission to servers
- Internet connection only required for initial load
- Exported CSV files contain all data - handle with care

### License

This project is open source.

---

## Development

Built with vanilla JavaScript for simplicity and performance. No framework dependencies required.

### File Structure

```
radio-memo/
├── index.html          # Main HTML file
├── app.js             # Application logic
├── style.css          # Styles
├── sw.js              # Service Worker
├── manifest.json      # PWA manifest
└── icons/             # App icons
```

### Key Technologies

- **Dexie.js**: Simplifies IndexedDB operations with promises and schema versioning
- **Service Worker**: Implements cache-first strategy for offline support
- **CSS Flexbox**: Responsive layout without frameworks
- **Vanilla JS**: No build process or transpilation required

### Database Schema

The app uses Dexie.js schema versioning (currently v5):

```javascript
// Version 5 schema
logs: '++id, uuid, band, frequency, callsign, qth, rst, memo, timestamp'
```

**Indexes:**
- `id`: Auto-incremented primary key
- `uuid`: Unique identifier for duplicate detection
- `band`: Band classification (LF/MF/HF/VHF/UHF)
- `frequency`: Numeric frequency value
- `callsign`: Remote station identification
- `qth`: Remote station location
- `rst`: Signal strength report
- `memo`: User notes
- `timestamp`: ISO 8601 UTC timestamp

### Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

**Author**: [nelforzo.github.io](https://nelforzo.github.io)
