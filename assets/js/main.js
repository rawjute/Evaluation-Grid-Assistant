(function(global){
  'use strict';
  const VA = global.VA;
  $(function(){
    function loadStudentsFromFile(file){
      const reader=new FileReader();
      reader.onload=function(e){
        const list=VA.parseStudentsText(String(e.target.result||""));
        VA.app.students=list; VA.renderStudentsPreview();
        if(!list.length) alert("Nessun nome valido trovato nel file."); VA.markDirty();
      };
      reader.readAsText(file);
    }
    $("#studentFile").on("change", function(){ const file=this.files[0]; if(file) loadStudentsFromFile(file); });
    const drop=document.getElementById("studentsDrop");
    ["dragenter","dragover"].forEach(function(evt){ drop.addEventListener(evt,function(e){ e.preventDefault(); e.stopPropagation(); drop.classList.add("dragover"); }); });
    ["dragleave","drop"].forEach(function(evt){ drop.addEventListener(evt,function(e){ e.preventDefault(); e.stopPropagation(); drop.classList.remove("dragover"); }); });
    drop.addEventListener("drop",function(e){ const file=e.dataTransfer.files&&e.dataTransfer.files[0]; if(file){ $("#studentFile")[0].files=e.dataTransfer.files; const changeEvt=new Event("change"); $("#studentFile")[0].dispatchEvent(changeEvt);} });
    $("#parseStudentsPasteBtn").on("click", function(){ const text=$("#studentsPaste").val(); const list=VA.parseStudentsText(text); VA.app.students=list; VA.renderStudentsPreview(); if(!list.length) alert("Nessun nome valido nel testo incollato."); VA.markDirty(); });
    $("#clearStudentsBtn").on("click", function(){ VA.app.students=[]; VA.renderStudentsPreview(); $("#studentFile").val(""); $("#studentsPaste").val(""); VA.markDirty(); });
    $("#addIndicatorRow").on("click", function(){ VA.addIndicatorRow(); VA.refreshExercisesIndicatorsColumns(); VA.recalcSetupPreview(); VA.markDirty(); });
    $("#indicatorsTable").on("input",".indicator-name, .indicator-max", function(){ VA.refreshExercisesIndicatorsColumns(); VA.recalcSetupPreview(); VA.markDirty(); });
    $("#generateExercisesBtn").on("click", function(){ const n=parseInt($("#exerciseCount").val(),10)||0; VA.ensureExerciseRows(n); VA.markDirty(); });
    $("#exercisesTable").on("input",".ex-mod", function(){ VA.recalcSetupPreview(); VA.markDirty(); });
    $("#exercisesTable").on("change",".cover-ind", function(){ VA.recalcSetupPreview(); VA.markDirty(); });
    $("#startEvalBtn").on("click", function(){ try{ VA.collectConfigOrThrow(); $("#setupSection").addClass("d-none"); $("#evaluationSection").removeClass("d-none"); VA.renderEvaluation(); } catch(err){ alert(err.message); } });
    $("#backToSetupBtn").on("click", function(){ $("#evaluationSection").addClass("d-none"); $("#setupSection").removeClass("d-none"); VA.recalcSetupPreview(); });
    $("#exportConfigOnlyBtn").on("click", VA.exportConfigOnly);
    $("#exportAllBtn").on("click", VA.exportAll);
    $("#exportAllPDFZipBtn").on("click", VA.exportAllPDFsZip);
    $("#importFile").on("change", function(){ const file=this.files[0]; if(file) VA.importAnyFromFile(file); this.value=""; });
  });
})(window);
