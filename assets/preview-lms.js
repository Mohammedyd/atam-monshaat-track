/* نسخة الفريق الداخلي: محاكاة واجهة SCORM 1.2 داخل المتصفح. لا تُرفع إلى منصة منشآت. */
(function () {
  "use strict";
  var PROGRAM_IDS = ["ATAM-SPORT-P01-INVESTMENT", "ATAM-SPORT-P02-TRADEMARKS", "ATAM-SPORT-P03-GOVERNANCE", "ATAM-SPORT-P04-SPONSORSHIPS"];
  var EXAM_ID = "ATAM-SPORT-TRACK-FINAL";
  var D = null, KEY = null;
  function cid() { return (window.ATAM_COURSE && window.ATAM_COURSE.id) || "unknown"; }
  function load() {
    if (D) return;
    KEY = "atam.preview.lms." + cid();
    try { D = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { D = {}; }
    if (!D["cmi.core.lesson_status"]) D["cmi.core.lesson_status"] = "not attempted";
    D["cmi.core.student_name"] = "متدرب تجريبي";
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} paint(); }
  window.API = {
    LMSInitialize: function () { load(); return "true"; },
    LMSFinish: function () { load(); save(); return "true"; },
    LMSGetValue: function (k) { load(); return D[k] == null ? "" : String(D[k]); },
    LMSSetValue: function (k, v) { load(); D[k] = String(v); save(); return "true"; },
    LMSCommit: function () { load(); save(); return "true"; },
    LMSGetLastError: function () { return "0"; },
    LMSGetErrorString: function () { return ""; },
    LMSGetDiagnostic: function () { return ""; }
  };
  function statusOf(id) {
    try { return (JSON.parse(localStorage.getItem("atam.preview.lms." + id) || "{}")["cmi.core.lesson_status"]) || "not attempted"; } catch (e) { return "not attempted"; }
  }
  var ST = { "not attempted": "لم يبدأ", "incomplete": "غير مكتمل", "passed": "ناجح", "failed": "لم يجتز", "completed": "مكتمل" };
  function paint() {
    var p = document.getElementById("lmsPanel"); if (!p || !D) return;
    var st = D["cmi.core.lesson_status"] || "";
    p.querySelector("[data-k=st]").textContent = (ST[st] || st) + " (" + st + ")";
    p.querySelector("[data-k=sc]").textContent = D["cmi.core.score.raw"] ? D["cmi.core.score.raw"] + " / 100" : "لا توجد";
    p.querySelector("[data-k=tm]").textContent = D["cmi.core.session_time"] || "تُسجل عند الإغلاق";
  }
  var css = "#lmsPanel{position:fixed;left:16px;bottom:16px;z-index:50;width:250px;background:#06090a;border:1px solid rgba(216,222,220,.22);border-top:2px solid #346574;font-size:13px;line-height:1.6;color:#d8dedc;box-shadow:0 10px 30px rgba(0,0,0,.45)}" +
    "#lmsPanel .lp-toggle{all:unset;display:block;width:100%;box-sizing:border-box;padding:9px 14px;cursor:pointer;font-weight:600;letter-spacing:.06em;color:#73909a}" +
    "#lmsPanel .lp-body{padding:0 14px 14px}#lmsPanel.min .lp-body{display:none}#lmsPanel .lp-note{color:#8fa3a9;font-size:12px;margin-bottom:8px}" +
    "#lmsPanel dl{margin:0 0 10px;display:grid;grid-template-columns:auto 1fr;gap:4px 10px}#lmsPanel dt{color:#73909a}#lmsPanel dd{margin:0;color:#eef1f0}" +
    "#lmsPanel .lp-btn{appearance:none;display:block;box-sizing:border-box;width:100%;text-align:center;text-decoration:none;border:1px solid rgba(216,222,220,.22);background:transparent;color:#d8dedc;padding:7px;margin-top:6px;cursor:pointer;font:inherit}" +
    "#lmsPanel .lp-btn:hover{border-color:#73909a}" +
    "#examGate{position:fixed;inset:0;z-index:60;background:rgba(6,9,10,.94);display:grid;place-items:center;padding:24px}" +
    "#examGate .box{max-width:520px;background:#12181a;border:1px solid rgba(216,222,220,.14);border-right:2px solid #346574;padding:28px;color:#c9d1cf;line-height:1.9}" +
    "#examGate h2{margin:0 0 8px;color:#d8dedc;font-size:22px}#examGate ul{padding-right:20px;margin:10px 0 18px}#examGate .row{display:flex;gap:10px;flex-wrap:wrap}" +
    "#side #lmsPanel{position:static;width:auto;margin:0 16px 16px;box-shadow:none}@media (max-width:600px){#lmsPanel{width:calc(100% - 32px)}#lmsPanel:not(.min){max-height:60vh;overflow:auto}}";
  document.addEventListener("DOMContentLoaded", function () {
    load();
    var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    var tb = document.querySelector(".topbar");
    if (tb) { var a = document.createElement("a"); a.href = "../"; a.className = "btn"; a.textContent = "المسار"; a.style.textDecoration = "none"; tb.insertBefore(a, tb.lastElementChild); }
    var p = document.createElement("aside"); p.id = "lmsPanel";
    p.innerHTML = '<button type="button" class="lp-toggle" aria-expanded="true">وضع المعاينة · الفريق الداخلي</button>' +
      '<div class="lp-body"><div class="lp-note">محاكاة لما ستسجله منصة منشآت</div>' +
      '<dl><dt>الحالة</dt><dd data-k="st"></dd><dt>الدرجة</dt><dd data-k="sc"></dd><dt>مدة الجلسة</dt><dd data-k="tm"></dd></dl>' +
      '<a class="lp-btn" href="../">العودة إلى صفحة المسار</a><button type="button" class="lp-btn lp-reset">إعادة هذا البرنامج من البداية</button></div>';
    var side = document.getElementById("side");
    if (side && window.innerWidth > 980) side.appendChild(p); else { p.classList.add("min"); document.body.appendChild(p); }
    p.querySelector(".lp-toggle").onclick = function () { p.classList.toggle("min"); };
    p.querySelector(".lp-reset").onclick = function () {
      try { localStorage.removeItem(KEY); localStorage.removeItem("atam." + cid()); } catch (e) {}
      if (window.ATAM_SCORM) window.ATAM_SCORM.finish = function () {};
      location.reload();
    };
    paint();
    if (cid() === EXAM_ID) {
      var pending = PROGRAM_IDS.filter(function (id) { return statusOf(id) !== "passed"; });
      if (pending.length && statusOf(EXAM_ID) !== "passed") {
        var names = (window.ATAM_TRACK_NAMES || {});
        var g = document.createElement("div"); g.id = "examGate";
        g.innerHTML = '<div class="box"><h2>الاختبار الختامي يُؤدى بعد البرامج الأربعة</h2>' +
          '<p>في المسار الفعلي يُتاح هذا الاختبار بعد اجتياز البرامج الأربعة. البرامج التي لم تُجتز بعد في هذا المتصفح: ' + pending.length + ' من 4.</p>' +
          '<div class="row"><a class="btn primary" href="../" style="text-decoration:none">العودة إلى المسار</a>' +
          '<button type="button" class="btn" id="gateSkip">متابعة للتجربة فقط</button></div></div>';
        document.body.appendChild(g);
        document.getElementById("gateSkip").onclick = function () { g.remove(); };
      }
    }
  });
})();
