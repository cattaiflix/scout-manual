import { useState, useRef, useCallback } from "react";

const ZONES = [
  { id: "tl", label: "↖ Esq\nSup" },
  { id: "tc", label: "↑ Cen\nSup" },
  { id: "tr", label: "↗ Dir\nSup" },
  { id: "bl", label: "↙ Esq\nInf" },
  { id: "bc", label: "↓ Cen\nInf" },
  { id: "br", label: "↘ Dir\nInf" },
];
const ZONE_LABELS = { tl:"Esq. Sup", tc:"Cen. Sup", tr:"Dir. Sup", bl:"Esq. Inf", bc:"Cen. Inf", br:"Dir. Inf" };

const GOAL_TYPES = [
  { id: "rolando", label: "⚽ Rolando",  color: "text-green-400"  },
  { id: "falta",   label: "🎯 Falta",    color: "text-yellow-400" },
  { id: "penalti", label: "🥅 Pênalti",  color: "text-orange-400" },
  { id: "lateral", label: "↔️ Lateral",   color: "text-blue-400"   },
];

const emptyPeriod = () => ({ formacao:"", ataque:"", defesa:"", saida:"", destaques:"", gols1:[], gols2:[] });
const emptyGoal   = () => ({ tipo:"rolando", obs:"" });
// pe: pé dominante do batedor
const emptyPenalty = () => ({ jogador:"", camisa:"", zona:"", resultado:"gol", tipo:"batedor", pe:"" });
const emptyGoalie  = () => ({ comportamento:"escolhe", ladoPreferido:"", observacoes:"" });

// ── Mic ───────────────────────────────────────────────────────────────────────
function MicButton({ onTranscript, appending=true }) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => "webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  const recRef = useRef(null);
  const toggle = useCallback(() => {
    if (!supported) return alert("Use Chrome ou Edge para reconhecimento de voz.");
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang="pt-BR"; rec.continuous=true; rec.interimResults=false;
    recRef.current = rec;
    rec.onresult = (e) => onTranscript(Array.from(e.results).map(r=>r[0].transcript).join(" ").trim(), appending);
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    rec.start(); setListening(true);
  }, [listening, supported, onTranscript, appending]);
  if (!supported) return null;
  return (
    <button type="button" onClick={toggle} title={listening?"Parar":"Falar"}
      className={`absolute right-2 bottom-2 w-7 h-7 rounded-full flex items-center justify-center transition-all z-10 ${listening?"bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.25)] animate-pulse":"bg-[#1e3a5f] hover:bg-[#3b82f6]"}`}>
      <span className="text-xs">{listening?"⏹":"🎙"}</span>
    </button>
  );
}
function VoiceTextarea({ value, onChange, placeholder, className }) {
  return (
    <div className="relative">
      <textarea className={`${className} pr-10`} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} />
      <MicButton onTranscript={(t,a)=>onChange(a&&value?value+" "+t:t)} appending />
    </div>
  );
}
function VoiceInput({ value, onChange, placeholder, className }) {
  return (
    <div className="relative">
      <input className={`${className} pr-10`} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} />
      <MicButton onTranscript={(t)=>onChange(t)} appending={false} />
    </div>
  );
}

