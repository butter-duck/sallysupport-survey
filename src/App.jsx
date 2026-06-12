import { useState, useEffect, useCallback, useRef } from "react";
import * as d3 from "d3";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

// ─── Brand tokens ───────────────────────────────────────────────
const B = {
  navy: "#1A2B4A",
  navyLight: "#243660",
  teal: "#2ABFAA",
  tealLight: "#E6F8F5",
  white: "#FFFFFF",
  gray50: "#F8F9FA",
  gray100: "#F0F1F3",
  gray200: "#DDE0E6",
  gray400: "#9AA0AD",
  gray600: "#5A6170",
  gray800: "#2C3240",
  accent: "#F4A623",
  accentLight: "#FEF6E8",
};

const ADMIN_PASSWORD = "sallyadmin2025";

// ─── Data constants ──────────────────────────────────────────────
const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming","Washington D.C."
];
const CA_PROVINCES = [
  "Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador",
  "Northwest Territories","Nova Scotia","Nunavut","Ontario","Prince Edward Island",
  "Quebec","Saskatchewan","Yukon"
];
const ALL_LOCATIONS = [...US_STATES, ...CA_PROVINCES];

const HOUR_RANGES = ["0–500","501–1,000","1,001–1,500","1,501–2,000","2,001–2,500","2,501–3,000","3,001+"];
const AGENCY_TYPES = ["Franchise network","Independent","Other"];
const PAYER_SOURCES = ["Private pay","Medicaid","Long-term care insurance","Veterans Affairs","Other"];
const OFFICE_ROLES = ["Sales/marketing","Executive assistant/reception","Scheduling/care coordination","Billing","HR/Recruitment","Field supervisor"];

const PIE_COLORS = ["#1A2B4A","#2ABFAA","#F4A623","#6C7EAA","#A8D5CE","#F7C97A","#8B9DC3"];

// ─── Supabase config ─────────────────────────────────────────────
const SUPABASE_URL = "https://zpuewrcmqptccvfhgmgm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdWV3cmNtcXB0Y2N2ZmhnbWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTM3ODUsImV4cCI6MjA5Njc4OTc4NX0.RlES5BRWyGKGnRsvq0_0K5pPDGE_NdHaZFAFwvIU1kE";
const TOKEN_KEY = "sallysupport_token";

async function sbFetch(path, options = {}) {
  const res = await fetch(SUPABASE_URL + path, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function loadResponses() {
  try {
    const rows = await sbFetch("/rest/v1/responses?select=id,data&order=data->>ts.asc");
    return rows.map(r => ({ id: r.id, ...r.data }));
  } catch(e) { console.error("loadResponses:", e); return []; }
}

async function addResponse(response) {
  try {
    await sbFetch("/rest/v1/responses", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({ id: response.id, data: response }),
    });
  } catch(e) { console.error("addResponse:", e); }
}

async function updateResponse(response) {
  try {
    await sbFetch("/rest/v1/responses?id=eq." + response.id, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ data: response }),
    });
  } catch(e) { console.error("updateResponse:", e); }
}

async function deleteResponse(id) {
  try {
    await sbFetch("/rest/v1/responses?id=eq." + id, {
      method: "DELETE",
      prefer: "return=minimal",
    });
  } catch(e) { console.error("deleteResponse:", e); }
}

async function countResponses() {
  try {
    const res = await fetch(SUPABASE_URL + "/rest/v1/responses?select=id", {
      headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Prefer": "count=exact" }
    });
    const count = res.headers.get("content-range");
    return count ? parseInt(count.split("/")[1]) : 0;
  } catch { return 0; }
}

// Seed dummy data into Supabase if the table is empty
async function seedIfEmpty() {
  try {
    const n = await countResponses();
    if (n === 0) {
      for (const r of DUMMY_SEED) {
        await addResponse(r);
      }
    }
  } catch(e) { console.error("seed:", e); }
}

function genToken() {
  return Math.random().toString(36).slice(2,10) + Date.now().toString(36);
}


// ─── Shared UI pieces ────────────────────────────────────────────
function Logo() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <img src="https://sallysupport.com/wp-content/uploads/2024/09/logo-icon.png"
        alt="SallySupport" style={{height:36}} onError={e=>e.target.style.display="none"} />
      <span style={{fontWeight:700,fontSize:18,color:B.navy,letterSpacing:"-0.3px"}}>SallySupport</span>
    </div>
  );
}

function Header({ right }) {
  return (
    <div style={{background:B.white,borderBottom:`1.5px solid ${B.gray200}`,padding:"14px 28px",
      display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
      <Logo />
      {right}
    </div>
  );
}

function Btn({ onClick, children, secondary, small, style={} }) {
  const base = {
    background: secondary ? B.white : B.navy,
    color: secondary ? B.navy : B.white,
    border: secondary ? `1.5px solid ${B.navy}` : "none",
    borderRadius: 8,
    padding: small ? "8px 18px" : "12px 28px",
    fontSize: small ? 14 : 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity .15s",
    ...style
  };
  return <button style={base} onClick={onClick} onMouseEnter={e=>e.target.style.opacity=".85"}
    onMouseLeave={e=>e.target.style.opacity="1"}>{children}</button>;
}

// ─── Survey steps ────────────────────────────────────────────────
function ProgressBar({ step, total }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div style={{marginBottom:28}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,
        color:B.gray400,marginBottom:8}}>
        <span>Question {step} of {total}</span>
        <span>{pct}% complete</span>
      </div>
      <div style={{height:5,background:B.gray100,borderRadius:99}}>
        <div style={{height:"100%",width:`${pct}%`,background:B.teal,borderRadius:99,
          transition:"width .3s ease"}} />
      </div>
    </div>
  );
}

function SurveyShell({ children, step, total, onNext, onBack, nextLabel="Continue", nextDisabled }) {
  return (
    <div style={{minHeight:"100vh",background:B.gray50}}>
      <Header />
      <div style={{maxWidth:620,margin:"0 auto",padding:"40px 20px"}}>
        <ProgressBar step={step} total={total} />
        {children}
        <div style={{display:"flex",gap:12,marginTop:32,justifyContent:"flex-end"}}>
          {step > 1 && <Btn secondary onClick={onBack}>Back</Btn>}
          <Btn onClick={onNext} style={{opacity:nextDisabled?.5:1,pointerEvents:nextDisabled?"none":"auto"}}>
            {nextLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function QLabel({ children }) {
  return <h2 style={{fontSize:22,fontWeight:600,color:B.navy,marginBottom:6,lineHeight:1.35}}>{children}</h2>;
}
function QSub({ children }) {
  return <p style={{fontSize:15,color:B.gray600,marginBottom:24,lineHeight:1.6}}>{children}</p>;
}

// Q1 — Location dropdown
function Q1({ value, onChange }) {
  return (
    <>
      <QLabel>Where is your agency located?</QLabel>
      <QSub>Select the US state or Canadian province where your agency primarily operates.</QSub>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",padding:"12px 16px",fontSize:15,border:`1.5px solid ${value?B.navy:B.gray200}`,
          borderRadius:8,background:B.white,color:value?B.navy:B.gray400,appearance:"none",
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%231A2B4A' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center"}}>
        <option value="">Select a state or province…</option>
        <optgroup label="United States">
          {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
        </optgroup>
        <optgroup label="Canada">
          {CA_PROVINCES.map(p=><option key={p} value={p}>{p}</option>)}
        </optgroup>
      </select>
    </>
  );
}

// Q2 — Billable hours
function Q2({ value, onChange }) {
  return (
    <>
      <QLabel>How many billable hours does your agency cover per week?</QLabel>
      <QSub>Choose the range that best represents your typical weekly billable hours.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {HOUR_RANGES.map(r=>(
          <label key={r} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",
            borderRadius:8,border:`1.5px solid ${value===r?B.navy:B.gray200}`,
            background:value===r?B.tealLight:B.white,cursor:"pointer",transition:"all .15s"}}>
            <input type="radio" name="hours" value={r} checked={value===r} onChange={()=>onChange(r)}
              style={{accentColor:B.navy,width:18,height:18}} />
            <span style={{fontSize:15,color:B.navy,fontWeight:value===r?600:400}}>{r} hours</span>
          </label>
        ))}
      </div>
    </>
  );
}

// Q3 — Agency type
function Q3({ value, onChange, otherText, onOtherText }) {
  return (
    <>
      <QLabel>Are you part of a franchise network or an independent agency?</QLabel>
      <QSub>Select the option that best describes your agency's structure.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {AGENCY_TYPES.map(t=>(
          <label key={t} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",
            borderRadius:8,border:`1.5px solid ${value===t?B.navy:B.gray200}`,
            background:value===t?B.tealLight:B.white,cursor:"pointer",transition:"all .15s"}}>
            <input type="radio" name="agencytype" value={t} checked={value===t} onChange={()=>onChange(t)}
              style={{accentColor:B.navy,width:18,height:18}} />
            <span style={{fontSize:15,color:B.navy,fontWeight:value===t?600:400}}>{t}</span>
          </label>
        ))}
      </div>
      {value==="Other" && (
        <input value={otherText} onChange={e=>onOtherText(e.target.value)} placeholder="Please specify…"
          style={{marginTop:12,width:"100%",padding:"12px 16px",fontSize:15,
            border:`1.5px solid ${B.navy}`,borderRadius:8,boxSizing:"border-box"}} />
      )}
    </>
  );
}

// Q4 — Payer source
function Q4({ value, onChange, otherText, onOtherText }) {
  return (
    <>
      <QLabel>What is your primary payer source?</QLabel>
      <QSub>Select the payer source that represents the largest portion of your agency's revenue.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {PAYER_SOURCES.map(t=>(
          <label key={t} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",
            borderRadius:8,border:`1.5px solid ${value===t?B.navy:B.gray200}`,
            background:value===t?B.tealLight:B.white,cursor:"pointer",transition:"all .15s"}}>
            <input type="radio" name="payer" value={t} checked={value===t} onChange={()=>onChange(t)}
              style={{accentColor:B.navy,width:18,height:18}} />
            <span style={{fontSize:15,color:B.navy,fontWeight:value===t?600:400}}>{t}</span>
          </label>
        ))}
      </div>
      {value==="Other" && (
        <input value={otherText} onChange={e=>onOtherText(e.target.value)} placeholder="Please specify…"
          style={{marginTop:12,width:"100%",padding:"12px 16px",fontSize:15,
            border:`1.5px solid ${B.navy}`,borderRadius:8,boxSizing:"border-box"}} />
      )}
    </>
  );
}

// Q5 — Hiring order ranking
function Q5({ values, onChange, otherText, onOtherText }) {
  function setRank(role, val) {
    const n = parseInt(val,10);
    onChange({...values,[role]:isNaN(n)||val===""?0:Math.max(0,n)});
  }
  const allRoles = [...OFFICE_ROLES, ...(otherText.trim()?[otherText.trim()]:["Other (specify below)"])];
  return (
    <>
      <QLabel>In what order did you hire for each office function?</QLabel>
      <QSub>
        Enter a number (1 = first hired, 2 = second, etc.) for each role you have hired for.
        Leave blank or enter 0 if you haven't hired for that role yet.
      </QSub>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {allRoles.map((role,i)=>(
          <div key={role} style={{display:"flex",alignItems:"center",gap:16,padding:"12px 18px",
            borderRadius:8,border:`1.5px solid ${B.gray200}`,background:B.white}}>
            <span style={{flex:1,fontSize:15,color:B.navy}}>{role}</span>
            <input type="number" min="0" max="20" placeholder="0"
              value={values[role]||""}
              onChange={e=>setRank(role,e.target.value)}
              style={{width:70,padding:"8px 12px",fontSize:15,textAlign:"center",
                border:`1.5px solid ${values[role]?B.navy:B.gray200}`,borderRadius:6}} />
          </div>
        ))}
      </div>
      <div style={{marginTop:16}}>
        <label style={{fontSize:14,color:B.gray600,display:"block",marginBottom:6}}>
          Other role not listed above (optional):
        </label>
        <input value={otherText} onChange={e=>onOtherText(e.target.value)}
          placeholder="e.g. Quality Assurance"
          style={{width:"100%",padding:"12px 16px",fontSize:15,border:`1.5px solid ${B.gray200}`,
            borderRadius:8,boxSizing:"border-box"}} />
      </div>
    </>
  );
}

// Q6 — Current employment status
function Q6({ values, onChange, q5OtherText }) {
  const opts = ["Full-time","Part-time","Mix of both","Not applicable"];
  const allRoles = [...OFFICE_ROLES, ...(q5OtherText.trim()?[q5OtherText.trim()]:["Other"])];
  return (
    <>
      <QLabel>Do you currently employ staff in these positions?</QLabel>
      <QSub>For each role, indicate whether your current employees are full-time, part-time, a mix, or if the role isn't applicable.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {allRoles.map(role=>(
          <div key={role} style={{padding:"14px 18px",borderRadius:8,border:`1.5px solid ${B.gray200}`,background:B.white}}>
            <div style={{fontSize:15,fontWeight:600,color:B.navy,marginBottom:10}}>{role}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {opts.map(o=>(
                <label key={o} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",
                  borderRadius:20,border:`1.5px solid ${values[role]===o?B.navy:B.gray200}`,
                  background:values[role]===o?B.tealLight:B.white,cursor:"pointer",fontSize:14,
                  color:B.navy,fontWeight:values[role]===o?600:400,transition:"all .15s"}}>
                  <input type="radio" name={`q6_${role}`} value={o} checked={values[role]===o}
                    onChange={()=>onChange({...values,[role]:o})}
                    style={{accentColor:B.navy,width:14,height:14}} />
                  {o}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Survey flow ─────────────────────────────────────────────────
function Survey({ onComplete }) {
  const [step,setStep] = useState(1);
  const TOTAL = 6;
  const [q1,setQ1] = useState("");
  const [q2,setQ2] = useState("");
  const [q3,setQ3] = useState("");  const [q3Other,setQ3Other] = useState("");
  const [q4,setQ4] = useState("");  const [q4Other,setQ4Other] = useState("");
  const [q5,setQ5] = useState({});  const [q5Other,setQ5Other] = useState("");
  const [q6,setQ6] = useState({});

  const canNext = [
    ()=>!!q1,
    ()=>!!q2,
    ()=>!!q3&&(q3!=="Other"||q3Other.trim()),
    ()=>!!q4&&(q4!=="Other"||q4Other.trim()),
    ()=>true,
    ()=>true,
  ][step-1]?.();

  function next() {
    if(step<TOTAL) setStep(s=>s+1);
    else submit();
  }
  function back() { setStep(s=>s-1); }

  async function submit() {
    const token = genToken();
    const response = {
      id: token,
      ts: Date.now(),
      q1, q2,
      q3: q3==="Other"?`Other: ${q3Other}`:q3,
      q4: q4==="Other"?`Other: ${q4Other}`:q4,
      q5: {...q5}, q5Other,
      q6: {...q6},
    };
    const existing = loadResponses();
    saveResponses([...existing, response]);
    localStorage.setItem(TOKEN_KEY, token);
    onComplete(token);
  }

  const stepContent = [
    <Q1 value={q1} onChange={setQ1}/>,
    <Q2 value={q2} onChange={setQ2}/>,
    <Q3 value={q3} onChange={setQ3} otherText={q3Other} onOtherText={setQ3Other}/>,
    <Q4 value={q4} onChange={setQ4} otherText={q4Other} onOtherText={setQ4Other}/>,
    <Q5 values={q5} onChange={setQ5} otherText={q5Other} onOtherText={setQ5Other}/>,
    <Q6 values={q6} onChange={setQ6} q5OtherText={q5Other}/>,
  ];

  return (
    <SurveyShell step={step} total={TOTAL} onNext={next} onBack={back}
      nextLabel={step===TOTAL?"Submit responses":"Continue"} nextDisabled={!canNext}>
      {stepContent[step-1]}
    </SurveyShell>
  );
}

// ─── Welcome screen ──────────────────────────────────────────────
function Welcome({ onStart, onAdmin }) {
  return (
    <div style={{minHeight:"100vh",background:B.gray50}}>
      <Header />
      <div style={{maxWidth:620,margin:"0 auto",padding:"64px 20px",textAlign:"center"}}>
        <div style={{display:"inline-block",background:B.tealLight,borderRadius:12,
          padding:"10px 20px",fontSize:14,fontWeight:600,color:B.teal,marginBottom:24}}>
          Industry Benchmarking Survey
        </div>
        <h1 style={{fontSize:34,fontWeight:700,color:B.navy,marginBottom:16,lineHeight:1.2}}>
          How are home care agencies building their teams?
        </h1>
        <p style={{fontSize:16,color:B.gray600,lineHeight:1.7,marginBottom:12}}>
          SallySupport is collecting anonymous data from home care agency owners and operators
          to build an industry-first benchmark on office staffing — who gets hired first, how agencies
          scale their teams, and what structures are most common.
        </p>
        <p style={{fontSize:16,color:B.gray600,lineHeight:1.7,marginBottom:36}}>
          The survey takes about 3–5 minutes. Once you submit, you'll get instant access to the
          full live results dashboard — updated in real time as other agencies respond.
        </p>
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:12,
          padding:"20px 28px",marginBottom:36,textAlign:"left"}}>
          <div style={{fontSize:14,fontWeight:600,color:B.navy,marginBottom:12}}>
            What you'll see in the dashboard:
          </div>
          {[
            "Map of respondents by state & province",
            "Agency size, type, and payer source breakdowns",
            "Hiring order timeline — what roles agencies hire first",
            "How staffing evolves as agencies grow",
          ].map(item=>(
            <div key={item} style={{display:"flex",alignItems:"center",gap:10,
              fontSize:14,color:B.gray600,marginBottom:8}}>
              <span style={{color:B.teal,fontWeight:700}}>✓</span>{item}
            </div>
          ))}
        </div>
        <Btn onClick={onStart} style={{fontSize:16,padding:"15px 40px"}}>
          Start the survey →
        </Btn>
        <div style={{marginTop:48,paddingTop:20,borderTop:`1px solid ${B.gray200}`}}>
          <button onClick={onAdmin} style={{background:"none",border:"none",
            fontSize:12,color:B.gray400,cursor:"pointer",padding:0}}
            onMouseEnter={e=>e.target.style.color=B.gray600}
            onMouseLeave={e=>e.target.style.color=B.gray400}>
            Admin
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Thank you / access screen ───────────────────────────────────
function ThankYou({ token, onDashboard }) {
  const link = `${window.location.href.split("?")[0]}?access=${token}`;
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(link).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  }
  return (
    <div style={{minHeight:"100vh",background:B.gray50}}>
      <Header />
      <div style={{maxWidth:560,margin:"0 auto",padding:"64px 20px",textAlign:"center"}}>
        <div style={{width:64,height:64,background:B.tealLight,borderRadius:"50%",
          display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:28}}>
          ✓
        </div>
        <h1 style={{fontSize:28,fontWeight:700,color:B.navy,marginBottom:12}}>Thanks for responding!</h1>
        <p style={{fontSize:16,color:B.gray600,lineHeight:1.7,marginBottom:32}}>
          Your data has been submitted. You now have full access to the live results dashboard.
          Save the link below to return to the dashboard any time — from any device.
        </p>
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"16px 20px",marginBottom:24,textAlign:"left"}}>
          <div style={{fontSize:13,color:B.gray400,marginBottom:8}}>Your personal access link</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <code style={{flex:1,fontSize:12,color:B.navy,wordBreak:"break-all",background:B.gray50,
              padding:"8px 12px",borderRadius:6}}>{link}</code>
            <Btn small secondary onClick={copy}>{copied?"Copied!":"Copy"}</Btn>
          </div>
        </div>
        <Btn onClick={onDashboard} style={{fontSize:16,padding:"14px 36px"}}>
          View the dashboard →
        </Btn>
      </div>
    </div>
  );
}

// ─── Returning user screen ───────────────────────────────────────
function ReturningUser({ onValid, onTakeSurvey }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  async function check() {
    const responses = await loadResponses();
    const found = responses.find(r=>r.id===val.trim());
    if(found) { onValid(val.trim()); }
    else setErr("Token not recognised. Check your saved link, or take the survey to get access.");
  }
  return (
    <div style={{minHeight:"100vh",background:B.gray50}}>
      <Header />
      <div style={{maxWidth:480,margin:"0 auto",padding:"80px 20px",textAlign:"center"}}>
        <h1 style={{fontSize:26,fontWeight:700,color:B.navy,marginBottom:12}}>Welcome back</h1>
        <p style={{fontSize:15,color:B.gray600,lineHeight:1.7,marginBottom:32}}>
          Enter your access token to view the dashboard, or take the survey to get access.
        </p>
        <input value={val} onChange={e=>{setVal(e.target.value);setErr("");}}
          placeholder="Paste your access token…"
          style={{width:"100%",padding:"13px 16px",fontSize:15,border:`1.5px solid ${B.gray200}`,
            borderRadius:8,marginBottom:12,boxSizing:"border-box"}} />
        {err && <p style={{fontSize:14,color:"#C0392B",marginBottom:12}}>{err}</p>}
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <Btn onClick={check}>Access dashboard</Btn>
          <Btn secondary onClick={onTakeSurvey}>Take the survey</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard helpers ───────────────────────────────────────────
function StatCard({ label, value, sub }) {
  const vlen = typeof value === 'string' ? value.length : 0;
  const valFontSize = vlen > 22 ? 10 : vlen > 16 ? 12 : vlen > 10 ? 16 : 34;
  return (
    <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
      padding:"20px 16px",textAlign:"center",minWidth:0}}>
      <div style={{fontSize:valFontSize,fontWeight:700,color:B.navy,lineHeight:1.3,
        whiteSpace:"normal",overflowWrap:"anywhere"}}>{value}</div>
      <div style={{fontSize:13,fontWeight:600,color:B.gray600,marginTop:6}}>{label}</div>
      {sub && <div style={{fontSize:12,color:B.gray400,marginTop:4}}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{fontSize:20,fontWeight:700,color:B.navy,marginBottom:4}}>
      {children}
    </h2>
  );
}

function OtherList({ label, items }) {
  if(!items.length) return null;
  return (
    <div style={{marginTop:14,padding:"12px 16px",background:B.gray50,borderRadius:8,
      border:`1px solid ${B.gray200}`}}>
      <div style={{fontSize:13,fontWeight:600,color:B.gray600,marginBottom:8}}>"Other" responses for {label}:</div>
      {items.map((it,i)=>(
        <div key={i} style={{fontSize:13,color:B.gray800,padding:"3px 0"}}>• {it}</div>
      ))}
    </div>
  );
}

