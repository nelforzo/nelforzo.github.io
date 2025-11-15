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

// UUID生成関数
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ページネーション設定
const ITEMS_PER_PAGE = 10;
let current_page = 1;
let total_pages = 1;

// Service Worker登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js').then(function(registration) {
            console.log('Service Worker登録成功:', registration.scope);
        }, function(err) {
            console.log('Service Worker登録失敗:', err);
        });
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
    const band_select = document.getElementById('band');
    const frequency_input = document.getElementById('frequency');
    const prev_btn = document.getElementById('prevBtn');
    const next_btn = document.getElementById('nextBtn');
    const settings_btn = document.getElementById('settingsBtn');
    const settings_popover = document.getElementById('settingsPopover');
    const export_btn = document.getElementById('exportBtn');
    const import_btn = document.getElementById('importBtn');
    const import_file = document.getElementById('importFile');

    // 新しいログボタン
    new_log_btn.addEventListener('click', showNewLogForm);

    // フォーム送信
    log_form.addEventListener('submit', handleFormSubmit);

    // キャンセルボタン
    cancel_btn.addEventListener('click', hideNewLogForm);

    // バンド選択変更時の周波数単位更新
    band_select.addEventListener('change', updateFrequencyUnit);

    // 周波数入力のフォーマット（blur時に自動的に3桁の小数点に統一）
    frequency_input.addEventListener('blur', formatFrequencyInput);

    // 周波数入力時の自動バンド検出
    frequency_input.addEventListener('input', detectBandFromFrequency);
    frequency_input.addEventListener('blur', detectBandFromFrequency);

    // ページネーションボタン
    prev_btn.addEventListener('click', goToPreviousPage);
    next_btn.addEventListener('click', goToNextPage);

    // 設定ボタン
    settings_btn.addEventListener('click', (e) => {
        e.stopPropagation();
        settings_popover.classList.toggle('hidden');
    });

    // ポップオーバー外をクリックしたら閉じる
    document.addEventListener('click', (e) => {
        if (!settings_popover.contains(e.target) && e.target !== settings_btn) {
            settings_popover.classList.add('hidden');
        }
    });

    // エクスポートボタン
    export_btn.addEventListener('click', () => {
        exportLogs();
        settings_popover.classList.add('hidden');
    });

    // インポートボタン
    import_btn.addEventListener('click', () => {
        import_file.click();
        settings_popover.classList.add('hidden');
    });
    import_file.addEventListener('change', handleImportFile);
}

/**
 * Shows the new log form and hides the log list
 */
function showNewLogForm() {
    const log_list = document.getElementById('logList');
    const new_log_form = document.getElementById('newLogForm');

    log_list.classList.add('hidden');
    new_log_form.classList.remove('hidden');
}

/**
 * Hides the new log form, resets it, and shows the log list
 */
function hideNewLogForm() {
    const log_list = document.getElementById('logList');
    const new_log_form = document.getElementById('newLogForm');
    const form = document.getElementById('logForm');

    form.reset();
    updateFrequencyUnit(); // リセット時に単位も更新
    new_log_form.classList.add('hidden');
    log_list.classList.remove('hidden');
}

/**
 * Updates the frequency unit display based on selected band
 */
