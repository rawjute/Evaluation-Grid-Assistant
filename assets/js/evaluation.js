(function(global){
  'use strict';
  const VA = global.VA;
  function getSavedLevel(s,e,i){ const S=VA.app.resultsMap[s]; if(!S) return null; const E=S[e]; if(!E) return null; return E[i]??null; }
  function setSavedLevel(s,e,i,l){ VA.app.resultsMap[s]=VA.app.resultsMap[s]||{}; VA.app.resultsMap[s][e]=VA.app.resultsMap[s][e]||{};
    if(l===""||l==null){ delete VA.app.resultsMap[s][e][i]; } else { VA.app.resultsMap[s][e][i]=Number(l); } VA.markDirty(); }
  VA.calcExerciseScoreForStudent = function(stu,exIdx){
    const ex = VA.app.exercises[exIdx]; if(!ex) return 0; let sum=0;
    const distribution = VA.getExerciseDistribution(exIdx);
    (ex.covers||[]).forEach(function(indId){
      const level=getSavedLevel(stu,ex.id,indId);
      const cell = VA.calcExerciseCellScore(exIdx, indId, level, distribution);
      sum += cell;
    });
    return VA.round1(sum);
  };
  VA.calcIndicatorMeanForStudent = function(stu,indId){
    const idxs=VA.app.exercises.map((e,i)=>(e.covers||[]).includes(indId)?i:-1).filter(i=>i>=0); if(!idxs.length) return 0;
    let sum=0; idxs.forEach(function(exIdx){ const ex=VA.app.exercises[exIdx]; const level=getSavedLevel(stu,ex.id,indId); const dist=VA.getExerciseDistribution(exIdx); sum+=VA.calcExerciseCellScore(exIdx, indId, level, dist); });
    return VA.round2(sum/idxs.length);
  };
  VA.calcIndicatorMaxForExercises = function(indId){
    const idxs=VA.app.exercises.map((e,i)=>(e.covers||[]).includes(indId)?i:-1).filter(i=>i>=0);
    if(!idxs.length) return 0;
    let sum=0;
    idxs.forEach(function(exIdx){ const dist=VA.getExerciseDistribution(exIdx); sum+=VA.calcExerciseCellScore(exIdx, indId, 4, dist); });
    return VA.round2(sum/idxs.length);
  };
  VA.calcTotalForStudent = function(stu){ let t=0; VA.app.exercises.forEach(function(_,i){ t+=VA.calcExerciseScoreForStudent(stu,i); }); return VA.round1(t); };
  function renderLevelSelect(student, indicatorId, exerciseId, savedIdx){
    const $select=$('<select>', { class:'form-select form-select-sm', 'data-cell-select': '' });
    $select.attr('data-student', student).attr('data-indicator', indicatorId).attr('data-exercise', exerciseId);
    $select.append($('<option>', { value:'', text:'—' }));
    for (let idx = 4; idx >= 0; idx--) {
      const lvl = VA.LEVELS[idx];
      const $opt = $('<option>', { value: String(idx), text: lvl.label });
      if (savedIdx === idx) $opt.attr('selected', 'selected');
      $select.append($opt);
    }
    return $('<div>').append($select).html();
  }
  function buildStudentTableHtml(student){
    const exCount = VA.app.exercises.length;
    let thead = "<thead>";
    thead += '<tr><th></th><th class="text-center" colspan="'+exCount+'">Esercizi</th><th class="text-center">Media</th></tr>';
    thead += "<tr><th>Indicatore</th>";
    VA.app.exercises.forEach(function(ex){ thead += '<th class="text-center">'+ex.id+'</th>'; });
    thead += '<th class="text-center">Media</th></tr></thead>';
    let tbody = "<tbody>";
    VA.app.indicators.forEach(function(ind){
      tbody += '<tr><td class="indicator-label">'+VA.escapeHtml(ind.name)+'</td>';
      VA.app.exercises.forEach(function(ex){
        if ((ex.covers||[]).includes(ind.id)){
          const savedIdx = getSavedLevel(student, ex.id, ind.id);
          tbody += '<td class="text-center">'+renderLevelSelect(student, ind.id, ex.id, savedIdx)+'</td>';
        } else { tbody += '<td class="cell-disabled">—</td>'; }
      });
      const mean = VA.calcIndicatorMeanForStudent(student, ind.id);
      const max = VA.calcIndicatorMaxForExercises(ind.id);
      tbody += '<td class="text-center"><span class="badge text-bg-light" data-ind-mean="'+VA.escapeHtml(student)+'::'+ind.id+'">'+mean.toFixed(2)+'</span> / <span class="badge text-bg-light">'+max.toFixed(2)+'</span></td>';
      tbody += "</tr>";
    });
    tbody += '<tr><td class="fw-semibold">Punteggio esercizio</td>';
    VA.app.exercises.forEach(function(ex, exIdx){
      const v = VA.calcExerciseScoreForStudent(student, exIdx).toFixed(1);
      const max = VA.calcExerciseMaxScore(exIdx).toFixed(1);
      tbody += '<td class="text-center"><span class="badge text-bg-secondary" data-ex-score="'+VA.escapeHtml(student)+'::'+exIdx+'">'+v+'</span> / <span class="badge text-bg-light" data-ex-max="'+VA.escapeHtml(student)+'::'+exIdx+'">'+max+'</span></td>';
    });
    tbody += "<td></td></tr>";
    tbody += "<tr><td class=\"fw-semibold text-end\">Totale studente</td>";
    for (let i=0; i<VA.app.exercises.length; i++){ tbody += "<td></td>"; }
    tbody += '<td class="text-end"><span class="badge text-bg-primary total-badge" data-stu-total-bottom="'+VA.escapeHtml(student)+'">'+VA.calcTotalForStudent(student).toFixed(1)+'</span></td>';
    tbody += "</tr></tbody>";
    return '<table class="table table-bordered table-sm align-middle">'+thead+tbody+"</table>";
  }
  VA.renderEvaluation = function(){
    $("#studentsTabs").empty(); $("#studentsTabContent").empty();
    renderMetaSummary();
    VA.app.students.forEach(function(stu,sIdx){
      const tabId="tab-"+sIdx, paneId="pane-"+sIdx, isActive=sIdx===0?'active':'', isShow=sIdx===0?'show active':'';
      $("#studentsTabs").append('<li class="nav-item" role="presentation">\
        <button class="nav-link '+isActive+'" id="'+tabId+'" data-bs-toggle="tab" data-bs-target="#'+paneId+'" type="button" role="tab">'+VA.escapeHtml(stu)+'</button>\
      </li>');
      const tableHtml = buildStudentTableHtml(stu);
      $("#studentsTabContent").append('<div class="tab-pane fade '+isShow+'" id="'+paneId+'" role="tabpanel" aria-labelledby="'+tabId+'">\
           <div class="toolbar d-flex justify-content-end">\
             <button class="btn btn-sm btn-outline-danger" data-export-pdf="'+VA.escapeHtml(stu)+'">Esporta PDF</button>\
           </div>\
           <div class="table-responsive">'+tableHtml+'</div>\
         </div>');
    });
    $("select[data-cell-select]").on("change", function(){
      const student = $(this).data("student");
      const indId   = Number($(this).data("indicator"));
      const exId    = Number($(this).data("exercise"));
      const val     = $(this).val();
      setSavedLevel(student, exId, indId, val === "" ? null : Number(val));
      VA.recalcForStudent(student);
    });
    $("[data-export-pdf]").on("click", function(){ VA.exportStudentPDF($(this).attr("data-export-pdf")); });
    VA.app.students.forEach(function(stu){ VA.recalcForStudent(stu); });
  };
  VA.recalcForStudent = function(student){
    VA.app.exercises.forEach(function(_, exIdx){
      const v = VA.calcExerciseScoreForStudent(student, exIdx);
      const max = VA.calcExerciseMaxScore(exIdx);
      $('[data-ex-score="'+CSS.escape(student)+'::'+exIdx+'"]').text(v.toFixed(1));
      $('[data-ex-max="'+CSS.escape(student)+'::'+exIdx+'"]').text(max.toFixed(1));
    });
    VA.app.indicators.forEach(function(ind){
      const m = VA.calcIndicatorMeanForStudent(student, ind.id);
      $('[data-ind-mean="'+CSS.escape(student)+'::'+ind.id+'"]').text(m.toFixed(2));
    });
    const tot = VA.calcTotalForStudent(student);
    $('[data-stu-total-bottom="'+CSS.escape(student)+'"]').text(tot.toFixed(1));
  };
})(window);
