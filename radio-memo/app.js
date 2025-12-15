// データベース設定
const db = new Dexie('RadioMemoDatabase');

// スキーマ定義
db.version(1).stores({
    logs: '++id, band, frequency, memo, timestamp'
});

// バージョン2: UUIDフィールドを追加
db.version(2).stores({
    logs: '++id, uuid, band, frequency, memo, timestamp'
}).upgrade(tx => {
    // 既存のレコードにUUIDを追加
    return tx.table('logs').toCollection().modify(log => {
        if (!log.uuid) {
            log.uuid = generateUUID();
        }
    });
});

// バージョン3: callsignフィールドを追加
db.version(3).stores({
    logs: '++id, uuid, band, frequency, callsign, memo, timestamp'
}).upgrade(tx => {
    // 既存のレコードにcallsignを追加（空文字列で初期化）
    return tx.table('logs').toCollection().modify(log => {
        if (!log.callsign) {
            log.callsign = '';
        }
    });
});

// バージョン4: rstフィールドを追加（信号強度報告）
db.version(4).stores({
    logs: '++id, uuid, band, frequency, callsign, rst, memo, timestamp'
}).upgrade(tx => {
    // 既存のレコードにrstを追加（空文字列で初期化）
    return tx.table('logs').toCollection().modify(log => {
        if (!log.rst) {
            log.rst = '';
        }
    });
});

// バージョン5: qthフィールドを追加（局の位置情報）
db.version(5).stores({
    logs: '++id, uuid, band, frequency, callsign, qth, rst, memo, timestamp'
}).upgrade(tx => {
    // 既存のレコードにqthを追加（空文字列で初期化）
    return tx.table('logs').toCollection().modify(log => {
        if (!log.qth) {
            log.qth = '';
        }
    });
});

/**
 * Generates a UUID (Universally Unique Identifier)
 * Uses crypto.randomUUID() for modern browsers with cryptographically secure random
 * Falls back to Math.random() for older browsers
 *
 * @returns {string} A UUID v4 string in format "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
 */
function generateUUID() {
    // モダンブラウザではcrypto.randomUUID()を使用（暗号学的に安全）
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // 古いブラウザ用のフォールバック
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// "さらに表示"設定
const ITEMS_PER_LOAD = 10;
let loaded_count = 0; // 現在表示されているログ数
let total_count = 0; // データベース内の総ログ数
let has_more_logs = false; // さらにログがあるかどうか
let is_loading_logs = false; // ログ読み込み中フラグ（重複呼び出し防止）
let last_frequency_value = ''; // 前回の周波数値（変更検出用）

// Service Worker登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js');
    });
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', function() {
    init();
});

/**
 * Initializes the application by loading logs and setting up event listeners
 */
async function init() {
    await loadLogs();
    setupEventListeners();
}

/**
 * Sets up all event listeners for the application
 */
