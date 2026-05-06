let currentUser = null;
let transactions = [];
let goldPrice = 41500;
let usdRate = 36.5;
let charts = {};

function toggleTheme() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// ระบบอ่านไฟล์ Statement (CSV/TXT)
function handleFileUpload() {
    const file = document.getElementById('statementFile').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        showNotification("กำลังประมวลผลไฟล์...");
        // ค้นหาตัวเลขในไฟล์ (Simple Parser)
        const lines = text.split('\n');
        let importedCount = 0;
        for(let line of lines) {
            const match = line.match(/(\d+\.?\d*)/); // หาตัวเลขตัวแรกในบรรทัด
            if(match && line.length > 5) {
                const amt = parseFloat(match[0]);
                await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser._id, description: "Imported: "+line.substring(0,15), amount: amt, type: 'expense', category: 'Statement' })
                });
                importedCount++;
            }
        }
        showNotification(`นำเข้าสำเร็จ ${importedCount} รายการ`);
        fetchTransactions();
    };
    reader.readAsText(file);
}

async function login() {
    const user = document.getElementById('username').value;
    if (!user) return;
    currentUser = { _id: user, username: user };
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('userDisplay').innerText = user;
    
    // ดึงข้อมูล API ภายนอก
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        usdRate = data.rates.THB;
        document.getElementById('rateLabel').innerText = usdRate.toFixed(2);
        document.getElementById('goldPriceLabel').innerText = goldPrice.toLocaleString();
    } catch(e) {}
    
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
    if (!desc || isNaN(amt)) return;

    await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id, description: desc, amount: amt, type, category: 'ทั่วไป' })
    });
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    fetchTransactions();
}

function updateDashboard() {
    let cash = 0;
    let summary = { day: {i:0,e:0}, week: {i:0,e:0}, month: {i:0,e:0}, year: {i:0,e:0} };
    const now = new Date();
    
    transactions.forEach(tx => {
        const d = new Date(tx.date);
        const amt = tx.amount;
        if(tx.type === 'income') {
            cash += amt;
            if(d.toDateString() === now.toDateString()) summary.day.i += amt;
            if(now - d < 7*24*60*60*1000) summary.week.i += amt;
            if(d.getMonth() === now.getMonth()) summary.month.i += amt;
            if(d.getFullYear() === now.getFullYear()) summary.year.i += amt;
        } else {
            cash -= amt;
            if(d.toDateString() === now.toDateString()) summary.day.e += amt;
            if(now - d < 7*24*60*60*1000) summary.week.e += amt;
            if(d.getMonth() === now.getMonth()) summary.month.e += amt;
            if(d.getFullYear() === now.getFullYear()) summary.year.e += amt;
        }
    });

    const goldVal = (parseFloat(document.getElementById('goldQty').value) || 0) * goldPrice;
    const netTHB = cash + goldVal;
    
    document.getElementById('netWorthTHB').innerText = netTHB.toLocaleString() + " THB";
    document.getElementById('netWorthUSD').innerText = "$" + (netTHB / usdRate).toLocaleString(undefined, {maximumFractionDigits:2});
    
    // อัปเดตตัวเลขรายวัน/สัปดาห์...
    document.getElementById('dayI').innerText = "+"+summary.day.i; document.getElementById('dayE').innerText = "-"+summary.day.e;
    document.getElementById('weekI').innerText = "+"+summary.week.i; document.getElementById('weekE').innerText = "-"+summary.week.e;
    document.getElementById('monthI').innerText = "+"+summary.month.i; document.getElementById('monthE').innerText = "-"+summary.month.e;
    document.getElementById('yearI').innerText = "+"+summary.year.i; document.getElementById('yearE').innerText = "-"+summary.year.e;

    renderCharts(cash, goldVal);
    renderList();
}

function renderCharts(cash, gold) {
    if(charts.net) charts.net.destroy();
    charts.net = new Chart(document.getElementById('netWorthChart'), {
        type: 'pie',
        data: {
            labels: ['เงินสดสะสม', 'มูลค่าทองคำ'],
            datasets: [{ data: [cash, gold], backgroundColor: ['#00f2fe', '#FFD700'] }]
        },
        options: { plugins: { title: { display:true, text:'สัดส่วนความมั่งคั่ง', color:'#888' } } }
    });
}

function renderList() {
    const list = document.getElementById('transactionList');
    list.innerHTML = transactions.slice(-10).reverse().map(tx => `
        <li><span>${tx.description}</span><span class="${tx.type}">${tx.type==='income'?'+':'-'}${tx.amount}</span></li>
    `).join('');
}

function showNotification(msg) {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = 'toast'; toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function logout() { location.reload(); }
