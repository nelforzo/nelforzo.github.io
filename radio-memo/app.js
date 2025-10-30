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
let currentPage = 1;
let totalPages = 1;

// Service Worker登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(function(registration) {
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

async function init() {
    await loadLogs();
    setupEventListeners();
}

// イベントリスナー設定
function setupEventListeners() {
    const newLogBtn = document.getElementById('newLogBtn');
    const logForm = document.getElementById('logForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const bandSelect = document.getElementById('band');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPopover = document.getElementById('settingsPopover');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    // 新しいログボタン
    newLogBtn.addEventListener('click', showNewLogForm);

    // フォーム送信
    logForm.addEventListener('submit', handleFormSubmit);

    // キャンセルボタン
    cancelBtn.addEventListener('click', hideNewLogForm);

    // バンド選択変更時の周波数単位更新
    bandSelect.addEventListener('change', updateFrequencyUnit);

    // ページネーションボタン
    prevBtn.addEventListener('click', goToPreviousPage);
    nextBtn.addEventListener('click', goToNextPage);

    // 設定ボタン
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPopover.classList.toggle('hidden');
    });

    // ポップオーバー外をクリックしたら閉じる
    document.addEventListener('click', (e) => {
        if (!settingsPopover.contains(e.target) && e.target !== settingsBtn) {
            settingsPopover.classList.add('hidden');
        }
    });

    // エクスポートボタン
    exportBtn.addEventListener('click', () => {
        exportLogs();
        settingsPopover.classList.add('hidden');
    });

    // インポートボタン
    importBtn.addEventListener('click', () => {
        importFile.click();
        settingsPopover.classList.add('hidden');
    });
    importFile.addEventListener('change', handleImportFile);
}

// 新しいログフォームを表示
function showNewLogForm() {
    const logList = document.getElementById('logList');
    const newLogForm = document.getElementById('newLogForm');
    const timestampInput = document.getElementById('timestamp');

    // 現在のUTC時刻を設定
    const now = new Date();
    const utcString = now.toISOString().slice(0, 16);
    timestampInput.value = utcString;

    logList.classList.add('hidden');
    newLogForm.classList.remove('hidden');
}

// フォームを隠す
function hideNewLogForm() {
    const logList = document.getElementById('logList');
    const newLogForm = document.getElementById('newLogForm');
    const form = document.getElementById('logForm');

    form.reset();
    updateFrequencyUnit(); // リセット時に単位も更新
    newLogForm.classList.add('hidden');
    logList.classList.remove('hidden');
}

// バンドに応じた周波数単位の更新
function updateFrequencyUnit() {
    const bandSelect = document.getElementById('band');
    const frequencyUnit = document.getElementById('frequencyUnit');
    const band = bandSelect.value;

    // バンドに応じた周波数単位の設定
    switch (band) {
        case 'LF':
        case 'MF':
            frequencyUnit.textContent = 'kHz';
            break;
        case 'HF':
        case 'VHF':
        case 'UHF':
            frequencyUnit.textContent = 'MHz';
            break;
        default:
            frequencyUnit.textContent = 'MHz';
    }
}

// 周波数を単位付きで表示
function formatFrequencyWithUnit(frequency, band) {
    const unit = getFrequencyUnit(band);
    return `${frequency} ${unit}`;
}

// バンドに応じた周波数単位を取得
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

// フォーム送信処理
async function handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const logData = {
        uuid: generateUUID(),
        band: formData.get('band'),
        frequency: formData.get('frequency'),
        memo: formData.get('memo'),
        timestamp: formData.get('timestamp')
    };

    try {
        await db.logs.add(logData);
        // 新しいログが追加されたら1ページ目に戻る
        currentPage = 1;
        hideNewLogForm();
        await loadLogs();
    } catch (error) {
        console.error('ログの保存に失敗しました:', error);
        alert('ログの保存に失敗しました。');
    }
}

// ログ一覧を読み込み
async function loadLogs() {
    try {
        // 総ログ数を取得
        const totalCount = await db.logs.count();

        // 総ページ数を計算
        totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

        // 現在のページが総ページ数を超えていたら調整
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }
        if (currentPage < 1) {
            currentPage = 1;
        }

        // 現在のページのログを取得
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;
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

// ログを表示
function displayLogs(logs) {
    const logsContainer = document.getElementById('logs');
    
    if (logs.length === 0) {
        logsContainer.innerHTML = '<p class="no-logs">まだログがありません。</p>';
        return;
    }

    const logsHTML = logs.map(log => `
        <div class="log-entry">
            <div class="log-header">
                <span class="log-band">${escapeHtml(log.band)}</span>
                <span class="log-frequency">${formatFrequencyWithUnit(escapeHtml(log.frequency), log.band)}</span>
                <span class="log-timestamp">${formatTimestamp(log.timestamp)}</span>
            </div>
            ${log.memo ? `<div class="log-memo">${escapeHtml(log.memo)}</div>` : ''}
        </div>
    `).join('');

    logsContainer.innerHTML = logsHTML;
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// タイムスタンプフォーマット
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }) + ' UTC';
}

