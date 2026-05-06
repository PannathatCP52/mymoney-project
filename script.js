let currentUser = null;
let transactions = [];
let expenseChart = null;
let balanceChart = null;

// ฟังก์ชันสำหรับแสดง Notification Toast
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (!user || !pass) return showNotification('กรุณากรอกให้ครบทุกช่อง', 'error');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        if (res.ok) {
            currentUser = data.user;
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('dashboardSection').style.display = 'block';
            document.getElementById('userDisplay').innerText = currentUser.username;
            showNotification(`ยินดีต้อนรับคุณ ${currentUser.username}`);
            fetchTransactions();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (e) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

async function fetchTransactions() {
    try {
        const res = await fetch(`/api/transactions/${currentUser._id}`);
        transactions = await res.json();
        updateDashboard();
    } catch (e) {
        showNotification('โหลดข้อมูลไม่สำเร็จ', 'error');
    }
}

async function addTransaction() {
    const desc = document.getElementById('description').value;
    const amt = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const cat = document.getElementById('category').value;

    if (!desc || isNaN(amt)) return showNotification('กรุณากรอกรายละเอียดและจำนวนเงินให้ถูกต้อง', 'warning');

    try {
        await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id, description: desc, amount: amt, type, category: cat })
        });
        document.getElementById('description').value = '';
        document.getElementById('amount').value = '';
        showNotification('บันทึกรายการสำเร็จ');
        fetchTransactions();
    } catch (e) {
        showNotification('บันทึกไม่สำเร็จ', 'error');
    }
}

function updateDashboard() {
    let totalIncome = 0; let totalExpense = 0;
    let expenseCategories = {};
    let summary = {
        day: { i: 0, e: 0 }, week: { i: 0, e: 0 }, month: { i: 0, e: 0 }, year: { i: 0, e: 0 }
    };

    const now = new Date();
    const startOfDay = new Date().setHours(0,0,0,0);
    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);

    transactions.forEach(tx => {
        const amt = tx.amount;
        const d = new Date(tx.date);
        const t = d.getTime();

        if (tx.type === 'income') {
            totalIncome += amt;
            if (t >= startOfDay) summary.day.i += amt;
            if (t >= startOfWeek.getTime()) summary.week.i += amt;
            if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) summary.month.i += amt;
            if (d.getFullYear() === now.getFullYear()) summary.year.i += amt;
        } else {
            totalExpense += amt;
            expenseCategories[tx.category] = (expenseCategories[tx.category] || 0) + amt;
            if (t >= startOfDay) summary.day.e += amt;
            if (t >= startOfWeek.getTime()) summary.week.e += amt;
            if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) summary.month.e += amt;
            if (d.getFullYear() === now.getFullYear()) summary.year.e += amt;
        }
    });

    const balance = totalIncome - totalExpense;
    document.getElementById('totalBalance').innerText = `${balance} บาท`;
    
    if (balance < 0) showNotification('ระวัง! ยอดเงินคงเหลือติดลบแล้ว', 'warning');

    document.getElementById('incomeDay').innerText = summary.day.i;
    document.getElementById('expenseDay').innerText = summary.day.e;
    document.getElementById('incomeWeek').innerText = summary.week.i;
    document.getElementById('expenseWeek').innerText = summary.week.e;
    document.getElementById('incomeMonth').innerText = summary.month.i;
    document.getElementById('expenseMonth').innerText = summary.month.e;
    document.getElementById('incomeYear').innerText = summary.year.i;
    document.getElementById('expenseYear').innerText = summary.year.e;

    renderList();
    renderCharts(expenseCategories, totalIncome, totalExpense);
}

function renderList() {
    const list = document.getElementById('transactionList');
    list.innerHTML = transactions.slice().reverse().map(tx => `
        <li>
            <span>${tx.description} <small style="color:var(--text-muted)">(${tx.category})</small></span>
            <span style="color: ${tx.type === 'income' ? '#4CAF50' : '#e94057'}; font-weight: bold;">
                ${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
            </span>
        </li>
    `).join('');
}

function renderCharts(cats, inc, exp) {
    if (expenseChart) expenseChart.destroy();
    if (balanceChart) balanceChart.destroy();

    const ctx1 = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: Object.keys(cats),
            datasets: [{ 
                data: Object.values(cats), 
                backgroundColor: ['#e94057', '#00f2fe', '#FFCE56', '#4BC0C0', '#9966FF'],
                borderWidth: 0
            }]
        },
        options: { 
            plugins: { 
                legend: { labels: { color: 'white', font: { family: 'Kanit' } } },
                title: { display: true, text: 'สัดส่วนรายจ่าย', color: 'white', font: { size: 16 } } 
            } 
        }
    });

    const ctx2 = document.getElementById('balanceChart').getContext('2d');
    balanceChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['รายรับ', 'รายจ่าย'],
            datasets: [{ 
                label: 'บาท', 
                data: [inc, exp], 
                backgroundColor: ['#4CAF50', '#e94057'],
                borderRadius: 8
            }]
        },
        options: { 
            scales: { y: { ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } },
            plugins: { 
                legend: { display: false },
                title: { display: true, text: 'รับ vs จ่าย ทั้งหมด', color: 'white', font: { size: 16 } } 
            } 
        }
    });
}

function logout() { 
    showNotification('ออกจากระบบแล้ว');
    setTimeout(() => location.reload(), 1000);
}