function FilterBar({ filters, setFilters, responses }) {
  const states = [...new Set(responses.map(r=>r.q1))].filter(Boolean).sort();
  const types = ["Franchise network","Independent"];
  const payers = ["Private pay","Medicaid","Long-term care insurance","Veterans Affairs"];
  const sel = (key,val) => setFilters(f=>({...f,[key]:f[key]===val?"":val}));
  const chipStyle = (active) => ({
    padding:"6px 14px",borderRadius:20,fontSize:13,cursor:"pointer",border:"1.5px solid",
    borderColor:active?B.navy:B.gray200,background:active?B.navy:B.white,
    color:active?B.white:B.gray600,fontWeight:active?600:400,whiteSpace:"nowrap",
    transition:"all .15s"
  });
  return (
    <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
      padding:"16px 20px",marginBottom:24}}>
      <div style={{fontSize:13,fontWeight:600,color:B.navy,marginBottom:10}}>
        Filter timeline by:
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
        <span style={{fontSize:12,color:B.gray400,alignSelf:"center"}}>Agency type:</span>
        {types.map(t=>(
          <button key={t} style={chipStyle(filters.agencyType===t)}
            onClick={()=>sel("agencyType",t)}>{t}</button>
        ))}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
        <span style={{fontSize:12,color:B.gray400,alignSelf:"center"}}>Payer source:</span>
        {payers.map(p=>(
          <button key={p} style={chipStyle(filters.payer===p)}
            onClick={()=>sel("payer",p)}>{p}</button>
        ))}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
        <span style={{fontSize:12,color:B.gray400,alignSelf:"center"}}>State/Province:</span>
        <select value={filters.location} onChange={e=>setFilters(f=>({...f,location:e.target.value}))}
          style={{padding:"6px 12px",fontSize:13,borderRadius:6,border:`1.5px solid ${B.gray200}`,
            background:filters.location?B.navy:B.white,color:filters.location?B.white:B.gray600}}>
          <option value="">All locations</option>
          {states.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        {(filters.agencyType||filters.payer||filters.location) && (
          <button style={{...chipStyle(false),borderColor:B.gray400,color:B.gray600}}
            onClick={()=>setFilters({agencyType:"",payer:"",location:""})}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Inline choropleth map (no external deps) ───────────────────
const GEO_REGIONS = [
{name:"Alabama",paths:["M554.1,525.4L568.4,523.7L574.9,544.2L577.4,548.3L577.2,549.3L578.3,549.8L577.0,551.3L576.8,554.3L578.1,557.2L577.8,559.9L579.2,562.5L556.9,565.6L556.8,566.9L558.9,568.6L558.8,570.3L559.6,571.1L557.3,573.2L554.9,571.8L554.4,569.3L553.7,569.1L553.0,572.9L550.7,572.7L548.4,557.4L548.2,527.2L547.3,526.2L554.1,525.4Z"],cx:563.4,cy:554.9},
{name:"Alaska",paths:["M419.4,683.5L419.3,682.7L420.0,682.9L420.2,683.7L419.4,683.5Z", "M418.4,682.3L419.0,683.5L418.4,682.3Z", "M413.9,678.7L414.8,678.5L415.0,679.2L413.9,678.7Z", "M412.5,679.6L413.6,679.4L416.2,681.2L418.4,683.5L419.0,685.7L418.2,685.9L416.7,684.7L416.2,684.9L416.4,685.6L417.2,685.4L416.8,686.5L415.1,684.4L414.5,684.6L415.1,683.4L413.2,681.0L413.0,681.6L412.5,679.6Z", "M413.3,683.3L414.5,683.0L414.3,683.8L413.3,683.3Z", "M410.9,677.2L410.7,676.4L412.8,676.2L414.6,677.9L412.2,679.2L410.9,677.2Z", "M411.0,679.4L409.7,677.9L410.3,677.3L411.9,678.5L411.6,681.6L411.0,679.4Z", "M410.0,680.7L407.3,678.9L405.9,676.5L406.3,675.4L407.9,675.7L410.0,680.7Z", "M407.1,671.9L408.5,671.8L409.6,673.2L409.1,673.6L410.4,675.2L409.3,677.2L406.3,671.2L407.1,671.9Z", "M405.5,676.8L406.5,678.0L405.9,678.3L405.5,676.8Z", "M403.4,673.0L404.5,672.3L405.3,673.6L405.5,672.8L407.0,673.1L407.8,675.3L405.8,675.0L406.1,676.0L405.3,676.4L403.0,674.5L403.4,673.0Z", "M375.8,668.5L374.1,670.7L375.8,668.5Z", "M374.5,666.8L374.2,668.9L373.7,668.6L374.5,666.8Z", "M369.7,621.1L375.0,621.7L377.1,620.7L381.2,622.2L389.9,665.9L392.3,666.0L394.2,664.7L394.3,666.0L398.9,669.0L399.7,670.5L401.4,668.8L401.6,666.4L403.2,665.1L404.6,665.9L405.1,667.2L410.9,671.0L416.5,677.0L422.1,678.1L423.3,681.2L422.4,684.4L420.6,682.7L420.8,681.9L419.7,682.8L418.3,682.1L418.3,680.9L417.9,682.1L417.2,681.9L416.8,680.1L416.5,680.8L414.9,679.5L415.7,678.6L415.3,677.0L411.5,675.7L410.3,673.0L405.9,670.8L404.5,667.8L406.2,672.2L405.2,671.6L404.0,672.0L403.0,670.1L401.0,669.9L403.7,672.0L402.4,672.6L402.6,673.2L398.0,670.4L393.6,669.0L393.5,666.4L392.1,668.4L386.5,667.6L383.4,668.5L381.5,667.8L380.9,666.7L380.1,667.5L378.5,666.5L376.9,668.2L376.7,667.0L378.0,666.0L376.7,665.7L376.0,664.4L373.3,666.0L372.9,664.9L372.5,665.9L373.7,667.6L373.5,668.4L373.0,668.1L373.7,669.7L371.2,669.6L370.7,670.4L370.3,669.9L370.2,670.9L366.8,673.9L365.3,674.2L364.4,673.8L364.6,673.0L366.4,671.8L366.4,671.2L365.5,672.0L364.6,671.3L365.8,668.3L365.5,666.7L367.7,665.1L368.6,665.7L369.3,665.1L367.1,663.9L363.9,666.9L361.7,671.8L360.8,671.7L359.2,673.3L359.0,674.8L361.2,675.7L359.3,677.6L359.1,678.9L356.6,680.1L356.0,681.3L355.5,680.9L355.0,682.0L354.2,681.9L352.8,684.6L348.1,686.8L347.4,689.2L345.1,689.5L344.3,690.8L343.9,689.5L339.9,691.5L339.1,691.4L339.1,690.1L337.5,692.6L336.4,692.5L336.0,691.3L335.9,692.7L335.3,693.0L334.4,692.1L334.8,692.8L333.7,693.4L334.3,694.0L329.4,694.6L330.6,692.5L333.5,692.1L333.8,692.9L334.1,691.8L335.3,691.7L338.6,688.8L341.2,688.5L341.2,689.8L341.4,689.2L342.6,689.8L342.0,688.6L342.6,687.4L346.6,684.9L347.4,685.2L348.2,683.0L350.1,681.5L350.9,677.3L351.9,676.3L351.8,675.6L348.8,676.4L348.1,675.1L347.3,677.6L345.7,674.9L344.9,675.5L344.0,674.0L340.3,676.1L340.2,672.2L340.9,671.7L340.0,668.7L339.5,668.2L339.3,669.0L337.6,669.5L335.3,669.1L333.3,665.3L334.0,663.0L333.0,662.7L332.6,660.4L332.1,660.7L332.4,659.1L333.2,659.2L333.6,657.8L335.9,655.8L336.6,653.6L338.0,653.1L340.0,654.3L341.9,652.5L344.3,652.7L345.3,651.2L344.4,647.8L345.6,647.5L345.0,646.0L341.4,648.4L341.0,647.3L340.6,647.9L339.9,647.0L336.9,647.2L334.3,645.8L334.0,644.0L334.7,642.4L331.9,640.7L335.8,638.5L336.8,639.2L336.7,638.1L339.7,637.3L340.9,637.6L340.6,639.9L344.3,640.6L344.9,639.6L345.6,639.9L345.8,639.3L344.3,639.1L344.5,638.3L343.4,637.1L343.8,636.2L345.0,638.7L344.8,635.7L341.4,634.9L340.9,632.4L337.0,628.4L338.3,626.0L342.2,626.2L346.6,620.5L348.3,620.5L350.4,618.6L353.0,618.6L355.4,616.3L357.0,617.2L356.3,618.8L357.8,617.3L359.2,619.1L360.7,618.3L362.2,618.7L362.0,619.8L364.1,620.8L366.8,620.0L369.7,621.1Z", "M362.1,679.7L361.2,679.7L362.8,677.2L363.2,678.2L364.3,678.3L364.3,679.1L362.1,679.7Z", "M359.6,682.1L360.3,681.5L359.6,680.8L360.2,680.4L360.6,681.2L361.4,679.9L362.7,679.9L363.4,681.8L364.2,681.6L363.7,682.6L362.7,682.2L362.3,684.0L359.4,685.9L359.3,684.8L358.7,685.4L357.5,683.4L358.9,681.5L359.6,682.1Z", "M358.1,686.6L357.3,687.4L358.1,686.6Z", "M355.1,689.8L355.3,690.8L354.6,690.7L355.1,689.8Z", "M343.5,692.2L342.3,693.9L343.5,692.2Z", "M341.8,691.7L342.2,692.2L341.0,692.7L341.1,691.5L341.8,691.7Z", "M336.9,692.9L336.6,693.6L336.9,692.9Z", "M341.7,651.8L341.3,652.2L341.7,651.8Z", "M335.1,695.1L335.6,695.7L335.1,695.1Z", "M327.4,694.8L327.1,695.5L327.4,694.8Z", "M326.8,695.4L325.7,695.3L326.8,695.4Z", "M330.5,665.9L332.0,666.6L331.9,667.9L330.7,668.9L328.0,666.8L328.0,666.1L330.5,665.9Z", "M324.9,695.7L325.3,696.2L324.2,697.0L325.4,697.0L323.9,697.9L320.7,698.6L320.3,698.1L323.4,697.1L322.6,696.2L323.0,695.7L324.9,695.7Z", "M317.4,698.3L319.3,697.0L320.2,697.2L317.4,699.3L317.4,698.3Z", "M314.4,698.9L313.7,699.2L314.4,698.9Z", "M311.6,699.2L311.0,699.8L311.6,699.2Z", "M322.5,647.5L323.9,648.7L325.4,648.5L325.7,649.5L328.3,651.1L325.9,652.3L323.9,649.4L322.0,649.2L322.5,647.5Z", "M306.2,699.2L305.6,699.7L306.2,699.2Z", "M302.5,699.3L303.9,700.1L302.6,700.0L302.5,699.3Z", "M300.8,698.1L301.4,697.6L301.8,698.3L301.1,699.0L298.6,698.7L300.8,698.1Z", "M294.1,698.1L294.5,698.7L292.8,698.8L293.4,697.3L294.1,698.1Z", "M292.4,697.0L291.6,698.0L292.4,697.0Z", "M289.6,696.1L290.3,697.0L289.6,697.4L289.6,696.1Z", "M267.9,680.5L267.1,680.9L262.9,678.9L264.1,678.3L267.9,680.5Z"],cx:419.6,cy:683.4},
{name:"Arizona",paths:["M380.5,503.1L371.9,559.2L354.7,556.3L325.6,538.5L326.9,536.5L328.6,536.5L329.2,535.7L329.2,533.8L328.1,533.5L328.3,529.7L330.3,528.7L331.1,524.9L332.4,523.4L335.1,522.0L333.8,520.3L332.3,515.6L333.4,513.1L334.2,503.4L337.1,503.7L338.6,505.2L339.8,503.7L341.5,495.9L380.5,503.1Z"],cx:339.2,cy:521.4},
{name:"Arkansas",paths:["M495.7,514.9L530.2,512.9L531.0,514.8L528.8,518.0L534.0,517.6L533.9,519.4L532.7,520.1L532.6,521.6L531.2,523.4L531.6,525.8L530.1,527.9L530.7,528.7L528.2,531.9L528.5,533.8L527.1,534.5L525.6,536.9L526.1,537.9L523.7,542.8L525.2,544.0L524.6,548.4L500.4,549.5L500.2,544.2L497.4,544.3L496.5,543.4L496.4,525.9L494.6,514.9L495.7,514.9Z"],cx:520.5,cy:531.3},
{name:"California",paths:["M287.3,429.7L309.7,437.0L301.4,465.3L332.6,514.3L332.3,515.6L333.8,520.3L335.1,522.0L332.4,523.4L331.1,524.9L330.3,528.7L328.3,529.7L328.1,533.5L329.2,533.8L328.6,536.5L306.7,533.5L306.0,532.0L306.5,527.4L305.8,525.4L301.2,519.3L300.4,519.7L299.3,519.0L299.7,518.1L298.9,515.8L296.9,515.7L294.0,513.3L293.8,512.0L292.0,510.0L284.9,507.5L283.9,505.8L285.5,500.9L283.9,498.9L284.4,496.9L282.1,493.9L279.3,486.3L280.0,483.1L280.5,483.6L281.7,482.0L281.1,480.0L279.7,479.7L278.3,476.3L279.2,470.9L280.6,471.4L281.1,467.8L279.7,469.6L278.2,469.4L276.8,467.6L276.8,463.2L273.9,456.9L276.0,448.5L273.7,443.2L274.0,441.4L277.2,438.0L279.7,433.0L279.5,429.3L280.5,427.4L287.3,429.7Z"],cx:295.2,cy:487.7},
{name:"Colorado",paths:["M394.7,465.2L438.0,469.5L435.6,509.0L380.5,503.1L386.4,464.0L394.7,465.2Z"],cx:405.3,cy:486.4},
{name:"Connecticut",paths:["M647.8,434.6L656.6,431.9L658.3,438.6L651.0,441.3L646.6,445.7L645.7,444.8L647.2,443.3L646.4,442.6L644.8,435.4L647.8,434.6Z"],cx:651.1,cy:439.3},
{name:"Delaware",paths:["M637.1,460.6L636.2,462.8L636.7,464.2L638.2,465.3L639.1,467.6L641.4,469.6L642.2,469.5L643.4,472.7L638.6,473.9L634.6,462.1L635.6,460.7L637.1,460.6Z"],cx:638.2,cy:465.5},
{name:"Washington D.C.",paths:["M627.2,471.5L628.4,472.2L627.7,473.5L626.8,472.2L627.2,471.5Z"],cx:627.5,cy:472.2},
{name:"Florida",paths:["M575.0,563.2L579.2,562.5L580.8,565.2L603.8,562.8L604.7,564.8L605.7,564.6L605.0,560.7L605.7,559.8L610.2,560.2L613.6,569.0L617.4,574.9L622.7,581.0L622.2,581.6L623.1,584.7L630.7,596.8L631.9,607.7L631.1,608.0L631.2,611.6L629.8,613.9L629.0,613.6L624.7,615.8L620.7,609.1L618.9,608.6L617.7,609.5L615.4,605.2L613.0,603.3L612.2,599.6L611.1,599.4L611.6,600.7L610.7,601.2L605.4,595.0L607.4,590.5L605.7,591.0L604.7,592.5L603.2,590.7L603.8,584.9L603.2,580.3L601.4,578.0L599.6,577.9L595.5,575.1L595.1,573.7L592.8,571.8L589.1,570.2L586.2,571.1L586.6,572.7L585.6,572.5L582.3,575.0L578.5,576.0L577.3,573.7L569.0,570.5L566.0,570.6L558.4,572.7L559.6,571.1L558.8,570.3L558.9,568.6L556.8,566.9L556.9,565.6L575.0,563.2Z"],cx:601.4,cy:583.8},
{name:"Georgia",paths:["M588.5,520.3L587.2,523.8L590.2,525.4L591.1,525.1L594.8,529.9L600.9,533.7L601.0,534.8L602.8,536.4L605.3,537.5L606.7,541.1L609.8,543.9L610.2,545.6L612.3,546.1L610.9,549.9L610.5,555.0L609.7,555.9L610.2,560.2L605.7,559.8L605.0,560.7L605.7,564.6L604.7,564.8L603.8,562.8L580.8,565.2L577.8,559.9L578.1,557.2L576.8,554.3L577.0,551.3L578.3,549.8L577.2,549.3L577.4,548.3L574.9,544.2L568.4,523.7L588.5,520.3Z"],cx:594.1,cy:544.1},
{name:"Hawaii",paths:["M653.6,683.7L649.1,682.1L649.0,676.4L645.8,669.4L650.1,663.9L648.8,661.8L649.2,659.6L660.0,664.1L663.5,666.9L663.5,669.3L668.7,673.2L665.5,676.4L659.8,677.9L655.8,680.3L653.6,683.7Z", "M636.2,645.8L638.3,648.2L641.0,647.2L646.9,650.0L646.0,652.6L638.8,653.4L638.5,650.2L635.4,649.5L634.2,647.8L636.2,645.8Z", "M629.0,642.5L627.2,644.4L623.0,644.4L624.3,642.3L629.0,642.5Z", "M611.3,633.6L613.3,637.9L612.3,640.4L608.4,640.8L605.8,635.7L611.3,633.6Z", "M583.6,623.9L585.7,624.1L586.7,626.0L586.1,628.7L584.0,630.4L578.2,628.3L578.9,625.3L583.6,623.9Z"],cx:654.8,cy:672.1},
{name:"Idaho",paths:["M353.9,377.6L351.5,387.4L352.9,390.6L352.3,393.2L354.5,395.4L357.8,402.3L359.7,402.7L357.3,408.3L357.7,409.9L356.3,410.7L355.9,412.8L357.2,414.1L360.0,412.2L361.0,413.4L360.9,416.2L362.3,419.2L361.9,421.0L363.9,422.4L364.8,426.4L365.7,425.6L367.9,426.1L369.6,425.5L373.9,426.6L375.8,424.8L377.7,428.0L373.4,451.9L330.7,442.7L335.2,425.3L336.9,422.4L336.5,421.4L335.2,421.0L335.1,419.5L343.3,409.2L343.0,407.8L341.6,406.7L341.1,401.3L347.7,376.1L353.9,377.6Z"],cx:354.4,cy:412.9},
{name:"Illinois",paths:["M521.6,454.1L542.0,452.2L542.0,454.1L545.0,459.6L547.7,482.7L547.0,484.6L548.6,488.3L546.5,493.4L545.7,493.6L545.6,498.4L544.7,499.9L545.6,501.6L542.5,502.8L542.3,503.9L543.2,505.1L542.3,506.0L538.4,505.0L537.3,506.9L537.8,507.4L536.5,507.4L534.5,504.7L535.1,504.0L534.1,500.7L531.4,498.8L530.6,499.1L527.1,496.1L528.5,489.7L525.6,488.8L524.8,489.8L523.4,486.0L518.2,481.8L516.8,476.8L517.4,473.6L519.4,472.4L520.4,469.8L520.4,468.1L519.1,466.8L519.4,465.0L524.4,462.9L525.5,460.6L525.3,457.5L523.6,456.7L521.6,454.1Z"],cx:532.3,cy:483.4},
{name:"Indiana",paths:["M556.1,457.7L564.6,456.5L568.5,482.3L568.0,482.9L569.1,485.4L566.4,486.8L564.4,486.7L564.8,488.6L562.0,491.6L560.8,494.9L559.0,494.2L558.5,493.1L557.0,494.6L557.3,495.7L555.6,496.3L554.9,495.4L552.6,497.7L548.7,496.3L545.6,498.4L545.7,493.6L546.5,493.4L548.6,488.3L547.0,484.6L547.7,482.7L545.0,459.6L545.8,460.2L548.0,459.9L550.0,458.5L556.1,457.7Z"],cx:555.0,cy:485.6},
{name:"Iowa",paths:["M515.6,444.7L516.7,444.7L516.9,446.1L518.0,447.0L517.2,448.2L518.3,451.9L521.0,452.9L523.6,456.7L525.3,457.5L525.6,458.7L524.4,462.9L519.4,465.0L519.1,466.8L520.4,468.1L520.4,469.8L519.4,472.4L517.4,473.6L517.4,475.4L514.9,473.2L484.8,474.7L483.9,473.4L484.3,470.9L483.5,466.2L482.2,465.4L481.9,461.1L480.9,460.5L478.2,453.9L479.6,449.8L478.7,448.9L478.5,446.4L515.6,444.7Z"],cx:504.2,cy:460.3},
{name:"Kansas",paths:["M438.5,479.4L488.3,480.4L491.6,482.0L489.9,484.9L492.2,488.2L493.8,488.6L494.4,510.0L435.6,509.0L437.4,479.4L438.5,479.4Z"],cx:471.6,cy:489.1},
{name:"Kentucky",paths:["M576.0,484.5L577.9,485.6L579.0,484.7L582.0,484.9L583.7,483.3L584.3,484.9L586.5,486.1L586.9,489.1L588.1,490.8L590.2,493.1L592.9,493.9L587.9,499.0L587.0,501.5L585.6,502.1L585.3,503.3L581.2,505.6L546.5,509.5L546.8,511.3L536.0,512.4L536.3,511.1L537.5,511.4L537.3,506.9L538.4,505.0L542.3,506.0L543.2,505.1L542.3,503.9L542.5,502.8L545.6,501.6L544.7,499.9L546.2,497.4L548.2,497.1L548.7,496.3L552.6,497.7L554.9,495.4L555.6,496.3L557.3,495.7L557.0,494.6L558.5,493.1L559.0,494.2L560.8,494.9L562.0,491.6L564.8,488.6L564.4,486.7L566.4,486.8L569.1,485.4L568.0,482.9L568.5,482.3L571.4,481.9L573.6,484.5L576.0,484.5Z"],cx:564.5,cy:496.2},
{name:"Louisiana",paths:["M504.1,549.4L524.6,548.4L525.5,549.4L525.0,552.0L526.3,553.1L526.7,556.1L525.9,558.5L524.0,560.1L523.6,562.4L522.8,562.2L522.9,565.9L521.8,566.1L522.6,568.0L522.0,568.8L538.4,567.5L537.8,570.9L541.1,575.6L538.6,577.2L538.5,578.2L540.7,578.7L541.4,577.0L543.4,578.4L543.4,579.7L542.4,580.4L540.4,580.0L540.2,582.5L542.0,583.6L544.7,583.7L546.6,585.3L545.4,587.1L543.8,586.9L542.3,585.3L539.0,584.6L538.8,582.9L537.3,583.6L536.9,586.5L535.8,586.8L534.7,585.3L532.7,585.5L532.1,587.1L530.8,587.6L528.1,586.8L526.8,584.3L523.9,583.6L523.0,581.5L520.7,582.0L520.6,580.7L517.1,584.0L508.9,582.0L503.5,583.1L502.7,582.1L504.6,578.4L503.8,576.5L504.1,574.0L505.7,570.3L505.4,568.2L502.9,564.2L502.8,562.0L500.8,559.8L500.4,549.5L504.1,549.4Z"],cx:525.5,cy:574.9},
{name:"Maine",paths:["M660.9,419.8L658.2,417.7L651.3,399.8L653.7,397.5L653.0,397.0L654.5,394.2L653.9,384.4L656.2,375.6L657.5,375.5L658.1,377.2L659.2,377.5L662.8,374.3L666.5,375.9L671.3,388.7L673.8,388.5L674.7,391.5L676.2,392.6L677.3,391.8L679.7,394.6L678.9,396.6L677.9,396.4L677.7,397.6L676.7,397.7L676.9,398.6L675.6,399.0L674.4,401.7L672.7,400.6L673.6,402.0L672.3,403.3L671.6,402.2L669.4,403.7L668.8,402.4L667.9,403.1L668.6,406.8L667.8,408.4L666.4,408.4L664.6,411.6L663.5,411.8L662.9,410.8L660.9,419.8Z"],cx:665.3,cy:398.1},
{name:"Maryland",paths:["M607.4,468.8L634.6,462.1L638.6,473.9L643.4,472.7L643.1,477.1L638.6,479.6L637.4,477.6L638.1,476.7L636.5,475.4L636.3,476.2L634.7,476.4L633.7,474.9L633.9,471.4L632.5,468.6L632.8,466.6L634.0,465.9L633.7,464.1L631.4,467.2L631.3,472.7L633.6,476.1L634.6,479.2L632.5,478.1L629.8,478.0L628.7,476.7L627.5,477.9L626.7,476.9L628.4,472.2L627.2,471.5L626.8,472.2L623.9,471.5L623.5,470.1L621.4,469.6L619.8,467.2L617.1,466.9L615.4,468.0L615.3,469.1L613.0,469.0L608.4,473.8L607.4,468.8Z"],cx:637.5,cy:479.4},
{name:"Massachusetts",paths:["M660.0,421.9L660.7,421.8L661.5,423.3L661.4,427.8L663.0,427.5L666.0,431.0L668.2,431.2L670.2,429.6L670.1,431.0L667.2,433.3L666.0,433.7L665.0,433.1L662.9,435.3L659.5,431.0L644.5,435.1L644.3,428.4L658.0,424.5L660.0,421.9Z"],cx:660.3,cy:429.9},
{name:"Michigan",paths:["M574.5,455.1L564.7,457.1L564.6,456.5L550.0,458.5L552.7,453.3L553.2,448.6L552.7,445.7L549.8,440.4L550.2,438.1L549.4,435.6L550.6,432.8L550.3,429.5L551.4,428.8L551.3,427.2L553.0,426.5L554.1,424.6L554.5,428.1L555.2,428.2L555.9,426.3L555.5,423.3L557.7,421.7L556.8,419.7L557.8,417.8L559.3,417.4L562.9,418.2L563.9,419.4L568.3,420.1L569.8,421.9L569.0,423.2L570.8,426.1L571.0,429.7L569.8,430.9L569.7,432.8L568.2,433.7L567.6,436.1L568.1,436.9L569.9,437.4L572.1,433.2L574.3,431.8L576.6,433.6L579.8,441.8L579.7,445.4L578.6,446.2L578.4,444.9L577.6,445.4L577.3,448.5L576.0,449.8L576.0,452.2L574.5,455.1Z", "M554.0,418.6L554.3,419.8L553.4,420.1L553.5,418.4L554.0,418.6Z", "M540.6,426.7L539.4,425.8L539.9,424.3L538.2,424.3L538.6,421.2L536.1,419.0L532.3,418.8L522.1,416.3L521.2,414.7L519.9,414.2L529.0,409.2L534.0,404.1L535.5,404.6L532.7,409.0L533.0,410.8L534.1,409.3L536.4,409.2L538.3,410.0L540.2,412.5L541.2,412.9L542.8,412.2L545.0,412.9L548.3,410.1L555.5,408.2L556.2,410.9L558.8,410.4L559.4,411.0L562.1,409.4L562.7,412.8L563.8,414.1L565.2,414.3L565.1,413.3L566.4,413.1L567.3,414.0L566.8,414.8L561.3,415.5L559.2,414.6L559.3,416.6L556.9,415.4L553.5,415.1L552.6,416.5L548.9,417.1L548.2,418.8L546.2,420.0L546.1,418.7L545.2,418.5L545.0,419.9L542.8,420.8L540.6,426.7Z", "M529.3,399.5L526.9,401.1L526.9,400.1L530.8,397.4L529.3,399.5Z"],cx:564.2,cy:435.8},
{name:"Minnesota",paths:["M509.1,413.7L508.5,413.3L507.2,414.1L507.6,419.9L503.8,423.6L503.8,425.0L505.5,426.3L504.8,427.8L504.7,433.1L511.1,436.8L511.6,438.1L514.8,439.9L516.3,442.0L516.7,444.7L479.4,446.1L479.3,428.5L476.5,425.5L478.4,423.4L478.3,418.3L476.9,415.2L476.5,405.8L474.7,400.6L474.9,395.3L474.1,392.2L487.4,392.0L487.4,388.3L488.6,388.3L489.5,389.1L490.5,394.2L496.1,395.4L496.4,396.5L501.6,395.2L503.8,396.9L504.8,396.8L505.8,398.9L506.2,398.0L507.8,397.5L511.2,400.4L515.8,398.1L516.5,399.5L520.5,399.0L522.3,400.0L524.0,399.7L516.9,404.0L508.5,412.9L509.1,413.7Z"],cx:501.1,cy:411.2},
{name:"Mississippi",paths:["M545.1,526.5L547.3,526.2L548.2,527.2L548.4,557.4L550.7,572.7L546.8,572.7L541.1,575.6L537.8,570.9L538.4,567.5L522.0,568.8L522.6,568.0L521.8,566.1L522.9,565.9L522.8,562.2L523.6,562.4L524.0,560.1L525.9,558.5L526.7,556.1L526.3,553.1L525.0,552.0L525.5,549.4L524.6,548.4L525.2,546.9L524.6,544.9L525.2,544.0L523.7,542.8L526.1,537.9L525.6,536.9L527.1,534.5L528.5,533.8L528.2,531.9L530.7,528.7L530.1,527.9L545.1,526.5Z"],cx:532.7,cy:551.5},
{name:"Missouri",paths:["M514.1,473.3L514.9,473.2L517.4,475.4L516.8,476.8L518.2,481.8L523.4,486.0L524.2,489.2L524.8,489.8L525.6,488.8L528.5,489.7L527.1,496.1L530.6,499.1L531.4,498.8L534.1,500.7L535.1,504.0L534.5,504.7L536.5,507.4L537.8,507.4L537.5,511.4L536.3,511.1L536.0,512.4L535.0,512.5L535.3,514.9L534.0,517.6L528.8,518.0L531.0,514.8L530.2,512.9L494.6,514.9L493.8,488.6L492.2,488.2L489.9,484.9L491.6,482.0L489.1,481.3L484.8,474.7L514.1,473.3Z"],cx:518.4,cy:494.5},
{name:"Montana",paths:["M430.1,390.2L426.7,429.3L378.5,422.9L377.7,428.0L375.8,424.8L373.9,426.6L369.6,425.5L367.9,426.1L365.7,425.6L364.8,426.4L364.2,425.7L363.9,422.4L361.9,421.0L362.3,419.2L360.9,416.2L361.0,413.4L360.0,412.2L357.2,414.1L355.9,412.8L356.3,410.7L357.7,409.9L357.3,408.3L359.7,402.7L357.8,402.3L354.5,395.4L352.3,393.2L352.9,390.6L351.5,387.4L353.9,377.6L430.1,390.2Z"],cx:372.3,cy:411.7},
{name:"Nebraska",paths:["M430.1,449.2L464.8,451.0L468.7,453.3L469.6,452.4L474.0,452.6L477.8,454.4L478.2,455.8L479.6,456.1L480.9,460.5L481.9,461.1L482.2,465.4L483.5,466.2L484.3,470.9L483.9,473.4L488.3,480.4L437.4,479.4L438.0,469.5L423.2,468.4L424.9,448.8L430.1,449.2Z"],cx:466.1,cy:462.1},
{name:"Nevada",paths:["M330.7,442.7L351.9,447.7L339.8,503.7L338.6,505.2L337.1,503.7L334.2,503.4L333.4,513.1L332.6,514.3L301.4,465.3L309.7,437.0L330.7,442.7Z"],cx:327.6,cy:483.6},
{name:"New Hampshire",paths:["M651.3,399.8L658.2,417.7L660.9,419.8L660.7,421.8L658.0,424.5L649.9,426.8L648.7,424.9L649.2,424.2L647.9,418.7L648.8,413.3L648.0,411.0L650.0,409.4L650.5,407.4L649.4,406.1L649.6,400.7L651.3,399.8Z"],cx:652.5,cy:414.4},
{name:"New Jersey",paths:["M642.0,445.5L644.8,446.2L644.7,449.2L643.7,450.1L643.5,451.8L645.7,451.9L646.8,458.3L643.8,467.0L642.7,465.7L637.1,464.1L636.5,462.6L640.7,455.4L636.7,452.8L636.9,449.8L636.1,449.0L638.1,444.4L642.0,445.5Z"],cx:640.4,cy:455.1},
{name:"New Mexico",paths:["M393.2,504.9L428.0,508.5L423.7,558.3L393.5,555.3L393.2,556.3L394.0,557.5L379.7,555.7L379.1,560.2L371.9,559.2L380.5,503.1L393.2,504.9Z"],cx:402.9,cy:532.4},
{name:"New York",paths:["M637.3,407.2L638.1,411.0L639.2,412.5L639.4,416.5L640.7,419.8L642.2,421.0L644.3,428.4L644.5,435.1L646.4,442.6L647.2,443.3L645.7,444.8L646.6,445.7L649.8,445.6L654.1,443.3L655.8,441.1L656.3,442.2L657.6,442.3L650.6,448.3L645.8,450.5L644.7,449.2L644.8,446.2L637.6,443.8L636.5,444.1L634.8,442.8L634.6,441.4L631.7,439.7L600.5,447.4L600.0,444.8L605.3,438.4L602.7,434.2L606.5,432.2L611.6,431.3L613.5,431.9L619.0,429.4L620.5,427.2L621.7,426.8L621.3,422.5L619.5,421.9L619.5,420.6L621.8,418.3L624.8,412.6L627.4,410.1L637.3,407.2Z"],cx:631.5,cy:433.1},
{name:"North Carolina",paths:["M602.5,501.9L642.2,492.6L644.1,496.2L641.9,496.4L637.3,499.5L637.5,500.1L642.2,498.3L643.2,499.0L644.5,498.3L645.6,500.5L643.2,505.0L640.6,505.8L640.6,507.5L643.1,508.9L642.1,512.1L640.6,512.1L636.6,514.1L634.3,516.6L632.7,519.6L632.3,523.0L630.4,522.7L627.7,524.0L616.4,516.8L607.4,518.6L607.3,517.4L605.7,516.0L605.0,516.8L604.8,515.7L594.8,517.2L588.5,520.3L578.7,522.1L578.6,519.7L580.1,519.2L580.5,517.5L582.2,515.7L584.4,515.3L588.1,512.6L590.4,509.2L590.8,510.2L593.5,507.7L595.0,507.8L595.7,505.8L597.1,505.0L597.0,502.7L602.5,501.9Z"],cx:616.5,cy:509.4},
{name:"North Dakota",paths:["M474.1,392.2L474.9,395.3L474.7,400.6L476.5,405.8L476.9,415.2L478.3,418.3L478.5,422.3L427.5,420.1L430.1,390.2L474.1,392.2Z"],cx:467.2,cy:405.9},
{name:"Ohio",paths:["M595.2,448.7L597.9,461.7L596.9,462.4L597.9,464.9L597.4,471.1L595.1,474.8L594.3,475.4L593.3,474.9L592.7,476.5L591.9,476.6L591.1,480.8L589.7,479.5L588.5,485.6L586.5,486.1L584.3,484.9L583.7,483.3L582.0,484.9L579.0,484.7L577.9,485.6L576.0,484.5L573.6,484.5L571.4,481.9L568.5,482.3L564.7,457.1L574.5,455.1L578.6,456.6L579.2,455.7L582.2,457.3L585.3,455.4L587.3,455.3L591.9,450.7L595.2,448.7Z"],cx:585.9,cy:471.1},
{name:"Oklahoma",paths:["M451.1,509.8L494.4,510.0L496.4,525.9L496.5,543.4L490.3,540.4L489.8,541.3L487.1,540.7L485.2,541.7L482.6,541.7L481.0,543.3L478.6,541.7L476.8,541.7L476.2,540.5L474.1,542.8L473.4,541.5L472.4,541.9L469.8,540.3L468.3,541.6L467.7,540.2L466.5,540.0L465.8,538.9L464.3,538.5L463.2,539.4L462.5,538.5L457.4,537.8L456.9,535.8L453.3,535.9L450.9,534.0L451.6,514.7L427.7,513.4L428.0,508.5L451.1,509.8Z"],cx:469.2,cy:534.0},
{name:"Oregon",paths:["M300.6,391.0L302.3,392.6L301.9,396.8L304.9,398.9L308.2,398.4L312.0,399.9L312.0,400.6L316.0,400.4L318.8,401.4L327.5,401.2L341.1,404.9L341.6,406.7L343.0,407.8L343.3,409.2L335.1,419.5L335.2,421.0L336.5,421.4L336.9,422.4L335.2,425.3L330.7,442.7L280.5,427.4L279.9,426.0L281.3,420.8L280.9,418.8L286.7,410.8L292.3,398.9L294.8,391.4L295.7,390.0L298.7,389.5L299.5,390.9L300.6,391.0Z"],cx:311.2,cy:409.5},
{name:"Pennsylvania",paths:["M600.0,445.0L600.5,447.4L631.7,439.7L634.6,441.4L634.8,442.8L636.5,444.1L638.1,444.4L636.1,449.0L636.9,449.8L636.3,451.8L638.1,454.1L640.7,455.4L640.6,456.3L638.9,459.3L635.6,460.7L634.6,462.1L599.7,470.5L595.2,448.7L600.0,445.0Z"],cx:625.3,cy:450.9},
{name:"Rhode Island",paths:["M661.8,433.8L662.9,435.3L661.6,436.0L661.8,433.8Z", "M658.5,431.4L659.5,431.0L661.5,433.5L660.7,433.7L660.4,435.3L660.8,437.3L658.3,438.6L656.6,432.1L658.5,431.4Z"],cx:662.0,cy:434.7},
{name:"South Carolina",paths:["M591.1,519.2L594.8,517.2L604.8,515.7L605.0,516.8L605.7,516.0L607.3,517.4L607.4,518.6L616.4,516.8L627.7,524.0L625.0,526.8L622.9,533.8L621.1,534.2L618.5,538.8L616.9,539.8L612.3,546.1L610.2,545.6L609.8,543.9L606.7,541.1L605.3,537.5L602.8,536.4L601.0,534.8L600.9,533.7L594.8,529.9L591.1,525.1L590.2,525.4L587.2,523.8L588.5,520.3L591.1,519.2Z"],cx:606.6,cy:530.1},
{name:"South Dakota",paths:["M427.5,420.1L478.5,422.3L476.5,425.5L479.3,428.5L479.4,446.1L478.5,446.4L478.7,448.9L479.6,449.8L478.2,453.9L479.6,456.1L474.0,452.6L469.6,452.4L468.7,453.3L464.8,451.0L424.9,448.8L427.5,420.1Z"],cx:464.7,cy:443.1},
{name:"Tennessee",paths:["M546.8,511.3L546.5,509.5L597.0,502.7L597.1,505.0L595.7,505.8L595.0,507.8L593.5,507.7L590.8,510.2L590.4,509.2L588.1,512.6L584.4,515.3L582.2,515.7L580.5,517.5L580.1,519.2L578.6,519.7L578.7,522.1L530.1,527.9L531.6,525.8L531.2,523.4L532.6,521.6L532.7,520.1L533.9,519.4L535.3,514.9L535.0,512.5L546.8,511.3Z"],cx:562.3,cy:514.6},
{name:"Texas",paths:["M437.1,514.0L451.6,514.7L450.9,534.0L453.3,535.9L456.9,535.8L457.4,537.8L462.5,538.5L463.2,539.4L464.3,538.5L465.8,538.9L466.5,540.0L467.7,540.2L468.3,541.6L469.8,540.3L472.4,541.9L473.4,541.5L474.1,542.8L476.2,540.5L476.8,541.7L478.6,541.7L481.0,543.3L482.6,541.7L485.2,541.7L487.1,540.7L489.8,541.3L490.3,540.4L497.4,544.3L500.2,544.2L500.8,559.8L502.8,562.0L502.9,564.2L505.4,568.2L505.7,570.3L504.1,574.0L503.8,576.5L504.6,578.4L502.7,582.1L503.5,583.1L497.5,584.7L495.8,584.0L495.5,582.3L494.3,583.5L493.5,583.3L493.1,584.8L494.0,585.3L494.2,587.2L490.0,591.9L484.6,594.6L480.2,594.7L479.2,593.5L478.5,593.7L480.9,596.4L479.2,597.2L477.6,596.7L477.3,598.6L475.3,600.5L471.8,607.7L470.8,607.4L470.6,608.8L471.6,608.4L470.4,612.8L473.5,621.6L470.6,622.6L469.5,621.3L464.4,620.8L461.9,619.1L460.0,618.9L455.5,615.6L454.7,612.5L453.1,610.6L452.9,605.9L449.4,602.5L449.0,600.6L445.8,597.4L442.8,588.9L439.5,585.1L437.8,584.2L436.6,581.9L428.5,580.2L428.0,581.3L425.8,581.4L424.1,583.4L422.9,586.8L421.0,588.7L419.5,588.6L412.2,583.9L409.2,581.0L408.0,578.0L408.2,575.4L405.9,570.0L402.7,568.0L393.2,556.3L393.5,555.3L423.7,558.3L427.4,513.4L437.1,514.0Z"],cx:459.4,cy:572.8},
{name:"Utah",paths:["M365.4,450.5L373.4,451.9L371.7,461.6L386.4,464.0L380.5,503.1L341.5,495.9L351.9,447.7L365.4,450.5Z"],cx:371.1,cy:474.2},
{name:"Vermont",paths:["M649.4,403.4L649.4,406.1L650.5,407.4L650.0,409.4L648.0,411.0L648.8,413.3L647.9,418.7L649.2,424.2L648.7,424.9L649.9,426.8L644.3,428.4L642.2,421.0L640.7,419.8L639.4,416.5L639.2,412.5L638.1,411.0L637.3,407.2L649.4,403.4Z"],cx:645.5,cy:415.2},
{name:"Virginia",paths:["M642.0,477.6L643.1,477.1L641.7,479.9L641.0,486.3L639.9,487.3L639.0,483.0L640.1,478.8L642.0,477.6Z", "M616.4,469.4L621.0,471.7L621.4,469.6L622.5,469.5L623.9,471.5L626.8,472.2L627.7,473.5L626.4,477.3L627.0,478.2L628.9,477.4L629.7,478.8L632.5,478.8L636.0,480.5L635.7,483.5L637.2,485.3L636.6,487.8L637.7,488.3L637.0,489.8L635.0,488.7L634.7,489.3L636.4,490.0L640.3,489.3L642.2,492.6L581.3,505.4L585.3,503.3L585.6,502.1L587.0,501.5L587.9,499.0L592.9,493.9L594.3,496.2L595.8,496.7L598.0,494.9L599.3,495.7L601.1,494.8L605.9,491.6L605.5,489.8L608.5,482.3L608.6,480.0L611.5,481.2L612.9,476.4L614.0,477.0L616.6,472.3L616.4,469.4Z"],cx:641.1,cy:481.4},
{name:"Washington",paths:["M347.7,376.1L341.1,401.3L341.1,404.9L327.5,401.2L318.8,401.4L316.0,400.4L312.0,400.6L312.0,399.9L308.2,398.4L304.9,398.9L301.9,396.8L302.5,393.9L301.2,391.1L299.5,390.9L298.7,389.5L297.7,388.7L296.5,388.9L295.6,387.7L297.4,386.2L296.7,383.8L297.9,373.8L297.2,372.0L297.7,369.1L299.0,367.5L302.1,370.9L307.2,372.6L307.7,373.7L309.2,374.1L309.5,376.5L310.3,376.6L309.2,382.0L309.9,382.0L310.8,377.6L312.6,375.8L312.0,374.7L313.2,368.5L311.7,366.6L312.3,365.7L347.7,376.1Z", "M310.4,372.2L311.3,372.1L310.6,373.9L309.8,372.9L310.4,372.2Z", "M309.3,369.0L310.4,368.0L310.8,369.8L310.1,371.0L308.8,370.1L309.3,369.0Z"],cx:312.1,cy:384.5},
{name:"West Virginia",paths:["M597.9,461.7L599.7,470.5L607.4,468.8L608.4,473.8L610.8,470.6L611.9,470.7L613.0,469.0L615.3,469.1L615.4,468.0L617.1,466.9L619.8,467.2L621.4,469.6L621.0,471.7L616.4,469.4L616.6,472.3L614.0,477.0L612.9,476.4L611.5,481.2L608.6,480.0L608.5,482.3L605.5,489.8L605.9,491.6L601.1,494.8L599.3,495.7L598.0,494.9L595.8,496.7L594.3,496.2L592.9,493.9L590.2,493.1L588.1,490.8L586.9,489.1L586.5,486.1L588.5,485.6L589.7,479.5L591.1,480.8L591.9,476.6L592.7,476.5L593.3,474.9L594.3,475.4L595.1,474.8L597.4,471.1L597.9,464.9L596.9,462.4L597.9,461.7Z"],cx:602.0,cy:479.1},
{name:"Wisconsin",paths:["M519.9,414.2L521.2,414.7L522.1,416.3L532.3,418.8L536.1,419.0L538.6,421.2L538.2,424.3L539.9,424.3L539.4,425.8L540.6,426.7L540.5,427.9L539.2,428.2L538.0,432.2L538.9,432.4L540.7,429.2L542.1,428.3L542.9,425.7L544.3,425.0L542.0,431.9L542.0,435.8L540.9,438.6L541.4,440.5L540.4,444.9L542.0,449.4L542.0,452.2L521.6,454.1L521.0,452.9L518.3,451.9L517.2,448.2L518.0,447.0L516.9,446.1L516.3,442.0L514.8,439.9L511.6,438.1L511.1,436.8L504.7,433.1L504.8,427.8L505.5,426.3L503.8,425.0L503.8,423.6L507.6,419.9L507.2,414.1L508.5,413.3L510.6,413.7L516.8,410.6L517.4,411.3L516.6,412.6L519.9,414.2Z"],cx:525.1,cy:430.0},
{name:"Wyoming",paths:["M392.0,425.1L426.6,429.3L423.2,468.4L371.7,461.6L378.5,422.9L392.0,425.1Z"],cx:397.4,cy:445.0},
{name:"Quebec",paths:["M564.8,245.5L565.8,245.6L564.8,245.5Z", "M617.1,266.6L617.5,268.4L616.8,268.7L616.2,266.8L617.1,266.6Z", "M570.8,304.8L570.8,306.4L570.3,304.5L570.8,304.8Z", "M575.0,308.4L574.4,313.3L574.4,307.8L574.0,313.3L573.9,309.6L572.8,313.6L572.0,313.4L571.4,314.7L572.1,311.0L570.8,314.4L569.8,313.9L571.7,309.6L571.5,306.8L571.6,311.1L572.4,310.2L572.4,305.9L575.0,308.4Z", "M571.1,307.5L570.7,309.5L568.7,311.1L571.1,307.5Z", "M576.1,307.2L576.6,309.5L575.3,310.5L575.3,308.0L576.1,307.2Z", "M575.0,311.1L575.5,311.4L574.9,313.9L575.0,311.1Z", "M682.0,340.1L688.7,339.7L691.2,340.5L693.4,340.2L695.5,341.4L694.9,342.5L692.4,343.7L686.8,344.5L683.3,344.4L680.8,342.8L676.0,342.4L677.4,340.9L682.0,340.1Z", "M703.3,354.0L701.6,357.3L702.6,355.3L701.5,358.3L701.6,359.0L702.7,358.8L701.5,359.5L701.2,357.6L703.3,354.0Z", "M647.7,383.4L646.2,385.4L647.7,383.4Z", "M710.9,308.5L709.7,308.1L708.2,309.8L707.2,309.9L706.5,312.1L703.3,314.1L703.9,315.2L702.4,317.5L703.4,318.4L703.5,319.8L702.5,318.9L701.6,323.8L700.5,324.9L700.9,325.9L699.7,327.8L699.2,327.1L698.4,328.2L695.6,329.6L695.7,329.1L691.2,333.1L691.6,331.9L690.6,333.0L689.9,332.4L684.6,333.8L681.1,336.5L678.3,336.6L676.5,338.0L674.5,338.2L666.0,342.1L665.5,343.3L663.9,344.0L663.2,343.4L662.8,344.2L663.6,344.7L662.4,344.7L660.7,349.3L661.4,352.6L661.0,354.3L656.8,356.4L656.0,357.5L657.0,358.1L655.8,359.1L655.2,357.9L654.9,360.9L652.9,363.2L651.1,370.4L646.1,369.7L641.6,370.5L643.5,370.4L643.3,371.3L645.6,370.1L650.9,370.8L649.8,377.5L648.3,378.7L648.0,382.3L645.4,386.8L649.4,382.8L653.1,371.3L655.7,366.4L659.2,361.6L666.2,354.4L672.0,350.6L676.0,349.4L681.3,350.3L682.4,351.5L679.5,351.4L682.9,352.7L682.3,353.2L683.1,353.7L678.6,361.1L677.5,361.7L674.0,360.8L673.4,362.4L670.9,363.1L668.8,366.3L666.4,367.8L664.4,367.0L661.2,368.1L661.5,368.8L659.9,369.4L661.1,372.8L660.4,374.5L657.9,376.7L657.5,375.6L656.2,375.7L654.0,384.4L654.4,387.0L653.7,389.8L654.8,392.4L653.0,397.0L654.0,397.9L652.8,398.0L652.9,400.0L652.0,399.2L651.1,400.5L649.9,400.3L649.1,401.2L649.4,403.4L628.1,410.2L630.2,407.4L628.9,406.6L628.8,404.1L625.4,404.3L619.7,408.6L617.8,407.7L616.2,408.7L613.7,408.0L612.1,405.6L611.3,405.6L610.9,406.7L606.4,404.2L598.4,404.2L591.9,397.9L590.3,394.9L583.1,361.1L584.8,362.8L583.0,360.9L581.7,355.4L583.4,354.2L583.4,355.3L585.1,355.4L586.8,358.2L586.0,356.0L587.0,354.9L584.3,352.6L585.4,351.7L584.8,350.8L586.1,349.3L586.1,347.5L587.0,347.3L586.1,347.1L585.6,344.8L584.2,344.6L583.2,342.8L583.9,341.5L583.0,341.7L583.2,340.7L581.9,340.5L581.9,338.0L580.1,336.0L581.1,335.2L579.4,334.1L580.0,333.7L579.7,332.7L580.6,332.7L579.0,331.7L579.7,330.9L577.8,330.6L579.0,329.4L577.1,329.7L577.5,329.0L576.4,328.7L575.0,326.5L575.4,326.0L573.9,325.6L577.9,322.9L583.6,317.0L587.8,308.0L587.6,304.4L585.8,297.7L582.9,292.6L580.3,289.6L572.4,285.3L573.0,286.0L571.6,285.6L571.9,284.6L570.8,282.2L572.0,282.4L572.6,279.1L574.2,276.8L573.0,276.9L573.7,275.4L573.0,273.8L575.6,274.7L574.2,273.8L575.2,272.4L574.2,271.4L575.0,269.4L577.0,269.1L576.9,268.1L574.7,268.8L575.3,269.1L574.5,269.2L574.5,270.1L572.8,270.2L573.8,269.2L571.4,266.7L572.7,265.2L570.4,264.7L571.5,262.4L569.9,263.7L569.7,262.9L568.4,263.7L569.8,259.0L568.7,256.6L569.7,256.2L569.2,255.3L570.0,255.3L567.0,254.0L565.0,248.8L565.3,247.5L567.6,244.8L576.9,245.9L575.8,247.3L578.0,245.0L582.1,246.1L581.0,244.9L582.4,244.4L585.1,241.2L589.5,243.7L591.0,243.3L591.1,246.3L591.5,245.7L592.1,246.3L591.7,245.0L593.7,245.2L594.0,246.3L595.3,246.7L594.2,248.2L595.6,247.4L595.3,246.3L597.5,246.7L596.4,247.9L597.1,248.4L596.5,248.9L598.0,248.7L597.0,249.4L598.9,251.1L599.1,250.3L600.0,251.2L600.5,250.4L604.2,250.9L605.8,249.5L606.5,251.5L607.8,251.8L608.2,250.5L608.8,250.7L608.2,249.0L608.8,248.6L610.4,250.9L609.2,252.7L609.8,253.6L609.2,254.4L611.7,258.4L610.7,258.9L611.2,259.5L605.0,260.8L607.5,261.0L611.6,259.6L611.6,260.3L612.7,260.3L612.8,262.0L613.6,262.2L613.0,264.0L614.0,265.1L613.6,265.8L616.1,264.9L616.4,265.7L615.2,266.9L616.4,267.3L616.2,268.1L615.7,267.8L616.4,270.3L615.8,270.7L614.0,268.6L615.1,270.6L614.4,270.3L613.0,271.9L614.6,271.3L615.8,272.9L616.2,271.0L618.1,268.7L619.8,267.9L622.3,268.5L623.6,270.8L624.0,270.4L624.4,275.6L622.2,277.3L620.8,279.9L624.7,275.5L624.8,269.7L626.4,271.9L625.9,274.7L626.7,272.7L626.5,270.3L628.6,275.3L628.4,271.6L630.1,270.1L630.2,268.4L631.0,268.9L631.9,267.9L631.4,264.5L631.9,264.1L634.8,265.5L635.2,268.4L635.4,265.6L633.3,264.2L633.4,263.3L634.5,262.9L633.4,262.8L633.5,261.6L634.8,262.0L633.9,261.2L635.4,261.1L634.8,260.6L636.1,260.2L634.4,260.6L633.8,260.0L633.2,258.9L634.2,259.4L634.4,258.5L633.6,257.5L635.0,258.1L633.3,256.4L636.4,256.4L633.8,256.0L632.3,254.1L632.9,252.7L634.8,252.8L633.2,252.1L633.8,251.3L633.1,250.4L633.6,248.4L633.0,248.1L633.2,246.9L634.8,246.8L633.5,247.8L635.3,248.7L634.1,249.9L635.7,250.5L635.4,251.9L636.5,254.6L637.4,255.2L638.9,254.0L638.4,254.9L639.2,257.1L641.1,258.3L640.6,258.9L638.8,258.7L638.6,260.3L641.6,259.6L642.8,260.5L644.2,258.5L646.1,259.1L643.6,261.0L644.0,262.2L644.9,261.7L645.6,262.4L644.4,264.2L644.1,267.2L645.4,267.2L647.2,269.4L647.8,268.8L649.4,269.6L649.7,268.7L650.3,273.8L651.0,273.6L651.8,277.1L651.1,279.3L653.5,281.2L652.1,281.9L652.7,283.0L654.4,283.2L654.2,284.8L654.9,284.0L655.5,284.6L657.4,284.0L656.4,285.3L656.7,286.1L659.1,287.9L660.9,287.8L661.9,289.3L660.4,291.8L660.6,293.1L661.7,293.5L661.9,297.4L660.2,298.0L657.9,297.6L650.8,301.0L649.2,299.6L646.9,299.6L642.7,297.6L645.7,302.3L645.4,302.9L643.8,302.9L641.1,301.1L640.3,301.4L642.9,304.7L644.0,304.8L643.0,306.4L641.2,306.4L643.0,309.3L642.0,311.5L644.9,313.4L645.2,315.1L647.3,315.0L648.3,316.3L649.3,316.3L650.8,322.6L651.9,322.4L651.7,321.7L652.3,322.3L652.9,321.4L652.2,319.4L652.8,318.2L653.8,318.4L655.8,323.7L655.4,324.8L656.9,326.1L656.6,324.4L658.5,325.6L660.3,325.7L660.3,325.0L661.6,325.2L661.6,323.4L663.7,323.0L667.9,324.8L667.5,325.9L669.0,327.3L670.1,324.9L668.8,323.0L668.6,321.3L669.3,320.8L666.2,314.6L667.3,313.9L666.7,311.9L667.8,311.0L669.2,312.0L669.7,313.9L671.4,314.5L669.0,315.9L668.2,317.8L669.3,317.9L668.9,318.4L669.8,319.3L672.0,319.9L672.4,320.6L671.2,320.8L671.9,321.2L708.2,303.4L710.9,308.5Z"],cx:565.0,cy:245.6},
{name:"Newfoundland and Labrador",paths:["M707.5,287.0L708.4,286.9L708.3,287.6L707.2,287.6L707.5,287.0Z", "M722.8,309.0L722.1,310.1L722.8,309.0Z", "M735.5,313.5L736.5,313.9L735.2,315.5L734.5,314.3L735.2,314.4L735.5,313.5Z", "M733.6,315.8L732.4,318.2L731.8,317.4L732.9,317.3L733.6,315.8Z", "M746.2,324.8L746.9,325.5L746.4,326.1L744.2,326.2L746.2,324.8Z", "M735.3,337.0L735.9,337.4L734.4,337.9L735.3,337.0Z", "M745.8,331.4L746.3,333.8L745.6,334.2L745.8,331.4Z", "M634.1,246.5L632.7,246.1L633.6,245.3L634.5,246.2L634.9,245.7L635.4,246.8L634.1,246.5Z", "M634.8,246.8L635.7,247.1L634.5,247.1L634.0,247.9L634.9,247.2L635.2,248.1L635.7,247.3L636.1,247.8L634.7,250.4L636.3,248.2L636.6,249.2L635.7,249.7L636.8,249.6L636.6,250.6L637.5,249.1L636.8,248.7L637.6,248.7L637.3,249.7L638.0,249.7L637.8,250.3L638.3,249.8L638.3,251.4L640.3,251.6L639.9,253.3L640.0,252.0L640.8,252.0L640.6,253.1L640.9,252.3L641.8,252.5L641.8,253.6L640.7,254.4L642.4,253.9L642.5,255.2L643.3,253.7L643.6,255.1L644.3,253.9L644.8,255.5L642.3,257.8L642.8,257.1L643.4,258.0L643.1,257.3L644.7,256.6L645.1,255.6L646.5,255.5L645.6,256.2L646.9,256.8L646.4,257.8L647.8,256.8L648.6,257.5L648.3,258.5L649.2,258.1L648.6,260.7L647.0,261.7L647.9,261.5L647.4,263.5L648.3,261.3L649.1,260.9L649.2,261.8L649.4,260.9L651.6,259.6L652.0,261.3L651.1,262.8L652.0,261.7L652.6,262.0L650.5,263.7L649.9,265.9L653.4,262.1L653.6,263.3L654.1,262.5L654.7,263.1L653.4,264.9L654.2,264.0L654.9,264.9L654.8,263.7L655.1,264.3L655.8,263.3L656.6,264.8L658.4,265.7L657.0,268.4L655.8,268.5L657.0,268.8L659.4,267.8L660.0,268.1L659.4,268.3L660.0,268.9L659.5,269.6L661.0,270.0L661.4,268.9L661.4,269.7L663.4,269.5L664.0,270.7L663.2,270.8L663.1,272.8L661.9,273.5L662.4,274.3L663.2,273.6L662.7,274.1L663.7,274.6L659.0,275.0L661.0,273.4L658.5,275.0L662.6,275.1L661.1,275.9L664.3,275.2L662.2,277.2L665.7,277.3L663.2,278.5L664.3,278.8L667.1,277.3L667.3,279.1L668.5,278.7L667.3,279.6L669.4,279.1L669.9,279.6L669.3,280.0L670.0,280.1L671.7,279.2L671.4,280.8L672.7,279.2L673.4,281.6L673.2,279.0L674.1,278.8L674.0,280.9L674.7,280.6L674.8,281.6L675.0,280.6L675.4,281.0L675.3,283.0L675.7,281.1L676.4,281.7L675.4,285.0L676.4,283.6L675.8,286.7L677.2,282.8L677.5,283.7L678.0,282.6L677.7,285.5L679.0,281.4L679.8,282.5L679.0,283.9L680.6,282.9L680.9,281.8L681.6,282.2L680.7,287.0L682.5,280.7L682.6,283.6L683.6,281.0L685.5,283.5L688.6,283.1L689.4,282.1L691.4,281.6L694.7,281.7L694.9,282.4L693.4,283.6L695.0,283.0L694.1,284.3L691.7,285.7L691.7,286.9L689.7,289.2L685.7,292.3L687.4,291.8L691.1,287.5L690.8,289.8L688.6,291.1L689.3,290.9L687.3,293.9L684.0,296.2L685.0,296.5L685.1,298.4L679.9,297.6L680.2,298.8L682.3,298.1L685.7,298.4L686.0,298.9L684.4,300.5L685.7,300.1L684.9,301.4L686.4,300.6L685.9,300.2L687.2,297.9L686.4,297.7L687.9,297.0L688.8,294.8L690.0,294.2L690.0,291.3L693.0,288.0L694.9,287.3L692.0,288.6L691.3,287.9L692.1,286.9L696.2,285.3L699.7,287.5L698.3,290.8L699.6,290.3L700.0,291.7L700.5,288.3L702.7,287.1L703.0,286.1L703.6,286.6L702.2,287.8L706.3,286.7L706.7,287.3L705.2,287.7L709.3,288.7L709.5,291.1L708.2,291.8L709.9,291.5L711.0,292.4L709.4,293.8L712.3,293.9L712.3,294.5L710.3,294.9L711.2,294.8L711.4,295.5L708.6,296.5L713.8,295.4L713.6,296.7L710.9,297.0L714.2,296.8L714.0,297.5L715.0,297.2L714.2,297.7L715.2,298.4L714.2,299.9L714.8,300.5L714.0,302.6L712.1,305.3L711.8,307.9L710.9,308.5L708.2,303.4L671.9,321.2L671.2,320.8L672.4,320.6L672.0,319.9L669.8,319.3L668.9,318.4L669.3,317.9L668.2,317.8L669.0,315.9L671.4,314.5L669.7,313.9L669.2,312.0L667.8,311.0L666.7,311.9L667.3,313.9L666.2,314.6L669.3,320.8L668.6,321.3L668.8,323.0L670.1,324.9L669.0,327.3L667.5,325.9L667.9,324.8L663.7,323.0L661.6,323.4L661.6,325.2L660.3,325.0L660.3,325.7L658.5,325.6L656.6,324.4L656.9,326.1L656.1,325.7L654.3,321.1L654.6,319.2L653.8,318.4L652.8,318.2L652.2,319.4L652.9,321.4L652.3,322.3L651.7,321.7L651.9,322.4L650.8,322.6L649.3,316.3L648.3,316.3L647.3,315.0L645.2,315.1L644.9,313.4L642.0,311.5L643.0,309.3L641.2,306.4L643.0,306.4L644.0,304.8L642.9,304.7L640.3,301.4L641.1,301.1L643.8,302.9L645.4,302.9L645.7,302.3L642.7,297.6L646.9,299.6L649.2,299.6L650.8,301.0L657.9,297.6L660.2,298.0L661.9,297.4L661.7,293.5L660.6,293.1L660.4,291.8L661.9,289.3L660.9,287.8L659.1,287.9L656.7,286.1L656.4,285.3L657.4,284.0L655.5,284.6L654.9,284.0L654.2,284.8L654.4,283.2L652.7,283.0L652.1,281.9L653.5,281.2L651.1,279.3L651.8,277.1L651.0,273.6L650.3,273.8L649.7,268.7L649.4,269.6L647.8,268.8L647.2,269.4L645.4,267.2L644.1,267.2L644.4,264.2L645.6,262.4L644.9,261.7L644.0,262.2L643.6,261.0L646.1,259.1L644.2,258.5L642.8,260.5L641.6,259.6L638.6,260.3L638.8,258.7L640.6,258.9L641.1,258.3L639.2,257.1L638.4,254.9L638.9,254.0L637.4,255.2L636.5,254.6L635.4,251.9L635.7,250.5L634.1,249.9L635.3,248.7L633.5,247.8L634.8,246.8Z", "M638.9,250.1L639.7,250.8L638.6,251.5L638.9,250.1Z", "M657.4,263.7L657.5,264.5L656.5,264.5L656.7,263.5L657.4,263.7Z", "M659.0,264.0L659.0,264.6L657.9,264.7L658.1,263.6L659.0,264.0Z", "M659.0,267.5L658.2,266.5L659.3,266.3L659.0,267.5Z", "M660.1,266.2L659.6,267.5L660.6,267.4L659.2,267.6L660.1,266.2Z", "M664.1,271.1L663.6,273.0L664.6,272.4L665.2,273.8L663.5,273.4L663.0,272.2L663.2,271.2L664.1,271.1Z", "M664.7,274.8L667.2,274.9L664.7,275.8L665.7,275.1L664.5,275.4L664.7,274.8Z", "M665.4,276.3L666.4,276.6L664.1,276.7L665.4,276.3Z", "M668.7,277.2L670.1,278.2L668.5,278.6L668.7,277.2Z", "M671.4,278.5L670.9,279.4L670.7,278.6L671.4,278.5Z", "M690.2,280.3L690.5,281.4L691.1,281.0L689.9,282.2L689.1,281.8L690.2,280.3Z", "M720.2,309.6L719.7,311.5L718.6,310.2L720.0,312.1L719.7,315.4L719.1,315.6L719.9,316.4L719.9,322.3L720.7,322.1L721.1,323.9L722.3,316.4L723.0,316.9L723.0,318.6L723.8,316.9L725.5,317.2L726.9,316.0L724.9,319.5L724.8,321.5L726.1,319.5L726.4,320.5L725.8,322.7L727.0,320.9L728.6,321.6L728.8,320.3L729.2,321.5L729.6,319.6L729.7,320.5L730.2,319.9L729.9,321.1L730.5,320.3L730.9,321.1L730.9,320.1L729.8,319.2L730.7,318.6L731.8,323.6L732.5,322.3L732.1,322.8L731.6,322.1L732.4,320.5L731.9,320.0L732.8,321.0L733.0,318.8L733.8,319.9L734.5,316.3L735.7,318.9L735.6,317.0L736.6,317.2L737.0,315.6L741.4,315.6L741.8,317.8L740.4,318.7L741.2,318.5L740.4,319.3L741.1,319.5L739.7,321.7L740.7,321.0L740.9,321.5L741.5,320.3L741.6,321.4L740.9,321.7L742.0,322.4L742.5,321.5L741.8,322.0L741.9,321.0L743.0,321.5L743.5,320.8L742.3,323.2L743.5,322.2L743.6,322.8L741.9,325.2L743.2,323.4L743.8,324.2L744.0,322.2L744.1,323.4L744.4,322.1L744.9,323.2L744.8,320.7L746.3,321.0L746.4,318.9L747.4,319.4L747.5,322.3L746.4,322.5L746.8,323.5L745.8,325.4L743.9,325.8L744.8,326.9L746.3,326.2L745.1,327.5L746.7,326.2L747.0,327.7L746.4,328.0L747.1,328.2L747.1,329.2L745.9,329.0L748.0,330.4L748.3,329.5L749.0,330.8L749.6,330.3L748.7,325.5L749.8,324.3L749.9,322.8L750.8,323.1L750.9,328.7L752.7,329.9L753.2,327.9L752.6,325.4L755.1,327.4L755.4,331.9L756.2,332.2L756.8,336.2L756.2,336.7L755.3,336.1L754.9,336.9L754.7,336.4L753.7,338.0L753.2,335.4L752.8,336.9L752.8,335.1L751.9,335.3L752.0,333.6L751.2,333.1L750.8,337.4L749.5,338.5L748.5,334.5L749.0,334.2L748.2,333.7L748.7,332.1L747.9,332.3L745.6,329.5L743.7,329.6L744.6,330.5L744.6,333.7L745.2,333.9L744.4,335.4L744.3,332.7L744.2,335.2L742.9,335.6L743.1,338.3L742.4,338.8L743.2,339.3L743.0,340.2L742.5,339.8L743.0,341.1L742.4,342.2L741.2,342.0L740.4,343.5L738.5,343.4L738.6,342.0L740.5,340.2L740.6,336.6L742.4,333.1L740.6,335.0L740.5,332.9L740.5,335.2L740.0,334.5L738.0,335.1L739.2,336.9L738.6,338.3L737.7,337.2L736.5,339.1L736.8,337.2L735.3,339.4L737.0,336.1L735.5,337.2L734.8,334.1L735.2,335.8L734.5,337.3L733.3,336.4L734.2,338.2L733.4,338.7L732.8,337.7L733.2,339.0L730.8,340.1L731.1,341.1L728.3,341.4L724.9,343.4L723.9,343.1L721.4,345.0L721.4,343.8L721.0,345.3L717.3,348.1L715.9,348.2L714.1,345.9L716.4,338.8L717.9,337.1L715.3,338.0L712.5,340.5L712.3,339.9L713.8,336.4L713.5,338.4L715.1,338.0L714.5,331.9L714.9,332.7L717.9,331.9L717.2,332.3L715.8,331.5L717.2,330.1L716.0,331.1L716.5,329.8L715.0,330.6L714.2,329.4L714.6,327.3L715.9,328.0L715.7,327.3L716.8,327.2L715.5,327.2L714.4,326.1L713.3,316.4L714.4,315.6L712.7,315.6L714.3,312.3L712.9,311.9L713.9,311.4L713.3,311.3L714.0,310.0L713.6,307.9L716.4,303.0L717.2,304.2L718.6,303.6L717.6,303.2L718.0,302.4L719.3,302.1L719.6,304.9L716.6,305.9L718.3,307.4L718.6,306.3L719.6,306.4L720.2,309.6Z"],cx:707.9,cy:287.2},
{name:"British Columbia",paths:["M275.2,317.8L275.6,318.7L274.9,318.6L274.6,319.9L275.2,317.8Z", "M291.6,294.1L289.4,295.8L289.3,295.2L291.6,294.1Z", "M289.2,295.4L288.9,296.2L288.3,295.4L289.2,295.4Z", "M287.0,296.4L285.2,297.3L286.1,295.9L287.0,296.4Z", "M271.5,300.3L271.1,298.0L273.0,294.7L275.3,296.4L274.1,297.8L276.1,297.0L277.0,298.5L275.7,300.3L273.0,300.1L273.1,300.8L274.6,301.0L273.5,301.6L275.7,301.2L277.0,299.7L277.1,298.1L278.1,298.8L280.3,298.3L274.8,305.7L273.1,305.3L273.8,305.8L273.3,306.0L271.6,305.2L271.0,303.8L272.1,303.7L270.9,303.1L271.5,302.7L272.9,303.9L272.2,301.8L271.0,301.5L270.8,300.1L271.5,300.3Z", "M286.9,302.3L287.1,303.5L286.0,304.4L285.3,303.7L286.6,302.9L285.5,303.5L284.8,302.5L284.6,303.6L284.1,303.3L284.9,302.2L286.9,302.3Z", "M288.3,311.8L287.7,311.9L287.1,309.8L287.4,307.5L286.6,307.2L287.7,307.3L286.3,305.7L287.1,304.0L289.0,309.4L288.4,309.3L289.3,310.2L288.3,311.8Z", "M286.2,304.9L286.3,307.4L285.0,305.6L286.2,304.9Z", "M293.6,309.2L290.6,311.3L291.6,309.0L293.6,309.2Z", "M284.8,306.3L286.6,309.1L286.6,311.8L285.5,311.5L284.4,308.6L284.7,307.3L283.8,306.5L284.8,306.3Z", "M292.1,310.4L291.7,312.3L290.5,312.0L292.1,310.4Z", "M290.2,312.1L289.7,313.8L288.8,313.7L289.7,311.5L290.2,312.1Z", "M290.9,319.2L289.8,319.4L291.7,316.2L290.0,318.8L289.2,318.6L288.7,317.0L288.8,316.1L289.3,316.5L291.0,315.2L290.4,313.8L290.9,315.2L288.8,315.5L290.6,312.3L292.7,314.7L290.9,319.2Z", "M275.5,317.2L274.4,317.8L274.4,316.5L274.0,317.6L273.3,315.1L273.8,314.4L272.1,310.1L272.9,310.6L273.0,310.0L272.6,309.0L271.9,309.8L271.5,307.5L272.4,308.1L273.0,307.6L271.2,306.4L271.2,305.2L273.9,306.3L275.8,306.1L276.0,308.6L273.9,307.4L274.0,308.2L275.6,308.7L275.4,309.5L273.2,309.0L274.7,310.6L273.3,310.9L273.9,311.3L273.6,312.9L274.5,313.7L274.2,315.2L275.5,314.8L274.3,316.0L275.5,316.2L274.9,316.9L275.5,317.2Z", "M288.1,312.4L288.3,314.7L287.5,312.7L288.1,312.4Z", "M292.2,317.5L291.3,319.5L292.2,317.5Z", "M293.8,318.7L292.4,320.5L292.8,318.7L293.8,318.7Z", "M288.0,316.3L288.9,318.9L288.2,320.1L287.4,317.1L288.0,316.3Z", "M292.6,318.5L292.0,321.5L290.6,322.2L292.6,318.5Z", "M275.4,311.6L274.2,312.7L274.0,311.3L275.4,311.6Z", "M291.2,319.4L290.7,321.5L289.2,320.0L291.2,319.4Z", "M290.0,321.1L289.0,322.6L289.2,320.7L290.0,321.1Z", "M294.6,326.1L293.3,327.4L292.2,327.4L293.7,325.0L297.6,324.5L297.2,325.5L294.6,326.1Z", "M292.7,322.6L292.6,323.4L291.6,323.5L292.7,322.6Z", "M293.0,324.0L292.8,325.2L291.7,323.9L293.0,324.0Z", "M291.6,324.6L290.4,325.8L290.5,324.8L291.6,324.6Z", "M292.2,325.0L293.0,325.3L292.2,326.0L291.5,325.4L292.2,325.0Z", "M292.2,326.3L290.8,328.6L290.0,328.6L290.4,327.6L289.8,327.2L291.1,325.9L292.2,326.3Z", "M290.7,329.2L290.0,332.2L289.4,329.9L290.7,329.2Z", "M288.9,348.3L288.6,347.0L290.1,345.7L289.0,345.2L288.0,346.1L288.3,344.5L285.8,344.6L285.3,344.0L286.7,343.2L285.7,341.8L286.5,340.8L288.5,341.4L288.9,342.7L288.7,341.2L289.9,340.8L287.3,339.4L288.6,340.9L285.7,340.6L284.8,336.8L288.1,337.1L292.9,342.7L300.5,347.9L300.2,349.7L301.8,354.6L301.0,354.8L301.5,357.1L305.7,361.1L306.3,363.3L305.7,363.5L306.7,365.5L306.0,366.2L306.0,368.4L307.3,367.3L307.4,369.7L306.8,370.1L306.3,369.4L305.0,370.5L297.0,363.1L296.8,362.3L299.6,361.1L300.6,359.1L299.2,361.1L297.0,360.8L296.7,359.8L295.4,360.6L293.6,358.1L295.7,357.6L294.6,357.9L295.2,355.8L293.5,356.7L294.7,354.9L293.7,355.7L293.8,354.4L292.6,354.0L292.1,354.7L291.7,353.4L291.1,354.1L290.6,353.6L291.2,352.0L294.3,352.2L292.3,351.6L292.6,350.4L291.6,350.9L291.9,349.0L291.0,347.9L290.7,348.6L290.5,347.7L290.0,348.6L288.9,348.3Z", "M294.1,340.6L293.7,339.9L295.6,340.8L294.1,340.6Z", "M297.5,341.4L296.8,342.8L294.8,342.0L297.5,341.4Z", "M295.9,343.9L294.3,343.2L296.5,343.3L295.9,343.9Z", "M301.4,346.7L301.0,347.4L300.1,347.0L301.4,346.7Z", "M301.8,347.1L302.5,349.5L301.6,350.2L301.8,348.3L300.7,348.1L301.8,347.1Z", "M303.6,349.2L303.5,351.0L303.0,349.6L303.6,349.2Z", "M300.8,348.5L301.5,348.4L301.7,349.3L300.9,351.5L300.8,348.5Z", "M302.9,349.6L302.9,351.3L302.1,351.6L302.0,350.5L302.9,349.6Z", "M291.1,348.8L290.9,351.7L289.4,349.6L290.2,349.6L289.7,348.8L291.1,348.8Z", "M305.6,358.2L304.0,356.5L303.4,354.3L304.9,355.9L305.6,358.2Z", "M293.2,354.8L293.1,356.2L292.2,355.5L293.2,354.8Z", "M307.0,362.9L308.5,365.8L307.0,362.9Z", "M307.0,364.6L307.8,366.7L306.7,366.7L307.0,364.6Z", "M347.7,376.1L312.3,365.7L311.7,364.6L310.6,365.1L310.1,364.3L311.0,363.7L309.9,363.6L310.6,363.1L310.1,362.1L312.2,362.6L313.1,361.4L312.1,362.4L310.2,361.5L312.0,358.3L309.4,359.4L308.7,360.5L306.9,358.9L306.4,357.1L307.5,356.3L307.7,358.9L308.1,358.0L309.8,357.5L308.0,357.6L307.6,356.1L308.1,354.1L309.8,353.5L309.5,352.8L308.7,351.8L309.4,353.3L308.0,353.7L307.8,355.6L307.5,354.4L306.8,355.5L305.5,355.6L303.4,352.6L303.2,351.5L303.8,352.5L305.2,350.3L304.8,349.3L307.5,348.4L304.0,349.2L303.5,347.7L302.6,348.5L303.3,347.1L304.8,346.5L306.0,343.3L304.8,344.3L304.7,346.1L302.4,347.5L301.7,345.9L300.2,346.2L301.9,344.1L299.3,346.2L299.0,345.0L298.0,345.3L296.2,344.2L298.6,343.8L296.7,343.0L300.2,343.9L302.2,342.0L302.0,340.2L302.0,341.9L300.9,343.0L298.8,343.3L297.2,342.9L298.7,342.1L297.7,341.9L298.1,341.1L295.8,340.6L296.4,339.9L298.3,340.5L296.7,339.7L296.8,338.5L295.3,340.0L292.5,338.3L293.8,339.3L293.0,339.6L291.2,337.8L291.2,336.0L294.9,337.7L295.4,338.7L296.3,337.4L292.8,337.0L289.8,334.7L290.3,334.0L294.1,334.8L294.5,334.2L293.2,334.6L290.5,333.2L293.1,331.3L298.0,332.8L298.6,332.4L298.6,331.5L297.9,332.6L293.8,330.9L294.9,329.3L293.6,330.5L292.6,330.2L293.6,330.9L291.8,332.4L291.2,329.8L292.1,327.8L293.4,327.8L294.6,326.4L295.2,326.8L294.0,327.2L295.4,327.1L295.5,326.2L297.5,325.6L298.5,326.0L299.2,329.7L298.8,326.2L300.2,325.9L298.1,325.6L297.7,324.9L297.9,323.6L300.4,322.4L300.2,320.6L300.1,322.2L295.0,324.8L294.2,324.6L294.5,324.0L293.3,325.0L294.4,322.2L293.1,323.7L292.9,322.8L294.6,321.6L291.0,323.4L290.6,323.0L292.2,321.9L294.3,318.2L295.0,318.2L294.4,317.8L293.4,318.7L292.4,318.1L293.4,315.0L291.8,312.9L292.7,311.2L292.1,311.2L292.2,310.2L293.3,310.4L294.1,313.2L295.3,312.3L296.4,313.0L297.1,315.5L296.7,312.7L294.3,312.3L293.4,309.9L294.3,308.4L296.0,308.7L295.1,307.7L296.0,306.6L293.3,308.2L293.4,307.0L293.2,308.1L292.8,307.6L291.1,308.9L289.7,311.0L287.7,304.0L288.8,302.2L289.8,304.8L289.6,302.2L292.2,302.8L288.4,302.0L287.8,301.2L288.7,299.5L287.9,299.9L287.4,299.3L288.8,297.0L290.0,300.8L289.6,299.8L290.6,299.1L289.5,299.5L289.2,296.8L290.4,296.9L291.5,298.4L290.3,296.6L291.7,295.5L290.9,295.6L292.1,294.9L294.4,295.5L292.5,294.4L296.0,291.5L297.1,291.5L295.6,291.5L295.9,289.3L295.0,291.9L291.8,294.4L293.9,292.2L294.6,287.3L296.0,286.3L296.5,284.2L294.8,283.4L294.0,280.4L292.7,279.5L291.0,276.4L289.7,275.9L290.3,274.0L289.4,272.8L290.5,271.4L289.2,270.2L290.3,269.4L289.4,257.0L289.9,255.3L289.2,251.9L287.8,249.8L288.1,246.8L286.5,244.3L286.5,242.6L287.6,241.6L286.6,238.4L281.7,238.1L281.8,239.0L280.5,239.0L278.5,241.4L277.5,240.8L273.2,241.5L274.3,238.2L272.0,228.1L360.3,266.1L342.7,325.5L343.7,327.6L342.5,327.5L342.4,328.4L343.0,329.9L344.9,330.8L345.2,332.5L346.3,333.5L346.9,332.6L347.9,334.0L348.0,336.5L348.8,336.6L349.2,338.3L349.0,342.1L350.5,341.3L351.8,342.5L351.2,344.4L352.0,345.3L353.8,345.3L355.0,350.4L356.7,350.0L357.9,355.1L361.0,359.4L360.6,360.5L362.1,362.1L362.5,364.0L363.8,364.0L364.9,369.4L364.3,372.7L363.4,373.7L364.3,374.4L363.9,376.0L364.8,378.1L366.6,380.2L347.7,376.1Z"],cx:274.9,cy:318.9},
{name:"Nunavut",paths:["M443.3,73.0L444.7,75.7L444.0,77.8L442.6,77.3L443.3,73.0Z", "M442.6,80.2L443.1,80.8L441.8,82.3L442.1,80.1L442.6,80.2Z", "M443.1,100.7L442.6,101.2L443.9,103.0L442.3,105.7L444.2,105.7L444.7,106.6L443.2,109.0L444.2,107.9L446.2,108.0L446.4,111.0L446.5,109.6L447.4,109.3L446.6,108.8L446.8,107.5L447.8,106.2L450.3,107.7L450.8,109.3L450.8,111.4L449.5,113.2L448.2,118.3L444.3,119.5L443.0,118.7L442.9,117.1L442.1,119.0L440.8,119.1L439.6,117.0L437.6,118.8L435.6,119.2L437.0,111.0L440.1,112.2L440.6,110.6L440.7,109.7L437.7,107.0L440.0,105.4L439.6,103.6L438.4,102.8L438.8,99.8L439.6,99.6L441.4,96.3L443.0,95.8L443.6,97.5L442.7,98.4L443.1,100.7Z", "M431.1,146.5L431.9,146.7L431.2,145.9L432.0,146.0L431.6,143.4L432.2,144.1L432.5,143.4L431.7,143.0L432.1,140.5L435.2,144.5L434.7,145.6L435.3,145.2L436.0,146.0L435.7,150.6L436.0,153.1L436.6,152.9L436.0,155.5L437.7,156.8L437.6,155.6L439.6,155.0L438.9,154.1L439.7,153.9L438.6,152.5L438.2,149.2L438.7,147.4L438.1,146.7L438.1,139.5L438.6,138.8L439.6,139.1L438.9,137.6L439.2,137.1L440.6,137.8L442.2,139.6L442.3,138.4L443.1,138.1L444.8,141.0L446.0,141.4L447.4,145.2L446.8,144.7L448.2,155.5L449.5,158.7L449.5,161.2L448.8,161.1L448.0,163.6L451.4,169.7L453.6,171.1L453.3,169.1L453.9,171.0L456.2,173.2L458.4,173.9L458.5,175.7L459.2,175.0L460.7,175.3L460.5,180.7L459.0,180.5L458.7,177.9L457.7,180.7L455.8,177.6L455.2,179.4L455.1,178.8L454.0,179.2L454.7,180.0L454.5,181.4L453.3,181.7L450.9,179.8L452.0,182.7L452.2,181.7L452.5,182.1L451.4,186.0L453.1,183.3L454.6,182.3L456.1,182.4L456.6,183.3L455.3,185.2L455.8,185.7L456.5,184.9L456.8,187.8L450.5,189.7L447.7,188.6L447.2,187.7L445.8,188.4L443.7,187.8L443.2,187.2L444.7,186.0L439.1,184.2L439.8,181.8L438.8,180.7L437.1,182.1L437.2,183.6L435.5,185.4L432.8,186.1L430.6,185.7L428.7,187.6L422.8,188.5L418.8,187.9L419.3,188.6L411.3,187.7L412.3,187.3L411.2,186.2L410.5,183.6L411.5,181.2L411.3,179.5L411.9,179.8L409.2,178.0L405.7,177.8L401.2,174.8L401.4,173.1L400.2,172.5L401.8,172.4L400.3,169.1L400.7,167.9L416.1,171.5L415.8,173.2L416.6,173.4L417.6,171.8L426.7,173.4L431.1,146.5Z", "M491.7,180.5L491.1,180.6L493.2,180.1L495.5,182.4L496.6,180.3L498.1,180.6L496.4,182.1L497.7,181.4L499.5,182.1L499.6,181.5L501.2,182.4L499.7,182.4L500.2,182.8L499.5,184.6L498.3,184.4L498.8,183.6L497.9,184.4L496.9,183.8L500.2,186.4L500.4,188.2L501.2,188.6L500.7,189.4L501.3,189.2L500.9,193.3L502.2,194.0L501.6,194.5L502.1,194.3L502.4,195.4L504.0,192.0L503.4,191.4L503.9,190.2L504.3,190.8L503.8,187.7L505.0,184.5L506.0,183.8L509.9,187.4L511.0,188.9L512.2,193.5L511.8,195.0L510.9,194.7L510.6,193.2L509.9,194.2L510.4,197.7L511.6,200.8L515.3,204.7L514.9,206.3L515.5,205.6L515.9,206.4L515.9,205.0L516.5,205.4L517.0,204.6L516.3,203.6L516.8,203.9L517.5,202.7L518.6,203.4L518.2,199.8L520.4,193.7L520.1,188.0L520.5,187.4L521.8,188.1L521.6,187.6L523.5,187.5L523.1,186.6L521.7,186.4L522.4,186.1L521.8,185.3L523.1,185.4L522.2,184.8L524.0,184.3L521.5,183.5L521.9,182.9L520.7,183.4L519.1,178.2L519.6,176.2L518.7,175.8L520.7,176.5L521.2,175.5L522.9,175.2L525.8,176.4L531.5,176.2L530.0,176.7L530.8,177.9L527.8,178.0L532.0,178.7L531.4,178.9L532.6,179.7L532.3,180.5L534.4,179.8L535.9,180.4L536.3,181.4L533.8,184.2L536.4,183.8L537.3,186.1L535.0,189.0L533.7,188.0L534.1,188.5L532.3,188.4L532.9,189.0L532.3,189.2L533.6,190.0L533.5,190.9L534.1,190.7L534.2,192.2L534.8,192.4L535.4,191.3L535.5,194.6L540.0,198.9L539.7,203.8L537.9,204.5L537.7,207.2L536.8,207.2L536.1,209.1L534.4,209.6L533.3,211.9L532.5,212.1L531.7,210.3L530.4,209.9L530.1,206.7L529.6,208.6L528.9,208.6L528.0,207.7L528.8,207.4L527.2,206.1L528.1,206.0L525.6,205.5L526.9,206.1L524.7,207.6L527.2,206.6L526.6,207.1L528.6,208.1L528.2,208.8L529.5,208.9L529.3,210.0L532.3,213.7L531.6,214.3L531.7,213.6L531.1,213.9L529.8,212.8L529.3,213.3L528.3,212.1L528.0,213.0L529.4,214.6L526.0,213.3L525.5,213.9L524.1,210.8L522.7,211.9L518.7,212.2L519.6,214.3L522.9,215.5L522.8,217.0L521.1,218.5L520.8,221.1L517.7,225.1L515.1,225.3L511.0,222.5L512.9,222.4L510.5,222.1L507.1,219.7L504.0,220.7L504.8,220.3L499.2,220.3L501.4,221.6L500.9,220.6L505.8,221.3L510.4,225.9L519.3,225.8L519.8,227.7L517.8,233.1L516.8,233.8L515.9,237.9L513.2,239.9L512.0,239.8L510.7,238.1L512.0,240.2L509.4,239.1L509.9,240.5L508.2,239.0L508.3,237.5L508.1,238.5L506.8,238.8L507.8,239.0L508.4,240.7L506.2,240.2L507.7,242.5L507.1,242.5L506.9,244.2L505.7,244.3L504.9,243.4L505.3,244.5L503.6,245.0L499.9,243.0L496.8,243.2L491.8,241.0L490.2,239.2L491.3,240.9L490.3,241.3L490.9,242.5L492.9,242.7L492.1,241.5L498.1,243.9L496.5,245.9L499.6,243.7L501.5,246.0L504.9,247.1L505.4,250.1L502.2,253.1L498.5,252.5L498.7,253.3L497.0,253.2L497.9,254.6L499.8,255.0L499.1,256.1L498.5,255.3L497.5,256.1L496.3,255.3L497.0,256.4L495.5,258.1L496.6,258.4L497.3,260.1L495.9,258.7L494.0,258.3L495.8,259.2L495.7,259.8L494.2,260.1L495.1,260.6L494.1,262.0L492.8,261.5L493.8,262.3L493.0,262.4L493.4,263.0L491.9,262.4L492.5,263.0L491.9,263.4L493.7,264.4L492.7,264.2L493.5,264.6L490.3,267.5L491.1,268.6L489.7,268.9L490.5,271.2L488.7,273.7L488.0,276.9L486.6,277.4L487.5,278.6L486.7,282.5L450.1,281.8L452.9,238.6L420.5,228.6L416.2,220.7L408.2,219.2L381.4,185.1L386.3,169.0L388.1,171.9L392.1,174.1L395.0,177.9L397.4,179.7L398.3,179.3L401.7,181.7L400.7,179.7L402.8,180.4L402.3,179.5L407.2,184.2L407.9,187.6L408.5,187.3L408.6,187.9L407.9,189.3L404.3,188.0L404.8,189.3L403.0,188.9L403.1,190.8L401.1,191.3L402.5,193.0L404.1,193.2L407.3,195.3L411.8,196.5L414.8,196.2L415.1,197.0L415.2,196.2L416.6,196.9L418.3,195.8L418.0,196.7L418.8,196.7L421.9,195.0L422.6,195.7L422.8,194.7L423.9,198.1L424.6,198.5L425.3,197.8L426.5,198.5L426.3,201.0L427.0,202.6L428.2,199.8L428.3,202.8L428.9,201.8L430.5,205.3L430.3,206.3L429.3,205.8L428.9,206.4L427.4,204.8L427.7,206.1L428.0,205.7L429.2,207.4L428.6,208.2L429.6,208.5L429.8,210.4L430.0,209.4L432.1,214.0L430.3,209.4L431.3,206.1L431.4,208.7L432.0,209.1L432.1,207.3L433.3,209.1L432.3,206.6L433.3,205.9L432.2,205.1L431.5,202.5L432.2,201.7L430.8,199.2L432.6,196.9L431.6,196.3L431.8,195.3L432.6,195.5L432.1,196.4L434.8,195.2L436.4,195.6L436.3,194.5L436.8,195.0L437.1,194.2L437.7,195.3L437.9,193.2L440.8,192.7L441.4,190.4L437.7,191.3L438.2,191.4L437.3,191.9L437.5,193.7L436.6,192.3L435.1,193.7L432.5,192.5L432.1,193.4L433.1,194.6L429.9,194.7L430.1,192.7L428.4,192.8L430.8,189.5L435.0,189.0L439.6,186.9L441.1,187.7L442.2,189.6L442.5,192.3L441.6,192.9L442.4,193.0L443.3,194.7L444.1,193.8L443.7,194.9L445.1,195.1L445.3,197.4L449.1,197.5L449.8,196.4L449.9,198.1L454.2,201.8L455.3,200.8L457.6,202.0L457.4,201.5L459.6,201.4L459.6,200.7L461.0,201.1L461.8,200.5L467.7,202.3L468.7,201.2L470.0,201.3L468.6,199.6L469.2,198.1L471.1,201.7L473.3,203.5L475.3,202.7L474.6,202.2L474.6,199.9L473.9,200.5L472.8,198.9L471.1,200.9L469.2,197.6L469.7,197.1L470.0,198.2L470.2,197.3L468.7,195.2L469.5,195.5L469.5,194.5L470.7,195.9L472.6,195.1L471.5,193.7L472.2,193.3L473.4,194.6L474.4,194.0L475.5,195.4L475.2,196.4L476.8,196.1L477.0,197.2L477.9,195.7L476.4,199.0L477.7,198.7L477.4,198.2L480.0,195.9L479.2,197.5L478.9,203.2L478.2,202.4L477.7,204.8L478.8,205.4L479.2,204.9L478.6,207.2L479.2,207.6L481.4,205.8L480.4,208.1L481.1,207.4L481.9,208.4L482.0,207.7L482.4,210.2L480.0,210.4L479.9,209.1L479.3,210.4L477.8,209.2L480.4,212.5L480.5,214.3L481.2,212.7L480.7,213.2L479.4,210.6L482.6,211.0L483.0,210.1L482.4,208.2L483.1,206.7L480.8,201.9L481.7,198.4L484.7,198.4L486.7,196.1L487.0,194.4L489.9,192.0L488.4,192.3L489.0,189.7L488.7,188.4L487.6,188.1L488.0,187.3L487.0,189.8L488.0,189.3L487.0,190.7L484.9,190.9L484.9,188.6L485.5,188.8L487.2,186.4L485.9,186.5L485.9,184.8L488.9,183.2L487.8,186.3L489.5,183.9L488.7,184.1L489.2,182.8L488.8,182.3L487.4,183.4L486.0,183.3L484.6,180.7L483.7,182.0L480.7,179.7L480.1,180.2L478.6,178.9L478.9,177.9L477.4,176.2L477.1,174.4L478.3,171.1L480.0,171.5L479.0,170.5L479.9,169.5L478.5,170.5L477.0,168.6L477.8,165.3L477.1,164.9L477.8,164.6L477.3,163.2L478.9,161.6L480.8,163.0L481.3,160.5L479.8,160.6L479.4,159.5L481.7,158.1L481.8,157.0L483.9,156.5L481.8,156.8L481.8,155.6L484.0,155.0L484.7,155.8L483.8,157.1L484.0,157.8L484.8,157.2L484.6,158.7L485.4,157.3L487.1,157.5L486.8,158.8L489.9,162.1L490.5,164.1L490.7,167.5L490.0,167.5L491.3,168.4L491.4,169.5L493.4,170.4L493.0,171.5L494.1,172.5L493.8,173.5L494.4,174.0L495.1,172.8L496.1,175.0L494.3,175.4L492.8,174.2L493.2,174.8L492.4,174.9L492.1,176.1L494.6,176.5L491.7,180.5Z", "M621.4,180.9L621.2,181.9L618.3,181.4L617.9,182.4L619.5,181.9L620.9,182.8L619.7,184.1L621.9,183.6L621.7,184.1L620.5,185.2L617.1,184.9L616.9,185.5L618.9,185.7L617.9,187.2L616.5,186.5L617.8,187.4L620.4,186.9L621.6,187.9L620.4,188.9L616.8,188.8L620.0,189.1L621.2,190.4L619.9,191.1L618.5,190.5L620.3,191.5L619.2,191.9L620.8,193.2L618.8,192.2L619.5,193.9L618.3,193.7L615.9,191.4L617.6,193.7L616.1,194.3L618.0,194.4L617.1,195.4L618.9,195.9L617.2,196.2L618.6,196.4L618.1,196.8L619.8,198.2L619.0,198.6L619.9,198.8L620.2,201.6L619.4,200.6L618.6,201.1L619.1,200.3L618.2,200.7L617.9,199.2L617.2,201.1L616.4,200.9L616.7,199.5L615.5,200.2L615.1,197.6L615.3,201.3L614.5,200.5L614.2,201.1L614.2,200.1L612.9,200.0L613.6,199.2L612.7,199.6L614.2,197.4L612.3,199.5L611.4,199.2L612.2,196.2L611.5,197.7L610.0,198.1L610.0,197.4L611.6,195.7L610.4,197.0L609.1,197.2L609.1,196.1L608.7,196.7L608.6,194.7L610.8,193.2L610.1,192.8L609.9,190.8L610.7,188.9L609.6,190.2L609.8,192.1L608.2,194.3L606.2,195.3L606.2,190.3L606.2,192.7L605.4,193.9L603.8,193.2L604.0,192.5L602.8,193.8L602.3,191.6L601.1,192.5L600.5,190.4L599.0,190.3L599.9,190.8L599.0,191.6L599.4,192.0L598.0,191.2L596.5,192.1L599.4,192.4L599.5,193.3L598.4,193.0L600.0,193.8L599.5,194.3L595.8,193.1L597.8,195.3L600.9,196.5L600.4,197.1L601.3,197.8L598.9,198.1L599.3,198.8L598.4,199.0L597.5,197.2L595.7,196.3L595.4,196.9L594.5,196.0L594.9,196.7L593.6,197.6L595.0,197.0L596.4,197.8L596.3,197.2L597.3,197.4L597.3,198.7L596.1,198.3L597.1,198.9L596.7,199.5L597.4,199.1L598.0,199.9L597.6,200.5L599.1,199.7L599.5,203.3L600.1,201.3L601.7,200.4L602.4,201.6L601.8,202.3L603.7,202.3L602.6,203.8L603.9,203.6L604.3,204.7L605.0,204.0L604.9,206.0L606.0,204.2L605.7,205.8L606.3,205.4L607.7,208.2L606.7,205.5L609.6,206.3L609.2,207.6L610.0,208.2L610.2,206.3L610.7,207.7L610.8,207.0L611.9,208.0L610.3,205.9L611.8,206.1L612.1,207.3L612.0,206.4L612.6,206.7L612.8,209.2L614.2,208.2L614.4,209.2L614.8,207.9L615.6,208.3L615.2,209.5L615.8,210.1L613.8,210.9L615.9,211.1L615.6,212.0L616.0,211.4L617.3,212.1L616.8,212.8L618.1,212.9L619.1,211.8L619.5,212.3L618.6,214.4L621.3,215.2L622.3,217.3L621.8,217.7L622.7,218.2L622.2,218.6L623.0,218.6L622.4,219.3L619.6,216.1L617.3,215.0L619.5,216.5L619.7,218.7L621.3,219.9L620.1,219.8L621.1,220.1L620.9,220.7L622.3,220.7L622.7,222.3L623.9,222.5L622.9,223.3L620.7,222.7L623.7,225.6L623.0,226.7L621.6,225.9L620.7,223.6L620.8,224.7L619.9,225.1L618.5,223.1L618.9,224.9L618.0,224.7L618.1,223.5L617.5,224.3L615.8,223.3L617.3,224.7L615.8,224.8L613.4,222.6L613.3,221.6L613.2,222.6L615.2,225.1L613.8,224.6L613.0,222.8L613.4,223.9L612.1,223.5L611.8,221.9L612.0,223.1L611.3,223.5L606.4,220.0L608.8,223.3L605.5,222.1L605.1,221.2L605.2,221.8L603.8,221.1L601.7,221.8L607.0,226.0L608.6,226.0L608.7,226.8L610.1,225.9L610.0,227.5L610.6,226.3L610.6,227.7L611.6,226.8L612.5,227.3L612.1,227.8L612.8,227.4L614.1,228.9L614.7,228.6L614.5,229.1L615.6,228.5L617.5,230.5L618.1,230.0L618.0,231.3L619.0,231.7L619.1,230.6L619.8,231.5L619.3,231.6L620.9,231.5L621.0,233.1L620.1,232.9L622.1,234.6L620.2,235.6L618.0,234.9L615.2,235.3L614.6,234.6L609.1,235.7L604.8,234.5L604.5,233.3L604.4,234.3L603.7,233.5L604.0,234.2L602.9,233.4L603.5,232.1L602.3,232.8L601.3,232.2L602.0,233.0L600.9,232.6L599.7,233.5L595.5,232.7L595.7,231.9L594.9,232.6L595.9,230.7L595.4,230.4L594.4,232.6L593.5,232.3L593.3,231.6L591.8,231.5L590.7,229.3L589.0,229.5L591.3,229.0L592.5,226.6L591.1,227.4L590.8,226.0L590.6,226.8L588.9,225.6L589.3,227.2L587.7,226.4L587.5,227.5L587.8,224.9L587.0,224.7L586.9,226.5L586.2,226.7L584.7,223.9L584.8,225.2L582.2,222.5L581.5,222.2L581.0,223.0L581.3,221.9L580.2,221.7L581.0,219.7L580.2,219.0L580.0,220.8L579.8,219.8L578.7,219.4L578.6,220.9L577.7,220.4L578.7,221.5L577.9,221.7L577.8,223.3L577.0,222.1L577.6,222.1L577.0,221.3L577.8,221.3L576.7,221.0L577.4,220.7L576.7,219.3L576.4,221.0L575.4,220.4L575.8,221.3L573.9,220.0L574.6,218.7L573.7,218.3L573.7,219.7L572.6,219.8L575.5,221.5L574.8,221.9L575.6,222.6L575.1,223.7L569.4,222.7L570.7,224.0L569.4,224.1L570.6,225.0L569.3,224.9L567.7,225.8L568.7,226.1L568.3,226.5L566.4,226.8L566.9,227.9L564.6,227.3L563.6,228.1L562.1,227.0L562.2,227.7L560.4,227.0L558.5,224.4L559.2,223.1L558.5,221.7L561.5,218.6L560.3,217.3L561.2,216.6L560.4,215.8L563.7,215.5L567.9,216.4L570.0,217.7L570.2,218.5L569.2,219.1L571.0,221.1L570.7,219.0L569.8,219.6L570.3,218.4L570.9,218.6L570.8,216.9L570.4,218.1L567.0,215.6L568.3,215.0L568.7,215.6L570.4,215.4L570.3,213.9L571.9,213.0L573.0,213.8L574.1,211.2L577.0,211.3L575.1,208.4L570.8,205.4L573.8,200.1L574.8,194.5L576.3,193.1L576.5,191.2L573.2,187.5L573.2,186.4L571.5,185.4L570.3,182.3L568.2,182.5L569.0,181.1L567.8,182.9L566.1,181.6L566.6,180.1L566.0,178.5L564.2,178.6L565.9,180.3L564.1,180.7L562.2,179.1L562.5,177.9L561.9,178.8L560.9,178.6L561.9,177.7L561.7,177.0L560.5,177.7L561.1,177.1L560.4,177.4L560.6,176.6L561.6,176.1L560.9,175.6L560.1,178.0L558.5,176.9L558.4,178.5L555.8,181.5L554.9,181.5L555.0,179.5L554.2,178.1L555.1,177.4L556.6,177.6L557.8,176.3L557.5,174.9L555.7,173.7L554.0,173.8L552.7,172.5L553.0,171.2L554.0,171.4L554.0,170.8L552.3,171.0L552.4,172.4L550.3,172.0L551.6,170.5L551.3,169.6L549.4,170.1L550.3,168.7L548.2,170.5L549.0,170.7L548.5,171.3L547.1,166.7L546.5,166.0L544.4,167.0L544.0,165.6L543.5,166.1L542.6,164.7L542.0,164.5L542.2,165.3L541.3,164.8L541.7,163.3L542.4,163.6L541.0,162.5L541.1,165.3L540.1,164.8L539.6,166.0L542.3,166.5L544.0,169.5L543.8,170.9L540.6,172.0L538.9,170.7L532.3,170.7L534.7,171.6L536.8,173.9L536.1,174.4L533.3,172.1L527.4,169.5L532.9,172.6L532.9,173.3L531.9,173.5L531.6,174.6L527.7,172.7L525.4,173.8L521.6,173.7L521.1,172.7L517.2,173.5L519.7,174.2L517.9,174.5L514.4,172.2L514.6,169.0L514.0,171.4L513.1,171.4L513.5,170.7L512.6,169.9L511.7,170.9L512.6,171.0L512.8,171.9L509.8,171.7L510.4,172.2L509.6,172.8L508.0,172.0L509.4,171.9L505.4,170.0L503.0,166.1L503.8,165.3L502.4,164.0L504.0,164.6L505.8,164.1L508.1,165.2L511.7,164.1L509.0,162.9L508.4,161.5L507.6,162.2L500.9,161.2L500.2,158.5L500.9,156.6L499.6,154.9L501.2,152.0L500.1,151.9L499.8,149.1L501.0,146.3L500.6,145.0L501.7,144.9L501.1,142.6L501.7,140.0L502.4,139.9L501.8,139.6L503.2,139.1L502.3,138.5L506.4,133.1L509.1,131.7L513.4,131.5L514.8,132.2L511.9,137.0L510.2,144.6L512.3,147.8L512.3,152.5L513.7,154.9L516.3,157.6L518.4,158.4L519.0,159.9L517.5,160.0L512.4,164.1L514.3,163.7L517.1,161.3L519.1,161.1L519.2,162.2L518.3,162.1L519.2,163.9L519.8,163.7L519.2,155.6L516.8,155.8L515.6,154.6L516.1,154.3L515.5,153.3L513.6,152.3L515.4,151.4L515.2,149.3L517.1,149.3L520.2,152.3L520.1,151.3L517.0,148.7L518.5,147.4L517.1,147.8L517.2,146.7L516.2,148.1L514.6,147.0L513.4,142.2L514.7,141.3L519.5,143.0L515.1,140.4L513.7,140.7L514.0,139.4L515.0,140.2L514.8,139.2L520.1,140.2L514.5,138.2L514.6,137.3L515.6,136.2L517.3,137.9L516.0,136.1L517.4,134.9L518.9,135.2L519.6,136.6L519.1,135.0L517.9,134.4L521.2,131.2L525.3,130.6L526.6,132.2L527.4,135.5L529.7,136.5L530.1,139.0L531.8,140.9L529.1,147.1L531.5,143.6L531.8,145.0L530.6,147.3L532.3,148.4L530.7,148.5L530.6,149.1L531.6,149.1L531.4,150.8L533.0,148.6L532.3,147.1L533.1,146.8L532.8,145.7L535.2,147.2L533.1,145.3L533.7,143.2L534.9,144.8L534.7,146.2L535.2,145.4L535.8,146.2L535.2,145.3L535.7,143.9L537.3,145.0L537.1,148.5L539.8,149.0L538.0,147.8L537.8,146.0L539.3,146.7L541.0,149.4L542.1,149.7L540.3,148.1L540.7,147.7L542.7,149.8L542.7,149.1L537.7,145.4L537.6,144.2L538.6,144.0L539.4,145.8L538.8,144.2L541.8,144.7L542.1,145.9L542.1,144.9L544.2,145.0L538.2,142.9L538.2,141.1L540.4,138.7L543.4,138.3L543.8,139.1L545.7,139.3L546.2,140.5L546.5,139.1L549.0,139.4L550.7,141.8L550.1,143.5L547.6,144.6L547.0,147.4L548.3,144.2L550.4,144.1L549.3,145.3L549.3,148.1L548.5,148.9L549.2,148.7L549.5,145.4L550.8,143.3L553.6,143.1L554.4,145.8L551.0,148.4L552.6,148.2L551.4,150.3L553.4,147.6L553.6,148.8L552.4,150.5L553.3,149.6L553.2,150.4L554.2,150.9L553.6,153.5L554.4,151.0L553.6,149.4L554.0,147.8L555.1,146.6L555.6,148.8L555.5,146.2L556.4,145.8L556.6,146.4L556.7,145.7L556.4,149.4L555.4,150.3L556.4,149.7L556.4,152.5L556.6,148.6L557.6,148.0L557.9,150.2L558.3,149.1L558.7,149.6L558.0,153.7L558.7,153.1L558.7,150.2L560.3,150.5L559.6,151.3L560.1,153.9L560.6,145.8L564.5,146.4L566.8,148.4L566.4,151.0L564.7,151.0L564.0,153.9L562.7,155.1L564.8,154.2L563.9,156.9L566.5,153.3L568.1,152.9L567.5,151.3L568.4,149.7L569.3,150.0L570.2,151.4L570.0,153.5L569.1,155.7L567.5,155.9L566.9,158.3L567.7,158.1L567.8,159.6L567.9,156.2L569.3,156.2L569.8,162.0L569.5,155.1L572.4,151.0L573.0,151.2L572.5,153.4L571.4,154.4L571.9,156.0L572.4,155.6L571.7,154.5L572.8,153.8L573.1,154.3L574.3,151.4L579.3,152.6L579.3,154.6L578.5,153.8L578.7,155.3L575.8,157.9L574.5,160.3L576.0,160.3L574.2,162.4L576.2,160.5L575.9,158.5L579.2,156.6L579.5,158.4L578.0,161.5L576.7,162.0L576.8,164.4L576.9,162.1L578.3,161.9L578.9,160.0L580.4,159.3L580.2,158.0L581.2,157.0L580.4,156.3L580.6,154.8L582.1,154.9L585.2,157.2L586.6,159.4L583.3,160.1L582.7,162.1L576.9,165.2L579.6,164.6L581.6,162.9L584.6,163.4L587.1,162.3L589.3,162.9L590.3,165.0L586.8,165.9L584.4,165.2L581.3,165.7L580.7,167.0L581.6,165.9L585.1,165.9L581.9,167.1L583.7,166.7L581.9,168.4L582.5,168.3L582.6,169.7L583.8,167.1L587.3,167.5L584.4,169.2L586.3,168.7L586.9,169.5L584.9,169.8L587.9,169.9L581.7,171.4L583.7,172.0L587.3,171.4L587.3,172.0L584.4,173.3L585.3,172.6L586.0,172.8L585.2,173.5L588.3,172.5L588.7,174.1L588.5,172.4L589.2,172.0L590.0,172.1L590.1,173.8L589.9,172.6L590.7,172.2L591.5,172.7L591.1,173.1L591.6,172.1L593.4,171.9L592.4,173.2L589.6,174.5L589.6,175.4L590.5,174.1L590.3,175.3L590.7,175.0L591.0,173.7L592.6,173.5L591.8,174.1L591.8,175.8L591.0,175.9L591.9,176.1L592.7,173.8L593.8,174.0L593.7,176.0L594.0,176.5L594.4,174.8L594.9,176.5L594.8,174.7L595.9,174.4L595.6,175.2L596.9,175.4L596.7,177.1L595.3,177.6L597.1,178.1L597.3,173.5L599.1,179.0L598.4,175.3L599.7,174.4L600.0,176.8L601.7,178.3L600.2,176.6L600.2,175.1L601.1,173.1L602.5,173.4L601.4,174.5L602.1,177.5L602.5,175.6L603.3,176.5L603.0,175.0L603.7,174.8L604.8,175.1L604.1,176.5L605.1,175.2L605.6,176.3L606.4,176.0L606.9,176.7L605.7,178.0L607.5,177.5L608.4,178.7L604.8,179.7L607.2,179.4L605.6,181.3L608.3,179.2L608.4,179.9L606.5,181.6L606.7,183.0L606.9,181.5L608.8,179.4L610.5,178.8L610.4,181.9L611.3,177.2L612.3,178.0L611.6,179.7L612.4,181.0L610.8,183.4L611.9,182.9L611.9,181.9L612.9,183.9L612.3,181.9L613.9,180.3L615.1,183.6L614.4,180.3L615.1,180.0L617.0,181.7L615.7,180.0L616.5,178.1L617.0,179.5L618.1,178.5L617.5,179.8L619.0,179.0L618.8,179.7L620.0,179.7L621.4,180.9Z", "M526.6,8.2L528.7,7.8L528.5,9.9L526.4,13.4L529.4,11.0L530.1,8.6L531.6,9.3L530.8,8.0L531.3,7.2L532.8,8.8L533.0,7.6L534.3,7.5L534.1,9.0L536.4,10.1L536.5,12.2L538.0,10.2L537.9,10.9L539.2,10.3L541.2,12.2L541.3,14.1L539.3,20.6L538.2,20.9L539.0,21.5L538.7,22.2L536.7,22.5L535.8,23.9L537.1,23.3L536.6,24.4L532.5,27.1L529.6,25.8L532.1,27.3L531.3,27.8L531.9,28.0L534.5,26.3L535.7,26.6L530.3,33.4L531.5,33.1L531.1,34.3L537.4,26.1L539.3,24.6L539.9,25.3L535.4,39.7L535.2,43.4L533.8,44.0L533.3,42.6L531.8,41.7L533.5,44.2L534.9,44.9L534.8,45.9L533.5,46.1L531.8,48.0L529.9,47.1L531.4,48.1L530.7,49.1L534.4,47.3L534.5,48.9L533.2,50.5L534.5,50.3L534.4,51.7L532.4,54.0L530.7,53.9L530.4,52.5L528.2,53.0L527.4,52.4L526.0,53.4L526.5,54.0L529.6,53.5L530.9,55.9L529.7,57.0L529.0,56.5L528.9,58.1L526.9,57.7L527.2,59.5L521.8,58.6L524.3,59.1L525.3,60.3L523.1,60.9L522.1,59.6L521.5,60.0L522.5,61.4L520.3,61.5L522.0,62.6L529.0,61.0L528.4,61.8L529.7,63.0L526.8,63.7L525.4,62.3L520.5,64.1L525.6,63.9L522.7,65.4L520.4,65.0L519.2,65.6L522.2,65.6L521.6,68.9L522.3,66.2L524.4,64.8L527.0,65.0L525.6,66.7L529.8,66.1L530.9,68.9L529.1,70.4L526.2,71.0L529.5,71.3L530.8,72.3L529.8,74.3L528.4,74.1L526.6,75.2L530.2,75.3L529.9,77.4L528.9,76.9L527.5,78.7L523.8,78.4L523.7,79.7L525.2,80.6L525.2,82.2L526.4,82.9L525.6,85.9L524.5,87.1L524.4,86.3L523.4,87.6L519.2,87.9L516.6,86.2L515.2,84.2L516.4,87.2L518.1,88.1L515.4,89.1L516.8,90.6L518.4,88.7L521.2,89.1L520.8,90.8L522.1,88.4L523.4,88.4L524.4,89.7L523.9,92.0L525.2,91.7L525.2,92.8L526.0,92.8L526.4,90.5L527.2,90.1L528.7,92.2L529.0,94.2L527.9,96.9L526.5,95.8L525.8,99.3L521.2,102.5L521.4,98.8L519.8,97.5L519.2,98.7L517.6,98.5L517.9,96.2L516.6,97.1L515.0,95.1L517.4,97.9L517.5,99.3L515.8,100.3L514.8,99.6L513.4,96.2L514.6,100.1L513.1,100.2L511.1,97.8L511.6,100.3L510.5,100.6L509.2,99.1L509.6,100.9L511.4,102.1L509.2,102.7L505.7,101.9L505.9,100.1L504.6,99.0L505.7,100.2L504.8,101.0L504.8,102.5L502.7,101.4L502.1,99.5L502.8,102.7L501.9,102.9L501.6,102.1L501.3,102.8L500.1,102.6L499.1,97.4L499.4,102.5L498.8,100.2L498.5,102.5L497.6,102.3L496.8,100.7L496.2,100.8L496.8,99.3L496.2,97.3L498.7,94.0L501.9,93.5L502.6,92.5L503.4,93.1L503.8,92.4L502.1,92.3L502.9,91.5L501.9,91.1L502.9,90.3L500.6,90.6L500.4,88.4L498.8,87.1L498.5,84.6L499.1,85.0L501.0,83.8L503.2,84.3L504.6,85.7L505.6,89.2L506.3,88.4L506.7,89.3L509.2,90.2L508.8,89.1L511.9,89.1L510.7,87.9L512.2,86.0L513.3,79.7L512.3,80.6L512.6,81.7L510.6,87.5L507.9,87.3L508.6,84.9L507.5,86.6L506.5,86.0L507.1,83.7L506.2,84.3L505.9,83.8L508.6,82.8L505.6,83.5L505.0,82.9L506.4,81.1L508.3,80.5L506.2,80.6L506.2,79.6L508.8,79.2L506.3,79.1L507.0,77.2L506.3,77.1L506.5,74.3L505.1,80.7L503.2,81.3L503.8,77.3L502.0,80.9L499.9,81.0L500.9,79.9L499.8,79.8L499.5,77.3L500.3,75.6L501.0,75.6L500.3,75.1L501.1,72.3L504.7,70.3L508.1,70.8L512.2,73.5L511.2,72.0L512.0,71.4L510.7,71.7L509.3,70.6L513.0,69.9L513.1,67.1L511.0,69.7L505.2,68.7L505.6,67.2L507.3,68.3L508.6,67.9L506.8,66.9L506.8,66.0L506.0,66.6L503.4,61.3L499.9,59.9L499.8,57.3L502.4,57.5L499.4,56.8L498.9,53.0L500.2,52.3L505.0,52.8L509.5,57.1L511.1,59.1L511.2,60.4L511.8,59.7L513.8,60.2L515.4,58.0L513.1,59.2L511.3,58.7L510.5,56.3L511.1,55.8L509.1,55.1L506.1,51.6L511.9,48.5L512.2,47.6L516.6,46.1L512.4,46.4L514.8,43.6L518.9,41.5L516.5,41.3L513.8,42.5L513.9,38.5L516.3,33.9L513.9,36.6L513.3,39.4L511.7,38.5L512.8,39.7L513.0,41.4L512.5,43.5L510.2,46.3L505.9,48.6L505.7,47.3L508.0,44.5L505.0,46.8L504.4,46.2L504.8,44.8L503.7,46.1L504.2,48.9L499.9,49.7L500.4,48.5L499.4,49.8L497.9,49.1L499.3,44.1L505.9,39.9L499.4,42.7L496.3,48.9L491.6,45.5L493.3,44.2L497.3,43.6L498.9,42.5L500.7,39.3L499.7,39.4L497.6,42.0L495.7,43.0L491.1,44.3L489.8,43.6L489.4,42.3L490.0,41.2L492.2,41.0L490.0,40.0L492.3,37.3L495.3,37.2L493.0,36.2L489.0,39.6L488.1,38.6L490.4,36.0L489.4,36.0L488.9,35.0L489.0,35.8L488.1,35.5L486.8,37.6L485.6,35.8L488.6,32.3L489.8,31.9L490.7,33.4L490.4,31.6L491.2,31.8L491.0,30.8L492.7,29.0L494.1,29.3L494.4,30.7L495.6,31.6L494.7,30.6L495.2,29.3L496.4,29.4L498.2,31.7L497.4,30.1L498.4,29.8L499.4,31.2L499.0,29.7L499.8,31.0L498.9,29.4L495.4,28.4L494.8,27.3L497.5,25.9L496.2,23.8L497.7,22.9L499.2,24.6L500.9,24.8L502.2,28.2L504.6,28.1L502.9,27.4L501.9,25.2L502.6,25.0L510.3,30.1L508.5,27.6L506.6,27.1L506.2,26.1L504.7,25.8L502.1,23.3L502.3,21.8L504.2,21.6L502.2,20.2L502.8,19.4L505.7,20.6L503.1,17.4L503.4,16.9L505.3,17.1L506.7,18.9L506.3,18.4L508.9,18.0L506.8,17.7L505.9,16.8L506.4,16.3L504.9,15.7L506.3,14.2L507.4,15.4L507.8,14.3L509.1,15.7L509.3,14.2L513.9,17.9L513.8,20.1L514.7,17.4L512.8,16.5L513.0,15.3L512.2,15.4L509.8,13.0L511.9,11.6L514.7,11.2L519.2,14.9L516.5,12.2L517.4,9.3L519.2,8.8L519.3,10.2L521.4,11.3L519.8,10.0L520.0,8.6L522.3,7.5L522.9,9.1L523.7,8.1L524.1,8.8L525.4,8.2L525.7,9.0L526.6,8.2Z", "M476.2,96.7L479.9,95.7L483.2,97.7L484.8,97.3L486.3,100.1L485.0,103.0L485.4,103.7L486.5,100.9L488.6,101.0L491.2,99.7L493.6,101.0L494.0,102.1L490.9,102.0L497.5,103.9L497.5,105.3L494.4,105.7L495.4,106.2L491.0,104.9L492.0,105.5L491.7,106.3L493.8,106.4L493.3,107.2L495.2,107.0L492.5,107.7L493.2,108.5L492.7,109.9L493.6,107.9L494.6,108.1L494.5,109.1L495.8,107.6L496.9,108.8L496.7,110.2L497.2,109.3L498.5,110.1L498.4,111.9L497.0,112.7L498.6,112.4L499.5,114.2L500.1,114.1L499.9,111.1L501.6,113.4L503.0,112.0L503.5,113.5L504.4,111.3L507.2,113.3L506.7,114.2L507.9,113.3L509.8,113.3L507.8,112.3L509.4,110.9L510.4,111.3L510.8,110.0L512.4,110.1L511.8,109.5L512.9,109.2L513.5,107.6L516.3,108.2L518.3,106.6L521.9,106.6L521.8,108.2L524.6,107.9L525.9,108.7L524.8,109.8L527.2,109.5L527.7,110.5L527.8,112.7L525.7,114.8L526.4,115.8L528.2,114.5L529.4,115.8L527.8,117.1L526.3,115.9L526.1,116.5L527.2,117.1L527.4,120.0L524.4,120.7L522.9,122.4L520.8,122.0L520.7,121.4L520.3,122.2L519.3,121.9L518.5,119.3L516.7,118.2L517.6,119.6L517.2,122.4L513.2,123.5L512.6,121.2L512.8,123.3L512.2,123.8L511.0,121.6L511.1,123.8L509.5,124.3L509.1,122.7L508.6,124.4L507.2,123.0L508.0,124.6L505.8,124.8L505.7,124.0L505.0,125.1L504.3,124.5L504.0,125.1L502.0,124.9L502.4,121.7L501.4,120.2L500.8,123.2L499.9,121.2L499.9,124.1L497.6,125.0L495.5,124.2L494.9,122.9L494.0,123.3L494.7,121.1L493.4,123.0L493.9,124.2L493.1,123.2L493.0,124.1L492.0,123.8L490.7,122.2L490.5,118.3L489.1,117.5L490.3,113.0L489.8,109.8L488.2,108.1L486.8,104.1L484.8,104.9L485.0,105.4L482.1,104.7L481.2,105.8L480.2,105.7L480.2,104.9L481.8,104.5L478.9,103.8L478.1,102.6L479.5,101.2L478.3,101.9L475.7,99.8L475.9,98.7L476.4,99.5L477.5,99.4L475.9,97.7L476.2,96.7Z", "M523.0,232.3L523.7,229.6L523.1,220.3L524.8,217.7L525.2,219.1L526.7,219.1L527.4,220.8L526.4,221.7L527.9,222.7L528.6,224.8L529.7,221.8L531.7,223.0L532.0,224.2L535.3,224.5L536.5,226.4L541.9,228.2L543.7,229.8L545.2,233.4L543.7,234.4L543.7,235.2L546.2,233.6L548.4,234.3L548.1,232.8L550.3,234.0L550.6,234.7L549.9,235.1L552.3,235.8L548.9,239.9L544.0,238.3L542.1,238.8L541.6,238.0L542.2,236.4L541.2,235.9L538.8,236.5L538.7,234.0L536.5,235.3L536.7,238.8L534.9,240.8L534.0,240.7L533.1,244.2L530.5,246.6L529.2,246.8L527.3,240.3L525.0,241.9L523.4,241.8L522.2,243.2L520.6,242.7L521.5,239.6L524.6,237.1L523.0,232.3Z", "M481.1,43.5L482.9,44.1L483.7,43.4L483.7,42.7L481.0,41.6L481.4,40.1L482.6,40.9L482.7,39.7L485.6,41.6L488.2,48.0L489.5,49.4L489.2,50.4L490.9,50.7L491.5,51.6L491.3,50.9L492.5,50.8L492.8,53.9L494.7,56.1L494.9,55.5L495.6,56.1L494.0,53.7L494.0,52.3L494.5,51.6L496.1,51.8L496.7,54.8L495.7,55.7L496.2,56.5L497.6,56.2L498.4,57.7L497.4,59.2L498.5,58.3L498.0,63.2L498.4,63.6L499.0,62.2L499.5,62.9L499.4,61.7L500.4,61.4L501.4,64.1L502.0,61.6L504.5,65.8L501.2,68.7L500.7,70.4L499.9,69.2L500.2,71.1L498.9,74.6L497.7,72.6L498.0,69.0L497.0,70.5L497.6,74.2L497.1,74.7L497.9,74.5L498.3,75.9L497.7,77.1L496.0,75.3L497.0,77.7L496.6,81.0L493.0,75.6L494.9,81.1L492.9,79.1L491.5,79.4L492.6,79.9L492.4,81.7L488.2,81.0L485.7,77.7L489.0,76.8L486.0,75.8L484.9,76.5L483.4,74.2L485.4,74.2L483.3,73.4L482.2,71.7L483.8,70.6L484.4,69.1L486.9,69.2L491.5,67.6L485.9,67.8L489.5,65.9L487.0,66.6L486.1,66.3L486.8,65.3L485.3,65.9L484.8,65.0L485.0,66.2L484.2,66.9L484.2,65.5L483.0,67.9L482.2,67.7L483.1,66.2L481.7,65.9L481.5,67.0L479.8,67.7L479.6,66.2L478.5,66.1L478.5,64.5L480.9,63.4L481.8,61.5L480.6,62.7L478.2,63.0L476.4,59.9L477.5,59.7L476.3,58.3L476.9,57.8L476.0,57.2L476.2,56.5L481.4,58.6L480.5,57.2L482.0,55.9L480.9,55.4L479.2,56.8L478.5,56.1L479.5,55.2L477.9,55.9L476.2,53.9L477.6,53.3L479.0,53.9L477.5,52.0L477.8,50.7L479.9,50.4L482.6,51.3L480.6,49.7L481.8,48.8L478.7,47.5L479.9,44.3L481.0,45.5L482.1,44.4L481.1,43.5Z", "M462.1,139.6L460.4,137.6L461.8,136.4L462.9,136.6L464.3,138.7L464.0,136.6L462.2,135.0L463.8,133.7L465.7,135.1L466.4,133.4L464.9,133.5L465.4,132.8L466.5,132.8L468.4,135.7L468.7,135.0L471.9,134.4L472.6,133.4L474.8,133.9L475.7,135.2L474.9,137.3L474.1,137.0L473.3,138.2L474.9,138.4L475.0,139.7L472.8,140.6L470.5,143.6L470.7,145.2L472.7,143.1L474.6,144.1L474.1,145.3L475.4,147.0L474.9,148.2L477.1,146.6L477.9,150.4L476.7,151.6L476.0,151.4L477.1,152.4L477.3,154.1L476.0,154.6L477.3,154.7L476.4,156.0L477.3,155.9L477.0,157.1L476.4,157.4L476.3,156.8L473.7,159.4L471.3,159.0L470.7,158.1L471.1,156.1L470.3,158.3L471.8,160.4L469.3,163.2L468.5,162.0L467.5,162.3L467.1,159.7L463.0,152.7L461.9,152.8L461.0,150.9L460.3,151.9L459.1,151.2L458.7,149.2L456.1,146.2L457.2,142.7L459.0,142.2L460.8,146.4L463.9,146.5L464.1,143.1L464.4,144.9L465.4,144.3L464.8,142.0L463.8,142.4L463.5,141.8L463.8,140.8L464.4,140.2L465.5,141.4L466.3,141.2L464.4,138.9L464.5,139.8L463.7,140.2L462.8,140.4L462.1,139.6Z", "M480.2,140.4L479.9,135.3L481.0,134.8L483.3,136.1L480.9,132.7L482.8,131.0L485.4,130.4L485.9,131.1L486.6,129.9L489.4,130.6L490.6,132.4L492.9,131.3L497.4,132.6L495.9,136.5L495.1,136.6L494.5,140.0L493.3,140.5L494.2,140.8L492.2,146.0L491.1,146.6L488.0,145.5L484.7,146.2L484.6,146.8L486.4,146.5L487.6,149.6L485.2,154.5L485.9,154.2L485.8,155.1L481.8,155.1L481.8,153.8L483.3,153.2L481.9,153.4L481.9,149.8L480.0,145.9L480.2,140.4Z", "M468.4,108.8L467.2,109.2L466.2,106.8L468.6,106.6L465.7,105.8L465.5,105.3L466.7,105.1L466.4,104.6L467.4,105.0L466.6,103.8L465.0,103.8L464.3,102.2L466.2,100.7L468.0,100.8L469.5,102.4L469.6,103.7L469.5,102.9L470.3,103.2L469.8,101.2L470.6,101.5L471.4,100.7L470.3,100.4L471.4,100.3L472.3,101.5L471.7,101.7L473.7,102.8L473.9,110.2L472.8,111.7L474.4,112.4L474.7,115.8L473.3,113.7L473.3,114.9L472.8,114.4L472.4,115.1L473.2,115.5L472.0,116.6L472.8,116.6L472.5,117.2L473.8,118.7L472.9,119.1L472.2,117.8L472.6,120.2L470.2,120.5L469.9,119.7L469.6,120.4L468.2,120.4L468.6,118.9L467.8,120.7L465.3,120.1L464.8,117.8L466.5,117.5L464.2,116.1L465.2,115.8L464.5,115.0L466.5,114.8L465.8,114.2L467.1,113.9L466.5,113.7L467.6,113.1L467.2,112.5L470.0,112.2L458.6,114.0L458.1,112.4L458.9,112.6L459.2,111.3L460.8,111.7L460.1,111.1L460.6,110.6L459.8,110.6L460.1,109.8L461.3,109.3L462.4,111.1L464.1,110.5L462.8,110.9L462.1,109.1L463.0,108.1L461.9,108.4L461.3,107.2L463.0,105.2L460.7,105.2L461.7,102.7L463.3,103.2L463.7,105.4L464.8,107.2L465.7,107.0L465.1,107.4L465.9,107.7L466.4,109.5L467.0,109.9L468.4,108.8Z", "M465.5,187.7L466.0,186.7L467.7,186.7L468.9,186.1L469.1,185.0L470.2,184.9L469.3,183.4L470.1,183.1L469.6,181.9L471.7,183.5L470.3,181.7L471.9,178.5L473.8,179.9L474.0,181.8L474.5,180.7L476.0,183.0L478.6,184.9L478.5,187.7L479.0,188.0L479.2,185.8L480.1,189.7L480.9,190.2L482.0,189.3L482.6,189.9L481.3,191.8L481.1,191.0L480.3,191.1L480.1,192.5L477.5,194.3L475.1,192.8L474.8,193.6L473.5,193.3L472.5,192.1L471.1,191.9L470.1,189.8L469.6,191.0L468.2,190.1L468.3,189.0L467.2,189.1L466.9,190.1L465.5,187.7Z", "M457.9,75.5L459.9,74.1L459.5,73.5L458.7,74.1L458.9,73.2L457.7,73.5L458.8,72.0L458.0,70.7L455.7,72.9L456.8,70.3L454.6,69.8L455.4,66.1L456.1,66.6L458.9,65.9L461.4,67.9L461.8,72.6L462.3,70.8L464.2,70.1L465.8,72.0L465.2,73.7L465.8,74.2L467.3,73.4L468.3,75.2L468.0,76.1L469.1,76.5L468.4,80.2L470.5,83.2L470.3,85.4L467.9,86.7L466.1,85.6L465.2,81.3L462.4,80.1L461.1,80.5L460.9,78.8L458.5,79.4L457.7,80.4L456.5,79.8L455.3,76.7L456.3,75.8L459.1,77.1L459.6,76.0L457.9,75.5Z", "M527.7,129.8L529.0,129.4L532.2,130.2L536.2,128.9L538.8,129.6L543.9,133.7L545.0,136.4L538.0,137.6L535.2,140.0L533.9,140.2L532.3,139.2L531.0,135.3L528.4,134.6L527.7,129.8Z", "M562.9,185.8L562.8,187.7L564.3,191.9L563.6,194.1L561.8,195.8L557.2,196.9L555.0,192.6L556.2,185.8L559.5,184.4L562.1,184.7L562.9,185.8Z", "M478.7,122.1L478.4,120.2L477.8,121.6L477.6,120.4L476.7,120.7L477.2,118.2L478.6,117.5L478.8,117.0L478.0,117.1L479.2,116.0L478.2,115.5L479.3,115.8L479.3,114.4L481.8,112.8L483.4,113.3L485.5,116.0L485.2,116.7L486.1,117.1L486.4,123.9L482.9,124.8L481.5,124.2L480.8,122.8L480.1,123.5L480.1,122.7L478.7,122.1Z", "M544.8,245.7L546.3,246.0L546.4,248.2L542.4,254.2L541.8,254.7L540.7,254.0L539.2,255.5L538.8,253.8L537.5,252.7L538.9,249.9L538.8,248.4L539.4,247.4L541.1,247.8L544.8,245.7Z", "M473.2,73.7L477.6,76.1L477.4,77.3L478.2,78.0L479.1,77.5L480.9,79.0L479.6,81.1L481.0,82.6L480.5,84.6L477.4,85.8L476.7,85.3L476.0,86.7L475.3,86.5L475.5,85.0L473.5,83.6L473.9,82.9L475.8,83.1L475.9,82.4L473.2,81.3L472.0,77.9L473.0,77.2L472.2,74.3L473.2,73.7Z", "M448.0,143.1L448.0,143.9L447.4,143.8L445.4,138.7L442.7,136.1L444.3,133.8L449.2,133.7L451.1,136.4L449.9,140.4L448.0,143.1Z", "M559.6,255.1L558.6,257.7L556.1,255.7L555.5,252.7L556.4,249.6L558.7,249.1L559.9,250.2L559.6,255.1Z", "M569.3,341.6L571.7,343.6L572.5,345.9L563.9,344.2L564.9,342.4L569.3,341.6Z", "M531.6,215.8L532.8,216.7L532.4,217.8L533.8,218.7L535.1,218.5L534.6,219.5L533.5,218.8L532.5,219.5L532.5,218.0L531.0,218.5L530.9,217.0L529.0,214.9L531.6,215.8Z", "M485.7,87.5L484.8,90.9L478.6,90.7L477.3,89.0L477.5,87.9L479.6,86.4L479.9,87.3L484.3,86.7L485.7,87.5Z", "M568.5,185.4L569.5,185.5L570.0,187.7L565.9,188.6L564.1,186.7L565.3,184.5L565.9,185.6L568.5,185.4Z", "M452.7,86.0L454.1,88.6L454.0,90.3L455.5,91.7L455.1,93.8L454.4,94.1L453.1,93.3L452.2,90.5L451.5,86.2L452.7,86.0Z", "M561.8,236.6L564.3,236.6L565.5,239.0L563.9,240.4L560.3,237.5L561.8,236.6Z", "M546.3,175.8L547.5,176.7L546.7,179.2L545.9,181.4L544.0,182.2L544.2,179.8L545.4,178.8L546.0,177.3L545.4,176.6L546.3,175.8Z", "M540.5,173.1L541.5,172.3L542.3,173.3L541.4,174.5L539.7,174.5L540.2,176.1L539.1,174.8L538.9,175.6L538.0,174.6L536.8,174.6L537.2,173.8L538.4,174.5L538.1,173.1L539.2,173.7L540.5,173.1Z", "M494.2,88.9L495.4,91.4L494.6,93.0L493.5,93.3L491.1,90.8L491.0,88.4L491.7,87.8L494.2,88.9Z", "M473.5,131.0L473.1,132.3L471.0,133.9L469.2,134.4L468.5,134.0L469.7,134.2L467.7,133.3L469.9,131.8L473.5,131.0Z", "M454.2,114.4L455.6,117.7L453.4,119.3L451.5,117.7L452.5,115.3L454.2,114.4Z", "M517.8,194.6L518.4,197.8L517.9,199.3L516.7,198.7L515.8,195.8L516.6,193.3L517.8,194.6Z", "M598.1,233.8L600.5,235.2L598.2,236.2L596.7,234.7L597.3,234.2L595.5,234.5L596.0,234.0L594.8,233.8L598.1,233.8Z", "M455.5,99.6L456.1,100.1L455.7,100.9L456.5,100.3L458.5,102.7L456.9,104.1L454.5,103.7L453.9,100.3L455.5,99.6Z", "M527.4,216.6L529.3,219.6L529.1,221.0L526.9,219.2L526.3,216.8L527.4,216.6Z", "M629.1,235.0L629.1,237.9L625.3,236.5L626.9,234.7L629.1,235.0Z", "M471.3,62.8L470.1,60.2L468.2,59.5L469.3,56.4L471.3,57.4L471.3,62.8Z", "M459.4,104.5L459.6,106.2L457.2,107.4L454.2,106.6L454.0,105.8L455.8,104.7L459.4,104.5Z", "M568.7,235.0L569.4,235.0L568.9,236.2L567.6,236.1L564.8,234.3L566.5,233.5L568.9,234.5L568.7,235.0Z", "M577.3,322.3L573.6,324.5L577.3,322.3Z", "M622.2,214.9L624.8,217.9L622.4,216.7L621.5,215.4L622.2,214.9Z", "M561.3,180.0L562.8,181.9L563.0,183.5L560.2,182.1L560.1,179.9L561.3,180.0Z", "M546.6,171.8L547.5,172.6L545.8,174.9L544.5,175.3L546.6,171.8Z", "M495.0,97.6L496.0,98.7L495.6,100.4L496.3,101.5L495.4,102.0L493.4,99.0L495.0,97.6Z", "M551.2,174.1L552.7,173.9L553.2,174.7L552.4,176.4L552.9,177.4L551.2,177.2L550.7,176.4L550.4,174.8L551.2,174.1Z", "M478.4,113.3L478.8,113.9L478.0,115.0L477.3,113.6L476.0,116.3L475.4,114.6L477.3,113.5L477.3,112.8L478.4,113.3Z", "M461.0,108.9L459.0,110.8L456.8,110.6L458.9,108.6L460.5,108.2L461.0,108.9Z", "M617.9,250.8L619.0,251.5L619.0,252.4L618.0,254.3L617.0,254.6L617.0,251.0L617.9,250.8Z", "M527.4,101.3L527.1,103.5L528.2,104.5L526.8,104.4L526.7,105.4L525.6,104.6L527.4,101.3Z", "M463.3,85.0L465.2,87.0L462.1,87.6L461.0,85.6L463.3,85.0Z", "M481.3,182.1L481.3,184.7L480.4,184.7L480.1,182.1L479.9,184.5L479.4,184.4L479.7,181.8L481.3,182.1Z", "M565.3,151.5L567.1,151.6L567.1,152.6L565.0,154.4L564.2,153.2L565.3,151.5Z", "M460.0,107.2L460.0,108.0L457.0,108.9L455.2,108.4L460.0,107.2Z", "M457.1,190.3L456.4,192.4L454.4,191.1L455.9,189.6L457.1,190.3Z", "M462.6,188.1L463.3,189.1L462.3,191.2L461.9,190.2L461.3,190.5L461.3,189.0L461.7,187.6L462.6,188.1Z", "M466.3,99.6L463.5,101.5L462.3,101.1L465.2,99.2L466.3,99.6Z", "M512.0,173.9L514.3,173.6L515.1,174.7L512.7,175.2L512.0,173.9Z", "M478.8,182.3L478.8,184.5L476.5,182.0L478.8,182.3Z", "M582.1,349.9L582.0,351.5L580.6,352.0L580.2,351.4L582.1,349.9Z", "M626.5,225.6L626.2,227.5L624.2,227.3L624.4,226.1L626.5,225.6Z", "M620.2,212.9L620.4,214.1L621.6,214.4L619.0,214.4L619.4,213.0L620.2,212.9Z", "M560.1,150.3L558.3,148.2L559.2,147.6L559.4,149.0L559.6,147.8L560.4,148.3L560.1,150.3Z", "M502.4,68.9L504.3,69.0L501.3,71.1L502.4,68.9Z", "M445.2,191.5L445.9,193.3L444.1,192.6L443.6,191.6L445.2,191.5Z", "M476.3,141.6L477.0,143.0L476.7,144.2L475.7,144.6L475.1,143.1L476.3,141.6Z", "M625.9,232.6L627.6,233.8L627.2,234.3L625.3,233.5L625.9,232.6Z", "M613.9,206.5L614.4,207.0L613.8,208.5L612.9,208.9L613.1,206.3L613.5,207.2L613.9,206.5Z", "M462.8,169.8L463.8,170.8L463.1,170.7L463.6,172.1L462.0,170.8L461.9,169.5L462.8,169.8Z", "M547.4,186.2L546.6,186.0L547.5,184.6L546.4,184.1L548.2,184.0L547.4,186.2Z", "M482.9,108.8L483.5,111.0L482.1,111.3L481.6,109.3L482.9,108.8Z", "M568.1,263.5L566.1,264.9L568.1,263.5Z", "M579.3,221.8L579.0,220.8L579.6,220.4L580.1,222.8L579.3,221.8Z", "M460.0,182.4L460.3,183.0L459.2,183.9L459.5,182.7L458.7,182.0L459.2,181.5L460.0,182.4Z", "M580.7,239.7L583.4,240.3L580.0,240.1L580.7,239.7Z", "M564.4,181.5L565.8,182.6L565.5,183.6L564.4,181.5Z", "M546.4,187.4L547.7,188.0L546.9,189.3L546.4,187.4Z", "M584.0,160.7L584.8,161.1L584.5,162.6L582.9,162.4L584.0,160.7Z", "M501.7,182.7L501.3,184.7L500.5,183.7L501.7,182.7Z", "M613.3,179.5L613.8,177.9L614.8,177.5L614.1,179.7L613.3,179.5Z", "M474.4,124.9L474.3,126.3L473.1,126.5L474.4,124.9Z", "M479.8,124.7L481.0,126.0L479.1,125.6L479.8,124.7Z", "M595.8,174.2L594.3,174.1L595.8,172.8L595.8,174.2Z", "M500.4,185.2L500.0,183.5L499.6,184.4L500.3,183.5L500.9,184.8L500.4,185.2Z", "M535.3,212.6L534.8,213.3L533.7,212.2L535.3,212.6Z", "M619.8,216.9L621.0,218.3L619.8,216.9Z", "M463.5,186.8L463.8,188.8L462.8,187.8L463.5,186.8Z", "M506.7,86.9L508.1,87.8L507.2,88.5L506.1,87.6L506.7,86.9Z", "M563.2,230.9L562.8,231.7L561.6,231.5L563.2,230.9Z", "M430.9,201.9L430.6,203.5L429.8,202.3L430.9,201.9Z", "M621.7,191.2L622.4,191.5L621.9,192.4L620.8,191.6L621.7,191.2Z", "M561.9,274.7L560.9,276.2L561.9,274.7Z", "M606.9,175.6L608.0,176.5L607.1,176.9L606.9,175.6Z", "M476.6,145.0L476.4,146.8L475.5,146.3L476.6,145.0Z", "M479.7,49.4L480.0,50.0L477.4,49.6L479.7,49.4Z", "M568.9,303.4L569.4,304.9L568.4,304.1L568.9,303.4Z", "M502.9,189.8L503.3,188.7L503.9,189.6L503.4,190.8L502.9,189.8Z", "M430.8,199.9L430.9,201.0L430.0,201.7L430.3,199.6L430.8,199.9Z", "M465.2,113.8L465.7,113.3L463.5,113.4L466.2,113.3L465.2,113.8Z", "M610.3,178.4L608.8,178.8L609.4,177.8L610.3,178.4Z", "M562.2,179.8L563.5,180.7L562.2,180.9L562.2,179.8Z", "M496.3,179.7L495.5,179.0L496.6,178.0L496.3,179.7Z", "M460.5,80.1L460.0,81.9L459.4,81.4L460.5,80.1Z", "M568.0,297.1L567.8,298.8L567.4,297.6L568.0,297.1Z", "M491.6,92.7L492.6,93.3L492.3,94.1L491.0,93.2L491.6,92.7Z", "M622.8,214.7L623.8,216.0L622.8,214.7Z", "M616.4,209.3L617.0,210.7L616.0,209.7L616.4,209.3Z", "M468.5,99.7L466.8,99.7L468.5,99.7Z", "M427.4,195.8L427.4,197.0L426.4,195.7L427.4,195.8Z", "M559.4,146.3L560.1,146.0L560.4,147.4L559.3,147.2L559.4,146.3Z", "M586.0,161.3L586.6,161.5L586.2,162.3L585.1,162.4L586.0,161.3Z", "M529.1,174.7L530.6,175.4L529.1,174.7Z", "M623.4,234.8L623.9,235.4L622.5,235.5L622.8,234.6L623.4,234.8Z", "M431.8,204.9L432.7,206.1L431.8,206.2L431.8,204.9Z", "M600.9,192.5L602.2,192.9L600.3,192.5L600.9,192.5Z", "M494.5,263.5L493.8,262.7L495.0,262.9L494.5,263.5Z", "M575.6,338.6L575.8,339.4L574.9,339.0L575.6,338.6Z", "M498.1,77.2L497.9,79.7L498.1,77.2Z", "M440.9,134.9L439.5,134.5L440.9,134.9Z", "M585.5,170.6L588.7,170.6L585.5,170.6Z", "M621.2,212.9L621.8,212.5L622.2,213.3L621.2,212.9Z", "M536.9,143.2L537.8,143.8L536.7,144.1L536.9,143.2Z", "M526.3,175.5L525.9,176.3L525.0,175.8L525.2,175.2L526.3,175.5Z", "M624.0,225.9L623.1,226.8L624.0,225.9Z", "M421.3,189.3L419.8,189.1L421.0,188.5L421.3,189.3Z", "M474.3,178.1L474.7,178.7L473.7,178.3L474.3,178.1Z", "M579.2,222.3L579.7,223.4L578.9,223.0L579.2,222.3Z", "M534.3,217.3L533.3,217.2L534.3,217.3Z", "M425.6,194.3L426.0,195.5L425.2,194.7L425.6,194.3Z", "M535.0,190.0L533.7,189.8L535.0,190.0Z", "M534.8,143.5L535.1,144.6L534.8,143.5Z", "M458.0,185.7L457.3,186.7L457.4,185.5L458.0,185.7Z", "M530.4,66.5L531.6,67.0L531.3,67.6L530.2,67.1L530.4,66.5Z", "M481.9,80.5L482.5,81.7L481.4,80.7L481.9,80.5Z", "M474.2,202.2L473.3,203.0L474.2,202.2Z", "M429.4,200.9L429.0,201.6L428.5,200.9L429.4,200.9Z", "M417.8,190.8L416.7,191.1L417.8,190.8Z", "M568.8,304.3L568.8,305.4L568.8,304.3Z", "M558.3,146.1L558.3,147.8L558.3,146.1Z", "M431.0,196.6L430.1,197.2L431.0,196.6Z", "M497.9,131.4L497.0,130.9L498.2,130.7L497.9,131.4Z", "M619.4,185.9L620.0,186.4L618.8,186.7L619.4,185.9Z", "M456.3,93.6L455.2,94.3L456.3,93.6Z", "M525.7,79.7L525.5,80.9L525.7,79.7Z", "M598.2,173.0L599.0,173.2L598.4,173.8L598.2,173.0Z", "M502.3,187.5L503.1,187.0L503.3,187.9L502.3,187.5Z", "M481.4,156.8L481.5,158.0L480.9,157.9L481.4,156.8Z", "M480.0,93.5L480.4,94.2L479.2,93.5L480.0,93.5Z", "M481.7,106.8L481.5,107.9L480.9,107.1L481.7,106.8Z", "M529.6,173.9L530.5,174.7L529.6,173.9Z", "M513.1,149.2L513.8,150.0L513.1,149.2Z", "M457.0,109.4L456.2,109.8L455.5,109.2L457.0,109.4Z", "M474.9,96.0L475.3,96.4L474.2,96.7L474.9,96.0Z", "M477.1,110.7L476.4,111.7L477.1,110.7Z", "M551.6,142.1L551.0,142.7L551.6,142.1Z", "M463.5,80.9L463.6,81.9L463.0,81.6L463.5,80.9Z", "M511.9,99.5L512.5,99.9L512.0,100.3L511.9,99.5Z", "M613.1,179.6L612.4,179.9L613.1,179.6Z", "M535.4,26.0L534.8,25.8L535.9,25.4L535.4,26.0Z", "M567.6,149.7L567.1,150.6L567.6,149.7Z", "M508.4,14.8L508.3,13.9L508.4,14.8Z", "M486.1,37.3L485.7,36.7L486.5,36.9L486.1,37.3Z"],cx:443.9,cy:75.8},
{name:"Northwest Territories",paths:["M442.4,71.8L443.3,73.0L442.6,77.3L440.7,77.4L439.8,76.0L438.7,77.4L437.2,75.8L434.5,76.5L434.7,74.8L442.4,71.8Z", "M441.8,82.3L439.3,82.7L439.7,84.0L441.1,84.0L440.3,87.3L435.0,88.6L432.5,85.6L433.4,80.9L439.3,79.7L442.1,80.1L441.8,82.3Z", "M435.6,119.2L433.6,119.4L433.6,120.3L429.9,122.2L427.0,122.7L424.2,122.0L421.8,118.6L424.4,117.1L426.0,117.3L425.7,116.8L427.3,116.0L431.3,116.3L433.7,114.2L432.8,113.5L431.5,114.8L431.1,114.2L429.0,114.5L429.5,113.7L428.6,113.7L428.6,112.6L427.8,114.4L424.3,114.4L424.5,113.4L425.5,113.1L424.6,113.0L425.4,111.3L427.0,110.6L425.2,110.7L425.0,109.5L424.0,112.2L423.3,111.0L422.9,111.4L423.5,112.7L423.0,113.7L421.1,114.7L420.4,114.3L420.7,112.1L420.1,112.9L419.4,112.3L418.8,114.3L417.4,112.8L418.2,112.2L417.4,112.2L417.9,111.1L416.3,111.8L413.8,109.5L415.8,107.2L419.4,108.0L422.8,106.3L419.3,106.9L416.1,106.0L417.9,103.8L423.9,104.1L420.1,103.6L418.6,102.1L419.4,102.0L419.3,100.3L420.9,99.6L425.0,101.0L421.8,98.8L423.5,97.0L425.9,96.8L427.3,98.1L427.0,101.1L430.0,100.8L431.4,102.3L430.9,103.0L432.8,105.6L431.1,106.6L433.4,106.7L433.3,110.5L437.0,111.0L435.6,119.2Z", "M438.4,102.8L437.4,101.8L437.7,100.2L438.8,99.8L438.4,102.8Z", "M399.4,167.7L401.3,166.8L410.7,166.8L417.7,169.5L419.4,169.1L419.0,168.6L420.2,169.4L422.0,169.3L420.2,168.1L419.8,166.6L413.9,162.9L407.6,163.1L405.0,161.7L400.7,161.1L398.8,157.2L398.8,156.0L401.2,154.8L409.0,154.4L407.6,153.4L409.5,152.9L410.6,153.8L411.9,153.2L410.5,153.3L409.7,152.4L403.5,152.8L403.2,151.4L402.9,152.8L400.9,152.2L400.4,151.3L401.6,150.4L403.1,150.5L402.1,149.6L403.2,149.4L400.5,149.7L399.2,148.4L398.9,149.3L399.2,145.5L401.7,143.1L403.4,142.9L403.6,141.8L402.5,141.2L402.8,139.6L407.9,136.0L418.2,133.1L419.5,136.3L418.7,139.8L417.3,140.3L417.5,141.0L416.2,142.2L420.1,141.7L419.9,140.4L422.4,138.3L427.6,142.6L427.1,144.3L424.6,146.4L425.5,146.5L424.7,148.1L426.7,145.6L426.4,146.8L427.4,147.7L427.4,146.3L429.1,144.6L430.0,146.4L429.5,145.5L430.1,145.0L431.1,146.5L426.7,173.4L417.6,171.8L416.6,173.4L415.8,173.2L416.1,171.5L400.7,167.9L400.3,169.1L401.8,172.4L400.5,172.0L399.4,170.4L399.4,167.7Z", "M431.2,145.9L430.6,145.0L431.2,145.9Z", "M431.5,144.4L430.6,143.7L431.5,143.2L431.5,144.4Z", "M431.7,143.0L430.9,143.0L429.7,140.1L430.6,139.7L432.1,140.5L431.7,143.0Z", "M450.1,281.8L340.9,259.5L341.5,255.0L340.6,254.4L340.3,252.3L341.4,251.3L341.4,249.6L340.4,249.0L339.7,250.0L337.2,249.9L335.2,247.9L334.2,248.6L333.6,247.7L333.1,248.3L330.3,247.6L330.9,244.5L330.2,244.1L331.5,240.2L329.8,239.1L328.6,236.6L327.7,231.4L326.5,231.6L324.5,229.7L325.8,227.8L325.5,227.2L326.4,226.9L325.0,225.2L325.6,224.4L325.3,222.0L326.8,220.7L325.3,217.6L327.7,216.1L327.3,213.5L326.4,213.2L327.7,212.5L325.6,208.9L326.1,204.7L325.3,203.9L323.1,203.9L324.3,202.6L323.6,200.5L321.8,198.7L324.0,196.7L323.1,194.0L327.1,191.7L326.7,188.5L328.2,187.6L327.4,186.7L325.8,187.4L326.1,186.1L323.2,185.3L324.8,182.5L324.0,181.7L326.1,179.8L325.9,177.7L326.6,177.1L326.0,175.1L327.2,175.1L318.6,170.7L320.7,167.2L321.4,164.7L320.9,164.0L327.1,152.4L328.5,153.1L330.5,156.8L330.1,154.5L330.7,154.8L330.0,153.8L332.9,154.7L333.2,157.7L333.9,158.1L334.1,154.4L336.9,152.8L339.7,152.3L341.6,152.9L343.2,151.0L344.7,152.0L345.2,151.6L344.2,151.2L345.9,150.9L345.0,150.9L346.0,151.9L349.7,150.4L349.9,152.1L352.1,149.8L352.6,150.3L353.9,149.6L353.4,150.2L354.1,149.9L354.0,150.8L355.4,151.5L357.0,149.9L357.3,151.8L356.6,152.7L352.0,153.5L349.6,155.1L349.5,154.1L345.7,153.7L342.2,156.5L342.6,155.2L342.0,155.1L340.0,157.6L340.4,156.7L339.2,156.6L337.1,158.5L338.5,160.4L337.6,158.1L340.6,160.1L340.9,158.8L339.7,159.1L339.9,158.3L340.5,158.5L340.5,156.8L342.1,156.8L342.8,155.9L342.1,157.1L343.2,156.1L343.1,157.2L346.1,155.5L345.2,155.0L346.6,154.8L347.3,155.6L346.4,156.4L347.9,155.1L347.8,156.1L348.2,155.2L346.7,157.0L348.0,156.4L348.5,154.4L348.0,156.8L349.2,154.4L347.8,157.2L349.4,155.3L347.7,159.3L348.2,158.0L352.1,154.6L357.2,154.9L358.4,154.0L357.8,155.3L356.9,155.1L356.4,156.5L357.1,156.9L360.3,155.1L361.0,153.4L364.3,153.5L362.8,152.1L362.8,151.2L363.6,151.1L362.6,150.8L364.2,149.0L365.7,153.4L365.3,159.2L365.9,162.3L368.1,165.6L368.4,164.6L369.3,165.3L369.8,164.7L367.8,164.3L368.7,163.5L369.9,164.3L369.2,162.6L369.7,161.8L371.2,161.8L371.2,162.9L371.8,162.3L370.5,160.7L371.0,160.4L371.2,161.2L373.5,159.8L372.3,159.1L371.2,159.5L371.6,158.8L372.5,158.3L372.1,158.8L374.5,159.4L373.5,158.5L373.9,158.0L374.9,158.4L374.8,159.2L373.7,160.1L373.0,162.6L374.5,163.7L371.8,166.4L375.9,167.3L378.9,163.4L382.5,164.8L385.8,167.8L386.3,169.0L381.4,185.1L408.2,219.2L416.2,220.7L420.5,228.6L452.9,238.6L450.1,281.8Z", "M403.8,121.6L405.3,119.7L406.2,120.2L405.4,122.6L407.7,120.4L409.6,120.2L411.5,121.3L415.6,129.0L416.0,131.4L401.3,137.6L399.8,140.5L397.8,141.4L396.4,140.6L396.4,141.9L394.7,143.8L393.0,148.3L389.5,148.8L388.7,147.7L383.9,150.5L382.5,149.6L382.0,143.0L378.9,138.5L379.9,138.7L376.5,137.2L377.3,137.4L380.0,133.3L382.2,132.2L382.8,128.9L385.1,128.9L384.5,126.8L390.5,120.6L389.6,118.9L389.7,113.2L400.2,114.2L403.2,118.3L405.1,119.5L403.8,121.6Z", "M423.4,89.9L424.2,91.0L423.6,91.6L422.5,90.9L423.1,94.0L421.6,95.0L419.5,95.0L419.2,97.3L417.9,98.1L416.3,95.8L418.3,91.2L416.1,91.9L416.1,93.9L415.2,94.4L414.6,93.5L414.1,94.1L414.7,96.3L413.5,96.8L412.4,98.8L412.2,95.3L411.5,95.4L411.2,98.0L410.5,97.9L410.9,99.8L409.5,100.8L408.8,100.1L407.7,100.8L408.4,99.1L407.7,98.3L408.3,96.8L407.8,96.0L406.9,98.7L406.5,98.2L405.7,99.0L404.6,97.0L402.6,97.8L401.9,97.2L403.2,95.6L402.5,95.4L403.2,95.3L403.0,94.8L401.5,95.4L403.6,92.8L405.7,92.2L406.9,92.7L408.7,90.2L411.3,89.5L411.5,88.5L416.4,84.2L419.9,84.4L421.8,86.1L421.6,85.4L422.5,85.9L423.1,85.2L422.0,84.0L424.2,83.3L426.2,86.9L423.0,88.4L423.4,89.9Z", "M329.8,152.2L331.1,152.6L330.0,151.2L330.9,149.6L331.8,152.1L331.6,149.3L331.8,150.6L332.5,149.5L333.4,151.0L333.8,149.2L334.6,148.9L337.1,150.2L336.7,149.5L338.0,148.6L338.1,147.6L338.8,149.1L338.1,149.6L339.7,150.7L333.9,154.2L333.9,158.1L333.2,157.5L333.2,154.2L332.3,154.9L331.0,153.2L330.5,153.7L329.0,152.4L329.6,151.6L329.8,152.2Z", "M416.6,99.6L413.4,105.1L411.9,106.0L409.9,104.0L413.2,101.1L416.6,99.6Z", "M430.4,83.0L428.7,79.3L431.1,78.4L432.3,81.9L430.4,83.0Z", "M428.1,95.0L426.1,93.7L427.1,92.7L429.3,92.9L430.0,93.8L429.2,95.2L428.1,95.0Z", "M406.9,99.3L405.8,101.2L405.1,100.8L406.9,99.3Z", "M419.3,168.0L421.2,169.0L419.3,168.0Z", "M423.9,193.8L422.3,194.3L423.9,193.8Z", "M363.8,148.8L362.8,149.0L363.6,148.0L363.8,148.8Z", "M401.8,162.1L401.4,161.7L402.9,162.3L401.8,162.1Z", "M333.2,150.3L332.7,149.0L333.5,149.4L333.2,150.3Z", "M402.0,97.7L402.8,98.2L402.4,98.6L402.0,97.7Z", "M388.4,121.4L388.7,122.4L388.0,122.2L388.4,121.4Z"],cx:439.0,cy:75.0},
{name:"New Brunswick",paths:["M683.7,359.9L683.1,362.0L682.8,360.9L683.7,359.9Z", "M657.9,376.7L660.4,374.5L661.1,372.8L659.9,369.4L661.5,368.8L661.2,368.1L664.4,367.0L666.4,367.8L671.8,363.3L675.9,363.5L677.8,365.6L679.5,362.9L682.1,361.8L682.2,362.4L683.2,362.1L682.6,364.3L683.3,366.1L681.5,369.7L685.0,368.3L685.2,370.7L686.5,371.5L686.2,372.2L687.1,371.7L688.8,373.9L688.5,374.9L689.3,374.1L689.8,375.4L695.1,374.2L693.5,375.6L693.9,376.1L691.9,379.9L691.2,378.3L689.1,377.2L691.1,378.7L690.8,381.6L689.9,381.7L686.1,387.4L685.1,388.2L683.4,387.9L683.6,386.1L682.8,387.8L684.0,388.1L683.3,389.4L682.5,389.3L683.1,389.5L682.2,390.8L681.6,390.2L679.4,392.1L679.4,391.3L678.5,391.0L678.3,392.2L676.8,391.1L677.5,392.2L676.4,391.9L676.2,392.6L674.8,391.5L673.9,388.6L671.3,388.7L666.5,376.0L662.8,374.3L659.2,377.4L657.9,376.7Z"],cx:683.4,cy:361.0},
{name:"Nova Scotia",paths:["M715.2,371.1L715.1,372.2L714.0,371.8L715.2,371.1Z", "M681.1,394.1L681.6,395.2L680.9,396.2L681.1,394.1Z", "M714.4,364.4L714.9,362.7L714.5,365.4L712.2,368.1L714.2,366.2L714.2,367.4L712.8,368.5L713.9,368.5L713.2,370.5L714.3,369.3L715.2,369.4L715.2,370.1L715.8,369.5L715.4,368.4L716.5,365.6L715.2,367.4L714.3,367.2L716.1,363.4L714.6,365.8L715.4,362.7L716.6,362.9L716.4,363.9L717.0,362.6L719.3,362.4L719.0,364.1L720.3,364.4L718.7,365.9L719.3,366.4L718.7,367.7L716.6,370.2L715.1,370.2L712.9,372.3L709.3,368.8L710.7,357.5L712.0,356.6L712.0,358.0L713.4,357.9L714.1,360.1L714.4,364.4Z", "M693.9,376.1L697.0,376.7L697.9,375.6L698.5,375.6L698.0,376.3L699.7,375.5L699.0,376.3L699.7,376.5L701.0,375.5L700.5,375.2L703.4,374.3L702.9,374.6L703.8,374.7L703.1,375.5L703.6,375.9L704.1,374.9L705.2,375.2L707.6,371.1L708.6,372.7L710.6,372.6L711.2,371.6L713.5,372.5L712.7,374.5L716.0,373.7L713.5,376.3L711.9,376.7L712.6,377.4L711.4,377.7L710.9,379.3L708.7,381.1L708.6,382.0L708.2,381.5L708.2,382.5L707.6,382.4L706.6,384.2L705.0,384.3L705.4,385.2L704.5,384.3L704.8,385.3L702.9,386.3L703.3,387.0L701.4,386.5L703.1,388.0L702.7,388.9L701.5,389.1L701.3,388.5L700.4,389.1L700.0,387.4L699.1,388.3L699.7,389.9L698.6,389.1L697.9,389.7L698.0,390.9L699.2,391.2L698.4,391.7L699.3,392.2L697.9,392.1L698.7,392.6L698.3,394.0L697.5,394.2L698.1,394.8L697.2,395.4L697.8,395.9L696.9,397.0L697.3,397.8L696.3,397.7L696.7,398.8L695.9,398.4L696.5,399.4L695.9,399.2L696.0,400.0L694.8,399.2L694.9,400.5L694.3,399.7L695.0,401.7L694.1,401.5L694.8,402.3L694.3,401.9L694.4,402.9L693.5,402.1L692.7,403.2L690.7,400.8L689.6,400.9L690.0,402.3L689.2,402.1L687.3,399.1L687.0,396.6L687.9,393.8L686.2,396.1L687.9,392.6L688.8,393.0L689.8,390.8L688.1,392.3L694.4,383.3L693.7,383.2L694.8,383.1L695.4,385.0L696.1,384.5L697.2,385.5L696.4,383.6L700.7,379.9L692.9,382.7L692.1,384.4L690.9,384.5L693.9,376.1Z"],cx:714.9,cy:371.5},
{name:"Saskatchewan",paths:["M450.1,281.8L447.5,323.7L447.4,391.4L392.1,385.4L409.8,277.3L450.1,281.8Z"],cx:437.4,cy:337.9},
{name:"Alberta",paths:["M366.3,380.5L366.1,378.9L364.8,378.1L363.9,376.0L364.3,374.4L363.4,373.7L364.3,372.7L364.9,369.4L363.8,364.0L362.5,364.0L362.1,362.1L360.6,360.5L361.0,359.4L357.9,355.1L356.7,350.0L355.0,350.4L353.8,345.3L352.0,345.3L351.2,344.4L351.8,342.5L350.5,341.3L349.0,342.1L349.2,338.3L348.8,336.6L348.0,336.5L347.9,334.0L346.9,332.6L346.3,333.5L345.2,332.5L344.9,330.8L343.0,329.9L342.4,328.4L342.5,327.5L343.7,327.6L342.7,325.5L360.3,266.1L409.8,277.3L392.1,385.4L366.3,380.5Z"],cx:359.9,cy:350.7},
{name:"Prince Edward Island",paths:["M692.7,372.3L691.7,372.5L691.2,370.4L689.3,371.4L688.9,370.9L690.0,366.4L690.9,367.8L690.5,369.2L692.8,369.9L692.7,371.5L693.2,370.8L694.3,371.2L694.1,369.9L695.7,370.3L696.4,369.6L697.3,370.2L704.9,366.2L702.9,368.2L703.2,369.0L702.4,369.3L703.1,369.6L702.0,369.9L703.5,370.8L702.9,371.6L703.7,371.6L702.2,372.9L700.0,372.7L700.5,371.4L698.8,371.6L699.3,370.2L698.1,371.3L697.9,372.2L698.8,371.9L698.2,372.6L695.1,372.9L694.0,372.4L694.2,371.7L692.7,372.3Z"],cx:697.3,cy:370.6},
{name:"Yukon",paths:["M321.5,141.1L321.0,140.3L322.1,139.9L322.7,141.0L321.5,141.1Z", "M341.8,260.1L272.0,228.1L271.4,226.7L273.3,224.7L270.6,223.2L268.5,223.8L267.1,221.5L266.3,222.1L264.7,220.1L316.0,136.3L319.5,138.8L321.3,141.2L321.7,144.8L322.8,144.6L322.7,146.4L324.7,150.1L327.3,152.2L320.9,164.0L321.4,164.7L320.7,167.2L318.6,170.7L327.2,175.1L326.0,175.1L326.6,177.1L325.9,177.7L326.1,179.8L324.0,181.7L324.8,182.5L323.2,185.3L326.1,186.1L325.8,187.4L327.4,186.7L328.2,187.6L326.7,188.5L327.1,191.7L323.1,194.0L324.0,196.7L321.8,198.7L323.6,200.5L324.3,202.6L323.1,203.9L325.3,203.9L326.1,204.7L325.6,208.9L327.7,212.5L326.4,213.2L327.3,213.5L327.7,216.1L325.3,217.6L326.8,220.7L325.3,222.0L325.6,224.4L325.0,225.2L326.4,226.9L325.5,227.2L325.8,227.8L324.5,229.7L326.5,231.6L327.7,231.4L328.6,236.6L329.8,239.1L331.5,240.2L330.2,244.1L330.9,244.5L330.3,247.6L333.1,248.3L333.6,247.7L334.2,248.6L335.2,247.9L337.2,249.9L339.7,250.0L340.4,249.0L341.4,249.6L341.4,251.3L340.3,252.3L340.6,254.4L341.5,255.0L340.9,259.5L341.8,260.1Z"],cx:321.8,cy:140.6},
{name:"Manitoba",paths:["M450.1,281.8L486.7,282.5L487.6,289.1L487.0,291.7L486.0,292.1L487.0,292.0L487.3,294.3L488.1,293.9L489.1,295.4L490.2,294.5L489.5,300.4L490.3,294.8L493.8,294.7L494.4,295.4L495.7,294.9L498.1,303.9L500.3,308.8L499.6,311.7L498.1,313.3L508.1,309.1L518.3,312.1L517.8,314.6L495.2,345.2L486.6,354.3L487.4,392.0L447.4,391.4L447.5,323.7L450.1,281.8Z"],cx:476.2,cy:323.4},
{name:"Ontario",paths:["M582.0,356.3L583.0,360.9L581.3,359.2L581.2,357.1L582.0,356.3Z", "M583.1,361.1L590.3,394.9L591.9,397.9L596.4,402.9L598.4,404.2L606.4,404.2L610.9,406.7L611.3,405.6L612.1,405.6L613.7,408.0L616.2,408.7L617.8,407.7L619.7,408.6L621.9,406.5L626.9,403.9L628.8,404.1L628.9,406.6L630.2,407.4L629.4,409.0L624.6,413.0L621.3,418.2L615.2,423.0L614.6,422.9L615.6,421.8L614.7,422.6L614.7,421.7L611.2,423.5L612.8,422.8L612.9,423.4L614.3,422.1L614.4,423.6L616.1,422.3L615.1,424.3L616.5,424.0L614.7,425.3L614.0,425.2L614.3,424.4L612.1,425.1L610.4,424.5L610.7,424.9L601.3,428.8L598.5,432.1L597.7,434.7L598.3,435.4L600.9,435.3L602.7,434.2L603.0,435.9L604.5,437.3L603.4,438.3L600.8,438.5L595.8,440.5L594.4,442.6L596.9,442.7L590.9,442.7L588.0,443.5L585.3,446.5L585.1,448.0L584.9,447.4L581.5,450.0L581.0,452.2L579.9,451.2L578.1,452.0L576.3,451.5L576.6,449.0L580.8,447.8L580.6,446.4L579.0,446.2L579.7,445.2L579.5,442.6L583.8,437.3L582.5,430.2L584.7,424.4L583.5,421.1L580.6,418.8L583.4,418.4L584.1,420.7L585.2,420.9L585.0,421.4L586.2,420.7L585.4,422.9L587.0,422.2L587.0,424.2L588.8,422.5L589.4,423.5L593.1,424.2L593.4,422.0L592.3,420.8L593.3,420.2L593.9,421.0L595.4,420.8L595.0,419.6L594.5,420.4L591.7,417.9L592.4,417.5L591.3,416.9L591.4,415.4L589.5,415.8L588.7,413.7L588.1,414.2L585.7,411.2L583.0,411.7L582.7,410.8L582.3,411.5L580.5,411.2L579.5,412.2L580.4,411.0L579.1,411.5L580.1,410.9L579.5,410.4L578.8,411.6L578.9,410.7L574.7,410.6L570.3,411.6L562.9,411.3L562.5,409.6L561.7,409.3L559.5,410.3L558.9,409.6L559.9,408.2L559.5,407.6L559.0,408.3L558.8,407.0L560.0,406.3L557.1,405.8L557.9,402.6L554.5,399.9L555.2,396.4L548.5,397.0L546.4,394.8L543.8,389.8L538.3,390.6L533.2,388.7L531.8,389.2L533.0,391.1L532.6,392.9L531.7,392.5L530.5,394.9L531.7,391.5L530.5,390.7L529.3,395.6L528.1,396.3L529.0,393.5L526.6,394.7L525.7,398.4L524.5,399.7L522.1,400.0L520.4,399.0L516.5,399.5L515.6,398.0L511.2,400.4L507.9,397.5L506.4,397.6L505.8,398.9L504.9,396.8L503.5,396.7L503.9,395.9L501.8,395.1L496.5,396.5L496.0,395.4L491.3,394.7L490.5,394.1L489.4,388.7L487.4,388.4L486.6,354.3L495.2,345.2L517.8,314.6L518.3,312.1L519.9,312.1L525.3,315.7L527.8,319.8L528.1,319.3L529.3,320.2L537.5,321.6L542.5,324.5L541.4,328.2L542.3,325.5L543.3,324.8L545.7,325.0L549.4,323.7L551.3,324.3L551.7,325.2L550.7,323.8L553.7,324.2L554.8,323.6L555.2,324.8L557.4,323.8L558.8,324.6L558.5,323.6L559.9,326.6L559.6,333.1L561.0,334.2L562.1,336.7L562.0,338.7L563.2,341.8L562.5,342.6L562.7,345.1L568.0,349.2L568.7,350.6L566.5,352.1L568.7,351.3L569.9,352.4L572.2,352.8L575.1,355.2L576.9,358.4L574.0,362.3L577.1,358.6L579.7,358.9L583.1,361.1Z", "M571.4,413.5L571.8,413.1L572.4,414.5L574.0,414.8L573.4,413.7L575.2,412.5L576.4,413.8L577.7,412.2L579.0,414.4L579.5,412.6L579.5,413.6L580.3,413.5L579.0,416.5L578.0,416.3L579.3,414.6L577.6,416.4L572.9,414.9L569.3,414.8L569.3,413.9L571.4,413.5Z"],cx:582.0,cy:358.6}
];

function USCAMap({ responses }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const counts = {};
  responses.forEach(r => { if(r.q1) counts[r.q1] = (counts[r.q1]||0)+1; });
  const maxCount = Math.max(1, ...Object.values(counts));

  function getColor(name) {
    const c = counts[name] || 0;
    if(c === 0) return "#DDE0E6";
    const t = c / maxCount;
    // Interpolate from #C5CEDF (light navy) to #1A2B4A (dark navy)
    const r = Math.round(197 + (26-197)*t);
    const g = Math.round(206 + (43-206)*t);
    const b = Math.round(223 + (74-223)*t);
    return `rgb(${r},${g},${b})`;
  }

  function handleMouseMove(e, name) {
    const svg = svgRef.current;
    if(!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = 960 / rect.width;
    const scaleY = 620 / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    setTooltip({ name, count: counts[name]||0, x: svgX, y: svgY });
  }

  return (
    <div style={{position:"relative",background:"#F8F9FA",borderRadius:8,overflow:"hidden"}}>
      <svg ref={svgRef} viewBox="0 0 960 710" style={{width:"100%",display:"block"}}>
        {GEO_REGIONS.map(region =>
          region.paths.map((d, i) => (
            <path
              key={region.name + i}
              d={d}
              fill={getColor(region.name)}
              stroke="#FFFFFF"
              strokeWidth="0.8"
              style={{cursor:"pointer",transition:"fill .2s"}}
              onMouseMove={e => handleMouseMove(e, region.name)}
              onMouseLeave={() => setTooltip(null)}
            />
          ))
        )}
        <text x="247" y="607" fontSize="9" fill="#9AA0AD" fontStyle="italic">Alaska</text>
        <text x="517" y="611" fontSize="9" fill="#9AA0AD" fontStyle="italic">Hawaii</text>
        <defs>
          <linearGradient id="mapLegend" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#DDE0E6"/>
            <stop offset="100%" stopColor="#1A2B4A"/>
          </linearGradient>
        </defs>
        <rect x="770" y="692" width="150" height="10" rx="3" fill="url(#mapLegend)"/>
        <text x="770" y="689" fontSize="10" fill="#9AA0AD">0</text>
        <text x="920" y="689" fontSize="10" fill="#9AA0AD" textAnchor="end">{maxCount} respondents</text>
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x + 10, 820)}
              y={Math.max(tooltip.y - 36, 5)}
              width={Math.max(tooltip.name.length * 7 + 60, 120)}
              height={36}
              rx="4"
              fill="#1A2B4A"
              opacity="0.93"
            />
            <text
              x={Math.min(tooltip.x + 18, 828)}
              y={Math.max(tooltip.y - 20, 19)}
              fontSize="11" fontWeight="600" fill="white"
            >{tooltip.name}</text>
            <text
              x={Math.min(tooltip.x + 18, 828)}
              y={Math.max(tooltip.y - 7, 32)}
              fontSize="10" fill="#9FE1CB"
            >{tooltip.count} respondent{tooltip.count !== 1 ? "s" : ""}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Hiring timeline ─────────────────────────────────────────────
function HiringTimeline({ responses, filtered }) {
  const data = filtered || responses;
  if (!data.length) return <p style={{color:B.gray400,fontSize:14}}>No data for selected filters.</p>;

  const avgs = {};
  OFFICE_ROLES.forEach(role => {
    const vals = data.map(r => r.q5[role]).filter(v => v && v > 0).map(Number);
    avgs[role] = vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null;
  });
  const ranked = OFFICE_ROLES.filter(r => avgs[r] !== null).sort((a,b) => avgs[a] - avgs[b]);
  if (!ranked.length) return <p style={{color:B.gray400,fontSize:14}}>No hiring data yet for selected filters.</p>;

  const minV = Math.min(...ranked.map(r => avgs[r]));
  const maxV = Math.max(...ranked.map(r => avgs[r]));
  const span = maxV - minV || 1;

  // ── Canvas geometry ─────────────────────────────────────────────
  const W       = 900;
  const PAD_L   = 30;   // left padding (axis starts here)
  const PAD_R   = 30;   // right padding
  const DOT_R   = 7;
  const AXIS_Y  = 240;  // vertical centre of the whole graphic

  // Label card dimensions — sized for longest text at 13px bold
  // "Executive assistant" ~148px, "care coordination" ~133px
  // Add 24px horizontal padding (12 each side) → LW = 172
  const LW      = 172;
  const PAD_TOP = 12;   // space inside card above first text line
  const LINE_H  = 18;   // line height for role text
  const AVG_H   = 17;   // line height for avg text
  const PAD_BOT = 10;   // space inside card below avg text
  // LH for two-line card: PAD_TOP + LINE_H + LINE_H + AVG_H + PAD_BOT
  const LH2 = PAD_TOP + LINE_H * 2 + AVG_H + PAD_BOT; // = 75
  // LH for one-line card: PAD_TOP + LINE_H + AVG_H + PAD_BOT
  const LH1 = PAD_TOP + LINE_H + AVG_H + PAD_BOT;      // = 57

  const GAP      = 10;  // min gap between card edges
  const MIN_CONN = 32;  // min connector length from axis

  // "First hired" / "Later hired" labels placed below the axis, clear of dots
  const END_LABEL_Y = AXIS_Y + DOT_R + 20;

  // ── Helpers ─────────────────────────────────────────────────────
  function splitLabel(role) {
    const slash = role.indexOf('/');
    if (slash > 0) return [role.slice(0, slash), role.slice(slash + 1)];
    if (role.length > 16) {
      const sp = role.lastIndexOf(' ', 16);
      if (sp > 0) return [role.slice(0, sp), role.slice(sp + 1)];
    }
    return [role, null];
  }

  function cardHeight(role) {
    const [, l2] = splitLabel(role);
    return l2 ? LH2 : LH1;
  }

  // ── Dot x positions ──────────────────────────────────────────────
  const AXIS_W = W - PAD_L - PAD_R;
  const rawDots = ranked.map((role, i) => {
    const pct = (avgs[role] - minV) / span;
    return { role, avg: avgs[role], rawX: PAD_L + pct * AXIS_W, above: i % 2 === 0 };
  });

  // Enforce minimum dot spacing so labels have room
  const MIN_DOT_SEP = 28;
  const dots = rawDots.map(d => ({...d, x: d.rawX}));
  for (let i = 1; i < dots.length; i++) {
    if (dots[i].x - dots[i-1].x < MIN_DOT_SEP) {
      dots[i].x = dots[i-1].x + MIN_DOT_SEP;
    }
  }
  if (dots.length && dots[dots.length-1].x > W - PAD_R) {
    const used = dots[dots.length-1].x - dots[0].x || 1;
    const scale = AXIS_W / used;
    dots.forEach(d => { d.x = PAD_L + (d.x - dots[0].x) * scale; });
  }

  // ── Label placement with collision avoidance ─────────────────────
  function placeLabels(items, isAbove) {
    const sorted = [...items].sort((a, b) => a.x - b.x);
    sorted.forEach(d => {
      const lh = cardHeight(d.role);
      d.ly = isAbove
        ? AXIS_Y - DOT_R - MIN_CONN - lh
        : AXIS_Y + DOT_R + MIN_CONN;
    });
    if (isAbove) {
      for (let i = sorted.length - 1; i > 0; i--) {
        const cur = sorted[i], prv = sorted[i-1];
        const lhCur = cardHeight(cur.role);
        const lhPrv = cardHeight(prv.role);
        if (cur.x - prv.x < LW + GAP) {
          const needed = cur.ly - lhPrv - GAP;
          if (prv.ly > needed) prv.ly = needed;
        }
      }
      sorted.forEach(d => { d.ly = Math.max(6, d.ly); });
    } else {
      for (let i = 1; i < sorted.length; i++) {
        const cur = sorted[i], prv = sorted[i-1];
        const lhPrv = cardHeight(prv.role);
        if (cur.x - prv.x < LW + GAP) {
          const needed = prv.ly + lhPrv + GAP;
          if (cur.ly < needed) cur.ly = needed;
        }
      }
    }
    return sorted;
  }

  const aboveDots = placeLabels(dots.filter(d => d.above), true);
  const belowDots = placeLabels(dots.filter(d => !d.above), false);
  const all = [...aboveDots, ...belowDots];

  const maxBelowY = belowDots.length
    ? Math.max(...belowDots.map(d => d.ly + cardHeight(d.role)))
    : AXIS_Y + 60;
  const SVG_H = Math.max(maxBelowY + 24, END_LABEL_Y + 22);

  return (
    <div style={{padding:"16px 0 8px"}}>
      <svg viewBox={"0 0 " + W + " " + SVG_H} style={{width:"100%",display:"block"}}>

        {/* ── Connectors + cards (behind axis line) ── */}
        {all.map(({role, avg, x, above, ly}) => {
          const lh = cardHeight(role);
          // Clamp card so it never bleeds outside canvas
          const lx = Math.max(6, Math.min(W - LW - 6, x - LW / 2));
          const cardCX = lx + LW / 2;
          const connY1 = above ? ly + lh : ly;
          const connY2 = above ? AXIS_Y - DOT_R - 2 : AXIS_Y + DOT_R + 2;
          const [l1, l2] = splitLabel(role);
          const hasTwo = !!l2;

          // Text y positions — measured from card top
          const y1 = ly + PAD_TOP + LINE_H - 3;        // baseline of first name line
          const y2 = hasTwo ? y1 + LINE_H : null;       // baseline of second name line
          const yAvg = ly + lh - PAD_BOT - 2;           // baseline of avg line (pinned to bottom)

          return (
            <g key={role}>
              {/* Dashed connector */}
              <line
                x1={cardCX} y1={connY1}
                x2={cardCX} y2={connY2}
                stroke={B.gray200} strokeWidth="1.5" strokeDasharray="5,3"
              />
              {/* Card */}
              <rect
                x={lx} y={ly} width={LW} height={lh}
                rx="8"
                fill={B.white}
                stroke={B.gray200}
                strokeWidth="1.5"
              />
              {/* Top accent bar */}
              <rect
                x={lx} y={ly} width={LW} height="4"
                rx="8" fill={B.teal}
              />
              <rect
                x={lx} y={ly + 2} width={LW} height="4"
                fill={B.teal}
              />
              {/* Role name */}
              <text
                x={cardCX} y={y1}
                fontSize="13" fontWeight="600"
                fill={B.navy} textAnchor="middle"
              >{l1}</text>
              {hasTwo && (
                <text
                  x={cardCX} y={y2}
                  fontSize="13" fontWeight="600"
                  fill={B.navy} textAnchor="middle"
                >{l2}</text>
              )}
              {/* Avg hire number */}
              <text
                x={cardCX} y={yAvg}
                fontSize="11.5" fill={B.teal} textAnchor="middle"
              >avg hire #{avg.toFixed(1)}</text>
            </g>
          );
        })}

        {/* ── Axis line (drawn above connectors) ── */}
        <line
          x1={PAD_L} y1={AXIS_Y}
          x2={W - PAD_R} y2={AXIS_Y}
          stroke={B.navy} strokeWidth="3" strokeLinecap="round"
        />

        {/* ── Arrowhead ── */}
        <polygon
          points={`${W-PAD_R+1},${AXIS_Y} ${W-PAD_R-7},${AXIS_Y-5} ${W-PAD_R-7},${AXIS_Y+5}`}
          fill={B.navy}
        />

        {/* ── Dots (drawn above axis) ── */}
        {all.map(({role, x}) => (
          <circle
            key={role + "_dot"}
            cx={x} cy={AXIS_Y} r={DOT_R}
            fill={B.tealLight} stroke={B.navy} strokeWidth="2.5"
          />
        ))}

        {/* ── End labels — below the axis, clear of dots ── */}
        <text
          x={PAD_L} y={END_LABEL_Y}
          fontSize="11" fill={B.gray400} textAnchor="middle"
        >First hired</text>
        <text
          x={W - PAD_R} y={END_LABEL_Y}
          fontSize="11" fill={B.gray400} textAnchor="middle"
        >Later hired</text>

      </svg>
    </div>
  );
}


// ─── Timeline by billable hours ───────────────────────────────────
function TimelineByHours({ responses }) {
  if(responses.length < 2) return <p style={{color:B.gray400,fontSize:14}}>Need more responses to show this view.</p>;
  return (
    <div style={{overflowX:"auto"}}>
      <div style={{display:"flex",gap:0,minWidth:700}}>
        {HOUR_RANGES.map((range,ri)=>{
          const sub = responses.filter(r=>r.q2===range);
          if(!sub.length) return (
            <div key={range} style={{flex:1,borderRight:`1px solid ${B.gray200}`,
              padding:"12px 8px",textAlign:"center"}}>
              <div style={{fontSize:12,fontWeight:700,color:B.navy,marginBottom:8}}>{range}</div>
              <div style={{fontSize:11,color:B.gray400}}>No data</div>
            </div>
          );
          const avgs = {};
          OFFICE_ROLES.forEach(role=>{
            const vals = sub.map(r=>r.q5[role]).filter(v=>v&&v>0).map(Number);
            avgs[role] = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
          });
          const ranked = OFFICE_ROLES.filter(r=>avgs[r]!==null).sort((a,b)=>avgs[a]-avgs[b]);
          return (
            <div key={range} style={{flex:1,borderRight:`1px solid ${B.gray200}`,
              padding:"12px 8px",background:ri%2===0?B.white:B.gray50}}>
              <div style={{fontSize:12,fontWeight:700,color:B.navy,textAlign:"center",marginBottom:12,
                borderBottom:`2px solid ${B.teal}`,paddingBottom:8}}>{range} hrs</div>
              <div style={{fontSize:11,color:B.gray400,textAlign:"center",marginBottom:8}}>
                n={sub.length}
              </div>
              {ranked.map((role,i)=>(
                <div key={role} style={{display:"flex",alignItems:"center",gap:6,
                  marginBottom:6,padding:"4px 6px",borderRadius:4,
                  background:B.white,border:`1px solid ${B.gray200}`}}>
                  <span style={{width:18,height:18,borderRadius:"50%",background:B.navy,
                    color:B.white,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",
                    justifyContent:"center",flexShrink:0}}>
                    {i+1}
                  </span>
                  <span style={{fontSize:10,color:B.navy,lineHeight:1.2}}>{role}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Q6 bar chart ─────────────────────────────────────────────────
function EmploymentChart({ responses, q5OtherRoles, filters }) {
  const opts = ["Full-time","Part-time","Mix of both","Not applicable"];
  const colors = {
    "Full-time": B.navy,
    "Part-time": B.teal,
    "Mix of both": B.accent,
    "Not applicable": B.gray200,
  };
  const filtered = responses.filter(r=>{
    if(filters.agencyType && !r.q3.startsWith(filters.agencyType)) return false;
    if(filters.payer && !r.q4.startsWith(filters.payer)) return false;
    if(filters.location && r.q1!==filters.location) return false;
    return true;
  });
  const allRoles = [...OFFICE_ROLES, ...q5OtherRoles];
  const data = allRoles.map(role=>{
    const entry = {role: role.length>20?role.slice(0,18)+"…":role};
    opts.forEach(o=>{
      entry[o] = filtered.filter(r=>r.q6[role]===o).length;
    });
    return entry;
  });
  const legendPayload = opts.slice(0,3).map(o=>({value:o,type:"square",color:colors[o]}));
  return (
    <div>
      <div style={{display:"flex",gap:20,marginBottom:12,flexWrap:"wrap"}}>
        {legendPayload.map(p=>(
          <div key={p.value} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:B.gray600}}>
            <div style={{width:12,height:12,borderRadius:2,background:p.color,flexShrink:0}}/>
            {p.value}
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} margin={{top:4,right:20,left:0,bottom:90}}>
          <CartesianGrid strokeDasharray="3 3" stroke={B.gray100} />
          <XAxis dataKey="role" tick={{fontSize:11,fill:B.gray600}} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{fontSize:11,fill:B.gray600}} allowDecimals={false} />
          <Tooltip />
          {opts.slice(0,3).map(o=>(
            <Bar key={o} dataKey={o} fill={colors[o]} radius={[3,3,0,0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────
function Dashboard({ onBack, responses }) {
  const [filters,setFilters] = useState({agencyType:"",payer:"",location:""});

  const filtered = responses.filter(r=>{
    if(filters.agencyType && !r.q3.startsWith(filters.agencyType)) return false;
    if(filters.payer && !r.q4.startsWith(filters.payer)) return false;
    if(filters.location && r.q1!==filters.location) return false;
    return true;
  });

  function countPie(key, options) {
    const map = {};
    responses.forEach(r=>{
      const val = r[key];
      if(!val) return;
      const canon = options.find(o=>val===o||val.startsWith(o)) || "Other";
      map[canon]=(map[canon]||0)+1;
    });
    return options.map(o=>({name:o,value:map[o]||0})).filter(d=>d.value>0);
  }

  const hourData = countPie("q2",HOUR_RANGES);
  const typeData = countPie("q3",["Franchise network","Independent","Other"]);
  const payerData = countPie("q4",["Private pay","Medicaid","Long-term care insurance","Veterans Affairs","Other"]);

  const typeOthers = responses.map(r=>r.q3).filter(v=>v&&v.startsWith("Other: ")).map(v=>v.slice(7));
  const payerOthers = responses.map(r=>r.q4).filter(v=>v&&v.startsWith("Other: ")).map(v=>v.slice(7));
  const q5Others = [...new Set(responses.map(r=>r.q5Other).filter(Boolean))];

  const firstHires = {};
  responses.forEach(r=>{
    const ranked = OFFICE_ROLES.filter(role=>r.q5[role]>0).sort((a,b)=>r.q5[a]-r.q5[b]);
    if(ranked.length) firstHires[ranked[0]]=(firstHires[ranked[0]]||0)+1;
  });
  const topFirst = Object.entries(firstHires).sort((a,b)=>b[1]-a[1])[0];

  const avgRolesHired = responses.length
    ? (responses.reduce((sum,r)=>sum+OFFICE_ROLES.filter(role=>r.q5[role]>0).length,0)/responses.length).toFixed(1)
    : "—";

  return (
    <div style={{minHeight:"100vh",background:B.gray50}}>
      <Header right={
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <span style={{fontSize:13,color:B.gray400}}>{responses.length} responses</span>
          {onBack && <Btn small secondary onClick={onBack}>← Back</Btn>}
        </div>
      }/>

      <div style={{maxWidth:900,margin:"0 auto",padding:"36px 20px"}}>
        <div style={{marginBottom:32}}>
          <div style={{fontSize:13,fontWeight:600,color:B.teal,letterSpacing:".5px",
            textTransform:"uppercase",marginBottom:6}}>Live results</div>
          <h1 style={{fontSize:30,fontWeight:700,color:B.navy,marginBottom:8}}>
            Home Care Agency Staffing Benchmark
          </h1>
          <p style={{fontSize:15,color:B.gray600,lineHeight:1.6}}>
            Aggregated responses from home care agency owners and operators.
            Updated in real time as new agencies participate.
          </p>
        </div>

        {/* Summary stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:40}}>
          <StatCard label="Total responses" value={responses.length} />
          <StatCard label="States & provinces" value={new Set(responses.map(r=>r.q1).filter(Boolean)).size} />
          <StatCard label="Avg roles hired" value={avgRolesHired} sub="out of 6 functions" />
          {topFirst && <StatCard label="Most common first hire" value={topFirst[0]} sub={`${topFirst[1]} agencies`} />}
        </div>

        {/* Q1 Map */}
        <div style={{marginBottom:48}}>
          <SectionTitle>Respondents by location</SectionTitle>
          <p style={{fontSize:14,color:B.gray600,marginBottom:16}}>
            Hover over a state or province to see the number of respondents.
            Darker shading = more respondents.
          </p>
          <USCAMap responses={responses} />
        </div>

        {/* Q2, Q3, Q4 pie charts */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:24,marginBottom:48}}>
          <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,padding:"20px"}}>
            <SectionTitle>Weekly billable hours</SectionTitle>
            <ResponsiveContainer width="100%" height={290}>
              <PieChart margin={{top:10,right:20,left:20,bottom:10}}><Pie data={hourData} cx="50%" cy="50%" outerRadius={72} dataKey="value" label={({name,percent})=>`${Math.round(percent*100)}%`} labelLine={true} labelLine={{stroke:B.gray200}}>
                {hourData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie><Tooltip /><Legend wrapperStyle={{fontSize:11,paddingTop:4}} iconSize={10} verticalAlign="bottom" layout="horizontal"/></PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,padding:"20px"}}>
            <SectionTitle>Agency type</SectionTitle>
            <ResponsiveContainer width="100%" height={290}>
              <PieChart margin={{top:10,right:20,left:20,bottom:10}}><Pie data={typeData} cx="50%" cy="50%" outerRadius={72} dataKey="value" label={({name,percent})=>`${Math.round(percent*100)}%`} labelLine={true} labelLine={{stroke:B.gray200}}>
                {typeData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie><Tooltip /><Legend wrapperStyle={{fontSize:11,paddingTop:4}} iconSize={10} verticalAlign="bottom" layout="horizontal"/></PieChart>
            </ResponsiveContainer>
            <OtherList label="agency type" items={typeOthers} />
          </div>
          <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,padding:"20px"}}>
            <SectionTitle>Primary payer source</SectionTitle>
            <ResponsiveContainer width="100%" height={290}>
              <PieChart margin={{top:10,right:20,left:20,bottom:10}}><Pie data={payerData} cx="50%" cy="50%" outerRadius={72} dataKey="value" label={({name,percent})=>`${Math.round(percent*100)}%`} labelLine={true} labelLine={{stroke:B.gray200}}>
                {payerData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie><Tooltip /><Legend wrapperStyle={{fontSize:11,paddingTop:4}} iconSize={10} verticalAlign="bottom" layout="horizontal"/></PieChart>
            </ResponsiveContainer>
            <OtherList label="payer source" items={payerOthers} />
          </div>
        </div>

        {/* Q5 filtered timeline */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>Hiring order timeline</SectionTitle>
          <p style={{fontSize:14,color:B.gray600,marginBottom:16}}>
            Average hiring sequence across all respondents (or filtered subset).
            Left = hired first, right = hired later.
          </p>
          <FilterBar filters={filters} setFilters={setFilters} responses={responses} />
          <HiringTimeline responses={responses} filtered={filtered} />
          {q5Others.length>0 && <OtherList label="hiring order" items={q5Others} />}
        </div>

        {/* Q6 employment status */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>Current staffing by role</SectionTitle>
          <p style={{fontSize:14,color:B.gray600,marginBottom:16}}>
            For each office function, how agencies currently staff that role.
          </p>
          <FilterBar filters={filters} setFilters={setFilters} responses={responses} />
          <EmploymentChart responses={responses} q5OtherRoles={q5Others} filters={filters} />
        </div>

        {/* Hiring progression by hours */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>Hiring progression by agency size</SectionTitle>
          <p style={{fontSize:14,color:B.gray600,marginBottom:16}}>
            How hiring order shifts as agencies grow — from smallest to largest by weekly billable hours.
            Each column shows the ranked sequence for that size band.
          </p>
          <TimelineByHours responses={responses} />
        </div>

        {/* Hiring flow chart */}
        <FlowChartSection responses={responses} />

        {/* Hiring flow % chart */}
        <FlowChartPctSection responses={responses} />

        <div style={{textAlign:"center",padding:"20px 0",fontSize:13,color:B.gray400}}>
          Data reflects {responses.length} anonymous agency response{responses.length!==1?"s":""}.
          Built by <a href="https://sallysupport.com" style={{color:B.teal}}>SallySupport</a>.
        </div>
      </div>
    </div>
  );
}

// ─── Hiring flow streamgraph ─────────────────────────────────────
function HiringFlowChart({ responses, visibleRoles, roleColors }) {
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({x:0,y:0});
  const svgRef = useRef(null);

  const COLORS = roleColors || ["#1A2B4A","#2ABFAA","#F4A623","#6C7EAA","#4A90C4","#F7C97A"];
  const activeRoles = visibleRoles || OFFICE_ROLES;

  const matrix = HOUR_RANGES.map(band => {
    const sub = responses.filter(r => r.q2 === band);
    const entry = { band, total: sub.length };
    OFFICE_ROLES.forEach(role => {
      entry[role] = sub.filter(r => r.q5[role] > 0).length;
    });
    return entry;
  });

  const W = 860, H = 340;
  const PAD = { top: 24, right: 24, bottom: 52, left: 60 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const n = HOUR_RANGES.length;

  const stacked = activeRoles.map((role, ki) => {
    return matrix.map((d, di) => {
      const lower = activeRoles.slice(0, ki).reduce((s, k) => s + (d[k] || 0), 0);
      const upper = lower + (d[role] || 0);
      return { di, y0: lower, y1: upper, role, band: d.band, value: d[role] || 0 };
    });
  });

  const maxY = Math.max(...matrix.map(d =>
    activeRoles.reduce((s, r) => s + (d[r] || 0), 0)
  ), 1);

  const xScale = i => PAD.left + (i / (n - 1)) * iW;
  const yScale = v => PAD.top + iH - (v / maxY) * iH;

  function monotonePath(pts) {
    const m = pts.length;
    if (m < 2) return '';
    const dx = [], sl = [], tang = [];
    for (let i = 0; i < m-1; i++) {
      dx[i] = pts[i+1][0] - pts[i][0];
      sl[i] = (pts[i+1][1] - pts[i][1]) / dx[i];
    }
    tang[0] = sl[0]; tang[m-1] = sl[m-2];
    for (let i = 1; i < m-1; i++) {
      tang[i] = sl[i-1]*sl[i] <= 0 ? 0 : (sl[i-1]+sl[i])/2;
    }
    for (let i = 0; i < m-1; i++) {
      if (Math.abs(sl[i]) < 1e-9) { tang[i]=tang[i+1]=0; continue; }
      const a=tang[i]/sl[i], b=tang[i+1]/sl[i], s2=a*a+b*b;
      if (s2>9) { const r=3/Math.sqrt(s2); tang[i]*=r; tang[i+1]*=r; }
    }
    let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < m-1; i++) {
      const cp1x=pts[i][0]+dx[i]/3, cp1y=pts[i][1]+tang[i]*dx[i]/3;
      const cp2x=pts[i+1][0]-dx[i]/3, cp2y=pts[i+1][1]-tang[i+1]*dx[i]/3;
      d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${pts[i+1][0].toFixed(2)},${pts[i+1][1].toFixed(2)}`;
    }
    return d;
  }

  function buildAreaPath(layer) {
    const upper = layer.map(p => [xScale(p.di), yScale(p.y1)]);
    const lower = layer.map(p => [xScale(p.di), yScale(p.y0)]);
    const lowerRev = [...lower].reverse();
    return monotonePath(upper) + ' ' + monotonePath(lowerRev).replace(/^M/, 'L') + ' Z';
  }

  function handleMouseMove(e, role, li) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const svgY = (e.clientY - rect.top) * (H / rect.height);
    // Find nearest band for count
    const bandIdx = Math.round((svgX - PAD.left) / (iW / (n-1)));
    const bi = Math.max(0, Math.min(n-1, bandIdx));
    const count = matrix[bi][role] || 0;
    const band = HOUR_RANGES[bi];
    setHovered({ role, color: COLORS[li] || COLORS[0], count, band });
    setTooltipPos({ x: svgX, y: svgY });
  }

  const yTicks = Array.from({length:5}, (_,i) => Math.round(maxY*i/4));
  const xLabels = ["0–500","501–1k","1–1.5k","1.5–2k","2–2.5k","2.5–3k","3k+"];

  return (
    <div style={{position:"relative"}}>
      <svg ref={svgRef} viewBox={"0 0 "+W+" "+H} style={{width:"100%",display:"block"}}>
        {/* Y gridlines */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={yScale(v)} x2={W-PAD.right} y2={yScale(v)}
              stroke={B.gray100} strokeWidth="1"/>
            <text x={PAD.left-6} y={yScale(v)+4} fontSize="10" fill={B.gray400} textAnchor="end">{v}</text>
          </g>
        ))}

        {/* Stacked areas */}
        {stacked.map((layer, li) => {
          const role = activeRoles[li];
          const origIdx = OFFICE_ROLES.indexOf(role);
          const color = COLORS[origIdx] || COLORS[li];
          return (
            <path
              key={role}
              d={buildAreaPath(layer)}
              fill={color}
              fillOpacity={hovered && hovered.role !== role ? 0.35 : 0.88}
              style={{cursor:"pointer",transition:"fill-opacity .15s"}}
              onMouseMove={e => handleMouseMove(e, role, origIdx)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        {/* X axis */}
        <line x1={PAD.left} y1={H-PAD.bottom} x2={W-PAD.right} y2={H-PAD.bottom}
          stroke={B.gray200} strokeWidth="1"/>
        {xLabels.map((lbl, i) => (
          <text key={lbl} x={xScale(i)} y={H-PAD.bottom+14}
            fontSize="10" fill={B.gray600} textAnchor="middle">{lbl}</text>
        ))}
        <text x={PAD.left+iW/2} y={H-6}
          fontSize="11" fill={B.gray400} textAnchor="middle">Weekly billable hours</text>
        <text
          transform={"rotate(-90," + 14 + "," + (PAD.top + iH/2) + ")"}
          x={14} y={PAD.top + iH/2}
          fontSize="11" fill={B.gray400} textAnchor="middle"
        >Agencies with role hired</text>

        {/* Tooltip inside SVG */}
        {hovered && (() => {
          const tx = Math.min(tooltipPos.x + 12, W - 170);
          const ty = Math.max(tooltipPos.y - 44, 4);
          return (
            <g style={{pointerEvents:"none"}}>
              <rect x={tx} y={ty} width={162} height={40}
                rx="5" fill={B.navy} opacity="0.93"/>
              <rect x={tx} y={ty} width={8} height={40}
                rx="0" fill={hovered.color}/>
              <rect x={tx} y={ty} width={3} height={40}
                fill={hovered.color} opacity="0"/>
              <text x={tx+16} y={ty+14} fontSize="11" fontWeight="600"
                fill="white">{hovered.role.split('/')[0]}</text>
              {hovered.role.indexOf('/') > 0 && (
                <text x={tx+16} y={ty+26} fontSize="11" fontWeight="600"
                  fill="white">{hovered.role.split('/')[1]}</text>
              )}
              {hovered.role.indexOf('/') < 0 && (
                <text x={tx+16} y={ty+27} fontSize="10"
                  fill={B.tealLight}>{hovered.count} agencies · {hovered.band}</text>
              )}
              {hovered.role.indexOf('/') > 0 && (
                <text x={tx+16} y={ty+37} fontSize="10"
                  fill={B.tealLight}>{hovered.count} agencies · {hovered.band}</text>
              )}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}


// ─── Flow chart section wrapper with toggle legend ───────────────
function FlowChartSection({ responses }) {
  const ROLE_COLORS = [
    "#1A2B4A","#2ABFAA","#F4A623","#6C7EAA","#4A90C4","#F7C97A"
  ];
  const [hidden, setHidden] = useState(new Set());

  function toggle(role) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  const visibleRoles = OFFICE_ROLES.filter(r => !hidden.has(r));

  return (
    <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
      padding:"24px",marginBottom:48}}>
      <SectionTitle>How staffing builds as agencies grow</SectionTitle>
      <p style={{fontSize:14,color:B.gray600,marginBottom:16,lineHeight:1.6}}>
        Each band shows how many agencies in that size bracket have hired for each office role.
        Wider bands at a given size = more agencies of that size have filled that function.
        Click a role to show or hide it.
      </p>
      <div style={{display:"flex",flexWrap:"wrap",gap:"8px 12px",marginBottom:16}}>
        {OFFICE_ROLES.map((role, i) => {
          const isHidden = hidden.has(role);
          return (
            <button
              key={role}
              onClick={() => toggle(role)}
              style={{
                display:"flex", alignItems:"center", gap:7,
                fontSize:12, color: isHidden ? B.gray400 : B.gray600,
                background: isHidden ? B.gray50 : B.white,
                border:`1.5px solid ${isHidden ? B.gray200 : B.gray200}`,
                borderRadius:20, padding:"5px 12px 5px 8px",
                cursor:"pointer", transition:"all .15s",
                textDecoration: isHidden ? "line-through" : "none",
                opacity: isHidden ? 0.55 : 1,
              }}
            >
              <div style={{
                width:11, height:11, borderRadius:2, flexShrink:0,
                background: ROLE_COLORS[i],
                opacity: isHidden ? 0.3 : 1,
                transition:"opacity .15s",
              }}/>
              {role}
            </button>
          );
        })}
      </div>
      <HiringFlowChart responses={responses} visibleRoles={visibleRoles} roleColors={ROLE_COLORS} />
    </div>
  );
}


// ─── Hiring flow % chart ──────────────────────────────────────────
function HiringFlowPctChart({ responses, visibleRoles, roleColors }) {
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({x:0,y:0});
  const svgRef = useRef(null);

  const COLORS = roleColors || ["#1A2B4A","#2ABFAA","#F4A623","#6C7EAA","#4A90C4","#F7C97A"];
  const activeRoles = visibleRoles || OFFICE_ROLES;

  // For each band, compute % of respondents who have each role hired
  const matrix = HOUR_RANGES.map(band => {
    const sub = responses.filter(r => r.q2 === band);
    const n = sub.length || 1;
    const entry = { band, n };
    OFFICE_ROLES.forEach(role => {
      entry[role] = sub.filter(r => r.q5[role] > 0).length / n * 100;
    });
    return entry;
  });

  const W = 860, H = 340;
  const PAD = { top: 24, right: 24, bottom: 52, left: 60 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const n = HOUR_RANGES.length;

  // Stack percentages
  const stacked = activeRoles.map((role, ki) => {
    return matrix.map((d, di) => {
      const lower = activeRoles.slice(0, ki).reduce((s, k) => s + (d[k] || 0), 0);
      const upper = lower + (d[role] || 0);
      return { di, y0: lower, y1: upper, role, band: d.band, value: d[role] || 0, n: d.n };
    });
  });

  const maxY = Math.max(...matrix.map(d =>
    activeRoles.reduce((s, r) => s + (d[r] || 0), 0)
  ), 1);

  const xScale = i => PAD.left + (i / (n - 1)) * iW;
  const yScale = v => PAD.top + iH - (v / maxY) * iH;

  function monotonePath(pts) {
    const m = pts.length;
    if (m < 2) return '';
    const dx = [], sl = [], tang = [];
    for (let i = 0; i < m-1; i++) {
      dx[i] = pts[i+1][0] - pts[i][0];
      sl[i] = (pts[i+1][1] - pts[i][1]) / dx[i];
    }
    tang[0] = sl[0]; tang[m-1] = sl[m-2];
    for (let i = 1; i < m-1; i++) {
      tang[i] = sl[i-1]*sl[i] <= 0 ? 0 : (sl[i-1]+sl[i])/2;
    }
    for (let i = 0; i < m-1; i++) {
      if (Math.abs(sl[i]) < 1e-9) { tang[i]=tang[i+1]=0; continue; }
      const a=tang[i]/sl[i], b=tang[i+1]/sl[i], s2=a*a+b*b;
      if (s2>9) { const r=3/Math.sqrt(s2); tang[i]*=r; tang[i+1]*=r; }
    }
    let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < m-1; i++) {
      const cp1x=pts[i][0]+dx[i]/3, cp1y=pts[i][1]+tang[i]*dx[i]/3;
      const cp2x=pts[i+1][0]-dx[i]/3, cp2y=pts[i+1][1]-tang[i+1]*dx[i]/3;
      d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${pts[i+1][0].toFixed(2)},${pts[i+1][1].toFixed(2)}`;
    }
    return d;
  }

  function buildAreaPath(layer) {
    const upper = layer.map(p => [xScale(p.di), yScale(p.y1)]);
    const lower = layer.map(p => [xScale(p.di), yScale(p.y0)]);
    const lowerRev = [...lower].reverse();
    return monotonePath(upper) + ' ' + monotonePath(lowerRev).replace(/^M/, 'L') + ' Z';
  }

  function handleMouseMove(e, role, origIdx) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const svgY = (e.clientY - rect.top) * (H / rect.height);
    const bi = Math.max(0, Math.min(n-1, Math.round((svgX - PAD.left) / (iW / (n-1)))));
    const pct = matrix[bi][role] || 0;
    const band = HOUR_RANGES[bi];
    setHovered({ role, color: COLORS[origIdx] || COLORS[0], pct, band });
    setTooltipPos({ x: svgX, y: svgY });
  }

  // Y ticks as percentages
  const yTicks = Array.from({length:5}, (_,i) => Math.round(maxY*i/4));
  const xLabels = ["0–500","501–1k","1–1.5k","1.5–2k","2–2.5k","2.5–3k","3k+"];

  return (
    <div style={{position:"relative"}}>
      <svg ref={svgRef} viewBox={"0 0 "+W+" "+H} style={{width:"100%",display:"block"}}>
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={yScale(v)} x2={W-PAD.right} y2={yScale(v)}
              stroke={B.gray100} strokeWidth="1"/>
            <text x={PAD.left-6} y={yScale(v)+4} fontSize="10" fill={B.gray400} textAnchor="end">
              {Math.round(v)}%
            </text>
          </g>
        ))}

        {stacked.map((layer, li) => {
          const role = activeRoles[li];
          const origIdx = OFFICE_ROLES.indexOf(role);
          const color = COLORS[origIdx] || COLORS[li];
          return (
            <path
              key={role}
              d={buildAreaPath(layer)}
              fill={color}
              fillOpacity={hovered && hovered.role !== role ? 0.35 : 0.88}
              style={{cursor:"pointer",transition:"fill-opacity .15s"}}
              onMouseMove={e => handleMouseMove(e, role, origIdx)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        <line x1={PAD.left} y1={H-PAD.bottom} x2={W-PAD.right} y2={H-PAD.bottom}
          stroke={B.gray200} strokeWidth="1"/>
        {xLabels.map((lbl, i) => (
          <text key={lbl} x={xScale(i)} y={H-PAD.bottom+14}
            fontSize="10" fill={B.gray600} textAnchor="middle">{lbl}</text>
        ))}
        <text x={PAD.left+iW/2} y={H-6}
          fontSize="11" fill={B.gray400} textAnchor="middle">Weekly billable hours</text>
        <text
          transform={"rotate(-90,14," + (PAD.top + iH/2) + ")"}
          x={14} y={PAD.top + iH/2}
          fontSize="11" fill={B.gray400} textAnchor="middle"
        >% of agencies with role hired</text>

        {hovered && (() => {
          const tx = Math.min(tooltipPos.x + 12, W - 170);
          const ty = Math.max(tooltipPos.y - 44, 4);
          return (
            <g style={{pointerEvents:"none"}}>
              <rect x={tx} y={ty} width={162} height={40} rx="5" fill={B.navy} opacity="0.93"/>
              <rect x={tx} y={ty} width={8} height={40} fill={hovered.color}/>
              <text x={tx+16} y={ty+14} fontSize="11" fontWeight="600" fill="white">
                {hovered.role.split('/')[0]}
              </text>
              {hovered.role.indexOf('/') > 0 && (
                <text x={tx+16} y={ty+26} fontSize="11" fontWeight="600" fill="white">
                  {hovered.role.split('/')[1]}
                </text>
              )}
              <text x={tx+16} y={hovered.role.indexOf('/') > 0 ? ty+37 : ty+27}
                fontSize="10" fill={B.tealLight}>
                {hovered.pct.toFixed(1)}% of agencies · {hovered.band}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ─── Flow chart % section wrapper ────────────────────────────────
function FlowChartPctSection({ responses }) {
  const ROLE_COLORS = [
    "#1A2B4A","#2ABFAA","#F4A623","#6C7EAA","#4A90C4","#F7C97A"
  ];
  const [hidden, setHidden] = useState(new Set());

  function toggle(role) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  const visibleRoles = OFFICE_ROLES.filter(r => !hidden.has(r));

  return (
    <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
      padding:"24px",marginBottom:48}}>
      <SectionTitle>Role adoption rate by agency size</SectionTitle>
      <p style={{fontSize:14,color:B.gray600,marginBottom:16,lineHeight:1.6}}>
        For each size band, the percentage of agencies that have hired for each role.
        Click a role to show or hide it.
      </p>
      <div style={{display:"flex",flexWrap:"wrap",gap:"8px 12px",marginBottom:16}}>
        {OFFICE_ROLES.map((role, i) => {
          const isHidden = hidden.has(role);
          return (
            <button
              key={role}
              onClick={() => toggle(role)}
              style={{
                display:"flex", alignItems:"center", gap:7,
                fontSize:12, color: isHidden ? B.gray400 : B.gray600,
                background: isHidden ? B.gray50 : B.white,
                border:`1.5px solid ${B.gray200}`,
                borderRadius:20, padding:"5px 12px 5px 8px",
                cursor:"pointer", transition:"all .15s",
                textDecoration: isHidden ? "line-through" : "none",
                opacity: isHidden ? 0.55 : 1,
              }}
            >
              <div style={{
                width:11, height:11, borderRadius:2, flexShrink:0,
                background: ROLE_COLORS[i],
                opacity: isHidden ? 0.3 : 1,
                transition:"opacity .15s",
              }}/>
              {role}
            </button>
          );
        })}
      </div>
      <HiringFlowPctChart responses={responses} visibleRoles={visibleRoles} roleColors={ROLE_COLORS} />
    </div>
  );
}


// ─── Admin panel ─────────────────────────────────────────────────
function AdminLogin({ onAuth }) {
  const [pw,setPw] = useState(""); const [err,setErr] = useState("");
  function tryLogin() {
    if(pw===ADMIN_PASSWORD) onAuth();
    else setErr("Incorrect password.");
  }
  return (
    <div style={{minHeight:"100vh",background:B.gray50}}>
      <Header />
      <div style={{maxWidth:400,margin:"80px auto",padding:"40px",
        background:B.white,borderRadius:12,border:`1.5px solid ${B.gray200}`}}>
        <h2 style={{fontSize:22,fontWeight:700,color:B.navy,marginBottom:20}}>Admin access</h2>
        <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}}
          placeholder="Enter admin password"
          onKeyDown={e=>e.key==="Enter"&&tryLogin()}
          style={{width:"100%",padding:"12px 16px",fontSize:15,borderRadius:8,
            border:`1.5px solid ${B.gray200}`,marginBottom:12,boxSizing:"border-box"}} />
        {err && <p style={{fontSize:14,color:"#C0392B",marginBottom:12}}>{err}</p>}
        <Btn onClick={tryLogin} style={{width:"100%"}}>Sign in</Btn>
      </div>
    </div>
  );
}

function AdminPanel() {
  const [authed,setAuthed] = useState(false);
  const [responses,setResponses] = useState([]);
  const [editing,setEditing] = useState(null);
  const [editData,setEditData] = useState(null);

  useEffect(()=>{
    if(authed) {
      loadResponses().then(setResponses);
    }
  },[authed]);

  async function del(id) {
    if(!confirm("Delete this response?")) return;
    await deleteResponse(id);
    setResponses(responses.filter(r=>r.id!==id));
  }
  function startEdit(r) { setEditing(r.id); setEditData({...r,q5:{...r.q5},q6:{...r.q6}}); }
  async function saveEdit() {
    await updateResponse(editData);
    setResponses(responses.map(r=>r.id===editing?editData:r));
    setEditing(null);
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(responses,null,2)],{type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "sallysupport_responses.json"; a.click();
  }

  if(!authed) return <AdminLogin onAuth={()=>setAuthed(true)} />;

  return (
    <div style={{minHeight:"100vh",background:B.gray50}}>
      <Header right={
        <div style={{display:"flex",gap:10}}>
          <Btn small secondary onClick={exportJSON}>Export JSON</Btn>
          <Btn small secondary onClick={()=>setAuthed(false)}>Sign out</Btn>
        </div>
      }/>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 20px"}}>
        <h1 style={{fontSize:26,fontWeight:700,color:B.navy,marginBottom:4}}>Response manager</h1>
        <p style={{fontSize:14,color:B.gray600,marginBottom:28}}>
          {responses.length} total response{responses.length!==1?"s":""}.
          You can view, edit, or delete any entry.
        </p>

        {responses.length===0 && (
          <div style={{textAlign:"center",padding:60,color:B.gray400}}>No responses yet.</div>
        )}

        {responses.map(r=>(
          <div key={r.id} style={{background:B.white,border:`1.5px solid ${B.gray200}`,
            borderRadius:10,padding:"20px 24px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
              flexWrap:"wrap",gap:12,marginBottom:12}}>
              <div>
                <span style={{fontSize:13,fontFamily:"monospace",color:B.gray400}}>{r.id}</span>
                <span style={{marginLeft:12,fontSize:13,color:B.gray400}}>
                  {new Date(r.ts).toLocaleString()}
                </span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn small secondary onClick={()=>startEdit(r)}>Edit</Btn>
                <Btn small onClick={()=>del(r.id)} style={{background:"#C0392B"}}>Delete</Btn>
              </div>
            </div>

            {editing===r.id ? (
              <div style={{borderTop:`1px solid ${B.gray200}`,paddingTop:16}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                  <div>
                    <label style={{fontSize:13,color:B.gray600,display:"block",marginBottom:4}}>Location</label>
                    <select value={editData.q1} onChange={e=>setEditData({...editData,q1:e.target.value})}
                      style={{width:"100%",padding:"8px 12px",fontSize:14,borderRadius:6,
                        border:`1px solid ${B.gray200}`}}>
                      {ALL_LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:13,color:B.gray600,display:"block",marginBottom:4}}>Billable hours</label>
                    <select value={editData.q2} onChange={e=>setEditData({...editData,q2:e.target.value})}
                      style={{width:"100%",padding:"8px 12px",fontSize:14,borderRadius:6,
                        border:`1px solid ${B.gray200}`}}>
                      {HOUR_RANGES.map(h=><option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:13,color:B.gray600,display:"block",marginBottom:4}}>Agency type</label>
                    <input value={editData.q3} onChange={e=>setEditData({...editData,q3:e.target.value})}
                      style={{width:"100%",padding:"8px 12px",fontSize:14,borderRadius:6,
                        border:`1px solid ${B.gray200}`}} />
                  </div>
                  <div>
                    <label style={{fontSize:13,color:B.gray600,display:"block",marginBottom:4}}>Payer source</label>
                    <input value={editData.q4} onChange={e=>setEditData({...editData,q4:e.target.value})}
                      style={{width:"100%",padding:"8px 12px",fontSize:14,borderRadius:6,
                        border:`1px solid ${B.gray200}`}} />
                  </div>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:13,color:B.gray600,display:"block",marginBottom:8}}>
                    Hiring order (Q5):
                  </label>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                    {OFFICE_ROLES.map(role=>(
                      <div key={role} style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:12,flex:1,color:B.navy}}>{role}</span>
                        <input type="number" min="0" value={editData.q5[role]||""}
                          onChange={e=>setEditData({...editData,q5:{...editData.q5,
                            [role]:parseInt(e.target.value,10)||0}})}
                          style={{width:50,padding:"4px 8px",fontSize:13,borderRadius:4,
                            border:`1px solid ${B.gray200}`,textAlign:"center"}} />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <Btn small onClick={saveEdit}>Save changes</Btn>
                  <Btn small secondary onClick={()=>setEditing(null)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
                gap:12,fontSize:13}}>
                <div><span style={{color:B.gray400}}>Location: </span><strong>{r.q1}</strong></div>
                <div><span style={{color:B.gray400}}>Hours: </span><strong>{r.q2}</strong></div>
                <div><span style={{color:B.gray400}}>Type: </span><strong>{r.q3}</strong></div>
                <div><span style={{color:B.gray400}}>Payer: </span><strong>{r.q4}</strong></div>
                <div><span style={{color:B.gray400}}>Roles hired: </span>
                  <strong>{OFFICE_ROLES.filter(role=>r.q5[role]>0).length}</strong></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root app ────────────────────────────────────────────────────
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("access");
  const urlAdmin = params.get("admin") === "1";
  const storedToken = localStorage.getItem(TOKEN_KEY);

  const [view, setView] = useState("loading");
  const [token, setToken] = useState(urlToken || storedToken || null);
  const [responses, setResponses] = useState([]);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function init() {
      await seedIfEmpty();
      const data = await loadResponses();
      setResponses(data);
      setDbReady(true);

      // Determine initial view
      if (urlAdmin) { setView("admin"); return; }
      const hasToken = urlToken || storedToken;
      if (hasToken) {
        const found = data.find(r => r.id === (urlToken || storedToken));
        if (found) { setView("dashboard"); return; }
      }
      setView("welcome");
    }
    init();
  }, []);

  function handleSurveyComplete(t) { setToken(t); setView("thankyou"); }
  function handleDashboard() {
    loadResponses().then(data => { setResponses(data); setView("dashboard"); });
  }

  if (view === "loading") return (
    <div style={{minHeight:"100vh",background:"#F8F9FA",display:"flex",
      alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:"3px solid #DDE0E6",
          borderTopColor:"#1A2B4A",borderRadius:"50%",
          animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        <p style={{color:"#9AA0AD",fontSize:14}}>Loading…</p>
      </div>
    </div>
  );

  if (view === "admin") return <AdminPanel />;
  if (view === "welcome") return <Welcome onStart={()=>setView("survey")} onAdmin={()=>setView("admin")} />;
  if (view === "survey") return <Survey onComplete={handleSurveyComplete} />;
  if (view === "thankyou") return <ThankYou token={token} onDashboard={handleDashboard} />;
  if (view === "dashboard") return <Dashboard onBack={null} responses={responses} />;
  return <ReturningUser onValid={t=>{setToken(t);setView("dashboard");}} onTakeSurvey={()=>setView("welcome")} />;
}
