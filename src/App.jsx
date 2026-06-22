// Follow Me! — App.jsx
// シナリオをsrc/data/scenarios.jsonから読み込み、
// タイトル画面でシナリオを選んでからゲームを開始する構造にした

import { useState } from "react";
import scenariosData from "./data/scenarios.json";
import {
  Users, TrendingUp, DollarSign, Eye, AlertTriangle,
  MessageSquare, Flame, ShieldAlert, RotateCcw, ChevronRight,
  Heart, MessageCircle, Share2, Sparkles, ArrowUpRight, Home,
} from "lucide-react";

const STARTING_FOLLOWERS = 1200;
const REACH_RATIO = 0.4;
const UPROAR_SKIP_THRESHOLD = 20;

const ALARM_WORDS = ["絶対","危険","今すぐ","拡散希望","緊急","パニック","助けて","信じられない","ヤバい"];
const CALM_WORDS  = ["未確認","真偽不明","ソース","出典","確認中","公式発表","かもしれない","誤解を招く","落ち着いて"];

function evaluateComment(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return { bonus: 0, alarmHits: [], calmHits: [] };
  const alarmHits = ALARM_WORDS.filter((w) => trimmed.includes(w));
  const calmHits  = CALM_WORDS.filter((w) => trimmed.includes(w));
  const excl = (trimmed.match(/[!!]/g) || []).length;
  const raw  = alarmHits.length - calmHits.length + Math.min(excl, 3) * 0.5;
  return { bonus: Math.max(-2, Math.min(3, raw)), alarmHits, calmHits };
}

const RESPONSE_OUTCOMES = {
  apologize: { reach: 80,  uproarDelta: -10, message: "誠実な対応により、訂正情報は多くの人に届いた。それでも一度広まった不安は完全には消えなかった。" },
  delete:    { reach: 20,  uproarDelta:   5, message: "投稿は削除されたが、スクリーンショットで誤情報は拡散し続けた。" },
  ignore:    { reach:  5,  uproarDelta:  15, message: "説明のないまま時間が過ぎ、不信感だけが残った。" },
  excuse:    { reach: 30,  uproarDelta:  20, message: "言い訳は火に油を注ぎ、炎上はさらに拡大した。" },
  quiet:     { reach: 95,  uproarDelta:   0, message: "大きな炎上にはならず、訂正情報も自然と多くの人に届いた。今回はたまたま大事に至らなかっただけかもしれない。" },
};

function simulate(history) {
  return history.reduce(
    (s, h) => {
      if (h.type === "choice") {
        return {
          followers: Math.round(s.followers * (1 + REACH_RATIO * h.mult)),
          social:    s.social + h.mult * h.mult,
          anxiety:   s.anxiety + h.mult * 5,
          uproar:    s.uproar + (h.postTruth ? h.mult * 10 : 0),
        };
      }
      return { ...s, uproar: Math.max(0, s.uproar + RESPONSE_OUTCOMES[h.key].uproarDelta) };
    },
    { followers: STARTING_FOLLOWERS, social: 0, anxiety: 0, uproar: 0 }
  );
}

function getComments(scenario, turnId, record) {
  if (!record || record.type === "response") return [];
  const pool = scenario.comments[String(turnId)];
  if (!pool) return [];
  let list;
  if (record.postTruth) {
    list = record.mult <= 2 ? pool.relieved : pool.backlash;
  } else {
    const tier = record.mult <= 2 ? "calm" : record.mult <= 6 ? "mid" : "hot";
    list = pool[tier] || pool.calm || [];
  }
  const authors = ["フォロワー","近隣住民","通行人","友人の友人","地元の人","ニュース好き","心配性さん","冷静派","拡散希望さん","様子見さん"];
  return (list || []).map((c, i) => ({ author: authors[i % authors.length], text: c.text, tone: c.tone }));
}

function getPersonalImpact(uproar) {
  if (uproar > 60) return "あなたの名前と顔が、見知らぬ何万人もの人に晒された。「死ね」「消えろ」という言葉が毎日届き、学校に行くのが怖くなった。家族にも迷惑がかかり、友人にも距離を置かれた。投稿を押したあの瞬間に戻れるなら、と何度も思った。";
  if (uproar > 30) return "しばらくの間、見知らぬアカウントから批判のメッセージが届き続けた。街で誰かに見られているような気がして、落ち着かない日が続いた。一度SNSに広まった情報は、自分では消せないと初めて実感した。";
  return "大きな炎上にはならなかったが、それは運がよかっただけかもしれない。一度ネットに出た情報は、誰かの手元に残り続ける。「あのとき投稿しなければよかった」と思う日が来る前に、立ち止まることが大切だ。";
}

