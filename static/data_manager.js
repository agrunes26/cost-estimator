let allParts = [];
let sortCol = null;
let sortDir = 1;
let filters = {};
let modelParams = null;

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

const DEF_COO = {CN:{labor:0.58,overhead:0.65},MX:{labor:0.72,overhead:0.78},US:{labor:1.0,overhead:1.0},IN:{labor:0.38,overhead:0.52},TW:{labor:0.68,overhead:0.75},KR:{labor:0.80,overhead:0.82},DE:{labor:1.15,overhead:1.12},ML:{labor:0.55,overhead:0.60}};
const DEF_PROC = {'Sheet Metal':{machineRate:85,cycleBase:0.8,timeExp:0.38,toolBase:8000,toolExp:0.55},'Injection Molding':{machineRate:65,cycleBase:0.5,timeExp:0.30,toolBase:3500,toolExp:0.60},'Die Cast':{machineRate:110,cycleBase:1.2,timeExp:0.35,toolBase:25000,toolExp:0.70},'Extrusion':{machineRate:70,cycleBase:0.6,timeExp:0.42,toolBase:9000,toolExp:0.45},'Stamping':{machineRate:75,cycleBase:0.3,timeExp:0.28,toolBase:20000,toolExp:0.65},'PCBA':{machineRate:95,cycleBase:2.0,timeExp:0.25,toolBase:0,toolExp:0},'Die Cut':{machineRate:40,cycleBase:0.2,timeExp:0.20,toolBase:500,toolExp:0.25},'Bus Bar':{machineRate:55,cycleBase:0.4,timeExp:0.32,toolBase:1500,toolExp:0.35},'Saw Cut':{machineRate:60,cycleBase:0.5,timeExp:0.22,toolBase:1000,toolExp:0.20},'Thermoform':{machineRate:55,cycleBase:0.6,timeExp:0.30,toolBase:10000,toolExp:0.55},'Dispensed':{machineRate:35,cycleBase:0.3,timeExp:0.45,toolBase:0,toolExp:0},'Fastener':{machineRate:30,cycleBase:0.05,timeExp:0.15,toolBase:1200,toolExp:0.30},'Label':{machineRate:25,cycleBase:0.05,timeExp:0.10,toolBase:200,toolExp:0.05},'Sub-Assy':{machineRate:50,cycleBase:0.8,timeExp:0.20,toolBase:1000,toolExp:0.30},'Antenna':{machineRate:60,cycleBase:1.0,timeExp:0.28,toolBase:2000,toolExp:0.40},'Pallet':{machineRate:40,cycleBase:1.5,timeExp:0.35,toolBase:0,toolExp:0},'Packaging':{machineRate:30,cycleBase:1.0,timeExp:0.30,toolBase:0,toolExp:0}};
const DEF_MAT = {'Steel':{density:7.85,matPrice:1.20,scrap:1.15},'Aluminum':{density:2.70,matPrice:2.50,scrap:1.12},'Stainless Steel':{density:8.00,matPrice:3.80,scrap:1.18},'Nickel':{density:8.90,matPrice:18.0,scrap:1.20},'PC':{density:1.20,matPrice:3.20,scrap:1.08},'PP':{density:0.91,matPrice:1.60,scrap:1.08},'PBT':{density:1.31,matPrice:4.50,scrap:1.10},'Ultem':{density:1.27,matPrice:28.0,scrap:1.10},'PCB':{density:1.85,matPrice:12.0,scrap:1.20},'Aluminum Nitride':{density:3.26,matPrice:80.0,scrap:1.30},'Rubber':{density:1.15,matPrice:2.80,scrap:1.10},'Formex':{density:1.35,matPrice:8.0,scrap:1.12},'TIM':{density:2.50,matPrice:45.0,scrap:1.05},'EMI':{density:0.80,matPrice:15.0,scrap:1.10},'Insulator':{density:0.15,matPrice:60.0,scrap:1.15},'Cardboard':{density:0.55,matPrice:0.80,scrap:1.05},'Label Stock':{density:0.90,matPrice:4.0,scrap:1.05},'Lumber':{density:0.55,matPrice:0.60,scrap:1.10},'Potting':{density:1.10,matPrice:12.0,scrap:1.05},'RTV':{density:1.05,matPrice:18.0,scrap:1.05}};

let cooP, procP, matP;

function initParams() {
  cooP = JSON.parse(JSON.stringify(DEF_COO));
  procP = JSON.parse(JSON.stringify(DEF_PROC));
  matP = JSON.parse(JSON.stringify(DEF_MAT));
}
initParams();

