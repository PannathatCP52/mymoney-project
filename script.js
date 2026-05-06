let currentUser = null;
let transactions = [];
let goldPriceThai = 42000; 
let charts = {};

// 1. Auth Logic
function login() {
    const user = document.getElementById('username').value;
    if(!user) return alert("กรุณาระบุชื่อผู้ใช้");
    currentUser = user;
    document.getElementById('userDisplay').innerText = user;
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'flex';
    fetchExternalData();
}

function logout() { location.reload(); }

// 2. Tab Logic
function showTab(tabName, event) {
    document.getElementById('homeTab').style.display = tabName === 'home' ? 'block' : 'none';
    document.getElementById('analyticTab').style.display = tabName === 'analytic' ? 'block' : 'none';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// 3. Theme Logic
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isDark = !document.body.classList.contains('light-theme');
    document.querySelector('.fa-moon').className = isDark ? 'fas fa-moon' : 'fas fa-sun';
}

// 4. Data Logic
async function fetchExternalData() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        window.usdRate = data.rates.THB;
        
        const tableBody = document.getElementById('exchangeBody');
        const list = [
            { p: "USD/THB", r: data.rates.THB.toFixed(2) },
            { p: "JPY/THB", r: (data.rates.THB / data.rates.JPY).toFixed(4) },
            { p: "EUR/THB", r: (data.rates.THB / data.rates.EUR).toFixed(2) }
        ];
        if(tableBody) {
            tableBody.innerHTML = list.map(i => `<tr><td>${i.p}</td><td>${i.r}</td><td class="income">Live</td></tr>`).join('');
        }
        
        document.getElementById('goldSellLabel').innerText = goldPriceThai.toLocaleString() + " ฿";
        document.getElementById('goldBuyLabel').innerText = (goldPriceThai - 100).toLocaleString() + " ฿";
        updateDashboard();
    } catch (e) { console.error("API Error", e); }
}

// แก้ไข addTransaction เพื่อให้เรียกใช้งานได้
async function addTransaction() {
    const desc = document.getElementById('description').value;
    const amt = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    if (!desc || isNaN(amt)) return alert("ข้อมูลไม่ครบ");

    transactions.push({ description: desc, amount: amt, type: type });
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    updateDashboard();
}

function updateDashboard() {
    let cash = 0;
    transactions.forEach(tx => cash += (tx.type === 'income' ? tx.amount : -tx.amount));
    
    const goldQty = parseFloat(document.getElementById('goldQty').value) || 0;
    const goldValue = goldQty * goldPriceThai;
    const total = cash + goldValue;

    document.getElementById('netWorthTHB').innerText = total.toLocaleString() + " THB";
    document.getElementById('netWorthUSD').innerText = "$" + (total / (window.usdRate || 36)).toLocaleString(undefined,{maximumFractionDigits:2});
    
    renderHistory();
    // เรียกฟังก์ชัน renderCharts ที่ถูกประกาศไว้ด้านล่าง
    renderCharts(cash, goldValue);
}

function renderHistory() {
    const list = document.getElementById('transactionList');
    if(list) {
        list.innerHTML = transactions.slice().reverse().map(tx => `
            <li>
                <span>${tx.description || "รายการทั่วไป"}</span>
                <span class="${tx.type}">${tx.type==='income'?'+':'-'}${tx.amount.toLocaleString()}</span>
            </li>
        `).join('');
    }
}

// 5. Chart Logic - แก้ปัญหา renderChart is not defined
// ปรับปรุงให้รองรับขนาดกรอบที่ขยายใหญ่ขึ้น
function renderCharts(cash, gold) {
    const barCtx = document.getElementById('assetBarChart')?.getContext('2d');
    const pieCtx = document.getElementById('netWorthChart')?.getContext('2d');

    // ตั้งค่าสีตัวอักษรตาม Theme
    const textColor = document.body.classList.contains('light-theme') ? '#1a1a1a' : '#ffffff';

    if(barCtx) {
        if(charts.bar) charts.bar.destroy();
        charts.bar = new Chart(barCtx, {
            type: 'bar',
            data: { 
                labels: ['เงินสด', 'ทองคำ'], 
                datasets: [{ 
                    data: [cash, gold], 
                    backgroundColor: ['#6366f1', '#fbbf24'],
                    borderRadius: 10
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, // บังคับให้กราฟขยายตามกรอบ
                scales: {
                    y: { ticks: { color: textColor } },
                    x: { ticks: { color: textColor } }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'เปรียบเทียบมูลค่าสินทรัพย์', color: textColor, font: { size: 16 } }
                }
            }
        });
    }

    if(pieCtx) {
        if(charts.pie) charts.pie.destroy();
        charts.pie = new Chart(pieCtx, {
            type: 'doughnut',
            data: { 
                labels: ['เงินสด', 'ทองคำ'], 
                datasets: [{ 
                    data: [cash, gold], 
                    backgroundColor: ['#6366f1', '#fbbf24'], 
                    borderWidth: 0 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, // บังคับให้กราฟขยายตามกรอบ
                plugins: {
                    legend: { position: 'bottom', labels: { color: textColor, font: { size: 14 } } },
                    title: { display: true, text: 'สัดส่วนสินทรัพย์ (%)', color: textColor, font: { size: 18 } }
                }
            }
        });
    }
}
