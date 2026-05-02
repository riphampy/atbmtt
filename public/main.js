// Rút gọn hàm gọi DOM
const $ = id => document.getElementById(id);
let currentUser = null;

// Hàm helper để tái sử dụng logic gọi API và bắt lỗi mạng
async function apiCall(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (error) {
    return { ok: false, data: { error: 'Lỗi kết nối máy chủ!' } };
  }
}

// Hàm quản lý trạng thái ẩn/hiện của giao diện sau khi đăng nhập/đăng xuất
function toggleUI(isLoggedIn) {
  const displayState = isLoggedIn ? '' : 'none';
  ['logoutBtn', 'editBtn', 'deleteBtn'].forEach(id => {
    if ($(id)) $(id).style.display = displayState;
  });
  if ($('loginBtn')) $('loginBtn').style.display = isLoggedIn ? 'none' : '';
  if ($('registerLink')) $('registerLink').style.display = isLoggedIn ? 'none' : '';
}

function showLogin() {
  $('registerBox').style.display = 'none';
  $('loginBox').style.display = '';
  if ($('loginBtn')) $('loginBtn').style.display = '';
}

function showRegister() {
  $('registerBox').style.display = '';
  $('loginBox').style.display = 'none';
}

// ============================
// LOGIC API
// ============================

async function register() {
  const payload = {
    name: $('name').value.trim(),
    cccd: $('cccd').value.trim(),
    address: $('address').value.trim(),
    bank: $('bank').value.trim(),
    password: $('password').value.trim()
  };

  // Kiểm tra nhanh xem có trường nào trống không
  if (Object.values(payload).some(val => !val)) {
    return $('registerMsg').textContent = 'Vui lòng nhập đầy đủ thông tin!';
  }

  const { ok, data } = await apiCall('/api/register', payload);
  $('registerMsg').textContent = data.message || data.error;

  if (ok) {
    setTimeout(() => {
      showLogin();
      $('loginMsg').textContent = 'Đăng ký thành công! Vui lòng đăng nhập.';
    }, 1000);
  }
}

async function login() {
  const name = $('loginName').value.trim();
  const password = $('loginPassword').value.trim();
  
  if (!name || !password) {
    return $('loginMsg').textContent = 'Vui lòng nhập tên và mật khẩu!';
  }

  const { ok, data } = await apiCall('/api/login', { name, password });
  
  if (ok) {
    $('loginMsg').textContent = '';
    $('userInfo').innerHTML = `
      <div><b>Họ tên:</b> ${data.name}</div>
      <div><b>CCCD:</b> ${data.cccd}</div>
      <div><b>Địa chỉ:</b> ${data.address}</div>
      <div><b>Số tài khoản:</b> ${data.bank}</div>
    `;
    toggleUI(true);
    currentUser = { ...data, password }; // Lưu đệm để thao tác sửa/xóa
  } else {
    $('userInfo').innerHTML = '';
    $('loginMsg').textContent = data.error;
    toggleUI(false);
    currentUser = null;
  }
}

function showEditBox() {
  if (!currentUser) return;
  $('editBox').style.display = '';
  $('editCCCD').value = currentUser.cccd;
  $('editAddress').value = currentUser.address;
  $('editBank').value = currentUser.bank;
  $('editPassword').value = '';
}

function hideEditBox() {
  $('editBox').style.display = 'none';
  $('editMsg').textContent = '';
}

async function updateInfo() {
  if (!currentUser) return;
  const cccd = $('editCCCD').value.trim();
  const address = $('editAddress').value.trim();
  const bank = $('editBank').value.trim();
  const password = $('editPassword').value.trim();

  if (!cccd || !address || !bank || !password) {
    return $('editMsg').textContent = 'Vui lòng nhập đầy đủ!';
  }

  const { ok, data } = await apiCall('/api/update', { 
    name: currentUser.name, password, cccd, address, bank 
  });
  
  $('editMsg').textContent = data.message || data.error;

  if (ok) {
    hideEditBox();
    // Gán đè dữ liệu mới vào đối tượng currentUser
    Object.assign(currentUser, { cccd, address, bank });
    
    // Render lại giao diện người dùng
    $('userInfo').innerHTML = `
      <div><b>Họ tên:</b> ${currentUser.name}</div>
      <div><b>CCCD:</b> ${cccd}</div>
      <div><b>Địa chỉ:</b> ${address}</div>
      <div><b>Số tài khoản:</b> ${bank}</div>
    `;
  }
}

async function deleteAccount() {
  if (!currentUser || !confirm('Bạn có chắc chắn muốn xóa tài khoản?')) return;
  
  const password = prompt('Nhập lại mật khẩu để xác nhận xóa tài khoản:');
  if (!password) return;

  const { ok, data } = await apiCall('/api/delete', { name: currentUser.name, password });
  alert(data.message || data.error);
  
  if (ok) logout();
}

function logout() {
  $('loginName').value = '';
  $('loginPassword').value = '';
  $('userInfo').innerHTML = '';
  $('loginMsg').textContent = '';
  toggleUI(false);
  hideEditBox();
  currentUser = null;
  showRegister();
}