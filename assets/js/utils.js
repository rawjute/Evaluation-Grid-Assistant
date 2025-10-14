(function(global){
  'use strict';
  const VA = global.VA = (global.VA||{});
  VA.LEVELS = [
    { label: "Gravemente insufficiente (20%)", coef: 0.2 },
    { label: "Insufficiente (45%)",            coef: 0.45 },
    { label: "Sufficiente (60%)",              coef: 0.6 },
    { label: "Buono (80%)",                    coef: 0.8 },
    { label: "Eccellente (100%)",              coef: 1.0 }
  ];
  VA.round2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  VA.round1 = x => Math.round((x + Number.EPSILON) * 10) / 10;
  VA.floor2 = x => Math.floor((x + Number.EPSILON) * 100) / 100;
  VA.escapeHtml = function(str){
    return String(str).replace(/[&<>\"']/g, function(c){
      return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" })[c];
    });
  };
})(window);
