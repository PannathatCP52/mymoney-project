let currentUser = null;
let transactions = [];
let expenseChart = null;
let balanceChart = null;

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (!user || !pass) return alert('กรุณากรอกให้ครบ');

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
        fetchTransactions();
    } else { alert(data.message); }
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
    const cat = document.getElementById('category').value;

    if (!desc || !amt) return alert('กรุณากรอกข้อมูล');

    await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id, description: desc, amount: amt, type, category: cat })
    });
    fetchTransactions();
}

function updateDashboard() {
    let totalIncome = 0; let totalExpense = 0;
    let expenseCategories = {};
    let summary = {
        day: { i: 0, e: 0 }, week: { i: 0, e: 0 }, month: { i: 0, e: 0 }, year: { i: 0, e: 0 }
    };

    const now = new Date();
    const startOfDay = new Date().setHours(0,0,0,0);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).setHours(0,0,0,0);

    transactions.forEach(tx => {
        const amt = tx.amount;
        const d = new Date(tx.date);
        const t = d.getTime();

        if (tx.type === 'income') {
            totalIncome += amt;
            if (t >= startOfDay) summary.day.i += amt;
            if (t >= startOfWeek) summary.week.i += amt;
            if (d.getMonth() === new Date().getMonth()) summary.month.i += amt;
            if (d.getFullYear() === new Date().getFullYear()) summary.year.i += amt;
        } else {
            totalExpense += amt;
            expenseCategories[tx.category] = (expenseCategories[tx.category] || 0) + amt;
            if (t >= startOfDay) summary.day.e += amt;
            if (t >= startOfWeek) summary.week.e += amt;
            if (d.getMonth() === new Date().getMonth()) summary.month.e += amt;
            if (d.getFullYear() === new Date().getFullYear()) summary.year.e += amt;
        }
    });

    document.getElementById('totalBalance').innerText = `${totalIncome - totalExpense} บาท`;
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
    list.innerHTML = transactions.map(tx => `
        <li>
            <span>${tx.description} (${tx.category})</span>
            <span style="color: ${tx.type === 'income' ? '#4CAF50' : '#e94057'}">
                ${tx.type === 'income' ? '+' : '-'}${tx.amount}
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
            datasets: [{ data: Object.values(cats), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'] }]
        },
        options: { plugins: { title: { display: true, text: 'สัดส่วนรายจ่าย', color: 'white' } } }
    });

    const ctx2 = document.getElementById('balanceChart').getContext('2d');
    balanceChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['รายรับ', 'รายจ่าย'],
            datasets: [{ label: 'จำนวนเงิน', data: [inc, exp], backgroundColor: ['#4CAF50', '#e94057'] }]
        },
        options: { plugins: { title: { display: true, text: 'รับ vs จ่าย', color: 'white' } } }
    });
}

function logout() { location.reload(); }
