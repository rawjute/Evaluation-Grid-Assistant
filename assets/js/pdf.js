(function(global){
  'use strict';
  const VA = global.VA;

  function cellScoreDivided(indicatorId, levelIdx){
    const coef = (levelIdx==null ? null : VA.LEVELS[levelIdx].coef);
    const indObj = VA.app.indicators.find(i=>i.id===indicatorId);
    if (!indObj || coef==null) return 0;
    const raw = indObj.max * coef;
    const cov = VA.coverageCountForIndicatorById(indicatorId) || 1;
    return raw / cov;
  }

  async function buildStudentPDFDoc(student){
    const jsPDFRef = window.jspdf;
    const doc = new jsPDFRef.jsPDF({ unit: 'pt', format: 'a4' });

    // Font base
    doc.setFont('helvetica', 'normal');

    // Titolo
    doc.setFontSize(14);
    doc.text('Griglia di valutazione - ' + student, 40, 40);

    // Header a due righe
    const exIds = VA.app.exercises.map(function(e){ return e.id; });
    const head = [[
      { content: '', styles: { halign: 'left' } },
      { content: 'Esercizi', colSpan: exIds.length, styles: { halign: 'center' } },
      { content: '', styles: { halign: 'center' } }
    ], [
      'Indicatore'
    ].concat(exIds.map(function(id){ return String(id); })).concat(['Totale'])];

    const body = [];

    // Righe per indicatore
    VA.app.indicators.forEach(function(ind){
      const row = [];
      row.push(ind.name);
      VA.app.exercises.forEach(function(ex){
        if ((ex.covers||[]).includes(ind.id)){
          const S=VA.app.resultsMap[student]; const E=S?S[ex.id]:null; const levelIdx = E?E[ind.id]:null;
          const label = (levelIdx==null) ? '—' : VA.LEVELS[levelIdx].label;
          const clean = (levelIdx==null) ? '—' : String(label).replace(/\s*\(\d+%\)/, '');
          const val = cellScoreDivided(ind.id, levelIdx);
          const txt = (levelIdx==null) ? '—' : (clean + '\n' + VA.floor2(val).toFixed(2));
          row.push({ content: txt });
        } else { row.push({ content: '—' }); }
      });
      // Totale per indicatore (media raw)
      const idxs=VA.app.exercises.map((e,i)=>(e.covers||[]).includes(ind.id)?i:-1).filter(i=>i>=0);
      let mean=0;
      if(idxs.length){
        let sum=0;
        idxs.forEach(function(exIdx){
          const ex=VA.app.exercises[exIdx];
          const S=VA.app.resultsMap[student]; const E=S?S[ex.id]:null; const levelIdx=E?E[ind.id]:null;
          const coef=(levelIdx==null? null : VA.LEVELS[levelIdx].coef);
          const indObj=VA.app.indicators.find(i=>i.id===ind.id);
          const raw = (!indObj || coef==null) ? 0 : (indObj.max*coef);
          sum += raw;
        });
        mean = VA.round2(sum/idxs.length);
      }
      const max  = VA.app.indicators.find(function(i){ return i.id === ind.id; })?.max || 0;
      row.push({ content: mean.toFixed(2) + ' / ' + (max.toFixed ? max.toFixed(1) : max), rawParts: { mean: mean.toFixed(2), max: (max.toFixed ? max.toFixed(1) : String(max)) } });
      body.push(row);
    });

    // Riga Totale per esercizio + totale prova
    const totalsRow = [];
    totalsRow.push('Totale');
    let grand = 0;
    const perExMax = VA.app.exercises.map(function(_, exIdx){ return VA.calcExerciseMaxScore(exIdx); });
    VA.app.exercises.forEach(function(ex, exIdx){
      const score = VA.calcExerciseScoreForStudent(student, exIdx);
      grand += score;
      const max = perExMax[exIdx];
      totalsRow.push({ content: score.toFixed(1) + ' / ' + max.toFixed(1), rawParts: { score: score.toFixed(1), max: max.toFixed(1) }, isTotalCell: true });
    });
    // Ultima cella: totale prova "X / 10"
    totalsRow.push({ content: (VA.round1(grand).toFixed(1) + ' / 10'), rawParts: { score: VA.round1(grand).toFixed(1), max: 10 }, isTotalCell: true });
    body.push(totalsRow);

    const col0Width = 100;
    const lastColIndex = exIds.length + 1; // indice colonna "Totale"

    doc.autoTable({
      head: head,
      body: body,
      startY: 60,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 6, right: 4, bottom: 6, left: 4 },
        lineHeight: 1.4,
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: 20,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: col0Width, fontStyle: 'bold' }
      },
      didParseCell: function(data){
        if (data.section === 'body') {
          const isLastRow = (data.row.index === body.length - 1);
          const isLastCol = (data.column.index === lastColIndex);
          const raw = data.cell && data.cell.raw ? data.cell.raw : {};
          // Evita testo auto per le celle che ridisegniamo (totali / grand total)
          if ((isLastCol && !isLastRow && raw.rawParts) || (isLastRow && (raw.isTotalCell))) {
            data.cell.text = [];
          }
          // Evita bold globale sulla colonna "Totale" per media indicatore
          if (!isLastRow && isLastCol) {
            data.cell.styles.fontStyle = 'normal';
          }
        }
      },
      didDrawCell: function(data){
        if (data.section !== 'body') return;
        const doc = data.doc;
        const cell = data.cell;
        const raw = cell.raw || {};
        const isTotalsRow = (data.row.index === body.length - 1);
        const isLastCol = (data.column.index === lastColIndex);

        const yMid = cell.y + cell.height / 2;

        // Helper: A (bold) / B (normal), centrato
        function drawPairBoldNormal(A, B, size){
          const oldSize = doc.getFontSize();
          doc.setFontSize(size);
          doc.setFont('helvetica', 'bold'); const wA = doc.getTextWidth(A);
          doc.setFont('helvetica', 'normal'); const wSepB = doc.getTextWidth(' / ' + B);
          const total = wA + wSepB;
          const x = cell.x + (cell.width - total) / 2;
          doc.setFont('helvetica', 'bold'); doc.text(A, x, yMid, { baseline: 'middle' });
          doc.setFont('helvetica', 'normal'); doc.text(' / ' + B, x + wA, yMid, { baseline: 'middle' });
          doc.setFontSize(oldSize);
        }

        // Colonna Totale per indicatore: bold solo il punteggio dello studente
        if (isLastCol && !isTotalsRow && raw.rawParts){
          drawPairBoldNormal(String(raw.rawParts.mean || ''), String(raw.rawParts.max || ''), 8);
        }

        // Riga Totale per esercizi: celle "score / max" con score bold
        if (isTotalsRow && raw.isTotalCell  && raw.rawParts){
          drawPairBoldNormal(String(raw.rawParts.score || ''), String(raw.rawParts.max || ''), 8);
        }
      }});

    // Spazio e legenda
    const _tableY = doc.lastAutoTable.finalY || 60;
    const _legendTop = _tableY + 28;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Legenda fasce', 40, _legendTop);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const legendLines = (function(){
      return VA.LEVELS.slice().reverse().map(function(lv){
        const name = String(lv.label).replace(/\s*\(\d+%\)/, '');
        const perc = Math.round(lv.coef * 100) + '%';
        return '• ' + name + ' = ' + perc;
      });
    })();
    let y = _legendTop + 14;
    legendLines.forEach(function(line){ doc.text(line, 52, y); y += 12; });

    return doc;
  }

  VA.exportStudentPDF = async function(student){
    const doc = await buildStudentPDFDoc(student);
    doc.save(student + '_griglia.pdf');
  };

  VA.exportAllPDFsZip = async function(){
    if (!window.JSZip){ alert("JSZip non caricato."); return; }
    if (!VA.app.students || !VA.app.students.length){ alert("Nessuno studente presente."); return; }
    const zip = new window.JSZip();
    for (const student of VA.app.students){
      const doc = await buildStudentPDFDoc(student);
      const blob = doc.output('blob');
      zip.file(student.replace(/[/\\?%*:|"<>]/g, '_') + "_griglia.pdf", blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = 'griglie_studenti_pdf.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  };

})(window);
