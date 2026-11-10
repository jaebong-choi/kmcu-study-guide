// 유학 가이드 이용 통계. 학교 구글 계정의 시트에 붙여서 쓴다.
// 개인정보는 받지 않는다. 이벤트 종류·과정·결과·국적·언어만 쌓는다.
//
// 설치 (한 번만)
// 1. 학교 계정 구글 드라이브에서 새 스프레드시트를 만든다. 예: "유학 가이드 이용 통계"
// 2. 시트 메뉴 확장 프로그램 > Apps Script > 이 파일 내용을 전체 붙여넣고 저장
// 3. 편집기 위쪽 함수 목록에서 setup 을 고르고 실행 > 권한 허용
//    → "기록", "날짜별", "국적별", "결과별" 탭이 만들어진다.
// 4. 배포 > 새 배포 > 유형 "웹 앱" > 실행 계정 "나", 액세스 권한 "모든 사용자" > 배포
// 5. 나온 /exec 주소를 index.html 의 D.url.stats 에 넣고 GitHub 에 올린다.
// 코드를 고친 뒤에는 배포 > 배포 관리 > 수정 > 버전 "새 버전"으로 다시 배포해야 반영된다.
//
// 시트 사용법
// - "기록" 탭에 이벤트가 한 줄씩 쌓인다. 탭 이름과 열 순서를 바꾸지 말 것.
// - 집계 탭은 함수로 계산되므로 따로 손댈 필요 없다. 지워졌으면 setup 을 다시 실행한다.
//   첫 기록이 들어오기 전에는 집계 탭에 #N/A 가 보인다. 정상이다.
// - 이벤트: visit 방문 · start 진단 시작 · done 진단 완료 · apply 온라인 신청 버튼 클릭
// - 과정: ls 어학과정 · deg 학위과정 / 결과: ok 지원 가능 · cond 조건부 · no 불가
// - 국적은 어학과정 진단에서만 묻는다. 국가 코드(vn, mx …) 또는 other.
// - 웹 앱 주소는 공개되어 있어 누구나 기록을 보낼 수 있다. 값은 정해진 목록만 받는다.

const LOG = '기록';
const HEAD = ['시각', '날짜', '이벤트', '과정', '결과', '국적', '언어'];
const OK = {
  ev: ['visit', 'start', 'done', 'apply'],
  track: ['', 'ls', 'deg'],
  result: ['', 'ok', 'cond', 'no'],
};

function doPost(e) {
  try {
    const r = JSON.parse(e.postData.contents);
    const country = String(r.country || '');
    const lang = String(r.lang || '');
    if (!OK.ev.includes(r.ev) || !OK.track.includes(r.track || '') || !OK.result.includes(r.result || '')
      || !/^([a-z]{2}|other)?$/.test(country) || !/^[a-z]{2}$/.test(lang)) return out('bad');
    const now = new Date();
    const day = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd');
    sheet_(LOG).appendRow([now, day, r.ev, r.track || '', r.result || '', country, lang]);
    return out('ok');
  } catch (err) {
    return out('bad');
  }
}

function out(s) {
  return ContentService.createTextOutput(s);
}

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (name === LOG) { sh.appendRow(HEAD); sh.setFrozenRows(1); }
  }
  return sh;
}

// 탭과 집계 함수를 만든다. 몇 번 실행해도 된다.
function setup() {
  sheet_(LOG);
  const src = `'${LOG}'!A2:G`;
  const tabs = {
    // 날짜마다 이벤트별 건수
    '날짜별': `=QUERY(${src}, "select B, count(A) where B is not null group by B pivot C order by B desc label B '날짜'", 0)`,
    // 국적마다 진단 완료 결과별 건수
    '국적별': `=QUERY(${src}, "select F, count(A) where C = 'done' and F <> '' group by F pivot E label F '국적'", 0)`,
    // 과정·언어별 시작/완료/신청 건수
    '결과별': `=QUERY(${src}, "select D, G, count(A) where C <> 'visit' group by D, G pivot C label D '과정', G '언어'", 0)`,
  };
  for (const [name, f] of Object.entries(tabs)) {
    const sh = sheet_(name);
    sh.clear();
    sh.getRange('A1').setFormula(f);
  }
}
