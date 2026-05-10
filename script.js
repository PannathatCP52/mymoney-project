let currentUser = null;
let transactions = [];
let goldPriceThai = 42000; 
let charts = {};
let favRates = JSON.parse(localStorage.getItem('favRates')) || ['USD/THB'];

// 1. Auth Logic
async function login() {
    const user = document.getElementById('username').value;
    if(!user) return alert("กรุณาระบุชื่อผู้ใช้");
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user })
        });
        const userData = await res.json();
        
        currentUser = userData.username;
        document.getElementById('userDisplay').innerText = currentUser;
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'flex';
}

// ฟังก์ชันใหม่: ดึงประวัติจาก Database
async function loadTransactions() {
    try {
        const res = await fetch(`/api/transactions/${currentUser}`);
        transactions = await res.json();
        updateDashboard(); // อัปเดตหน้าจอหลังจากได้ข้อมูล
    } catch (err) {
        console.error("Load Data Error:", err);
    }
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
        window.apiRates = data.rates; // เก็บข้อมูลทั้งหมดไว้ใช้ตอนกดดาว/เรียงลำดับ
        
        updateExchangeTable(); // เรียกฟังก์ชันสร้างตาราง
        
        document.getElementById('goldSellLabel').innerText = goldPriceThai.toLocaleString() + " ฿";
        document.getElementById('goldBuyLabel').innerText = (goldPriceThai - 100).toLocaleString() + " ฿";
        updateDashboard();
    } catch (e) { console.error("API Error", e); }
}

// ฟังก์ชันสร้างตารางและจัดเรียงดาว (เพิ่มใหม่)
function updateExchangeTable() {
    const rates = window.apiRates;
    if(!rates) return;

    // 1. เพิ่มคู่เงินที่ต้องการให้แสดงได้ที่นี่เลยครับ
    const allPairs = [
        { p: "USD/THB", r: rates.THB.toFixed(2) },
        { p: "JPY/THB", r: (rates.THB / rates.JPY).toFixed(4) },
        { p: "EUR/THB", r: (rates.THB / rates.EUR).toFixed(2) },
        { p: "GBP/THB", r: (rates.THB / rates.GBP).toFixed(2) },
        { p: "CNY/THB", r: (rates.THB / rates.CNY).toFixed(2) },
        { p: "USD/JPY", r: rates.JPY.toFixed(2) }, // ดอลลาร์-เยน
        { p: "EUR/USD", r: (1 / rates.EUR).toFixed(4) }, // ยูโร-ดอลลาร์
        { p: "GBP/USD", r: (1 / rates.GBP).toFixed(4) } // ปอนด์-ดอลลาร์
    ];

    // 2. จัดเรียงลำดับ: ให้คู่เงินที่ติดดาว (อยู่บนสุด) ขึ้นมาก่อน
    allPairs.sort((a, b) => {
        const aFav = favRates.includes(a.p) ? 1 : 0;
        const bFav = favRates.includes(b.p) ? 1 : 0;
        return bFav - aFav; 
    });

    // 3. วาดตารางใหม่
    const tableBody = document.getElementById('exchangeBody');
    tableBody.innerHTML = allPairs.map(i => {
        const isFav = favRates.includes(i.p);
        // ถ้าเป็น Favorite ใช้ดาวทึบสีทอง (fas) ถ้าไม่ใช่ใช้ดาวโปร่งสีเทา (far)
        const starIcon = isFav 
            ? `<i class="fas fa-star" style="color: var(--gold); cursor: pointer; margin-right: 8px;"></i>` 
            : `<i class="far fa-star" style="color: var(--text-dim); cursor: pointer; margin-right: 8px;"></i>`;
            
        return `<tr>
            <td style="text-align: left; padding-left: 20px;" onclick="toggleFavRate('${i.p}')">
                ${starIcon} <span style="cursor: pointer;">${i.p}</span>
            </td>
            <td>${i.r}</td>
            <td class="income">Live</td>
        </tr>`;
    }).join('');
}

