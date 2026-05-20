



const PALETTE=['#378ADD','#1D9E75','#D85A30','#BA7517','#534AB7','#5F5E5A','#D4537E','#639922','#993C1D','#0F6E56','#993556','#E24B4A','#7F77DD','#888780','#0C447C','#3B6D11','#633806'];



const SC_COLOR='#534AB7',TOOL_COLOR='#E24B4A',SC_TOOL_COLOR='#0F6E56';



const SC_BAND='rgba(83,74,183,0.12)',TOOL_SC_BAND='rgba(15,110,86,0.12)';



const FILTER_KEYS=['process','material_family','complexity','coo','supplier'];



const FILTER_LABELS={process:'Process',material_family:'Material family',complexity:'Complexity',coo:'Country of origin',supplier:'Supplier'};







let chartInst=null,customPoints=[],bestFit=null,scFit=null,toolFit=null,scToolFit=null;



let activeSelections={process:[],material_family:[],complexity:[],coo:[],supplier:[]};



let panelOpen={myPart:false,table:false,sc:false};



let activeTab='part',sortCol=null,sortDir=1;







const DEF_COO={CN:{labor:0.58,overhead:0.65},MX:{labor:0.72,overhead:0.78},US:{labor:1.0,overhead:1.0},IN:{labor:0.38,overhead:0.52},TW:{labor:0.68,overhead:0.75},KR:{labor:0.80,overhead:0.82},DE:{labor:1.15,overhead:1.12},Germany:{labor:1.15,overhead:1.12},Unknown:{labor:0.75,overhead:0.80},ML:{labor:0.55,overhead:0.60}};



const DEF_PROC={'Sheet Metal':{machineRate:85,cycleBase:0.8,timeExp:0.38,toolBase:8000,toolExp:0.55},'Injection Molding':{machineRate:65,cycleBase:0.5,timeExp:0.30,toolBase:3500,toolExp:0.60},'Die Cast':{machineRate:110,cycleBase:1.2,timeExp:0.35,toolBase:25000,toolExp:0.70},'Extrusion':{machineRate:70,cycleBase:0.6,timeExp:0.42,toolBase:9000,toolExp:0.45},'Stamping':{machineRate:75,cycleBase:0.3,timeExp:0.28,toolBase:20000,toolExp:0.65},'PCBA':{machineRate:95,cycleBase:2.0,timeExp:0.25,toolBase:0,toolExp:0},'Die Cut':{machineRate:40,cycleBase:0.2,timeExp:0.20,toolBase:500,toolExp:0.25},'Bus Bar':{machineRate:55,cycleBase:0.4,timeExp:0.32,toolBase:1500,toolExp:0.35},'Saw Cut':{machineRate:60,cycleBase:0.5,timeExp:0.22,toolBase:1000,toolExp:0.20},'Thermoform':{machineRate:55,cycleBase:0.6,timeExp:0.30,toolBase:10000,toolExp:0.55},'Dispensed':{machineRate:35,cycleBase:0.3,timeExp:0.45,toolBase:0,toolExp:0},'Fastener':{machineRate:30,cycleBase:0.05,timeExp:0.15,toolBase:1200,toolExp:0.30},'Label':{machineRate:25,cycleBase:0.05,timeExp:0.10,toolBase:200,toolExp:0.05},'Sub-Assy':{machineRate:50,cycleBase:0.8,timeExp:0.20,toolBase:1000,toolExp:0.30},'Antenna':{machineRate:60,cycleBase:1.0,timeExp:0.28,toolBase:2000,toolExp:0.40},'Pallet':{machineRate:40,cycleBase:1.5,timeExp:0.35,toolBase:0,toolExp:0},'Packaging':{machineRate:30,cycleBase:1.0,timeExp:0.30,toolBase:0,toolExp:0}};



const DEF_MAT={'Steel':{density:7.85,matPrice:1.20,scrap:1.15},'Aluminum':{density:2.70,matPrice:2.50,scrap:1.12},'Stainless Steel':{density:8.00,matPrice:3.80,scrap:1.18},'Nickel':{density:8.90,matPrice:18.0,scrap:1.20},'PC':{density:1.20,matPrice:3.20,scrap:1.08},'PP':{density:0.91,matPrice:1.60,scrap:1.08},'PBT':{density:1.31,matPrice:4.50,scrap:1.10},'Ultem':{density:1.27,matPrice:28.0,scrap:1.10},'PCB':{density:1.85,matPrice:12.0,scrap:1.20},'Aluminum Nitride':{density:3.26,matPrice:80.0,scrap:1.30},'Rubber':{density:1.15,matPrice:2.80,scrap:1.10},'Formex':{density:1.35,matPrice:8.0,scrap:1.12},'TIM':{density:2.50,matPrice:45.0,scrap:1.05},'EMI':{density:0.80,matPrice:15.0,scrap:1.10},'Insulator':{density:0.15,matPrice:60.0,scrap:1.15},'Cardboard':{density:0.55,matPrice:0.80,scrap:1.05},'Label Stock':{density:0.90,matPrice:4.0,scrap:1.05},'Lumber':{density:0.55,matPrice:0.60,scrap:1.10},'Potting':{density:1.10,matPrice:12.0,scrap:1.05},'RTV':{density:1.05,matPrice:18.0,scrap:1.05}};







let cooP=JSON.parse(JSON.stringify(DEF_COO));



let procP=JSON.parse(JSON.stringify(DEF_PROC));



let matP=JSON.parse(JSON.stringify(DEF_MAT));



function resetParams(){cooP=JSON.parse(JSON.stringify(DEF_COO));procP=JSON.parse(JSON.stringify(DEF_PROC));matP=JSON.parse(JSON.stringify(DEF_MAT));}







function getSC(vol,proc,matFam,cx,coo){



  const cp=cooP[coo]||cooP['US'];



  const pp=procP[proc]||{machineRate:60,cycleBase:0.5,timeExp:0.30};



  const mp=matP[matFam]||{density:2.0,matPrice:5.0,scrap:1.10};



  const matCost=vol*(mp.density/1000)*mp.matPrice*mp.scrap;



  const cxM=1+Math.max(0,(cx-1))*0.25;



  const cycleMin=pp.cycleBase*Math.pow(Math.max(vol,0.001),pp.timeExp)*cxM;



  const procCost=(pp.machineRate/60)*cycleMin*cp.labor;



  const oh=(matCost+procCost)*cp.overhead*0.20;



  return matCost+procCost+oh;



}



