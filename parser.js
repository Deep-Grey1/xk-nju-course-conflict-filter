

const DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const WEEKS = 20;   // 一学期20周
const PERIODS = 12; // 一天12节课

// occupied[周-1][天-1][节-1] = true 表示"这个时间节点被已选课程占用"
const occupied = createOccupied();

function createOccupied() {
  const table = [];
  for (let w = 0; w < WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(Array(PERIODS).fill(false));
    }
    table.push(week);
  }
  return table;
}


// 每个节点是 [周, 星期, 节]
function parseTimeText(text) {
  const result = [];

  // 空单元格 & "自由时间"直接跳过。
  text = (text || "").trim();
  if (!text || text.includes("自由时间")) return result;

  // 按"周X"把文本切成多个时间段
  const blocks = text.split(/(?=周[一二三四五六日])/);

  for (const block of blocks) {

    // 2. 提取星期
    const day = DAYS.indexOf("周" + block.match(/周[一二三四五六日]/)[0].slice(1));
    
    
    // 2. 解析节次范围
    const sectionStart = block.match(/(\d+)-(\d+)节/)[1] - '0'; 
    const sectionEnd = block.match(/(\d+)-(\d+)节/)[2] - '0';

    // 2.解析周次
    const weekText = block.match(/节\s*([\d,-周()单双]+)/)[1];


    const segments = weekText.split(",");

    // 每段展开成周号，把该课占用的节点放进result
    for (const seg of segments) {
      const weeks = parseWeekSegment(seg); 
      for (const w of weeks) {
        for (let p = sectionStart; p <= sectionEnd; p++) {
          result.push([w, day + 1, p]);
        }
      }
    }
  }

  return result;
}

//解析一个周次段 
//"1-18周" OR "4周" OR "1-17周(单)" OR "4-18周(双)"
function parseWeekSegment(seg) {
  if(seg.includes("(单)")) {
    const start = seg.match(/(\d+)-(\d+)周/)[1] - '0';
    const end = seg.match(/(\d+)-(\d+)周/)[2] - '0';
    const weeks = [];
    for(let w = start; w <= end; w++) {
      if(w % 2 === 1) weeks.push(w);
    }
    return weeks;
  } else if(seg.includes("(双)")) {
    const start = seg.match(/(\d+)-(\d+)周/)[1] - '0';
    const end = seg.match(/(\d+)-(\d+)周/)[2] - '0';
    const weeks = [];
    for(let w = start; w <= end; w++) {
      if(w % 2 === 0) weeks.push(w);
    }
    return weeks;
  } else if(seg.includes("-")) {
    const start = seg.match(/(\d+)-(\d+)周/)[1] - '0';
    const end = seg.match(/(\d+)-(\d+)周/)[2] - '0';
    const weeks = [];
    for(let w = start; w <= end; w++) {
      weeks.push(w);
    }
    return weeks;
  } else {
    const week = seg.match(/(\d+)周/)[1] - '0';
    return [week];
  } 
}
