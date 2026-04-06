// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    loadAndRenderRanking();
});

// --- データ管理（LocalStorage） ---
const STORAGE_KEY = 'mahjong_app_data_complete';

function getData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- 画面切り替え ---
function showInputScreen() {
    const data = getData();
    if (data.length < 4) {
        alert("メンバーが足りません。\nまずは「メンバー登録」から4人以上登録してください。");
        return;
    }
    
    // 画面切り替え
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('input-screen').classList.remove('hidden');
    
    // フォーム生成
    initScoreForm();
}

function showHomeScreen() {
    document.getElementById('input-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
    loadAndRenderRanking();
}

// --- ① メンバー登録 ---
function registerMember() {
    const name = prompt("新しいメンバーの名前を入力してください:");
    if (!name) return;

    const data = getData();
    // 重複チェック
    if (data.find(m => m.name === name)) {
        alert("その名前は既に登録されています。");
        return;
    }

    data.push({ name: name, games: 0, points: 0 });
    saveData(data);
    loadAndRenderRanking();
}

// --- ② ランキング表示 ---
function loadAndRenderRanking() {
    const data = getData();
    const tbody = document.getElementById('rankingBody');
    tbody.innerHTML = "";

    // ポイントが高い順にソート
    data.sort((a, b) => b.points - a.points);

    data.forEach((member, index) => {
        // 色分け（プラスは青、マイナスは赤）
        const color = member.points >= 0 ? '#007bff' : '#dc3545';
        const fontWeight = member.points >= 0 ? 'bold' : 'normal';
        
        // 小数点第1位まで表示
        const formattedPoint = member.points.toFixed(1);

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${member.name}</td>
                <td>${member.games}</td>
                <td style="color:${color}; font-weight:${fontWeight};">
                    ${formattedPoint}
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// --- ③ スコア入力フォーム生成 ---
function initScoreForm() {
    const members = getData();
    const tbody = document.getElementById('inputRows');
    tbody.innerHTML = '';

    // 名前の選択肢を作成
    let options = `<option value="">選択</option>`;
    members.forEach(m => {
        options += `<option value="${m.name}">${m.name}</option>`;
    });

    // 4行（1着〜4着）を作成
    for (let i = 1; i <= 4; i++) {
        const row = `
            <tr>
                <td>${i}着</td>
                <td><select id="name_${i}">${options}</select></td>
                <td><input type="number" id="score_${i}" placeholder="点数"></td>
            </tr>
        `;
        tbody.innerHTML += row;
    }
}

// --- ④ 計算と保存（可変ルール対応） ---
function calculateAndSave() {
    const inputs = [];
    let totalRawScore = 0;
    const selectedNames = new Set();

    // 1. ルール設定の読み込み
    const startPoint = parseInt(document.getElementById('startPoint').value); // 持ち点
    const returnPoint = parseInt(document.getElementById('returnPoint').value); // 返し点
    
    // ウマの取得
    const uma1 = parseFloat(document.getElementById('uma1').value);
    const uma2 = parseFloat(document.getElementById('uma2').value);
    const uma3 = parseFloat(document.getElementById('uma3').value);
    const uma4 = parseFloat(document.getElementById('uma4').value);
    const umaList = [uma1, uma2, uma3, uma4];

    // オカの計算: (返し点 - 持ち点) × 4人分 ÷ 1000
    // トップがこれを総取りします
    const oka = (returnPoint - startPoint) * 4 / 1000;

    // 2. 入力データの取得
    for (let i = 1; i <= 4; i++) {
        const nameSelect = document.getElementById(`name_${i}`);
        const scoreInput = document.getElementById(`score_${i}`);
        
        const name = nameSelect.value;
        const score = parseInt(scoreInput.value);

        // 未入力チェック
        if (!name || isNaN(score)) {
            alert(`${i}着の内容が正しくありません。\n名前と点数を確認してください。`);
            return;
        }

        // 重複チェック
        if (selectedNames.has(name)) {
            alert(`「${name}」さんが重複しています。`);
            return;
        }
        selectedNames.add(name);

        inputs.push({ name: name, rawScore: score });
        totalRawScore += score;
    }

    // 3. 合計点チェック
    const expectedTotal = startPoint * 4;
    if (totalRawScore !== expectedTotal) {
        if (!confirm(`入力された合計点: ${totalRawScore} 点\n設定上の合計点: ${expectedTotal} 点\n\n点数がズレていますが、このまま計算しますか？`)) {
            return;
        }
    }

    // 4. ポイント計算実行
    const data = getData();

    inputs.forEach((input, index) => {
        // 基本ポイント: (素点 - 返し点) ÷ 1000
        let point = (input.rawScore - returnPoint) / 1000;

        // ウマを加算
        point += umaList[index];

        // 1位（indexが0）の場合、オカを加算
        if (index === 0) {
            point += oka;
        }

        // データを更新
        const targetMember = data.find(m => m.name === input.name);
        if (targetMember) {
            targetMember.points += point;
            targetMember.games += 1;
            
            // 浮動小数点誤差対策（小数第1位で丸める）
            targetMember.points = Math.round(targetMember.points * 10) / 10;
        }
    });

    // 保存してホームに戻る
    saveData(data);
    alert("成績を登録しました！");
    showHomeScreen();
}

// データ初期化（リセットボタン用）
function resetData() {
    if(confirm("【警告】\n全てのメンバーと成績データが消去されます。\n本当によろしいですか？")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}