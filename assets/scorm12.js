/* SCORM 1.2 runtime wrapper. Finds the LMS API in parent frames or the opener window.
   When no LMS is present (local preview) every call becomes a safe no-op. */
(function (w) {
  "use strict";
  var api = null, started = false, finished = false, t0 = new Date();

  function find(win) {
    var hops = 0;
    while (win && !win.API && win.parent && win.parent !== win && hops < 12) { hops++; win = win.parent; }
    return (win && win.API) ? win.API : null;
  }
  function locate() {
    var a = null;
    try { a = find(w); } catch (e) {}
    if (!a) { try { if (w.opener) a = find(w.opener); } catch (e) {} }
    if (!a) { try { if (w.top && w.top.opener) a = find(w.top.opener); } catch (e) {} }
    return a;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function sessionTime() {
    var s = Math.max(0, Math.round((new Date() - t0) / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h < 10 ? "000" : h < 100 ? "00" : h < 1000 ? "0" : "") + h + ":" + pad(m) + ":" + pad(sec);
  }
  function get(k) { if (!api) return ""; try { return String(api.LMSGetValue(k) || ""); } catch (e) { return ""; } }
  function set(k, v) { if (!api) return false; try { return api.LMSSetValue(k, String(v)) === "true"; } catch (e) { return false; } }
  function commit() { if (!api) return false; try { return api.LMSCommit("") === "true"; } catch (e) { return false; } }

  var S = {
    available: false,
    init: function () {
      api = locate();
      if (!api) return false;
      try { started = api.LMSInitialize("") === "true"; } catch (e) { started = false; }
      if (!started) { api = null; return false; }
      S.available = true;
      var st = get("cmi.core.lesson_status");
      if (!st || st === "not attempted") set("cmi.core.lesson_status", "incomplete");
      commit();
      return true;
    },
    get: get, set: set, commit: commit,
    status: function () { return get("cmi.core.lesson_status"); },
    setStatus: function (s) { set("cmi.core.lesson_status", s); },
    setScore: function (raw) {
      set("cmi.core.score.min", 0); set("cmi.core.score.max", 100); set("cmi.core.score.raw", Math.round(raw));
    },
    suspend: function () { return get("cmi.suspend_data"); },
    setSuspend: function (s) { set("cmi.suspend_data", s.length > 4000 ? s.slice(0, 4000) : s); },
    location: function () { return get("cmi.core.lesson_location"); },
    setLocation: function (s) { set("cmi.core.lesson_location", s); },
    learnerName: function () { return get("cmi.core.student_name"); },
    finish: function () {
      if (!api || finished) return;
      finished = true;
      set("cmi.core.session_time", sessionTime());
      var st = get("cmi.core.lesson_status");
      set("cmi.core.exit", (st === "passed" || st === "completed") ? "" : "suspend");
      commit();
      try { api.LMSFinish(""); } catch (e) {}
    }
  };
  w.ATAM_SCORM = S;
  w.addEventListener("beforeunload", S.finish);
  w.addEventListener("pagehide", S.finish);
})(window);