function getSC(vol, proc, matFam, cx, coo) {
  var cp = cooP[coo] || cooP['US'];
  var pp = procP[proc] || {machineRate:60, cycleBase:0.5, timeExp:0.30};
  var mp = matP[matFam] || {density:2.0, matPrice:5.0, scrap:1.10};
  var matCost = vol * (mp.density / 1000) * mp.matPrice * mp.scrap;
  var cxM = 1 + Math.max(0, (cx - 1)) * 0.25;
  var cycleMin = pp.cycleBase * Math.pow(Math.max(vol, 0.001), pp.timeExp) * cxM;
  var procCost = (pp.machineRate / 60) * cycleMin * cp.labor;
  var oh = (matCost + procCost) * cp.overhead * 0.20;
  return matCost + procCost + oh;
}

function getToolSC(vol, proc, cx, coo) {
  var cp = cooP[coo] || cooP['US'];
  var pp = procP[proc] || {toolBase:2000, toolExp:0.40};
  var tb = pp.toolBase || 0;
  if (!tb) return null;
  var cxM = 1 + Math.max(0, (cx - 1)) * 0.35;
  var base = tb * Math.pow(Math.max(vol, 0.001), pp.toolExp) * cxM;
  return base * cp.labor * 0.7 + base * 0.3;
}

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
  var pRes = await fetch('/api/params');
  var pJson = await pRes.json();
  if (pJson.params) {
    if (pJson.params.coo) cooP = pJson.params.coo;
    if (pJson.params.proc) procP = pJson.params.proc;
    if (pJson.params.mat) matP = pJson.params.mat;
  }
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