function setupEventListeners() {
    const new_log_btn = document.getElementById('newLogBtn');
    const log_form = document.getElementById('logForm');
    const cancel_btn = document.getElementById('cancelBtn');
    const frequency_input = document.getElementById('frequency');
    const frequency_unit = document.getElementById('frequencyUnit');
    const settings_btn = document.getElementById('settingsBtn');
    const settings_popover = document.getElementById('settingsPopover');
    const export_btn = document.getElementById('exportBtn');
    const import_btn = document.getElementById('importBtn');
    const import_file = document.getElementById('importFile');
    const page_title = document.getElementById('pageTitle');
    const load_more_btn = document.getElementById('loadMoreBtn');
    const back_to_top_link = document.getElementById('backToTopLink');

    // 新しいログボタン
    new_log_btn.addEventListener('click', showNewLogForm);

    // さらに表示ボタン
    load_more_btn.addEventListener('click', loadMoreLogs);

    // トップに戻るリンク
    back_to_top_link.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // フォーム送信
    log_form.addEventListener('submit', handleFormSubmit);

    // キャンセルボタン
    cancel_btn.addEventListener('click', hideNewLogForm);

    // 周波数入力のフォーマット（blur時に自動的に3桁の小数点に統一）
    frequency_input.addEventListener('blur', formatFrequencyInput);

    // 周波数と単位変更時の自動バンド検出
    frequency_input.addEventListener('blur', detectBandFromFrequency);
    frequency_unit.addEventListener('change', detectBandFromFrequency);


    // ページタイトルクリックで最初のページに戻る（リロード）
    page_title.addEventListener('click', returnToFirstPage);
    page_title.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            returnToFirstPage();
        }
    });

    // ポップオーバー外をクリックしたら閉じる（名前付き関数で管理）
    const closePopoverOnOutsideClick = (e) => {
        if (!settings_popover.contains(e.target) && e.target !== settings_btn) {
            settings_popover.classList.add('hidden');
            document.removeEventListener('click', closePopoverOnOutsideClick);
        }
    };

    // 設定ボタン
    settings_btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = settings_popover.classList.contains('hidden');
        settings_popover.classList.toggle('hidden');

        if (isHidden) {
            // ポップオーバーを開く場合のみリスナーを追加
            setTimeout(() => {
                document.addEventListener('click', closePopoverOnOutsideClick);
            }, 0);
        } else {
            // ポップオーバーを閉じる場合はリスナーを削除
            document.removeEventListener('click', closePopoverOnOutsideClick);
        }
    });

    // エクスポートボタン
    export_btn.addEventListener('click', () => {
        exportLogs();
        settings_popover.classList.add('hidden');
        document.removeEventListener('click', closePopoverOnOutsideClick);
    });

    // インポートボタン
    import_btn.addEventListener('click', () => {
        import_file.click();
        settings_popover.classList.add('hidden');
        document.removeEventListener('click', closePopoverOnOutsideClick);
    });
    import_file.addEventListener('change', handleImportFile);

    // Set up event delegation for log entries (once, not per render)
    setupLogEventListeners();
}

/**
 * Shows the new log form and hides the log list and add button
 */
function showNewLogForm() {
    const log_list = document.getElementById('logList');
    const new_log_form = document.getElementById('newLogForm');
    const new_log_btn = document.getElementById('newLogBtn');

    log_list.classList.add('hidden');
    new_log_form.classList.remove('hidden');
    new_log_btn.classList.add('hidden'); // Hide button when form is open
}

/**
 * Hides the new log form, resets it, and shows the log list and add button
 */
function hideNewLogForm() {
    const log_list = document.getElementById('logList');
    const new_log_form = document.getElementById('newLogForm');
    const form = document.getElementById('logForm');
    const new_log_btn = document.getElementById('newLogBtn');

    form.reset();
    new_log_form.classList.add('hidden');
    log_list.classList.remove('hidden');
    new_log_btn.classList.remove('hidden'); // Show button when form is closed

    // Reset frequency tracking for next form use
    last_frequency_value = '';
}

/**
 * Formats the frequency input to always show 3 decimal places
 * Called on blur event to automatically format user input
 */
function formatFrequencyInput() {
    const frequency_input = document.getElementById('frequency');
    const value = frequency_input.value.trim();

    if (value === '') return; // 空欄の場合は何もしない

    const num = parseFloat(value);

    // 有効な数値かチェック
    if (!isNaN(num)) {
        // 3桁の小数点に統一してフォーマット
        frequency_input.value = num.toFixed(3);
    }
}

/**
 * Detects and automatically calculates the appropriate band based on frequency and unit
 * Updates the read-only band display field
 * Optimized to skip processing if value hasn't changed
 */
