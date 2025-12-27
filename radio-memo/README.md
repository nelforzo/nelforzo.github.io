# ラジオメモ / Radio Memo

[日本語](#日本語) | [English](#english)

---

## 日本語

### 概要

ラジオメモは、ラジオ受信ログを記録・管理するためのオフライン対応ウェブアプリケーションです。アマチュア無線や短波放送の愛好家が、受信した局の情報を簡単に記録できます。

### 開発について

このアプリは、第４級アマチュア無線技士の資格取得を目指している開発者によって作成されました。アマチュア無線の知識と経験の成長に合わせて進化していくことを想定しており、学習の過程と実際の運用ニーズに基づいて開発を続けています。

運用者としての理解が深まるにつれて、機能の追加・変更・置き換えが行われる可能性があります。このアプリは、アマチュア無線家としての成長とともに歩む、実践的なツールとして位置づけられています。

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
- **ページネーション**: 最新10件ずつ表示、「さらに表示」ボタンで追加読み込み
    - 手動ローディング方式で必要な分だけ読み込み
    - すべてのログを表示したら終了メッセージを表示
    - 同時読み込みを防止するロック機構

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
    - 大量インポート時のバッチ処理: 500件ずつ処理してUI凍結を防止
    - 堅牢なCSVパース: 引用符フィールド、複数行フィールド、各種改行コード（CR/LF/CRLF）に対応
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
- **ダークモード対応**: システム設定に応じて自動的にダークモードに切り替わります
- **レスポンシブデザイン**: モバイルとデスクトップの両方に対応
    - スマホ（〜600px）: 1カラムレイアウト
    - タブレット（768px〜）: 2カラムグリッド
    - デスクトップ（900px〜）: 最大3カラムグリッド
    - 大型ディスプレイ（1400px〜）: 1400px最大幅で中央配置
- **スティッキーヘッダー**: スクロール時も上部に固定されるヘッダー
    - 「追加」ボタンをヘッダーに配置し、常にアクセス可能
    - タイトルクリックでページ上部へスムーズスクロール
    - キーボードナビゲーション対応（Enter/Spaceキー）
- **メモの自動省略**: 長いメモは3行まで表示、クリックで全文表示
- **長いURL対応**: ShazamリンクなどのURLも画面幅に収まるよう自動改行
- **設定メニュー**: ページ下部の「管理」ボタンからエクスポート・インポート機能にアクセス
    - クリック外しで自動的に閉じるポップオーバー
- **直感的な操作**: シンプルで分かりやすいUI
- **モバイル最適化**: タッチ操作に適したボタンサイズ
- **キーボードアクセシビリティ**: すべてのインタラクティブ要素にキーボードでアクセス可能
- **トップへ戻るリンク**: 20件以上のログを読み込んだ時にリスト下部に表示

### 技術スタック

- **HTML5**: セマンティックなマークアップ
- **CSS3**: モダンなスタイリング、フレックスボックスレイアウト
- **JavaScript (ES6+)**: モジュール化された機能実装、外部フレームワーク不要
- **Dexie.js 3.2.4**: IndexedDBのラッパーライブラリ（CDN経由）
- **Service Worker**: オフライン機能とキャッシング
- **PWA**: プログレッシブウェブアプリケーション技術

### パフォーマンスとセキュリティ

#### パフォーマンス最適化

- **イベントデリゲーション**: 全ログエントリに対して単一のイベントリスナーを使用し、メモリ使用量を削減
- **バッチ処理**: 大量データインポート時に500件ずつ処理してUIの応答性を維持
- **周波数計算の最適化**: 前回の値をキャッシュして不要な再計算を回避
- **遅延ローディング**: ページネーションで必要な分だけデータを読み込み
- **効率的なクエリ**: Dexieのoffset/limit機能を使用した高速なデータベースクエリ

#### セキュリティ機能

- **XSS対策**: すべてのユーザー入力を表示前にエスケープ処理
- **ローカルデータストレージ**: サーバーへのデータ送信なし、すべてブラウザ内で処理
- **UUID生成**: Crypto APIを使用（フォールバックあり）
- **入力検証**: 数値パースとNaNチェックによる堅牢な入力処理
- **確認ダイアログ**: 削除操作には必ず確認を要求

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

### About This Project

This app is developed by someone currently studying for the 4th class amateur radio license (第４級アマチュア無線技士). It's designed to evolve alongside my growing knowledge and experience in amateur radio, with development driven by the learning process and practical operating needs.

As my understanding as an operator deepens, features may be added, modified, or replaced. This app is positioned as a practical tool that grows with my journey as a ham radio operator.

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
- **Pagination**: Display 10 most recent records per page, load more with "さらに表示" button
    - Manual loading approach to load only what's needed
    - End-of-list message when all logs are displayed
    - Concurrent load prevention mechanism

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
    - Batch processing for large imports: Processes 500 items at a time to prevent UI freezing
    - Robust CSV parsing: Handles quoted fields, multiline fields, and various line endings (CR/LF/CRLF)
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
- **Dark Mode Support**: Automatically switches to dark mode based on system preferences
- **Responsive Design**: Works on both mobile and desktop
    - Mobile (~600px): Single column layout
    - Tablet (768px+): 2-column grid
    - Desktop (900px+): Up to 3-column grid
    - Large displays (1400px+): Max 1400px width, centered
- **Sticky Header**: Header remains fixed at top when scrolling
    - Add button placed in header for constant access
    - Click title to smoothly scroll to top
    - Keyboard navigation support (Enter/Space keys)
- **Auto-truncating Memos**: Long memos display up to 3 lines, click to expand
- **Long URL Support**: URLs like Shazam links wrap automatically to fit screen width
- **Settings Menu**: Access export/import functions via "管理" (Management) button at bottom of page
    - Auto-dismissing popover when clicking outside
- **Intuitive Operation**: Simple and clear UI
- **Mobile Optimized**: Touch-friendly button sizes
- **Keyboard Accessibility**: All interactive elements accessible via keyboard
- **Back to Top Link**: Appears at bottom of list when 20+ logs are loaded

### Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with flexbox layout
- **JavaScript (ES6+)**: Modular feature implementation, no external frameworks
- **Dexie.js 3.2.4**: IndexedDB wrapper library (via CDN)
- **Service Worker**: Offline functionality and caching
- **PWA**: Progressive Web Application technologies

### Performance and Security

#### Performance Optimizations

- **Event Delegation**: Uses single event listener for all log entries to reduce memory usage
- **Batch Processing**: Processes large data imports in 500-item batches to maintain UI responsiveness
- **Frequency Calculation Optimization**: Caches previous value to avoid unnecessary recalculation
- **Lazy Loading**: Pagination loads only needed data
- **Efficient Queries**: Uses Dexie's offset/limit features for fast database queries

#### Security Features

- **XSS Prevention**: All user input is escaped before display
- **Local Data Storage**: No data transmission to servers, all processing happens in browser
- **UUID Generation**: Uses Crypto API (with fallback)
- **Input Validation**: Robust input handling with number parsing and NaN checks
- **Confirmation Dialogs**: Delete operations always require confirmation

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
    - Cache versioning for updates (current: v56)
    - Caches all app files, external libraries, and fonts
    - Network fallback for cache misses
    - Whitelisted external URLs (unpkg.com, googleapis.com, gstatic.com)
- **CSS Flexbox**: Responsive layout without frameworks
    - 6-level responsive breakpoint system
    - CSS Grid for multi-column layouts
    - Native CSS dark mode via media queries
- **Vanilla JS**: No build process or transpilation required
    - Event delegation for efficient event handling
    - Crypto API for UUID generation with Math.random() fallback
    - Content-based and UUID-based duplicate detection

### Dependencies

**Runtime Dependencies** (loaded via CDN):
- Dexie.js v3.2.4 - IndexedDB wrapper
- DotGothic16 font - Google Fonts

**Development Dependencies** (for contributors):
- ESLint v8.57.0 - JavaScript linter
- Prettier v3.2.4 - Code formatter

Note: Development dependencies are optional. The app runs without Node.js or npm.

### Database Schema

The app uses Dexie.js schema versioning (currently v5):

```javascript
// Version 5 schema
logs: '++id, uuid, band, frequency, callsign, qth, rst, memo, timestamp';
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

### Coding Standards

This project follows JavaScript industry standards for code quality and consistency.

#### Naming Conventions

- **Variables**: `camelCase` (e.g., `loadedCount`, `isLoadingLogs`)
- **Functions**: `camelCase` (e.g., `loadLogs()`, `formatTimestamp()`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `ITEMS_PER_LOAD`)
- **CSS Classes/IDs**: `kebab-case` (e.g., `new-log-form`, `btn-primary`)

**Rationale**: Aligns with 95%+ of JavaScript projects and industry style guides (Airbnb, Google, StandardJS)

#### Code Quality Tools

The project uses industry-standard linting and formatting tools:

**ESLint** - JavaScript linter
- Enforces camelCase naming
- Prevents common bugs (`no-var`, `eqeqeq`)
- Ensures code consistency
- Configuration: `.eslintrc.json`

**Prettier** - Code formatter
- Automatic code formatting
- Consistent style across all files
- Configuration: `.prettierrc.json`

#### Development Workflow

```bash
# Install dependencies (first time only)
npm install

# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Format all files
npm run format

# Check formatting without making changes
npm run format:check
```

#### Pre-Commit Checklist

Before committing code:

1. Run `npm run lint` to verify no errors
2. Run `npm run format` to ensure consistent formatting
3. Test changes in browser
4. Commit with descriptive message

#### IDE Setup (VS Code)

Install recommended extensions:
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)

Enable format-on-save in `.vscode/settings.json`:

```json
{
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    }
}
```

### Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

When contributing:
- Follow the coding standards outlined above
- Run linting and formatting before submitting
- Include tests if adding new functionality
- Update documentation as needed

**Author**: [nelforzo.github.io](https://nelforzo.github.io)
