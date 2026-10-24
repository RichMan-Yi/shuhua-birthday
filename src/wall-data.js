// Wish island data: the wish this browser sent from the game, plus, in developer mode only, a
// simulated crowd of players (seeded, so it looks the same on every load). Real players' wishes
// will come from the shared leaderboard once there is one.
export const WALL_KEY = 'shuhua-wall-mine';
const CROWD = 1268;

function seeded(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seeded(20000106);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const FIRST = ['Shu', 'Shuhua', 'Yeh', 'Never', 'Wolf', 'Peach', 'Mochi', 'Luna', 'Star', 'Hana', 'Yuna', 'Momo', 'Kiki', 'Coco', 'Nana', 'Leo', 'Max', 'Ming', 'Wei', 'Ting', 'Jia', 'Yu', 'Ann', 'Rin', 'Sora', 'Dal', 'Byul', 'Haru', 'Mint', 'Tofu', 'Lala', 'Ivy', 'Zoe', 'Ken', 'Jun', 'Mei', 'Bora', 'Nari'];
const SECOND = ['', '', '', ' TW', ' KR', ' JP', ' fan', ' love', 'bb', 'x'];
const DIGITS = ['', '', '0106', '06', '2000', '7', '88', '1', '22', '99', '16', '520'];
const WISHES = [
  '舒華生日快樂！永遠支持妳', '祝舒華天天開心、身體健康', '台灣的驕傲，生日快樂！', '希望妳的每一天都閃閃發亮',
  '謝謝妳帶給我們這麼多快樂', '一歲一禮，一寸歡喜', '永遠是妳的 Neverland', '願妳被世界溫柔以待',
  '下次來桃園一起吃水蜜桃！', '大溪豆干請妳吃，生日快樂', '新的一歲也要繼續做自己', '妳笑起來最好看了',
  '生日快樂！要一直幸福喔', '拉拉山的水蜜桃都沒妳甜', '舒華寶寶生日快樂～', '桃園之光，生日快樂！',
  'Happy birthday Shuhua!', 'Love you forever, Shuhua', 'Stay happy and healthy!', 'Neverland is always with you',
  'You make my days brighter', 'HBD to our sunshine', 'Wishing you all the best', 'Shine bright, Shuhua!',
  '슈화야 생일 축하해!', '항상 응원할게요', '행복한 하루 보내세요', 'シュファ誕生日おめでとう！', 'ずっと応援してるよ',
];

const taken = new Set();
function makeName() {
  for (;;) {
    let n = pick(FIRST) + pick(SECOND);
    const d = pick(DIGITS);
    if (d) n += (rand() < 0.3 ? ' ' : '') + d;
    n = n.slice(0, 10).trim();
    if (!taken.has(n.toLowerCase())) {
      taken.add(n.toLowerCase());
      return n;
    }
  }
}
function gauss() {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}
// totals on the normalized scale: five levels at about 1,000 each for a just-passing run
function scoreSample() {
  let s = 5600 + gauss() * 700;
  if (rand() < 0.03) s += 1000 + rand() * 1800; // a few very strong runs
  return Math.round(Math.min(9600, Math.max(5000, s)));
}
const fakeEntry = (at) => ({ name: makeName(), wish: [...pick(WISHES)].slice(0, 30).join(''), score: scoreSample(), at });

// ranked list; ties go to whoever sent first
const byRank = (a, b) => b.score - a.score || a.at - b.at;

export function createCrowd({ simulate = false } = {}) {
  const now = Date.now();
  const people = [];
  if (simulate) for (let i = 0; i < CROWD; i++) people.push(fakeEntry(now - rand() * 10 * 864e5));

  let me = null;
  try {
    me = JSON.parse(localStorage.getItem(WALL_KEY) || 'null');
  } catch (e) {}
  if (me?.name) {
    me.mine = true;
    taken.add(me.name.toLowerCase());
    people.push(me);
  } else me = null;

  let ranked = [...people].sort(byRank);
  const ranks = new Map();
  const reindex = () => ranked.forEach((p, i) => ranks.set(p, i + 1));
  reindex();

  return {
    me,
    simulated: simulate,
    get ranked() {
      return ranked;
    },
    get size() {
      return ranked.length;
    },
    rankOf: (p) => ranks.get(p),
    // 1 for first place, toward 0 for last
    standing: (p) => 1 - (ranks.get(p) - 1) / Math.max(1, ranked.length - 1),
    // a simulated player sending a wish right now; now and then a big score shakes up the podium
    arrive() {
      const p = fakeEntry(Date.now());
      if (ranked.length > 2 && Math.random() < 0.06) p.score = Math.round(ranked[2].score + 20 + Math.random() * 400);
      people.push(p);
      ranked = [...people].sort(byRank);
      reindex();
      return p;
    },
  };
}