function getToolSC(vol,proc,cx,coo){



  const cp=cooP[coo]||cooP['US'];



  const pp=procP[proc]||{toolBase:2000,toolExp:0.40};



  const tb=pp.toolBase||0;if(!tb)return null;



  const cxM=1+Math.max(0,(cx-1))*0.35;



  const base=tb*Math.pow(Math.max(vol,0.001),pp.toolExp)*cxM;



  return base*cp.labor*0.7+base*0.3;



}



function getSCrow(d,coo){return getSC(d.volume_cm3,d.process,d.material_family,d.complexity,coo);}



function getToolSCrow(d,coo){return getToolSC(d.volume_cm3,d.process,d.complexity,coo);}



function getFiltered(){return PART_DATA.filter(d=>FILTER_KEYS.every(k=>{const s=activeSelections[k];return !s.length||s.includes(String(d[k]));})&&d.price_hv>0&&d.volume_cm3>0);}



function getFilteredTool(){return TOOL_DATA.filter(d=>FILTER_KEYS.every(k=>{const s=activeSelections[k];return !s.length||s.includes(String(d[k]));})&&d.tool_price>0&&d.volume_cm3>0);}



function colorKey(d,by){if(by==='complexity')return 'Complexity '+d.complexity;return d[by]||'Other';}



function rSq(ys,yP){const mn=ys.reduce((a,b)=>a+b,0)/ys.length;const tot=ys.reduce((a,y)=>a+(y-mn)**2,0);const res=ys.reduce((a,y,i)=>a+(y-yP[i])**2,0);return tot<1e-12?0:Math.max(0,1-res/tot);}



function fitPower(xs,ys){



  if(xs.length<3)return null;



  const lx=xs.map(x=>Math.log(Math.max(x,1e-9))),ly=ys.map(y=>Math.log(Math.max(y,1e-9)));



  const n=lx.length,slx=lx.reduce((a,v)=>a+v,0),sly=ly.reduce((a,v)=>a+v,0);



  const slxly=lx.reduce((a,v,i)=>a+v*ly[i],0),slx2=lx.reduce((a,v)=>a+v*v,0);



  const den=n*slx2-slx*slx;if(Math.abs(den)<1e-12)return null;



  const b=(n*slxly-slx*sly)/den,a=Math.exp((sly-b*slx)/n);



  return{r2:rSq(ys,xs.map(x=>a*Math.pow(Math.max(x,1e-9),b))),fn:x=>a*Math.pow(Math.max(x,1e-9),b),type:'Power law',eq:'y='+a.toFixed(3)+'x^'+b.toFixed(3)};

}

function fitLinear(xs,ys){
  if(xs.length<2)return null;
  const n=xs.length,sx=xs.reduce((a,v)=>a+v,0),sy=ys.reduce((a,v)=>a+v,0);
  const sxy=xs.reduce((a,v,i)=>a+v*ys[i],0),sx2=xs.reduce((a,v)=>a+v*v,0);
  const den=n*sx2-sx*sx;if(Math.abs(den)<1e-12)return null;
  const b=(n*sxy-sx*sy)/den,a=(sy-b*sx)/n;
  return{r2:rSq(ys,xs.map(x=>a+b*x)),fn:x=>a+b*x,type:'Linear',eq:'y='+a.toFixed(2)+'+'+b.toFixed(2)+'x'};
}

function fitLog(xs,ys){
  if(xs.length<3)return null;
  const n=xs.length;
  const lx=xs.map(x=>Math.log(Math.max(x,1e-9)));
  const slx=lx.reduce((a,v)=>a+v,0),sy=ys.reduce((a,v)=>a+v,0);
  const slxly=lx.reduce((a,v,i)=>a+v*ys[i],0),slx2=lx.reduce((a,v)=>a+v*v,0);
  const den=n*slx2-slx*slx;if(Math.abs(den)<1e-12)return null;
  const b=(n*slxly-slx*sy)/den,a=(sy-b*slx)/n;
  return{r2:rSq(ys,xs.map(x=>a+b*Math.log(Math.max(x,1e-9)))),fn:x=>a+b*Math.log(Math.max(x,1e-9)),type:'Log',eq:'y='+a.toFixed(2)+'+'+b.toFixed(2)+'ln(x)'};
}

function fitBest(data,yKey){

  if(data.length<3)return null;

  const xs=data.map(d=>d.volume_cm3),ys=data.map(d=>d[yKey]);
  const sel=document.getElementById('trendType')?document.getElementById('trendType').value:'auto';

  if(sel==='power'){return fitPower(xs,ys);}
  if(sel==='linear'){return fitLinear(xs,ys);}

  const models=[];
  const pw=fitPower(xs,ys);if(pw)models.push(pw);
  const ln=fitLinear(xs,ys);if(ln)models.push(ln);
  const lg=fitLog(xs,ys);if(lg)models.push(lg);

  models.sort((a,b)=>b.r2-a.r2);return models[0]||null;

}



function makeCurve(fn,xMin,xMax,n=80){const pts=[];for(let i=0;i<=n;i++){const x=xMin*Math.pow(xMax/xMin,i/n);const y=fn(x);if(isFinite(y)&&y>0&&y<1e9)pts.push({x,y});}return pts;}



function makeSCCurve(reprPts,coo,xMin,xMax,n=80,isTool=false){



  if(!reprPts.length)return[];const pts=[];



  for(let i=0;i<=n;i++){



    const vol=xMin*Math.pow(xMax/xMin,i/n);



    const vals=reprPts.map(d=>isTool?getToolSC(vol,d.process,d.complexity,coo):getSC(vol,d.process,d.material_family,d.complexity,coo)).filter(v=>v!=null&&isFinite(v)&&v>0);



    if(vals.length){const avg=vals.reduce((a,b)=>a+b,0)/vals.length;if(avg>0&&avg<1e9)pts.push({x:vol,y:avg});}



  }return pts;



}



