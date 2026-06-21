// Follow Me! — App.jsx
// 変更点:
//   1. 「次のターンへ」ボタンを上に、その下に控えめな「コメントを見る」トグルを配置
//   2. 一度もコメントを見ずに炎上した場合、エンディングのメッセージに警告文を追加
//   3. 友人からの情報を複数の吹き出しに分け、より煽る・誘導するような文面に変更
//   4. 冒頭に「なんでもないことを投稿してみる」ターン(ターン0)を追加(全6ターンに)

import { useState } from "react";
import {
  Users,
  TrendingUp,
  DollarSign,
  Eye,
  AlertTriangle,
  MessageSquare,
  Flame,
  ShieldAlert,
  RotateCcw,
  ChevronRight,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  ArrowUpRight,
  Home,
} from "lucide-react";

const STARTING_FOLLOWERS = 1200;
const REACH_RATIO = 0.4;
const UPROAR_SKIP_THRESHOLD = 20;

const ALARM_WORDS = ["絶対", "危険", "今すぐ", "拡散希望", "緊急", "パニック", "助けて", "信じられない", "ヤバい"];
const CALM_WORDS = ["未確認", "真偽不明", "ソース", "出典", "確認中", "公式発表", "かもしれない", "誤解を招く", "落ち着いて"];

function evaluateComment(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { bonus: 0, alarmHits: [], calmHits: [], exclamationCount: 0 };
  }
  const alarmHits = ALARM_WORDS.filter((w) => trimmed.includes(w));
  const calmHits = CALM_WORDS.filter((w) => trimmed.includes(w));
  const exclamationCount = (trimmed.match(/[!!]/g) || []).length;
  const rawScore = alarmHits.length - calmHits.length + Math.min(exclamationCount, 3) * 0.5;
  const bonus = Math.max(-2, Math.min(3, rawScore));
  return { bonus, alarmHits, calmHits, exclamationCount };
}

const TURNS = [
  {
    id: 0,
    type: "choice",
    label: "最初の投稿",
    learning: "発信の第一歩",
    info: ["ねえ、最近全然投稿してなくない?", "とりあえず何か適当に投稿してみたら?バズるかもよ笑"],
    choices: [
      { key: "A", text: "今日の給食、唐揚げだった", desc: "日常の一コマ", mult: 1 },
      { key: "B", text: "今日ちょっと眠い", desc: "なんとなくの近況", mult: 1 },
      { key: "C", text: "放課後、変な形の雲を見た", desc: "気になったこと", mult: 2 },
    ],
  },
  {
    id: 1,
    type: "choice",
    label: "未確認情報",
    learning: "情報源の確認",
    info: [
      "ねえねえ、さっき◯◯山のほうですごい地鳴りがあったらしいよ!",
      "これ大地震とか来るんじゃね?今のうちに投稿しといたら絶対バズると思うわ笑",
    ],
    choices: [
      { key: "A", text: "◯◯山付近で地鳴り", desc: "事実のみ", mult: 1 },
      { key: "B", text: "地震の前兆か?", desc: "推測・やや誇張", mult: 3 },
      { key: "C", text: "大地震が来る!?", desc: "断定・強い煽り", mult: 8 },
    ],
  },
  {
    id: 2,
    type: "choice",
    label: "誇張表現",
    learning: "拡大解釈",
    info: ["やば、さっきの投稿めっちゃ伸びてるじゃん!!", "もっと煽ったらもっとバズるよ、続報出しとこ!"],
    choices: [
      { key: "A", text: "引き続き地鳴りを確認中", desc: "事実のみ", mult: 1 },
      { key: "B", text: "専門家も警戒?地鳴り再び", desc: "推測・やや誇張", mult: 3 },
      { key: "C", text: "やはり来る、備えろ", desc: "断定・強い煽り", mult: 8 },
    ],
  },
  {
    id: 3,
    type: "choice",
    label: "大バズり",
    learning: "拡散の仕組み",
    info: ["ねえ見た?もうめちゃくちゃ話題になってるよ!!", "このまま行けばマジで30万人いけるんじゃない?"],
    choices: [
      { key: "A", text: "地鳴りの件、続報なし", desc: "事実のみ", mult: 1 },
      { key: "B", text: "各地で地鳴りの目撃情報", desc: "推測・やや誇張", mult: 3 },
      { key: "C", text: "政府はまだ発表しない気か", desc: "断定・強い煽り", mult: 8 },
    ],
  },
  {
    id: 4,
    type: "choice",
    postTruth: true,
    label: "誤報判明・炎上",
    learning: "誤情報の影響",
    info: ["ねえ...ちょっとやばいかも", "さっきの地鳴り、工事の音だったらしくて、コメント欄めちゃくちゃ荒れてる…"],
    choices: [
      { key: "A", text: "地鳴りは工事音と判明", desc: "事実のみ", mult: 1 },
      { key: "B", text: "まだ油断はできない?", desc: "推測・やや誇張", mult: 3 },
      { key: "C", text: "隠蔽の可能性も?", desc: "断定・強い煽り", mult: 8 },
    ],
  },
  {
    id: 5,
    type: "response",
    label: "鎮火対応",
    learning: "発信者の責任",
    info: ["コメント欄、本当にやばいことになってる…", "さすがに何か反応した方がいいと思う"],
    choices: [
      { key: "apologize", text: "謝罪する", desc: "経緯を説明し謝罪する" },
      { key: "delete", text: "投稿を削除する", desc: "投稿を消して様子を見る" },
      { key: "ignore", text: "無視する", desc: "コメントには反応しない" },
      { key: "excuse", text: "言い訳する", desc: "情報源のせいにする" },
    ],
  },
];

