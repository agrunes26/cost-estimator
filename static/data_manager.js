let allParts = [];
let sortCol = null;
let sortDir = 1;
const COLS = [
  {key:'part_number', label:'Part #'},
  {key:'description', label:'Description'},
  {key:'process', label:'Process'},
  {key:'material_family', label:'Material'},
  {key:'material', label:'Material (specific)'},
  {key:'complexity', label:'Cx'},
  {key:'coo', label:'COO'},
  {key:'volume_cm3', label:'Vol (cm3)'},
  {key:'price_hv', label:'Price HV ($)'},
  {key:'tool_price', label:'Tool Price ($)'},
  {key:'tool_lt', label:'Tool LT'},
  {key:'supplier', label:'Supplier'}
];

function showMsg(text, type) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg ' + type;
  setTimeout(() => el.style.display = 'none', 5000);
}

async function loadData() {
  const res = await fetch('/api/parts');
  const json = await res.json();
  allParts = json.parts || [];
  renderHeader();
  renderTable();
}

function renderHeader() {
  const tr = document.getElementById('headerRow');
  tr.innerHTML = '';
  COLS.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    th.onclick = () => sortBy(col.key);
    if (sortCol === col.key) {
      th.innerHTML += '<span class="sort-arrow">' + (sortDir === 1 ? '▲' : '▼') + '</span>';
    }
    tr.appendChild(th);
  });
  if (IS_ADMIN) {
    const th = document.createElement('th');
    th.textContent = '';
    tr.appendChild(th);
  }
}

function renderTable() {
  const search = (document.getElementById('searchBox').value || '').toLowerCase();
  let rows = allParts;
  if (search) {
    rows = rows.filter(p => COLS.some(c => String(p[c.key] || '').toLowerCase().includes(search)));
  }
  if (sortCol) {
    rows = [...rows].sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sortDir;
      return String(va || '').localeCompare(String(vb || '')) * sortDir;
    });
  }
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  rows.forEach(p => {
    const tr = document.createElement('tr');
    COLS.forEach(col => {
      const td = document.createElement('td');
      let val = p[col.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'number' && col.key.includes('price')) val = val.toFixed(2);
      else if (typeof val === 'number' && col.key === 'volume_cm3') val = val.toFixed(2);
      td.textContent = val;
      if (IS_ADMIN) {
        td.className = 'editable';
        td.ondblclick = () => startEdit(td, p, col.key);
      }
      tr.appendChild(td);
    });
    if (IS_ADMIN) {
      const td = document.createElement('td');
      const btn = document.createElement('button');
      btn.className = 'del-btn';
      btn.textContent = '✕';
      btn.title = 'Delete';
      btn.onclick = () => deletePart(p.id);
      td.appendChild(btn);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  document.getElementById('rowCount').textContent = rows.length + ' of ' + allParts.length + ' rows';
}

function sortBy(col) {
  if (sortCol === col) sortDir *= -1;
  else { sortCol = col; sortDir = 1; }
  renderHeader();
  renderTable();
}

function filterTable() { renderTable(); }

function startEdit(td, part, key) {
  if (td.querySelector('input')) return;
  const oldVal = part[key] || '';
  const input = document.createElement('input');
  input.value = oldVal;
  input.onblur = () => finishEdit(td, part, key, input.value);
  input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { td.textContent = oldVal; } };
  td.textContent = '';
  td.appendChild(input);
  input.focus();
}

async function finishEdit(td, part, key, newVal) {
  const numFields = ['complexity', 'volume_cm3', 'price_hv', 'tool_price', 'tool_lt'];
  if (numFields.includes(key)) newVal = parseFloat(newVal) || 0;
  if (newVal === part[key]) { td.textContent = part[key] || ''; return; }
  part[key] = newVal;
  const res = await fetch('/api/parts/' + part.id, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(part)
  });
  if (res.ok) {
    td.textContent = newVal;
    showMsg('Updated', 'success');
  } else {
    showMsg('Error updating', 'error');
  }
}

async function deletePart(id) {
  if (!confirm('Delete this part permanently?')) return;
  const res = await fetch('/api/parts/' + id, {method: 'DELETE'});
  if (res.ok) {
    allParts = allParts.filter(p => p.id !== id);
    renderTable();
    showMsg('Deleted', 'success');
  } else {
    showMsg('Error deleting', 'error');
  }
}

async function addComponent() {
  const data = {
    part_number: document.getElementById('add_pn').value.trim(),
    description: document.getElementById('add_desc').value.trim(),
    process: document.getElementById('add_proc').value,
    material_family: document.getElementById('add_matfam').value,
    material: document.getElementById('add_mat').value.trim(),
    complexity: parseInt(document.getElementById('add_cx').value) || 0,
    coo: document.getElementById('add_coo').value,
    volume_cm3: parseFloat(document.getElementById('add_vol').value) || 0,
    price_hv: parseFloat(document.getElementById('add_price').value) || 0,
    tool_price: parseFloat(document.getElementById('add_tool').value) || 0,
    tool_lt: parseFloat(document.getElementById('add_toollt').value) || 0,
    supplier: document.getElementById('add_supplier').value.trim()
  };
  if (!data.process || !data.material_family || !data.coo || !data.complexity || !data.volume_cm3) {
    showMsg('Fill all required fields (Process, Material Family, COO, Complexity, Volume)', 'error');
    return;
  }
  const res = await fetch('/api/parts', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  if (res.ok) {
    showMsg('Component added', 'success');
    document.querySelectorAll('.card:first-of-type input, .card:first-of-type select').forEach(el => {
      if (el.type === 'text' || el.type === 'number') el.value = '';
      else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    });
    loadData();
  } else {
    showMsg('Error adding component', 'error');
  }
}

async function importExcel(input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  showMsg('Importing...', 'success');
  const res = await fetch('/api/parts/import', {method: 'POST', body: formData});
  const json = await res.json();
  if (res.ok) {
    showMsg('Imported ' + json.imported + ' parts', 'success');
    loadData();
  } else {
    showMsg('Import error: ' + (json.error || 'Unknown'), 'error');
  }
  input.value = '';
}
