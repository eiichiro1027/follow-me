// Follow Me! — App.jsx (UI全面リデザイン版)

import { useState, useEffect, useMemo } from "react";
import scenariosData from "./data/scenarios.json";
import {
  ChevronRight, Heart, MessageCircle, Share2, Sparkles,
  ArrowUpRight, RotateCcw, Flame, Home, Eye, DollarSign,
  Users, ShieldAlert, Repeat2, BookmarkIcon,
} from "lucide-react";

// ============================================================
// 定数・ユーティリティ
// ============================================================
const STARTING_FOLLOWERS = 1200;
const REACH_RATIO = 0.4;
const UPROAR_SKIP_THRESHOLD = 20;

const ALARM_WORDS = ["絶対","危険","今すぐ","拡散希望","緊急","パニック","助けて","信じられない","ヤバい"];
const CALM_WORDS  = ["未確認","真偽不明","ソース","出典","確認中","公式発表","かもしれない","誤解を招く","落ち着いて"];

function evaluateComment(text) {
  const t = (text || "").trim();
  if (!t) return { bonus: 0, alarmHits: [], calmHits: [] };
  const alarmHits = ALARM_WORDS.filter((w) => t.includes(w));
  const calmHits  = CALM_WORDS.filter((w) => t.includes(w));
  const excl = (t.match(/[!!]/g) || []).length;
  return { bonus: Math.max(-2, Math.min(3, alarmHits.length - calmHits.length + Math.min(excl,3)*0.5)), alarmHits, calmHits };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const RESPONSE_OUTCOMES = {
  apologize: { reach:80,  uproarDelta:-10, message:"誠実な対応により、訂正情報は多くの人に届いた。それでも一度広まった不安は完全には消えなかった。" },
  delete:    { reach:20,  uproarDelta:  5, message:"投稿は削除されたが、スクリーンショットで誤情報は拡散し続けた。" },
  ignore:    { reach: 5,  uproarDelta: 15, message:"説明のないまま時間が過ぎ、不信感だけが残った。" },
  excuse:    { reach:30,  uproarDelta: 20, message:"言い訳は火に油を注ぎ、炎上はさらに拡大した。" },
  quiet:     { reach:95,  uproarDelta:  0, message:"大きな炎上にはならず、訂正情報も自然と多くの人に届いた。今回はたまたま大事に至らなかっただけかもしれない。" },
};

function simulate(history) {
  return history.reduce(
    (s, h) => {
      if (h.type === "choice") return {
        followers: Math.round(s.followers * (1 + REACH_RATIO * h.mult)),
        social: s.social + h.mult * h.mult,
        anxiety: s.anxiety + h.mult * 5,
        uproar: s.uproar + (h.postTruth ? h.mult * 10 : 0),
      };
      return { ...s, uproar: Math.max(0, s.uproar + RESPONSE_OUTCOMES[h.key].uproarDelta) };
    },
    { followers: STARTING_FOLLOWERS, social: 0, anxiety: 0, uproar: 0 }
  );
}

function getComments(scenario, turnId, record) {
  if (!record || record.type === "response") return [];
  const pool = scenario?.comments[String(turnId)];
  if (!pool) return [];
  let list = record.postTruth
    ? (record.mult <= 2 ? pool.relieved : pool.backlash)
    : (pool[record.mult <= 2 ? "calm" : record.mult <= 6 ? "mid" : "hot"] || pool.calm || []);
  const authors = ["フォロワー","近隣住民","通行人","友人の友人","地元の人","ニュース好き","心配性さん","冷静派","拡散希望さん","様子見さん"];
  return (list||[]).map((c,i) => ({ author: authors[i%authors.length], text:c.text, tone:c.tone }));
}

function getPersonalImpact(uproar) {
  if (uproar > 60) return "あなたの名前と顔が、見知らぬ何万人もの人に晒された。「死ね」「消えろ」という言葉が毎日届き、学校に行くのが怖くなった。家族にも迷惑がかかり、友人にも距離を置かれた。投稿を押したあの瞬間に戻れるなら、と何度も思った。";
  if (uproar > 30) return "しばらくの間、見知らぬアカウントから批判のメッセージが届き続けた。街で誰かに見られているような気がして、落ち着かない日が続いた。一度SNSに広まった情報は、自分では消せないと初めて実感した。";
  return "大きなトラブルにはならなかったが、それは運がよかっただけかもしれない。一度ネットに出た情報は、誰かの手元に残り続ける。「あのとき投稿しなければよかった」と思う日が来る前に、立ち止まることが大切だ。";
}

// ============================================================
// カラー設定
// ============================================================
const THEME_COLORS = {
  pink:   { a:"#ff3d81", b:"#ff8a3d" },
  green:  { a:"#22c55e", b:"#84cc16" },
  purple: { a:"#a855f7", b:"#ec4899" },
  blue:   { a:"#3b82f6", b:"#06b6d4" },
};
const ALARM_RED  = "#ff3b3b";
const CALM_TEAL  = "#2dd4bf";
const LINE_GREEN = "#06c755"; // LINEのブランドグリーン

function hexToRgb(hex) {
  const v = hex.replace("#","");
  return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
}
function mixHex(a, b, t) {
  const ra=hexToRgb(a), rb=hexToRgb(b), c=Math.max(0,Math.min(1,t));
  return `rgb(${ra.map((v,i)=>Math.round(v+(rb[i]-v)*c)).join(",")})`;
}
function getGlow(screen, sim, outcomeKey, baseColor) {
  if (screen==="calm"||outcomeKey==="quiet"||outcomeKey==="apologize") return CALM_TEAL;
  if (sim.uproar>0) return mixHex(baseColor.b, ALARM_RED, sim.uproar/90);
  return mixHex(baseColor.a, baseColor.b, 0.4);
}

// ============================================================
// アバターコンポーネント (インラインSVGイラスト)
// ============================================================
const AVATARS = {
  friend: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#7c3aed"/>
      {/* 髪 */}
      <ellipse cx="20" cy="14" rx="10" ry="9" fill="#4c1d95"/>
      <rect x="10" y="14" width="20" height="8" fill="#4c1d95"/>
      {/* 顔 */}
      <ellipse cx="20" cy="22" rx="9" ry="10" fill="#fbbf24"/>
      {/* 目 */}
      <ellipse cx="16.5" cy="20" rx="1.5" ry="2" fill="#1e1b4b"/>
      <ellipse cx="23.5" cy="20" rx="1.5" ry="2" fill="#1e1b4b"/>
      {/* 口 */}
      <path d="M16 25 Q20 28 24 25" stroke="#92400e" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  user: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#2563eb"/>
      {/* 髪 */}
      <ellipse cx="20" cy="13" rx="9" ry="8" fill="#1e3a8a"/>
      <rect x="11" y="13" width="18" height="7" fill="#1e3a8a"/>
      {/* 顔 */}
      <ellipse cx="20" cy="22" rx="8.5" ry="9.5" fill="#fed7aa"/>
      {/* 目 */}
      <ellipse cx="16.5" cy="20" rx="1.5" ry="1.8" fill="#1e293b"/>
      <ellipse cx="23.5" cy="20" rx="1.5" ry="1.8" fill="#1e293b"/>
      {/* 口 */}
      <path d="M17 25 Q20 27.5 23 25" stroke="#9a3412" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  ),
};

