export function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseYmd(s: string) {
  const [y, m, d] = s.split('-').map((v) => Number(v));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addMonths(year: number, month0: number, delta: number) {
  const d = new Date(year, month0 + delta, 1);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

export function monthTitle(year: number, month0: number) {
  return `${year}년 ${month0 + 1}월`;
}

export type DayCell = {
  date: Date;
  isCurrentMonth: boolean;
  key: string;
};

export function getMonthGrid(year: number, month0: number): DayCell[] {
  // month0: 0=Jan
  // ✅ Google Calendar(모바일)처럼 "월요일 시작" 그리드
  // JS getDay(): 0=일 ... 6=토
  // 월요일 시작 offset: (dow + 6) % 7  => 0=월 ... 6=일
  const first = new Date(year, month0, 1);
  const startDowMon = (first.getDay() + 6) % 7;
  // 42칸(6주) 시작일: 해당 달 1일에서 (월요일기준 요일)만큼 뒤로
  const start = new Date(year, month0, 1 - startDowMon);

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i); // Date가 자동으로 월/년 넘김 처리
    cells.push({
      date: d,
      isCurrentMonth: d.getMonth() === month0,
      key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
    });
  }
  return cells;
}

export function isSameYmd(a: Date, b: Date) {
  return ymd(a) === ymd(b);
}

// 음력(참고) 표시용
// - 별도 패키지 설치 없이, JS Intl의 chinese 캘린더(태음태양력)를 사용합니다.
// - 브라우저/런타임에 따라 표기 방식이 약간 다를 수 있습니다.
export function lunarLabelFromSolarYmd(solarYmd: string) {
  try {
    const d = parseYmd(solarYmd);
    const fmt = new Intl.DateTimeFormat('ko-KR-u-ca-chinese', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return fmt.format(d);
  } catch {
    return '';
  }
}

// 달력 칸에 넣기 좋은 짧은 음력 표기
// - 기본: "19" (음력 일)
// - 음력 초하루(1일)는 "11/1"처럼 월/일로 표시 (월 경계가 보여서 더 직관적)
// - 윤달이면 "윤" 접두어를 붙입니다. (예: "윤2/1")
export function lunarShortFromSolarYmd(solarYmd: string) {
  try {
    const d = parseYmd(solarYmd);

    // month/day만 뽑아 짧게 표시
    const fmt = new Intl.DateTimeFormat('ko-KR-u-ca-chinese', {
      month: 'numeric',
      day: 'numeric',
    });

    const raw = fmt.format(d); // 예: "11. 29." 또는 "윤 2. 1." 등(환경에 따라 다름)
    const isLeap = /윤/.test(raw);

    // 숫자만 추출 (월, 일)
    const nums = raw.match(/\d+/g)?.map((v) => Number(v)) ?? [];
    const m = nums[0] ?? 0;
    const day = nums[1] ?? 0;

    if (!m || !day) return '';

    const prefix = isLeap ? '윤' : '';
    if (day === 1) return `${prefix}${m}/${day}`;
    return `${day}`;
  } catch {
    return '';
  }
}