function getGroupsColors(data){



  const by=document.getElementById('colorBy').value,groups={};



  data.forEach(d=>{const k=colorKey(d,by);if(!groups[k])groups[k]=[];groups[k].push(d);});



  const keys=Object.keys(groups).sort((a,b)=>by==='complexity'?+a.replace('Complexity ','')-+b.replace('Complexity ',''):a.localeCompare(b));



  const colorMap={};keys.forEach((k,i)=>colorMap[k]=PALETTE[i%PALETTE.length]);



  return{groups,keys,colorMap};



}



function previewEstimate(){



  const vol=parseFloat(document.getElementById('f_vol').value);



  const proc=document.getElementById('f_proc').value;



  const matFam=document.getElementById('f_matfam').value;



  const cx=parseInt(document.getElementById('f_cx').value)||1;



  const coo=document.getElementById('scCOO').value;



  const estEl=document.getElementById('f_est');



  const prevEl=document.getElementById('estPreview');



  const dbBtn=document.getElementById('btnAddDB');



  if(isNaN(vol)||vol<=0){estEl.value='';prevEl.textContent='';return;}



  const parts=[];



  if(bestFit){const v=bestFit.fn(vol);if(isFinite(v)&&v>0)parts.push('Actual trend: $'+v.toFixed(2));}



  if(proc&&matFam&&cx){const sc=getSC(vol,proc,matFam,cx,coo);if(isFinite(sc)&&sc>0)parts.push('Should-cost ('+coo+'): $'+sc.toFixed(2));}



  if(toolFit){const v=toolFit.fn(vol);if(isFinite(v)&&v>0)parts.push('Tool trend: $'+v.toFixed(0));}



  if(proc&&cx){const tsc=getToolSC(vol,proc,cx,coo);if(tsc&&isFinite(tsc)&&tsc>0)parts.push('Tool SC ('+coo+'): $'+tsc.toFixed(0));}



  estEl.value=parts.length?parts.join('  |  '):'Fill process, material & complexity';



  prevEl.innerHTML=parts.length?'<strong>Estimates:</strong> '+parts.join(' &middot; '):'';



  if(dbBtn)dbBtn.classList.add('visible');



}



function plotCustom(){



  const vol=parseFloat(document.getElementById('f_vol').value);



  const proc=document.getElementById('f_proc').value;



  const matFam=document.getElementById('f_matfam').value;



  const cx=parseInt(document.getElementById('f_cx').value)||1;



  const desc=document.getElementById('f_desc').value.trim()||('My part '+(customPoints.length+1));



  if(isNaN(vol)||vol<=0){alert('Enter a volume > 0');return;}



  customPoints.push({volume:vol,label:desc,process:proc,material_family:matFam,complexity:cx});



  draw();



}



function clearForm(){



  ['f_desc','f_pn','f_mat','f_supplier','f_price','f_tool','f_toollt','f_vol','f_est'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});



  ['f_proc','f_matfam','f_coo','f_cx'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});



  document.getElementById('estPreview').textContent='';



  var _b=document.getElementById('btnAddDB');if(_b)_b.classList.remove('visible');



  var _d=document.getElementById('dbNotice');if(_d)_d.classList.remove('visible');



}



function clearAllCustom(){customPoints=[];draw();}



function addToDatabase(){



  const vol=parseFloat(document.getElementById('f_vol').value);



  const proc=document.getElementById('f_proc').value;



  const matFam=document.getElementById('f_matfam').value;



  const coo=document.getElementById('f_coo').value||document.getElementById('scCOO').value;



  const cx=parseInt(document.getElementById('f_cx').value)||0;



  const desc=document.getElementById('f_desc').value.trim();



  const pn=document.getElementById('f_pn').value.trim();



  const mat=document.getElementById('f_mat').value.trim();



  const price=parseFloat(document.getElementById('f_price').value)||0;



  const toolP=parseFloat(document.getElementById('f_tool').value)||0;



  const toolLt=parseFloat(document.getElementById('f_toollt').value)||0;



  if(!vol||!proc||!matFam||!coo||!cx){alert('Please fill all required fields (marked *) before adding to the database.');return;}



  if(price===0&&toolP===0){alert('Enter at least a part price or tool price to add to the database.');return;}



  if(price>0)PART_DATA.push({process:proc,material_family:matFam,complexity:cx,coo:coo,volume_cm3:vol,price_hv:price,description:desc,material:mat,part_number:pn,isUserAdded:true});



  if(toolP>0)TOOL_DATA.push({process:proc,material_family:matFam,complexity:cx,coo:coo,volume_cm3:vol,tool_price:toolP,tool_lt:toolLt,description:desc,material:mat,part_number:pn,isUserAdded:true});



  const n=document.getElementById('dbNotice');if(n)n.classList.add('visible');



  setTimeout(()=>n.classList.remove('visible'),4000);



  updateFilterOptions();draw();if(panelOpen.table)renderTable();



}



function getCustomEstimates(pt){



  const coo=document.getElementById('scCOO').value;



  const actualEst=bestFit?bestFit.fn(pt.volume):null;



  const toolEstV=toolFit?toolFit.fn(pt.volume):null;



  const scEstV=pt.process&&pt.material_family&&pt.complexity?getSC(pt.volume,pt.process,pt.material_family,pt.complexity,coo):null;



  const scToolEstV=pt.process&&pt.complexity?getToolSC(pt.volume,pt.process,pt.complexity,coo):null;



  return{actualEst,scEst:scEstV,toolEst:toolEstV,scToolEst:scToolEstV};



}



function togglePanel(key){



  panelOpen[key]=!panelOpen[key];



  const bodies={myPart:'myPartBody',table:'tableBody',sc:'scBody'};



  const btns={myPart:'myPartBtn',table:'tableBtn',sc:'scBtn'};



  const hdrs={myPart:'myPartHdr',table:'tableHdr',sc:'scHdr'};



  const body=document.getElementById(bodies[key]);



  const btn=document.getElementById(btns[key]);



  const hdr=document.getElementById(hdrs[key]);



  if(body)body.style.display=panelOpen[key]?'block':'none';



  if(btn)btn.textContent=panelOpen[key]?'Hide':'Show';



  if(hdr)hdr.classList.toggle('open',panelOpen[key]);



  if(panelOpen[key]&&key==='table')renderTable();



  if(panelOpen[key]&&key==='sc')buildParamGrids();



}