function detectBandFromFrequency() {
    const frequency_input = document.getElementById('frequency');
    const band_display = document.getElementById('band');
    const frequency_unit = document.getElementById('frequencyUnit');

    const value = frequency_input.value.trim();
    const current_value_key = `${value}|${frequency_unit.value}`;

    // Skip if value hasn't changed (performance optimization)
    if (current_value_key === last_frequency_value) {
        return;
    }
    last_frequency_value = current_value_key;

    if (value === '') {
        band_display.value = '';
        return;
    }

    const num = parseFloat(value);

    // 有効な数値かチェック
    if (isNaN(num) || num <= 0) {
        band_display.value = '';
        return;
    }

    // 選択された単位を取得
    const unit = frequency_unit.value;

    // 周波数をMHzに変換（統一的な比較のため）
    let frequency_mhz;
    if (unit === 'kHz') {
        frequency_mhz = num / 1000; // kHzからMHzに変換
    } else {
        frequency_mhz = num; // 既にMHz
    }

    // 周波数範囲に基づいてバンドを自動検出
    let detected_band = '';

    if (frequency_mhz >= 0.03 && frequency_mhz < 0.3) {
        // LF (Longwave): 30-300 kHz (0.03-0.3 MHz)
        detected_band = 'LF';
    } else if (frequency_mhz >= 0.3 && frequency_mhz < 3) {
        // MF (Mediumwave): 300-3000 kHz (0.3-3 MHz)
        detected_band = 'MF';
    } else if (frequency_mhz >= 3 && frequency_mhz < 30) {
        // HF (Shortwave): 3-30 MHz
        detected_band = 'HF';
    } else if (frequency_mhz >= 30 && frequency_mhz < 300) {
        // VHF: 30-300 MHz
        detected_band = 'VHF';
    } else if (frequency_mhz >= 300 && frequency_mhz < 3000) {
        // UHF: 300-3000 MHz
        detected_band = 'UHF';
    }

    // バンド表示フィールドを更新
    band_display.value = detected_band;
}

/**
 * Formats frequency with appropriate unit based on band
 * @param {string} frequency - Frequency value
 * @param {string} band - Band type (LF, MF, HF, VHF, UHF)
 * @returns {string} Formatted frequency with unit (always 3 decimal places)
 */
function formatFrequencyWithUnit(frequency, band) {
    const unit = getFrequencyUnit(band);
    const frequency_num = parseFloat(frequency);
    return `${frequency_num.toFixed(3)} ${unit}`;
}

/**
 * Gets the appropriate frequency unit for a given band
 * @param {string} band - Band type (LF, MF, HF, VHF, UHF)
 * @returns {string} Frequency unit (kHz or MHz)
 */
function getFrequencyUnit(band) {
    switch (band) {
        case 'LF':
        case 'MF':
            return 'kHz';
        case 'HF':
        case 'VHF':
        case 'UHF':
            return 'MHz';
        default:
            return 'MHz';
    }
}

/**
 * Handles form submission and saves log data to database
 * @param {Event} event - Form submit event
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const form_data = new FormData(event.target);
    // 保存時に現在のUTC時刻を自動取得
    const now = new Date();

    // 周波数を3桁の小数点にフォーマット
    const frequency_raw = form_data.get('frequency');
    const frequency_formatted = parseFloat(frequency_raw).toFixed(3);

    const log_data = {
        uuid: generateUUID(),
        band: form_data.get('band'),
        frequency: frequency_formatted,
        callsign: form_data.get('callsign') || '',
        qth: form_data.get('qth') || '',
        rst: form_data.get('rst') || '',
        memo: form_data.get('memo'),
        timestamp: now.toISOString()
    };

    try {
        await db.logs.add(log_data);
        // 総カウントを更新
        total_count++;
        // 新しいログが追加されたら最初からリロード
        loaded_count = 0;
        // Reset frequency tracking for next form use
        last_frequency_value = '';
        hideNewLogForm();
        await loadLogs();
    } catch (error) {
        alert('ログの保存に失敗しました。');
    }
}

/**
 * Loads initial logs from database (most recent 10) and displays them
 * Resets the display to show only the latest logs
 * Prevents concurrent calls for better performance
 */
