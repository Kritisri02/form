// Mock REST API using localStorage as the backend
const API = {
  _key: 'personalRecords',

  _all() {
    return JSON.parse(localStorage.getItem(this._key) || '{}');
  },

  _save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  // POST /records
  post(record) {
    const db = this._all();
    if (db[record.number]) return { ok: false, msg: 'Number already exists.' };
    db[record.number] = { ...record, id: record.number };
    this._save(db);
    return { ok: true, msg: 'Record created successfully.' };
  },

  // GET /records/:number
  get(number) {
    const db = this._all();
    return db[number] ? { ok: true, data: db[number] } : { ok: false, msg: 'Record not found.' };
  },

  // PUT /records/:number
  put(number, record) {
    const db = this._all();
    if (!db[number]) return { ok: false, msg: 'Record not found. Submit first.' };
    db[number] = { ...db[number], ...record };
    this._save(db);
    return { ok: true, msg: 'Record updated successfully.' };
  },

  // DELETE /records/:number
  delete(number) {
    const db = this._all();
    if (!db[number]) return { ok: false, msg: 'Record not found.' };
    delete db[number];
    this._save(db);
    return { ok: true, msg: 'Record deleted successfully.' };
  }
};

// Helpers
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
  document.getElementById('fileName').textContent = data.file || 'File Uploader (Demo)';
  document.getElementById('recordId').value = data.number;
}

function clearForm() {
  ['name','number','email','address','searchInput'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('gender').value = '';
  document.getElementById('fileName').textContent = 'File Uploader (Demo)';
  document.getElementById('recordId').value = '';
}

function showMsg(msg, isError = false) {
  const el = document.getElementById('message');
  el.textContent = msg;
  el.style.color = isError ? '#f08080' : '#a0e0a0';
}

function validate(data) {
  if (!data.name)   return 'Name is required.';
  if (!data.number) return 'Number is required.';
  if (!data.email)  return 'Email is required.';
  if (!data.gender) return 'Gender is required.';
  return null;
}

// CRUD Operations
function submitRecord() {
  const data = getFormData();
  const err = validate(data);
  if (err) return showMsg(err, true);

  const res = API.post(data);
  showMsg(res.msg, !res.ok);
  if (res.ok) clearForm();
}

function editRecord() {
  const id = document.getElementById('recordId').value || document.getElementById('number').value.trim();
  if (!id) return showMsg('Search a record first to edit.', true);

  const data = getFormData();
  const err = validate(data);
  if (err) return showMsg(err, true);

  const res = API.put(id, data);
  showMsg(res.msg, !res.ok);
}

function deleteRecord() {
  const id = document.getElementById('recordId').value || document.getElementById('number').value.trim();
  if (!id) return showMsg('Enter or search a number to delete.', true);

  const res = API.delete(id);
  showMsg(res.msg, !res.ok);
  if (res.ok) clearForm();
}

function searchRecord() {
  const number = document.getElementById('searchInput').value.trim();
  if (!number) return showMsg('Enter a number to search.', true);

  const res = API.get(number);
  if (res.ok) {
    populateForm(res.data);
    showMsg('Record found.');
  } else {
    showMsg(res.msg, true);
  }
}

// File name display
document.getElementById('fileInput').addEventListener('change', function () {
  document.getElementById('fileName').textContent = this.files[0]?.name || 'File Uploader (Demo)';
});
