const API_URL = 'https://script.google.com/macros/s/AKfycbzaM0Lf1n2cx9rd5RLbUBt-Us9FaWPLlfEvGQLvC78OraLrtpvCkC4CnOt3ioXQudMn/exec';

// ── API Calls ──
async function apiCall(data) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiGet() {
  const res = await fetch(API_URL);
  return res.json();
}

// ── Validation ──
const rules = {
  name:    v => !v ? 'Name is required.' : v.length < 2 ? 'Min 2 characters.' : '',
  number:  v => !v ? 'Number is required.' : !/^\d{10}$/.test(v) ? 'Enter valid 10-digit number.' : '',
  email:   v => !v ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter valid email.' : '',
  gender:  v => !v ? 'Please select gender.' : '',
  address: v => !v ? 'Address is required.' : ''
};

function validateField(id) {
  const el  = document.getElementById(id);
  const msg = rules[id](el.value.trim());
  document.getElementById('err-' + id).textContent = msg;
  el.classList.toggle('invalid', !!msg);
  return !msg;
}

function validateAll() {
  return ['name','number','email','gender','address'].map(validateField).every(Boolean);
}

function clearErrors() {
  ['name','number','email','gender','address'].forEach(id => {
    document.getElementById('err-' + id).textContent = '';
    document.getElementById(id).classList.remove('invalid');
  });
}

['name','number','email','gender','address'].forEach(id => {
  document.getElementById(id).addEventListener('blur', () => validateField(id));
  document.getElementById(id).addEventListener('input', () => {
    if (document.getElementById(id).classList.contains('invalid')) validateField(id);
  });
});

// ── Helpers ──
function getFormData() {
  return {
    name:    document.getElementById('name').value.trim(),
    number:  document.getElementById('number').value.trim(),
    email:   document.getElementById('email').value.trim(),
    gender:  document.getElementById('gender').value,
    address: document.getElementById('address').value.trim(),
    file:    document.getElementById('fileInput').files[0]?.name || ''
  };
}

function populateForm(data) {
  document.getElementById('name').value    = data.name;
  document.getElementById('number').value  = data.number;
  document.getElementById('email').value   = data.email;
  document.getElementById('gender').value  = data.gender;
  document.getElementById('address').value = data.address;
  document.getElementById('fileName').textContent = data.file ? '📄 ' + data.file : '📄 Upload Document';
  document.getElementById('recordId').value = data.number;
  clearErrors();
}

function clearForm() {
  ['name','number','email','address','searchInput'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('gender').value   = '';
  document.getElementById('recordId').value = '';
  document.getElementById('fileName').textContent = '📄 Upload Document';
  document.getElementById('docPreview').style.display = 'none';
  document.getElementById('fileInput').value = '';
  clearErrors();
}

function showMsg(msg, isError = false) {
  const el = document.getElementById('message');
  el.textContent = msg;
  el.style.color = isError ? '#f08080' : '#a0e0a0';
}

function setLoading(on) {
  ['submitBtn','editBtn','deleteBtn','searchBtn'].forEach(id => {
    document.getElementById(id).disabled = on;
  });
}

// ── Grid ──
async function renderGrid() {
  try {
    const records   = await apiGet();
    const container = document.getElementById('gridContainer');
    const tbody     = document.getElementById('recordsBody');

    if (!records.length) { container.style.display = 'none'; return; }

    container.style.display = 'block';
    tbody.innerHTML = records.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.name}</td>
        <td>${r.number}</td>
        <td>${r.email}</td>
        <td>${r.gender}</td>
        <td title="${r.address}">${r.address}</td>
        <td>${r.file || '-'}</td>
        <td><button class="btn-load" data-num="${r.number}">Load</button></td>
      </tr>`).join('');
  } catch(e) {
    console.error(e);
  }
}

document.getElementById('recordsBody').addEventListener('click', async e => {
  if (e.target.classList.contains('btn-load')) {
    const number = e.target.dataset.num;
    const res = await apiCall({ action: 'search', number });
    if (!res.error) { populateForm(res.data); showMsg('Record loaded.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }
});

// ── CRUD ──
async function submitRecord() {
  if (!validateAll()) return;
  const data = getFormData();
  setLoading(true);
  showMsg('Saving...');
  const res = await apiCall({ action: 'insert', ...data });
  setLoading(false);
  showMsg(res.msg, res.error);
  if (!res.error) { clearForm(); renderGrid(); }
}

async function editRecord() {
  const id = document.getElementById('recordId').value;
  if (!id) return showMsg('Load a record first to edit.', true);
  if (!validateAll()) return;
  const data = getFormData();
  setLoading(true);
  showMsg('Updating...');
  const res = await apiCall({ action: 'update', ...data });
  setLoading(false);
  showMsg(res.msg, res.error);
  if (!res.error) renderGrid();
}

async function deleteRecord() {
  const id = document.getElementById('recordId').value;
  if (!id) return showMsg('Load a record first to delete.', true);
  setLoading(true);
  showMsg('Deleting...');
  const res = await apiCall({ action: 'delete', number: id });
  setLoading(false);
  showMsg(res.msg, res.error);
  if (!res.error) { clearForm(); renderGrid(); }
}

async function searchRecord() {
  const number = document.getElementById('searchInput').value.trim();
  if (!number) return showMsg('Enter a number to search.', true);
  setLoading(true);
  showMsg('Searching...');
  const res = await apiCall({ action: 'search', number });
  setLoading(false);
  if (!res.error) { populateForm(res.data); showMsg('Record found.'); }
  else showMsg(res.msg, true);
}

// ── Buttons ──
document.getElementById('submitBtn').addEventListener('click', submitRecord);
document.getElementById('editBtn').addEventListener('click', editRecord);
document.getElementById('deleteBtn').addEventListener('click', deleteRecord);
document.getElementById('searchBtn').addEventListener('click', searchRecord);
document.getElementById('fileUploadBtn').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('removeDocBtn').addEventListener('click', () => {
  document.getElementById('fileInput').value = '';
  document.getElementById('docPreview').style.display = 'none';
  document.getElementById('fileName').textContent = '📄 Upload Document';
});

document.getElementById('fileInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  document.getElementById('docInfo').textContent = `${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
  document.getElementById('docPreview').style.display = 'flex';
});

// ── Init ──
renderGrid();