async function loadLogs() {
    // Prevent concurrent loading
    if (is_loading_logs) {
        return;
    }

    is_loading_logs = true;

    try {
        // 総ログ数を取得
        total_count = await db.logs.count();

        // 最初の10件のログを取得
        const logs = await db.logs
            .orderBy('timestamp')
            .reverse()
            .limit(ITEMS_PER_LOAD)
            .toArray();

        // 表示されているログ数を更新
        loaded_count = logs.length;

        // さらにログがあるかチェック
        has_more_logs = loaded_count < total_count;

        displayLogs(logs, false);
        updateEndOfListMessage();
    } catch (error) {
        // ログ読み込みエラーは静かに処理（データベースの初期化失敗などは稀）
    } finally {
        is_loading_logs = false;
    }
}


/**
 * Loads more logs from database and appends them to the display
 * Called manually when clicking the "さらに表示" button
 */
async function loadMoreLogs() {
    // Prevent concurrent loading
    if (is_loading_logs || !has_more_logs) {
        return;
    }

    is_loading_logs = true;

    try {
        // 次の10件のログを取得
        const logs = await db.logs
            .orderBy('timestamp')
            .reverse()
            .offset(loaded_count)
            .limit(ITEMS_PER_LOAD)
            .toArray();

        if (logs.length > 0) {
            // 表示されているログ数を更新
            loaded_count += logs.length;

            // さらにログがあるかチェック
            has_more_logs = loaded_count < total_count;

            displayLogs(logs, true);
            updateEndOfListMessage();
        }
    } catch (error) {
        // ログ読み込みエラーは静かに処理
    } finally {
        is_loading_logs = false;
    }
}

/**
 * Displays logs in the log container
 * @param {Array} logs - Array of log objects to display
 * @param {boolean} append - If true, appends to existing logs; if false, replaces all logs
 */
function displayLogs(logs, append = false) {
    const logs_container = document.getElementById('logs');

    if (logs.length === 0 && !append) {
        logs_container.innerHTML = '<p class="no-logs">交信ログがまだありません。<br>上の「新しいログ」ボタンから最初のログを作成できます。</p>';
        return;
    }

    const logs_html = logs.map(log => `
        <div class="log-entry" data-log-id="${log.id}">
            <div class="log-timestamp-row">
                <span class="log-timestamp">${formatTimestamp(log.timestamp)}</span>
            </div>
            <div class="log-band-freq-row">
                <span class="log-band">${escapeHtml(log.band)}</span>
                <span class="log-frequency">${formatFrequencyWithUnit(escapeHtml(log.frequency), log.band)}</span>
            </div>
            <div class="log-header">
                ${log.callsign ? `<span class="log-callsign">${escapeHtml(log.callsign)}</span>` : ''}
                ${log.qth ? `<span class="log-qth">相手局QTH: ${escapeHtml(log.qth)}</span>` : ''}
                ${log.rst ? `<span class="log-rst">RSレポート: ${escapeHtml(log.rst)}</span>` : ''}
            </div>
            ${log.memo ? `<div class="log-memo" data-log-id="${log.id}">${escapeHtml(log.memo)}</div>` : ''}
            <button class="btn-delete" data-log-id="${log.id}" title="削除">削除</button>
        </div>
    `).join('');

    if (append) {
        logs_container.insertAdjacentHTML('beforeend', logs_html);
    } else {
        logs_container.innerHTML = logs_html;
    }
}

/**
 * Sets up event delegation for log entries (delete, memo expansion, and selection)
 * Uses event delegation pattern - single listener on container instead of multiple listeners
 * This improves performance and prevents memory leaks
 */
function setupLogEventListeners() {
    const logs_container = document.getElementById('logs');

    // Use event delegation - single click listener on the container
    logs_container.addEventListener('click', async (e) => {
        // Handle delete button clicks
        if (e.target.classList.contains('btn-delete')) {
            e.stopPropagation();
            const log_id = parseInt(e.target.dataset.logId);
            await deleteLog(log_id);
            return;
        }

        // Handle memo expansion clicks
        if (e.target.classList.contains('log-memo')) {
            e.target.classList.toggle('expanded');
            return;
        }

        // Handle log entry selection (show delete button)
        const log_entry = e.target.closest('.log-entry');
        if (log_entry) {
            // Remove 'selected' class from all other entries
            const all_entries = logs_container.querySelectorAll('.log-entry');
            all_entries.forEach(entry => {
                if (entry !== log_entry) {
                    entry.classList.remove('selected');
                }
            });

            // Toggle 'selected' class on clicked entry
            log_entry.classList.toggle('selected');
        }
    });

    // Click outside logs container to deselect all
    document.addEventListener('click', (e) => {
        if (!logs_container.contains(e.target)) {
            const all_entries = logs_container.querySelectorAll('.log-entry');
            all_entries.forEach(entry => entry.classList.remove('selected'));
        }
    });
}

