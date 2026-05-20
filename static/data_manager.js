let allParts = [];
let sortCol = null;
let sortDir = 1;
let filters = {};

const VISIBLE_COLS = [
  {key:'part_number', label:'Part #'},
  {key:'description', label:'Description'},
  {key:'product', label:'Product'},
  {key:'process', label:'Process'},
  {key:'material_family', label:'Material Family'},
  {key:'material', label:'Material'},
  {key:'complexity', label:'Cx'},
  {key:'coo', label:'COO'},
  {key:'volume_cm3', label:'Vol (cm3)'},
  {key:'price_hv', label:'Price HV ($)'},
  {key:'tool_price', label:'Tool ($)'},
  {key:'supplier', label:'Supplier'},
  {key:'finish', label:'Finish'}
];

const FILTER_COLS = ['part_number','description','product','process','material_family','material','complexity','coo','supplier','finish'];

const PRODUCT_OPTIONS = ['R3', 'R2 INV', 'R2 CAB', 'R2 SDS', 'G1 ACSC', 'G1 MI', 'GB1800'];

function showMsg(text, type) {
  var el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg ' + type;
  setTimeout(function() { el.style.display = 'none'; }, 5000);
}

async function loadData() {
  var res = await fetch('/api/parts');
  var json = await res.json();
  allParts = json.parts || [];
  renderHeader();
  renderTable();
}

function renderHeader() {
  var tr = document.getElementById('headerRow');
  tr.innerHTML = '';
  VISIBLE_COLS.forEach(function(col) {
    var th = document.createElement('th');
    th.textContent = col.label;
    th.onclick = function() { sortBy(col.key); };
    if (sortCol === col.key) {
      th.innerHTML += '<span class="sort-arrow">' + (sortDir === 1 ? '▲' : '▼') + '</span>';
    }
    tr.appendChild(th);
  });
  if (IS_ADMIN) {
    var th = document.createElement('th');
    th.textContent = '';
    tr.appendChild(th);
  }
  renderFilterRow();
}

function renderFilterRow() {
  var fr = document.getElementById('filterRow');
  if (!fr) {
    fr = document.createElement('tr');
    fr.id = 'filterRow';
    document.getElementById('headerRow').parentNode.appendChild(fr);
  }
  fr.innerHTML = '';
  VISIBLE_COLS.forEach(function(col) {
    var td = document.createElement('th');
    td.className = 'filter-cell';
    if (FILTER_COLS.includes(col.key)) {
      var vals;
      if (col.key === 'product') {
        vals = PRODUCT_OPTIONS;
      } else {
        vals = [];
        var seen = {};
        allParts.forEach(function(p) {
          var v = String(p[col.key] || '').trim();
          if (v && !seen[v]) { seen[v] = true; vals.push(v); }
        });
        vals.sort();
      }
      var wrapper = document.createElement('div');
      wrapper.className = 'filter-wrap';
      var btn = document.createElement('button');
      btn.className = 'filter-btn';
      var active = filters[col.key] && filters[col.key].length > 0;
      btn.textContent = active ? filters[col.key].length + ' selected' : 'All';
      if (active) btn.classList.add('active');
      var dropdown = document.createElement('div');
      dropdown.className = 'filter-dropdown';
      dropdown.style.display = 'none';
      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'filter-search';
      searchInput.placeholder = 'Search...';
      searchInput.onclick = function(e) { e.stopPropagation(); };
      searchInput.oninput = function() {
        var term = searchInput.value.toLowerCase();
        var options = dropdown.querySelectorAll('.filter-option');
        options.forEach(function(opt) {
          var text = opt.textContent.toLowerCase();
          opt.style.display = text.includes(term) ? '' : 'none';
        });
      };
      dropdown.appendChild(searchInput);
      var clearBtn = document.createElement('div');
      clearBtn.className = 'filter-clear';
      clearBtn.textContent = 'Clear all';
      clearBtn.onclick = function(e) { e.stopPropagation(); delete filters[col.key]; renderHeader(); renderTable(); };
      dropdown.appendChild(clearBtn);
      vals.forEach(function(v) {
        var lbl = document.createElement('label');
        lbl.className = 'filter-option';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = v;
        if (filters[col.key] && filters[col.key].includes(v)) cb.checked = true;
        cb.onchange = function() {
          if (!filters[col.key]) filters[col.key] = [];
          if (cb.checked) { filters[col.key].push(v); }
          else { filters[col.key] = filters[col.key].filter(function(x) { return x !== v; }); if (filters[col.key].length === 0) delete filters[col.key]; }
          var active2 = filters[col.key] && filters[col.key].length > 0;
          btn.textContent = active2 ? filters[col.key].length + ' selected' : 'All';
          if (active2) btn.classList.add('active'); else btn.classList.remove('active');
          renderTable();
        };
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode(' ' + v));
        dropdown.appendChild(lbl);
      });
      btn.onclick = function(e) {
        e.stopPropagation();
        document.querySelectorAll('.filter-dropdown').forEach(function(d) { if (d !== dropdown) d.style.display = 'none'; });
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        if (dropdown.style.display === 'block') {
          searchInput.value = '';
          searchInput.focus();
          dropdown.querySelectorAll('.filter-option').forEach(function(opt) { opt.style.display = ''; });
        }
      };
      wrapper.appendChild(btn);
      wrapper.appendChild(dropdown);
      td.appendChild(wrapper);
    }
    fr.appendChild(td);
  });
  if (IS_ADMIN) { fr.appendChild(document.createElement('th')); }
}

