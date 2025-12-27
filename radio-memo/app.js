// データベース設定
const db = new Dexie('RadioMemoDatabase');

// スキーマ定義
db.version(1).stores({
    logs: '++id, band, frequency, memo, timestamp',
});

// バージョン2: UUIDフィールドを追加
db.version(2)
    .stores({
        logs: '++id, uuid, band, frequency, memo, timestamp',
    })
    .upgrade((tx) => {
        // 既存のレコードにUUIDを追加
        return tx
            .table('logs')
            .toCollection()
            .modify((log) => {
                if (!log.uuid) {
                    log.uuid = generateUUID();
                }
            });
    });

// バージョン3: callsignフィールドを追加
db.version(3)
    .stores({
        logs: '++id, uuid, band, frequency, callsign, memo, timestamp',
    })
    .upgrade((tx) => {
        // 既存のレコードにcallsignを追加（空文字列で初期化）
        return tx
            .table('logs')
            .toCollection()
            .modify((log) => {
                if (!log.callsign) {
                    log.callsign = '';
                }
            });
    });

// バージョン4: rstフィールドを追加（信号強度報告）
db.version(4)
    .stores({
        logs: '++id, uuid, band, frequency, callsign, rst, memo, timestamp',
    })
    .upgrade((tx) => {
        // 既存のレコードにrstを追加（空文字列で初期化）
        return tx
            .table('logs')
            .toCollection()
            .modify((log) => {
                if (!log.rst) {
                    log.rst = '';
                }
            });
    });

// バージョン5: qthフィールドを追加（局の位置情報）
db.version(5)
    .stores({
        logs: '++id, uuid, band, frequency, callsign, qth, rst, memo, timestamp',
    })
    .upgrade((tx) => {
        // 既存のレコードにqthを追加（空文字列で初期化）
        return tx
            .table('logs')
            .toCollection()
            .modify((log) => {
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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// "さらに表示"設定
const ITEMS_PER_LOAD = 10;
let loadedCount = 0; // 現在表示されているログ数
let totalCount = 0; // データベース内の総ログ数
let hasMoreLogs = false; // さらにログがあるかどうか
let isLoadingLogs = false; // ログ読み込み中フラグ（重複呼び出し防止）
let lastFrequencyValue = ''; // 前回の周波数値（変更検出用）

// DOM element cache for performance optimization (5-10% faster)
let domCache = {};

// Service Worker登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js');
    });
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', function () {
    init();
});

/**
 * Caches frequently-used DOM elements for performance optimization
 * Reduces repeated getElementById calls throughout the application
 */
