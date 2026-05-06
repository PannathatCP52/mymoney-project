let currentUser = null;
let charts = {};

// 1. ฟังก์ชัน Login
function login() {
    const user = document.getElementById('username').value;
    if(!user) return alert("กรุณาใส่ชื่อ");
    currentUser = user;
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'flex';
    fetchExternalData(); // เริ่มโหลดข้อมูล
}

// 2. ฟังก์ชัน Logout
function logout() {
    location.reload(); // รีเฟรชหน้าเว็บเพื่อเคลียร์ค่า
}

// 3. ฟังก์ชันสลับ Tab (Home / Analytic)
function showTab(tabName) {
    document.getElementById('homeTab').style.display = tabName === 'home' ? 'block' : 'none';
    document.getElementById('analyticTab').style.display = tabName === 'analytic' ? 'block' : 'none';
    
    // ไฮไลท์เมนูที่เลือก
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// 4. ฟังก์ชัน Dark Mode
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const icon = document.querySelector('.fa-moon');
    if(icon) icon.classList.toggle('fa-sun');
}

// 5. ฟังก์ชันวาดกราฟ (แก้ Error ในรูป image_848f99.png)
function renderChart(cash, gold) {
    const ctxBar = document.getElementById('assetBarChart')?.getContext('2d');
    if(ctxBar) {
        if(charts.bar) charts.bar.destroy();
        charts.bar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['เงินสด', 'ทองคำ'],
                datasets: [{ data: [cash, gold], backgroundColor: ['#6366f1', '#fbbf24'] }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
}

// ฟังก์ชันอื่นๆ (fetchExternalData, updateDashboard) ให้ใช้ของเดิมที่ผมเคยให้ไว้ครับ