// ฟังก์ชันเปิด/ปิดดาว (เพิ่มใหม่)
function toggleFavRate(pair) {
    if (favRates.includes(pair)) {
        // ถ้ามีอยู่แล้วให้เอาออก (เลิกติดดาว)
        favRates = favRates.filter(p => p !== pair);
    } else {
        // ถ้ายังไม่มีให้เพิ่มเข้าไป (ติดดาว)
        favRates.push(pair);
    }
    // เซฟลง Local Storage เผื่อรีเฟรชหน้าเว็บ
    localStorage.setItem('favRates', JSON.stringify(favRates));
    
    // รีเฟรชตารางเพื่อให้รายการที่กดดาวเด้งขึ้นไปบนสุด
    updateExchangeTable();
}

// แทนที่ฟังก์ชัน addTransaction เดิมด้วยโค้ดนี้
async function addTransaction() {
    const desc = document.getElementById('description').value;
    const amt = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    if (!desc || isNaN(amt)) return alert("ข้อมูลไม่ครบ");
    
    let currentCash = 0; 
    transactions.forEach(tx => currentCash += (tx.type === 'income' ? tx.amount : -tx.amount));
    if (type === 'expense' && (currentCash - amt) < 0) return alert('ยอดเงินไม่เพียงพอ');
    
    // เพิ่ม date: new Date().toISOString() เข้าไป
    transactions.push({ description: desc, amount: amt, type: type, date: new Date().toISOString() });
    
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
    renderCharts(cash, goldValue);
}

// ฟังก์ชันช่วยกรองวันที่ (เพิ่มใหม่)
function filterTransactions(txs, filterType) {
    if (filterType === 'all') return txs;
    
    const now = new Date();
    return txs.filter(tx => {
        // ถ้าข้อมูลเก่าไม่มี date ให้ถือว่าเป็นของวันนี้ไปก่อนเพื่อป้องกันบั๊ก
        const txDate = tx.date ? new Date(tx.date) : new Date();
        
        if (filterType === 'daily') {
            return txDate.toDateString() === now.toDateString();
        } else if (filterType === 'weekly') {
            const pastWeek = new Date();
            pastWeek.setDate(now.getDate() - 7);
            return txDate >= pastWeek;
        } else if (filterType === 'monthly') {
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        } else if (filterType === 'yearly') {
            return txDate.getFullYear() === now.getFullYear();
        }
        return true;
    });
}

// อัปเดตฟังก์ชัน renderHistory ใหม่ เพื่อคำนวณและแสดงผลตามตัวกรอง
function renderHistory() {
    const filter = document.getElementById('timeFilter')?.value || 'all';
    const filteredTxs = filterTransactions(transactions, filter);

    // 1. คำนวณสรุปยอดตามช่วงเวลาที่เลือก
    let periodInc = 0;
    let periodExp = 0;
    filteredTxs.forEach(tx => {
        if (tx.type === 'income') periodInc += tx.amount;
        else periodExp += tx.amount;
    });

    const summaryDiv = document.getElementById('periodSummary');
    if(summaryDiv) {
        summaryDiv.innerHTML = `
            <span class="income"><i class="fas fa-arrow-down"></i> รายรับ: ฿${periodInc.toLocaleString()}</span>
            <span class="expense"><i class="fas fa-arrow-up"></i> รายจ่าย: ฿${periodExp.toLocaleString()}</span>
        `;
    }

    // 2. แสดงรายการ
    const list = document.getElementById('transactionList');
    list.innerHTML = filteredTxs.slice().reverse().map(tx => {
        const dateStr = tx.date ? new Date(tx.date).toLocaleDateString('th-TH') : 'ไม่มีวันที่';
        return `
            <li>
                <div style="display: flex; flex-direction: column;">
                    <span>${tx.description || "รายการทั่วไป"}</span>
                    <small style="color: var(--text-dim); font-size: 0.75rem; margin-top: 2px;">${dateStr}</small>
                </div>
                <span class="${tx.type}">${tx.type==='income'?'+':'-'}฿${tx.amount.toLocaleString()}</span>
            </li>
        `;
    }).join('');
}