// ── GoalRow ───────────────────────────────────────────────────────────────────
function GoalRow({ goal, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 bg-[#060e1a] rounded-lg px-2 py-1.5 border border-[#1e3a5f]">
      <div className="flex gap-1 flex-wrap">
        {GOAL_TYPES.map(g => (
          <button key={g.id} type="button" onClick={()=>onChange({...goal,tipo:g.id})}
            className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${goal.tipo===g.id?"bg-[#1e3a5f] border-[#3b82f6] text-white":"border-[#1e3a5f] text-[#4a6fa5] hover:text-white"}`}>
            {g.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={onRemove} className="ml-auto text-[#4a6fa5] hover:text-red-400 text-xs shrink-0">✕</button>
    </div>
  );
}

// ── PeriodScore ───────────────────────────────────────────────────────────────
function PeriodScore({ period, onChange, time1, time2 }) {
  const addGoal    = (team) => onChange({...period,[team]:[...period[team],emptyGoal()]});
  const updateGoal = (team,idx,goal) => onChange({...period,[team]:period[team].map((g,i)=>i===idx?goal:g)});
  const removeGoal = (team,idx) => onChange({...period,[team]:period[team].filter((_,i)=>i!==idx)});

  const teamBlock = (teamKey, teamName) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-[#7fb3f5] truncate">{teamName || (teamKey==="gols1"?"Time 1":"Time 2")}</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-white">{period[teamKey].length}</span>
          <button type="button" onClick={()=>addGoal(teamKey)}
            className="w-6 h-6 rounded-full bg-[#1e3a5f] hover:bg-[#3b82f6] text-white text-xs flex items-center justify-center transition-colors">+</button>
        </div>
      </div>
      <div className="space-y-1">
        {period[teamKey].map((g,i)=>(
          <GoalRow key={i} goal={g} onChange={g2=>updateGoal(teamKey,i,g2)} onRemove={()=>removeGoal(teamKey,i)} />
        ))}
        {period[teamKey].length===0 && <p className="text-xs text-[#4a6fa5] italic">Sem gols</p>}
      </div>
    </div>
  );

  return (
    <div className="bg-[#060e1a] rounded-lg p-3 border border-[#1e3a5f] mb-3">
      <p className="text-xs font-bold text-[#f59e0b] uppercase mb-2">⚽ Placar do Tempo</p>
      <div className="flex gap-3">
        {teamBlock("gols1", time1)}
        <div className="flex flex-col items-center justify-start pt-5"><span className="text-[#4a6fa5] font-bold">x</span></div>
        {teamBlock("gols2", time2)}
      </div>
    </div>
  );
}

// ── resultado color helper ────────────────────────────────────────────────────
// Para goleiro: defendido = verde (boa defesa), gol = vermelho (levou)
// Para batedor: gol = verde, defendido = vermelho, fora = amarelo
function resultColor(pen) {
  if (pen.tipo === "goleiro") {
    if (pen.resultado === "defendido") return "res-green text-green-400";
    if (pen.resultado === "gol")       return "res-red text-red-400";
    return "res-yellow text-yellow-400";
  }
  if (pen.resultado === "gol")       return "res-green text-green-400";
  if (pen.resultado === "defendido") return "res-red text-red-400";
  return "res-yellow text-yellow-400";
}
function resultLabel(pen) {
  if (pen.resultado === "gol")       return pen.tipo==="goleiro" ? "🔴 Gol sofrido" : "✅ Gol";
  if (pen.resultado === "defendido") return pen.tipo==="goleiro" ? "🟢 Defendido"   : "🛑 Defendido";
  return "❌ Fora";
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState("form");
  const [header, setHeader] = useState({
    time1:"", time2:"", logo1:"", logo2:"",
    data: new Date().toISOString().split("T")[0],
    observador:"",
    timeMonitorado: "time1", // "time1" = Casa, "time2" = Visitante
  });
  const [periods, setPeriods]   = useState([emptyPeriod(), emptyPeriod(), emptyPeriod()]);
  const [penalties, setPenalties] = useState([]);
  const [goalie, setGoalie]     = useState(emptyGoalie());
  const [newPen, setNewPen]     = useState(emptyPenalty());
  const [activeTab, setActiveTab] = useState(0);

  const updateHeader = (k,v) => setHeader(h=>({...h,[k]:v}));
  const updatePeriod = (i,upd) => setPeriods(ps=>ps.map((p,idx)=>idx===i?(typeof upd==="function"?upd(p):{...p,...upd}):p));

  // Totals
  const total1 = periods.reduce((s,p)=>s+p.gols1.length,0);
  const total2 = periods.reduce((s,p)=>s+p.gols2.length,0);

  // Pênaltis: batedores e goleiro são ambos do time MONITORADO
  // Batedores = jogadores do monitorado que cobram (adversário tem o goleiro)
  // Goleiro = goleiro do monitorado que defende cobranças adversárias
  // Placar: gols convertidos pelos batedores do monitorado x gols sofridos pelo goleiro do monitorado
  const penTotalMon = penalties.filter(p=>p.tipo==="batedor" && p.resultado==="gol").length;
  const penTotalAdv = penalties.filter(p=>p.tipo==="goleiro" && p.resultado==="gol").length;

  const nomeMonitorado  = header.timeMonitorado==="time1" ? (header.time1||"Time 1") : (header.time2||"Time 2");
  const nomeAdversario  = header.timeMonitorado==="time1" ? (header.time2||"Time 2") : (header.time1||"Time 1");

  const addPenalty = () => {
    if (!newPen.jogador || !newPen.zona) return;
    setPenalties(p=>[...p,{...newPen,id:Date.now()}]);
    setNewPen(emptyPenalty());
  };
  const removePenalty = (id) => setPenalties(p=>p.filter(x=>x.id!==id));

  const handleLogo = (key,file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => updateHeader(key,e.target.result);
    reader.readAsDataURL(file);
  };

  const batedores = penalties.filter(p=>p.tipo==="batedor");
  const goleiroList = penalties.filter(p=>p.tipo==="goleiro");
  const zoneCount = (arr) => ZONES.reduce((acc,z)=>({...acc,[z.id]:arr.filter(p=>p.zona===z.id).length}),{});
  const bateStats = zoneCount(batedores);
  const golStats  = zoneCount(goleiroList);

  // Result-based color per zone (for goleiro heatmap)
  // Green if all defended, red if any gol, mixed = orange
  const zoneResultColor = (arr) => ZONES.reduce((acc,z)=>{
    const inZone = arr.filter(p=>p.zona===z.id);
    if(inZone.length===0) return {...acc,[z.id]:null};
    const gols = inZone.filter(p=>p.resultado==="gol").length;
    const def  = inZone.filter(p=>p.resultado==="defendido").length;
    if(gols===0)  return {...acc,[z.id]:"green"};
    if(def===0)   return {...acc,[z.id]:"red"};
    return {...acc,[z.id]:"orange"};
  },{});
  const golZoneColor = zoneResultColor(goleiroList);

  // Result-based color for batedores:
  // green=gol, yellow=defendido, red=fora
  const bateZoneColor = (arr) => ZONES.reduce((acc,z)=>{
    const inZone = arr.filter(p=>p.zona===z.id);
    if(inZone.length===0) return {...acc,[z.id]:null};
    // Dominant result
    const gols = inZone.filter(p=>p.resultado==="gol").length;
    const defs = inZone.filter(p=>p.resultado==="defendido").length;
    const fora = inZone.filter(p=>p.resultado==="fora").length;
    const max = Math.max(gols, defs, fora);
    if(max===gols && gols>0) return {...acc,[z.id]:"green"};
    if(max===defs && defs>0) return {...acc,[z.id]:"orange"};
    return {...acc,[z.id]:"red"};
  },{});
  const bateZoneColors = bateZoneColor(batedores);

  // Per-result filtered lists for split heatmaps
  const bateGols    = batedores.filter(p=>p.resultado==="gol");
  const bateErros   = batedores.filter(p=>p.resultado!=="gol");  // defendido or fora
  const golSofridos = goleiroList.filter(p=>p.resultado==="gol");
  const golDefesas  = goleiroList.filter(p=>p.resultado!=="gol"); // defendido or fora

  const bateGolStats  = zoneCount(bateGols);
  const bateErroStats = zoneCount(bateErros);
  const golSofStats   = zoneCount(golSofridos);
  const golDefStats   = zoneCount(golDefesas);

  const bateGolNames  = zoneNames(bateGols);
  const bateErroNames = zoneNames(bateErros);
  const golSofNames   = zoneNames(golSofridos);
  const golDefNames   = zoneNames(golDefesas);

  // For erros: zone color = orange if defendido, red if fora
  const bateErroZoneColor = (arr) => ZONES.reduce((acc,z)=>{
    const inZone = arr.filter(p=>p.zona===z.id);
    if(inZone.length===0) return {...acc,[z.id]:null};
    const defs = inZone.filter(p=>p.resultado==="defendido").length;
    const fora = inZone.filter(p=>p.resultado==="fora").length;
    if(defs>=fora) return {...acc,[z.id]:"orange"};
    return {...acc,[z.id]:"red"};
  },{});
  const bateErroColors = bateErroZoneColor(bateErros);

  // For golDefesas: green if defended, orange if fora (missed by attacker)
  const golDefZoneColor = (arr) => ZONES.reduce((acc,z)=>{
    const inZone = arr.filter(p=>p.zona===z.id);
    if(inZone.length===0) return {...acc,[z.id]:null};
    const defs = inZone.filter(p=>p.resultado==="defendido").length;
    if(defs>0) return {...acc,[z.id]:"green"};
    return {...acc,[z.id]:"orange"};
  },{});
  const golDefColors = golDefZoneColor(golDefesas);

  // Names per zone for heatmap labels
  const zoneNames = (arr) => ZONES.reduce((acc,z)=>({
    ...acc,
    [z.id]: arr.filter(p=>p.zona===z.id).map(p=>{
      const parts = (p.jogador||"").trim().split(" ");
      // First name + initial of last name, max 10 chars
      const short = parts.length>1 ? parts[0]+" "+parts[parts.length-1][0]+"." : parts[0];
      return short.slice(0,11);
    })
  }),{});
  const bateNames = zoneNames(batedores);
  const golNames  = zoneNames(goleiroList);

  const ic = "w-full bg-[#0d1b2a] border border-[#1e3a5f] rounded-lg px-3 py-2 text-white placeholder-[#4a6fa5] focus:outline-none focus:border-[#3b82f6] text-sm";
  const lc = "block text-xs font-semibold text-[#7fb3f5] uppercase tracking-wider mb-1";
  const cc = "bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-4";
  const ta = "bg-[#1e3a5f] text-white border-b-2 border-[#3b82f6]";
  const tb = "px-4 py-2 text-sm font-medium text-[#4a6fa5] hover:text-white transition-colors rounded-t-lg";

  const goalTypeBadge = (tipo) => {
    const gt = GOAL_TYPES.find(g=>g.id===tipo);
    return <span className={`text-xs ${gt?.color||"text-gray-400"}`}>{gt?.label||tipo}</span>;
  };

  return (
    <div className="min-h-screen bg-[#060e1a] text-white font-sans">
      <style>{`
        textarea { resize: vertical; min-height: 72px; }

        /* ── PRINT THEME ─────────────────────────────────────────── */
        @page {
          size: A4;
          margin: 1.2cm 1cm;
          /* Remove browser header/footer (works in Chrome/Edge) */
          margin-top: 1cm;
        }

        @media print {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;

          .no-print { display: none !important; }

          /* Força fundo branco em TUDO */
          *, *::before, *::after {
            background-color: transparent !important;
            color: #111827 !important;
            border-color: #d1d5db !important;
            box-shadow: none !important;
          }
          body, html, #root, #root > div {
            background: #ffffff !important;
            color: #111827 !important;
          }

          /* Cards com borda visível e sem quebra */
          .print-card {
            background: #ffffff !important;
            border: 1.5px solid #9ca3af !important;
            border-radius: 8px !important;
            padding: 12px !important;
            margin-bottom: 10pt !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-inner {
            background: #f3f4f6 !important;
            border: 1px solid #d1d5db !important;
            border-radius: 6px !important;
            padding: 8px !important;
            margin-bottom: 6pt !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Texto e cores funcionais */
          .print-score  { color: #1d4ed8 !important; }
          .print-badge-monitor { background: #1d4ed8 !important; color: #fff !important; }
          .res-green    { color: #15803d !important; }
          .res-red      { color: #b91c1c !important; }
          .res-yellow   { color: #92400e !important; }

          /* Heatmap */
          .heat-0   { background: #e5e7eb !important; }
          .heat-lo  { background: #bbf7d0 !important; }
          .heat-md  { background: #fde68a !important; }
          .heat-hi  { background: #fca5a5 !important; }
          .heat-bar { background: #e5e7eb !important; }
          .heat-0 *, .heat-lo *, .heat-md *, .heat-hi * { color: #111827 !important; }

          .print-partial { background: #f3f4f6 !important; }
        }
      `}</style>

      {/* NAV */}
      <div className="no-print sticky top-0 z-50 bg-[#060e1a] border-b border-[#1e3a5f] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#3b82f6] rounded-lg flex items-center justify-center">⚽</div>
          <span className="font-bold tracking-tight">Scout Manual</span>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setStep("form")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${step==="form"?"bg-[#3b82f6] text-white":"text-[#4a6fa5] hover:text-white"}`}>Formulário</button>
          <button onClick={()=>setStep("report")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${step==="report"?"bg-[#3b82f6] text-white":"text-[#4a6fa5] hover:text-white"}`}>Relatório</button>
          {step==="report" && <button onClick={()=>window.print()} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium text-white transition-colors">🖨 PDF</button>}
        </div>
      </div>

      {/* ── FORM ── */}
      {step==="form" && (
        <div className="max-w-3xl mx-auto p-4 space-y-4 no-print">

          <div className="flex items-center gap-2 bg-[#0d1b2a] border border-[#1e3a5f] rounded-lg px-3 py-2 text-xs text-[#7fb3f5]">
            <span>🎙</span><span>Toque no microfone em qualquer campo para ditar.</span>
          </div>

          {/* CABEÇALHO */}
          <div className={cc}>
            <h2 className="text-sm font-bold text-[#7fb3f5] uppercase tracking-widest mb-3">📋 Cabeçalho do Jogo</h2>

            {/* Observador */}
            <div className="mb-3">
              <label className={lc}>👤 Observador Técnico</label>
              <VoiceInput className={ic} placeholder="Nome do avaliador responsável" value={header.observador} onChange={v=>updateHeader("observador",v)} />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[["time1","logo1","🏠 Time 1 (Casa)"],["time2","logo2","✈️ Time 2 (Visitante)"]].map(([tk,lk,lbl])=>(
                <div key={tk}>
                  <label className={lc}>{lbl}</label>
                  <VoiceInput className={ic} placeholder="Nome do time" value={header[tk]} onChange={v=>updateHeader(tk,v)} />
                  <div className="mt-2 flex items-center gap-2">
                    {header[lk] && <img src={header[lk]} className="w-8 h-8 object-contain rounded" alt="logo" />}
                    <label className="text-xs text-[#4a6fa5] cursor-pointer hover:text-white transition-colors">
                      📷 Logo (opcional)
                      <input type="file" accept="image/*" className="hidden" onChange={e=>handleLogo(lk,e.target.files[0])} />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Equipe monitorada */}
            <div className="mb-3">
              <label className={lc}>🎯 Equipe Monitorada</label>
              <div className="grid grid-cols-2 gap-2">
                {[["time1","🏠 Casa"],["time2","✈️ Visitante"]].map(([v,l])=>(
                  <button key={v} type="button" onClick={()=>updateHeader("timeMonitorado",v)}
                    className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors flex flex-col items-center gap-0.5 ${header.timeMonitorado===v?"bg-[#1e3a5f] border-[#3b82f6] text-white":"border-[#1e3a5f] text-[#4a6fa5] hover:text-white"}`}>
                    <span>{l}</span>
                    {header.timeMonitorado===v && (
                      <span className="text-xs text-[#7fb3f5]">
                        {v==="time1"?(header.time1||"Time 1"):(header.time2||"Time 2")}
                      </span>
                    )}
                    {header.timeMonitorado===v && <span className="text-[10px] text-[#3b82f6] font-bold uppercase tracking-widest">● Monitorado</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Data */}
            <div className="mb-3">
              <label className={lc}>Data</label>
              <input type="date" className={ic} value={header.data} onChange={e=>updateHeader("data",e.target.value)} />
            </div>

            {/* Placar calculado */}
            <div className="bg-[#060e1a] rounded-lg p-3 border border-[#1e3a5f]">
              <p className="text-xs text-[#4a6fa5] uppercase font-semibold mb-1">Placar Total (calculado automaticamente)</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-white">{total1}</span>
                <span className="text-[#4a6fa5]">x</span>
                <span className="text-2xl font-black text-white">{total2}</span>
                {(penTotalMon>0||penTotalAdv>0) && (
                  <span className="ml-2 text-xs text-yellow-400">(Pen: {penTotalMon} x {penTotalAdv})</span>
                )}
              </div>
            </div>
          </div>

          {/* PERÍODOS */}
          <div className={cc}>
            <h2 className="text-sm font-bold text-[#7fb3f5] uppercase tracking-widest mb-3">🏟 Análise por Tempo</h2>
            <div className="flex border-b border-[#1e3a5f] mb-4">
              {["1º Tempo","2º Tempo","3º Tempo"].map((t,i)=>(
                <button key={i} onClick={()=>setActiveTab(i)} className={`${tb} ${activeTab===i?ta:""}`}>
                  {t}
                  {(periods[i].gols1.length>0||periods[i].gols2.length>0) && (
                    <span className="ml-1 text-xs text-yellow-400">{periods[i].gols1.length}x{periods[i].gols2.length}</span>
                  )}
                </button>
              ))}
            </div>
            {periods.map((p,i)=>activeTab===i&&(
              <div key={i} className="space-y-3">
                <PeriodScore period={p} onChange={upd=>updatePeriod(i,upd)} time1={header.time1} time2={header.time2} />
                <div>
                  <label className={lc}>Formação</label>
                  <VoiceInput className={ic} placeholder="Ex: 4-3-3, 3-5-2..." value={p.formacao} onChange={v=>updatePeriod(i,{formacao:v})} />
                </div>
                <div>
                  <label className={lc}>⚔️ Como a equipe ataca?</label>
                  <VoiceTextarea className={ic} placeholder="Descreva o padrão ofensivo..." value={p.ataque} onChange={v=>updatePeriod(i,{ataque:v})} />
                </div>
                <div>
                  <label className={lc}>🛡 Como a equipe se defende?</label>
                  <VoiceTextarea className={ic} placeholder="Linha defensiva, marcação..." value={p.defesa} onChange={v=>updatePeriod(i,{defesa:v})} />
                </div>
                <div>
                  <label className={lc}>🔄 Saída de pressão</label>
                  <div className="flex gap-2 mb-2">
                    {["Ligação Direta","Saída Curta","Misto"].map(op=>(
                      <button key={op} type="button" onClick={()=>updatePeriod(i,{saida:p.saida===op?"":op})}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${p.saida===op?"bg-[#3b82f6] border-[#3b82f6] text-white":"border-[#1e3a5f] text-[#4a6fa5] hover:text-white"}`}>
                        {op}
                      </button>
                    ))}
                  </div>
                  <VoiceTextarea className={ic} placeholder="Detalhes da saída..." value={["Ligação Direta","Saída Curta","Misto"].includes(p.saida)?"":p.saida} onChange={v=>updatePeriod(i,{saida:v})} />
                </div>
                <div>
                  <label className={lc}>⭐ Atletas Destaque</label>
                  <VoiceTextarea className={ic} placeholder="Nome, camisa e características..." value={p.destaques} onChange={v=>updatePeriod(i,{destaques:v})} />
                </div>
              </div>
            ))}
          </div>

          {/* PÊNALTIS */}
          <div className={cc}>
            <h2 className="text-sm font-bold text-[#7fb3f5] uppercase tracking-widest mb-1">🥅 Cobranças de Pênalti</h2>
            <p className="text-xs text-[#4a6fa5] mb-3">
              Ambos referentes ao <span className="text-white font-semibold">{nomeMonitorado}</span>: &nbsp;
              <span className="text-[#7fb3f5] font-semibold">Batedores</span> = jogadores que cobram &nbsp;|&nbsp;
              <span className="text-[#a78bfa] font-semibold">Goleiro</span> = goleiro que defende
            </p>

            {/* Goleiro adversário */}
            <div className="bg-[#0d1b2a] rounded-lg p-3 mb-4 border border-[#1e3a5f]">
              <h3 className="text-xs font-bold text-[#f59e0b] uppercase mb-2">🧤 Goleiro ({nomeMonitorado})</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Comportamento</label>
                  <div className="flex gap-2">
                    {["espera","escolhe"].map(op=>(
                      <button key={op} type="button" onClick={()=>setGoalie(g=>({...g,comportamento:op}))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${goalie.comportamento===op?"bg-[#3b82f6] border-[#3b82f6] text-white":"border-[#1e3a5f] text-[#4a6fa5] hover:text-white"}`}>
                        {op==="espera"?"⏳ Espera":"🎯 Escolhe"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={lc}>Lado que mais defende</label>
                  <select className={ic} value={goalie.ladoPreferido} onChange={e=>setGoalie(g=>({...g,ladoPreferido:e.target.value}))}>
                    <option value="">Selecionar...</option>
                    {ZONES.map(z=><option key={z.id} value={z.id}>{ZONE_LABELS[z.id]}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <label className={lc}>Observações</label>
                <VoiceTextarea className={ic} placeholder="Notas sobre o goleiro..." value={goalie.observacoes} onChange={v=>setGoalie(g=>({...g,observacoes:v}))} />
              </div>
            </div>

            {/* Registrar cobrança */}
            <div className="bg-[#0d1b2a] rounded-lg p-3 mb-3 border border-[#1e3a5f]">
              <h3 className="text-xs font-bold text-[#a78bfa] uppercase mb-2">➕ Registrar Cobrança</h3>

              {/* Tipo */}
              <div className="mb-2">
                <label className={lc}>Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {[["batedor",`⚽ Batedor (${nomeMonitorado})`],["goleiro",`🧤 Goleiro (${nomeMonitorado})`]].map(([v,l])=>(
                    <button key={v} type="button" onClick={()=>setNewPen(n=>({...n,tipo:v}))}
                      className={`py-2 rounded-lg text-xs font-medium border transition-colors ${newPen.tipo===v?"bg-[#3b82f6] border-[#3b82f6] text-white":"border-[#1e3a5f] text-[#4a6fa5] hover:text-white"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resultado */}
              <div className="mb-2">
                <label className={lc}>Resultado</label>
                <div className="flex gap-1">
                  {[["gol","✅ Gol"],["defendido","🛑 Defendido"],["fora","❌ Fora"]].map(([v,l])=>(
                    <button key={v} type="button" onClick={()=>setNewPen(n=>({...n,resultado:v}))}
                      className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${newPen.resultado===v?"bg-[#3b82f6] border-[#3b82f6] text-white":"border-[#1e3a5f] text-[#4a6fa5] hover:text-white"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jogador + Camisa */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="col-span-2">
                  <label className={lc}>Jogador</label>
                  <VoiceInput className={ic} placeholder="Nome" value={newPen.jogador} onChange={v=>setNewPen(n=>({...n,jogador:v}))} />
                </div>
                <div>
                  <label className={lc}>Camisa #</label>
                  <input className={ic} placeholder="Nº" value={newPen.camisa} onChange={e=>setNewPen(n=>({...n,camisa:e.target.value}))} />
                </div>
              </div>

              {/* Pé dominante */}
              <div className="mb-2">
                <label className={lc}>🦶 Pé Dominante</label>
                <div className="flex gap-2">
                  {[["direito","👟 Direito"],["esquerdo","👟 Esquerdo"]].map(([v,l])=>(
                    <button key={v} type="button" onClick={()=>setNewPen(n=>({...n,pe:n.pe===v?"":v}))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${newPen.pe===v?"bg-[#1e3a5f] border-[#3b82f6] text-white":"border-[#1e3a5f] text-[#4a6fa5] hover:text-white"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zona */}
              <div className="mb-2">
                <label className={lc}>Zona (direção da cobrança)</label>
                <div className="grid grid-cols-3 gap-1">
                  {ZONES.map(z=>(
                    <button key={z.id} type="button" onClick={()=>setNewPen(n=>({...n,zona:z.id}))}
                      className={`py-2 rounded-lg text-xs font-medium border transition-colors whitespace-pre-line leading-tight ${newPen.zona===z.id?"bg-[#3b82f6] border-[#3b82f6] text-white":"border-[#1e3a5f] text-[#4a6fa5] hover:text-white"}`}>
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={addPenalty} className="w-full py-2 bg-[#1e3a5f] hover:bg-[#3b82f6] rounded-lg text-sm font-semibold text-white transition-colors">
                + Adicionar
              </button>
            </div>

            {/* Lista */}
            {penalties.length>0 && (
              <div className="space-y-1">
                <p className="text-xs text-[#4a6fa5] uppercase font-semibold mb-1">Cobranças registradas ({penalties.length})</p>
                {penalties.map((pen,idx)=>(
                  <div key={pen.id} className="flex items-center justify-between bg-[#0d1b2a] rounded-lg px-3 py-2 border border-[#1e3a5f]">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="text-[#4a6fa5] text-xs">#{idx+1}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${pen.tipo==="batedor"?"bg-[#1e3a5f] text-[#7fb3f5]":"bg-[#2a1e5f] text-[#a78bfa]"}`}>
                        {pen.tipo==="batedor"?"⚽":"🧤"}
                      </span>
                      <span className="font-medium">{pen.jogador}</span>
                      {pen.camisa && <span className="text-[#4a6fa5] text-xs">#{pen.camisa}</span>}
                      {pen.pe && <span className="text-xs text-[#4a6fa5]">({pen.pe})</span>}
                      <span className="text-xs text-[#7fb3f5]">{ZONE_LABELS[pen.zona]}</span>
                      <span className={`text-xs font-semibold ${resultColor(pen)}`}>{resultLabel(pen)}</span>
                    </div>
                    <button type="button" onClick={()=>removePenalty(pen.id)} className="text-[#4a6fa5] hover:text-red-400 text-xs transition-colors ml-2">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={()=>setStep("report")} className="w-full py-3 bg-[#3b82f6] hover:bg-blue-400 rounded-xl text-white font-bold text-sm transition-colors">
            Ver Relatório →
          </button>
        </div>
      )}

      {/* ── REPORT ── */}
      {step==="report" && (
        <div className="max-w-3xl mx-auto p-4 space-y-4">

          {/* 1. OBSERVADOR */}
          {header.observador && (
            <div className="print-card bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-[#1e3a5f] rounded-full flex items-center justify-center text-lg shrink-0">👤</div>
              <div>
                <p className="text-[10px] text-[#4a6fa5] uppercase font-bold tracking-widest mb-0.5">Observador Técnico</p>
                <p className="text-base font-bold text-white">{header.observador}</p>
              </div>
            </div>
          )}

          {/* 2. CABEÇALHO DO JOGO */}
          <div className="print-card bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {header.logo1?<img src={header.logo1} className="w-12 h-12 object-contain" alt=""/>:<div className="w-12 h-12 bg-[#1e3a5f] rounded-full flex items-center justify-center text-xl">⚽</div>}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold">{header.time1||"Time 1"}</p>
                    {header.timeMonitorado==="time1" && <span className="print-badge-monitor text-[10px] bg-[#3b82f6] text-white px-1.5 py-0.5 rounded-full font-bold uppercase">🎯 Monitor</span>}
                  </div>
                  <p className="text-xs text-[#4a6fa5]">🏠 Casa</p>
                  <p className="print-score text-3xl font-black text-[#3b82f6]">{total1}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[#4a6fa5] text-xs uppercase">vs</p>
                <p className="text-xs text-[#4a6fa5] mt-1">{header.data}</p>
                {(penTotalMon>0||penTotalAdv>0) && (
                  <div className="mt-1 text-center">
                    <p className="text-[10px] text-[#4a6fa5] uppercase">Pênaltis</p>
                    <p className="text-sm text-yellow-400 font-bold">{header.timeMonitorado==="time1"?penTotalMon:penTotalAdv} x {header.timeMonitorado==="time1"?penTotalAdv:penTotalMon}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    {header.timeMonitorado==="time2" && <span className="print-badge-monitor text-[10px] bg-[#3b82f6] text-white px-1.5 py-0.5 rounded-full font-bold uppercase">🎯 Monitor</span>}
                    <p className="text-lg font-bold">{header.time2||"Time 2"}</p>
                  </div>
                  <p className="text-xs text-[#4a6fa5]">✈️ Visitante</p>
                  <p className="print-score text-3xl font-black text-[#3b82f6]">{total2}</p>
                </div>
                {header.logo2?<img src={header.logo2} className="w-12 h-12 object-contain" alt=""/>:<div className="w-12 h-12 bg-[#1e3a5f] rounded-full flex items-center justify-center text-xl">⚽</div>}
              </div>
            </div>

            {/* Parciais */}
            <div className="grid grid-cols-3 gap-2 border-t border-[#1e3a5f] pt-3 mb-3">
              {periods.map((p,i)=>(
                <div key={i} className="print-partial text-center bg-[#060e1a] rounded-lg py-2 px-1">
                  <p className="text-xs text-[#4a6fa5] mb-1">{i+1}º Tempo</p>
                  <p className="text-base font-bold text-white">{p.gols1.length} x {p.gols2.length}</p>
                </div>
              ))}
            </div>


          </div>

          {/* Períodos */}
          {periods.map((p,i)=>(
            <div key={i} className="print-card bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-[#3b82f6] rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
                <h3 className="font-bold">{i+1}º Tempo</h3>
                <span className="text-sm text-yellow-400 font-bold">{p.gols1.length} x {p.gols2.length}</span>
                {p.formacao && <span className="ml-auto bg-[#1e3a5f] text-[#7fb3f5] text-xs px-2 py-0.5 rounded-full font-mono">{p.formacao}</span>}
              </div>
              {(p.gols1.length>0||p.gols2.length>0) && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[["gols1",header.time1||"Time 1"],["gols2",header.time2||"Time 2"]].map(([key,name])=>(
                    p[key].length>0 && (
                      <div key={key} className="print-inner bg-[#0d1b2a] rounded-lg p-2 border border-[#1e3a5f]">
                        <p className="text-xs font-bold text-[#7fb3f5] mb-1">{name}</p>
                        <div className="space-y-1">
                          {p[key].map((g,gi)=>(
                            <div key={gi} className="flex items-center gap-1">
                              <span className="text-xs text-[#4a6fa5]">{gi+1}.</span>
                              {goalTypeBadge(g.tipo)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 text-sm">
                {[["⚔️ Ataque",p.ataque],["🛡 Defesa",p.defesa],["🔄 Saída",p.saida],["⭐ Destaques",p.destaques]].map(([l,v])=>v&&(
                  <div key={l} className="print-inner bg-[#0d1b2a] rounded-lg p-3 border border-[#1e3a5f]">
                    <p className="text-[#7fb3f5] text-xs font-bold uppercase mb-1">{l}</p>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Pênaltis */}
          {(penalties.length>0||goalie.observacoes) && (
            <div className="print-card bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-4">
              <h3 className="font-bold mb-1">🥅 Análise de Pênaltis</h3>
              <p className="text-xs text-[#4a6fa5] mb-3">
                Ambos do time monitorado: <strong className="text-white">{nomeMonitorado}</strong>
              </p>

              {/* Placar pênaltis */}
              {(penTotalMon>0||penTotalAdv>0) && (
                <div className="print-inner bg-[#060e1a] rounded-lg p-3 border border-[#1e3a5f] mb-3 flex items-center gap-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-[#4a6fa5]">{nomeMonitorado} (marcou)</p>
                    <p className="text-2xl font-black text-green-400">{penTotalMon}</p>
                  </div>
                  <span className="text-[#4a6fa5] font-bold text-lg">x</span>
                  <div className="text-center flex-1">
                    <p className="text-xs text-[#4a6fa5]">{nomeAdversario} (marcou)</p>
                    <p className="text-2xl font-black text-red-400">{penTotalAdv}</p>
                  </div>
                </div>
              )}

              {/* Goleiro info */}
              <div className="print-inner bg-[#0d1b2a] rounded-lg p-3 border border-[#1e3a5f] mb-3">
                <p className="text-xs font-bold text-[#f59e0b] uppercase mb-1">🧤 Goleiro — {nomeMonitorado}</p>
                <div className="flex gap-4 text-sm flex-wrap">
                  <span>Comportamento: <strong className="text-white capitalize">{goalie.comportamento}</strong></span>
                  {goalie.ladoPreferido && <span>Lado preferido: <strong className="text-white">{ZONE_LABELS[goalie.ladoPreferido]}</strong></span>}
                </div>
                {goalie.observacoes && <p className="text-gray-300 mt-1 text-sm">{goalie.observacoes}</p>}
              </div>

              {/* Mapas de calor — 4 quadros */}
              {penalties.length>0 && (() => {
                const Cell = ({stats, names, colorFn, fixedColor}) => (
                  <div className="grid grid-cols-3">
                    {ZONES.map(z=>{
                      const count=stats[z.id]||0;
                      const nms=names[z.id]||[];
                      let bg;
                      if(count===0) bg="heat-0 bg-[#0a1628]";
                      else if(fixedColor==="green") bg="heat-lo bg-[#22c55e]";
                      else if(fixedColor==="red")   bg="heat-hi bg-[#ef4444]";
                      else {
                        const rc=colorFn?colorFn[z.id]:null;
                        bg=rc==="green"?"heat-lo bg-[#22c55e]":rc==="orange"?"heat-md bg-[#f59e0b]":"heat-hi bg-[#ef4444]";
                      }
                      return (
                        <div key={z.id} className={`${bg} border border-[#1e3a5f] min-h-14 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5`}>
                          {count>0 && <span className="text-xs font-black text-white leading-none">{count}</span>}
                          {nms.map((nm,ni)=>(
                            <span key={ni} className="text-white font-medium leading-none text-center"
                              style={{fontSize:"9px",lineHeight:"1.1",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {nm}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
                const Legend = ({items}) => (
                  <div className="heat-bar text-center bg-[#1e3a5f] py-1">
                    <span className="text-xs text-[#4a6fa5] flex items-center justify-center gap-2">
                      {items.map(it=><span key={it}>{it}</span>)}
                    </span>
                  </div>
                );
                return (
                  <>
                    {/* ── Linha 1: Batedores ── */}
                    <p className="text-xs font-bold text-[#7fb3f5] uppercase mb-1 mt-2">⚽ Batedores — {nomeMonitorado}</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="print-inner bg-[#0d1b2a] rounded-lg p-2 border border-[#1e3a5f]">
                        <p className="text-xs font-semibold text-green-400 mb-1">✅ Onde marcaram gol</p>
                        <div className="border-2 border-[#1e3a5f] rounded overflow-hidden">
                          <Cell stats={bateGolStats} names={bateGolNames} fixedColor="green" />
                          <Legend items={["🟢 Gol"]} />
                        </div>
                      </div>
                      <div className="print-inner bg-[#0d1b2a] rounded-lg p-2 border border-[#1e3a5f]">
                        <p className="text-xs font-semibold text-red-400 mb-1">❌ Onde erraram</p>
                        <div className="border-2 border-[#1e3a5f] rounded overflow-hidden">
                          <Cell stats={bateErroStats} names={bateErroNames} colorFn={bateErroColors} />
                          <Legend items={["🟡 Defendido","🔴 Fora"]} />
                        </div>
                      </div>
                    </div>

                    {/* ── Linha 2: Goleiro ── */}
                    <p className="text-xs font-bold text-[#a78bfa] uppercase mb-1">🧤 Goleiro — {nomeMonitorado}</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="print-inner bg-[#0d1b2a] rounded-lg p-2 border border-[#1e3a5f]">
                        <p className="text-xs font-semibold text-red-400 mb-1">🔴 Onde sofreu gol</p>
                        <div className="border-2 border-[#1e3a5f] rounded overflow-hidden">
                          <Cell stats={golSofStats} names={golSofNames} fixedColor="red" />
                          <Legend items={["🔴 Gol sofrido"]} />
                        </div>
                      </div>
                      <div className="print-inner bg-[#0d1b2a] rounded-lg p-2 border border-[#1e3a5f]">
                        <p className="text-xs font-semibold text-green-400 mb-1">🟢 Onde defendeu / saiu fora</p>
                        <div className="border-2 border-[#1e3a5f] rounded overflow-hidden">
                          <Cell stats={golDefStats} names={golDefNames} colorFn={golDefColors} />
                          <Legend items={["🟢 Defendido","🟡 Fora"]} />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Batedores */}
              {batedores.length>0 && (
                <div className="print-inner bg-[#0d1b2a] rounded-lg p-3 border border-[#1e3a5f] mb-2">
                  <p className="text-xs font-bold text-[#7fb3f5] uppercase mb-2">⚽ Batedores do {nomeMonitorado}</p>
                  <div className="space-y-1">
                    {batedores.map((pen,idx)=>(
                      <div key={pen.id} className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-[#4a6fa5] text-xs w-4">{idx+1}.</span>
                        <span className="font-medium">{pen.jogador}</span>
                        {pen.camisa && <span className="text-[#4a6fa5] text-xs">(#{pen.camisa})</span>}
                        {pen.pe && <span className="text-xs bg-[#1e3a5f] text-[#7fb3f5] px-1.5 py-0.5 rounded capitalize">🦶 {pen.pe}</span>}
                        <span className="text-[#7fb3f5] text-xs">→ {ZONE_LABELS[pen.zona]}</span>
                        <span className={`ml-auto text-xs font-semibold ${resultColor(pen)}`}>{resultLabel(pen)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goleiro cobranças */}
              {goleiroList.length>0 && (
                <div className="print-inner bg-[#0d1b2a] rounded-lg p-3 border border-[#1e3a5f]">
                  <p className="text-xs font-bold text-[#a78bfa] uppercase mb-2">🧤 Cobranças no Goleiro do {nomeMonitorado}</p>
                  <div className="space-y-1">
                    {goleiroList.map((pen,idx)=>(
                      <div key={pen.id} className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-[#4a6fa5] text-xs w-4">{idx+1}.</span>
                        <span className="font-medium">{pen.jogador}</span>
                        {pen.camisa && <span className="text-[#4a6fa5] text-xs">(#{pen.camisa})</span>}
                        {pen.pe && <span className="text-xs bg-[#1e3a5f] text-[#7fb3f5] px-1.5 py-0.5 rounded capitalize">🦶 {pen.pe}</span>}
                        <span className="text-[#7fb3f5] text-xs">→ {ZONE_LABELS[pen.zona]}</span>
                        <span className={`ml-auto text-xs font-semibold ${resultColor(pen)}`}>{resultLabel(pen)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="no-print flex gap-3 pb-8">
            <button type="button" onClick={()=>setStep("form")} className="flex-1 py-2.5 border border-[#1e3a5f] text-[#7fb3f5] rounded-xl text-sm font-medium hover:bg-[#1e3a5f] transition-colors">← Editar</button>
            <button type="button" onClick={()=>window.print()} className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition-colors">🖨 Salvar PDF</button>
          </div>
        </div>
      )}
    </div>
  );
}
