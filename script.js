let currentUser = null;
let transactions = [];
let goldPrice = 41800; // ค่าเริ่มต้น
let usdRate = 36.5;    // ค่าเริ่มต้น
let charts = {};

function toggleTheme() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if(currentUser) updateDashboard(); // รีเฟรชสีตัวอักษรในกราฟ
}

if(localStorage.getItem('theme')) {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme'));
}

async function login() {
    const user = document.getElementById('username').value;
    if (!user) return showNotification("กรุณาใส่ชื่อผู้ใช้", "error");
    currentUser = { _id: user, username: user };
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('userDisplay').innerText = user;
    
    await fetchExternalData();
    fetchTransactions();
}

async function fetchExternalData() {
    try {
        const resRate = await fetch('https://open.er-api.com/v6/latest/USD');
        const dataRate = await resRate.json();
        usdRate = dataRate.rates.THB;
        document.getElementById('rateLabel').innerText = usdRate.toFixed(2);
        document.getElementById('goldPriceLabel').innerText = goldPrice.toLocaleString();
    } catch (e) { console.log("API Error"); }
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
    if (!desc || isNaN(amt)) return showNotification("กรอกข้อมูลไม่ครบ", "error");

    await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id, description: desc, amount: amt, type, category: 'Cash' })
    });
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    showNotification("บันทึกเรียบร้อย");
    fetchTransactions();
}

function handleFileUpload() {
    const file = document.getElementById('statementFile').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        showNotification("กำลังอ่านไฟล์...");
        const lines = text.split('\n');
        for(let line of lines) {
            const match = line.match(/(\d+\.?\d*)/);
            if(match && line.length > 5) {
                const amt = parseFloat(match[0]);
                await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser._id, description: "Statement: "+line.substring(0,10), amount: amt, type: 'expense', category: 'Import' })
                });
            }
        }
        showNotification("นำเข้าข้อมูลสำเร็จ");
        fetchTransactions();
    };
    reader.readAsText(file);
}

function updateDashboard() {
    let cash = 0;
    let summary = { day: {i:0,e:0}, week: {i:0,e:0}, month: {i:0,e:0}, year: {i:0,e:0} };
    const now = new Date();
    
    transactions.forEach(tx => {
        const d = new Date(tx.date);
        const amt = tx.amount;
        const isToday = d.toDateString() === now.toDateString();
        const isThisMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        
        if(tx.type === 'income') {
            cash += amt;
            if(isToday) summary.day.i += amt;
            if(now - d < 7*24*60*60*1000) summary.week.i += amt;
            if(isThisMonth) summary.month.i += amt;
            if(d.getFullYear() === now.getFullYear()) summary.year.i += amt;
        } else {
            cash -= amt;
            if(isToday) summary.day.e += amt;
            if(now - d < 7*24*60*60*1000) summary.week.e += amt;
            if(isThisMonth) summary.month.e += amt;
            if(d.getFullYear() === now.getFullYear()) summary.year.e += amt;
        }
    });

    const goldQty = parseFloat(document.getElementById('goldQty').value) || 0;
    const goldValue = goldQty * goldPrice;
    const netTHB = cash + goldValue;
    
    document.getElementById('netWorthTHB').innerText = netTHB.toLocaleString() + " THB";
    document.getElementById('netWorthUSD').innerText = "$" + (netTHB / usdRate).toLocaleString(undefined, {maximumFractionDigits:2});
    
    // อัปเดต Summary Labels
    document.getElementById('dayI').innerText = "+"+summary.day.i; document.getElementById('dayE').innerText = "-"+summary.day.e;
    document.getElementById('weekI').innerText = "+"+summary.week.i; document.getElementById('weekE').innerText = "-"+summary.week.e;
    document.getElementById('monthI').innerText = "+"+summary.month.i; document.getElementById('monthE').innerText = "-"+summary.month.e;
    document.getElementById('yearI').innerText = "+"+summary.year.i; document.getElementById('yearE').innerText = "-"+summary.year.e;

    renderCharts(cash, goldValue, netTHB);
    renderList();
}

function renderCharts(cash, gold, total) {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-label').trim();

    // 1. Bar Chart: เปรียบเทียบมูลค่า (Requested)
    if(charts.bar) charts.bar.destroy();
    charts.bar = new Chart(document.getElementById('assetBarChart'), {
        type: 'bar',
        data: {
            labels: ['เงินสด', 'ทองคำ', 'รวมทั้งหมด'],
            datasets: [{
                label: 'มูลค่า (บาท)',
                data: [cash, gold, total],
                backgroundColor: ['#00f2fe', '#FFD700', '#6a11cb'],
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { color: textColor } },
                x: { ticks: { color: textColor } }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'เปรียบเทียบมูลค่าสินทรัพย์', color: textColor, font: { size: 16 } }
            }
        }
    });

    // 2. Pie Chart: สัดส่วน
    if(charts.pie) charts.pie.destroy();
    charts.pie = new Chart(document.getElementById('netWorthChart'), {
        type: 'doughnut',
        data: {
            labels: ['เงินสด', 'ทองคำ'],
            datasets: [{
                data: [cash, gold],
                backgroundColor: ['#00f2fe', '#FFD700'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor } },
                title: { display: true, text: 'สัดส่วนสินทรัพย์ (%)', color: textColor, font: { size: 16 } }
            }
        }
    });
}

function renderList() {
    const list = document.getElementById('transactionList');
    list.innerHTML = transactions.slice(-10).reverse().map(tx => `
        <li>
            <span>${tx.description}</span>
            <span class="${tx.type}">${tx.type==='income'?'+':'-'}${tx.amount.toLocaleString()}</span>
        </li>
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
