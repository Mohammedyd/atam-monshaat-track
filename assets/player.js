/* ATAM learning player: navigation, knowledge checks, graded test, SCORM 1.2 tracking. */
(function () {
  "use strict";
  function arQ(n){ return n===1?"سؤال واحد":n===2?"سؤالان":(n>=3&&n<=10)?n+" أسئلة":n+" سؤالاً"; }
  var C = window.ATAM_COURSE, S = window.ATAM_SCORM;
  var LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];
  var pages = [];            // {kind:'cover'|'lesson'|'test'|'closing', title, idx}
  var visited = {};          // lesson page index -> 1
  var test = { s: null, p: false, a: 0 };
  var cur = 0;

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function two(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- pages ---------- */
  pages.push({ kind: "cover", title: "البداية" });
  C.items.forEach(function (it, i) { pages.push({ kind: "lesson", title: it.title, item: it, n: i + 1 }); });
  pages.push({ kind: "test", title: C.test.title });
  pages.push({ kind: "closing", title: "الختام" });
  var lessonIdx = pages.map(function (p, i) { return p.kind === "lesson" ? i : -1; }).filter(function (i) { return i >= 0; });
  var testIdx = pages.length - 2, closeIdx = pages.length - 1;

  function lessonsDone() { return lessonIdx.every(function (i) { return visited[i]; }); }
  function testUnlocked() { return lessonsDone(); }

  /* ---------- persistence ---------- */
  function save() {
    var data = JSON.stringify({ v: Object.keys(visited).map(Number), t: test, l: cur });
    try { localStorage.setItem("atam." + C.id, data); } catch (e) {}
    if (S.available) { S.setSuspend(data); S.setLocation(String(cur)); S.commit(); }
  }
  function load() {
    var raw = S.available ? S.suspend() : "";
    if (!raw) { try { raw = localStorage.getItem("atam." + C.id) || ""; } catch (e) {} }
    if (!raw) return null;
    try {
      var d = JSON.parse(raw);
      (d.v || []).forEach(function (i) { visited[i] = 1; });
      if (d.t) test = d.t;
      return typeof d.l === "number" ? d.l : null;
    } catch (e) { return null; }
  }

  /* ---------- sidebar ---------- */
  function buildSide() {
    document.getElementById("sideNum").textContent = C.eyebrow;
    document.getElementById("sideTitle").textContent = C.title;
    var toc = document.getElementById("toc");
    toc.innerHTML = "";
    pages.forEach(function (p, i) {
      if (p.kind === "test") toc.appendChild(el("li", { class: "sep", "aria-hidden": "true" }, "التقييم"));
      if (p.kind === "closing") return;
      var li = el("li");
      var um = p.kind === "lesson" ? /^الوحدة\s*(\d+)\s*:\s*/.exec(p.title) : null;
      var label = p.kind === "cover" ? "·" : p.kind === "test" ? "✓" : um ? two(+um[1]) : "·";
      var shown = um ? p.title.slice(um[0].length) : p.title;
      var b = el("button", { type: "button", "data-i": i },
        '<span class="idx">' + label + '</span><span class="t">' + esc(shown) + '</span><span class="dot" aria-hidden="true"></span>');
      b.addEventListener("click", function () { go(i); closeSide(); });
      li.appendChild(b); toc.appendChild(li);
    });
    refreshSide();
  }
  function refreshSide() {
    Array.prototype.forEach.call(document.querySelectorAll("#toc button"), function (b) {
      var i = +b.getAttribute("data-i");
      b.setAttribute("aria-current", i === cur ? "true" : "false");
      var done = (pages[i].kind === "lesson" && visited[i]) || (pages[i].kind === "test" && test.p) || (pages[i].kind === "cover" && cur > 0);
      b.parentNode.className = done ? "done" : "";
      if (pages[i].kind === "test" && !testUnlocked()) b.title = "يُفتح بعد إكمال جميع الوحدات";
    });
    var n = lessonIdx.length ? lessonIdx.filter(function (i) { return visited[i]; }).length : 0;
    var total = lessonIdx.length + 1, got = n + (test.p ? 1 : 0);
    var pct = Math.round(got / total * 100);
    document.querySelector(".progress i").style.width = pct + "%";
    document.getElementById("progTxt").textContent = pct + "%";
    document.getElementById("progDesc").textContent = lessonIdx.length ? (n + " من " + lessonIdx.length + " وحدات") : (test.p ? "اجتزت الاختبار" : "لم يُجتز بعد");
  }
  function openSide() { document.getElementById("side").classList.add("open"); document.getElementById("scrim").classList.add("show"); }
  function closeSide() { document.getElementById("side").classList.remove("open"); document.getElementById("scrim").classList.remove("show"); }

  /* ---------- question rendering ---------- */
  function renderQuestion(q, num, mode, onAnswer) {
    // mode 'check': immediate feedback. mode 'test': select only.
    var box = el("div", { class: mode === "check" ? "kq" : "test-q", "data-qid": q.id });
    box.appendChild(el("span", { class: "q-num" }, "السؤال " + num));
    box.appendChild(el("p", { class: "q-text" }, esc(q.text)));
    var opts = el("div", { class: "opts", role: "radiogroup" });
    var chosen = null, locked = false;
    q.options.forEach(function (o, i) {
      var b = el("button", { type: "button", class: "opt", role: "radio", "aria-checked": "false" },
        '<span class="k">' + LETTERS[i] + '</span><span>' + esc(o) + '</span>');
      b.addEventListener("click", function () {
        if (locked) return;
        chosen = i;
        Array.prototype.forEach.call(opts.children, function (c, j) { c.setAttribute("aria-checked", j === i ? "true" : "false"); });
        if (mode === "check") reveal();
        if (onAnswer) onAnswer(q, i);
      });
      opts.appendChild(b);
    });
    box.appendChild(opts);
    function reveal() {
      locked = true;
      Array.prototype.forEach.call(opts.children, function (c, j) {
        c.setAttribute("aria-disabled", "true");
        if (j === q.correctIndex) c.classList.add("is-right");
        else if (j === chosen) c.classList.add("is-wrong");
      });
      var ok = chosen === q.correctIndex;
      var fb = el("div", { class: "fb" + (ok ? "" : " no"), role: "status" },
        "<b>" + (ok ? "إجابة صحيحة" : "الإجابة الصحيحة: " + LETTERS[q.correctIndex]) + "</b>" + esc(q.explanation || ""));
      box.appendChild(fb);
      if (mode === "check") {
        var again = el("div", { class: "actions" });
        var rb = el("button", { type: "button", class: "btn" }, "إعادة السؤال");
        rb.addEventListener("click", function () { var n2 = renderQuestion(q, num, mode, onAnswer); box.parentNode.replaceChild(n2, box); });
        again.appendChild(rb); box.appendChild(again);
      }
    }
    box._reveal = reveal;
    return box;
  }

  /* ---------- views ---------- */
  var view;
  function pager() {
    var p = el("nav", { class: "pager", "aria-label": "التنقل بين الصفحات" });
    var prev = el("button", { type: "button", class: "btn" }, "السابق");
    prev.disabled = cur === 0;
    prev.addEventListener("click", function () { go(cur - 1); });
    var nextI = cur + 1, label = "التالي";
    if (pages[nextI] && pages[nextI].kind === "test") label = "إلى الاختبار";
    var next = el("button", { type: "button", class: "btn primary" }, label + ' <span class="arr">←</span>');
    if (pages[cur].kind === "test" || pages[cur].kind === "closing") next.style.visibility = "hidden";
    next.addEventListener("click", function () { go(nextI); });
    p.appendChild(prev); p.appendChild(next);
    return p;
  }

  function coverView() {
    var c = el("section", { class: "cover" });
    c.style.backgroundImage = "url(" + C.cover + ")";
    c.appendChild(el("div", { class: "brackets", "aria-hidden": "true" }));
    var inn = el("div", { class: "cover-in" });
    inn.appendChild(el("div", { class: "num" }, esc(C.eyebrow)));
    inn.appendChild(el("h1", null, esc(C.title)));
    inn.appendChild(el("p", { class: "tag" }, esc(C.tagline)));
    var f = el("div", { class: "facts" });
    C.facts.forEach(function (x) { f.appendChild(el("div", null, "<b>" + esc(x[0]) + "</b><span>" + esc(x[1]) + "</span>")); });
    inn.appendChild(f);
    var row = el("div", { class: "row" });
    var started = Object.keys(visited).length > 0 || test.a > 0;
    var b = el("button", { type: "button", class: "btn primary" }, (started ? "متابعة التعلم" : "ابدأ البرنامج") + ' <span class="arr">←</span>');
    b.addEventListener("click", function () {
      if (started) {
        var firstOpen = lessonIdx.filter(function (i) { return !visited[i]; })[0];
        go(firstOpen != null ? firstOpen : testIdx);
      } else go(1);
    });
    row.appendChild(b);
    inn.appendChild(row);
    var intro = el("div", { class: "content", style: "margin-top:36px;max-width:680px" }, C.welcomeHtml);
    inn.appendChild(intro);
    inn.appendChild(el("div", { class: "partner" }, '<img src="../assets/img/atam-wordmark-white.png" alt="atam"><span>·</span><span>برنامج مقدَّم ضمن أكاديمية منشآت</span>'));
    c.appendChild(inn);
    return c;
  }

  function lessonView(p) {
    var w = el("article", { class: "page" });
    var head = el("header", { class: "lesson-head" });
    var um = /^الوحدة\s*(\d+)/.exec(p.title);
    head.appendChild(el("span", { class: "eyebrow" }, esc(C.shortName) + " · " + (um ? "الوحدة " + two(+um[1]) : "القسم " + two(p.n) + " من " + two(lessonIdx.length))));
    head.appendChild(el("h1", null, esc(p.title.replace(/^الوحدة\s*\d+\s*:\s*/, ""))));
    w.appendChild(head);
    var body = el("div", { class: "content" }, p.item.html.replace(/@@QUIZ(\d+)@@/g, '<div data-q="$1"></div>'));
    Array.prototype.forEach.call(body.querySelectorAll("[data-q]"), function (slot) {
      var set = p.item.quizzes[+slot.getAttribute("data-q")] || [];
      var frag = document.createDocumentFragment();
      set.forEach(function (q, k) { frag.appendChild(renderQuestion(q, k + 1, "check")); });
      slot.parentNode.replaceChild(frag, slot);
    });
    Array.prototype.forEach.call(body.querySelectorAll("a[href^='http']"), function (a) { a.target = "_blank"; a.rel = "noopener"; });
    w.appendChild(body);
    return w;
  }

  function testView() {
    var w = el("section", { class: "page" });
    var head = el("header", { class: "lesson-head" });
    head.appendChild(el("span", { class: "eyebrow" }, "التقييم"));
    head.appendChild(el("h1", null, esc(C.test.title)));
    w.appendChild(head);
    if (!testUnlocked()) {
      var remaining = lessonIdx.filter(function (i) { return !visited[i]; }).length;
      w.appendChild(el("div", { class: "test-intro" }, "<p style='margin:0'>يُفتح الاختبار بعد إكمال جميع وحدات البرنامج. المتبقي: " + remaining + " من " + lessonIdx.length + " وحدات.</p>"));
      var go1 = el("button", { type: "button", class: "btn primary" }, "العودة إلى أول وحدة لم تُكمل");
      go1.addEventListener("click", function () { go(lessonIdx.filter(function (i) { return !visited[i]; })[0]); });
      w.appendChild(go1);
      return w;
    }
    var pm = C.test.passMark;
    w.appendChild(el("div", { class: "test-intro" },
      "<p style='margin:0 0 6px'>" + esc(C.test.instructions) + "</p><p style='margin:0;color:var(--quiet);font-size:15px'>" +
      arQ(C.test.questions.length) + " · درجة النجاح " + pm + "% · المحاولات السابقة: " + test.a +
      (test.s != null ? " · آخر درجة: " + test.s + "%" : "") + "</p>"));
    if (test.p) {
      w.appendChild(resultBox(test.s, true, true));
    }
    var answers = {};
    var list = el("div");
    var nodes = [];
    C.test.questions.forEach(function (q, k) {
      var n = renderQuestion(q, k + 1, "test", function (qq, i) { answers[qq.id] = i; upd(); });
      nodes.push(n); list.appendChild(n);
    });
    w.appendChild(list);
    var bar = el("div", { class: "pager" });
    var info = el("span", { style: "color:var(--quiet);font-size:14px;align-self:center" });
    var submit = el("button", { type: "button", class: "btn primary" }, "تسليم الإجابات");
    function upd() {
      var n = Object.keys(answers).length;
      info.textContent = "أجبت عن " + n + " من " + C.test.questions.length;
      submit.disabled = n < C.test.questions.length;
    }
    upd();
    submit.addEventListener("click", function () {
      var right = 0;
      C.test.questions.forEach(function (q) { if (answers[q.id] === q.correctIndex) right++; });
      var score = Math.round(right / C.test.questions.length * 100);
      var passed = score >= pm;
      test.a += 1; test.s = score; test.p = test.p || passed;
      nodes.forEach(function (n) { n._reveal(); });
      if (S.available) {
        S.setScore(score);
        if (test.p) S.setStatus("passed");
        else S.setStatus("incomplete");
      }
      save(); refreshSide();
      submit.remove();
      var res = resultBox(score, passed, false);
      w.insertBefore(res, list);
      var actions = el("div", { class: "row", style: "display:flex;gap:12px;margin:0 0 20px" });
      if (!passed) {
        var retry = el("button", { type: "button", class: "btn primary" }, "إعادة المحاولة");
        retry.addEventListener("click", function () { render(); });
        actions.appendChild(retry);
      } else {
        var fin = el("button", { type: "button", class: "btn primary" }, "إلى صفحة الختام" + ' <span class="arr">←</span>');
        fin.addEventListener("click", function () { go(closeIdx); });
        actions.appendChild(fin);
      }
      w.insertBefore(actions, list);
      res.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    bar.appendChild(info); bar.appendChild(submit);
    w.appendChild(bar);
    return w;
  }
  function resultBox(score, passed, previous) {
    var r = el("div", { class: "result " + (passed ? "pass" : "fail"), role: "status" });
    r.appendChild(el("div", { class: "score" }, score + "<small>%</small>"));
    r.appendChild(el("div", null, "<h2>" + (passed ? (previous ? "سبق أن اجتزت هذا الاختبار" : "اجتزت الاختبار") : "لم تبلغ درجة النجاح") + "</h2><p>" +
      (passed ? "سُجّل اجتيازك في المنصة. يمكنك مراجعة الإجابات أو إعادة الاختبار دون أن يتأثر اجتيازك." :
        "درجة النجاح " + C.test.passMark + "%. راجع الشرح تحت كل سؤال، ثم أعد المحاولة.") + "</p>"));
    return r;
  }
  function closingView() {
    var w = el("section", { class: "page" });
    var head = el("header", { class: "lesson-head" });
    head.appendChild(el("span", { class: "eyebrow" }, "الختام"));
    head.appendChild(el("h1", null, test.p ? "أتممت البرنامج" : "لم يكتمل البرنامج بعد"));
    w.appendChild(head);
    w.appendChild(el("div", { class: "content" }, C.closingHtml));
    if (!test.p) w.appendChild(el("p", { class: "notice" }, "يكتمل البرنامج بإكمال الوحدات واجتياز الاختبار بدرجة " + C.test.passMark + "% فأكثر."));
    return w;
  }

  function render() {
    var p = pages[cur];
    view.innerHTML = "";
    var node = p.kind === "cover" ? coverView() : p.kind === "lesson" ? lessonView(p) : p.kind === "test" ? testView() : closingView();
    view.appendChild(node);
    if (p.kind !== "cover") view.appendChild(pager());
    document.getElementById("crumb").textContent = C.shortName + "  ·  " + p.title;
    refreshSide();
    window.scrollTo(0, 0);
    var h = view.querySelector("h1"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  function go(i) {
    if (i < 0 || i >= pages.length) return;
    cur = i;
    if (pages[i].kind === "lesson") visited[i] = 1;
    save();
    render();
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    document.title = C.title + " · أتام";
    S.init();
    view = document.getElementById("view");
    var last = load();
    buildSide();
    document.getElementById("menuBtn").addEventListener("click", openSide);
    document.getElementById("scrim").addEventListener("click", closeSide);
    document.getElementById("tocBtn").addEventListener("click", function () { go(0); });
    document.addEventListener("keydown", function (e) {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.altKey && e.key === "ArrowLeft") go(cur + 1);
      if (e.altKey && e.key === "ArrowRight") go(cur - 1);
      if (e.key === "Escape") closeSide();
    });
    cur = 0;
    if (last != null && last > 0 && last < pages.length) { cur = 0; }
    render();
    if (S.available && test.p && S.status() !== "passed") { S.setStatus("passed"); S.commit(); }
  });
})();