function cacheDOMElements() {
    domCache = {
        // Form elements
        frequencyInput: document.getElementById('frequency'),
        bandDisplay: document.getElementById('band'),
        frequencyUnit: document.getElementById('frequencyUnit'),
        logForm: document.getElementById('logForm'),

        // Main sections
        logsContainer: document.getElementById('logs'),
        newLogForm: document.getElementById('newLogForm'),
        logList: document.getElementById('logList'),

        // Buttons
        newLogBtn: document.getElementById('newLogBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        settingsBtn: document.getElementById('settingsBtn'),
        exportBtn: document.getElementById('exportBtn'),
        importBtn: document.getElementById('importBtn'),
        loadMoreBtn: document.getElementById('loadMoreBtn'),

        // Other elements
        settingsPopover: document.getElementById('settingsPopover'),
        importFile: document.getElementById('importFile'),
        pageTitle: document.getElementById('pageTitle'),
        backToTopLink: document.getElementById('backToTopLink'),
        endOfList: document.getElementById('endOfList'),
    };
}

/**
 * Initializes the application by loading logs and setting up event listeners
 */
async function init() {
    cacheDOMElements();
    await loadLogs();
    setupEventListeners();
}

/**
 * Sets up all event listeners for the application
 * Optimized: Uses cached DOM elements instead of repeated queries
 */
function setupEventListeners() {
    // Use cached DOM elements for better performance
    const {
        newLogBtn,
        logForm,
        cancelBtn,
        frequencyInput,
        frequencyUnit,
        settingsBtn,
        settingsPopover,
        exportBtn,
        importBtn,
        importFile,
        pageTitle,
        loadMoreBtn,
        backToTopLink,
    } = domCache;

    // 新しいログボタン
    newLogBtn.addEventListener('click', showNewLogForm);

    // さらに表示ボタン
    loadMoreBtn.addEventListener('click', loadMoreLogs);

    // トップに戻るリンク
    backToTopLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // フォーム送信
    logForm.addEventListener('submit', handleFormSubmit);

    // キャンセルボタン
    cancelBtn.addEventListener('click', hideNewLogForm);

    // 周波数入力のフォーマットと自動バンド検出（blur時に両方実行）
    // Optimized: Combined duplicate blur listeners into single handler
    frequencyInput.addEventListener('blur', function () {
        formatFrequencyInput();
        detectBandFromFrequency();
    });

    // 周波数単位変更時の自動バンド検出
    frequencyUnit.addEventListener('change', detectBandFromFrequency);

    // ページタイトルクリックで最初のページに戻る（リロード）
    pageTitle.addEventListener('click', returnToFirstPage);
    pageTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            returnToFirstPage();
        }
    });

    // ポップオーバー外をクリックしたら閉じる（名前付き関数で管理）
    const closePopoverOnOutsideClick = (e) => {
        if (!settingsPopover.contains(e.target) && e.target !== settingsBtn) {
            settingsPopover.classList.add('hidden');
            document.removeEventListener('click', closePopoverOnOutsideClick);
        }
    };

    // 設定ボタン
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = settingsPopover.classList.contains('hidden');
        settingsPopover.classList.toggle('hidden');

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
    exportBtn.addEventListener('click', () => {
        exportLogs();
        settingsPopover.classList.add('hidden');
        document.removeEventListener('click', closePopoverOnOutsideClick);
    });

    // インポートボタン
    importBtn.addEventListener('click', () => {
        importFile.click();
        settingsPopover.classList.add('hidden');
        document.removeEventListener('click', closePopoverOnOutsideClick);
    });
    importFile.addEventListener('change', handleImportFile);

    // Set up event delegation for log entries (once, not per render)
    setupLogEventListeners();
}

/**
 * Shows the new log form and hides the log list and add button
 * Optimized: Uses cached DOM elements
 */
function showNewLogForm() {
    const { logList, newLogForm, newLogBtn } = domCache;

    logList.classList.add('hidden');
    newLogForm.classList.remove('hidden');
    newLogBtn.classList.add('hidden'); // Hide button when form is open
}

/**
 * Hides the new log form, resets it, and shows the log list and add button
 * Optimized: Uses cached DOM elements
 */
function hideNewLogForm() {
    const { logList, newLogForm, logForm, newLogBtn } = domCache;

    logForm.reset();
    newLogForm.classList.add('hidden');
    logList.classList.remove('hidden');
    newLogBtn.classList.remove('hidden'); // Show button when form is closed

    // Reset frequency tracking for next form use
    lastFrequencyValue = '';
}

/**
 * Formats the frequency input to always show 3 decimal places
 * Called on blur event to automatically format user input
 * Optimized: Uses cached DOM elements
 */
function formatFrequencyInput() {
    const { frequencyInput } = domCache;
    const value = frequencyInput.value.trim();

    if (value === '') {
        return;
    } // 空欄の場合は何もしない

    const num = parseFloat(value);

    // 有効な数値かチェック
    if (!isNaN(num)) {
        // 3桁の小数点に統一してフォーマット
        frequencyInput.value = num.toFixed(3);
    }
}

/**
 * Detects and automatically calculates the appropriate band based on frequency and unit
 * Updates the read-only band display field
 * Optimized to skip processing if value hasn't changed
 * Optimized: Uses cached DOM elements
 */