function switchTab(tab){



  activeTab=tab;sortCol=null;sortDir=1;



  document.getElementById('tabPart').classList.toggle('active',tab==='part');



  document.getElementById('tabTool').classList.toggle('active',tab==='tool');



  renderTable();



}



function renderTable(){



  const coo=document.getElementById('scCOO').value;



  const data=activeTab==='part'?getFiltered():getFilteredTool();



  const tbl=document.getElementById('dataTable');



  const cols=activeTab==='part'?['description','supplier','process','material_family','material','coo','complexity','volume_cm3','price_hv','sc']:['description','supplier','process','material_family','coo','complexity','volume_cm3','tool_price','sc_tool'];



  const hdrs=activeTab==='part'?['Description','Supplier','Process','Material Fam.','Material','COO','Cx','Vol (cm3)','HV Price ($)','Should-cost ($)']:['Description','Supplier','Process','Material Fam.','COO','Cx','Vol (cm3)','Tool Price ($)','SC Tool ($)'];



  const rows=data.map(d=>{const sc=activeTab==='part'?getSCrow(d,coo):getToolSCrow(d,coo);return Object.assign({},d,{sc:sc&&isFinite(sc)?sc:null,sc_tool:sc&&isFinite(sc)?sc:null});});



  if(sortCol!==null){const k=cols[sortCol];rows.sort((a,b)=>{const av=a[k],bv=b[k];if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return -1;return typeof av==='string'?av.localeCompare(bv)*sortDir:(av-bv)*sortDir;});}



  const mIdx=activeTab==='part'?[8,9]:[7,8];



  let head='<thead><tr>';



  hdrs.forEach((h,i)=>{head+='<th onclick="sortTable('+i+')">'+h+' <span style="opacity:0.5">'+(sortCol===i?(sortDir===1?'^':'v'):'~')+'</span></th>';});



  head+='</tr></thead>';



  tbl.innerHTML=head;



  const tbody=document.createElement('tbody');



  rows.forEach(row=>{



    const tr=document.createElement('tr');tr.style.cursor='pointer';tr.onclick=function(){if(typeof openSidePanel==='function'&&typeof findPartByPoint==='function'){var match=null;for(var i=0;i<(typeof ALL_PARTS_RAW!=='undefined'?ALL_PARTS_RAW:[]).length;i++){var p=ALL_PARTS_RAW[i];if(p.description===row.description&&Math.abs(p.volume_cm3-row.volume_cm3)<0.001){match=p;break;}}if(match)openSidePanel(match);}};



    if(row.isUserAdded)tr.style.background='#E8F8F2';



    cols.forEach((c,i)=>{



      const td=document.createElement('td');



      const raw=row[c];



      td.textContent=typeof raw==='number'?(mIdx.includes(i)?'$'+raw.toFixed(2):raw.toFixed(2)):(raw||'--');



      if(mIdx[1]===i&&row.sc!=null){



        const actual=activeTab==='part'?row.price_hv:row.tool_price;



        const pct=actual&&actual>0?((actual-row.sc)/row.sc*100):null;



        if(pct!=null){td.textContent+=' ('+(pct>0?'+':'')+pct.toFixed(0)+'%)';td.style.color=pct>20?'#993C1D':pct<-20?'#0F6E56':'';}



      }



      tr.appendChild(td);



    });



    tbody.appendChild(tr);



  });



  tbl.appendChild(tbody);



  document.getElementById('tableTitle').textContent='Data table -- '+rows.length+' rows (SC for '+coo+')'+(rows.some(r=>r.isUserAdded)?' -- includes user-added rows':'');



}



function sortTable(col){if(sortCol===col)sortDir*=-1;else{sortCol=col;sortDir=1;}renderTable();}







function buildParamGrids(){



  // Use data-attributes to avoid quote-collision in inline handlers



  const cg=document.getElementById('cooGrid');cg.innerHTML='';



  const cooKeys=Object.keys(cooP).filter(k=>k!=='Unknown'&&k!=='Germany');



  cooKeys.forEach(c=>{



    const card=document.createElement('div');card.className='sc-card';



    card.innerHTML='<div class="sc-card-title">'+c+'</div>';



    ['labor','overhead'].forEach(field=>{



      const wrap=document.createElement('div');wrap.className='sc-field';



      const lbl=document.createElement('label');lbl.textContent=field==='labor'?'Labor mult':'Overhead mult';



      const inp=document.createElement('input');



      inp.type='number';inp.step='0.01';inp.min='0.1';inp.max='3';



      inp.value=cooP[c][field];



      inp.dataset.coo=c;inp.dataset.field=field;



      inp.addEventListener('change',function(){cooP[this.dataset.coo][this.dataset.field]=+this.value;});



      wrap.appendChild(lbl);wrap.appendChild(inp);card.appendChild(wrap);



    });



    cg.appendChild(card);



  });







  const pg=document.getElementById('procGrid');pg.innerHTML='';



  const procs=[...new Set([...PART_DATA,...TOOL_DATA].map(d=>d.process))].sort();



  procs.forEach(p=>{



    const pp=procP[p]||{machineRate:60,cycleBase:0.5,timeExp:0.30,toolBase:2000,toolExp:0.40};



    const card=document.createElement('div');card.className='sc-card';



    card.innerHTML='<div class="sc-card-title">'+p+'</div>';



    const fields=[['machineRate','Machine rate ($/hr)','1','1',null],['cycleBase','Cycle base (min)','0.001','0.01',null],['timeExp','Time exponent','0','0.01','1'],['toolBase','Tool base ($)','0','100',null],['toolExp','Tool vol exp','0','0.01','1.5']];



    fields.forEach(([field,label,min,step,max])=>{



      const wrap=document.createElement('div');wrap.className='sc-field';



      const lbl=document.createElement('label');lbl.textContent=label;



      const inp=document.createElement('input');



      inp.type='number';inp.step=step;inp.min=min;if(max)inp.max=max;



      inp.value=pp[field]||0;



      inp.dataset.proc=p;inp.dataset.field=field;



      inp.addEventListener('change',function(){



        if(!procP[this.dataset.proc])procP[this.dataset.proc]=JSON.parse(JSON.stringify(DEF_PROC[this.dataset.proc]||{machineRate:60,cycleBase:0.5,timeExp:0.30,toolBase:2000,toolExp:0.40}));



        procP[this.dataset.proc][this.dataset.field]=+this.value;



      });



      wrap.appendChild(lbl);wrap.appendChild(inp);card.appendChild(wrap);



    });



    pg.appendChild(card);



  });







  const mg=document.getElementById('matGrid');mg.innerHTML='';



  const mats=[...new Set([...PART_DATA,...TOOL_DATA].map(d=>d.material_family))].sort();



  mats.forEach(m=>{



    const mp=matP[m]||{density:2.0,matPrice:5.0,scrap:1.10};



    const card=document.createElement('div');card.className='sc-card';



    card.innerHTML='<div class="sc-card-title">'+m+'</div>';



    const fields=[['density','Density (g/cm3)','0.01','0.01',null],['matPrice','Raw material ($/kg)','0.01','0.1',null],['scrap','Scrap factor','1','0.01','2']];



    fields.forEach(([field,label,min,step,max])=>{



      const wrap=document.createElement('div');wrap.className='sc-field';



      const lbl=document.createElement('label');lbl.textContent=label;



      const inp=document.createElement('input');



      inp.type='number';inp.step=step;inp.min=min;if(max)inp.max=max;



      inp.value=mp[field]||0;



      inp.dataset.mat=m;inp.dataset.field=field;



      inp.addEventListener('change',function(){



        if(!matP[this.dataset.mat])matP[this.dataset.mat]=JSON.parse(JSON.stringify(DEF_MAT[this.dataset.mat]||{density:2.0,matPrice:5.0,scrap:1.10}));



        matP[this.dataset.mat][this.dataset.field]=+this.value;



      });



      wrap.appendChild(lbl);wrap.appendChild(inp);card.appendChild(wrap);



    });



    mg.appendChild(card);



  });



}