function updateFrequencyUnit() {
    const band_select = document.getElementById('band');
    const frequency_unit = document.getElementById('frequencyUnit');
    const band = band_select.value;

    // バンドに応じた周波数単位の設定
    switch (band) {
        case 'LF':
        case 'MF':
            frequency_unit.textContent = 'kHz';
            break;
        case 'HF':
        case 'VHF':
        case 'UHF':
            frequency_unit.textContent = 'MHz';
            break;
        default:
            frequency_unit.textContent = 'MHz';
    }
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
 * Detects and automatically selects the appropriate band based on frequency input
 * Handles both kHz and MHz units based on currently selected band
 */
function detectBandFromFrequency() {
    const frequency_input = document.getElementById('frequency');
    const band_select = document.getElementById('band');
    const frequency_unit = document.getElementById('frequencyUnit');

    const value = frequency_input.value.trim();

    if (value === '') return; // 空欄の場合は何もしない

    const num = parseFloat(value);

    // 有効な数値かチェック
    if (isNaN(num) || num <= 0) return;

    // 現在の単位を取得
    const current_unit = frequency_unit.textContent;

    // 周波数をMHzに変換（統一的な比較のため）
    let frequency_mhz;
    if (current_unit === 'kHz') {
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

    // バンドが検出された場合、自動的に選択を更新
    if (detected_band && band_select.value !== detected_band) {
        band_select.value = detected_band;

        // バンド変更時に単位表示も更新
        updateFrequencyUnit();

        // 単位が変わった場合、周波数の値を調整
        const new_unit = frequency_unit.textContent;
        if (current_unit !== new_unit) {
            if (new_unit === 'kHz' && current_unit === 'MHz') {
                // MHzからkHzに変換
                frequency_input.value = (num * 1000).toFixed(3);
            } else if (new_unit === 'MHz' && current_unit === 'kHz') {
                // kHzからMHzに変換
                frequency_input.value = (num / 1000).toFixed(3);
            }
        }
    }
}

/**
 * Formats frequency with appropriate unit based on band
 * @param {string} frequency - Frequency value
 * @param {string} band - Band type (LF, MF, HF, VHF, UHF)
 * @returns {string} Formatted frequency with unit
 */
function formatFrequencyWithUnit(frequency, band) {
    const unit = getFrequencyUnit(band);
    return `${frequency} ${unit}`;
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
        rst: form_data.get('rst') || '',
        memo: form_data.get('memo'),
        timestamp: now.toISOString()
    };

    try {
        await db.logs.add(log_data);
        // 新しいログが追加されたら1ページ目に戻る
        current_page = 1;
        hideNewLogForm();
        await loadLogs();
    } catch (error) {
        console.error('ログの保存に失敗しました:', error);
        alert('ログの保存に失敗しました。');
    }
}

/**
 * Loads logs from database with pagination and displays them
 */
async function loadLogs() {
    try {
        // 総ログ数を取得
        const total_count = await db.logs.count();

        // 総ページ数を計算
        total_pages = Math.ceil(total_count / ITEMS_PER_PAGE);

        // 現在のページが総ページ数を超えていたら調整
        if (current_page > total_pages && total_pages > 0) {
            current_page = total_pages;
        }
        if (current_page < 1) {
            current_page = 1;
        }

        // 現在のページのログを取得
        const offset = (current_page - 1) * ITEMS_PER_PAGE;
        const logs = await db.logs
            .orderBy('timestamp')
            .reverse()
            .offset(offset)
            .limit(ITEMS_PER_PAGE)
            .toArray();

        displayLogs(logs);
        updatePaginationControls();
    } catch (error) {
        console.error('ログの読み込みに失敗しました:', error);
    }
}

/**
 * Displays logs in the log container with pagination
 * @param {Array} logs - Array of log objects to display
 */
function displayLogs(logs) {
    const logs_container = document.getElementById('logs');

    if (logs.length === 0) {
        logs_container.innerHTML = '<p class="no-logs">まだログがありません。</p>';
        return;
    }

    const logs_html = logs.map(log => `
        <div class="log-entry" data-log-id="${log.id}">
            <div class="log-header">
                <span class="log-band">${escapeHtml(log.band)}</span>
                <span class="log-frequency">${formatFrequencyWithUnit(escapeHtml(log.frequency), log.band)}</span>
                ${log.callsign ? `<span class="log-callsign">${escapeHtml(log.callsign)}</span>` : ''}
                ${log.rst ? `<span class="log-rst">RST: ${escapeHtml(log.rst)}</span>` : ''}
                <span class="log-timestamp">${formatTimestamp(log.timestamp)}</span>
                <button class="btn-delete" data-log-id="${log.id}" title="削除">削除</button>
            </div>
            ${log.memo ? `<div class="log-memo" data-log-id="${log.id}">${escapeHtml(log.memo)}</div>` : ''}
        </div>
    `).join('');

    logs_container.innerHTML = logs_html;

    // イベントリスナーを設定
    setupLogEventListeners();
}

/**
 * Sets up event listeners for log entries (delete and memo expansion)
 */
function setupLogEventListeners() {
    // 削除ボタンのイベントリスナー
    const delete_buttons = document.querySelectorAll('.btn-delete');
    delete_buttons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const log_id = parseInt(e.target.dataset.logId);
            await deleteLog(log_id);
        });
    });

    // メモのクリック展開機能
    const memos = document.querySelectorAll('.log-memo');
    memos.forEach(memo => {
        memo.addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('expanded');
        });
    });
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

        // 現在のページのログを再読み込み
        const remaining_logs_on_page = await db.logs
            .orderBy('timestamp')
            .reverse()
            .offset((current_page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE)
            .count();

        // 現在のページにログが残っていない場合、前のページに戻る
        if (remaining_logs_on_page === 0 && current_page > 1) {
            current_page--;
        }

        await loadLogs();
    } catch (error) {
        console.error('ログの削除に失敗しました:', error);
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
 * Updates pagination controls based on current page and total pages
 */
function updatePaginationControls() {
    const pagination = document.getElementById('pagination');
    const prev_btn = document.getElementById('prevBtn');
    const next_btn = document.getElementById('nextBtn');
    const page_info = document.getElementById('pageInfo');

    // ログが存在し、複数ページがある場合のみページネーションを表示
    if (total_pages > 1) {
        pagination.classList.remove('hidden');
        page_info.textContent = `${current_page} / ${total_pages}`;

        // 前へボタンの有効/無効
        prev_btn.disabled = current_page === 1;

        // 次へボタンの有効/無効
        next_btn.disabled = current_page === total_pages;
    } else {
        pagination.classList.add('hidden');
    }
}

/**
 * Navigates to the previous page
 */
async function goToPreviousPage() {
    if (current_page > 1) {
        current_page--;
        await loadLogs();
    }
}

/**
 * Navigates to the next page
 */
async function goToNextPage() {
    if (current_page < total_pages) {
        current_page++;
        await loadLogs();
    }
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

        // CSVヘッダー（callsign、rstを追加）
        const headers = ['UUID', 'タイムスタンプ (UTC)', 'バンド', '周波数', '単位', 'コールサイン', 'RST', 'メモ'];
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
        console.error('ログのエクスポートに失敗しました:', error);
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
        await importLogs(text);
    } catch (error) {
        console.error('ファイルの読み込みに失敗しました:', error);
        alert('ファイルの読み込みに失敗しました。');
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
        const debug_info = []; // デバッグ情報

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);

            if (values.length < 3) continue; // 不正な行をスキップ

            const uuid = uuid_index >= 0 ? values[uuid_index] : '';
            const timestamp = values[timestamp_index];
            const band = values[band_index];
            const frequency = parseFloat(values[frequency_index]);
            const callsign = callsign_index >= 0 ? values[callsign_index] : '';
            const rst = rst_index >= 0 ? values[rst_index] : '';
            const memo = memo_index >= 0 ? values[memo_index] : '';

            // UUIDでの重複チェック
            if (uuid && existing_uuids.has(uuid)) {
                duplicate_count++;
                debug_info.push({
                    type: 'UUID重複',
                    uuid: uuid.substring(0, 8) + '...',
                    band: band,
                    frequency: frequency,
                    memo_length: memo.length
                });
                continue;
            }

            // コンテンツベースの重複チェック
            const content_hash = createContentHash(timestamp, frequency, memo);
            if (existing_content_hashes.has(content_hash)) {
                duplicate_count++;
                debug_info.push({
                    type: 'コンテンツ重複',
                    uuid: uuid.substring(0, 8) + '...',
                    band: band,
                    frequency: frequency,
                    memo_length: memo.length
                });
                continue;
            }

            // インポートするログを追加
            const log_data = {
                uuid: uuid || generateUUID(),
                band: band,
                frequency: frequency,
                callsign: callsign,
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

        // データベースに追加
        if (logs_to_import.length > 0) {
            await db.logs.bulkAdd(logs_to_import);
            current_page = 1;
            await loadLogs();
        }

        // デバッグ情報をコンソールに出力
        if (debug_info.length > 0) {
            console.log('=== 重複検出の詳細 ===');
            debug_info.forEach((info, idx) => {
                console.log(`${idx + 1}. [${info.type}] ${info.band} ${info.frequency} | UUID: ${info.uuid} | Memo: ${info.memo_length}文字`);
            });
        }

        // 結果を表示
        const message = `インポート完了\n新規追加: ${logs_to_import.length}件\n重複スキップ: ${duplicate_count}件`;
        alert(message);

    } catch (error) {
        console.error('インポートに失敗しました:', error);
        alert('インポートに失敗しました。CSVファイルの形式を確認してください。');
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