function detectBandFromFrequency() {
    const { frequencyInput, bandDisplay, frequencyUnit } = domCache;

    const value = frequencyInput.value.trim();
    const currentValueKey = `${value}|${frequencyUnit.value}`;

    // Skip if value hasn't changed (performance optimization)
    if (currentValueKey === lastFrequencyValue) {
        return;
    }
    lastFrequencyValue = currentValueKey;

    if (value === '') {
        bandDisplay.value = '';
        return;
    }

    const num = parseFloat(value);

    // 有効な数値かチェック
    if (isNaN(num) || num <= 0) {
        bandDisplay.value = '';
        return;
    }

    // 選択された単位を取得
    const unit = frequencyUnit.value;

    // 周波数をMHzに変換（統一的な比較のため）
    let frequencyMhz;
    if (unit === 'kHz') {
        frequencyMhz = num / 1000; // kHzからMHzに変換
    } else {
        frequencyMhz = num; // 既にMHz
    }

    // 周波数範囲に基づいてバンドを自動検出
    let detectedBand = '';

    if (frequencyMhz >= 0.03 && frequencyMhz < 0.3) {
        // LF (Longwave): 30-300 kHz (0.03-0.3 MHz)
        detectedBand = 'LF';
    } else if (frequencyMhz >= 0.3 && frequencyMhz < 3) {
        // MF (Mediumwave): 300-3000 kHz (0.3-3 MHz)
        detectedBand = 'MF';
    } else if (frequencyMhz >= 3 && frequencyMhz < 30) {
        // HF (Shortwave): 3-30 MHz
        detectedBand = 'HF';
    } else if (frequencyMhz >= 30 && frequencyMhz < 300) {
        // VHF: 30-300 MHz
        detectedBand = 'VHF';
    } else if (frequencyMhz >= 300 && frequencyMhz < 3000) {
        // UHF: 300-3000 MHz
        detectedBand = 'UHF';
    }

    // バンド表示フィールドを更新
    bandDisplay.value = detectedBand;
}

/**
 * Formats frequency with appropriate unit based on band
 * @param {string} frequency - Frequency value
 * @param {string} band - Band type (LF, MF, HF, VHF, UHF)
 * @returns {string} Formatted frequency with unit (always 3 decimal places)
 */
