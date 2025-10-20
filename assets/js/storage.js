(function(global){
  'use strict';
  const VA = global.VA;
  function toResultsArray(){
    return VA.app.students.map(function(stu){
      const exArr = VA.app.exercises.map(function(ex){
        const indicators = (ex.covers||[]).map(function(indId){
          const lvl = (VA.app.resultsMap[stu] && VA.app.resultsMap[stu][ex.id]) ? VA.app.resultsMap[stu][ex.id][indId] : null;
          return { id: indId, level: (lvl==null? null : Number(lvl)) };
        });
        return { id: ex.id, indicators };
      });
      return { name: stu, exercises: exArr };
    });
  }
  VA.exportConfigOnly = function(){
    VA.collectConfigOrThrow();
    const meta = VA.app.meta || {};
    const payload = {
      version: "1.1",
      meta: {
        subject: meta.subject || "",
        examName: meta.examName || "",
        date: meta.date || "",
        classRoom: meta.classRoom || ""
      },
      students: VA.app.students,
      indicators: VA.app.indicators,
      exercises: VA.app.exercises.map(function(e){ return { id:e.id, modifier:e.modifier, covers:e.covers.slice() }; })
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "configurazione_verifica.json"; a.click(); URL.revokeObjectURL(a.href);
    VA.markClean();
  };
  VA.exportAll = function(){
    VA.collectConfigOrThrow();
    const meta = VA.app.meta || {};
    const payload = {
      version: "1.1",
      meta: {
        subject: meta.subject || "",
        examName: meta.examName || "",
        date: meta.date || "",
        classRoom: meta.classRoom || ""
      },
      students: VA.app.students,
      indicators: VA.app.indicators,
      exercises: VA.app.exercises.map(function(e){ return { id:e.id, modifier:e.modifier, covers:e.covers.slice() }; }),
      results: toResultsArray()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "verifica_completa.json"; a.click(); URL.revokeObjectURL(a.href);
    VA.markClean();
  };
  VA.buildResultsMapFromArray = function(resultsArray){
    VA.app.resultsMap = {};
    (resultsArray || []).forEach(function(stuObj){
      const stu = stuObj.name; if (!stu) return;
      VA.app.resultsMap[stu] = VA.app.resultsMap[stu] || {};
      (stuObj.exercises || []).forEach(function(exObj){
        const exId = Number(exObj.id); if (!exId) return;
        VA.app.resultsMap[stu][exId] = VA.app.resultsMap[stu][exId] || {};
        (exObj.indicators || []).forEach(function(indEntry){
          const indId = Number(indEntry.id);
          if (!indId && indId !== 0) return;
          const lvl = (indEntry.level == null ? null : Number(indEntry.level));
          if (lvl != null && (lvl < 0 || lvl > 4)) return;
          VA.app.resultsMap[stu][exId][indId] = lvl;
        });
      });
    });
  };
  VA.importAnyFromFile = function(file){
    const reader = new FileReader();
    reader.onload = function(e){
      try {
        const data = JSON.parse(e.target.result);
        if (data.version !== "1.0" && data.version !== "1.1") throw new Error("Versione non supportata (attesa 1.0 o 1.1).");
        VA.app.students   = Array.isArray(data.students) ? data.students.slice() : [];
        VA.app.indicators = (Array.isArray(data.indicators) ? data.indicators.slice() : []).map(function(ind){ return { id:Number(ind.id), name: ind.name, max: Number(ind.max) }; });
        VA.app.indicators.sort(function(a,b){ return a.id-b.id; });
        VA.app.exercises  = (Array.isArray(data.exercises) ? data.exercises.slice() : []).map(function(ex){ return { id:Number(ex.id), modifier:Number(ex.modifier)||0, covers:(ex.covers||[]).map(Number) }; });
        VA.app.exercises.sort(function(a,b){ return a.id-b.id; });
        const rawMeta = data.meta || {};
        VA.app.meta = {
          subject: String(rawMeta.subject || "").trim(),
          examName: String(rawMeta.examName || "").trim(),
          date: String(rawMeta.date || "").trim(),
          classRoom: String(rawMeta.classRoom || "").trim()
        };
        VA.applyMetaToInputs();
        $("#indicatorsTable tbody").empty();
        VA.app.indicators.forEach(function(ind){ VA.addIndicatorRow(ind.name, ind.max, ind.id); });
        VA.ensureExerciseRows(VA.app.exercises.length || Number($("#exerciseCount").val())||0);
        $("#exercisesTable tbody tr").each(function(i){
          const ex = VA.app.exercises[i]; if (!ex) return;
          $(this).attr("data-ex-id", ex.id);
          $(this).find(".id-badge").text(ex.id);
          $(this).find(".ex-mod").val(ex.modifier || 0);
        });
        VA.refreshExercisesIndicatorsColumns();
        VA.renderStudentsPreview();
        VA.recalcSetupPreview();
        VA.buildResultsMapFromArray(data.results || []);
        const hasResults = Array.isArray(data.results) && data.results.length>0;
        if (hasResults){ $("#setupSection").addClass("d-none"); $("#evaluationSection").removeClass("d-none"); VA.renderEvaluation(); }
        else { $("#evaluationSection").addClass("d-none"); $("#setupSection").removeClass("d-none"); }
        alert(hasResults ? "Verifica completa importata." : "Configurazione importata.");
        VA.markClean();
      } catch(err){
        console.error(err);
        alert("Errore nell'importazione: " + err.message);
      }
    };
    reader.readAsText(file);
  };
})(window);