document.addEventListener('click', function() {
  document.querySelectorAll('.filter-dropdown').forEach(function(d) { d.style.display = 'none'; });
});

function renderTable() {
  var search = (document.getElementById('searchBox').value || '').toLowerCase();
  var rows = allParts;
  if (search) {
    rows = rows.filter(function(p) { return VISIBLE_COLS.some(function(c) { return String(p[c.key] || '').toLowerCase().includes(search); }); });
  }
  Object.keys(filters).forEach(function(key) {
    if (key === 'product') {
      rows = rows.filter(function(p) {
        var prodVal = String(p.product || '').toUpperCase();
        return filters.product.some(function(sel) { return prodVal.indexOf(sel.toUpperCase()) !== -1; });
      });
    } else {
      rows = rows.filter(function(p) { return filters[key].includes(String(p[key] || '')); });
    }
  });
  if (sortCol) {
    rows = rows.slice().sort(function(a, b) {
      var va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sortDir;
      return String(va || '').localeCompare(String(vb || '')) * sortDir;
    });
  }
  var tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  rows.forEach(function(p) {
    var tr = document.createElement('tr');
    VISIBLE_COLS.forEach(function(col) {
      var td = document.createElement('td');
      var val = p[col.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'number' && col.key.includes('price')) val = val.toFixed(2);
      else if (typeof val === 'number' && col.key === 'volume_cm3') val = val.toFixed(2);
      td.textContent = val;
      if (IS_ADMIN) {
        td.className = 'editable';
        td.ondblclick = function() { startEdit(td, p, col.key); };
      }
      tr.appendChild(td);
    });
    if (IS_ADMIN) {
      var td = document.createElement('td');
      var btn = document.createElement('button');
      btn.className = 'del-btn';
      btn.textContent = '✕';
      btn.title = 'Delete';
      btn.onclick = function() { deletePart(p.id); };
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
  var oldVal = part[key] || '';
  var input = document.createElement('input');
  input.value = oldVal;
  input.onblur = function() { finishEdit(td, part, key, input.value); };
  input.onkeydown = function(e) { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { td.textContent = oldVal; } };
  td.textContent = '';
  td.appendChild(input);
  input.focus();
}

async function finishEdit(td, part, key, newVal) {
  var numFields = ['complexity', 'volume_cm3', 'price_hv', 'tool_price', 'tool_lt', 'thickness_mm', 'envelope_x_mm', 'envelope_y_mm', 'envelope_z_mm', 'production_lt'];
  if (numFields.includes(key)) newVal = parseFloat(newVal) || 0;
  if (newVal === part[key]) { td.textContent = part[key] || ''; return; }
  part[key] = newVal;
  var res = await fetch('/api/parts/' + part.id, {
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
  var res = await fetch('/api/parts/' + id, {method: 'DELETE'});
  if (res.ok) {
    allParts = allParts.filter(function(p) { return p.id !== id; });
    renderTable();
    showMsg('Deleted', 'success');
  } else {
    showMsg('Error deleting', 'error');
  }
}

async function addComponent() {
  var data = {
    part_number: document.getElementById('add_pn').value.trim(),
    description: document.getElementById('add_desc').value.trim(),
    product: document.getElementById('add_product').value.trim(),
    process: document.getElementById('add_proc').value,
    material_family: document.getElementById('add_matfam').value,
    material: document.getElementById('add_mat').value.trim(),
    complexity: parseInt(document.getElementById('add_cx').value) || 0,
    coo: document.getElementById('add_coo').value,
    volume_cm3: parseFloat(document.getElementById('add_vol').value) || 0,
    price_hv: parseFloat(document.getElementById('add_price').value) || 0,
    tool_price: parseFloat(document.getElementById('add_tool').value) || 0,
    tool_lt: parseFloat(document.getElementById('add_toollt').value) || 0,
    supplier: document.getElementById('add_supplier').value.trim(),
    revision: document.getElementById('add_rev').value.trim(),
    finish: document.getElementById('add_finish').value.trim(),
    thickness_mm: parseFloat(document.getElementById('add_thk').value) || 0,
    envelope_x_mm: parseFloat(document.getElementById('add_x').value) || 0,
    envelope_y_mm: parseFloat(document.getElementById('add_y').value) || 0,
    envelope_z_mm: parseFloat(document.getElementById('add_z').value) || 0,
    production_lt: parseFloat(document.getElementById('add_prodlt').value) || 0
  };
  if (!data.process || !data.material_family || !data.coo || !data.complexity || !data.volume_cm3) {
    showMsg('Fill all required fields (Process, Material Family, COO, Complexity, Volume)', 'error');
    return;
  }
  var res = await fetch('/api/parts', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  if (res.ok) {
    showMsg('Component added', 'success');
    document.querySelectorAll('.card:first-of-type input, .card:first-of-type select').forEach(function(el) {
      if (el.type === 'text' || el.type === 'number') el.value = '';
      else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    });
    loadData();
  } else {
    showMsg('Error adding component', 'error');
  }
}

async function importExcel(input) {
  var file = input.files[0];
  if (!file) return;
  var formData = new FormData();
  formData.append('file', file);
  showMsg('Importing...', 'success');
  var res = await fetch('/api/parts/import', {method: 'POST', body: formData});
  var json = await res.json();
  if (res.ok) {
    showMsg('Imported ' + json.imported + ' parts', 'success');
    loadData();
  } else {
    showMsg('Import error: ' + (json.error || 'Unknown'), 'error');
  }
  input.value = '';
}