document.addEventListener('click', function(e) {
  if (!e.target.closest('.filter-wrap')) {
    document.querySelectorAll('.filter-dropdown').forEach(function(d) { d.style.display = 'none'; });
  }
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
    tr.style.cursor = 'pointer';
    tr.onclick = function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      openSidePanel(p);
    };
    VISIBLE_COLS.forEach(function(col) {
      var td = document.createElement('td');
      var val = p[col.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'number' && col.key.includes('price')) val = val.toFixed(2);
      else if (typeof val === 'number' && col.key === 'volume_cm3') val = val.toFixed(2);
      td.textContent = val;
      if (IS_ADMIN) {
        td.className = 'editable';
        td.ondblclick = function(e) { e.stopPropagation(); startEdit(td, p, col.key); };
      }
      tr.appendChild(td);
    });
    if (IS_ADMIN) {
      var td = document.createElement('td');
      var btn = document.createElement('button');
      btn.className = 'del-btn';
      btn.textContent = '✕';
      btn.title = 'Delete';
      btn.onclick = function(e) { e.stopPropagation(); deletePart(p.id); };
      td.appendChild(btn);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  document.getElementById('rowCount').textContent = rows.length + ' of ' + allParts.length + ' rows';
}

function openSidePanel(part) {
  var panel = document.getElementById('sidePanel');
  var content = document.getElementById('sidePanelContent');
  var duplicates = findDuplicates(part);
  var sc = null;
  var toolSc = null;
  if (part.volume_cm3 > 0 && part.process && part.material_family && part.complexity && part.coo) {
    sc = getSC(part.volume_cm3, part.process, part.material_family, part.complexity, part.coo);
  }
  if (part.volume_cm3 > 0 && part.process && part.complexity && part.coo) {
    toolSc = getToolSC(part.volume_cm3, part.process, part.complexity, part.coo);
  }

  var html = '<div class="sp-header">';
  html += '<h3>' + (part.description || 'Unnamed Part') + '</h3>';
  html += '<button class="sp-close" onclick="closeSidePanel()">✕</button>';
  html += '</div>';

  html += '<div class="sp-section">';
  html += '<h4>Part Details</h4>';
  html += '<div class="sp-grid">';
  html += spField('Part #', part.part_number);
  html += spField('Description', part.description);
  html += spField('Product', part.product);
  html += spField('Process', part.process);
  html += spField('Material Family', part.material_family);
  html += spField('Material', part.material);
  html += spField('Complexity', part.complexity);
  html += spField('COO', part.coo);
  html += spField('Volume (cm3)', fmt(part.volume_cm3));
  html += spField('Revision', part.revision);
  html += spField('Finish', part.finish);
  html += spField('Thickness (mm)', fmt(part.thickness_mm));
  html += spField('Envelope X (mm)', fmt(part.envelope_x_mm));
  html += spField('Envelope Y (mm)', fmt(part.envelope_y_mm));
  html += spField('Envelope Z (mm)', fmt(part.envelope_z_mm));
  html += spField('Production LT (wks)', fmt(part.production_lt));
  html += '</div></div>';

  html += '<div class="sp-section">';
  html += '<h4>Should-Cost Estimate</h4>';
  if (sc !== null && isFinite(sc) && sc > 0) {
    html += '<div class="sp-sc">';
    html += '<div class="sp-sc-row"><span class="sp-sc-label">Part Should-Cost:</span><span class="sp-sc-val">$' + sc.toFixed(2) + '</span></div>';
    if (part.price_hv > 0) {
      var diff = ((part.price_hv - sc) / sc * 100);
      var color = diff > 20 ? '#dc2626' : diff < -20 ? '#1D9E75' : '#1a1a18';
      html += '<div class="sp-sc-row"><span class="sp-sc-label">Actual HV Price:</span><span class="sp-sc-val">$' + part.price_hv.toFixed(2) + '</span></div>';
      html += '<div class="sp-sc-row"><span class="sp-sc-label">vs Should-Cost:</span><span class="sp-sc-val" style="color:' + color + '">' + (diff > 0 ? '+' : '') + diff.toFixed(1) + '%</span></div>';
    }
    if (toolSc !== null && isFinite(toolSc) && toolSc > 0) {
      html += '<div class="sp-sc-row"><span class="sp-sc-label">Tool Should-Cost:</span><span class="sp-sc-val">$' + toolSc.toFixed(0) + '</span></div>';
      if (part.tool_price > 0) {
        var tDiff = ((part.tool_price - toolSc) / toolSc * 100);
        var tColor = tDiff > 20 ? '#dc2626' : tDiff < -20 ? '#1D9E75' : '#1a1a18';
        html += '<div class="sp-sc-row"><span class="sp-sc-label">Actual Tool Price:</span><span class="sp-sc-val">$' + part.tool_price.toFixed(0) + '</span></div>';
        html += '<div class="sp-sc-row"><span class="sp-sc-label">vs Tool SC:</span><span class="sp-sc-val" style="color:' + tColor + '">' + (tDiff > 0 ? '+' : '') + tDiff.toFixed(1) + '%</span></div>';
      }
    }
    html += '</div>';
  } else {
    html += '<p class="sp-muted">Not enough data to calculate (needs volume, process, material family, complexity, COO)</p>';
  }
  html += '</div>';

  html += '<div class="sp-section">';
  html += '<h4>Supplier Quotes' + (duplicates.length > 1 ? ' (' + duplicates.length + ' quotes found)' : '') + '</h4>';
  if (duplicates.length > 1) {
    html += '<table class="sp-table"><thead><tr><th>Supplier</th><th>COO</th><th>Price HV</th><th>Tool $</th><th>Tool LT</th></tr></thead><tbody>';
    duplicates.forEach(function(d) {
      var isThis = d.id === part.id;
      html += '<tr' + (isThis ? ' style="background:#EDF5FF;font-weight:600"' : '') + '>';
      html += '<td>' + (d.supplier || '--') + '</td>';
      html += '<td>' + (d.coo || '--') + '</td>';
      html += '<td>' + (d.price_hv > 0 ? '$' + d.price_hv.toFixed(2) : '--') + '</td>';
      html += '<td>' + (d.tool_price > 0 ? '$' + d.tool_price.toFixed(0) : '--') + '</td>';
      html += '<td>' + (d.tool_lt > 0 ? d.tool_lt + ' wks' : '--') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<table class="sp-table"><thead><tr><th>Supplier</th><th>COO</th><th>Price HV</th><th>Tool $</th><th>Tool LT</th></tr></thead><tbody>';
    html += '<tr><td>' + (part.supplier || '--') + '</td><td>' + (part.coo || '--') + '</td><td>' + (part.price_hv > 0 ? '$' + part.price_hv.toFixed(2) : '--') + '</td><td>' + (part.tool_price > 0 ? '$' + part.tool_price.toFixed(0) : '--') + '</td><td>' + (part.tool_lt > 0 ? part.tool_lt + ' wks' : '--') + '</td></tr>';
    html += '</tbody></table>';
    html += '<p class="sp-muted">No additional quotes found for this part.</p>';
  }
  html += '</div>';

  content.innerHTML = html;
  panel.classList.add('open');
  document.getElementById('overlay').classList.add('open');
}

function closeSidePanel() {
  document.getElementById('sidePanel').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

function findDuplicates(part) {
  var pn = String(part.part_number || '').trim().toLowerCase();
  var desc = String(part.description || '').trim().toLowerCase();
  if (!pn && !desc) return [part];
  var matches = allParts.filter(function(p) {
    if (pn && String(p.part_number || '').trim().toLowerCase() === pn) return true;
    if (!pn && desc && String(p.description || '').trim().toLowerCase() === desc) return true;
    return false;
  });
  if (matches.length <= 1) return [part];
  return matches;
}

function spField(label, value) {
  var display = (value === null || value === undefined || value === '' || value === 0) ? '--' : value;
  return '<div class="sp-field"><span class="sp-field-label">' + label + '</span><span class="sp-field-value">' + display + '</span></div>';
}

function fmt(val) {
  if (val === null || val === undefined || val === 0) return '';
  if (typeof val === 'number') return val.toFixed(2);
  return val;
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
