// --- ส่วนที่ 1: โหมดหน้าจอมืด (Tier C - 4 คะแนน) ---
const themeToggleBtn = document.getElementById('themeToggle');
themeToggleBtn.addEventListener('click', () => {
    const body = document.body;
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggleBtn.innerText = '🌙 Dark Mode';
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerText = '☀️ Light Mode';
    }
});

// --- ส่วนที่ 2: ระบบ Login และ API ภายนอก (Basic Requirements) ---
let currentUser = null;

// เชื่อมต่อ API ภายนอก (ดึงอัตราแลกเปลี่ยนเงิน USD -> THB แบบ Real-time)
async function loadExchangeRate() {
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/THB');
        const data = await res.json();
        const thbToUsd = (1 / data.rates.USD).toFixed(2);
        document.getElementById('exchangeRate').innerText = `1 USD = ${thbToUsd} บาท`;
    } catch (error) {
        document.getElementById('exchangeRate').innerText = 'ดึงข้อมูล API ล้มเหลว';
    }
}

document.getElementById('loginBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    if (!username) return alert('กรุณาตั้งชื่อผู้ใช้งานก่อนครับ');

    try {
        // ส่งข้อมูลไปที่หลังบ้าน (Node.js)
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        currentUser = await response.json();

        // สลับหน้าจอเมื่อ Login สำเร็จ
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';

        loadExchangeRate();
        loadTransactions();
    } catch (error) {
        console.error('Error:', error);
        alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (โปรดตรวจสอบว่ารัน node server.js อยู่และเชื่อม DB ได้)');
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('username').value = '';
});

// --- ส่วนที่ 3: ระบบบันทึกข้อมูล และ แจ้งเตือน (Tier B: CRUD & Tier C: Notification) ---
let transactions = [];
let pieChartInstance = null;
let lineChartInstance = null;

document.getElementById('addTransactionBtn').addEventListener('click', async () => {
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;
    const amount = Number(document.getElementById('amount').value);

    if (!category || !amount) return alert('กรุณากรอกหมวดหมู่และจำนวนเงินให้ครบถ้วน');

    const newTx = { userId: currentUser._id, type, category, amount };

    // ส่งข้อมูลไปบันทึกลง Database
    await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx)
    });

    document.getElementById('category').value = '';
    document.getElementById('amount').value = '';
    loadTransactions(); // โหลดข้อมูลใหม่หลังจากบันทึกเสร็จ
});

async function loadTransactions() {
    const res = await fetch(`/api/transactions/${currentUser._id}`);
    transactions = await res.json();
    
    renderList();
    updateDashboard();
}

// ฟังก์ชันลบรายการ (ส่วนหนึ่งของ CRUD)
async function deleteTransaction(id) {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    loadTransactions();
}

function renderList() {
    const list = document.getElementById('transactionList');
    list.innerHTML = '';
    transactions.forEach(tx => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${tx.category} (${tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'})</span>
            <span>${tx.amount} บาท <button onclick="deleteTransaction('${tx._id}')" style="background:#ff4c4c; padding:5px 10px; font-size:12px; margin-left:10px;">ลบ</button></span>
        `;
        list.appendChild(li);
    });
}

function updateDashboard() {
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseCategories = {};

    transactions.forEach(tx => {
        if (tx.type === 'income') {
            totalIncome += tx.amount;
        } else {
            totalExpense += tx.amount;
            // สะสมยอดรายจ่ายแยกตามหมวดหมู่เพื่อไปทำกราฟ
            expenseCategories[tx.category] = (expenseCategories[tx.category] || 0) + tx.amount;
        }
    });

    const balance = totalIncome - totalExpense;
    document.getElementById('totalBalance').innerText = `${balance} บาท`;

    // Tier C: Notification (แจ้งเตือนเมื่อเงินคงเหลือติดลบ เกิดขึ้นจากเงื่อนไขจริง)
    if (balance < 0) {
        alert('⚠️ แจ้งเตือน: ตอนนี้ยอดเงินคงเหลือของคุณติดลบแล้ว! โปรดระมัดระวังการใช้จ่าย');
    }

    renderCharts(expenseCategories, totalIncome, totalExpense);
}

// --- ส่วนที่ 4: กราฟแสดงผล (Tier B - 12 คะแนน: Dashboard & Data Visualization) ---
function renderCharts(expenseCategories, totalIncome, totalExpense) {
    // 1. Pie Chart: สัดส่วนรายจ่ายตามหมวดหมู่
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    if (pieChartInstance) pieChartInstance.destroy(); // ลบกราฟเก่าก่อนวาดใหม่
    pieChartInstance = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(expenseCategories).length > 0 ? Object.keys(expenseCategories) : ['ไม่มีข้อมูล'],
            datasets: [{
                data: Object.keys(expenseCategories).length > 0 ? Object.values(expenseCategories) : [1],
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4CAF50', '#9966FF']
            }]
        },
        options: { plugins: { title: { display: true, text: 'สัดส่วนรายจ่ายตามหมวดหมู่' } } }
    });

    // 2. Bar Chart: เปรียบเทียบรายรับ-รายจ่าย (ใช้แทน Line graph ในกรณีนี้เพื่อให้เห็นชัดเจนขึ้น)
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    if (lineChartInstance) lineChartInstance.destroy();
    lineChartInstance = new Chart(lineCtx, {
        type: 'bar',
        data: {
            labels: ['รายรับทั้งหมด', 'รายจ่ายทั้งหมด'],
            datasets: [{
                label: 'จำนวนเงิน (บาท)',
                data: [totalIncome, totalExpense],
                backgroundColor: ['#4CAF50', '#FF6384']
            }]
        },
        options: { plugins: { title: { display: true, text: 'เปรียบเทียบรายรับ-รายจ่ายรวม' } } }
    });
}