function buildFilters(){



  const row=document.getElementById('filterRow');row.innerHTML='';



  FILTER_KEYS.forEach(k=>{



    const div=document.createElement('div');



    const lbl=document.createElement('label');lbl.className='ctrl-lbl';lbl.textContent=FILTER_LABELS[k];



    const wrap=document.createElement('div');wrap.className='ms-wrap';wrap.id='wrap_'+k;



    const btn=document.createElement('button');btn.className='ms-btn';btn.id='btn_'+k;btn.textContent='All';



    btn.addEventListener('click',function(e){e.stopPropagation();toggleDD(k);});



    const dd=document.createElement('div');dd.className='ms-dropdown';dd.id='dd_'+k;



    wrap.appendChild(btn);wrap.appendChild(dd);div.appendChild(lbl);div.appendChild(wrap);row.appendChild(div);



  });



  updateFilterOptions();



  document.addEventListener('click',()=>{FILTER_KEYS.forEach(k=>{const d=document.getElementById('dd_'+k);if(d)d.classList.remove('open');});});



}



function updateFilterOptions(){



  const combined=[...PART_DATA,...TOOL_DATA];



  FILTER_KEYS.forEach(k=>{



    const others=combined.filter(d=>FILTER_KEYS.filter(kk=>kk!==k).every(kk=>{const s=activeSelections[kk];return !s.length||s.includes(String(d[kk]));}));



    const avail=[...new Set(others.map(d=>String(d[k])))].sort((a,b)=>isNaN(a)?a.localeCompare(b):+a-+b);



    const dd=document.getElementById('dd_'+k);if(!dd)return;



    dd.innerHTML='';



    avail.forEach(v=>{



      const lbl=document.createElement('label');lbl.className='ms-item';



      const chk=document.createElement('input');chk.type='checkbox';chk.checked=activeSelections[k].includes(v);



      chk.addEventListener('change',function(){



        if(this.checked){if(!activeSelections[k].includes(v))activeSelections[k].push(v);}



        else activeSelections[k]=activeSelections[k].filter(x=>x!==v);



        updateFilterOptions();updateBtnLabel(k);draw();



      });



      lbl.appendChild(chk);lbl.appendChild(document.createTextNode(v));dd.appendChild(lbl);



    });



    const clr=document.createElement('span');clr.className='ms-clear';clr.textContent='Clear';



    clr.addEventListener('click',function(){activeSelections[k]=[];updateFilterOptions();updateBtnLabel(k);draw();});



    dd.appendChild(clr);updateBtnLabel(k);



  });



}



function updateBtnLabel(k){const btn=document.getElementById('btn_'+k);if(!btn)return;const s=activeSelections[k];btn.textContent=s.length===0?'All':s.length===1?s[0]:s.length+' selected';}



function toggleDD(k){FILTER_KEYS.forEach(kk=>{if(kk!==k){const d=document.getElementById('dd_'+kk);if(d)d.classList.remove('open');}});const dd=document.getElementById('dd_'+k);if(dd)dd.classList.toggle('open');}







let quickEstPoint=null;

function quickEstimate(){
  const vol=parseFloat(document.getElementById('quickVol').value);
  const resEl=document.getElementById('quickResult');
  if(isNaN(vol)||vol<=0){resEl.textContent='';quickEstPoint=null;draw();return;}
  const parts=[];
  if(bestFit){const v=bestFit.fn(vol);if(isFinite(v)&&v>0)parts.push('Part: $'+v.toFixed(2));}
  if(toolFit){const v=toolFit.fn(vol);if(isFinite(v)&&v>0)parts.push('Tool: $'+v.toFixed(0));}
  if(parts.length){resEl.innerHTML='<strong>'+parts.join(' &nbsp;|&nbsp; ')+'</strong>';quickEstPoint={volume:vol};}
  else{resEl.textContent='No trendline available';quickEstPoint=null;}
  draw();
}

function clearQuickEst(){document.getElementById('quickVol').value='';document.getElementById('quickResult').textContent='';quickEstPoint=null;draw();}