// コメント欄用のアバター(インデックスで切り替え)
function CommentAvatar({ index, size = 24 }) {
  const colors = ["#dc2626","#d97706","#16a34a","#2563eb","#7c3aed","#db2777","#0891b2","#65a30d","#ea580c","#9333ea"];
  const bg = colors[index % colors.length];
  const icons = ["🏘","🌿","🚶","👥","🏡","📰","😟","😌","📢","👀"];
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-white font-bold"
      style={{ width:size, height:size, background:bg, fontSize:size*0.45 }}>
      {icons[index % icons.length]}
    </div>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function App() {
  const [screen,       setScreen]       = useState("title");
  const [scenario,     setScenario]     = useState(null);
  const [turnIndex,    setTurnIndex]    = useState(0);
  const [selected,     setSelected]     = useState(null);
  const [comment,      setComment]      = useState("");
  const [history,      setHistory]      = useState([]);
  const [endingStep,   setEndingStep]   = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [hasViewedComments, setHasViewedComments] = useState(false);
  const [prevScreen,   setPrevScreen]   = useState(null);
  const [shuffledChoices, setShuffledChoices] = useState([]);

  const turns   = scenario?.turns ?? [];
  const turn    = turns[turnIndex];
  const sim     = simulate(history);
  const prevSim = simulate(history.slice(0,-1));
  const delta   = sim.followers - prevSim.followers;
  const resRecord  = history.find((h) => h.type==="response");
  const outcome    = resRecord ? RESPONSE_OUTCOMES[resRecord.key] : null;
  const lastRecord = history[history.length-1];
  const comments   = scenario && turn ? getComments(scenario, turn.id, lastRecord) : [];
  const evaluation = screen==="turn" && selected && turn?.type==="choice" ? evaluateComment(comment) : null;
  const previewMult = evaluation ? Math.max(1, selected.mult+evaluation.bonus) : null;
  const meterPct    = evaluation ? Math.round(((previewMult-1)/10)*100) : 0;
  const baseColor   = scenario ? (THEME_COLORS[scenario.glowBase]??THEME_COLORS.pink) : THEME_COLORS.pink;
  const glow        = getGlow(screen, sim, resRecord?.key, baseColor);

  // ターンが変わるたびに選択肢をシャッフル
  useEffect(() => {
    if (turn?.choices) setShuffledChoices(shuffle(turn.choices));
  }, [turnIndex, scenario]);

  function resetState() {
    setHistory([]); setTurnIndex(0); setSelected(null);
    setComment(""); setEndingStep(0); setShowComments(false); setHasViewedComments(false);
  }
  function selectScenario(s) { setScenario(s); resetState(); setScreen("turn"); }
  function backToScenario()  { resetState(); setScenario(null); setPrevScreen(null); setScreen("scenario"); }
  function openExplain()     { setPrevScreen(screen); setScreen("explain"); }
  function closeExplain()    { setScreen(prevScreen??"title"); setPrevScreen(null); }
  function toggleComments()  { setShowComments((v)=>!v); setHasViewedComments(true); }

  function finishComment() {
    if (!selected) return;
    if (turn.type==="choice") {
      const ev   = evaluateComment(comment);
      const mult = Math.max(1, selected.mult+ev.bonus);
      setHistory((h)=>[...h,{type:"choice",key:selected.key,baseMult:selected.mult,bonus:ev.bonus,mult,postTruth:!!turn.postTruth,comment}]);
    } else {
      setHistory((h)=>[...h,{type:"response",key:selected.key,comment}]);
    }
    setScreen("result");
  }

  function nextStep() {
    setShowComments(false);
    if (turn.type==="response") { setEndingStep(0); setScreen("ending"); return; }
    if (turn.postTruth && sim.uproar<UPROAR_SKIP_THRESHOLD) { setScreen("calm"); return; }
    setTurnIndex((i)=>i+1); setSelected(null); setComment(""); setScreen("turn");
  }

  function proceedQuiet() {
    setHistory((h)=>[...h,{type:"response",key:"quiet",comment:""}]);
    setEndingStep(0); setScreen("ending");
  }

  const anxietyNote  = sim.anxiety>100 ? " 一部の人は、今も漠然とした不安を抱えたままだ。" : "";
  const commentWarn  = !hasViewedComments && sim.uproar>30
    ? " コメント欄を一度も確認しなかった。投稿した後、人々がどう受け取っているかを見ないまま次へ進んでいた。コメントの中には、立ち止まるためのヒントが含まれていたかもしれない。" : "";
  const finalMsg     = outcome ? outcome.message+anxietyNote+commentWarn : "";

  const endingSteps = [
    { type:"stats" },
    { type:"prose", icon:Flame,  label:"メッセージ",   value:finalMsg },
    { type:"prose", icon:Home,   label:"投稿のその後", value:getPersonalImpact(sim.uproar) },
  ];

  // ============================================================
  // 共通ヘッダー(フォロワー数常時表示)
  // ============================================================
  function FollowerHeader() {
    if (screen==="title"||screen==="explain"||screen==="scenario") return null;
    return (
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-soft">
        <div className="flex items-center gap-1.5">
          <Users size={12} style={{color:glow}}/>
          <span className="font-mono text-[10px] text-muted uppercase tracking-wide">フォロワー</span>
        </div>
        <span className="font-display font-bold text-sm" style={{color:glow}}>
          {sim.followers.toLocaleString()}
        </span>
        <div style={{width:60}}/>
      </div>
    );
  }

  // ============================================================
  // 各画面のレンダリング
  // ============================================================
  function renderScreen() {

    // タイトル
    if (screen==="title") {
      const grad = `linear-gradient(90deg, ${THEME_COLORS.pink.a}, ${THEME_COLORS.pink.b})`;
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-8 px-6">
          <h1 className="font-display text-4xl font-bold bg-clip-text text-transparent" style={{backgroundImage:grad}}>
            Follow Me!
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            フォロワー30万人を目指す<br/>SNS発信シミュレーション
          </p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-xs text-muted font-mono"><Heart size={14}/> 1.2k</span>
            <span className="flex items-center gap-1 text-xs text-muted font-mono"><MessageCircle size={14}/> 84</span>
          </div>
          <button onClick={()=>setScreen("explain")}
            className="mt-2 font-display font-bold text-sm text-canvas px-10 py-3 rounded-full active:scale-95 transition-transform"
            style={{background:grad}}>
            はじめる
          </button>
        </div>
      );
    }

    // 説明
    if (screen==="explain") {
      const grad  = `linear-gradient(90deg, ${THEME_COLORS.pink.a}, ${THEME_COLORS.pink.b})`;
      const fromGame = prevScreen && prevScreen!=="title" && prevScreen!=="scenario";
      return (
        <div className="flex-1 flex flex-col gap-4 pt-4 px-6 pb-6">
          <h2 className="font-display text-lg font-bold text-ink">このゲームについて</h2>
          <div className="flex flex-col gap-3 flex-1">
            <div className="bg-surface-soft rounded-2xl p-4">
              <p className="text-xs font-mono text-muted uppercase tracking-wide mb-2">あなたの目標</p>
              <p className="text-sm text-ink leading-relaxed">SNSでフォロワー<span className="font-bold">30万人</span>を目指して投稿を続けよう。バズればバズるほどフォロワーは増える。でも、その先に何が待っているかは…自分で確かめてほしい。</p>
            </div>
            <div className="bg-surface-soft rounded-2xl p-4">
              <p className="text-xs font-mono text-muted uppercase tracking-wide mb-2">遊び方</p>
              <p className="text-sm text-ink leading-relaxed">友人からのメッセージを読んで、投稿するタイトルを選ぼう。コメントを書き加えることもできる。選択肢によって投稿の拡散力が変わる。全部で数ターン、最後に結果が発表される。</p>
            </div>
            <div className="rounded-2xl p-4 border" style={{borderColor:THEME_COLORS.pink.a, background:"rgba(255,61,129,0.05)"}}>
              <p className="text-xs font-mono uppercase tracking-wide mb-2" style={{color:THEME_COLORS.pink.a}}>知っておいてほしいこと</p>
              <p className="text-sm text-ink leading-relaxed">このゲームで起きることは、今この瞬間もSNS上で実際に起きている。ゲームが終わったとき、あなたが何かを感じてくれたら、それがこのゲームを作った理由だ。</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {fromGame && (
              <button onClick={closeExplain}
                className="w-full flex items-center justify-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full border border-surface-soft text-muted">
                ゲームに戻る
              </button>
            )}
            <button onClick={()=>{resetState();setScenario(null);setPrevScreen(null);setScreen("scenario");}}
              className="w-full flex items-center justify-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
              style={{background:grad}}>
              {fromGame ? "シナリオを選び直す" : "シナリオを選ぶ"} <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      );
    }

    // シナリオ選択
    if (screen==="scenario") {
      return (
        <div className="flex-1 flex flex-col gap-4 pt-4 px-6 pb-6">
          <h2 className="font-display text-lg font-bold text-ink">シナリオを選ぼう</h2>
          <div className="flex flex-col gap-3">
            {scenariosData.map((s,i)=>{
              const c = THEME_COLORS[s.glowBase]??THEME_COLORS.pink;
              return (
                <button key={s.id} onClick={()=>selectScenario(s)}
                  className="text-left rounded-2xl p-4 border-l-4 transition-colors"
                  style={{borderLeftColor:c.a, background:"var(--color-surface-soft)"}}>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-sm text-ink">シナリオ {i+1}</span>
                    <ChevronRight size={16} className="text-muted"/>
                  </div>
                  <p className="text-[11px] text-muted mt-1">{s.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // ゲームターン画面: LINEエリア + 仕切り + Xエリア
    if (screen==="turn") {
      const isResp = turn.type==="response";
      return (
        <div className="flex-1 flex flex-col">

          {/* ===== LINEエリア ===== */}
          <div className="px-4 pt-3 pb-4" style={{background:"#fef9e7"}}>
            {/* LINEヘッダー */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{background:LINE_GREEN}}>
                <span className="text-white font-bold" style={{fontSize:8}}>L</span>
              </div>
              <span className="text-[10px] font-mono" style={{color:"#7d6608"}}>トーク</span>
            </div>

            {/* 友達のアバターとメッセージ */}
            <div className="flex items-start gap-2">
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                {AVATARS.friend}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-medium" style={{color:"#7d6608"}}>友人</span>
                {turn.info.map((line,i)=>(
                  <div key={i} className="max-w-[240px] rounded-2xl rounded-tl-sm px-3 py-2"
                    style={{background:LINE_GREEN}}>
                    <p className="text-sm text-white leading-relaxed">{line}</p>
                  </div>
                ))}
                <span className="text-[9px]" style={{color:"#7d6608"}}>たった今</span>
              </div>
            </div>
          </div>

          {/* ===== 仕切り ===== */}
          <div className="flex items-center gap-2 px-4 py-2" style={{background:"#f0f2f5"}}>
            <div className="flex-1 h-px" style={{background:"#d1d5db"}}/>
            <span className="text-[10px] font-mono whitespace-nowrap" style={{color:"#6b7280"}}>
              {isResp ? "── 対応を選ぶ ──" : "── あなたの投稿 ──"}
            </span>
            <div className="flex-1 h-px" style={{background:"#d1d5db"}}/>
          </div>

          {/* ===== Xエリア ===== */}
          <div className="flex-1 flex flex-col px-4 pt-3 pb-4 gap-3">
            {/* Xスタイルのヘッダー */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                {AVATARS.user}
              </div>
              <div>
                <span className="text-xs font-bold text-ink">あなた</span>
                <span className="text-[10px] text-muted ml-1">@user</span>
              </div>
            </div>

            {/* 選択肢(シャッフル済み) */}
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-muted">
                {isResp ? "どう対応する?" : "投稿タイトルを選んでください"}
              </p>
              {shuffledChoices.map((c)=>{
                const isSel = selected?.key===c.key;
                return (
                  <button key={c.key} onClick={()=>setSelected(c)}
                    className="text-left rounded-xl p-3 border-2 transition-all"
                    style={{
                      borderColor: isSel ? glow : "#d1d5db",
                      background: isSel ? `color-mix(in srgb, ${glow} 12%, white)` : "var(--color-surface)",
                      boxShadow: isSel ? `0 0 0 1px ${glow}` : "none",
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm" style={{color: isSel ? glow : "var(--color-ink)"}}>
                        {c.text}
                      </span>
                    </div>
                    </button>
                );
              })}
            </div>

            {/* コメント入力(Xスタイル) */}
            {!isResp && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-start bg-white rounded-xl p-3 border border-surface-soft">
                  <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-1">
                    {AVATARS.user}
                  </div>
                  <textarea value={comment} onChange={(e)=>setComment(e.target.value)} rows={2}
                    placeholder={selected ? "コメントを追加..." : "タイトルを選んでからコメントを追加"}
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted resize-none focus:outline-none"/>
                </div>
              </div>
            )}

            {/* X風ツールバー + 投稿ボタン */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-surface-soft">
              <div className="flex gap-3 text-muted">
                <span className="text-[10px] font-mono">{comment.length}/140</span>
              </div>
              <button onClick={finishComment} disabled={!selected}
                className="font-display font-bold text-sm px-5 py-1.5 rounded-full text-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                style={{background:glow}}>
                {isResp ? "決定" : "投稿する"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 結果画面
    if (screen==="result") {
      return (
        <div className="flex-1 flex flex-col gap-4 px-4 pt-3 pb-6">
          {turn.type==="choice" ? (
            <>
              {/* Xスタイルの投稿カード */}
              <div className="bg-surface-soft rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden">{AVATARS.user}</div>
                  <div>
                    <span className="text-xs font-bold text-ink">あなた</span>
                    <span className="text-[10px] text-muted ml-1">@user · たった今</span>
                  </div>
                </div>
                <p className="text-sm text-ink mb-2">{lastRecord?.comment || (lastRecord?.key && turn.choices.find(c=>c.key===lastRecord.key)?.text)}</p>
                <div className="flex items-center justify-between pt-2 border-t border-canvas">
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <MessageCircle size={13}/> {(lastRecord?.mult*18).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <Repeat2 size={13}/> {(lastRecord?.mult*9).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <Heart size={13}/> {(lastRecord?.mult*120).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <BookmarkIcon size={13}/>
                  </span>
                </div>
              </div>

              {/* フォロワー増加 */}
              <div className="flex items-center gap-2 text-xs text-muted">
                <ArrowUpRight size={16} style={{color:glow}}/>
                <span>拡散率 <span className="text-ink font-bold">×{lastRecord?.mult}</span>
                  {lastRecord?.bonus!==0 && <span className="text-muted ml-1">(タイトル×{lastRecord?.baseMult} {lastRecord?.bonus>0?"+":""}{lastRecord?.bonus} コメント補正)</span>}
                </span>
              </div>

              {/* 次へボタン */}
              <button onClick={nextStep}
                className="flex items-center justify-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
                style={{background:glow}}>
                次のターンへ <ChevronRight size={16}/>
              </button>

              {/* コメントを見る */}
              <button onClick={toggleComments} className="self-start text-[11px] text-muted underline font-mono">
                {showComments ? "コメントを閉じる" : `コメントを見る (${comments.length})`}
              </button>
              {showComments && comments.length>0 && (
                <div className="flex flex-col gap-2">
                  {comments.map((cm,i)=>(
                    <div key={i} className="flex items-start gap-2 rounded-xl p-3 border-l-2"
                      style={{borderLeftColor:cm.tone==="doubt"?CALM_TEAL:"transparent", background:"var(--color-surface-soft)"}}>
                      <CommentAvatar index={i} size={24}/>
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
              <button onClick={nextStep}
                className="mt-auto self-end flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
                style={{background:glow}}>
                結果発表へ <ChevronRight size={16}/>
              </button>
            </>
          )}
        </div>
      );
    }

    // 鎮静画面
    if (screen==="calm") {
      return (
        <div className="flex-1 flex flex-col gap-4 px-4 pt-4 pb-6 justify-center items-center text-center">
          <ShieldAlert size={28} style={{color:CALM_TEAL}}/>
          <p className="text-sm font-bold text-ink">大きな炎上にはならなかった。</p>
          <div className="bg-surface-soft rounded-2xl p-5 text-left">
            <p className="text-sm leading-relaxed text-ink">ただし、「大事にならなかった」と「正しかった」は違う。批判のコメントはいくつか届いていたし、スクリーンショットを撮って保存していた人もいたかもしれない。</p>
            <p className="text-sm leading-relaxed text-ink mt-3">今回はたまたま大きく燃えなかっただけ。SNSでは「運よく助かった」が何度も続くとは限らない。</p>
          </div>
          <button onClick={proceedQuiet}
            className="flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
            style={{background:CALM_TEAL}}>
            結果を見る <ChevronRight size={16}/>
          </button>
        </div>
      );
    }

    // エンディング
    if (screen==="ending") {
      const isComplete = endingStep>=endingSteps.length-1;
      return (
        <div className="flex-1 flex flex-col gap-3 px-4 pt-4 pb-6">
          {/* step 0: 数字一括 */}
          {endingStep>=0 && (
            <div className="bg-surface-soft rounded-2xl p-5 flex flex-col gap-4 animate-rise-in">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono text-muted uppercase tracking-wide">フォロワー数</span>
                <span className="font-display text-4xl font-bold text-ink animate-count-pop">
                  {sim.followers.toLocaleString()}<span className="text-lg ml-1">人</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-canvas rounded-xl p-3 flex flex-col items-center gap-1">
                  <Eye size={14} style={{color:glow}}/>
                  <span className="text-[10px] font-mono text-muted">閲覧数</span>
                  <span className="font-display text-sm font-bold text-ink">{(sim.followers*8).toLocaleString()} 回</span>
                </div>
                <div className="bg-canvas rounded-xl p-3 flex flex-col items-center gap-1">
                  <DollarSign size={14} style={{color:glow}}/>
                  <span className="text-[10px] font-mono text-muted">推定収益</span>
                  <span className="font-display text-sm font-bold text-ink">¥{Math.round(sim.followers*0.5).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* step 1以降: 1枚ずつ */}
          {endingStep>=1 && endingSteps.slice(1,endingStep+1).map((s,i)=>{
            const Icon=s.icon;
            return (
              <div key={i} className="rounded-2xl p-4 flex items-start gap-3 border animate-rise-in"
                style={{borderColor:glow, background:"rgba(255,255,255,0.02)"}}>
                <Icon size={18} style={{color:glow}} className="mt-0.5 shrink-0"/>
                <div>
                  <p className="text-[10px] font-mono text-muted uppercase tracking-wide">{s.label}</p>
                  <p className="text-sm text-ink leading-relaxed mt-1">{s.value}</p>
                </div>
              </div>
            );
          })}

          {!isComplete ? (
            <button onClick={()=>setEndingStep((s)=>s+1)}
              className="self-end flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas mt-1"
              style={{background:glow}}>
              次へ <ChevronRight size={16}/>
            </button>
          ) : (
            <div className="flex gap-2 mt-1">
              <button onClick={()=>{resetState();setScreen("turn");}}
                className="flex-1 flex items-center justify-center gap-1 font-display font-bold text-sm px-4 py-2.5 rounded-full text-canvas"
                style={{background:glow}}>
                <RotateCcw size={16}/> もう一度
              </button>
              <button onClick={backToScenario}
                className="flex-1 flex items-center justify-center gap-1 font-display font-bold text-sm px-4 py-2.5 rounded-full border border-surface-soft text-muted">
                シナリオ選択へ
              </button>
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  // ============================================================
  // レイアウト (スマホ: 全画面 / PC: スマホ型カード)
  // ============================================================
  const phoneContent = (
    <div className="w-full h-full bg-surface flex flex-col overflow-hidden">
      {/* 右上 ? ボタン */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-1">
          <Sparkles size={12} style={{color:glow}}/>
          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-muted">Follow Me!</span>
        </div>
        {screen!=="explain" && (
          <button onClick={openExplain}
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-muted border border-surface-soft bg-surface-soft hover:border-muted transition-colors">
            ?
          </button>
        )}
      </div>

      {/* フォロワー数常時表示ヘッダー */}
      <FollowerHeader/>

      {/* メインコンテンツ (スクロール可) */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {renderScreen()}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] rounded-full blur-3xl animate-pulse-glow pointer-events-none opacity-40" style={{background:glow}}/>

      {/* スマホ: 全画面 */}
      <div className="flex sm:hidden w-full min-h-screen">
        {phoneContent}
      </div>

      {/* PC / タブレット: スマホ型カード */}
      <div className="hidden sm:flex flex-col items-center py-10 px-4 relative z-10">
        <div className="w-[390px] rounded-[2.5rem] p-[2px] shadow-2xl"
          style={{background:`linear-gradient(160deg, ${glow}, transparent 60%)`}}>
          <div className="w-full bg-surface rounded-[2.4rem] overflow-hidden" style={{height:"780px"}}>
            {/* ノッチ風 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-24 h-5 bg-canvas rounded-full"/>
            </div>
            <div className="h-[calc(100%-28px)] flex flex-col overflow-hidden">
              {/* 右上 ? ボタン */}
              <div className="flex items-center justify-between px-6 py-2">
                <div className="flex items-center gap-1">
                  <Sparkles size={12} style={{color:glow}}/>
                  <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-muted">Follow Me!</span>
                </div>
                {screen!=="explain" && (
                  <button onClick={openExplain}
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-muted border border-surface-soft bg-surface-soft hover:border-muted transition-colors">
                    ?
                  </button>
                )}
              </div>
              <FollowerHeader/>
              <div className="flex-1 flex flex-col overflow-y-auto">
                {renderScreen()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}