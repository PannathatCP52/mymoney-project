let currentUser = { _id: "user123" }; // สมมติ
let transactions = [];
let goldPriceThai = 41500; 

async function fetchExternalData() {
    try {
        // ดึงค่าเงิน Real-time
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        const thbRate = data.rates.THB;
        const jpyRate = data.rates.JPY;

        // จัดการตาราง Exchange Table
        const exchangeData = [
            { pair: "USD/THB", rate: thbRate, status: "Active" },
            { pair: "JPY/THB", rate: (thbRate / jpyRate).toFixed(4), status: "Active" },
            { pair: "EUR/THB", rate: (thbRate / data.rates.EUR).toFixed(2), status: "Active" }
        ];

        document.getElementById('exchangeBody').innerHTML = exchangeData.map(item => `
            <tr>
                <td>${item.pair}</td>
                <td><strong>${item.rate}</strong></td>
                <td><span class="income"><i class="fas fa-arrow-up"></i> ${item.status}</span></td>
            </tr>
        `).join('');

        document.getElementById('lastUpdate').innerText = new Date().toLocaleTimeString();
        
        // อัปเดตราคา Net Worth (สมมติราคาทอง)
        document.getElementById('goldSellLabel').innerText = (goldPriceThai).toLocaleString() + " ฿";
        document.getElementById('goldBuyLabel').innerText = (goldPriceThai - 100).toLocaleString() + " ฿";
        
        window.usdRate = thbRate;
        updateDashboard();
    } catch (e) { console.error("Data fetch error", e); }
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
    renderChart(cash, goldTotal);
}

function renderHistory() {
    const list = document.getElementById('transactionList');
    list.innerHTML = transactions.slice().reverse().map(tx => `
        <li>
            <span>${tx.description || "รายการทั่วไป"}</span>
            <span class="${tx.type}">${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}</span>
        </li>
    `).join('');
}

// เรียกข้อมูลเมื่อโหลดหน้า
setInterval(fetchExternalData, 60000); // อัปเดตทุก 1 นาที
fetchExternalData();
