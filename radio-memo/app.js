// データベース設定
const db = new Dexie('RadioMemoDatabase');

// スキーマ定義
db.version(1).stores({
    logs: '++id, band, frequency, memo, timestamp'
});

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
    const downloadBtn = document.getElementById('downloadBtn');

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

    // ダウンロードボタン
    downloadBtn.addEventListener('click', downloadLogs);
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
        case 'AM':
            frequencyUnit.textContent = 'kHz';
            break;
        case 'FM':
            frequencyUnit.textContent = 'MHz';
            break;
        case 'USB':
        case 'LSB':
        case 'CW':
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
        case 'AM':
            return 'kHz';
        case 'FM':
        case 'USB':
        case 'LSB':
        case 'CW':
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

// ログをCSV形式でダウンロード
async function downloadLogs() {
    try {
        // 全てのログを取得（ページネーションなし）
        const allLogs = await db.logs.orderBy('timestamp').reverse().toArray();

        if (allLogs.length === 0) {
            alert('ダウンロードするログがありません。');
            return;
        }

        // CSVヘッダー
        const headers = ['タイムスタンプ (UTC)', 'バンド', '周波数', '単位', 'メモ'];
        const csvRows = [headers.join(',')];

        // CSVデータ行を作成
        allLogs.forEach(log => {
            const unit = getFrequencyUnit(log.band);
            const row = [
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

        // ファイル名を生成（現在の日時を含む）
        const now = new Date();
        const dateString = now.toISOString().slice(0, 19).replace(/:/g, '-');
        link.download = `radio-memo-${dateString}.csv`;

        // ダウンロードを実行
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // URLを解放
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('ログのダウンロードに失敗しました:', error);
        alert('ログのダウンロードに失敗しました。');
    }
}