/**
 * Updates the visibility of the end-of-list message and load more button
 */
function updateEndOfListMessage() {
    const end_of_list = document.getElementById('endOfList');
    const load_more_btn = document.getElementById('loadMoreBtn');
    const back_to_top_link = document.getElementById('backToTopLink');
    const BACK_TO_TOP_THRESHOLD = 20; // Show back to top link if 20+ logs

    if (!has_more_logs && loaded_count > 0) {
        // No more logs - show end message, hide button
        end_of_list.classList.remove('hidden');
        load_more_btn.classList.add('hidden');

        // Show back to top link only if there are many logs
        if (total_count >= BACK_TO_TOP_THRESHOLD) {
            back_to_top_link.classList.remove('hidden');
        } else {
            back_to_top_link.classList.add('hidden');
        }
    } else if (has_more_logs) {
        // More logs available - hide end message, show button
        end_of_list.classList.add('hidden');
        load_more_btn.classList.remove('hidden');
        back_to_top_link.classList.add('hidden');
    } else {
        // No logs at all - hide both
        end_of_list.classList.add('hidden');
        load_more_btn.classList.add('hidden');
        back_to_top_link.classList.add('hidden');
    }
}

/**
 * Deletes a log entry from the database
 * @param {number} log_id - ID of the log to delete
 */