// シナリオのテーマごとにグローカラーを変える
const THEME_COLORS = {
  pink:   { a: "#ff3d81", b: "#ff8a3d" },
  green:  { a: "#22c55e", b: "#84cc16" },
  purple: { a: "#a855f7", b: "#ec4899" },
  blue:   { a: "#3b82f6", b: "#06b6d4" },
};

const ALARM_RED  = "#ff3b3b";
const CALM_TEAL  = "#2dd4bf";

function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
}
function mixHex(a, b, t) {
  const ra = hexToRgb(a), rb = hexToRgb(b);
  const c  = Math.max(0, Math.min(1, t));
  return `rgb(${ra.map((v,i) => Math.round(v+(rb[i]-v)*c)).join(",")})`;
}
function getGlow(screen, sim, outcomeKey, baseColor) {
  if (screen === "calm" || outcomeKey === "quiet" || outcomeKey === "apologize") return CALM_TEAL;
  if (sim.uproar > 0) return mixHex(baseColor.b, ALARM_RED, sim.uproar / 90);
  return mixHex(baseColor.a, baseColor.b, 0.4);
}

export default function App() {
  const [screen,          setScreen]          = useState("title"); // title → explain → scenario → turn → result → ending
  const [scenario,        setScenario]        = useState(null);
  const [turnIndex,       setTurnIndex]       = useState(0);
  const [selected,        setSelected]        = useState(null);
  const [comment,         setComment]         = useState("");
  const [history,         setHistory]         = useState([]);
  const [endingStep,      setEndingStep]      = useState(0);
  const [showDev,         setShowDev]         = useState(false);
  const [showComments,    setShowComments]    = useState(false);
  const [hasViewedComments, setHasViewedComments] = useState(false);

  const turns      = scenario?.turns ?? [];
  const turn       = turns[turnIndex];
  const sim        = simulate(history);
  const prevSim    = simulate(history.slice(0, -1));
  const delta      = sim.followers - prevSim.followers;
  const resRecord  = history.find((h) => h.type === "response");
  const outcome    = resRecord ? RESPONSE_OUTCOMES[resRecord.key] : null;
  const lastRecord = history[history.length - 1];
  const comments   = scenario && turn ? getComments(scenario, turn.id, lastRecord) : [];
  const evaluation = screen === "turn" && selected && turn?.type === "choice" ? evaluateComment(comment) : null;
  const previewMult = evaluation ? Math.max(1, selected.mult + evaluation.bonus) : null;
  const meterPct    = evaluation ? Math.round(((previewMult - 1) / 10) * 100) : 0;
  const baseColor   = scenario ? (THEME_COLORS[scenario.glowBase] ?? THEME_COLORS.pink) : THEME_COLORS.pink;
  const glow        = getGlow(screen, sim, resRecord?.key, baseColor);

  function selectScenario(s) {
    setScenario(s);
    resetState();
    setScreen("turn");
  }

  function resetState() {
    setHistory([]); setTurnIndex(0); setSelected(null);
    setComment(""); setEndingStep(0); setShowComments(false); setHasViewedComments(false);
  }

  function backToTitle() { resetState(); setScenario(null); setScreen("scenario"); }

  function toggleComments() { setShowComments((v) => !v); setHasViewedComments(true); }

  function finishComment() {
    if (!selected) return;
    if (turn.type === "choice") {
      const ev   = evaluateComment(comment);
      const mult = Math.max(1, selected.mult + ev.bonus);
      setHistory((h) => [...h, { type:"choice", key:selected.key, baseMult:selected.mult, bonus:ev.bonus, mult, postTruth:!!turn.postTruth, comment }]);
    } else {
      setHistory((h) => [...h, { type:"response", key:selected.key, comment }]);
    }
    setScreen("result");
  }

  function nextStep() {
    setShowComments(false);
    if (turn.type === "response") { setEndingStep(0); setScreen("ending"); return; }
    if (turn.postTruth && sim.uproar < UPROAR_SKIP_THRESHOLD) { setScreen("calm"); return; }
    setTurnIndex((i) => i + 1); setSelected(null); setComment(""); setScreen("turn");
  }

  function proceedQuiet() {
    setHistory((h) => [...h, { type:"response", key:"quiet", comment:"" }]);
    setEndingStep(0); setScreen("ending");
  }

  const socialLabel = sim.social > 100 ? "大" : sim.social > 20 ? "中" : "小";
  const anxietyNote = sim.anxiety > 100 ? " 一部の人は、今も漠然とした不安を抱えたままだ。" : "";
  const commentWarn = !hasViewedComments && sim.uproar > 30
    ? " コメント欄を一度も確認しなかった。投稿した後、人々がどう受け取っているかを見ないまま次へ進んでいた。コメントの中には、立ち止まるためのヒントが含まれていたかもしれない。" : "";
  const finalMsg = outcome ? outcome.message + anxietyNote + commentWarn : "";

  const endingItems = [
    { icon: Users,        label: "フォロワー数",          value: `${sim.followers.toLocaleString()} 人` },
    { icon: DollarSign,   label: "推定収益",              value: `¥${Math.round(sim.followers*0.5).toLocaleString()}` },
    { icon: Eye,          label: "投稿閲覧数",            value: `${(sim.followers*8).toLocaleString()} 回` },
    { icon: AlertTriangle,label: "社会的影響",            value: socialLabel },
    { icon: MessageSquare,label: "問い合わせ増加数",      value: `${sim.social*8} 件` },
    { icon: ShieldAlert,  label: "訂正投稿の到達率",      value: `${outcome?.reach ?? 0}%` },
    { icon: Flame,        label: "メッセージ",            value: finalMsg },
    { icon: Home,         label: "投稿のその後",          value: getPersonalImpact(sim.uproar) },
  ];

  // ---- 画面ごとのレンダリング ----
  function renderScreen() {

    // タイトル画面
    if (screen === "title") {
      const grad = `linear-gradient(90deg, ${THEME_COLORS.pink.a}, ${THEME_COLORS.pink.b})`;
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-8">
          <h1 className="font-display text-4xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: grad }}>
            Follow Me!
          </h1>
          <p className="text-sm text-muted leading-relaxed px-4">
            フォロワー30万人を目指す<br />SNS発信シミュレーション
          </p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-xs text-muted font-mono"><Heart size={14} /> 1.2k</span>
            <span className="flex items-center gap-1 text-xs text-muted font-mono"><MessageCircle size={14} /> 84</span>
          </div>
          <button onClick={() => setScreen("explain")}
            className="mt-2 font-display font-bold text-sm text-canvas px-10 py-3 rounded-full transition-transform active:scale-95"
            style={{ background: grad }}>
            はじめる
          </button>
        </div>
      );
    }

    // ゲーム説明画面
    if (screen === "explain") {
      const grad = `linear-gradient(90deg, ${THEME_COLORS.pink.a}, ${THEME_COLORS.pink.b})`;
      return (
        <div className="flex-1 flex flex-col gap-5 pt-4">
          <h2 className="font-display text-lg font-bold text-ink">このゲームについて</h2>
          <div className="flex flex-col gap-3">
            <div className="bg-surface-soft rounded-2xl p-4">
              <p className="text-xs font-mono text-muted uppercase tracking-wide mb-2">あなたの目標</p>
              <p className="text-sm text-ink leading-relaxed">
                SNSでフォロワー<span className="font-bold text-ink">30万人</span>を目指して投稿を続けよう。バズればバズるほどフォロワーは増える。でも、その先に何が待っているかは…自分で確かめてほしい。
              </p>
            </div>
            <div className="bg-surface-soft rounded-2xl p-4">
              <p className="text-xs font-mono text-muted uppercase tracking-wide mb-2">遊び方</p>
              <p className="text-sm text-ink leading-relaxed">
                友人からのメッセージを読んで、投稿するタイトルを選ぼう。コメントを書き加えることもできる。選択肢によって投稿の拡散力が変わる。全部で数ターン、最後に結果が発表される。
              </p>
            </div>
            <div className="border rounded-2xl p-4" style={{ borderColor: THEME_COLORS.pink.a, background:"rgba(255,61,129,0.05)" }}>
              <p className="text-xs font-mono uppercase tracking-wide mb-2" style={{ color: THEME_COLORS.pink.a }}>知っておいてほしいこと</p>
              <p className="text-sm text-ink leading-relaxed">
                このゲームで起きることは、今この瞬間もSNS上で実際に起きている。ゲームが終わったとき、あなたが何かを感じてくれたら、それがこのゲームを作った理由だ。
              </p>
            </div>
          </div>
          <button onClick={() => setScreen("scenario")}
            className="mt-auto self-end flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
            style={{ background: grad }}>
            シナリオを選ぶ <ChevronRight size={16} />
          </button>
        </div>
      );
    }

    // シナリオ選択画面
    if (screen === "scenario") {
      const grad = `linear-gradient(90deg, ${THEME_COLORS.pink.a}, ${THEME_COLORS.pink.b})`;
      return (
        <div className="flex-1 flex flex-col items-center gap-5 py-6">
          <h2 className="font-display text-lg font-bold text-ink self-start">シナリオを選ぼう</h2>
          <div className="w-full flex flex-col gap-3">
            {scenariosData.map((s, i) => {
              const c = THEME_COLORS[s.glowBase] ?? THEME_COLORS.pink;
              return (
                <button key={s.id} onClick={() => selectScenario(s)}
                  className="text-left rounded-2xl p-4 border-l-4 transition-colors"
                  style={{ borderLeftColor: c.a, background: "var(--color-surface-soft)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-sm text-ink">シナリオ {i + 1}</span>
                    <ChevronRight size={16} className="text-muted" />
                  </div>
                  <p className="text-[11px] text-muted mt-1">{s.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // ターン画面(情報確認・選択・コメント入力を1画面に)
    if (screen === "turn") {
      const isResp = turn.type === "response";
      return (
        <div className="flex-1 flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface-soft flex items-center justify-center text-xs text-muted">友</div>
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
          <p className="text-[10px] text-muted font-mono uppercase tracking-wide">学習要素: {turn.learning}</p>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">{isResp ? "対応を選んでください" : "投稿するタイトルを選んでください"}</p>
            {turn.choices.map((c) => {
              const isSel = selected?.key === c.key;
              return (
                <button key={c.key} onClick={() => setSelected(c)}
                  className="text-left rounded-2xl p-3 pl-4 border-l-4 transition-colors"
                  style={{ borderLeftColor: isSel ? glow : "transparent", background:"var(--color-surface-soft)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-ink">{c.text}</span>
                    {c.mult && (
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color:"#ff8a3d", background:"rgba(255,138,61,0.12)" }}>×{c.mult}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted mt-1">{c.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">コメントを入力(任意)</p>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
              placeholder={selected ? "ひとことコメントを書く..." : "まずは上でタイトルを選んでください"}
              className="bg-surface-soft rounded-2xl p-4 text-sm text-ink placeholder:text-muted resize-none focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": glow }}
            />
            {!isResp && selected && (
              <div className="bg-surface-soft rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                  <span>AI評価(プレビュー)</span>
                  <span className="text-ink font-bold">×{selected.mult} → ×{previewMult}</span>
                </div>
                <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width:`${Math.max(8,meterPct)}%`, background:glow }} />
                </div>
                {evaluation.alarmHits.length > 0 && <p className="text-[10px] text-muted">煽り検出: {evaluation.alarmHits.join("、")}</p>}
                {evaluation.calmHits.length  > 0 && <p className="text-[10px] text-muted">慎重な表現: {evaluation.calmHits.join("、")}</p>}
              </div>
            )}
          </div>

          <button onClick={finishComment} disabled={!selected}
            className="mt-auto self-end flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: glow }}>
            投稿する <ChevronRight size={16} />
          </button>
        </div>
      );
    }

    // 結果画面
    if (screen === "result") {
      return (
        <div className="flex-1 flex flex-col gap-4 pt-2">
          {turn.type === "choice" ? (
            <>
              <div className="flex items-center gap-2 text-xs text-muted">
                <TrendingUp size={16} style={{ color: glow }} />
                <span>最終的な拡散率 <span className="text-ink font-bold">×{lastRecord.mult}</span>
                  {lastRecord.bonus !== 0 && (
                    <span className="text-muted ml-1">(タイトル×{lastRecord.baseMult} {lastRecord.bonus > 0 ? "+" : ""}{lastRecord.bonus} コメント補正)</span>
                  )}
                </span>
              </div>
              <div className="bg-surface-soft rounded-2xl p-5 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono text-muted uppercase tracking-wide">フォロワー</span>
                <span key={sim.followers} className="font-display text-3xl font-bold text-ink animate-count-pop">
                  {sim.followers.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-xs font-mono" style={{ color: glow }}>
                  <ArrowUpRight size={12} /> +{delta.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-around text-muted">
                <span className="flex items-center gap-1 text-xs font-mono"><Heart size={14} /> {(lastRecord.mult*120).toLocaleString()}</span>
                <span className="flex items-center gap-1 text-xs font-mono"><MessageCircle size={14} /> {(lastRecord.mult*18).toLocaleString()}</span>
                <span className="flex items-center gap-1 text-xs font-mono"><Share2 size={14} /> {(lastRecord.mult*9).toLocaleString()}</span>
              </div>

              <button onClick={nextStep}
                className="flex items-center justify-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
                style={{ background: glow }}>
                次のターンへ <ChevronRight size={16} />
              </button>

              <button onClick={toggleComments} className="self-start text-[11px] text-muted underline font-mono">
                {showComments ? "コメントを閉じる" : `コメントを見る (${comments.length})`}
              </button>
              {showComments && comments.length > 0 && (
                <div className="flex flex-col gap-2">
                  {comments.map((cm, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl p-3 border-l-2"
                      style={{ borderLeftColor: cm.tone === "doubt" ? CALM_TEAL : "transparent", background:"var(--color-surface-soft)" }}>
                      <div className="w-6 h-6 rounded-full bg-canvas flex items-center justify-center text-[9px] text-muted shrink-0 mt-0.5">
                        {cm.author.slice(0,1)}
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
              <button onClick={nextStep}
                className="mt-auto self-end flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
                style={{ background: glow }}>
                結果発表へ <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      );
    }

    // 鎮静画面(炎上なし)
    if (screen === "calm") {
      return (
        <div className="flex-1 flex flex-col gap-4 pt-2 justify-center text-center items-center">
          <ShieldAlert size={28} style={{ color: CALM_TEAL }} />
          <p className="text-sm font-bold text-ink">大きな炎上にはならなかった。</p>
          <div className="bg-surface-soft rounded-2xl p-5 text-left">
            <p className="text-sm leading-relaxed text-ink">
              ただし、「大事にならなかった」と「正しかった」は違う。批判のコメントはいくつか届いていたし、スクリーンショットを撮って保存していた人もいたかもしれない。
            </p>
            <p className="text-sm leading-relaxed text-ink mt-3">
              今回はたまたま大きく燃えなかっただけ。SNSでは「運よく助かった」が何度も続くとは限らない。
            </p>
          </div>
          <button onClick={proceedQuiet}
            className="flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas"
            style={{ background: CALM_TEAL }}>
            結果を見る <ChevronRight size={16} />
          </button>
        </div>
      );
    }

    // エンディング
    if (screen === "ending") {
      const isComplete = endingStep >= endingItems.length - 1;
      return (
        <div className="flex-1 flex flex-col gap-3 pt-2">
          {endingItems.slice(0, endingStep + 1).map((item, i) => {
            const Icon   = item.icon;
            const isProse = item.label === "メッセージ" || item.label === "投稿のその後";
            return (
              <div key={i} className={`rounded-2xl p-4 flex items-start gap-3 animate-rise-in ${isProse ? "border" : "bg-surface-soft"}`}
                style={isProse ? { borderColor: glow, background:"rgba(255,255,255,0.02)" } : undefined}>
                <Icon size={18} style={{ color: glow }} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-muted uppercase tracking-wide">{item.label}</p>
                  <p className={isProse ? "text-sm text-ink leading-relaxed" : "font-display text-lg font-bold text-ink"}>
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
          {!isComplete ? (
            <button onClick={() => setEndingStep((s) => s + 1)}
              className="self-end flex items-center gap-1 font-display font-bold text-sm px-6 py-2.5 rounded-full text-canvas mt-1"
              style={{ background: glow }}>
              次へ <ChevronRight size={16} />
            </button>
          ) : (
            <div className="flex gap-2 mt-1">
              <button onClick={() => { resetState(); setScreen("scenario"); }}
                className="flex-1 flex items-center justify-center gap-1 font-display font-bold text-sm px-4 py-2.5 rounded-full text-canvas"
                style={{ background: glow }}>
                <RotateCcw size={16} /> もう一度
              </button>
              <button onClick={backToTitle}
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

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center py-10 px-4 relative overflow-hidden">
      <div className="absolute w-[480px] h-[480px] rounded-full blur-3xl animate-pulse-glow pointer-events-none" style={{ background: glow }} />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} style={{ color: glow }} />
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted">Follow Me!</span>
        </div>

        <div className="w-full rounded-[2.5rem] p-[2px]" style={{ background:`linear-gradient(160deg, ${glow}, transparent 60%)` }}>
          <div className="w-full bg-surface rounded-[2.4rem] overflow-hidden flex flex-col" style={{ minHeight:"660px" }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-24 h-5 bg-canvas rounded-full" />
            </div>

            {scenario && screen !== "title" && screen !== "ending" && screen !== "calm" && (
              <div className="px-6 pb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted uppercase tracking-wide">
                  {turn?.label}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {turnIndex + 1} / {turns.length}
                </span>
              </div>
            )}

            <div className="flex-1 px-6 pb-6 flex flex-col">{renderScreen()}</div>
          </div>
        </div>

        <button onClick={() => setShowDev((v) => !v)} className="mt-4 font-mono text-[10px] text-muted underline">
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