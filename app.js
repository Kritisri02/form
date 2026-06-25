const API_URL = 'https://script.google.com/macros/s/AKfycbwrQlgjiX81t0b2H4xveWyk6427iGAieDaRWHNWD2wqVFhvCjDF60taUOmxX5hrAmR5/exec';
const CLOUDINARY_CLOUD = 'dx2qynbwt';
const CLOUDINARY_PRESET = 'kritikaa';

// ── Cloudinary File Upload ──
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('resource_type', 'raw');

  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  return { fileName: file.name, fileUrl: data.secure_url || '' };
}

// ── API ──
async function apiCall(data) {
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
  return res.json();
}

async function apiGet() {
  const res = await fetch(API_URL);
  return res.json();
}

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
function getFields() {
  return {
    name:    document.getElementById('name').value.trim(),
    number:  document.getElementById('number').value.trim(),
    email:   document.getElementById('email').value.trim(),
    gender:  document.getElementById('gender').value,
    address: document.getElementById('address').value.trim()
  };
}

function populateForm(data) {
  document.getElementById('name').value     = data.name;
  document.getElementById('number').value   = data.number;
  document.getElementById('email').value    = data.email;
  document.getElementById('gender').value   = data.gender;
  document.getElementById('address').value  = data.address;
  document.getElementById('recordId').value = data.number;

  if (data.fileUrl && data.fileName) {
    document.getElementById('fileName').textContent     = '📄 ' + data.fileName;
    document.getElementById('docInfo').textContent      = data.fileName;
    document.getElementById('docPreview').style.display = 'flex';
    document.getElementById('docPreview').dataset.url   = data.fileUrl;
  } else {
    document.getElementById('fileName').textContent     = '📄 Upload Document';
    document.getElementById('docPreview').style.display = 'none';
  }
  clearErrors();
}

function clearForm() {
  ['name','number','email','address','searchInput'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('gender').value              = '';
  document.getElementById('recordId').value            = '';
  document.getElementById('fileName').textContent      = '📄 Upload Document';
  document.getElementById('docPreview').style.display  = 'none';
  document.getElementById('docPreview').dataset.url    = '';
  document.getElementById('fileInput').value           = '';
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
    if (!Array.isArray(records) || !records.length) { container.style.display = 'none'; return; }

    container.style.display = 'block';
    tbody.innerHTML = records.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.name}</td>
        <td>${r.number}</td>
        <td>${r.email}</td>
        <td>${r.gender}</td>
        <td title="${r.address}">${r.address}</td>
        <td>${r.fileUrl ? `<a href="https://docs.google.com/viewer?url=${encodeURIComponent(r.fileUrl)}" target="_blank">📄 ${r.fileName}</a>` : (r.fileName || '-')}</td>
        <td><button class="btn-load" data-num="${r.number}">Load</button></td>
      </tr>`).join('');
  } catch(e) { console.error(e); }
}

document.getElementById('recordsBody').addEventListener('click', async e => {
  if (e.target.classList.contains('btn-load')) {
    const res = await apiCall({ action: 'search', number: e.target.dataset.num });
    if (!res.error) { populateForm(res.data); showMsg('Record loaded.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }
});

// ── CRUD ──
async function submitRecord() {
  if (!validateAll()) return;
  setLoading(true);

  const fileInput = document.getElementById('fileInput');
  const file      = fileInput.files[0];
  let fileName = '', fileUrl = '';

  if (file) {
    showMsg('Uploading file...');
    const uploaded = await uploadFile(file);
    fileName = uploaded.fileName;
    fileUrl  = uploaded.fileUrl;
  }

  showMsg('Saving...');
  const res = await apiCall({ action: 'insert', ...getFields(), fileName, fileUrl });
  setLoading(false);
  showMsg(res.msg, res.error);
  if (!res.error) { clearForm(); renderGrid(); }
}

async function editRecord() {
  const id = document.getElementById('recordId').value;
  if (!id) return showMsg('Load a record first to edit.', true);
  if (!validateAll()) return;
  setLoading(true);

  const fileInput = document.getElementById('fileInput');
  const file      = fileInput.files[0];
  let fileName = '', fileUrl = '';

  if (file) {
    showMsg('Uploading file...');
    const uploaded = await uploadFile(file);
    fileName = uploaded.fileName;
    fileUrl  = uploaded.fileUrl;
  }

  showMsg('Updating...');
  const res = await apiCall({ action: 'update', ...getFields(), fileName, fileUrl });
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

document.getElementById('docPreview').addEventListener('click', e => {
  if (e.target.id === 'removeDocBtn') return;
  const url = document.getElementById('docPreview').dataset.url;
  if (url) window.open('https://docs.google.com/viewer?url=' + encodeURIComponent(url), '_blank');
});

document.getElementById('removeDocBtn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('fileInput').value           = '';
  document.getElementById('docPreview').style.display  = 'none';
  document.getElementById('docPreview').dataset.url    = '';
  document.getElementById('fileName').textContent      = '📄 Upload Document';
});

document.getElementById('fileInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  document.getElementById('docInfo').textContent      = `${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
  document.getElementById('docPreview').style.display = 'flex';
  document.getElementById('docPreview').dataset.url   = '';
});

// ── Init ──
renderGrid();