async function deleteLog(log_id) {
    // 確認ダイアログを表示
    const confirmed = confirm('このログを削除しますか？\n\nこの操作は取り消せません。');

    if (!confirmed) {
        return;
    }

    try {
        await db.logs.delete(log_id);
        // 総カウントを更新
        total_count--;
        // 読み込み済みカウントを減らす
        loaded_count--;

        // さらにログがあるかチェック
        has_more_logs = loaded_count < total_count;

        // ログをリロード（最初からではなく、現在表示されている分だけ）
        const logs = await db.logs
            .orderBy('timestamp')
            .reverse()
            .limit(loaded_count)
            .toArray();

        // 実際に読み込めたログ数で更新
        loaded_count = logs.length;
        has_more_logs = loaded_count < total_count;

        displayLogs(logs, false);
        updateEndOfListMessage();
    } catch (error) {
        alert('ログの削除に失敗しました。');
    }
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formats timestamp for display in local timezone
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted date string in Japanese format
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    // ローカルタイムゾーンで表示（データベースにはUTCで保存）
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Scrolls to the top of the page
 * Triggered when clicking the page title
 */
function returnToFirstPage() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Exports all logs to CSV format
 */
async function exportLogs() {
    try {
        // 全てのログを取得（ページネーションなし）
        const all_logs = await db.logs.orderBy('timestamp').reverse().toArray();

        if (all_logs.length === 0) {
            alert('エクスポートするログがありません。');
            return;
        }

        // CSVヘッダー（callsign、qth、rstを追加）
        const headers = ['UUID', 'タイムスタンプ (UTC)', 'バンド', '周波数', '単位', 'コールサイン', 'QTH', 'RST', 'メモ'];
        const csv_rows = [headers.join(',')];

        // CSVデータ行を作成
        all_logs.forEach(log => {
            const unit = getFrequencyUnit(log.band);
            // CSVフィールドのエスケープ（引用符を2重にする）
            const escapeText = (text) => (text || '').replace(/"/g, '""');
            const row = [
                `"${escapeText(log.uuid)}"`,
                `"${escapeText(log.timestamp)}"`,
                `"${escapeText(log.band)}"`,
                log.frequency,
                `"${escapeText(unit)}"`,
                `"${escapeText(log.callsign)}"`,
                `"${escapeText(log.qth)}"`,
                `"${escapeText(log.rst)}"`,
                `"${escapeText(log.memo)}"`
            ];
            csv_rows.push(row.join(','));
        });

        // CSV文字列を生成
        const csv_content = csv_rows.join('\n');

        // BOM付きでUTF-8エンコード（Excel対応）
        const bom = '\uFEFF';
        const blob = new Blob([bom + csv_content], { type: 'text/csv;charset=utf-8;' });

        // ダウンロードリンクを作成
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // ファイル名を生成（タイムスタンプ + UUID）
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        const file_uuid = generateUUID();
        link.download = `radio-memo-export-${timestamp}-${file_uuid}.csv`;

        // ダウンロードを実行
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // URLを解放
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('ログのエクスポートに失敗しました。');
    }
}

/**
 * Handles CSV file import from file input
 * @param {Event} event - File input change event
 */
async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ファイル選択をリセット（同じファイルを再度選択できるように）
    event.target.value = '';

    try {
        const text = await file.text();
        // インポート開始メッセージ
        console.log('インポート開始:', file.name);
        await importLogs(text);
    } catch (error) {
        alert('ファイルの読み込みに失敗しました。');
        console.error('Import error:', error);
    }
}

/**
 * Imports logs from CSV text data
 * @param {string} csv_text - CSV text content to import
 */
async function importLogs(csv_text) {
    try {
        // BOMを削除
        const clean_text = csv_text.replace(/^\uFEFF/, '');

        // CSV行を分割（引用符内の改行を考慮）
        const lines = parseCSVRecords(clean_text);

        if (lines.length < 2) {
            alert('インポートするデータがありません。');
            return;
        }

        // ヘッダー行を解析
        const headers = parseCSVLine(lines[0]);

        // 列インデックスを特定
        const uuid_index = headers.indexOf('UUID');
        const timestamp_index = headers.findIndex(h => h.includes('タイムスタンプ'));
        const band_index = headers.indexOf('バンド');
        const frequency_index = headers.indexOf('周波数');
        const callsign_index = headers.indexOf('コールサイン');
        const qth_index = headers.indexOf('QTH');
        const rst_index = headers.indexOf('RST');
        const memo_index = headers.indexOf('メモ');

        if (timestamp_index === -1 || band_index === -1 || frequency_index === -1) {
            alert('CSVファイルの形式が正しくありません。');
            return;
        }

        // 既存のログを取得（重複チェック用）
        const existing_logs = await db.logs.toArray();
        const existing_uuids = new Set(existing_logs.map(log => log.uuid).filter(uuid => uuid));

        // 重複チェック用のコンテンツハッシュセットを作成
        const existing_content_hashes = new Set(
            existing_logs.map(log => createContentHash(log.timestamp, log.frequency, log.memo))
        );

        // データ行を処理
        const logs_to_import = [];
        let duplicate_count = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);

            if (values.length < 3) continue; // 不正な行をスキップ

            const uuid = uuid_index >= 0 ? values[uuid_index] : '';
            const timestamp = values[timestamp_index];
            const band = values[band_index];
            const frequency = parseFloat(values[frequency_index]);
            const callsign = callsign_index >= 0 ? values[callsign_index] : '';
            const qth = qth_index >= 0 ? values[qth_index] : '';
            const rst = rst_index >= 0 ? values[rst_index] : '';
            const memo = memo_index >= 0 ? values[memo_index] : '';

            // UUIDでの重複チェック
            if (uuid && existing_uuids.has(uuid)) {
                duplicate_count++;
                continue;
            }

            // コンテンツベースの重複チェック
            const content_hash = createContentHash(timestamp, frequency, memo);
            if (existing_content_hashes.has(content_hash)) {
                duplicate_count++;
                continue;
            }

            // インポートするログを追加
            const log_data = {
                uuid: uuid || generateUUID(),
                band: band,
                frequency: frequency,
                callsign: callsign,
                qth: qth,
                rst: rst,
                memo: memo,
                timestamp: timestamp
            };

            logs_to_import.push(log_data);

            // 今回追加するものも重複チェックに追加
            if (log_data.uuid) {
                existing_uuids.add(log_data.uuid);
            }
            existing_content_hashes.add(content_hash);
        }

        // データベースに追加（大量データの場合はバッチ処理）
        if (logs_to_import.length > 0) {
            const BATCH_SIZE = 500; // 一度に処理する件数
            const total_to_import = logs_to_import.length;

            // 大量データの場合はバッチ処理で追加
            if (total_to_import > BATCH_SIZE) {
                console.log(`大量インポート開始: ${total_to_import}件をバッチ処理中...`);

                for (let i = 0; i < total_to_import; i += BATCH_SIZE) {
                    const batch = logs_to_import.slice(i, i + BATCH_SIZE);
                    await db.logs.bulkAdd(batch);

                    // 進捗をコンソールに出力
                    const progress = Math.min(i + BATCH_SIZE, total_to_import);
                    console.log(`インポート進捗: ${progress} / ${total_to_import} (${Math.round(progress / total_to_import * 100)}%)`);

                    // UIスレッドに制御を返して、ブラウザがフリーズしないようにする
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            } else {
                // 少量データは一括追加
                await db.logs.bulkAdd(logs_to_import);
            }

            // 複数ログを追加したので最初からリロード
            loaded_count = 0;
            await loadLogs();
        }

        // 結果を表示
        const message = `インポート完了\n新規追加: ${logs_to_import.length}件\n重複スキップ: ${duplicate_count}件`;
        alert(message);
        console.log('インポート完了:', message.replace(/\n/g, ' '));

    } catch (error) {
        alert('インポートに失敗しました。CSVファイルの形式を確認してください。');
        console.error('Import failed:', error);
    }
}

