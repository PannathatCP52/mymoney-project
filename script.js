let currentUser = null;
let transactions = [];
let goldPrice = 40000; // ค่าเริ่มต้นเผื่อ API ล่ม
let usdRate = 36.5;    // ค่าเริ่มต้นเผื่อ API ล่ม

// ฟังก์ชันสลับธีม
function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// โหลดธีมที่เคยบันทึกไว้
if (localStorage.getItem('theme')) {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme'));
}

async function fetchExternalData() {
    try {
        // ดึงอัตราแลกเปลี่ยน (External API)
        const resRate = await fetch('https://open.er-api.com/v6/latest/USD');
        const dataRate = await resRate.json();
        usdRate = dataRate.rates.THB;
        document.getElementById('rateLabel').innerText = usdRate.toFixed(2);

        // จำลอง/ดึงราคาทอง (ปกติราคาทอง API จริงมักจะเสียเงิน จึงใช้ค่าจำลองที่ใกล้เคียง)
        goldPrice = 41500; 
        document.getElementById('goldPriceLabel').innerText = goldPrice.toLocaleString();
    } catch (e) {
        console.log("API Error, using defaults");
    }
}

function showNotification(msg) {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function login() {
    const user = document.getElementById('username').value;
    if (!user) return showNotification('กรุณาใส่ชื่อ');
    currentUser = { _id: user, username: user };
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('userDisplay').innerText = user;
    await fetchExternalData();
    fetchTransactions();
}

async function fetchTransactions() {
    const res = await fetch(`/api/transactions/${currentUser._id}`);
    transactions = await res.json();
    updateDashboard();
}

async function addTransaction() {
    const desc = document.getElementById('description').value;
    const amt = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    if (!desc || isNaN(amt)) return showNotification('กรอกข้อมูลให้ครบ');

    await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id, description: desc, amount: amt, type, category: 'เงินสด' })
    });
    fetchTransactions();
}

function updateDashboard() {
    let cash = 0;
    transactions.forEach(tx => {
        cash += (tx.type === 'income' ? tx.amount : -tx.amount);
    });

    const goldQty = parseFloat(document.getElementById('goldQty').value) || 0;
    const goldValue = goldQty * goldPrice;
    const netWorthTHB = cash + goldValue;
    const netWorthUSD = netWorthTHB / usdRate;

    // อัปเดตหน้าจอ
    document.getElementById('totalCash').innerText = `${cash.toLocaleString()} บาท`;
    document.getElementById('netWorthTHB').innerText = `${netWorthTHB.toLocaleString()} THB`;
    document.getElementById('netWorthUSD').innerText = `$${netWorthUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;

    renderList();
}

function renderList() {
    const list = document.getElementById('transactionList');
    list.innerHTML = transactions.slice().reverse().map(tx => `
        <li style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid var(--border-color)">
            <span>${tx.description}</span>
            <span style="color:${tx.type==='income'?'#4CAF50':'#e94057'}">${tx.type==='income'?'+':'-'}${tx.amount}</span>
        </li>
    `).join('');
}

function logout() { location.reload(); }
