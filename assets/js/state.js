(function(global){
  'use strict';
  const VA = global.VA = (global.VA||{});
  VA.app = { students: [], indicators: [], exercises: [], resultsMap: {}, dirty: false };
  VA.markDirty = function(){ VA.app.dirty = true; };
  VA.markClean = function(){ VA.app.dirty = false; };
  window.addEventListener("beforeunload", function (e) { if (!VA.app.dirty) return; e.preventDefault(); e.returnValue = ""; });
  VA.levelToCoef = function(i){ if(i==null||isNaN(i))return null; const idx=Number(i); if(idx<0||idx>4)return null; return VA.LEVELS[idx].coef; };
})(window);
