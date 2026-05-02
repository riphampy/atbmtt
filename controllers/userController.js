const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt'); // Import thư viện bcrypt
const encryption = require('../services/encryptionService');

const usersFile = path.join(__dirname, '../models/users.json');
const logFile = path.join(__dirname, '../logs/access.log');
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]');
if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, '');

// Lấy mật khẩu admin từ biến môi trường
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin_fallback_123';

// Đọc nội dung file
const fileContent = fs.readFileSync(usersFile, 'utf8');

// Kiểm tra nếu file trống thì gán mảng rỗng
const users = fileContent.trim() ? JSON.parse(fileContent) : [];

function logAccess(user, action) {
  const time = new Date().toISOString();
  fs.appendFileSync(logFile, `[${time}] ${user}: ${action}\n`);
}

exports.register = (req, res) => {
  const { name, cccd, address, bank, password } = req.body;
  
  if (!name || !cccd || !address || !bank || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin!' });
  }

  // Mã hóa mật khẩu bằng bcrypt (Salt rounds = 10)
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(password, saltRounds);

  const user = {
    name,
    cccd: encryption.encryptTripleDES(cccd),
    address: encryption.encryptAES(address),
    bank: encryption.encryptAES(bank),
    password: hashedPassword // Lưu mật khẩu đã được băm
  };
  
  const users = JSON.parse(fs.readFileSync(usersFile));
  
  // Kiểm tra user đã tồn tại chưa để tránh trùng lặp (Tính năng thêm)
  if (users.some(u => u.name === name)) {
      return res.status(400).json({ message: 'Tên người dùng đã tồn tại!' });
  }

  users.push(user);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  logAccess(name, 'Đăng ký');
  res.json({ message: 'Đăng ký thành công!' });
};

exports.login = (req, res) => {
  const { name, password } = req.body;
  const users = JSON.parse(fs.readFileSync(usersFile));
  
  // Tìm user theo tên
  const user = users.find(u => u.name === name);
  
  // Dùng bcrypt.compareSync để so sánh mật khẩu nhập vào với mã băm trong file
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Sai thông tin đăng nhập' });
  }
  
  const result = {
    name: user.name,
    cccd: encryption.decryptTripleDES(user.cccd),
    address: encryption.decryptAES(user.address),
    bank: encryption.decryptAES(user.bank)
  };
  logAccess(name, 'Đăng nhập xem thông tin cá nhân');
  res.json(result);
};

exports.listUsers = (req, res) => {
  const users = JSON.parse(fs.readFileSync(usersFile));
  const safeUsers = users.map(u => ({
    name: u.name,
    cccd: '***',
    address: '***',
    bank: '***'
  }));
  res.json(safeUsers);
};

exports.adminDetail = (req, res) => {
  const { name, adminPass } = req.body;
  
  // So sánh với biến môi trường thay vì chuỗi gán cứng
  if (adminPass !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Sai mật khẩu admin' });
  
  const users = JSON.parse(fs.readFileSync(usersFile));
  const user = users.find(u => u.name === name);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
  
  const result = {
    name: user.name,
    cccd: encryption.decryptTripleDES(user.cccd),
    address: encryption.decryptAES(user.address),
    bank: encryption.decryptAES(user.bank)
  };
  logAccess('ADMIN', `Xem chi tiết user ${name}`);
  res.json(result);
};

exports.getLogs = (req, res) => {
  const logs = fs.readFileSync(logFile, 'utf8');
  res.send(logs);
};

exports.updateUser = (req, res) => {
  const { name, password, cccd, address, bank } = req.body;
  if (!name || !password || !cccd || !address || !bank) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin!' });
  }
  
  const users = JSON.parse(fs.readFileSync(usersFile));
  const idx = users.findIndex(u => u.name === name);
  
  // Xác thực mật khẩu cũ bằng mã băm trước khi cho phép cập nhật
  if (idx === -1 || !bcrypt.compareSync(password, users[idx].password)) {
    return res.status(404).json({ message: 'Không tìm thấy người dùng hoặc sai mật khẩu!' });
  }
  
  users[idx] = {
    name,
    cccd: encryption.encryptTripleDES(cccd),
    address: encryption.encryptAES(address),
    bank: encryption.encryptAES(bank),
    password: users[idx].password // Giữ nguyên mật khẩu đã hash cũ
  };
  
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  logAccess(name, 'Sửa thông tin cá nhân');
  res.json({ message: 'Cập nhật thành công!' });
};

exports.deleteUser = (req, res) => {
  const { name, password } = req.body;
  const users = JSON.parse(fs.readFileSync(usersFile));
  const idx = users.findIndex(u => u.name === name);
  
  // Xác thực mật khẩu trước khi xóa
  if (idx === -1 || !bcrypt.compareSync(password, users[idx].password)) {
    return res.status(404).json({ message: 'Không tìm thấy người dùng hoặc sai mật khẩu!' });
  }
  
  users.splice(idx, 1);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  logAccess(name, 'Xóa tài khoản');
  res.json({ message: 'Xóa tài khoản thành công!' });
};