const RESPONSE_OUTCOMES = {
  apologize: {
    reach: 80,
    uproarDelta: -10,
    message:
      "誠実な対応により、訂正情報は多くの人に届いた。それでも一度広まった不安は完全には消えなかった。",
  },
  delete: {
    reach: 20,
    uproarDelta: 5,
    message: "投稿は削除されたが、スクリーンショットで誤情報は拡散し続けた。",
  },
  ignore: {
    reach: 5,
    uproarDelta: 15,
    message: "説明のないまま時間が過ぎ、不信感だけが残った。",
  },
  excuse: {
    reach: 30,
    uproarDelta: 20,
    message: "言い訳は火に油を注ぎ、炎上はさらに拡大した。",
  },
  quiet: {
    reach: 95,
    uproarDelta: 0,
    message:
      "大きな炎上にはならず、訂正情報も自然と多くの人に届いた。今回はたまたま大事に至らなかっただけかもしれない。",
  },
};

function simulate(history) {
  return history.reduce(
    (state, h) => {
      if (h.type === "choice") {
        const growthFactor = 1 + REACH_RATIO * h.mult;
        return {
          followers: Math.round(state.followers * growthFactor),
          social: state.social + h.mult * h.mult,
          anxiety: state.anxiety + h.mult * 5,
          uproar: state.uproar + (h.postTruth ? h.mult * 10 : 0),
        };
      }
      const outcome = RESPONSE_OUTCOMES[h.key];
      return { ...state, uproar: Math.max(0, state.uproar + outcome.uproarDelta) };
    },
    { followers: STARTING_FOLLOWERS, social: 0, anxiety: 0, uproar: 0 }
  );
}

const AUTHOR_NAMES = [
  "フォロワー",
  "近隣住民",
  "通行人",
  "友人の友人",
  "地元の人",
  "ニュース好き",
  "心配性さん",
  "冷静派",
  "拡散希望さん",
  "様子見さん",
];

