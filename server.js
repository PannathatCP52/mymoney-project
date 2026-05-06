require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(cors());
// สั่งให้เซิร์ฟเวอร์แสดงไฟล์ HTML หน้าเว็บด้วย
app.use(express.static(__dirname));

// --- เชื่อมต่อฐานข้อมูล MongoDB Atlas (ดึงรหัสผ่านจากไฟล์ .env) ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ เชื่อมต่อ MongoDB สำเร็จ!'))
    .catch(err => console.log('❌ เชื่อมต่อ MongoDB ไม่สำเร็จ:', err));

// --- สร้างโครงสร้างข้อมูล (Schema) ---
const transactionSchema = new mongoose.Schema({
    userId: String,
    type: String,
    category: String,
    amount: Number,
    date: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// --- API Routes ---
// 1. ระบบ Login (จำลองการสร้าง/ค้นหา User)
app.post('/api/login', (req, res) => {
    const { username } = req.body;
    res.json({ _id: username, username: username }); 
});

// 2. ดึงรายการทั้งหมด
app.get('/api/transactions/:userId', async (req, res) => {
    const txs = await Transaction.find({ userId: req.params.userId });
    res.json(txs);
});

// 3. เพิ่มรายการใหม่
app.post('/api/transactions', async (req, res) => {
    const newTx = new Transaction(req.body);
    await newTx.save();
    res.json(newTx);
});

// 4. ลบรายการ
app.delete('/api/transactions/:id', async (req, res) => {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'ลบเรียบร้อย' });
});

// --- เปิดการทำงานเซิร์ฟเวอร์ ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 เซิร์ฟเวอร์รันอยู่ที่พอร์ต ${PORT}`);
});