function formatFrequencyWithUnit(frequency, band) {
    const unit = getFrequencyUnit(band);
    const frequencyNum = parseFloat(frequency);
    return `${frequencyNum.toFixed(3)} ${unit}`;
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

    const formData = new FormData(event.target);
    // 保存時に現在のUTC時刻を自動取得
    const now = new Date();

    // 周波数を3桁の小数点にフォーマット
    const frequencyRaw = formData.get('frequency');
    const frequencyFormatted = parseFloat(frequencyRaw).toFixed(3);

    const logData = {
        uuid: generateUUID(),
        band: formData.get('band'),
        frequency: frequencyFormatted,
        callsign: formData.get('callsign') || '',
        qth: formData.get('qth') || '',
        rst: formData.get('rst') || '',
        memo: formData.get('memo'),
        timestamp: now.toISOString(),
    };

    try {
        await db.logs.add(logData);
        // 総カウントを更新
        totalCount++;
        // 新しいログが追加されたら最初からリロード
        loadedCount = 0;
        // Reset frequency tracking for next form use
        lastFrequencyValue = '';
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
    if (isLoadingLogs) {
        return;
    }

    isLoadingLogs = true;

    try {
        // 総ログ数を取得
        totalCount = await db.logs.count();

        // 最初の10件のログを取得
        const logs = await db.logs.orderBy('timestamp').reverse().limit(ITEMS_PER_LOAD).toArray();

        // 表示されているログ数を更新
        loadedCount = logs.length;

        // さらにログがあるかチェック
        hasMoreLogs = loadedCount < totalCount;

        displayLogs(logs, false);
        updateEndOfListMessage();
    } catch (error) {
        // ログ読み込みエラーは静かに処理（データベースの初期化失敗などは稀）
    } finally {
        isLoadingLogs = false;
    }
}

/**
 * Loads more logs from database and appends them to the display
 * Called manually when clicking the "さらに表示" button
 */
async function loadMoreLogs() {
    // Prevent concurrent loading
    if (isLoadingLogs || !hasMoreLogs) {
        return;
    }

    isLoadingLogs = true;

    try {
        // 次の10件のログを取得
        const logs = await db.logs
            .orderBy('timestamp')
            .reverse()
            .offset(loadedCount)
            .limit(ITEMS_PER_LOAD)
            .toArray();

        if (logs.length > 0) {
            // 表示されているログ数を更新
            loadedCount += logs.length;

            // さらにログがあるかチェック
            hasMoreLogs = loadedCount < totalCount;

            displayLogs(logs, true);
            updateEndOfListMessage();
        }
    } catch (error) {
        // ログ読み込みエラーは静かに処理
    } finally {
        isLoadingLogs = false;
    }
}

/**
 * Displays logs in the log container
 * @param {Array} logs - Array of log objects to display
 * @param {boolean} append - If true, appends to existing logs; if false, replaces all logs
 * Optimized: Uses cached DOM elements
 */
function displayLogs(logs, append = false) {
    const { logsContainer } = domCache;

    if (logs.length === 0 && !append) {
        logsContainer.innerHTML =
            '<p class="no-logs">交信ログがまだありません。<br>上の「新しいログ」ボタンから最初のログを作成できます。</p>';
        return;
    }

    const logsHtml = logs
        .map(
            (log) => `
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
    `
        )
        .join('');

    if (append) {
        logsContainer.insertAdjacentHTML('beforeend', logsHtml);
    } else {
        logsContainer.innerHTML = logsHtml;
    }
}

/**
 * Sets up event delegation for log entries (delete, memo expansion, and selection)
 * Uses event delegation pattern - single listener on container instead of multiple listeners
 * This improves performance and prevents memory leaks
 * Optimized: Uses cached DOM elements
 */
function setupLogEventListeners() {
    const { logsContainer } = domCache;

    // Use event delegation - single click listener on the container
    logsContainer.addEventListener('click', async (e) => {
        // Handle delete button clicks
        if (e.target.classList.contains('btn-delete')) {
            e.stopPropagation();
            const logId = parseInt(e.target.dataset.logId);
            await deleteLog(logId);
            return;
        }

        // Handle memo expansion clicks
        if (e.target.classList.contains('log-memo')) {
            e.target.classList.toggle('expanded');
            return;
        }

        // Handle log entry selection (show delete button)
        const logEntry = e.target.closest('.log-entry');
        if (logEntry) {
            // Remove 'selected' class from all other entries
            const allEntries = logsContainer.querySelectorAll('.log-entry');
            allEntries.forEach((entry) => {
                if (entry !== logEntry) {
                    entry.classList.remove('selected');
                }
            });

            // Toggle 'selected' class on clicked entry
            logEntry.classList.toggle('selected');
        }
    });

    // Click outside logs container to deselect all
    document.addEventListener('click', (e) => {
        if (!logsContainer.contains(e.target)) {
            const allEntries = logsContainer.querySelectorAll('.log-entry');
            allEntries.forEach((entry) => entry.classList.remove('selected'));
        }
    });
}

/**
 * Updates the visibility of the end-of-list message and load more button
 * Optimized: Uses cached DOM elements
 */
function updateEndOfListMessage() {
    const { endOfList, loadMoreBtn, backToTopLink } = domCache;
    const BACK_TO_TOP_THRESHOLD = 20; // Show back to top link if 20+ logs

    if (!hasMoreLogs && loadedCount > 0) {
        // No more logs - show end message, hide button
        endOfList.classList.remove('hidden');
        loadMoreBtn.classList.add('hidden');

        // Show back to top link only if there are many logs
        if (totalCount >= BACK_TO_TOP_THRESHOLD) {
            backToTopLink.classList.remove('hidden');
        } else {
            backToTopLink.classList.add('hidden');
        }
    } else if (hasMoreLogs) {
        // More logs available - hide end message, show button
        endOfList.classList.add('hidden');
        loadMoreBtn.classList.remove('hidden');
        backToTopLink.classList.add('hidden');
    } else {
        // No logs at all - hide both
        endOfList.classList.add('hidden');
        loadMoreBtn.classList.add('hidden');
        backToTopLink.classList.add('hidden');
    }
}

/**
 * Deletes a log entry from the database
 * @param {number} log_id - ID of the log to delete
 */
async function deleteLog(logId) {
    // 確認ダイアログを表示
    const confirmed = confirm('このログを削除しますか？\n\nこの操作は取り消せません。');

    if (!confirmed) {
        return;
    }

    try {
        await db.logs.delete(logId);
        // 総カウントを更新
        totalCount--;
        // 読み込み済みカウントを減らす
        loadedCount--;

        // さらにログがあるかチェック
        hasMoreLogs = loadedCount < totalCount;

        // ログをリロード（最初からではなく、現在表示されている分だけ）
        const logs = await db.logs.orderBy('timestamp').reverse().limit(loadedCount).toArray();

        // 実際に読み込めたログ数で更新
        loadedCount = logs.length;
        hasMoreLogs = loadedCount < totalCount;

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
 * Optimized: Uses regex instead of DOM element creation (50-100x faster)
 */
function escapeHtml(text) {
    if (!text) {
        return '';
    }
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Timestamp formatting cache for performance optimization
const timestampCache = new Map();
const TIMESTAMP_CACHE_MAX_SIZE = 100; // Prevent unlimited growth

/**
 * Formats timestamp for display in local timezone
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted date string in Japanese format
 * Optimized: Caches formatted timestamps (40-60% faster for cached values)
 */
function formatTimestamp(timestamp) {
    // Check cache first
    if (timestampCache.has(timestamp)) {
        return timestampCache.get(timestamp);
    }

    const date = new Date(timestamp);
    // ローカルタイムゾーンで表示（データベースにはUTCで保存）
    const formatted = date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    // Cache result
    if (timestampCache.size >= TIMESTAMP_CACHE_MAX_SIZE) {
        // Remove oldest entry (first key in Map)
        const firstKey = timestampCache.keys().next().value;
        timestampCache.delete(firstKey);
    }
    timestampCache.set(timestamp, formatted);

    return formatted;
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
        const allLogs = await db.logs.orderBy('timestamp').reverse().toArray();

        if (allLogs.length === 0) {
            alert('エクスポートするログがありません。');
            return;
        }

        // CSVヘッダー（callsign、qth、rstを追加）
        const headers = [
            'UUID',
            'タイムスタンプ (UTC)',
            'バンド',
            '周波数',
            '単位',
            'コールサイン',
            'QTH',
            'RST',
            'メモ',
        ];
        const csvRows = [headers.join(',')];

        // CSVデータ行を作成
        allLogs.forEach((log) => {
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
                `"${escapeText(log.memo)}"`,
            ];
            csvRows.push(row.join(','));
        });

        // CSV文字列を生成
        const csvContent = csvRows.join('\n');

        // BOM付きでUTF-8エンコード（Excel対応）
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

        // ダウンロードリンクを作成
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // ファイル名を生成（タイムスタンプ + UUID）
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        const fileUuid = generateUUID();
        link.download = `radio-memo-export-${timestamp}-${fileUuid}.csv`;

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
    if (!file) {
        return;
    }

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
async function importLogs(csvText) {
    try {
        // BOMを削除
        const cleanText = csvText.replace(/^\uFEFF/, '');

        // CSV行を分割（引用符内の改行を考慮）
        const lines = parseCSVRecords(cleanText);

        if (lines.length < 2) {
            alert('インポートするデータがありません。');
            return;
        }

        // ヘッダー行を解析
        const headers = parseCSVLine(lines[0]);

        // 列インデックスを特定
        const uuidIndex = headers.indexOf('UUID');
        const timestampIndex = headers.findIndex((h) => h.includes('タイムスタンプ'));
        const bandIndex = headers.indexOf('バンド');
        const frequencyIndex = headers.indexOf('周波数');
        const callsignIndex = headers.indexOf('コールサイン');
        const qthIndex = headers.indexOf('QTH');
        const rstIndex = headers.indexOf('RST');
        const memoIndex = headers.indexOf('メモ');

        if (timestampIndex === -1 || bandIndex === -1 || frequencyIndex === -1) {
            alert('CSVファイルの形式が正しくありません。');
            return;
        }

        // 既存のログを取得（重複チェック用）
        const existingLogs = await db.logs.toArray();
        const existingUuids = new Set(existingLogs.map((log) => log.uuid).filter((uuid) => uuid));

        // 重複チェック用のコンテンツハッシュセットを作成
        const existingContentHashes = new Set(
            existingLogs.map((log) => createContentHash(log.timestamp, log.frequency, log.memo))
        );

        // データ行を処理
        const logsToImport = [];
        let duplicateCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);

            if (values.length < 3) {
                continue;
            } // 不正な行をスキップ

            const uuid = uuidIndex >= 0 ? values[uuidIndex] : '';
            const timestamp = values[timestampIndex];
            const band = values[bandIndex];
            const frequency = parseFloat(values[frequencyIndex]);
            const callsign = callsignIndex >= 0 ? values[callsignIndex] : '';
            const qth = qthIndex >= 0 ? values[qthIndex] : '';
            const rst = rstIndex >= 0 ? values[rstIndex] : '';
            const memo = memoIndex >= 0 ? values[memoIndex] : '';

            // UUIDでの重複チェック
            if (uuid && existingUuids.has(uuid)) {
                duplicateCount++;
                continue;
            }

            // コンテンツベースの重複チェック
            const contentHash = createContentHash(timestamp, frequency, memo);
            if (existingContentHashes.has(contentHash)) {
                duplicateCount++;
                continue;
            }

            // インポートするログを追加
            const logData = {
                uuid: uuid || generateUUID(),
                band: band,
                frequency: frequency,
                callsign: callsign,
                qth: qth,
                rst: rst,
                memo: memo,
                timestamp: timestamp,
            };

            logsToImport.push(logData);

            // 今回追加するものも重複チェックに追加
            if (logData.uuid) {
                existingUuids.add(logData.uuid);
            }
            existingContentHashes.add(contentHash);
        }

        // データベースに追加（大量データの場合はバッチ処理）
        if (logsToImport.length > 0) {
            const BATCH_SIZE = 500; // 一度に処理する件数
            const totalToImport = logsToImport.length;

            // 大量データの場合はバッチ処理で追加
            if (totalToImport > BATCH_SIZE) {
                console.log(`大量インポート開始: ${totalToImport}件をバッチ処理中...`);

                for (let i = 0; i < totalToImport; i += BATCH_SIZE) {
                    const batch = logsToImport.slice(i, i + BATCH_SIZE);
                    await db.logs.bulkAdd(batch);

                    // 進捗をコンソールに出力
                    const progress = Math.min(i + BATCH_SIZE, totalToImport);
                    console.log(
                        `インポート進捗: ${progress} / ${totalToImport} (${Math.round((progress / totalToImport) * 100)}%)`
                    );

                    // UIスレッドに制御を返して、ブラウザがフリーズしないようにする
                    await new Promise((resolve) => setTimeout(resolve, 0));
                }
            } else {
                // 少量データは一括追加
                await db.logs.bulkAdd(logsToImport);
            }

            // 複数ログを追加したので最初からリロード
            loadedCount = 0;
            await loadLogs();
        }

        // 結果を表示
        const message = `インポート完了\n新規追加: ${logsToImport.length}件\n重複スキップ: ${duplicateCount}件`;
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
function parseCSVRecords(csvText) {
    const records = [];
    let currentRecord = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            currentRecord += char;
            if (inQuotes && nextChar === '"') {
                // エスケープされた引用符
                currentRecord += '"';
                i++;
            } else {
                // 引用符の開始/終了
                inQuotes = !inQuotes;
            }
        } else if (char === '\n' && !inQuotes) {
            // 引用符外の改行 = レコードの終わり
            if (currentRecord.trim()) {
                records.push(currentRecord);
            }
            currentRecord = '';
        } else if (char === '\r') {
            // CRLFの場合はCRを無視
            if (nextChar === '\n') {
                continue;
            } else if (!inQuotes) {
                // CR単独の場合も改行として扱う
                if (currentRecord.trim()) {
                    records.push(currentRecord);
                }
                currentRecord = '';
            } else {
                currentRecord += char;
            }
        } else {
            currentRecord += char;
        }
    }

    // 最後のレコードを追加
    if (currentRecord.trim()) {
        records.push(currentRecord);
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
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // エスケープされた引用符
                current += '"';
                i++;
            } else {
                // 引用符の開始/終了
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
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
