// ... (ส่วน Login และ Fetch API เหมือนเดิม) ...

async function addTransaction() {
    const descInput = document.getElementById('description');
    const amtInput = document.getElementById('amount');
    const type = document.getElementById('type').value;

    if (!descInput.value || !amtInput.value) return alert("กรุณากรอกข้อมูล");

    const data = {
        userId: currentUser._id,
        description: descInput.value, // มั่นใจว่าใช้คำว่า description
        amount: parseFloat(amtInput.value),
        type: type,
        date: new Date()
    };

    await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    descInput.value = '';
    amtInput.value = '';
    fetchTransactions();
}

function renderList() {
    const list = document.getElementById('transactionList');
    // เรียงจากใหม่ไปเก่า และแสดงแค่ 10 รายการล่าสุด
    list.innerHTML = transactions.slice().reverse().map(tx => {
        // ดึงข้อมูลมาแสดง ถ้าไม่มีให้ขึ้นว่า "ไม่ได้ระบุ"
        const detail = tx.description || "รายรายการทั่วไป";
        return `
            <li>
                <span class="desc-text">${detail}</span>
                <span class="${tx.type}">
                    ${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                </span>
            </li>
        `;
    }).join('');
}