const TURN_COMMENTS = {
  0: {
    calm: [
      { text: "いいね!", tone: "calm" },
      { text: "それな笑", tone: "calm" },
      { text: "うちもそんな感じ", tone: "calm" },
      { text: "わかる〜", tone: "calm" },
      { text: "今度教えて", tone: "calm" },
      { text: "ふつうに気になる", tone: "calm" },
      { text: "へえ、そうなんだ", tone: "calm" },
      { text: "今度真似しよう", tone: "calm" },
      { text: "それより明日の天気どうなんだろ", tone: "calm" },
      { text: "おつかれ〜", tone: "calm" },
    ],
  },
  1: {
    calm: [
      { text: "情報源教えてください", tone: "doubt" },
      { text: "地鳴りってどんな音だったんだろう", tone: "calm" },
      { text: "うちの方は特に何もないです", tone: "calm" },
      { text: "気になるので様子見ます", tone: "calm" },
      { text: "友達の情報なら一応信じてみる", tone: "calm" },
      { text: "公式の発表はまだ?", tone: "doubt" },
      { text: "詳細あったら教えてください", tone: "calm" },
      { text: "そういう話、前にも聞いたことある", tone: "calm" },
      { text: "心配しすぎじゃない?", tone: "calm" },
      { text: "とりあえずブックマーク", tone: "calm" },
    ],
    mid: [
      { text: "え、本当?ちょっと不安...", tone: "mid" },
      { text: "地震の前兆ってマジ?", tone: "mid" },
      { text: "周りでも噂になってる", tone: "mid" },
      { text: "一応備えとこうかな", tone: "mid" },
      { text: "これ、信じていいのかな", tone: "doubt" },
      { text: "専門家の意見聞きたい", tone: "doubt" },
      { text: "怖くて検索しちゃった", tone: "mid" },
      { text: "親にも伝えとく", tone: "mid" },
      { text: "前兆ってどう判断するんだろう", tone: "mid" },
      { text: "落ち着いて様子見よう", tone: "calm" },
    ],
    hot: [
      { text: "やばすぎ!!家族にも教える!", tone: "hot" },
      { text: "備蓄急いで買いに行く!!", tone: "hot" },
      { text: "これ拡散しなきゃ!!", tone: "hot" },
      { text: "怖すぎる、、、", tone: "hot" },
      { text: "本当に大地震来るの!?", tone: "hot" },
      { text: "みんな逃げて!!", tone: "hot" },
      { text: "これ本当にソースあるの?", tone: "doubt" },
      { text: "煽りすぎじゃない?", tone: "doubt" },
      { text: "パニックになりそう", tone: "hot" },
      { text: "信じられない、、、", tone: "hot" },
    ],
  },
  2: {
    calm: [
      { text: "続報待ってます", tone: "calm" },
      { text: "確認中なら安心", tone: "calm" },
      { text: "ソースはまだ出ないの?", tone: "doubt" },
      { text: "落ち着いて見守ります", tone: "calm" },
      { text: "情報まとめてくれてありがとう", tone: "calm" },
      { text: "うちの地域は平常です", tone: "calm" },
      { text: "気長に待ちます", tone: "calm" },
      { text: "詳しい人いますか?", tone: "doubt" },
      { text: "とりあえずフォローしておく", tone: "calm" },
      { text: "冷静な投稿で助かる", tone: "calm" },
    ],
    mid: [
      { text: "専門家も警戒って本当?", tone: "mid" },
      { text: "再びってことは前にもあったの?", tone: "mid" },
      { text: "ちょっと心配になってきた", tone: "mid" },
      { text: "周りでも話題になってきてる", tone: "mid" },
      { text: "備えておいた方がいいかな", tone: "mid" },
      { text: "専門家って誰のこと?", tone: "doubt" },
      { text: "情報の出どころが気になる", tone: "doubt" },
      { text: "家族にも共有した", tone: "mid" },
      { text: "落ち着かないなあ", tone: "mid" },
      { text: "続報が怖い", tone: "mid" },
    ],
    hot: [
      { text: "やはり来るんだ!!備える!!", tone: "hot" },
      { text: "もう逃げる準備してる", tone: "hot" },
      { text: "これは本物の警告だ!!", tone: "hot" },
      { text: "拡散希望!!みんな見て!!", tone: "hot" },
      { text: "怖すぎて眠れない", tone: "hot" },
      { text: "備えろって誰の言葉?根拠は?", tone: "doubt" },
      { text: "煽りすぎでは...?", tone: "doubt" },
      { text: "家族全員に送った!!", tone: "hot" },
      { text: "パニックになってきた", tone: "hot" },
      { text: "本当に来るなら教えて!!", tone: "hot" },
    ],
  },
  3: {
    calm: [
      { text: "続報なしなら一旦安心", tone: "calm" },
      { text: "品薄のニュースは見た", tone: "calm" },
      { text: "買い占めはやめましょう", tone: "calm" },
      { text: "公式発表はまだ?", tone: "doubt" },
      { text: "冷静になろう", tone: "calm" },
      { text: "うちの店も品薄だった", tone: "calm" },
      { text: "とりあえず必要な分だけ買った", tone: "calm" },
      { text: "情報の出どころ気になる", tone: "doubt" },
      { text: "落ち着いて行動しよう", tone: "calm" },
      { text: "続報あれば教えてください", tone: "calm" },
    ],
    mid: [
      { text: "各地で目撃ってどこ?", tone: "mid" },
      { text: "防災用品買っておこうかな", tone: "mid" },
      { text: "本当に大丈夫なのかな", tone: "mid" },
      { text: "周りもざわついてる", tone: "mid" },
      { text: "目撃情報のソースは?", tone: "doubt" },
      { text: "家族にも連絡した", tone: "mid" },
      { text: "品薄、見てきた", tone: "mid" },
      { text: "ちょっと不安が増してきた", tone: "mid" },
      { text: "公式の見解が欲しい", tone: "doubt" },
      { text: "備えは大事だよね", tone: "mid" },
    ],
    hot: [
      { text: "やっぱり政府は隠してる!!", tone: "hot" },
      { text: "もう買い占めた!!", tone: "hot" },
      { text: "拡散してます!!みんな備えて!!", tone: "hot" },
      { text: "怖すぎる、、、避難準備した", tone: "hot" },
      { text: "信じられない、、、", tone: "hot" },
      { text: "政府が隠す根拠ってあるの?", tone: "doubt" },
      { text: "ちょっと煽りすぎじゃ...?", tone: "doubt" },
      { text: "家族全員で避難の話してる", tone: "hot" },
      { text: "パニックが止まらない", tone: "hot" },
      { text: "本当に大地震来るの!?", tone: "hot" },
    ],
  },
  4: {
    relieved: [
      { text: "教えてくれてありがとう", tone: "calm" },
      { text: "とりあえず安心した", tone: "calm" },
      { text: "正直に言ってくれて好印象", tone: "calm" },
      { text: "工事の音だったのか、納得", tone: "calm" },
      { text: "心配して損した(笑)", tone: "calm" },
      { text: "もっと早く確認すればよかったかも", tone: "doubt" },
      { text: "次から気をつけよう", tone: "doubt" },
      { text: "誠実な対応ありがとう", tone: "calm" },
      { text: "騒いでごめんなさい", tone: "calm" },
      { text: "今後も正確な情報お願いします", tone: "calm" },
    ],
    backlash: [
      { text: "結局デマだったんかい", tone: "hot" },
      { text: "謝罪はよ", tone: "hot" },
      { text: "無責任すぎる", tone: "hot" },
      { text: "信用なくなったわ", tone: "hot" },
      { text: "買い占めた分どうしてくれるの", tone: "hot" },
      { text: "最初から疑うべきだった", tone: "doubt" },
      { text: "なんでこんな根拠のない投稿したの", tone: "doubt" },
      { text: "フォロー外します", tone: "hot" },
      { text: "責任取ってよ", tone: "hot" },
      { text: "二度と信用しない", tone: "hot" },
    ],
  },
};

