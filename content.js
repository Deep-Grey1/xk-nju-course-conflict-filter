
// ================== 获取已选课表 =====================
async function getSelectedTimeTexts() {
  const student = JSON.parse(sessionStorage.getItem("studentInfo") || "null");
  if (!student || !student.electiveBatch) return [];

  const campus = (JSON.parse(sessionStorage.getItem("currentCampus") || "{}").code) || "";
  const type =
    sessionStorage.getItem("teachingClassTypeSecond") ||
    sessionStorage.getItem("teachingClassType") ||
    "";

  const data = {
    studentCode: student.code,
    electiveBatchCode: student.electiveBatch.code,
    other: "99",
    teachingClassType: type,
    queryContent: "",
    checkConflict: "2",
    checkCapacity: "2"
  };
  if (campus) data.campus = campus;

  const querySetting = JSON.stringify({
    data,
    pageSize: "10",
    pageNumber: "0",
    order: ""
  });

  const resp = await fetch(location.origin + "/xsxkapp/sys/xsxkapp/elective/courseResult.do", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      token: sessionStorage.token,
      language: sessionStorage.getItem("language") || ""
    },
    body: new URLSearchParams({ querySetting })
  });

  const json = await resp.json();
  if (json.code !== "1" || !Array.isArray(json.dataList)) return [];
  return json.dataList.map((course) => course.teachingPlace || "");
}

// ================== 把已选课加入 occupied =====================
function addSelectedToOccupied(texts) {
  for (const text of texts) {
    const nodes = parseTimeText(text);
    for (const node of nodes) {
      occupied[node[0] - 1][node[1] - 1][node[2] - 1] = true;
    }
  }
}

// ================== 获取网页课表 ===========================
// 抓当前页面课程表“时间地点”列（cells[4]）
function collectCourseCells() {
  const courseTimeCells = [];
  for (const table of document.querySelectorAll("table")) {
    if (!table.innerText.includes("选课类型") && table.innerText.includes("时间地点")) {
      for (const row of table.tBodies[0].rows) {
        if (row.cells[4]) courseTimeCells.push(row.cells[4]);
      }
    }
  }
  window.courseTimeCells = courseTimeCells;
  return courseTimeCells;
}

// ================== 计算冲突并标记 =========================


// 用parseTimeText解析它的时间文本拿到节点，再查occupied
function isCourseConflicted(timeText) {
  const nodes = parseTimeText(timeText);
  for (const node of nodes) {
    if (occupied[node[0] - 1][node[1] - 1][node[2] - 1]) {
      return true;
    }
  }
  return false;
}

// 遍历页面课程，把冲突的课程标记进 window.conflictedCourses
// 每门记 { courseTR, courseId, courseName }，courseTR是<tr>，可以直接调用
// 页面列表里包含已选课自己，不算冲突
function markConflictedCourses(pageCells) {
  const conflicted = [];
  for (const cell of pageCells) {
    const courseTR = cell.closest("tr");
    if (courseTR && courseTR.querySelector(".cv-delete-select")) continue;

    if (!isCourseConflicted(cell.innerText)) continue;

    const courseId = courseTR && courseTR.cells[0] ? courseTR.cells[0].innerText.trim() : "";
    const courseName = courseTR && courseTR.cells[1] ? courseTR.cells[1].innerText.trim() : "";
    conflicted.push({ courseTR, courseId, courseName });
  }
  window.conflictedCourses = conflicted;
  return conflicted;
}

// ================== 第 5 步：运行完整流程 & 隐藏课程 ==================
async function runConflictFilter() {
  // 1。直接调接口拿已选课
  const selectedTexts = await getSelectedTimeTexts();
  if (!selectedTexts.length) {
    console.warn("没有获取到已选课程，可能是未登录或接口异常。");
    return;
  }
  console.log("已选课程共 " + selectedTexts.length + " 门。");

  // 2。先清空旧表，再把已选课加入 occupied 

  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      for (let p = 0; p < PERIODS; p++) {
        occupied[w][d][p] = false;
      }
    }
  }
  addSelectedToOccupied(selectedTexts);

  // 3。获取当前页面课表
  const pageCells = collectCourseCells();
  console.log("页面课程共 " + pageCells.length + " 条。");

  // 4。计算冲突并标记
  const conflicted = markConflictedCourses(pageCells);
  console.log("共有 " + conflicted.length + " 门页面课程与已选课冲突。");

  // 网站自己用 cv-active 表示“已按下”
  // 取消过滤时网站会重建，什么都不用做
  const filterActive = (() => {
    const el = [...document.querySelectorAll(".search-value")].find(
      (e) => (e.innerText || "").trim() === "过滤冲突"
    );
    return !!(el && el.classList.contains("cv-active"));
  })();

  if (!filterActive) return;

  // 5。隐藏
  for (const course of conflicted) {
    course.courseTR.style.display = "none";
  }
  console.log("已隐藏 " + conflicted.length + " 门冲突课程。");
}

// ================== ENGINE ==================
// 页面里的“过滤冲突 OR 过滤已满 OR 刷新”都会重建课程表
// 常驻观察DOM：一旦课程表重建落定，就以“过滤冲突是否蓝色”为准
// 是蓝色就重新执行完整过滤流程
let running = false;
let rebuildTimer = null;

const rebuildObserver = new MutationObserver(() => {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(runIfNeeded, 150);
});

async function runIfNeeded() {
  if (running) return;

  const filterActive = [...document.querySelectorAll(".search-value")].some(
    (el) =>
      (el.innerText || "").trim() === "过滤冲突" && el.classList.contains("cv-active")
  );
  if (!filterActive) return;

  running = true;
  try {
    await runConflictFilter();
  } finally {
    running = false;
  }
}

rebuildObserver.observe(document.body, { subtree: true, childList: true });

/*
string str = innerText
boolean[][][] schedule = new boolean[20][7][12]; // 假设最多20周，7天，12节 
*/
