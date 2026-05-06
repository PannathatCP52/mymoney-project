async function fetchExternalData() {
    try {
        // ดึงข้อมูลอัตราแลกเปลี่ยน
        const resRate = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await resRate.json();
        const rates = data.rates;
        const baseInTHB = rates.THB;

        // รายชื่อคู่เงินที่ต้องการแสดง
        const currencyList = [
            { name: 'USD / THB', rate: baseInTHB, icon: '🇺🇸' },
            { name: 'JPY / THB', rate: (baseInTHB / rates.JPY), icon: '🇯🇵' },
            { name: 'EUR / THB', rate: (baseInTHB / rates.EUR), icon: '🇪🇺' },
            { name: 'Gold (Oz) / THB', rate: (baseInTHB * 2300), icon: '✨' } // ราคาทองโลกโดยประมาณ
        ];

        // เติมข้อมูลลงในตาราง
        const tableBody = document.getElementById('exchangeBody');
        tableBody.innerHTML = currencyList.map(item => `
            <tr>
                <td>${item.icon} ${item.name}</td>
                <td><strong>${item.rate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td class="income">+0.05%</td> 
            </tr>
        `).join('');

        // แสดงวันที่และเวลาอัปเดต
        const now = new Date();
        document.getElementById('lastUpdate').innerText = now.toLocaleString('th-TH');
        
        // อัปเดตราคาทอง (สมมติค่าคงที่หรือใช้ API เฉพาะทาง)
        document.getElementById('goldSellLabel').innerText = "42,000 THB";
        document.getElementById('goldBuyLabel').innerText = "41,900 THB";

    } catch (e) {
        console.error("ไม่สามารถโหลดข้อมูล Real-time ได้", e);
    }
}