function getComments(turn, record) {
  if (!record || record.type === "response") return [];
  let pool;
  if (record.postTruth) {
    pool = record.mult <= 2 ? TURN_COMMENTS[4].relieved : TURN_COMMENTS[4].backlash;
  } else {
    const tier = record.mult <= 2 ? "calm" : record.mult <= 6 ? "mid" : "hot";
    const turnPool = TURN_COMMENTS[turn.id] || {};
    pool = turnPool[tier] || turnPool.calm || [];
  }
  return pool.map((c, i) => ({
    author: AUTHOR_NAMES[i % AUTHOR_NAMES.length],
    text: c.text,
    tone: c.tone,
  }));
}

function getPersonalImpact(uproar) {
  if (uproar > 60) {
    return "あなたの投稿がきっかけで、ネット上は激しい炎上に包まれた。知らない人からの心ない言葉が続き、しばらく外に出るのが怖く感じる日もあった。";
  }
  if (uproar > 30) {
    return "投稿のことで、しばらくの間ぎこちない視線や心ない言葉を向けられることがあった。";
  }
  return "大きなトラブルにはならず、これまでと変わらない毎日を送ることができた。";
}

const VIRAL_PINK = "#ff3d81";
const VIRAL_ORANGE = "#ff8a3d";
const ALARM_RED = "#ff3b3b";
const CALM_TEAL = "#2dd4bf";