// ページネーションコントロールを更新
function updatePaginationControls() {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    // ログが存在し、複数ページがある場合のみページネーションを表示
    if (totalPages > 1) {
        pagination.classList.remove('hidden');
        pageInfo.textContent = `${currentPage} / ${totalPages}`;

        // 前へボタンの有効/無効
        prevBtn.disabled = currentPage === 1;

        // 次へボタンの有効/無効
        nextBtn.disabled = currentPage === totalPages;
    } else {
        pagination.classList.add('hidden');
    }
}

// 前のページへ移動
async function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        await loadLogs();
    }
}

// 次のページへ移動
async function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        await loadLogs();
    }
}

// ログをCSV形式でエクスポート
async function exportLogs() {
    try {
        // 全てのログを取得（ページネーションなし）
        const allLogs = await db.logs.orderBy('timestamp').reverse().toArray();

        if (allLogs.length === 0) {
            alert('エクスポートするログがありません。');
            return;
        }

        // CSVヘッダー（UUIDを追加）
        const headers = ['UUID', 'タイムスタンプ (UTC)', 'バンド', '周波数', '単位', 'メモ'];
        const csvRows = [headers.join(',')];

        // CSVデータ行を作成
        allLogs.forEach(log => {
            const unit = getFrequencyUnit(log.band);
            const row = [
                `"${log.uuid || ''}"`,
                `"${log.timestamp}"`,
                `"${log.band}"`,
                log.frequency,
                `"${unit}"`,
                `"${log.memo || ''}"`
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
        console.error('ログのエクスポートに失敗しました:', error);
        alert('ログのエクスポートに失敗しました。');
    }
}

// インポートファイル処理
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

// CSVデータをインポート
async function importLogs(csvText) {
    try {
        // BOMを削除
        const cleanText = csvText.replace(/^\uFEFF/, '');

        // CSV行を分割
        const lines = cleanText.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            alert('インポートするデータがありません。');
            return;
        }

        // ヘッダー行を解析
        const headers = parseCSVLine(lines[0]);

        // 列インデックスを特定
        const uuidIndex = headers.indexOf('UUID');
        const timestampIndex = headers.findIndex(h => h.includes('タイムスタンプ'));
        const bandIndex = headers.indexOf('バンド');
        const frequencyIndex = headers.indexOf('周波数');
        const memoIndex = headers.indexOf('メモ');

        if (timestampIndex === -1 || bandIndex === -1 || frequencyIndex === -1) {
            alert('CSVファイルの形式が正しくありません。');
            return;
        }

        // 既存のログを取得（重複チェック用）
        const existingLogs = await db.logs.toArray();
        const existingUUIDs = new Set(existingLogs.map(log => log.uuid).filter(uuid => uuid));

        // 重複チェック用のコンテンツハッシュセットを作成
        const existingContentHashes = new Set(
            existingLogs.map(log => createContentHash(log.timestamp, log.frequency, log.memo))
        );

        // データ行を処理
        const logsToImport = [];
        let duplicateCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);

            if (values.length < 3) continue; // 不正な行をスキップ

            const uuid = uuidIndex >= 0 ? values[uuidIndex] : '';
            const timestamp = values[timestampIndex];
            const band = values[bandIndex];
            const frequency = parseFloat(values[frequencyIndex]);
            const memo = memoIndex >= 0 ? values[memoIndex] : '';

            // UUIDでの重複チェック
            if (uuid && existingUUIDs.has(uuid)) {
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
                memo: memo,
                timestamp: timestamp
            };

            logsToImport.push(logData);

            // 今回追加するものも重複チェックに追加
            if (logData.uuid) {
                existingUUIDs.add(logData.uuid);
            }
            existingContentHashes.add(contentHash);
        }

        // データベースに追加
        if (logsToImport.length > 0) {
            await db.logs.bulkAdd(logsToImport);
            currentPage = 1;
            await loadLogs();
        }

        // 結果を表示
        const message = `インポート完了\n新規追加: ${logsToImport.length}件\n重複スキップ: ${duplicateCount}件`;
        alert(message);

    } catch (error) {
        console.error('インポートに失敗しました:', error);
        alert('インポートに失敗しました。CSVファイルの形式を確認してください。');
    }
}

// CSV行をパース（引用符を考慮）
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

// コンテンツベースのハッシュを作成（重複検出用）
function createContentHash(timestamp, frequency, memo) {
    return `${timestamp}|${frequency}|${memo || ''}`;
}