/**
 * Parses CSV text into records (rows), handling quotes and multiline fields
 * @param {string} csv_text - CSV text to parse
 * @returns {Array<string>} Array of CSV record strings
 */
function parseCSVRecords(csv_text) {
    const records = [];
    let current_record = '';
    let in_quotes = false;

    for (let i = 0; i < csv_text.length; i++) {
        const char = csv_text[i];
        const next_char = csv_text[i + 1];

        if (char === '"') {
            current_record += char;
            if (in_quotes && next_char === '"') {
                // エスケープされた引用符
                current_record += '"';
                i++;
            } else {
                // 引用符の開始/終了
                in_quotes = !in_quotes;
            }
        } else if (char === '\n' && !in_quotes) {
            // 引用符外の改行 = レコードの終わり
            if (current_record.trim()) {
                records.push(current_record);
            }
            current_record = '';
        } else if (char === '\r') {
            // CRLFの場合はCRを無視
            if (next_char === '\n') {
                continue;
            } else if (!in_quotes) {
                // CR単独の場合も改行として扱う
                if (current_record.trim()) {
                    records.push(current_record);
                }
                current_record = '';
            } else {
                current_record += char;
            }
        } else {
            current_record += char;
        }
    }

    // 最後のレコードを追加
    if (current_record.trim()) {
        records.push(current_record);
    }

    return records;
}

/**
 * Parses a single CSV line into fields, handling quoted values
 * @param {string} line - CSV line to parse
 * @returns {Array<string>} Array of field values
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let in_quotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next_char = line[i + 1];

        if (char === '"') {
            if (in_quotes && next_char === '"') {
                // エスケープされた引用符
                current += '"';
                i++;
            } else {
                // 引用符の開始/終了
                in_quotes = !in_quotes;
            }
        } else if (char === ',' && !in_quotes) {
            // フィールドの区切り
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    // 最後のフィールドを追加
    result.push(current.trim());

    return result;
}

/**
 * Creates a content-based hash for duplicate detection
 * @param {string} timestamp - Log timestamp
 * @param {number} frequency - Frequency value
 * @param {string} memo - Memo text
 * @returns {string} Hash string for duplicate detection
 */
function createContentHash(timestamp, frequency, memo) {
    return `${timestamp}|${frequency}|${memo || ''}`;
}