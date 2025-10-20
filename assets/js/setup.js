(function(global){
  'use strict';
  const VA = global.VA;
  VA.parseStudentsText = function(text){
    if (!text) return []; const items = String(text).replace(/^\uFEFF/, "").split(/\r?\n|[;,|]/).map(s => s.trim()).filter(Boolean);
    const seen = new Set(); const out = []; for (const s of items){ const k=s.toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push(s);} } return out;
  };
  VA.renderStudentsPreview = function() {
    if (!VA.app.students.length) { $("#studentsPreview").html('<div class="text-muted">Nessuno studente caricato.</div>'); return; }
    const list = VA.app.students.map(s => '<span class="badge text-bg-light me-1 mb-1">' + VA.escapeHtml(s) + '</span>').join("");
    $("#studentsPreview").html('<div class="small">Caricati <strong>' + VA.app.students.length + '</strong> studenti:</div><div class="mt-1">' + list + '</div>');
  };
  function nextIndicatorId(){ let maxId=0; $("#indicatorsTable tbody tr").each(function(){ const id=Number($(this).attr("data-ind-id"))||0; if(id>maxId) maxId=id; }); return maxId+1; }
  VA.addIndicatorRow = function(name="", max="", id=null){
    if (id == null) id = nextIndicatorId();
    const row = $('<tr>\
        <td><span class="badge text-bg-light id-badge">'+id+'</span></td>\
        <td><input type="text" class="form-control indicator-name" placeholder="Es. Comprensione del testo" /></td>\
        <td><input type="number" class="form-control indicator-max small-input" placeholder="Es. 2" min="0" step="0.1" /></td>\
        <td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger remove-indicator">Rimuovi</button></td>\
      </tr>');
    row.attr("data-ind-id", id);
    row.find(".indicator-name").val(name); row.find(".indicator-max").val(max);
    row.find(".remove-indicator").on("click", function(){ row.remove(); VA.refreshExercisesIndicatorsColumns(); VA.recalcSetupPreview(); VA.markDirty(); });
    $("#indicatorsTable tbody").append(row); row.on("input", "input", VA.markDirty);
  };
  VA.getIndicatorsFromTable = function(){
    const inds=[]; $("#indicatorsTable tbody tr").each(function(){
      const id=Number($(this).attr("data-ind-id")); const name=$(this).find(".indicator-name").val().trim(); const max=parseFloat($(this).find(".indicator-max").val());
      if (id && name && !isNaN(max)) inds.push({ id, name, max });
    }); inds.sort((a,b)=>a.id-b.id); return inds;
  };
  VA.ensureExerciseRows = function(count){
    const tbody=$("#exercisesTable tbody"); let current=tbody.children("tr").length;
    while(current<count){
      const newId=current+1; const tr=$('<tr>\
          <td><span class="badge text-bg-light id-badge">'+newId+'</span></td>\
          <td><input type="number" class="form-control ex-mod" step="0.1" value="0"/></td>\
          <td class="ex-covers"></td>\
          <td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger remove-ex">Rimuovi</button></td>\
        </tr>');
      tr.attr("data-ex-id", newId);
      tr.find(".remove-ex").on("click", function(){ tr.remove(); VA.refreshExercisesIndicatorsColumns(); VA.recalcSetupPreview(); VA.markDirty(); });
      tr.on("input", ".ex-mod", VA.markDirty); tbody.append(tr); current++;
    }
    while(current>count){ tbody.children("tr").last().remove(); current--; VA.markDirty(); }
    VA.refreshExercisesIndicatorsColumns();
    VA.recalcSetupPreview();
  };
  VA.refreshExercisesIndicatorsColumns = function(){
    const inds=VA.getIndicatorsFromTable();
    $("#exercisesTable tbody tr").each(function(){
      const $row=$(this); const exId=Number($row.attr("data-ex-id"));
      const coversSet=new Set((VA.app.exercises.find(e=>e.id===exId)?.covers||[]).map(Number));
      const $cell=$row.find(".ex-covers").empty();
      if(!inds.length){ $cell.html('<span class="text-muted">Aggiungi indicatori sopra…</span>'); return; }
      inds.forEach(function(ind){
        const domId="cover_"+ind.id+"_"+Math.random().toString(36).slice(2,7);
        const $wrapper=$('<div>',{class:"form-check"});
        const $input=$('<input>',{class:"form-check-input cover-ind",type:"checkbox",id:domId});
        $input.attr("data-ind-id",ind.id); if(coversSet.has(ind.id)) $input.prop("checked",true);
        const $label=$('<label>',{class:"form-check-label",for:domId, html:'<span class="text-muted me-2">'+ind.id+'</span>'+VA.escapeHtml(ind.name)});
        $input.on("change", function(){ VA.recalcSetupPreview(); VA.markDirty(); });
        $wrapper.append($input,$label); $cell.append($wrapper);
      });
    });
  };
  VA.syncFromSetupTables = function(){
    VA.app.indicators=VA.getIndicatorsFromTable();
    const exercises=[]; $("#exercisesTable tbody tr").each(function(){
      const id=Number($(this).attr("data-ex-id")); const modifier=parseFloat($(this).find(".ex-mod").val())||0; const covers=[];
      $(this).find(".cover-ind").each(function(){ if($(this).is(":checked")) covers.push(Number($(this).attr("data-ind-id"))); });
      exercises.push({id,modifier,covers});
    }); exercises.sort((a,b)=>a.id-b.id); VA.app.exercises=exercises;
  };
  VA.coverageCountForIndicatorById = function(id){ let c=0; VA.app.exercises.forEach(ex=>{ if((ex.covers||[]).includes(id)) c++; }); return c; };
  VA.calcExerciseMaxScore = function(exIdx){
    const ex=VA.app.exercises[exIdx]; if(!ex) return 0; let sum=0;
    (ex.covers||[]).forEach(function(indId){
      const ind=VA.app.indicators.find(i=>i.id===indId); if(!ind) return;
      const cov=VA.coverageCountForIndicatorById(indId)||1; sum+=((ind.max*1.0)/cov);
    });
    const total=sum+(ex.modifier||0); return VA.round1(total);
  };
  VA.recalcSetupPreview = function(){
    VA.syncFromSetupTables();
    const coverageMap={}; VA.app.indicators.forEach(ind=>{ coverageMap[ind.id]=0; });
    VA.app.exercises.forEach(ex=>{ (ex.covers||[]).forEach(id=>{ if(coverageMap.hasOwnProperty(id)) coverageMap[id]+=1; }); });
    let total=0; VA.app.exercises.forEach((ex,exIdx)=>{ total+=VA.calcExerciseMaxScore(exIdx); });
    total=VA.round1(total);
    const uncovered=Object.keys(coverageMap).filter(k=>coverageMap[k]===0).map(id=>{
      const f=VA.app.indicators.find(i=>i.id===Number(id)); return f?`${f.name} (id ${f.id})`:`id ${id}`; });
    document.querySelector('[data-setup-total]').textContent = total.toFixed(1);
    const delta = VA.round1(10 - total);
    const deltaTxt = (delta>0?'+':'') + delta.toFixed(1);
    document.querySelector('[data-setup-delta]').textContent = deltaTxt;
    const warnBox = document.getElementById('coverageWarnings');
    if (uncovered.length){ warnBox.innerHTML = '<div class="alert alert-warning py-2 mb-0"><strong>Attenzione:</strong> indicatori non coperti: '+uncovered.map(VA.escapeHtml).join(', ')+'.</div>'; }
    else { warnBox.innerHTML = ''; }
  };
  VA.collectConfigOrThrow = function(){
    if(!VA.app.students.length) throw new Error("Carica almeno uno studente.");
    VA.app.indicators=VA.getIndicatorsFromTable(); if(!VA.app.indicators.length) throw new Error("Definisci almeno un indicatore.");
    VA.syncFromSetupTables(); if(!VA.app.exercises.length) throw new Error("Definisci almeno un esercizio.");
  };
})(window);
