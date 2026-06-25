const API = {
  _key: 'personalRecords',
  _all() { return JSON.parse(localStorage.getItem(this._key) || '{}'); },
  _save(data) { localStorage.setItem(this._key, JSON.stringify(data)); },

  post(record) {
    const db = this._all();
    if (db[record.number]) return { ok: false, msg: 'Number already exists.' };
    db[record.number] = { ...record, id: record.number };
    this._save(db);
    return { ok: true, msg: 'Record created successfully.' };
  },
  get(number) {
    const db = this._all();
    return db[number] ? { ok: true, data: db[number] } : { ok: false, msg: 'Record not found.' };
  },
  put(number, record) {
    const db = this._all();
    if (!db[number]) return { ok: false, msg: 'Record not found. Submit first.' };
    db[number] = { ...db[number], ...record };
    this._save(db);
    return { ok: true, msg: 'Record updated successfully.' };
  },
  delete(number) {
    const db = this._all();
    if (!db[number]) return { ok: false, msg: 'Record not found.' };
    delete db[number];
    this._save(db);
    return { ok: true, msg: 'Record deleted successfully.' };
  }
};

// ── Validation ──
const rules = {
  name:    v => !v ? 'Name is required.' : v.length < 2 ? 'Name must be at least 2 characters.' : '',
  number:  v => !v ? 'Number is required.' : !/^\d{10}$/.test(v) ? 'Enter a valid 10-digit number.' : '',
  email:   v => !v ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email address.' : '',
  gender:  v => !v ? 'Please select a gender.' : '',
  address: v => !v ? 'Address is required.' : ''
};

function validateField(id) {
  const el = document.getElementById(id);
  const msg = rules[id](el.value.trim());
  document.getElementById('err-' + id).textContent = msg;
  el.classList.toggle('invalid', !!msg);
  return !msg;
}

function validateAll() {
  return ['name', 'number', 'email', 'gender', 'address'].map(validateField).every(Boolean);
}

function clearErrors() {
  ['name', 'number', 'email', 'gender', 'address'].forEach(id => {
    document.getElementById('err-' + id).textContent = '';
    document.getElementById(id).classList.remove('invalid');
  });
}

// Live validation on blur
['name', 'number', 'email', 'gender', 'address'].forEach(id => {
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
  ['name', 'number', 'email', 'address', 'searchInput'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('gender').value = '';
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

// ── Grid ──
function renderGrid() {
  const db = API._all();
  const records = Object.values(db);
  const container = document.getElementById('gridContainer');
  const tbody = document.getElementById('recordsBody');

  if (records.length === 0) {
    container.style.display = 'none';
    return;
  }

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
      <td><button class="btn-load" onclick="loadRow('${r.number}')">Load</button></td>
    </tr>
  `).join('');
}

function loadRow(number) {
  const res = API.get(number);
  if (res.ok) {
    populateForm(res.data);
    showMsg('Record loaded. You can edit or delete.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ── CRUD ──
function submitRecord() {
  if (!validateAll()) return;
  const data = getFormData();
  const res = API.post(data);
  showMsg(res.msg, !res.ok);
  if (res.ok) { clearForm(); renderGrid(); }
}

function editRecord() {
  const id = document.getElementById('recordId').value || document.getElementById('number').value.trim();
  if (!id) return showMsg('Search or load a record first to edit.', true);
  if (!validateAll()) return;
  const data = getFormData();
  const res = API.put(id, data);
  showMsg(res.msg, !res.ok);
  if (res.ok) renderGrid();
}

function deleteRecord() {
  const id = document.getElementById('recordId').value || document.getElementById('number').value.trim();
  if (!id) return showMsg('Enter or load a record to delete.', true);
  const res = API.delete(id);
  showMsg(res.msg, !res.ok);
  if (res.ok) { clearForm(); renderGrid(); }
}

function searchRecord() {
  const number = document.getElementById('searchInput').value.trim();
  if (!number) return showMsg('Enter a number to search.', true);
  const res = API.get(number);
  if (res.ok) { populateForm(res.data); showMsg('Record found.'); }
  else showMsg(res.msg, true);
}

// ── File upload ──
document.getElementById('fileInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);
  document.getElementById('docInfo').textContent = `${file.name} (${sizeMB} MB)`;
  document.getElementById('docPreview').style.display = 'flex';
});

function removeDoc() {
  document.getElementById('fileInput').value = '';
  document.getElementById('docPreview').style.display = 'none';
  document.getElementById('fileName').textContent = '📄 Upload Document';
}

// Load grid on page load
renderGrid();