function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const clamped = Math.max(0, Math.min(1, t));
  const m = a.map((c, i) => Math.round(c + (b[i] - c) * clamped));
  return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
}

function getGlowColor(screen, sim, outcomeKey) {
  if (screen === "calm" || outcomeKey === "quiet" || outcomeKey === "apologize") {
    return CALM_TEAL;
  }
  if (sim.uproar > 0) {
    return mixHex(VIRAL_ORANGE, ALARM_RED, sim.uproar / 90);
  }
  return mixHex(VIRAL_PINK, VIRAL_ORANGE, 0.4);
}

export default function App() {
  const [screen, setScreen] = useState("title");
  const [turnIndex, setTurnIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [history, setHistory] = useState([]);
  const [endingStep, setEndingStep] = useState(0);
  const [showDev, setShowDev] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [hasViewedComments, setHasViewedComments] = useState(false);

  const turn = TURNS[turnIndex];
  const sim = simulate(history);
  const prevSim = simulate(history.slice(0, -1));
  const followerDelta = sim.followers - prevSim.followers;
  const responseRecord = history.find((h) => h.type === "response");
  const outcome = responseRecord ? RESPONSE_OUTCOMES[responseRecord.key] : null;
  const lastRecord = history[history.length - 1];
  const comments = getComments(turn, lastRecord);
  const evaluation =
    screen === "turn" && selected && turn.type === "choice" ? evaluateComment(comment) : null;
  const previewMult = evaluation ? Math.max(1, selected.mult + evaluation.bonus) : null;
  const meterPct = evaluation ? Math.round(((previewMult - 1) / 10) * 100) : 0;
  const glow = getGlowColor(screen, sim, responseRecord?.key);

  function startGame() {
    setHistory([]);
    setTurnIndex(0);
    setSelected(null);
    setComment("");
    setEndingStep(0);
    setShowComments(false);
    setHasViewedComments(false);
    setScreen("turn");
  }

  function backToTitle() {
    setHistory([]);
    setTurnIndex(0);
    setSelected(null);
    setComment("");
    setEndingStep(0);
    setShowComments(false);
    setHasViewedComments(false);
    setScreen("title");
  }

  function toggleComments() {
    setShowComments((v) => !v);
    setHasViewedComments(true);
  }

  function finishComment() {
    if (!selected) return;
    if (turn.type === "choice") {
      const result = evaluateComment(comment);
      const effectiveMult = Math.max(1, selected.mult + result.bonus);
      setHistory((h) => [
        ...h,
        {
          type: "choice",
          key: selected.key,
          baseMult: selected.mult,
          bonus: result.bonus,
          mult: effectiveMult,
          postTruth: !!turn.postTruth,
          comment,
        },
      ]);
    } else {
      setHistory((h) => [...h, { type: "response", key: selected.key, comment }]);
    }
    setScreen("result");
  }

  function nextStep() {
    setShowComments(false);
    if (turn.type === "response") {
      setEndingStep(0);
      setScreen("ending");
      return;
    }
    if (turn.postTruth && sim.uproar < UPROAR_SKIP_THRESHOLD) {
      setScreen("calm");
      return;
    }
    setTurnIndex((i) => i + 1);
    setSelected(null);
    setComment("");
    setScreen("turn");
  }

  function proceedToEndingQuiet() {
    setHistory((h) => [...h, { type: "response", key: "quiet", comment: "" }]);
    setEndingStep(0);
    setScreen("ending");
  }

  const socialLabel = sim.social > 100 ? "大" : sim.social > 20 ? "中" : "小";
  const anxietyNote =
    sim.anxiety > 100 ? " 一部の住民は、今も漠然とした不安を抱えたままだ。" : "";
  const commentsWarning =
    !hasViewedComments && sim.uproar > 30
      ? " 一度もコメント欄を確認しなかった。投稿を続けるときは、コメントを見て社会の受け取り方を確認することも大切だ。"
      : "";
  const finalMessage = outcome ? outcome.message + anxietyNote + commentsWarning : "";

  const endingItems = [
    { icon: Users, label: "フォロワー数", value: `${sim.followers.toLocaleString()} 人` },
    { icon: DollarSign, label: "推定収益", value: `¥${Math.round(sim.followers * 0.5).toLocaleString()}` },
    { icon: Eye, label: "投稿閲覧数", value: `${(sim.followers * 8).toLocaleString()} 回` },
    { icon: AlertTriangle, label: "社会的影響(買い占め等)", value: socialLabel },
    { icon: MessageSquare, label: "問い合わせ増加数", value: `${sim.social * 8} 件` },
    { icon: ShieldAlert, label: "訂正投稿の到達率", value: `${outcome?.reach ?? 0}%` },
    { icon: Flame, label: "メッセージ", value: finalMessage },
    { icon: Home, label: "投稿のその後", value: getPersonalImpact(sim.uproar) },
  ];

  function renderScreen() {
    if (screen === "title") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-8">
          <h1
            className="font-display text-4xl font-bold bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(90deg, ${VIRAL_PINK}, ${VIRAL_ORANGE})` }}
          >
            Follow Me!
          </h1>
          <p className="font-body text-sm text-muted leading-relaxed px-4">
            フォロワー30万人を目指す、SNS発信シミュレーション
          </p>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1 text-xs text-muted font-mono">
              <Heart size={14} /> 1.2k
            </span>
            <span className="flex items-center gap-1 text-xs text-muted font-mono">
              <MessageCircle size={14} /> 84
            </span>
          </div>
          <button
            onClick={startGame}
            className="mt-4 font-display font-bold text-sm text-canvas px-10 py-3 rounded-full transition-transform active:scale-95"
            style={{ background: `linear-gradient(90deg, ${VIRAL_PINK}, ${VIRAL_ORANGE})` }}
          >
            今すぐはじめる
          </button>
        </div>
      );
    }

    if (screen === "turn") {
      const isResponseTurn = turn.type === "response";
      return (
        <div className="flex-1 flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface-soft flex items-center justify-center font-display text-xs text-muted">
              友
            </div>
            <div>
              <p className="text-xs font-semibold text-ink">友人</p>
              <p className="text-[10px] text-muted font-mono">たった今</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {turn.info.map((line, i) => (
              <div key={i} className="bg-surface-soft rounded-2xl rounded-tl-sm p-3">
                <p className="text-sm leading-relaxed text-ink">{line}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted font-mono uppercase tracking-wide">
            学習要素: {turn.learning}
          </p>

          <div className="flex flex-col gap-2 mt-1">
            <p className="text-xs text-muted">
              {isResponseTurn ? "対応を選んでください" : "投稿するタイトルを選んでください"}
            </p>
            {turn.choices.map((c) => {
              const isSelected = selected?.key === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setSelected(c)}
                  className="text-left rounded-2xl p-3 pl-4 border-l-4 transition-colors"
                  style={{
                    borderLeftColor: isSelected ? glow : "transparent",
                    background: "var(--color-surface-soft)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-ink">{c.text}</span>
                    {c.mult && (
                      <span
                        className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: VIRAL_ORANGE, background: "rgba(255,138,61,0.12)" }}
                      >
                        ×{c.mult}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted mt-1">{c.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 mt-1">
            <p className="text-xs text-muted">コメントを入力(任意)</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={selected ? "ひとことコメントを書く..." : "まずは上でタイトルを選んでください"}
              className="bg-surface-soft rounded-2xl p-4 text-sm text-ink placeholder:text-muted resize-none focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": glow }}
            />
            {!isResponseTurn && selected && (
              <div className="bg-surface-soft rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                  <span>AI評価(プレビュー)</span>
                  <span className="text-ink font-bold">
                    ×{selected.mult} → ×{previewMult}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(8, meterPct)}%`, background: glow }}
                  />
                </div>
                {evaluation.alarmHits.length > 0 && (
                  <p className="text-[10px] text-muted">煽り検出: {evaluation.alarmHits.join("、")}</p>
                )}
                {evaluation.calmHits.length > 0 && (
                  <p className="text-[10px] text-muted">慎重な表現: {evaluation.calmHits.join("、")}</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={finishComment}
            disabled={!selected}
            className="mt-auto self-end flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            style={{ background: glow }}
          >
            投稿する <ChevronRight size={16} />
          </button>
        </div>
      );
    }

    if (screen === "result") {
      return (
        <div className="flex-1 flex flex-col gap-4 pt-2">
          {turn.type === "choice" ? (
            <>
              <div className="flex items-center gap-2 text-xs text-muted">
                <TrendingUp size={16} style={{ color: glow }} />
                <span>
                  最終的な拡散率 <span className="text-ink font-bold">×{lastRecord.mult}</span>
                  {lastRecord.bonus !== 0 && (
                    <span className="text-muted ml-1">
                      (タイトル×{lastRecord.baseMult} {lastRecord.bonus > 0 ? "+" : ""}
                      {lastRecord.bonus} コメント補正)
                    </span>
                  )}
                </span>
              </div>

              <div className="bg-surface-soft rounded-2xl p-5 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono text-muted uppercase tracking-wide">フォロワー</span>
                <span
                  key={sim.followers}
                  className="font-display text-3xl font-bold text-ink animate-count-pop"
                >
                  {sim.followers.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-xs font-mono" style={{ color: glow }}>
                  <ArrowUpRight size={12} /> +{followerDelta.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-around text-muted">
                <span className="flex items-center gap-1 text-xs font-mono">
                  <Heart size={14} /> {(lastRecord.mult * 120).toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-xs font-mono">
                  <MessageCircle size={14} /> {(lastRecord.mult * 18).toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-xs font-mono">
                  <Share2 size={14} /> {(lastRecord.mult * 9).toLocaleString()}
                </span>
              </div>

              <button
                onClick={nextStep}
                className="flex items-center justify-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
                style={{ background: glow }}
              >
                次のターンへ <ChevronRight size={16} />
              </button>

              <button
                onClick={toggleComments}
                className="self-start text-[11px] text-muted underline font-mono"
              >
                {showComments ? "コメントを閉じる" : `コメントを見る (${comments.length})`}
              </button>

              {showComments && comments.length > 0 && (
                <div className="flex flex-col gap-2">
                  {comments.map((cm, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-xl p-3 border-l-2"
                      style={{
                        borderLeftColor: cm.tone === "doubt" ? CALM_TEAL : "transparent",
                        background: "var(--color-surface-soft)",
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-canvas flex items-center justify-center text-[9px] text-muted shrink-0 mt-0.5">
                        {cm.author.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted">{cm.author}</p>
                        <p className="text-xs text-ink leading-relaxed">{cm.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="bg-surface-soft rounded-2xl p-5">
                <p className="text-sm leading-relaxed text-ink">{outcome?.message}</p>
              </div>
              <button
                onClick={nextStep}
                className="mt-auto self-end flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
                style={{ background: glow }}
              >
                結果発表へ <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      );
    }

    if (screen === "calm") {
      return (
        <div className="flex-1 flex flex-col gap-4 pt-2 justify-center text-center items-center">
          <ShieldAlert size={28} style={{ color: CALM_TEAL }} />
          <p className="text-sm text-muted">大きな炎上にはならなかった。</p>
          <div className="bg-surface-soft rounded-2xl p-5">
            <p className="text-sm leading-relaxed text-ink">
              工事音だったという訂正は静かに広まり、特に強い批判やパニックには発展しなかった。対応を迫られる場面は訪れなかった。
            </p>
          </div>
          <button
            onClick={proceedToEndingQuiet}
            className="flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
            style={{ background: CALM_TEAL }}
          >
            結果を見る <ChevronRight size={16} />
          </button>
        </div>
      );
    }

    if (screen === "ending") {
      const isComplete = endingStep >= endingItems.length - 1;
      return (
        <div className="flex-1 flex flex-col gap-3 pt-2">
          {endingItems.slice(0, endingStep + 1).map((item, i) => {
            const Icon = item.icon;
            const isProse = item.label === "メッセージ" || item.label === "投稿のその後";
            return (
              <div
                key={i}
                className={`rounded-2xl p-4 flex items-start gap-3 animate-rise-in ${
                  isProse ? "border" : "bg-surface-soft"
                }`}
                style={isProse ? { borderColor: glow, background: "rgba(255,255,255,0.02)" } : undefined}
              >
                <Icon size={18} style={{ color: glow }} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-muted uppercase tracking-wide">{item.label}</p>
                  <p
                    className={
                      isProse
                        ? "text-sm text-ink leading-relaxed"
                        : "font-display text-lg font-bold text-ink"
                    }
                  >
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
          {!isComplete ? (
            <button
              onClick={() => setEndingStep((s) => s + 1)}
              className="self-end flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas mt-1"
              style={{ background: glow }}
            >
              次へ <ChevronRight size={16} />
            </button>
          ) : (
            <div className="flex gap-2 mt-1">
              <button
                onClick={startGame}
                className="flex-1 flex items-center justify-center gap-1 font-display font-bold text-sm px-4 py-2.5 rounded-full text-canvas"
                style={{ background: glow }}
              >
                <RotateCcw size={16} /> もう一度プレイする
              </button>
              <button
                onClick={backToTitle}
                className="flex-1 flex items-center justify-center gap-1 font-display font-bold text-sm px-4 py-2.5 rounded-full border border-surface-soft text-muted"
              >
                タイトルに戻る
              </button>
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center py-10 px-4 relative overflow-hidden">
      <div
        className="absolute w-[480px] h-[480px] rounded-full blur-3xl animate-pulse-glow pointer-events-none"
        style={{ background: glow }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} style={{ color: glow }} />
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted">
            Follow Me! Prototype
          </span>
        </div>
        <span className="font-mono text-[10px] text-muted mb-3">{screen}</span>

        <div
          className="w-full rounded-[2.5rem] p-[2px]"
          style={{ background: `linear-gradient(160deg, ${glow}, transparent 60%)` }}
        >
          <div
            className="w-full bg-surface rounded-[2.4rem] overflow-hidden flex flex-col"
            style={{ minHeight: "660px" }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-24 h-5 bg-canvas rounded-full" />
            </div>

            {screen !== "title" && screen !== "ending" && screen !== "calm" && (
              <div className="px-6 pb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted uppercase tracking-wide">
                  {turn.label}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {turnIndex + 1} / {TURNS.length}
                </span>
              </div>
            )}

            <div className="flex-1 px-6 pb-6 flex flex-col">{renderScreen()}</div>
          </div>
        </div>

        <button
          onClick={() => setShowDev((v) => !v)}
          className="mt-4 font-mono text-[10px] text-muted underline"
        >
          {showDev ? "隠す" : "開発者ビューを表示"}
        </button>
        {showDev && (
          <div className="mt-2 w-full bg-surface-soft rounded-xl p-3 font-mono text-[10px] text-muted grid grid-cols-3 gap-2">
            <span>社会影響度 {sim.social}</span>
            <span>不安度 {sim.anxiety}</span>
            <span>炎上度 {sim.uproar}</span>
          </div>
        )}
      </div>
    </div>
  );
}