// 5. Chart Logic (แก้ ReferenceError)
function renderCharts(cash, gold) {
    const barCtx = document.getElementById('assetBarChart')?.getContext('2d');
    const pieCtx = document.getElementById('netWorthChart')?.getContext('2d');

    if(barCtx) {
        if(charts.bar) charts.bar.destroy();
        charts.bar = new Chart(barCtx, {
            type: 'bar',
            data: { labels: ['Cash', 'Gold'], datasets: [{ data: [cash, gold], backgroundColor: ['#6366f1', '#fbbf24'] }] },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // This removes the "undefined" box
                    }
                }
            }
        });
    }

    if(pieCtx) {
        if(charts.pie) charts.pie.destroy();
        charts.pie = new Chart(pieCtx, {
            type: 'doughnut',
            data: { 
                labels: ['Cash', 'Gold'], 
                datasets: [{ 
                    data: [cash, gold], 
                    backgroundColor: ['#6366f1', '#fbbf24'] 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, /* *** บรรทัดนี้แหละครับที่สำคัญ กราฟจะหายถ้าไม่มีตัวนี้ *** */
                plugins: {
                    legend: {
                        display: false // ปิดตัวหนังสือข้างบนกราฟ เพราะเรามี % โชว์ข้างล่างแล้ว
                    }
                }
            }
        });
    }
    
    // --- เพิ่มโค้ดส่วนนี้ต่อท้ายสุดในฟังก์ชัน renderCharts ---
    const totalAsset = cash + gold;
    const percentageDiv = document.getElementById('assetPercentage');
    
    if (percentageDiv) {
        if (totalAsset > 0) {
            const cashPercent = ((cash / totalAsset) * 100).toFixed(1);
            const goldPercent = ((gold / totalAsset) * 100).toFixed(1);
            
            // แสดงผลเปอร์เซ็นต์ โดยใช้สีเดียวกับกราฟ
            percentageDiv.innerHTML = `
                <span style="color: #6366f1;">Cash: ${cashPercent}%</span> 
                <span style="margin: 0 15px; color: var(--text-dim);">|</span> 
                <span style="color: #fbbf24;">Gold: ${goldPercent}%</span>
            `;
        } else {
            // กรณีที่ยอดเงินและทองเป็น 0 ทั้งคู่
            percentageDiv.innerHTML = `<span style="color: var(--text-dim);">ยังไม่มีข้อมูลสินทรัพย์</span>`;
        }
    }

    // --- ก๊อปปี้ส่วนนี้ไปวางก่อนปิดฟังก์ชัน renderCharts ---
    const total = cash + gold;
    const cashP = total > 0 ? ((cash / total) * 100).toFixed(1) : 0;
    const goldP = total > 0 ? ((gold / total) * 100).toFixed(1) : 0;

    const htmlContent = `
        <span style="color: #6366f1;"><i class="fas fa-wallet"></i> Cash: ${cashP}%</span>
        <span style="color: #fbbf24;"><i class="fas fa-coins"></i> Gold: ${goldP}%</span>
    `;

    const barLabel = document.getElementById('barPercent');
    const pieLabel = document.getElementById('piePercent');
    
    if (barLabel) barLabel.innerHTML = htmlContent;

    // --- ฟังก์ชันสำหรับจัดการทองคำ ---
    function saveGoldQty() {
        const qty = document.getElementById('goldQty').value;
        // เซฟลงเครื่องโดยผูกกับชื่อผู้ใช้ เช่น goldQty_admin = 5
        localStorage.setItem(`goldQty_${currentUser}`, qty); 
        updateDashboard(); // อัปเดตกราฟและยอดเงินรวม
    }
    
    function loadGoldQty() {
        // โหลดข้อมูลจากชื่อผู้ใช้นั้นๆ
        const savedQty = localStorage.getItem(`goldQty_${currentUser}`);
        if (savedQty !== null) {
            document.getElementById('goldQty').value = savedQty;
        } else {
            document.getElementById('goldQty').value = "0"; // ค่าเริ่มต้น
        }
    }
    if (pieLabel) pieLabel.innerHTML = htmlContent;
    