function draw(){



  const data=getFiltered(),toolData=getFilteredTool();



  const coo=document.getElementById('scCOO').value;



  const showSC=document.getElementById('showSC').checked;



  const showBand=document.getElementById('showBand').checked;



  const showTool=document.getElementById('showTool').checked;



  const logMode=document.getElementById('logScale').checked;



  const{groups,keys,colorMap}=getGroupsColors(data);







  document.getElementById('cooTag').textContent=coo;



  document.getElementById('sCount').textContent=data.length;



  document.getElementById('sTool').textContent=toolData.length;



  document.getElementById('countLbl').textContent=data.length+' part / '+toolData.length+' tool pts';



  if(data.length){const p=data.map(d=>d.price_hv);document.getElementById('sMin').textContent='$'+Math.min(...p).toFixed(2);document.getElementById('sMax').textContent='$'+Math.max(...p).toLocaleString(undefined,{maximumFractionDigits:0});}







  bestFit=data.length>=3?fitBest(data,'price_hv'):null;



  toolFit=toolData.length>=3?fitBest(toolData,'tool_price'):null;



  const scPts=data.map(d=>Object.assign({},d,{sc:getSCrow(d,coo)})).filter(d=>d.sc>0&&isFinite(d.sc));



  scFit=scPts.length>=3?fitPower(scPts.map(d=>d.volume_cm3),scPts.map(d=>d.sc)):null;



  const scTPts=toolData.map(d=>Object.assign({},d,{sct:getToolSCrow(d,coo)})).filter(d=>d.sct&&d.sct>0&&isFinite(d.sct));



  scToolFit=scTPts.length>=3?fitPower(scTPts.map(d=>d.volume_cm3),scTPts.map(d=>d.sct)):null;







  if(bestFit){document.getElementById('tlType').textContent=bestFit.type;document.getElementById('tlR2').textContent=bestFit.r2.toFixed(3);document.getElementById('tlEq').textContent=bestFit.eq;}



  else{document.getElementById('tlType').textContent=data.length<3?'(need 3+)':'--';document.getElementById('tlR2').textContent='--';document.getElementById('tlEq').textContent='';}



  document.getElementById('scInfo').textContent=scFit?'R2='+scFit.r2.toFixed(3):(data.length>=1?'model active':'--');



  document.getElementById('tlToolType').textContent=toolFit?toolFit.type:(toolData.length<3?'(need 3+)':'--');



  document.getElementById('tlToolR2').textContent=toolFit?toolFit.r2.toFixed(3):'--';



  document.getElementById('scToolInfo').textContent=scToolFit?'R2='+scToolFit.r2.toFixed(3):(toolData.length>=1?'model active':'--');







  previewEstimate();



  if(panelOpen.table)renderTable();



  if(data.length<1&&toolData.length<1){if(chartInst)chartInst.destroy();return;}







  const allXs=[...data.map(d=>d.volume_cm3),...(showTool?toolData.map(d=>d.volume_cm3):[])];



  const xMin=Math.min(...allXs),xMax=Math.max(...allXs);



  const datasets=[];







  if(showSC&&data.length>=1){



    const scC=makeSCCurve(data,coo,xMin,xMax,80,false);



    if(scC.length>=2){



      if(showBand){



        datasets.push({label:'Part SC+20%',data:scC.map(p=>({x:p.x,y:p.y*1.2})),type:'line',tension:0.3,borderColor:'rgba(83,74,183,0.2)',borderWidth:1,backgroundColor:SC_BAND,pointRadius:0,fill:1,order:1,yAxisID:'y'});



        datasets.push({label:'Part SC-20%',data:scC.map(p=>({x:p.x,y:p.y*0.8})),type:'line',tension:0.3,borderColor:'rgba(83,74,183,0.2)',borderWidth:1,backgroundColor:SC_BAND,pointRadius:0,fill:false,order:1,yAxisID:'y'});



      }



      datasets.push({label:'Part SC ('+coo+')',data:scC,type:'line',tension:0.3,borderColor:SC_COLOR,borderWidth:2.5,backgroundColor:'transparent',pointRadius:0,fill:false,order:1,yAxisID:'y'});



    }



    if(scFit)datasets.push({label:'Part SC fit',data:makeCurve(scFit.fn,xMin,xMax),type:'line',tension:0.3,borderColor:SC_COLOR,borderWidth:1.5,borderDash:[3,4],backgroundColor:'transparent',pointRadius:0,fill:false,order:1,yAxisID:'y'});



  }



  if(bestFit)datasets.push({label:'Part trendline',data:makeCurve(bestFit.fn,xMin,xMax),type:'line',tension:0.3,borderColor:'#444441',borderWidth:2,borderDash:[6,3],backgroundColor:'transparent',pointRadius:0,fill:false,order:1,yAxisID:'y'});



  keys.forEach(k=>{



    datasets.push({label:k,data:groups[k].map(d=>({x:d.volume_cm3,y:d.price_hv,desc:d.description||'',process:d.process,mat:d.material_family,cx:d.complexity,coo:d.coo,sc:getSCrow(d,coo),isPartData:true,isUA:!!d.isUserAdded})),type:'scatter',backgroundColor:colorMap[k]+'bb',borderColor:colorMap[k],borderWidth:1,pointRadius:5,pointHoverRadius:7,pointStyle:'circle',order:2,yAxisID:'y'});



  });







  if(showTool&&toolData.length>=1){



    const scTC=makeSCCurve(toolData,coo,xMin,xMax,80,true);



    if(showSC&&scTC.length>=2){



      if(showBand){



        datasets.push({label:'Tool SC+20%',data:scTC.map(p=>({x:p.x,y:p.y*1.2})),type:'line',tension:0.3,borderColor:'rgba(15,110,86,0.2)',borderWidth:1,backgroundColor:TOOL_SC_BAND,pointRadius:0,fill:1,order:1,yAxisID:'y2'});



        datasets.push({label:'Tool SC-20%',data:scTC.map(p=>({x:p.x,y:p.y*0.8})),type:'line',tension:0.3,borderColor:'rgba(15,110,86,0.2)',borderWidth:1,backgroundColor:TOOL_SC_BAND,pointRadius:0,fill:false,order:1,yAxisID:'y2'});



      }



      datasets.push({label:'Tool SC ('+coo+')',data:scTC,type:'line',tension:0.3,borderColor:SC_TOOL_COLOR,borderWidth:2.5,backgroundColor:'transparent',pointRadius:0,fill:false,order:1,yAxisID:'y2'});



    }



    if(toolFit)datasets.push({label:'Tool trendline',data:makeCurve(toolFit.fn,xMin,xMax),type:'line',tension:0.3,borderColor:TOOL_COLOR,borderWidth:2,borderDash:[6,3],backgroundColor:'transparent',pointRadius:0,fill:false,order:1,yAxisID:'y2'});



    const by=document.getElementById('colorBy').value,tg={};



    toolData.forEach(d=>{const k=colorKey(d,by);if(!tg[k])tg[k]=[];tg[k].push(d);});



    Object.entries(tg).forEach(([k,rows])=>{



      datasets.push({label:k+' (tool)',data:rows.map(d=>({x:d.volume_cm3,y:d.tool_price,desc:d.description||'',process:d.process,mat:d.material_family,cx:d.complexity,coo:d.coo,sc:getToolSCrow(d,coo),isToolData:true,isUA:!!d.isUserAdded})),type:'scatter',backgroundColor:(colorMap[k]||'#888')+'66',borderColor:(colorMap[k]||'#888'),borderWidth:1,pointRadius:4,pointHoverRadius:6,pointStyle:'rectRot',order:3,yAxisID:'y2'});



    });



  }







  customPoints.forEach((pt,i)=>{



    const gc=colorMap[pt.label]||PALETTE[i%PALETTE.length]||'#888';



    const e=getCustomEstimates(pt);



    if(e.actualEst&&e.actualEst>0)datasets.push({label:pt.label+' (trend)',data:[{x:pt.volume,y:e.actualEst,isCustom:true,isCustA:true,lbl:pt.label,actualEst:e.actualEst}],type:'scatter',backgroundColor:gc,borderColor:'#111',borderWidth:2,pointRadius:10,pointHoverRadius:13,pointStyle:'triangle',order:0,yAxisID:'y'});



    if(e.scEst&&e.scEst>0&&showSC)datasets.push({label:pt.label+' (SC)',data:[{x:pt.volume,y:e.scEst,isCustom:true,isCustSC:true,lbl:pt.label,scEst:e.scEst}],type:'scatter',backgroundColor:SC_COLOR+'cc',borderColor:'#111',borderWidth:2,pointRadius:10,pointHoverRadius:13,pointStyle:'rectRot',order:0,yAxisID:'y'});



    if(showTool){



      if(e.toolEst&&e.toolEst>0)datasets.push({label:pt.label+' (tool trend)',data:[{x:pt.volume,y:e.toolEst,isCustom:true,isCustTA:true,lbl:pt.label,toolEst:e.toolEst}],type:'scatter',backgroundColor:TOOL_COLOR+'cc',borderColor:'#111',borderWidth:2,pointRadius:10,pointHoverRadius:13,pointStyle:'triangle',order:0,yAxisID:'y2'});



      if(e.scToolEst&&e.scToolEst>0&&showSC)datasets.push({label:pt.label+' (tool SC)',data:[{x:pt.volume,y:e.scToolEst,isCustom:true,isCustTSC:true,lbl:pt.label,scToolEst:e.scToolEst}],type:'scatter',backgroundColor:SC_TOOL_COLOR+'cc',borderColor:'#111',borderWidth:2,pointRadius:10,pointHoverRadius:13,pointStyle:'rectRot',order:0,yAxisID:'y2'});



    }



  });







  if(quickEstPoint&&quickEstPoint.volume>0){
    const qv=quickEstPoint.volume;
    if(bestFit){const est=bestFit.fn(qv);if(isFinite(est)&&est>0)datasets.push({label:'Quick est (part)',data:[{x:qv,y:est,isQuickEst:true,qPart:est}],type:'scatter',backgroundColor:'#FF6B00',borderColor:'#111',borderWidth:2.5,pointRadius:12,pointHoverRadius:15,pointStyle:'crossRot',order:0,yAxisID:'y'});}
    if(showTool&&toolFit){const est=toolFit.fn(qv);if(isFinite(est)&&est>0)datasets.push({label:'Quick est (tool)',data:[{x:qv,y:est,isQuickEst:true,qTool:est}],type:'scatter',backgroundColor:'#FF6B00cc',borderColor:'#111',borderWidth:2.5,pointRadius:12,pointHoverRadius:15,pointStyle:'crossRot',order:0,yAxisID:'y2'});}
  }

  if(chartInst)chartInst.destroy();

  const scType=logMode?'logarithmic':'linear';



  const yCB=v=>{if(logMode){const l=Math.log10(v);return l===Math.floor(l)?'$'+v.toLocaleString():null;}return '$'+v.toLocaleString();};



  const xCB=v=>{if(logMode){const l=Math.log10(v);return l===Math.floor(l)?v>=1?v.toLocaleString():v.toFixed(3):null;}return v>=1000?(v/1000).toFixed(0)+'k':v;};



  const y2CB=v=>{if(logMode){const l=Math.log10(v);return l===Math.floor(l)?v>=1000?'$'+(v/1000).toFixed(0)+'k':'$'+v.toFixed(0):null;}return v>=1000?'$'+(v/1000).toFixed(0)+'k':'$'+v.toFixed(0);};







  chartInst=new Chart(document.getElementById('chart'),{



    type:'line',data:{datasets},



    options:{



      responsive:true,maintainAspectRatio:false,



      layout:{padding:{top:10,right:65,bottom:5,left:5}},



      plugins:{



        legend:{display:false},



        tooltip:{



          filter:item=>item.raw&&item.raw.y!==undefined&&!item.dataset.borderDash,



          callbacks:{



            title:items=>{const d=items[0].raw;return d.isQuickEst?'Quick estimate':d.isCustom?(d.lbl||'Custom'):(d.desc||'');},



            label:item=>{



              const d=item.raw,coo=document.getElementById('scCOO').value;



              if(d.isQuickEst){const lines=['Vol: '+d.x.toFixed(2)+' cm3'];if(d.qPart)lines.push('Part est: $'+d.qPart.toFixed(2));if(d.qTool)lines.push('Tool est: $'+d.qTool.toFixed(0));return lines;}
              if(d.isCustA)return['Vol: '+d.x.toFixed(2)+' cm3','Part trend est: $'+d.actualEst.toFixed(2)];



              if(d.isCustSC)return['Vol: '+d.x.toFixed(2)+' cm3','Part SC ('+coo+'): $'+d.scEst.toFixed(2)];



              if(d.isCustTA)return['Vol: '+d.x.toFixed(2)+' cm3','Tool trend est: $'+d.toolEst.toFixed(0)];



              if(d.isCustTSC)return['Vol: '+d.x.toFixed(2)+' cm3','Tool SC ('+coo+'): $'+d.scToolEst.toFixed(0)];



              if(d.isPartData){const lines=['Process: '+d.process,'Material: '+d.mat,'Vol: '+d.x.toFixed(2)+' cm3','HV price: $'+d.y.toFixed(4),'SC ('+coo+'): $'+d.sc.toFixed(2)];if(d.sc>0)lines.push('vs SC: '+(d.y>d.sc?'+':'')+((d.y-d.sc)/d.sc*100).toFixed(0)+'%');if(d.isUA)lines.push('User-added entry');lines.push('Cx: '+d.cx,'COO: '+d.coo);return lines;}



              if(d.isToolData){const lines=['Process: '+d.process,'Material: '+d.mat,'Vol: '+d.x.toFixed(2)+' cm3','Tool price: $'+d.y.toLocaleString()];if(d.sc&&d.sc>0)lines.push('Tool SC ('+coo+'): $'+d.sc.toFixed(0),'vs SC: '+(d.y>d.sc?'+':'')+((d.y-d.sc)/d.sc*100).toFixed(0)+'%');if(d.isUA)lines.push('User-added entry');lines.push('Cx: '+d.cx,'COO: '+d.coo);return lines;}



              return[];



            }



          },



          backgroundColor:'rgba(0,0,0,0.87)',padding:10,titleFont:{size:13,weight:'600'},bodyFont:{size:12}



        }



      },



      scales:{



        x:{type:scType,title:{display:true,text:'Material volume (cm3)',font:{size:12},color:'#73726c'},ticks:{color:'#73726c',font:{size:11},callback:xCB},grid:{color:'rgba(0,0,0,0.06)'}},



        y:{type:scType,position:'left',title:{display:true,text:'Part cost ($)',font:{size:12},color:'#444441'},ticks:{color:'#444441',font:{size:11},callback:yCB},grid:{color:'rgba(0,0,0,0.06)'}},



        y2:{type:scType,position:'right',display:showTool,title:{display:showTool,text:'Tooling cost ($)',font:{size:12},color:TOOL_COLOR},ticks:{color:TOOL_COLOR,font:{size:11},callback:y2CB},grid:{display:false}}



      }



    }



  });







  const leg=document.getElementById('legend');leg.innerHTML='';



  function addL(html){const el=document.createElement('span');el.className='leg-item';el.innerHTML=html;leg.appendChild(el);}



  keys.forEach(k=>addL('<span style="width:10px;height:10px;border-radius:50%;background:'+colorMap[k]+';display:inline-block"></span>'+k+' ('+groups[k].length+')'));



  if(bestFit)addL('<span style="width:16px;height:2px;border-top:2px dashed #444441;display:inline-block;vertical-align:middle"></span>Part trendline ('+bestFit.type+', R2='+bestFit.r2.toFixed(3)+')');



  if(showSC&&data.length>=1)addL('<span style="width:16px;height:2.5px;border-top:2.5px solid '+SC_COLOR+';display:inline-block;vertical-align:middle"></span>Part SC -- '+coo+(scFit?' (R2='+scFit.r2.toFixed(3)+')':''));



  if(showSC&&showBand&&data.length>=1)addL('<span style="width:10px;height:10px;background:'+SC_BAND+';border:0.5px solid rgba(83,74,183,0.4);display:inline-block"></span>+/-20% band');



  if(showTool){



    addL('<span style="width:10px;height:10px;border:1.5px solid #888;transform:rotate(45deg);display:inline-block"></span>Tooling data (right axis)');



    if(toolFit)addL('<span style="width:16px;height:2px;border-top:2px dashed '+TOOL_COLOR+';display:inline-block;vertical-align:middle"></span>Tool trendline ('+toolFit.type+', R2='+toolFit.r2.toFixed(3)+')');



    if(showSC&&toolData.length>=1)addL('<span style="width:16px;height:2.5px;border-top:2.5px solid '+SC_TOOL_COLOR+';display:inline-block;vertical-align:middle"></span>Tool SC -- '+coo+(scToolFit?' (R2='+scToolFit.r2.toFixed(3)+')':''));



    if(showSC&&showBand)addL('<span style="width:10px;height:10px;background:'+TOOL_SC_BAND+';border:0.5px solid rgba(15,110,86,0.4);display:inline-block"></span>Tool SC +/-20%');



  }







  const pr=document.getElementById('ptsRow');pr.innerHTML='';



  customPoints.forEach((pt,i)=>{



    const gc=colorMap[pt.label]||PALETTE[i%PALETTE.length]||'#888';



    const e=getCustomEstimates(pt);



    const tag=document.createElement('span');tag.className='pt-tag';



    const aE=e.actualEst&&e.actualEst>0?'$'+e.actualEst.toFixed(2):'n/a';



    const sE=e.scEst&&e.scEst>0?'$'+e.scEst.toFixed(2):'n/a';



    const tE=e.toolEst&&e.toolEst>0?'$'+e.toolEst.toFixed(0):'n/a';



    const tsE=e.scToolEst&&e.scToolEst>0?'$'+e.scToolEst.toFixed(0):'n/a';



    tag.innerHTML='<span style="display:inline-block;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid '+gc+'"></span> '+pt.label+' -- '+pt.volume.toFixed(1)+' cm3 | part: '+aE+' / SC '+sE+' | tool: '+tE+' / SC '+tsE+' <span style="color:#73726c;margin-left:3px">x</span>';



    tag.addEventListener('click',function(){customPoints.splice(i,1);draw();});



    pr.appendChild(tag);



  });



}







buildFilters();



draw();



