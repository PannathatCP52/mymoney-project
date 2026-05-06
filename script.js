// ประกาศตัวแปร Global
let transactions = [];
let goldPriceThai = 41500; 
let charts = {}; 

async function fetchExternalData() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        window.usdRate = data.rates.THB;
        
        // จำลองข้อมูลตาราง Exchange Rate
        renderExchangeTable(data.rates);
        updateDashboard();
    } catch (e) { 
        console.error("Data fetch error:", e); 
    }
}

function renderExchangeTable(rates) {
    const tableBody = document.getElementById('exchangeBody');
    if(!tableBody) return;
    
    const thb = rates.THB;
    const list = [
        { pair: "USD/THB", rate: thb.toFixed(2) },
        { pair: "JPY/THB", rate: (thb / rates.JPY).toFixed(4) },
        { pair: "EUR/THB", rate: (thb / rates.EUR).toFixed(2) }
    ];

    tableBody.innerHTML = list.map(item => `
        <tr>
            <td>${item.pair}</td>
            <td><strong>${item.rate}</strong></td>
            <td><span class="income">Active</span></td>
        </tr>
    `).join('');
}

// แก้ Error: addTransaction is not defined
async function addTransaction() {
    const desc = document.getElementById('description').value;
    const amt = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;

    if (!desc || isNaN(amt)) return alert("กรุณากรอกข้อมูลให้ครบ");

    // ในโปรเจกต์จริงต้อง Fetch ไป Backend แต่ตอนนี้ให้เก็บใน Array ก่อนเพื่อทดสอบ
    transactions.push({ description: desc, amount: amt, type: type, date: new Date() });
    
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    updateDashboard();
}

function updateDashboard() {
    let cash = 0;
    transactions.forEach(tx => {
        if(tx.type === 'income') cash += tx.amount;
        else cash -= tx.amount;
    });

    const goldQty = parseFloat(document.getElementById('goldQty').value) || 0;
    const goldTotal = goldQty * goldPriceThai;
    const totalNet = cash + goldTotal;

    document.getElementById('netWorthTHB').innerText = totalNet.toLocaleString() + " THB";
    document.getElementById('netWorthUSD').innerText = "$" + (totalNet / (window.usdRate || 36)).toLocaleString(undefined, {maximumFractionDigits:2});
    
    renderHistory();
    renderChart(cash, goldTotal); // เรียกฟังก์ชันวาดกราฟ
}

// แก้ Error: renderChart is not defined
function renderChart(cash, gold) {
    const ctx = document.getElementById('assetBarChart');
    if (!ctx) return;

    if (charts.bar) charts.bar.destroy();
    
    charts.bar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Cash', 'Gold'],
            datasets: [{
                label: 'Value (THB)',
                data: [cash, gold],
                backgroundColor: ['#6366f1', '#fbbf24'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderHistory() {
    const list = document.getElementById('transactionList');
    list.innerHTML = transactions.slice().reverse().map(tx => `
        <li>
            <span>${tx.description || "General"}</span>
            <span class="${tx.type}">${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}</span>
        </li>
    `).join('');
}

// เริ่มทำงาน
fetchExternalData();
