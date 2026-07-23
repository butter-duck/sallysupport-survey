import { useState, useEffect, useCallback, useRef } from "react";
import * as d3 from "d3";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import sallysupportLogo from "./assets/sallysupport-logo.png";
import reelHomeCareLogo from "./assets/partners/reel-home-care.webp";
import homeCareStrategyLabLogo from "./assets/partners/home-care-strategy-lab.svg";
import momentumLogo from "./assets/partners/momentum.png";
import simitreeLogo from "./assets/partners/simitree.svg";

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
const MARKET_TYPES = ["Urban","Rural","Mixed"];
const TIME_TO_FIRST_HIRE = ["Less than 6 months","6–12 months","1–2 years","2–3 years","More than 3 years","Have not yet hired"];

// ─── Partners ────────────────────────────────────────────────────
// logo: bundled locally from src/assets/partners (see imports above) so
//       rendering doesn't depend on the partner's site staying up/unchanged.
//       Partners without a usable source file fall back to a styled wordmark.
// darkBg: true when the logo art is white and needs a dark tile behind it.
const PARTNERS = [
  {
    name: "Vitable Health",
    logo: null,
    url: "https://www.vitablehealth.com",
    blurb: "Health benefits built for hourly and caregiving workforces, with primary care at the center of every plan.",
  },
  {
    name: "Reel Home Care Consulting",
    logo: reelHomeCareLogo,
    url: "https://reelhomecareconsulting.com",
    blurb: "Founded by a former #1-rated agency owner, helping home care operators build profitable agencies without burning out.",
  },
  {
    name: "Briones Consulting Group",
    logo: null,
    url: "https://thebrionesgroup.com",
    blurb: "Senior care growth strategists guiding private-pay agency owners through scaling, operations, and exit planning.",
  },
  {
    name: "Home Care Strategy Lab",
    logo: homeCareStrategyLabLogo,
    darkBg: true,
    url: "https://www.homecarestrategylab.com",
    blurb: "A podcast and community putting high-growth home care agencies under the microscope to find what actually works.",
  },
  {
    name: "Momentum HC & Technology Consulting",
    logo: momentumLogo,
    darkBg: true,
    url: "https://www.momentumhtconsulting.com",
    blurb: "Independent advisory firm helping care-at-home providers align strategy, operations, and technology to scale.",
  },
  {
    name: "SimiTree",
    logo: simitreeLogo,
    darkBg: true,
    url: "https://simitreehc.com",
    blurb: "Post-acute consulting, revenue cycle management, coding, and analytics for home health, hospice, and behavioral health.",
  },
];
const OFFICE_ROLES = ["Sales/marketing","Executive assistant/reception","Scheduling/care coordination","Billing","HR/Recruitment","Field supervisor"];

const PIE_COLORS = ["#1A2B4A","#2ABFAA","#F4A623","#6C7EAA","#A8D5CE","#F7C97A","#8B9DC3"];

// ─── Dummy seed data (preview only — full data lives in Supabase) ─
const DUMMY_SEED = [{"id": "x1945nq45347", "ts": 1781589915144, "q1": "Virginia", "q2": "0\u2013500", "q3": "Independent", "q4": "Medicaid", "q5": {"Scheduling/care coordination": 1, "Billing": 2}, "q5Other": "", "q6": {"Sales/marketing": "Not applicable", "Executive assistant/reception": "Not applicable", "Scheduling/care coordination": "Full-time", "Billing": "Full-time", "HR/Recruitment": "Not applicable", "Field supervisor": "Not applicable"}, "q7": {"Scheduling/care coordination": "1", "Billing": "1"}, "q8": "2\u20133 years", "q9": "Urban", "q10": "Field supervisor", "q11": "No", "q11Positions": [], "q12Email": "", "q12Consent": false, "q13": "Billing"}, {"id": "vg0fn9xua608", "ts": 1780240251661, "q1": "New Jersey", "q2": "0\u2013500", "q3": "Franchise network", "q4": "Medicaid", "q5": {"Scheduling/care coordination": 1}, "q5Other": "", "q6": {"Sales/marketing": "Not applicable", "Executive assistant/reception": "Not applicable", "Scheduling/care coordination": "Full-time", "Billing": "Not applicable", "HR/Recruitment": "Not applicable", "Field supervisor": "Not applicable"}, "q7": {"Scheduling/care coordination": "2"}, "q8": "2\u20133 years", "q9": "Mixed", "q10": "Executive assistant/reception", "q11": "No", "q11Positions": [], "q12Email": "", "q12Consent": false, "q13": "Sales/marketing"}, {"id": "r7tcs4cc786c", "ts": 1781734202799, "q1": "Kansas", "q2": "501\u20131,000", "q3": "Independent", "q4": "Veterans Affairs", "q5": {"Scheduling/care coordination": 1, "Billing": 2, "Executive assistant/reception": 3}, "q5Other": "", "q6": {"Sales/marketing": "Not applicable", "Executive assistant/reception": "Full-time", "Scheduling/care coordination": "Full-time", "Billing": "Hybrid", "HR/Recruitment": "Not applicable", "Field supervisor": "Not applicable"}, "q7": {"Executive assistant/reception": "1", "Scheduling/care coordination": "1", "Billing": "1"}, "q8": "6\u201312 months", "q9": "Urban", "q10": "Sales/marketing", "q11": "Yes", "q11Positions": ["Sales/marketing"], "q12Email": "", "q12Consent": false, "q13": "Scheduling/care coordination"}, {"id": "bcxuljyl87fe", "ts": 1781699887270, "q1": "Kentucky", "q2": "501\u20131,000", "q3": "Independent", "q4": "Long-term care insurance", "q5": {"Scheduling/care coordination": 1}, "q5Other": "", "q6": {"Sales/marketing": "Not applicable", "Executive assistant/reception": "Not applicable", "Scheduling/care coordination": "Full-time", "Billing": "Not applicable", "HR/Recruitment": "Not applicable", "Field supervisor": "Not applicable"}, "q7": {"Scheduling/care coordination": "3"}, "q8": "1\u20132 years", "q9": "Urban", "q10": "Sales/marketing", "q11": "No", "q11Positions": [], "q12Email": "", "q12Consent": false, "q13": "Scheduling/care coordination"}, {"id": "q2y9v86wda7d", "ts": 1782353092123, "q1": "Delaware", "q2": "1,001\u20131,500", "q3": "Independent", "q4": "Long-term care insurance", "q5": {"Scheduling/care coordination": 1, "Billing": 2, "Executive assistant/reception": 3, "Sales/marketing": 4}, "q5Other": "", "q6": {"Sales/marketing": "Full-time", "Executive assistant/reception": "Full-time", "Scheduling/care coordination": "Part-time", "Billing": "Full-time", "HR/Recruitment": "Not applicable", "Field supervisor": "Not applicable"}, "q7": {"Sales/marketing": "1", "Executive assistant/reception": "1", "Scheduling/care coordination": "4", "Billing": "1"}, "q8": "1\u20132 years", "q9": "Urban", "q10": "Field supervisor", "q11": "No", "q11Positions": [], "q12Email": "", "q12Consent": false, "q13": "HR/Recruitment"}, {"id": "14j1ripz780f", "ts": 1781167007513, "q1": "Texas", "q2": "1,001\u20131,500", "q3": "Independent", "q4": "Veterans Affairs", "q5": {"Scheduling/care coordination": 1, "Executive assistant/reception": 2}, "q5Other": "", "q6": {"Sales/marketing": "Not applicable", "Executive assistant/reception": "Full-time", "Scheduling/care coordination": "Hybrid", "Billing": "Not applicable", "HR/Recruitment": "Not applicable", "Field supervisor": "Not applicable"}, "q7": {"Executive assistant/reception": "1", "Scheduling/care coordination": "1"}, "q8": "Less than 6 months", "q9": "Urban", "q10": "Sales/marketing", "q11": "No", "q11Positions": [], "q12Email": "", "q12Consent": false, "q13": "HR/Recruitment"}, {"id": "xfgcaqvk7684", "ts": 1781237401063, "q1": "South Dakota", "q2": "1,501\u20132,000", "q3": "Independent", "q4": "Long-term care insurance", "q5": {"Scheduling/care coordination": 1, "Billing": 2, "Executive assistant/reception": 3, "HR/Recruitment": 4, "Field supervisor": 5}, "q5Other": "", "q6": {"Sales/marketing": "Not applicable", "Executive assistant/reception": "Part-time", "Scheduling/care coordination": "Full-time", "Billing": "Part-time", "HR/Recruitment": "Part-time", "Field supervisor": "Full-time"}, "q7": {"Executive assistant/reception": "2", "Scheduling/care coordination": "2", "Billing": "5", "HR/Recruitment": "5", "Field supervisor": "1"}, "q8": "Less than 6 months", "q9": "Urban", "q10": "Sales/marketing", "q11": "Yes", "q11Positions": ["Scheduling/care coordination", "Sales/marketing"], "q12Email": "", "q12Consent": false, "q13": "Field supervisor"}, {"id": "2wx7ptx648d3", "ts": 1780306702926, "q1": "Delaware", "q2": "1,501\u20132,000", "q3": "Independent", "q4": "Medicaid", "q5": {"Scheduling/care coordination": 1, "Executive assistant/reception": 2, "Field supervisor": 3}, "q5Other": "", "q6": {"Sales/marketing": "Not applicable", "Executive assistant/reception": "Full-time", "Scheduling/care coordination": "Part-time", "Billing": "Not applicable", "HR/Recruitment": "Not applicable", "Field supervisor": "Full-time"}, "q7": {"Executive assistant/reception": "5", "Scheduling/care coordination": "2", "Field supervisor": "5"}, "q8": "6\u201312 months", "q9": "Mixed", "q10": "Billing", "q11": "No", "q11Positions": [], "q12Email": "", "q12Consent": false, "q13": "Executive assistant/reception"}, {"id": "lvxwqzxe1737", "ts": 1780159824875, "q1": "Rhode Island", "q2": "2,001\u20132,500", "q3": "Independent", "q4": "Private pay", "q5": {"Scheduling/care coordination": 1, "Billing": 2, "HR/Recruitment": 3, "Sales/marketing": 4}, "q5Other": "", "q6": {"Sales/marketing": "Full-time", "Executive assistant/reception": "Not applicable", "Scheduling/care coordination": "Full-time", "Billing": "Full-time", "HR/Recruitment": "Hybrid", "Field supervisor": "Not applicable"}, "q7": {"Sales/marketing": "4", "Scheduling/care coordination": "2", "Billing": "4", "HR/Recruitment": "5"}, "q8": "Less than 6 months", "q9": "Rural", "q10": "Executive assistant/reception", "q11": "Yes", "q11Positions": ["Scheduling/care coordination", "Sales/marketing"], "q12Email": "", "q12Consent": false, "q13": "Scheduling/care coordination"}, {"id": "nn8ztv0532b2", "ts": 1782101729519, "q1": "New Hampshire", "q2": "2,001\u20132,500", "q3": "Independent", "q4": "Medicaid", "q5": {"Scheduling/care coordination": 1, "Billing": 2, "Executive assistant/reception": 3, "HR/Recruitment": 4}, "q5Other": "", "q6": {"Sales/marketing": "Not applicable", "Executive assistant/reception": "Full-time", "Scheduling/care coordination": "Part-time", "Billing": "Full-time", "HR/Recruitment": "Part-time", "Field supervisor": "Not applicable"}, "q7": {"Executive assistant/reception": "3", "Scheduling/care coordination": "7", "Billing": "7", "HR/Recruitment": "1"}, "q8": "1\u20132 years", "q9": "Urban", "q10": "Field supervisor", "q11": "Yes", "q11Positions": ["Executive assistant/reception"], "q12Email": "", "q12Consent": false, "q13": "Sales/marketing"}, {"id": "7lxxezdua82e", "ts": 1780548870021, "q1": "Oklahoma", "q2": "2,501\u20133,000", "q3": "Franchise network", "q4": "Long-term care insurance", "q5": {"Scheduling/care coordination": 1, "Billing": 2, "Executive assistant/reception": 3, "HR/Recruitment": 4, "Field supervisor": 5, "Sales/marketing": 6}, "q5Other": "", "q6": {"Sales/marketing": "Hybrid", "Executive assistant/reception": "Part-time", "Scheduling/care coordination": "Hybrid", "Billing": "Full-time", "HR/Recruitment": "Hybrid", "Field supervisor": "Part-time"}, "q7": {"Sales/marketing": "3", "Executive assistant/reception": "7", "Scheduling/care coordination": "6", "Billing": "5", "HR/Recruitment": "3", "Field supervisor": "4"}, "q8": "1\u20132 years", "q9": "Urban", "q10": "Scheduling/care coordination", "q11": "No", "q11Positions": [], "q12Email": "", "q12Consent": false, "q13": "Scheduling/care coordination"}, {"id": "l8m1g9fk33c8", "ts": 1782180510715, "q1": "Wisconsin", "q2": "2,501\u20133,000", "q3": "Franchise network", "q4": "Medicaid", "q5": {"Scheduling/care coordination": 1, "Billing": 2, "HR/Recruitment": 3, "Field supervisor": 4}, "q5Other": "", "q6": {"Sales/marketing": "Not applicable", "Executive assistant/reception": "Not applicable", "Scheduling/care coordination": "Full-time", "Billing": "Hybrid", "HR/Recruitment": "Full-time", "Field supervisor": "Part-time"}, "q7": {"Scheduling/care coordination": "6", "Billing": "2", "HR/Recruitment": "2", "Field supervisor": "7"}, "q8": "6\u201312 months", "q9": "Rural", "q10": "Sales/marketing", "q11": "No", "q11Positions": [], "q12Email": "", "q12Consent": false, "q13": "Scheduling/care coordination"}, {"id": "v4ykadejbb47", "ts": 1781731963069, "q1": "Washington", "q2": "3,001+", "q3": "Franchise network", "q4": "Long-term care insurance", "q5": {"Scheduling/care coordination": 1, "Billing": 2, "Executive assistant/reception": 3, "HR/Recruitment": 4, "Field supervisor": 5, "Sales/marketing": 6}, "q5Other": "", "q6": {"Sales/marketing": "Full-time", "Executive assistant/reception": "Full-time", "Scheduling/care coordination": "Full-time", "Billing": "Full-time", "HR/Recruitment": "Full-time", "Field supervisor": "Full-time"}, "q7": {"Sales/marketing": "2", "Executive assistant/reception": "6", "Scheduling/care coordination": "6", "Billing": "10", "HR/Recruitment": "5", "Field supervisor": "1"}, "q8": "Less than 6 months", "q9": "Mixed", "q10": "HR/Recruitment", "q11": "Yes", "q11Positions": ["Sales/marketing", "Executive assistant/reception"], "q12Email": "", "q12Consent": false, "q13": "Sales/marketing"}, {"id": "knqt3wve3180", "ts": 1781691803583, "q1": "West Virginia", "q2": "3,001+", "q3": "Independent", "q4": "Veterans Affairs", "q5": {"Scheduling/care coordination": 1, "Billing": 2, "Executive assistant/reception": 3, "HR/Recruitment": 4, "Field supervisor": 5, "Sales/marketing": 6}, "q5Other": "", "q6": {"Sales/marketing": "Full-time", "Executive assistant/reception": "Full-time", "Scheduling/care coordination": "Full-time", "Billing": "Part-time", "HR/Recruitment": "Hybrid", "Field supervisor": "Hybrid"}, "q7": {"Sales/marketing": "12", "Executive assistant/reception": "8", "Scheduling/care coordination": "9", "Billing": "2", "HR/Recruitment": "7", "Field supervisor": "2"}, "q8": "2\u20133 years", "q9": "Rural", "q10": "HR/Recruitment", "q11": "Yes", "q11Positions": ["Scheduling/care coordination", "Sales/marketing"], "q12Email": "", "q12Consent": false, "q13": "Executive assistant/reception"}];
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

async function loadSettings() {
  try {
    const rows = await sbFetch("/rest/v1/settings?key=eq.key_findings&select=value");
    if (rows && rows.length > 0) return rows[0].value;
    return null;
  } catch(e) {
    console.warn("loadSettings failed:", e.message);
    return null;
  }
}

async function saveSettings(key, value) {
  try {
    await sbFetch("/rest/v1/settings", {
      method: "POST",
      prefer: "return=minimal,resolution=merge-duplicates",
      headers: { "Prefer": "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    });
    return true;
  } catch(e) {
    console.error("saveSettings failed:", e.message);
    return false;
  }
}


async function loadResponses() {
  // Local fallback data (used when Supabase is unreachable)
  function getLocalFallback() {
    try {
      const raw = localStorage.getItem("ss_fallback");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  try {
    const rows = await sbFetch("/rest/v1/responses?select=id,data&order=data->>ts.asc");
    const remote = rows.map(r => ({ id: r.id, ...r.data }));
    // Merge any local-only entries not yet in remote
    const remoteIds = new Set(remote.map(r => r.id));
    const local = getLocalFallback().filter(r => !remoteIds.has(r.id));
    return [...remote, ...local];
  } catch(e) {
    console.warn("Supabase unavailable, using localStorage:", e.message);
    // Supabase unreachable — return dummy seed + any local submissions
    const local = getLocalFallback();
    const localIds = new Set(local.map(r => r.id));
    const seed = DUMMY_SEED.filter(r => !localIds.has(r.id));
    return [...seed, ...local];
  }
}

async function addResponse(response) {
  try {
    await sbFetch("/rest/v1/responses", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({ id: response.id, data: response }),
    });
  } catch(e) {
    // Supabase unavailable (e.g. sandbox) — fall back to localStorage
    console.warn("Supabase unavailable, using localStorage:", e.message);
    try {
      const raw = localStorage.getItem("ss_fallback") || "[]";
      const arr = JSON.parse(raw);
      arr.push(response);
      localStorage.setItem("ss_fallback", JSON.stringify(arr));
    } catch(le) { console.error("localStorage fallback failed:", le); }
  }
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
  } catch {
    // Fall back to local count
    try {
      const raw = localStorage.getItem("ss_fallback");
      return raw ? JSON.parse(raw).length : 0;
    } catch { return 0; }
  }
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
  } catch(e) {
    // Supabase down — DUMMY_SEED used as fallback in loadResponses
    console.warn("seedIfEmpty skipped:", e.message);
  }
}

function genToken() {
  return Math.random().toString(36).slice(2,10) + Date.now().toString(36);
}


// ─── Shared UI pieces ────────────────────────────────────────────
function Logo() {
  return (
    <a href="https://sallysupport.com/?utm_source=benchmark_report&utm_medium=survey&utm_campaign=staffing_benchmark"
      target="_blank" rel="noopener noreferrer"
      style={{display:"flex",alignItems:"center",textDecoration:"none"}}>
      <img src={sallysupportLogo}
        alt="SallySupport" style={{height:40,objectFit:"contain"}} />
    </a>
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
        To the best of your recollection, enter a number (1 = first hired, 2 = second, etc.) for each role you have hired for.
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
  const opts = ["Full-time","Part-time","Hybrid","Not applicable"];
  const allRoles = [...OFFICE_ROLES, ...(q5OtherText.trim()?[q5OtherText.trim()]:["Other"])];
  return (
    <>
      <QLabel>Do you currently employ staff in these positions?</QLabel>
      <QSub>For each role, indicate the employment arrangement. Select all that best apply — hybrid means some days in-office, some remote.</QSub>
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

// Q7 — Headcount per role
function Q7({ values, onChange, q5OtherText, q6Values }) {
  const COUNTS = ["Not applicable","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","15+"];
  // Only show roles that have been hired (q6 !== "Not applicable")
  const hiredRoles = [...OFFICE_ROLES, ...(q5OtherText.trim()?[q5OtherText.trim()]:[])]
    .filter(role => q6Values[role] && q6Values[role] !== "Not applicable");

  if (!hiredRoles.length) return (
    <>
      <QLabel>How many employees fill each role?</QLabel>
      <QSub>It looks like you have not hired for any roles yet — skip ahead when ready.</QSub>
    </>
  );

  return (
    <>
      <QLabel>How many employees currently fill each role?</QLabel>
      <QSub>For each office role you have hired for, select the current number of employees in that position.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {hiredRoles.map(role => (
          <div key={role} style={{padding:"14px 18px",borderRadius:8,
            border:`1.5px solid ${B.gray200}`,background:B.white}}>
            <div style={{fontSize:15,fontWeight:600,color:B.navy,marginBottom:12}}>{role}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {COUNTS.filter(c => c !== "Not applicable").map(c => (
                <label key={c} style={{display:"flex",alignItems:"center",gap:6,
                  padding:"6px 14px",borderRadius:20,cursor:"pointer",fontSize:14,
                  border:`1.5px solid ${values[role]===c?B.navy:B.gray200}`,
                  background:values[role]===c?B.tealLight:B.white,
                  color:B.navy,fontWeight:values[role]===c?600:400,transition:"all .15s"}}>
                  <input type="radio" name={`q7_${role}`} value={c}
                    checked={values[role]===c}
                    onChange={()=>onChange({...values,[role]:c})}
                    style={{accentColor:B.navy,width:14,height:14}}/>
                  {c}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}


// Q8 — Time to first hire
function Q8({ value, onChange }) {
  return (
    <>
      <QLabel>How long after starting your agency did you make your first non-owner office hire?</QLabel>
      <QSub>To the best of your recollection, select the timeframe that best applies.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {TIME_TO_FIRST_HIRE.map(t=>(
          <label key={t} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",
            borderRadius:8,border:`1.5px solid ${value===t?B.navy:B.gray200}`,
            background:value===t?B.tealLight:B.white,cursor:"pointer",transition:"all .15s"}}>
            <input type="radio" name="timetohire" value={t} checked={value===t} onChange={()=>onChange(t)}
              style={{accentColor:B.navy,width:18,height:18}}/>
            <span style={{fontSize:15,color:B.navy,fontWeight:value===t?600:400}}>{t}</span>
          </label>
        ))}
      </div>
    </>
  );
}

// Q9 — Market type
function Q9({ value, onChange }) {
  return (
    <>
      <QLabel>What type of geographic market does your agency primarily operate in?</QLabel>
      <QSub>Select the option that primarily describes the area where most of your clients are located.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {MARKET_TYPES.map(t=>(
          <label key={t} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",
            borderRadius:8,border:`1.5px solid ${value===t?B.navy:B.gray200}`,
            background:value===t?B.tealLight:B.white,cursor:"pointer",transition:"all .15s"}}>
            <input type="radio" name="markettype" value={t} checked={value===t} onChange={()=>onChange(t)}
              style={{accentColor:B.navy,width:18,height:18}}/>
            <span style={{fontSize:15,color:B.navy,fontWeight:value===t?600:400}}>{t}</span>
          </label>
        ))}
      </div>
    </>
  );
}


// Q10 — Next intended hire
function Q10({ value, onChange, otherText, onOtherText }) {
  const ALL_ROLES = [...OFFICE_ROLES, "Other"];
  return (
    <>
      <QLabel>What is the next office role you intend to hire for?</QLabel>
      <QSub>Select the position you are most likely to hire for next, whether that is soon or in the future.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {ALL_ROLES.map(role=>(
          <label key={role} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",
            borderRadius:8,border:`1.5px solid ${value===role?B.navy:B.gray200}`,
            background:value===role?B.tealLight:B.white,cursor:"pointer",transition:"all .15s"}}>
            <input type="radio" name="nexthire" value={role} checked={value===role}
              onChange={()=>onChange(role)}
              style={{accentColor:B.navy,width:18,height:18}}/>
            <span style={{fontSize:15,color:B.navy,fontWeight:value===role?600:400}}>{role}</span>
          </label>
        ))}
      </div>
      {value==="Other" && (
        <input value={otherText} onChange={e=>onOtherText(e.target.value)}
          placeholder="Please specify the role…"
          style={{marginTop:12,width:"100%",padding:"12px 16px",fontSize:15,
            border:`1.5px solid ${B.navy}`,borderRadius:8,boxSizing:"border-box"}}/>
      )}
    </>
  );
}

// Q11 — Global/offshore/global remote talent
function Q11({ value, onChange, positions, onPositions }) {
  const opts = ["Yes","No"];
  return (
    <>
      <QLabel>Do you employ offshore/global remote talent?</QLabel>
      <QSub>This includes virtual assistants, offshore staffing agencies, or any remote workers based outside the US or Canada.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {opts.map(o=>(
          <label key={o} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",
            borderRadius:8,border:`1.5px solid ${value===o?B.navy:B.gray200}`,
            background:value===o?B.tealLight:B.white,cursor:"pointer",transition:"all .15s"}}>
            <input type="radio" name="offshore" value={o} checked={value===o}
              onChange={()=>onChange(o)}
              style={{accentColor:B.navy,width:18,height:18}}/>
            <span style={{fontSize:15,color:B.navy,fontWeight:value===o?600:400}}>{o}</span>
          </label>
        ))}
      </div>
      {value==="Yes" && (
        <div>
          <div style={{fontSize:14,fontWeight:600,color:B.navy,marginBottom:10}}>
            Which positions do they fill?
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[...OFFICE_ROLES,"Other"].map(role=>(
              <label key={role} style={{display:"flex",alignItems:"center",gap:12,
                padding:"12px 16px",borderRadius:8,cursor:"pointer",
                border:`1.5px solid ${positions.includes(role)?B.navy:B.gray200}`,
                background:positions.includes(role)?B.tealLight:B.white,transition:"all .15s"}}>
                <input type="checkbox" checked={positions.includes(role)}
                  onChange={e=>{
                    if(e.target.checked) onPositions([...positions,role]);
                    else onPositions(positions.filter(r=>r!==role));
                  }}
                  style={{accentColor:B.navy,width:16,height:16}}/>
                <span style={{fontSize:14,color:B.navy,fontWeight:positions.includes(role)?600:400}}>{role}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Q12 — Email + consent
function Q12({ email, onEmail, consent, onConsent }) {
  return (
    <>
      <QLabel>Stay updated on the results</QLabel>
      <QSub>
        Enter your email to receive updates as more agencies participate and the data evolves.
        Your individual answers are kept strictly confidential — only aggregated, anonymous results are ever shared.
      </QSub>
      <input
        type="email"
        value={email}
        onChange={e=>onEmail(e.target.value)}
        placeholder="your@email.com"
        style={{width:"100%",padding:"13px 16px",fontSize:15,borderRadius:8,
          border:`1.5px solid ${email&&email.includes("@")?B.navy:B.gray200}`,
          marginBottom:20,boxSizing:"border-box"}}
      />
      <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer",
        padding:"14px 16px",borderRadius:8,
        border:`1.5px solid ${consent?B.navy:B.gray200}`,
        background:consent?B.tealLight:B.white,transition:"all .15s"}}>
        <input
          type="checkbox"
          checked={consent}
          onChange={e=>onConsent(e.target.checked)}
          style={{accentColor:B.navy,width:18,height:18,flexShrink:0,marginTop:2}}
        />
        <span style={{fontSize:14,color:B.navy,lineHeight:1.6}}>
          By submitting this survey, I consent to receive occasional email communications from SallySupport
          about this benchmark and related resources. I understand I can unsubscribe at any time.
        </span>
      </label>

    </>
  );
}


// Q13 — Highest turnover role
function Q13({ value, onChange }) {
  return (
    <>
      <QLabel>In which office role do you experience the highest turnover?</QLabel>
      <QSub>Select the position that has seen the most employee churn in your agency.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[...OFFICE_ROLES,"No significant turnover in any role"].map(role=>(
          <label key={role} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",
            borderRadius:8,border:`1.5px solid ${value===role?B.navy:B.gray200}`,
            background:value===role?B.tealLight:B.white,cursor:"pointer",transition:"all .15s"}}>
            <input type="radio" name="turnover" value={role} checked={value===role}
              onChange={()=>onChange(role)}
              style={{accentColor:B.navy,width:18,height:18}}/>
            <span style={{fontSize:15,color:B.navy,fontWeight:value===role?600:400}}>{role}</span>
          </label>
        ))}
      </div>
    </>
  );
}


// ─── Survey flow ─────────────────────────────────────────────────
function Survey({ onComplete }) {
  const [step,setStep] = useState(1);
  const TOTAL = 13;
  const [q1,setQ1] = useState("");
  const [q2,setQ2] = useState("");
  const [q3,setQ3] = useState("");  const [q3Other,setQ3Other] = useState("");
  const [q4,setQ4] = useState("");  const [q4Other,setQ4Other] = useState("");
  const [q5,setQ5] = useState({});  const [q5Other,setQ5Other] = useState("");
  const [q6,setQ6] = useState({});
  const [q7,setQ7] = useState({});
  const [q8,setQ8] = useState("");
  const [q9,setQ9] = useState("");
  const [q10,setQ10] = useState("");  const [q10Other,setQ10Other] = useState("");
  const [q11,setQ11] = useState("");  const [q11Positions,setQ11Positions] = useState([]);
  const [q12Email,setQ12Email] = useState("");  const [q12Consent,setQ12Consent] = useState(false);
  const [q13,setQ13] = useState("");

  const canNext = [
    ()=>!!q1,
    ()=>!!q2,
    ()=>!!q3&&(q3!=="Other"||q3Other.trim()),
    ()=>!!q4&&(q4!=="Other"||q4Other.trim()),
    ()=>true,
    ()=>true,
    ()=>true,
    ()=>!!q8,
    ()=>!!q9,
    ()=>!!q10&&(q10!=="Other"||q10Other.trim()),
    ()=>!!q11,
    ()=>!!q13,
    ()=>!!q12Email&&q12Email.includes("@")&&q12Email.includes("."),
  ][step-1]?.();

  async function next() {
    if(step<TOTAL) setStep(s=>s+1);
    else await submit();
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
      q7: {...q7},
      q8, q9,
      q10: q10==="Other"?`Other: ${q10Other}`:q10,
      q11, q11Positions,
      q12Email, q12Consent,
      q13,
    };
    await addResponse(response);
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
    <Q7 values={q7} onChange={setQ7} q5OtherText={q5Other} q6Values={q6}/>,
    <Q8 value={q8} onChange={setQ8}/>,
    <Q9 value={q9} onChange={setQ9}/>,
    <Q10 value={q10} onChange={setQ10} otherText={q10Other} onOtherText={setQ10Other}/>,
    <Q11 value={q11} onChange={setQ11} positions={q11Positions} onPositions={setQ11Positions}/>,
    <Q13 value={q13} onChange={setQ13}/>,
    <Q12 email={q12Email} onEmail={setQ12Email} consent={q12Consent} onConsent={setQ12Consent}/>,
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
            "In what order do agencies hire for each office role? — what roles agencies hire first",
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
        <PartnerStrip />
        <div style={{marginTop:20,paddingTop:20,borderTop:`1px solid ${B.gray200}`}}>
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

function FilterBar({ filters, setFilters, responses, hoursFilter, setHoursFilter, title }) {
  const [open, setOpen] = useState(false);
  const states = [...new Set(responses.map(r=>r.q1))].filter(Boolean).sort();
  const types = ["Franchise network","Independent"];
  const payers = ["Private pay","Medicaid","Long-term care insurance","Veterans Affairs"];
  const sel = (key,val) => setFilters(f=>({...f,[key]:f[key]===val?"":val}));
  const chip = (active) => ({
    padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",border:"1.5px solid",
    borderColor:active?B.navy:B.gray200,background:active?B.navy:B.white,
    color:active?B.white:B.gray600,fontWeight:active?600:400,whiteSpace:"nowrap",
    transition:"all .15s",
  });
  const hasAnyFilter = filters.agencyType||filters.payer||filters.location||filters.market||hoursFilter;

  // Build active filter summary for collapsed view
  const activeLabels = [
    filters.agencyType && filters.agencyType.split(" ")[0],
    filters.payer && filters.payer.split(" ")[0],
    filters.location,
    filters.market,
    hoursFilter && `${hoursFilter} hrs`,
  ].filter(Boolean);

  return (
    <div style={{marginBottom:16}}>
      {/* Collapsed toggle row */}
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <button
          onClick={()=>setOpen(o=>!o)}
          style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",
            borderRadius:20,fontSize:12,cursor:"pointer",
            border:`1.5px solid ${hasAnyFilter?B.navy:B.gray200}`,
            background:hasAnyFilter?B.navy:B.white,
            color:hasAnyFilter?B.white:B.gray600,
            fontWeight:600,transition:"all .15s"}}>
          <span style={{fontSize:13}}>{open?"▲":"▼"}</span>
          {hasAnyFilter ? `Filters (${activeLabels.length} active)` : "Filter"}
        </button>
        {/* Active filter pills */}
        {!open && activeLabels.map((lbl,i)=>(
          <span key={i} style={{fontSize:12,padding:"4px 10px",borderRadius:20,
            background:B.tealLight,color:B.teal,border:`1px solid ${B.teal}`,fontWeight:500}}>
            {lbl}
          </span>
        ))}
        {hasAnyFilter && !open && (
          <button style={{fontSize:12,color:B.gray400,background:"none",border:"none",
            cursor:"pointer",textDecoration:"underline",padding:0}}
            onClick={()=>{setFilters({agencyType:"",payer:"",location:"",market:""});setHoursFilter&&setHoursFilter("");}}>
            Clear
          </button>
        )}
      </div>

      {/* Expanded panel */}
      {open && (
        <div style={{background:B.gray50,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"16px 20px",marginTop:10}}>
          <div style={{display:"grid",gap:10}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,color:B.gray400,width:90,flexShrink:0}}>Agency type</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {types.map(t=>(
                  <button key={t} style={chip(filters.agencyType===t)}
                    onClick={()=>sel("agencyType",t)}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,color:B.gray400,width:90,flexShrink:0}}>Payer source</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {payers.map(p=>(
                  <button key={p} style={chip(filters.payer===p)}
                    onClick={()=>sel("payer",p)}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,color:B.gray400,width:90,flexShrink:0}}>State/Province</span>
              <select value={filters.location} onChange={e=>setFilters(f=>({...f,location:e.target.value}))}
                style={{padding:"5px 10px",fontSize:12,borderRadius:6,border:`1.5px solid ${B.gray200}`,
                  background:filters.location?B.navy:B.white,color:filters.location?B.white:B.gray600}}>
                <option value="">All locations</option>
                {states.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {setHoursFilter && (
              <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
                <span style={{fontSize:12,color:B.gray400,width:90,flexShrink:0}}>Agency size</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {HOUR_RANGES.map(hr=>(
                    <button key={hr} style={chip(hoursFilter===hr)}
                      onClick={()=>setHoursFilter(hoursFilter===hr?"":hr)}>{hr} hrs</button>
                  ))}
                </div>
              </div>
            )}
            {filters.market !== undefined && (
              <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
                <span style={{fontSize:12,color:B.gray400,width:90,flexShrink:0}}>Market type</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {MARKET_TYPES.map(m=>(
                    <button key={m} style={chip(filters.market===m)}
                      onClick={()=>setFilters(f=>({...f,market:f.market===m?"":m}))}>{m}</button>
                  ))}
                </div>
              </div>
            )}
            {hasAnyFilter && (
              <div>
                <button style={{...chip(false),borderColor:B.gray300,color:B.gray500,fontSize:12}}
                  onClick={()=>{setFilters({agencyType:"",payer:"",location:"",market:""});setHoursFilter&&setHoursFilter("");}}>
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tile grid map ───────────────────────────────────────────────
const TILE_GRID = [
  {row:0,col:2,abbr:"YT",name:"Yukon"},
  {row:0,col:3,abbr:"NT",name:"Northwest Territories"},
  {row:0,col:5,abbr:"NU",name:"Nunavut"},
  {row:1,col:2,abbr:"BC",name:"British Columbia"},
  {row:1,col:3,abbr:"AB",name:"Alberta"},
  {row:1,col:4,abbr:"SK",name:"Saskatchewan"},
  {row:1,col:5,abbr:"MB",name:"Manitoba"},
  {row:1,col:6,abbr:"ON",name:"Ontario"},
  {row:1,col:7,abbr:"QC",name:"Quebec"},
  {row:1,col:8,abbr:"NL",name:"Newfoundland and Labrador"},
  {row:2,col:8,abbr:"NB",name:"New Brunswick"},
  {row:2,col:9,abbr:"NS",name:"Nova Scotia"},
  {row:2,col:10,abbr:"PE",name:"Prince Edward Island"},
  {row:3,col:0,abbr:"AK",name:"Alaska"},
  {row:3,col:10,abbr:"ME",name:"Maine"},
  {row:4,col:9,abbr:"VT",name:"Vermont"},
  {row:4,col:10,abbr:"NH",name:"New Hampshire"},
  {row:5,col:0,abbr:"WA",name:"Washington"},
  {row:5,col:1,abbr:"ID",name:"Idaho"},
  {row:5,col:2,abbr:"MT",name:"Montana"},
  {row:5,col:3,abbr:"ND",name:"North Dakota"},
  {row:5,col:4,abbr:"MN",name:"Minnesota"},
  {row:5,col:5,abbr:"IL",name:"Illinois"},
  {row:5,col:6,abbr:"WI",name:"Wisconsin"},
  {row:5,col:7,abbr:"MI",name:"Michigan"},
  {row:5,col:8,abbr:"NY",name:"New York"},
  {row:5,col:9,abbr:"RI",name:"Rhode Island"},
  {row:5,col:10,abbr:"MA",name:"Massachusetts"},
  {row:6,col:0,abbr:"OR",name:"Oregon"},
  {row:6,col:1,abbr:"NV",name:"Nevada"},
  {row:6,col:2,abbr:"WY",name:"Wyoming"},
  {row:6,col:3,abbr:"SD",name:"South Dakota"},
  {row:6,col:4,abbr:"IA",name:"Iowa"},
  {row:6,col:5,abbr:"IN",name:"Indiana"},
  {row:6,col:6,abbr:"OH",name:"Ohio"},
  {row:6,col:7,abbr:"PA",name:"Pennsylvania"},
  {row:6,col:8,abbr:"NJ",name:"New Jersey"},
  {row:6,col:9,abbr:"CT",name:"Connecticut"},
  {row:7,col:0,abbr:"CA",name:"California"},
  {row:7,col:1,abbr:"UT",name:"Utah"},
  {row:7,col:2,abbr:"CO",name:"Colorado"},
  {row:7,col:3,abbr:"NE",name:"Nebraska"},
  {row:7,col:4,abbr:"MO",name:"Missouri"},
  {row:7,col:5,abbr:"KY",name:"Kentucky"},
  {row:7,col:6,abbr:"WV",name:"West Virginia"},
  {row:7,col:7,abbr:"VA",name:"Virginia"},
  {row:7,col:8,abbr:"MD",name:"Maryland"},
  {row:7,col:9,abbr:"DE",name:"Delaware"},
  {row:8,col:1,abbr:"AZ",name:"Arizona"},
  {row:8,col:2,abbr:"NM",name:"New Mexico"},
  {row:8,col:3,abbr:"KS",name:"Kansas"},
  {row:8,col:4,abbr:"AR",name:"Arkansas"},
  {row:8,col:5,abbr:"TN",name:"Tennessee"},
  {row:8,col:6,abbr:"NC",name:"North Carolina"},
  {row:8,col:7,abbr:"SC",name:"South Carolina"},
  {row:8,col:8,abbr:"DC",name:"Washington D.C."},
  {row:9,col:3,abbr:"OK",name:"Oklahoma"},
  {row:9,col:4,abbr:"LA",name:"Louisiana"},
  {row:9,col:5,abbr:"MS",name:"Mississippi"},
  {row:9,col:6,abbr:"AL",name:"Alabama"},
  {row:9,col:7,abbr:"GA",name:"Georgia"},
  {row:10,col:3,abbr:"TX",name:"Texas"},
  {row:10,col:9,abbr:"FL",name:"Florida"},
  {row:10,col:0,abbr:"HI",name:"Hawaii"},
  {row:10,col:10,abbr:"PR",name:"Puerto Rico"}
];

function USCAMap({ responses }) {
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({x:0,y:0});

  const counts = {};
  responses.forEach(r => { if(r.q1) counts[r.q1] = (counts[r.q1]||0)+1; });
  const maxCount = Math.max(1, ...Object.values(counts));

  // Name normalisation — match survey answers to tile names
  const NAME_MAP = {
    "District of Columbia": "Washington D.C.",
    "Yukon Territory": "Yukon",
    "Newfoundland and Labrador": "Newfoundland and Labrador",
    "Prince Edward Island": "Prince Edward Island",
  };

  function getCount(tileName) {
    return counts[tileName] || counts[NAME_MAP[tileName]] || 0;
  }

  function getColor(tileName) {
    const c = getCount(tileName);
    if (c === 0) return B.gray100;
    const t = c / maxCount;
    const r = Math.round(197 + (26-197)*t);
    const g = Math.round(206 + (43-206)*t);
    const b = Math.round(223 + (74-223)*t);
    return `rgb(${r},${g},${b})`;
  }

  function getTextColor(tileName) {
    const c = getCount(tileName);
    const t = c / maxCount;
    return t > 0.45 ? B.white : B.gray600;
  }

  const TILE_SIZE = 52;
  const GAP = 4;
  const STEP = TILE_SIZE + GAP;
  const PAD = 8;
  const maxRow = Math.max(...TILE_GRID.map(t=>t.row));
  const maxCol = Math.max(...TILE_GRID.map(t=>t.col));
  const W = (maxCol + 1) * STEP + PAD * 2;
  const H = (maxRow + 1) * STEP + PAD * 2;

  function handleMouseMove(e, tile) {
    const wrap = e.currentTarget.closest('div');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setHovered(tile);
  }

  // Divider row between Canada and US (between row 2 and row 3)
  const DIVIDER_Y = PAD + 3 * STEP - GAP/2;

  return (
    <div style={{position:"relative",overflowX:"auto"}}>
      <div style={{position:"relative",width:W,height:H,margin:"0 auto"}}>
        {/* Canada / US label */}
        <div style={{position:"absolute",left:PAD,top:PAD,fontSize:10,
          fontWeight:600,color:B.gray400,letterSpacing:".5px",textTransform:"uppercase"}}>
          Canada
        </div>
        <div style={{position:"absolute",left:PAD,top:DIVIDER_Y+6,fontSize:10,
          fontWeight:600,color:B.gray400,letterSpacing:".5px",textTransform:"uppercase"}}>
          United States
        </div>
        {/* Divider */}
        <div style={{position:"absolute",left:PAD,right:PAD,top:DIVIDER_Y,
          height:1,background:B.gray200}}/>

        {TILE_GRID.map(tile => {
          const x = PAD + tile.col * STEP;
          const y = PAD + tile.row * STEP;
          const bg = getColor(tile.name);
          const fg = getTextColor(tile.name);
          const isHovered = hovered && hovered.abbr === tile.abbr;
          return (
            <div
              key={tile.abbr}
              style={{
                position:"absolute", left:x, top:y,
                width:TILE_SIZE, height:TILE_SIZE,
                background:bg,
                border:`2px solid ${isHovered ? B.accent : "transparent"}`,
                borderRadius:8,
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                cursor:"pointer",
                transition:"border-color .1s, background .2s",
                boxSizing:"border-box",
              }}
              onMouseMove={e => handleMouseMove(e, tile)}
              onMouseLeave={() => setHovered(null)}
            >
              <span style={{fontSize:11,fontWeight:700,color:fg,letterSpacing:".3px"}}>
                {tile.abbr}
              </span>
              {getCount(tile.name) > 0 && (
                <span style={{fontSize:9,color:fg,opacity:0.85,marginTop:1}}>
                  {getCount(tile.name)}
                </span>
              )}
            </div>
          );
        })}

        {/* Tooltip */}
        {hovered && (
          <div style={{
            position:"absolute",
            left: Math.min(tooltipPos.x + 12, W - 170),
            top: Math.max(tooltipPos.y - 44, 4),
            background:B.navy, color:B.white,
            padding:"8px 12px", borderRadius:6,
            fontSize:13, pointerEvents:"none",
            zIndex:10, whiteSpace:"nowrap",
            boxShadow:"0 2px 8px rgba(0,0,0,.15)",
          }}>
            <div style={{fontWeight:600}}>{hovered.name}</div>
            <div style={{fontSize:11,color:B.tealLight,marginTop:2}}>
              {getCount(hovered.name)} respondent{getCount(hovered.name)!==1?"s":""}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end",
        marginTop:8,paddingRight:PAD}}>
        <span style={{fontSize:11,color:B.gray400}}>0</span>
        <div style={{width:120,height:10,borderRadius:4,
          background:`linear-gradient(to right, ${B.gray100}, ${B.navy})`}}/>
        <span style={{fontSize:11,color:B.gray400}}>{maxCount} responses</span>
      </div>
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
              >typically hire #{Math.round(avg)}</text>
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
function TimelineByHours({ responses, filters }) {
  const ROLE_COLORS = {
    "Sales/marketing":                "#e34948",
    "Executive assistant/reception":  "#eda100",
    "Scheduling/care coordination":   "#2a78d6",
    "Billing":                        "#1baf7a",
    "HR/Recruitment":                 "#4a3aa7",
    "Field supervisor":               "#e87ba4",
  };

  function parseCount(val) {
    if (!val || val === "Not applicable") return null;
    if (val === "15+") return 16;
    return parseInt(val, 10) || null;
  }

  const activeResponses = filters ? responses.filter(r=>{
    if(filters.agencyType && !r.q3.startsWith(filters.agencyType)) return false;
    if(filters.payer && !r.q4.startsWith(filters.payer)) return false;
    if(filters.location && r.q1!==filters.location) return false;
    if(filters.market && r.q9!==filters.market) return false;
    return true;
  }) : responses;

  const data = HOUR_RANGES.map(band => {
    const sub = activeResponses.filter(r => r.q2 === band);
    const entry = { band, n: sub.length };
    OFFICE_ROLES.forEach(role => {
      const counts = sub.map(r => parseCount(r.q7 && r.q7[role])).filter(v => v !== null);
      entry[role] = counts.length ? counts.reduce((a,b) => a+b, 0) / counts.length : 0;
      entry[role + "_n"] = counts.length;
    });
    return entry;
  });

  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({x:0,y:0});
  const [hidden, setHidden] = useState(new Set());
  const svgRef = useRef(null);

  function toggleRole(role) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  }

  function getMaxStack() {
    let mx = 0;
    data.forEach(d => {
      let sum = 0;
      OFFICE_ROLES.forEach(r => { if (!hidden.has(r)) sum += d[r] || 0; });
      if (sum > mx) mx = sum;
    });
    return mx || 1;
  }

  const W = 860, H = 340;
  const PAD = { t:24, r:20, b:52, l:56 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const nBands = HOUR_RANGES.length;
  const BAR_GAP = iW / nBands;
  const BAR_W = BAR_GAP * 0.55;
  const mx = getMaxStack();

  const yScale = v => PAD.t + iH - (v / mx) * iH;
  const xCenter = bi => PAD.l + bi * BAR_GAP + BAR_GAP / 2;
  const yTicks = Array.from({length:5}, (_,i) => parseFloat((mx*i/4).toFixed(1)));
  const xLabels = ["0-500","501-1k","1-1.5k","1.5-2k","2-2.5k","2.5-3k","3k+"];

  function handleMouseMove(e, role, bi, avg) {
    const svg = svgRef.current; if(!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltipPos({x:(e.clientX-rect.left)*(W/rect.width),y:(e.clientY-rect.top)*(H/rect.height)});
    setTooltip({ role, avg, band: HOUR_RANGES[bi], n: data[bi][role+"_n"] });
  }

  return (
    <div>
      {/* Clickable legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"6px 12px",marginBottom:14}}>
        {OFFICE_ROLES.map(role => {
          const isHidden = hidden.has(role);
          return (
            <button key={role} onClick={() => toggleRole(role)} style={{
              display:"flex",alignItems:"center",gap:6,fontSize:12,
              color:isHidden?B.gray400:B.gray600,
              background:isHidden?B.gray50:B.white,
              border:`1.5px solid ${B.gray200}`,borderRadius:20,
              padding:"4px 12px 4px 8px",cursor:"pointer",
              textDecoration:isHidden?"line-through":"none",
              opacity:isHidden?0.55:1,transition:"all .15s",
            }}>
              <div style={{width:10,height:10,borderRadius:2,flexShrink:0,
                background:ROLE_COLORS[role],opacity:isHidden?0.3:1}}/>
              {role}
            </button>
          );
        })}
      </div>

      <div style={{position:"relative"}}>
        <svg ref={svgRef} viewBox={"0 0 "+W+" "+H} style={{width:"100%",display:"block"}}>
          {/* Y gridlines */}
          {yTicks.map(v => (
            <g key={v}>
              <line x1={PAD.l} y1={yScale(v)} x2={W-PAD.r} y2={yScale(v)}
                stroke={B.gray100} strokeWidth="0.5"/>
              <text x={PAD.l-6} y={yScale(v)+4} fontSize="10" fill={B.gray400} textAnchor="end">
                {v % 1 === 0 ? v : v.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Stacked bars */}
          {data.map((d, bi) => {
            const cx = xCenter(bi);
            const bx = cx - BAR_W/2;
            let yCursor = PAD.t + iH;
            let totalStack = 0;
            const segments = OFFICE_ROLES
              .filter(role => !hidden.has(role) && (d[role] || 0) > 0.01)
              .map(role => ({ role, avg: d[role] || 0 }));
            segments.forEach(s => { totalStack += s.avg; });

            return (
              <g key={d.band}>
                {segments.map((s, si) => {
                  const barH = (s.avg / mx) * iH;
                  const y = yCursor - barH;
                  yCursor -= barH;
                  return (
                    <g key={s.role}>
                      <rect x={bx} y={y} width={BAR_W} height={barH}
                        fill={ROLE_COLORS[s.role]} rx="2" style={{cursor:"pointer"}}
                        onMouseMove={e => handleMouseMove(e, s.role, bi, s.avg)}
                        onMouseLeave={() => setTooltip(null)}/>
                      {/* White gap between segments */}
                      {si > 0 && (
                        <line x1={bx} y1={y+barH} x2={bx+BAR_W} y2={y+barH}
                          stroke={B.white} strokeWidth="1.5"/>
                      )}
                      {/* Segment label */}
                      {barH > 16 && BAR_W > 28 && (
                        <text x={cx} y={y+barH/2+4} fontSize="9.5" fontWeight="500"
                          fill="white" textAnchor="middle" style={{pointerEvents:"none"}}>
                          {s.avg.toFixed(1)}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Total above bar */}
                {totalStack > 0 && (
                  <text x={cx} y={yScale(totalStack)-5} fontSize="10.5" fontWeight="500"
                    fill={B.gray800} textAnchor="middle">
                    {totalStack.toFixed(1)}
                  </text>
                )}

                {/* X labels */}
                <text x={cx} y={H-PAD.b+14} fontSize="10" fill={B.gray600} textAnchor="middle">
                  {xLabels[bi]}
                </text>
                <text x={cx} y={H-PAD.b+26} fontSize="9" fill={B.gray400} textAnchor="middle">
                  n={d.n}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={PAD.l} y1={H-PAD.b} x2={W-PAD.r} y2={H-PAD.b}
            stroke={B.gray200} strokeWidth="1"/>
          <text x={PAD.l+iW/2} y={H-2} fontSize="11" fill={B.gray400} textAnchor="middle">
            Weekly billable hours
          </text>
          <text transform={"rotate(-90,12,"+(PAD.t+iH/2)+")"} x={12} y={PAD.t+iH/2}
            fontSize="11" fill={B.gray400} textAnchor="middle">
            Avg employees in role
          </text>

          {/* Tooltip */}
          {tooltip && (() => {
            const tx = Math.min(tooltipPos.x+12, W-215);
            const ty = Math.max(tooltipPos.y-52, 4);
            const lines = tooltip.role.split("/");
            const h = lines.length > 1 ? 62 : 50;
            return (
              <g style={{pointerEvents:"none"}}>
                <rect x={tx} y={ty} width={208} height={h} rx="5" fill={B.navy} opacity="0.93"/>
                <rect x={tx} y={ty} width={8} height={h} fill={ROLE_COLORS[tooltip.role]||B.teal}/>
                <text x={tx+15} y={ty+14} fontSize="11" fontWeight="600" fill="white">{lines[0]}</text>
                {lines[1] && <text x={tx+15} y={ty+27} fontSize="11" fontWeight="600" fill="white">{lines[1]}</text>}
                <text x={tx+15} y={lines[1]?ty+42:ty+29} fontSize="10" fill={B.tealLight}>
                  Avg {tooltip.avg.toFixed(1)} employees
                </text>
                <text x={tx+15} y={lines[1]?ty+55:ty+42} fontSize="10" fill={B.gray400}>
                  {tooltip.band} hrs · n={tooltip.n} reporting
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}


// ─── Q6 bar chart ─────────────────────────────────────────────────
function MarimekkoChart({ responses, filters, hoursFilter, setHoursFilter }) {
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({x:0,y:0});
  const svgRef = useRef(null);
  const wrapRef = useRef(null);

  const ROLE_ORDER = [
    "Sales/marketing",
    "Field supervisor",
    "HR/Recruitment",
    "Executive assistant/reception",
    "Billing",
    "Scheduling/care coordination",
  ];
  const ROLE_SHORT = [
    "Sales/\nmarketing",
    "Field\nsupervisor",
    "HR/\nRecruitment",
    "Executive\nassistant",
    "Billing",
    "Scheduling/\ncare coord.",
  ];
  const COLORS = {
    "Full-time": B.navy,
    "Part-time": B.teal,
    "Hybrid": "#4A90C4",
    "Not applicable": B.gray100,
  };
  const SEGS = ["Full-time","Part-time","Hybrid","Not applicable"];

  const filtered = responses.filter(r => {
    if(filters.agencyType && !r.q3.startsWith(filters.agencyType)) return false;
    if(filters.payer && !r.q4.startsWith(filters.payer)) return false;
    if(filters.location && r.q1 !== filters.location) return false;
    if(hoursFilter && r.q2 !== hoursFilter) return false;
    return true;
  });
  const n = filtered.length || 1;

  // Compute pct for each role+seg
  const data = ROLE_ORDER.map((role, ri) => {
    const segPcts = {};
    SEGS.forEach(seg => {
      segPcts[seg] = Math.round(filtered.filter(r => r.q6[role] === seg).length / n * 100);
    });
    const hired = 100 - segPcts["Not applicable"];
    return { role, ri, segPcts, hired };
  });

  // Sort least→most hired (left to right)
  data.sort((a,b) => a.hired - b.hired);

  const W = 860, H = 300;
  const PAD = { t:20, r:8, b:40, l:40 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const grandHired = data.reduce((s,d) => s + Math.max(d.hired, 1), 0);

  let xCursor = PAD.l;
  const cols = data.map(d => {
    const colW = (Math.max(d.hired,1) / grandHired) * iW;
    const col = { ...d, x: xCursor, w: colW };
    xCursor += colW;
    return col;
  });

  const yTicks = [0,25,50,75,100];

  function handleMouseMove(e, col, seg) {
    const svg = svgRef.current;
    if(!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltipPos({
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    });
    setTooltip({ role: col.role, seg, pct: col.segPcts[seg], hired: col.hired });
  }

  // Short label lines
  const shortLines = data.map((d,i) => {
    const idx = ROLE_ORDER.indexOf(d.role);
    return ROLE_SHORT[idx].split('\n');
  });

  return (
    <div ref={wrapRef} style={{position:"relative"}}>
      {/* Custom legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"8px 16px",marginBottom:14}}>
        {[["Not applicable",B.gray200],["Full-time",B.navy],["Part-time",B.teal],["Hybrid","#4A90C4"]].map(([lbl,col])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:B.gray600}}>
            <div style={{width:11,height:11,borderRadius:2,background:col,flexShrink:0}}/>
            {lbl}
          </div>
        ))}
      </div>

      <svg ref={svgRef} viewBox={"0 0 "+W+" "+H} style={{width:"100%",display:"block"}}>
        {/* Y gridlines */}
        {yTicks.map(v => {
          const y = PAD.t + (v/100)*iH;
          return (
            <g key={v}>
              <line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y}
                stroke={B.gray100} strokeWidth="0.5"/>
              <text x={PAD.l-5} y={y+4} fontSize="10" fill={B.gray400} textAnchor="end">{v}%</text>
            </g>
          );
        })}

        {cols.map((col, ci) => {
          let yCursor = PAD.t; // start from top

          // "Not applicable" first (top, gray)
          const noneH = (col.segPcts["Not applicable"]/100)*iH;
          const hiredSegs = SEGS.filter(s => s !== "Not applicable").reverse(); // mix, pt, ft bottom up

          // Draw not-applicable from top
          return (
            <g key={col.role}>
              {/* Not applicable — full column height, hired segments draw on top */}
              <rect x={col.x+1} y={PAD.t} width={Math.max(col.w-2,0)} height={iH}
                fill={B.gray100} style={{cursor:"pointer"}}
                onMouseMove={e=>handleMouseMove(e,col,"Not applicable")}
                onMouseLeave={()=>setTooltip(null)}/>
              {noneH > 20 && col.w > 38 && (
                <text x={col.x+col.w/2} y={PAD.t+noneH/2+4}
                  fontSize="10" fill={B.gray400} textAnchor="middle">
                  {col.segPcts["Not applicable"]}%
                </text>
              )}

              {/* Hired segments stacked from bottom */}
              {(() => {
                let yBot = PAD.t + iH;
                return hiredSegs.map(seg => {
                  const segH = (col.segPcts[seg]/100)*iH;
                  if(segH < 0.5) return null;
                  const y = yBot - segH;
                  yBot -= segH;
                  return (
                    <g key={seg}>
                      <rect x={col.x+1} y={y} width={Math.max(col.w-2,0)} height={segH}
                        fill={COLORS[seg]} style={{cursor:"pointer"}}
                        onMouseMove={e=>handleMouseMove(e,col,seg)}
                        onMouseLeave={()=>setTooltip(null)}/>
                      {segH > 20 && col.w > 38 && (
                        <text x={col.x+col.w/2} y={y+segH/2+4}
                          fontSize="10" fontWeight="600" fill="white" textAnchor="middle">
                          {col.segPcts[seg]}%
                        </text>
                      )}
                    </g>
                  );
                });
              })()}

              {/* Column separator */}
              <line x1={col.x+col.w} y1={PAD.t} x2={col.x+col.w} y2={PAD.t+iH}
                stroke={B.white} strokeWidth="2"/>

              {/* % hired label */}
              <text x={col.x+col.w/2} y={PAD.t+iH+12}
                fontSize="10" fill={B.gray400} textAnchor="middle">
                {col.hired}% hired
              </text>

              {/* Role name below */}
              {shortLines[ci].map((line, li) => (
                <text key={li} x={col.x+col.w/2} y={PAD.t+iH+24+li*12}
                  fontSize="10" fill={B.gray600} textAnchor="middle">
                  {line}
                </text>
              ))}
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx = Math.min(tooltipPos.x+12, W-175);
          const ty = Math.max(tooltipPos.y-44, 4);
          const lines = tooltip.role.split('/');
          return (
            <g style={{pointerEvents:"none"}}>
              <rect x={tx} y={ty} width={168} height={lines.length>1?52:40}
                rx="5" fill={B.navy} opacity="0.93"/>
              <rect x={tx} y={ty} width={8} height={lines.length>1?52:40}
                fill={COLORS[tooltip.seg]||B.gray200}/>
              <text x={tx+16} y={ty+14} fontSize="11" fontWeight="600" fill="white">
                {lines[0]}
              </text>
              {lines[1] && (
                <text x={tx+16} y={ty+26} fontSize="11" fontWeight="600" fill="white">
                  {lines[1]}
                </text>
              )}
              <text x={tx+16} y={lines[1]?ty+40:ty+28} fontSize="10" fill={B.tealLight}>
                {tooltip.seg}: {tooltip.pct}% · {tooltip.hired}% hired
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}



// ─── Partner components ──────────────────────────────────────────
// Falls back to a styled wordmark if the logo file is missing.
function PartnerLogo({ partner, height = 38, fade = false }) {
  const [failed, setFailed] = useState(false);
  const fadeClass = fade ? "partner-fade" : undefined;

  // No logo file (or it failed to load) — show a clean wordmark instead
  if (failed || !partner.logo) {
    return (
      <span className={fadeClass} style={{fontSize:13,fontWeight:700,color:B.navy,textAlign:"center",
        lineHeight:1.3,letterSpacing:"-0.2px"}}>
        {partner.name}
      </span>
    );
  }

  const img = (
    <img src={partner.logo} alt={partner.name} className={fadeClass}
      onError={()=>setFailed(true)}
      style={{maxHeight:height,maxWidth:"100%",objectFit:"contain",display:"block"}}/>
  );

  // White logo art needs a dark tile behind it to be visible — the tile itself
  // stays solid navy always; only the logo art fades with the rest of the strip.
  if (partner.darkBg) {
    return (
      <span style={{background:B.navy,borderRadius:6,padding:"8px 12px",
        display:"flex",alignItems:"center",justifyContent:"center",maxWidth:"100%"}}>
        {img}
      </span>
    );
  }
  return img;
}

// Compact logo strip — used at the bottom of the survey
function PartnerStrip() {
  return (
    <div style={{borderTop:`1px solid ${B.gray200}`,marginTop:48,paddingTop:28}}>
      <div style={{fontSize:12,fontWeight:600,color:B.gray400,letterSpacing:"1px",
        textTransform:"uppercase",textAlign:"center",marginBottom:20}}>
        Thanks to our partners
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",
        gap:20,alignItems:"center",justifyItems:"center",maxWidth:820,margin:"0 auto"}}>
        {PARTNERS.map(p=>(
          <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
            title={p.name} className="partner-link"
            style={{display:"flex",alignItems:"center",justifyContent:"center",
              height:52,width:"100%",padding:"0 8px",textDecoration:"none"}}>
            <PartnerLogo partner={p} height={36} fade/>
          </a>
        ))}
      </div>
    </div>
  );
}

// Full section with blurbs — used at the bottom of the report
function PartnerSection() {
  return (
    <div style={{marginTop:8,marginBottom:40}}>
      <div style={{fontSize:11,fontWeight:600,color:B.gray400,letterSpacing:"1px",
        textTransform:"uppercase",marginBottom:16,paddingBottom:8,
        borderBottom:`1px solid ${B.gray200}`}}>
        Our partners
      </div>
      <p style={{fontSize:14,color:B.gray600,lineHeight:1.6,marginBottom:24}}>
        The Home Care Office Index is made possible with the support of these organizations
        serving the home care industry.
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        {PARTNERS.map(p=>(
          <div key={p.name} style={{background:B.white,border:`1.5px solid ${B.gray200}`,
            borderRadius:10,padding:"20px",display:"flex",flexDirection:"column"}}>
            <div style={{height:44,display:"flex",alignItems:"center",marginBottom:12}}>
              <PartnerLogo partner={p} height={40}/>
            </div>
            <p style={{fontSize:13,color:B.gray600,lineHeight:1.6,margin:"0 0 14px",flex:1}}>
              {p.blurb}
            </p>
            <a href={p.url} target="_blank" rel="noopener noreferrer"
              style={{fontSize:13,fontWeight:600,color:B.teal,textDecoration:"none",
                display:"inline-flex",alignItems:"center",gap:5}}>
              Visit website <span style={{fontSize:14}}>→</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Key findings ─────────────────────────────────────────────────
function KeyFindings({ responses, customFindings }) {
  if (responses.length < 5) return null;

  const n = responses.length;

  // Finding 1: Most common first hire
  const firstHires = {};
  responses.forEach(r => {
    const ranked = OFFICE_ROLES.filter(role => r.q5[role] > 0).sort((a,b) => r.q5[a]-r.q5[b]);
    if (ranked.length) firstHires[ranked[0]] = (firstHires[ranked[0]]||0)+1;
  });
  const topFirst = Object.entries(firstHires).sort((a,b)=>b[1]-a[1])[0];
  const topFirstPct = topFirst ? Math.round(topFirst[1]/n*100) : 0;

  // Finding 2: Role hiring gap between smallest and largest agencies
  function avgRoles(band) {
    const sub = responses.filter(r => r.q2 === band);
    if (!sub.length) return null;
    return (sub.reduce((s,r) => s + OFFICE_ROLES.filter(role=>r.q5[role]>0).length, 0) / sub.length).toFixed(1);
  }
  const smallAvg = avgRoles("0–500");
  const largeAvg = avgRoles("3,001+");

  // Finding 3: Time to first hire — most common
  const timeCounts = {};
  responses.forEach(r => { if(r.q8) timeCounts[r.q8] = (timeCounts[r.q8]||0)+1; });
  const topTime = Object.entries(timeCounts).sort((a,b)=>b[1]-a[1])[0];
  const topTimePct = topTime ? Math.round(topTime[1]/n*100) : 0;

  // Finding 4: Most common last hire (role most often hired latest)
  const lastHires = {};
  responses.forEach(r => {
    const hired = OFFICE_ROLES.filter(role => r.q5[role] > 0);
    if (!hired.length) return;
    const last = hired.sort((a,b) => r.q5[b]-r.q5[a])[0];
    lastHires[last] = (lastHires[last]||0)+1;
  });
  const topLast = Object.entries(lastHires).sort((a,b)=>b[1]-a[1])[0];
  const topLastPct = topLast ? Math.round(topLast[1]/n*100) : 0;

  // Finding 5: Most common employment type across all hired roles
  const empCounts = {};
  responses.forEach(r => {
    OFFICE_ROLES.forEach(role => {
      const v = r.q6 && r.q6[role];
      if (v && v !== "Not applicable") empCounts[v] = (empCounts[v]||0)+1;
    });
  });
  const topEmp = Object.entries(empCounts).sort((a,b)=>b[1]-a[1])[0];
  const totalEmp = Object.values(empCounts).reduce((s,v)=>s+v,0) || 1;
  const topEmpPct = topEmp ? Math.round(topEmp[1]/totalEmp*100) : 0;

  // Finding 6: % of agencies that have NOT yet hired scheduling
  const noScheduling = responses.filter(r => !r.q5["Scheduling/care coordination"] || r.q5["Scheduling/care coordination"] === 0).length;
  const noSchedulingPct = Math.round(noScheduling/n*100);

  const findings = [
    topFirst && `${topFirstPct}% of agencies report ${topFirst[0].toLowerCase()} as their first non-owner office hire.`,
    smallAvg && largeAvg && `The average agency billing 0–500 hrs/week has hired for ${smallAvg} office roles; at 3,001+ hrs that rises to ${largeAvg} — a ${(parseFloat(largeAvg)-parseFloat(smallAvg)).toFixed(1)}-role gap.`,
    topTime && `${topTimePct}% of agencies waited ${topTime[0].toLowerCase()} before making their first office hire.`,
    topLast && `${topLastPct}% of agencies report ${topLast[0].toLowerCase()} as the last role they hire for — suggesting it is treated as a growth milestone rather than a foundation hire.`,
    topEmp && `${topEmpPct}% of filled office positions are staffed ${topEmp[0].toLowerCase()}, making it the most common employment arrangement across all roles.`,
  ].filter(Boolean);

  const displayFindings = customFindings && customFindings.length > 0
    ? customFindings.filter(Boolean)
    : findings;

  return (
    <div style={{background:`linear-gradient(135deg, ${B.tealLight} 0%, #EEF2FF 100%)`,
      border:`1.5px solid ${B.teal}`,borderRadius:12,padding:"20px 24px",marginBottom:36}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:B.teal}}/>
        <span style={{fontSize:13,fontWeight:700,color:B.navy,letterSpacing:".3px",textTransform:"uppercase"}}>
          Key findings
        </span>
        <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}>
          {customFindings && customFindings.length > 0 && (
            <span style={{fontSize:11,color:B.teal,background:B.tealLight,
              border:`1px solid ${B.teal}`,borderRadius:10,padding:"2px 8px"}}>
              Edited
            </span>
          )}
          <span style={{fontSize:12,color:B.gray400}}>based on {n} responses</span>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {displayFindings.map((f,i) => (
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{color:B.teal,fontWeight:700,fontSize:14,flexShrink:0,marginTop:1}}>→</span>
            <span style={{fontSize:14,color:B.gray800,lineHeight:1.5}}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── N count badge ───────────────────────────────────────────────
function NCount({ n, filtered, label="responses" }) {
  const isFiltered = filtered !== undefined && filtered < n;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
      <span style={{
        background: isFiltered ? B.accentLight : B.tealLight,
        color: isFiltered ? B.accent : B.teal,
        border: `1px solid ${isFiltered ? B.accent : B.teal}`,
        borderRadius:20, padding:"3px 12px",
        fontSize:13, fontWeight:600,
      }}>
        n = {isFiltered ? filtered : n}
      </span>
      {isFiltered && (
        <span style={{fontSize:12,color:B.gray400}}>
          of {n} total {label}
        </span>
      )}
      {!isFiltered && (
        <span style={{fontSize:12,color:B.gray400}}>{label}</span>
      )}
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────
function Dashboard({ onBack, responses, customFindings }) {
  const [filters,setFilters] = useState({agencyType:"",payer:"",location:"",market:""});

    const [hoursFilter, setHoursFilter] = useState("");

  const filtered = responses.filter(r=>{
    if(filters.agencyType && !r.q3.startsWith(filters.agencyType)) return false;
    if(filters.payer && !r.q4.startsWith(filters.payer)) return false;
    if(filters.location && r.q1!==filters.location) return false;
    if(filters.market && r.q9!==filters.market) return false;
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

  // Q8 — Time to first hire
  const timeToHireData = TIME_TO_FIRST_HIRE.map(t=>({
    name:t, value:responses.filter(r=>r.q8===t).length
  })).filter(d=>d.value>0);

  // Q9 — Market type
  const marketTypeData = MARKET_TYPES.map(m=>({
    name:m, value:responses.filter(r=>r.q9===m).length
  })).filter(d=>d.value>0);

  // Q10 — Next intended hire
  const nextHireData = [...OFFICE_ROLES,"Other"].map(role=>({
    name:role,
    value:responses.filter(r=>{
      if(r.q10===role) return true;
      if(role==="Other" && r.q10 && r.q10.startsWith("Other")) return true;
      return false;
    }).length
  })).filter(d=>d.value>0).sort((a,b)=>b.value-a.value);

  // Q11 — Offshore talent
  const offshoreYes = responses.filter(r=>r.q11==="Yes").length;
  const offshoreNo = responses.filter(r=>r.q11==="No").length;
  const offshoreData = [
    {name:"Yes — employ offshore/global talent", value:offshoreYes},
    {name:"No", value:offshoreNo},
  ].filter(d=>d.value>0);
  const offshoreRoleCounts = {};
  responses.forEach(r=>{
    if(r.q11==="Yes" && Array.isArray(r.q11Positions)){
      r.q11Positions.forEach(pos=>{ offshoreRoleCounts[pos]=(offshoreRoleCounts[pos]||0)+1; });
    }
  });
  const offshoreRoleData = Object.entries(offshoreRoleCounts)
    .sort((a,b)=>b[1]-a[1])
    .map(([name,value])=>({name,value}));

  const PIE_COLORS = ["#1A2B4A","#2ABFAA","#F4A623","#6C7EAA","#4A90C4","#F7C97A"];

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
          <h1 style={{fontSize:30,fontWeight:700,color:B.navy,marginBottom:6}}>
            Home Care Office Index
          </h1>
          <p style={{fontSize:15,fontStyle:"italic",color:B.teal,marginBottom:10,letterSpacing:".1px"}}>
            A report by SallySupport
          </p>
          <p style={{fontSize:15,color:B.gray600,lineHeight:1.6}}>
            Aggregated responses from home care agency owners and operators.
            Updated in real time as new agencies participate.
          </p>
        </div>

        <KeyFindings responses={responses} customFindings={customFindings} />

        {/* Section 1 */}
        <div style={{fontSize:11,fontWeight:600,color:B.gray400,letterSpacing:"1px",
          textTransform:"uppercase",marginBottom:16,marginTop:8,
          paddingBottom:8,borderBottom:`1px solid ${B.gray200}`}}>Who responded</div>

        {/* Q1 Map */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>Respondents by location</SectionTitle>
          <NCount n={responses.length} label="agencies responding" />
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
            <NCount n={responses.length} label="agencies" />
            <ResponsiveContainer width="100%" height={290}>
              <PieChart margin={{top:10,right:20,left:20,bottom:10}}>
                <Pie data={hourData} cx="50%" cy="50%" outerRadius={72} dataKey="value"
                  label={({name,percent})=>`${Math.round(percent*100)}%`} labelLine={{stroke:B.gray200}}>
                  {hourData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{fontSize:11,paddingTop:4}} iconSize={10} verticalAlign="bottom" layout="horizontal"/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,padding:"20px"}}>
            <SectionTitle>Agency type</SectionTitle>
            <NCount n={responses.length} label="agencies" />
            <ResponsiveContainer width="100%" height={290}>
              <PieChart margin={{top:10,right:20,left:20,bottom:10}}>
                <Pie data={typeData} cx="50%" cy="50%" outerRadius={72} dataKey="value"
                  label={({name,percent})=>`${Math.round(percent*100)}%`} labelLine={{stroke:B.gray200}}>
                  {typeData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{fontSize:11,paddingTop:4}} iconSize={10} verticalAlign="bottom" layout="horizontal"/>
              </PieChart>
            </ResponsiveContainer>
            <OtherList label="agency type" items={typeOthers} />
          </div>
          <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,padding:"20px"}}>
            <SectionTitle>Primary payer source</SectionTitle>
            <NCount n={responses.length} label="agencies" />
            <ResponsiveContainer width="100%" height={290}>
              <PieChart margin={{top:10,right:20,left:20,bottom:10}}>
                <Pie data={payerData} cx="50%" cy="50%" outerRadius={72} dataKey="value"
                  label={({name,percent})=>`${Math.round(percent*100)}%`} labelLine={{stroke:B.gray200}}>
                  {payerData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{fontSize:11,paddingTop:4}} iconSize={10} verticalAlign="bottom" layout="horizontal"/>
              </PieChart>
            </ResponsiveContainer>
            <OtherList label="payer source" items={payerOthers} />
          </div>

          {/* Q9 — Market type */}
          <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,padding:"20px"}}>
            <SectionTitle>Primary market type</SectionTitle>
            <NCount n={responses.length} label="agencies" />
            <ResponsiveContainer width="100%" height={290}>
              <PieChart margin={{top:10,right:20,left:20,bottom:10}}>
                <Pie data={marketTypeData} cx="50%" cy="50%" outerRadius={72} dataKey="value"
                  label={({name,percent})=>`${Math.round(percent*100)}%`} labelLine={{stroke:B.gray200}}>
                  {marketTypeData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{fontSize:11,paddingTop:4}} iconSize={10} verticalAlign="bottom" layout="horizontal"/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section 2 */}
        <div style={{fontSize:11,fontWeight:600,color:B.gray400,letterSpacing:"1px",
          textTransform:"uppercase",marginBottom:16,marginTop:8,
          paddingBottom:8,borderBottom:`1px solid ${B.gray200}`}}>How agencies are structured today</div>

        {/* Q5 filtered timeline */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>In what order do agencies hire for each office role?</SectionTitle>
          <NCount n={responses.length} filtered={filtered.length} label="agencies" />
          <p style={{fontSize:14,color:B.gray600,marginBottom:16}}>
            Average hiring sequence across all respondents (or filtered subset).
            Left = hired first, right = hired later.
          </p>
          <FilterBar filters={filters} setFilters={setFilters} responses={responses} />
          <HiringTimeline responses={responses} filtered={filtered} />
          {q5Others.length>0 && <OtherList label="hiring order" items={q5Others} />}
        </div>

        {/* Q6 employment status — Marimekko */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>Are agencies relying on part-time, full-time, or a mix?</SectionTitle>
          <NCount n={responses.length} filtered={responses.filter(r=>{
            if(filters.agencyType&&!r.q3.startsWith(filters.agencyType))return false;
            if(filters.payer&&!r.q4.startsWith(filters.payer))return false;
            if(filters.location&&r.q1!==filters.location)return false;
            if(hoursFilter&&r.q2!==hoursFilter)return false;
            return true;
          }).length} label="agencies" />
          <p style={{fontSize:14,color:B.gray600,marginBottom:16}}>
            Column width = how commonly agencies have hired for that role.
            Segments show how those agencies staff it. Ordered least to most commonly hired.
          </p>
          <FilterBar filters={filters} setFilters={setFilters} responses={responses}
            hoursFilter={hoursFilter} setHoursFilter={setHoursFilter}
            title="Filter by:"/>
          <MarimekkoChart responses={responses} filters={filters} hoursFilter={hoursFilter} setHoursFilter={setHoursFilter} />
        </div>

        {/* Q8 — Time to first hire */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>How long after founding did agencies make their first office hire?</SectionTitle>
          <NCount n={responses.filter(r=>r.q8).length} filtered={filtered.filter(r=>r.q8).length} label="agencies answered" />
          <p style={{fontSize:14,color:B.gray600,marginBottom:16,lineHeight:1.6}}>
            The time between starting the agency and bringing on the first non-owner office staff member.
          </p>
          <FilterBar filters={filters} setFilters={setFilters} responses={responses} title="Filter by:" />
          <ResponsiveContainer width="100%" height={290}>
            <PieChart margin={{top:10,right:20,left:20,bottom:10}}>
              <Pie data={TIME_TO_FIRST_HIRE.map(t=>({
                  name:t,value:filtered.filter(r=>r.q8===t).length
                })).filter(d=>d.value>0)}
                cx="50%" cy="50%" outerRadius={90} dataKey="value"
                label={({name,percent})=>`${Math.round(percent*100)}%`} labelLine={{stroke:B.gray200}}>
                {TIME_TO_FIRST_HIRE.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip /><Legend wrapperStyle={{fontSize:11,paddingTop:4}} iconSize={10} verticalAlign="bottom" layout="horizontal"/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Q10 — Next intended hire */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>What role are agencies planning to hire for next?</SectionTitle>
          <NCount n={filtered.filter(r=>r.q10).length} filtered={filtered.filter(r=>r.q10).length !== responses.filter(r=>r.q10).length ? filtered.filter(r=>r.q10).length : undefined} label="agencies answered" />
          <p style={{fontSize:14,color:B.gray600,marginBottom:16,lineHeight:1.6}}>
            The office function agencies most commonly intend to hire for next.
          </p>
          <FilterBar filters={filters} setFilters={setFilters} responses={responses} title="Filter by:" />
          {(() => {
            const nextData = [...OFFICE_ROLES,"Other"].map(role=>({
              name: role,
              value: filtered.filter(r=>{
                if(r.q10===role) return true;
                if(role==="Other" && r.q10 && r.q10.startsWith("Other")) return true;
                return false;
              }).length
            })).filter(d=>d.value>0);
            return nextData.length > 0 ? (
              <ResponsiveContainer width="100%" height={290}>
                <PieChart margin={{top:10,right:20,left:20,bottom:10}}>
                  <Pie data={nextData} cx="50%" cy="50%" outerRadius={72} dataKey="value"
                    label={({name,percent})=>`${Math.round(percent*100)}%`}
                    labelLine={{stroke:B.gray200}}>
                    {nextData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v,name)=>[`${v} agencies`,name]}/>
                  <Legend wrapperStyle={{fontSize:11,paddingTop:4}} iconSize={10} verticalAlign="bottom" layout="horizontal"/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{color:B.gray400,fontSize:14}}>No data for selected filters.</p>
            );
          })()}
        </div>


        {/* Q11 — Offshore/global remote talent */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>Do agencies employ offshore/global remote talent, and in which roles?</SectionTitle>
          <NCount n={responses.filter(r=>r.q11).length} filtered={filtered.filter(r=>r.q11).length} label="agencies answered" />
          <p style={{fontSize:14,color:B.gray600,marginBottom:16,lineHeight:1.6}}>
            For each office role, the percentage of all responding agencies that fill it with offshore/global remote talent.
            Agencies that said "No" contribute zero to each role bar.
          </p>
          <FilterBar filters={filters} setFilters={setFilters} responses={responses} title="Filter by:" />
          {(() => {
            const answered = filtered.filter(r=>r.q11);
            const n = answered.length || 1;
            const yesPct = Math.round(responses.filter(r=>r.q11==="Yes").length / n * 100);
            const noPct = 100 - yesPct;
            // Show ALL office roles, even those with 0%
            const roleData = OFFICE_ROLES.map(role => ({
              name: role,
              pct: Math.round(answered.filter(r =>
                r.q11 === "Yes" && Array.isArray(r.q11Positions) && r.q11Positions.includes(role)
              ).length / n * 100),
            }));

            return (
              <div>
                {/* Yes/No summary pills */}
                <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
                  <div style={{background:B.tealLight,border:`1.5px solid ${B.teal}`,
                    borderRadius:8,padding:"12px 20px",textAlign:"center",minWidth:140}}>
                    <div style={{fontSize:28,fontWeight:700,color:B.teal}}>{yesPct}%</div>
                    <div style={{fontSize:13,color:B.gray600,marginTop:4}}>employ offshore/global remote talent</div>
                  </div>
                  <div style={{background:B.gray50,border:`1.5px solid ${B.gray200}`,
                    borderRadius:8,padding:"12px 20px",textAlign:"center",minWidth:140}}>
                    <div style={{fontSize:28,fontWeight:700,color:B.gray600}}>{noPct}%</div>
                    <div style={{fontSize:13,color:B.gray600,marginTop:4}}>do not</div>
                  </div>
                </div>

                {/* Role breakdown bar chart — all roles shown */}
                <div style={{fontSize:13,fontWeight:600,color:B.navy,marginBottom:12}}>
                  Which roles are filled with offshore/global remote talent
                  <span style={{fontWeight:400,color:B.gray400,marginLeft:6}}>(% of all agencies)</span>
                </div>
                <ResponsiveContainer width="100%" height={roleData.length*52+40}>
                  <BarChart data={roleData} layout="vertical"
                    margin={{top:4,right:60,left:4,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={B.gray100} horizontal={false}/>
                    <XAxis type="number" domain={[0,100]}
                      tickFormatter={v=>`${v}%`}
                      tick={{fontSize:11,fill:B.gray400}}/>
                    <YAxis type="category" dataKey="name"
                      tick={{fontSize:12,fill:B.navy}} width={205}/>
                    <Tooltip formatter={v=>`${v}%`}/>
                    <Bar dataKey="pct" name="% of agencies" fill={B.teal}
                      radius={[0,4,4,0]}>
                      <LabelList dataKey="pct" position="right"
                        formatter={v=>`${v}%`}
                        style={{fontSize:12,fill:B.navy,fontWeight:600}}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>


        {/* Q13 — Highest turnover role */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>In which office role do agencies experience the highest turnover?</SectionTitle>
          <NCount n={responses.filter(r=>r.q13).length} filtered={filtered.filter(r=>r.q13).length} label="agencies answered" />
          <p style={{fontSize:14,color:B.gray600,marginBottom:16,lineHeight:1.6}}>
            The office function most commonly cited as having the highest employee churn.
          </p>
          <FilterBar filters={filters} setFilters={setFilters} responses={responses} title="Filter by:" />
          {(() => {
            const turnoverData = [...OFFICE_ROLES,"No significant turnover in any role"].map(role=>({
              name: role,
              value: filtered.filter(r=>r.q13===role).length
            })).filter(d=>d.value>0);
            return (
              <ResponsiveContainer width="100%" height={290}>
                <PieChart margin={{top:10,right:20,left:20,bottom:10}}>
                  <Pie data={turnoverData} cx="50%" cy="50%" outerRadius={72} dataKey="value"
                    label={({name,percent})=>`${Math.round(percent*100)}%`}
                    labelLine={{stroke:B.gray200}}>
                    {turnoverData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v,name)=>[`${v} agencies`,name]}/>
                  <Legend wrapperStyle={{fontSize:11,paddingTop:4}} iconSize={10} verticalAlign="bottom" layout="horizontal"/>
                </PieChart>
              </ResponsiveContainer>
            );
          })()}
        </div>

        {/* Section 3 */}
        <div style={{fontSize:11,fontWeight:600,color:B.gray400,letterSpacing:"1px",
          textTransform:"uppercase",marginBottom:16,marginTop:8,
          paddingBottom:8,borderBottom:`1px solid ${B.gray200}`}}>How agencies grow</div>

        {/* Hiring progression by hours */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>How many people does an agency employ in each role at a given size?</SectionTitle>
          <NCount n={responses.length} filtered={filtered.length} label="agencies" />
          <p style={{fontSize:14,color:B.gray600,marginBottom:16}}>
            Average number of employees per office role at each agency size.
            Stacked total shows average overall office headcount. Click any role to show or hide it.
          </p>
          <FilterBar filters={filters} setFilters={setFilters} responses={responses} title="Filter by:" />
          <TimelineByHours responses={responses} filters={filters} />
        </div>

        {/* Staffing build by size */}
        <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
          padding:"24px",marginBottom:48}}>
          <SectionTitle>Which office roles have agencies hired for at each size?</SectionTitle>
          <NCount n={responses.length} filtered={filtered.length} label="agencies" />
          <p style={{fontSize:14,color:B.gray600,marginBottom:16}}>
            The average percentage of agencies at each size band that have hired for a given role.
            Each segment represents one role. The number above each bar is the combined total across all roles.
            Click a role to show or hide it.
          </p>
          <FilterBar filters={filters} setFilters={setFilters} responses={responses} title="Filter by:" />
          <StackedRolesChart responses={responses} filters={filters} />
        </div>

        {/* Hiring flow % chart */}

        <PartnerSection />

        <div style={{textAlign:"center",padding:"20px 0",fontSize:13,color:B.gray400}}>
          Data reflects {responses.length} anonymous agency response{responses.length!==1?"s":""}.
          Built by <a href="https://sallysupport.com" style={{color:B.teal}}>SallySupport</a>.
        </div>
      </div>
    </div>
  );
}


// ─── Stacked roles hired by agency size ──────────────────────────
function StackedRolesChart({ responses, filters }) {
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({x:0,y:0});
  const [hidden, setHidden] = useState(new Set());
  const svgRef = useRef(null);

  const ROLE_COLORS = {
    "Scheduling/care coordination": "#1A2B4A",
    "Billing":                       "#2ABFAA",
    "Executive assistant/reception": "#F4A623",
    "HR/Recruitment":                "#6C7EAA",
    "Field supervisor":              "#4A90C4",
    "Sales/marketing":               "#C0392B",
  };

  function toggle(role) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  }

  // Compute avg roles hired per agency per band
  const activeResponses = filters ? responses.filter(r=>{
    if(filters.agencyType && !r.q3.startsWith(filters.agencyType)) return false;
    if(filters.payer && !r.q4.startsWith(filters.payer)) return false;
    if(filters.location && r.q1!==filters.location) return false;
    if(filters.market && r.q9!==filters.market) return false;
    return true;
  }) : responses;

  const matrix = HOUR_RANGES.map(band => {
    const sub = activeResponses.filter(r => r.q2 === band);
    const n = sub.length || 1;
    const entry = { band, n };
    OFFICE_ROLES.forEach(role => {
      entry[role] = sub.filter(r => r.q5[role] > 0).length / n;
    });
    return entry;
  });

  const W = 860, H = 340;
  const PAD = { t:24, r:20, b:52, l:80 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const nBands = HOUR_RANGES.length;
  const MAX_Y = 6;
  const BAR_GAP = iW / nBands;
  const BAR_W = BAR_GAP * 0.6;

  const yScale = v => PAD.t + iH - (v / MAX_Y) * iH;
  const xCenter = bi => PAD.l + bi * BAR_GAP + BAR_GAP / 2;

  function handleMouseMove(e, role, bi) {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltipPos({
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    });
    const pct = Math.round(matrix[bi][role] * 100);
    setTooltip({ role, pct, band: HOUR_RANGES[bi], n: matrix[bi].n });
  }

  const xLabels = ["0–500","501–1k","1–1.5k","1.5–2k","2–2.5k","2.5–3k","3k+"];

  return (
    <div>
      {/* Legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"8px 12px",marginBottom:16}}>
        {OFFICE_ROLES.map(role => {
          const isHidden = hidden.has(role);
          return (
            <button key={role} onClick={() => toggle(role)} style={{
              display:"flex",alignItems:"center",gap:6,fontSize:12,
              color:isHidden?B.gray400:B.gray600,
              background:isHidden?B.gray50:B.white,
              border:`1.5px solid ${B.gray200}`,borderRadius:20,
              padding:"4px 12px 4px 8px",cursor:"pointer",
              textDecoration:isHidden?"line-through":"none",
              opacity:isHidden?0.55:1,transition:"all .15s",
            }}>
              <div style={{width:10,height:10,borderRadius:2,flexShrink:0,
                background:ROLE_COLORS[role],opacity:isHidden?0.3:1}}/>
              {role}
            </button>
          );
        })}
      </div>

      <div style={{position:"relative"}}>
        <svg ref={svgRef} viewBox={"0 0 "+W+" "+H} style={{width:"100%",display:"block"}}>
          {/* Y gridlines */}
          {[0,1,2,3,4,5,6].map(r => {
            const y = yScale(r);
            return (
              <g key={r}>
                <line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y}
                  stroke={r===0?"#9AA0AD":"#DDE0E6"} strokeWidth={r===0?"1":"0.5"}/>
                <text x={PAD.l-8} y={y+4} fontSize="10" fill="#9AA0AD" textAnchor="end">
                  {r===0?"0%":r===1?"~1 role avg":`${r} roles avg`}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {matrix.map((d, bi) => {
            const cx = xCenter(bi);
            const bx = cx - BAR_W / 2;
            let yCursor = PAD.t + iH;
            let totalAvg = 0;

            const segments = OFFICE_ROLES.filter(r => !hidden.has(r)).map(role => {
              const avg = d[role] || 0;
              const barH = (avg / MAX_Y) * iH;
              return { role, avg, barH };
            }).filter(s => s.barH > 0.2);

            segments.forEach(s => { totalAvg += s.avg; });

            return (
              <g key={d.band}>
                {segments.map((s, si) => {
                  const y = yCursor - s.barH;
                  yCursor -= s.barH;
                  return (
                    <g key={s.role}>
                      <rect x={bx} y={y} width={BAR_W} height={s.barH}
                        fill={ROLE_COLORS[s.role]} style={{cursor:"pointer"}}
                        onMouseMove={e => handleMouseMove(e, s.role, bi)}
                        onMouseLeave={() => setTooltip(null)}/>
                      {si > 0 && (
                        <line x1={bx} y1={y+s.barH} x2={bx+BAR_W} y2={y+s.barH}
                          stroke={B.white} strokeWidth="1.5"/>
                      )}
                      {s.barH > 16 && BAR_W > 28 && (
                        <text x={cx} y={y+s.barH/2+4} fontSize="9.5" fontWeight="600"
                          fill="white" textAnchor="middle" style={{pointerEvents:"none"}}>
                          {Math.round(s.avg*100)}%
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Total label above bar */}
                {totalAvg > 0 && (
                  <text x={cx} y={yScale(totalAvg)-5} fontSize="10.5" fontWeight="600"
                    fill={B.gray800} textAnchor="middle">{totalAvg.toFixed(1)}</text>
                )}

                {/* X label */}
                <text x={cx} y={H-PAD.b+14} fontSize="10" fill={B.gray600} textAnchor="middle">
                  {xLabels[bi]}
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text x={PAD.l+iW/2} y={H-4} fontSize="11" fill={B.gray400} textAnchor="middle">
            Weekly billable hours
          </text>
          <text transform={"rotate(-90,10,"+(PAD.t+iH/2)+")"} x={10} y={PAD.t+iH/2}
            fontSize="11" fill={B.gray400} textAnchor="middle">
            % of agencies with role hired
          </text>

          {/* Tooltip */}
          {tooltip && (() => {
            const tx = Math.min(tooltipPos.x+12, W-225);
            const ty = Math.max(tooltipPos.y-52, 4);
            const lines = tooltip.role.split('/');
            const h = lines.length > 1 ? 68 : 54;
            return (
              <g style={{pointerEvents:"none"}}>
                <rect x={tx} y={ty} width={218} height={h} rx="5" fill={B.navy} opacity="0.93"/>
                <rect x={tx} y={ty} width={8} height={h} fill={ROLE_COLORS[tooltip.role]||B.teal}/>
                <text x={tx+16} y={ty+15} fontSize="11" fontWeight="600" fill="white">{lines[0]}</text>
                {lines[1] && <text x={tx+16} y={ty+29} fontSize="11" fontWeight="600" fill="white">{lines[1]}</text>}
                <text x={tx+16} y={lines[1] ? ty+45 : ty+31} fontSize="10" fill={B.tealLight}>
                  {tooltip.pct}% of agencies hired this role
                </text>
                <text x={tx+16} y={lines[1] ? ty+59 : ty+45} fontSize="10" fill={B.gray400}>
                  {tooltip.band} hrs · n={tooltip.n} agencies
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}


// ─── Key findings editor ──────────────────────────────────────────
function KeyFindingsEditor() {
  const [findings, setFindings] = useState(["","","","",""]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings().then(saved => {
      if (saved && Array.isArray(saved)) {
        const padded = [...saved, ...["","","","",""]].slice(0,5);
        setFindings(padded);
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    setStatus("saving");
    const toSave = findings.map(f => f.trim()).filter(Boolean);
    const ok = await saveSettings("key_findings", toSave.length > 0 ? toSave : []);
    setStatus(ok ? "saved" : "error");
    setTimeout(() => setStatus(null), 3000);
  }

  async function reset() {
    if (!confirm("Reset to auto-generated findings?")) return;
    await saveSettings("key_findings", []);
    setFindings(["","","","",""]);
    setStatus("reset");
    setTimeout(() => setStatus(null), 3000);
  }

  return (
    <div style={{background:B.white,border:`1.5px solid ${B.gray200}`,borderRadius:10,
      padding:"24px",marginBottom:32}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:6,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:700,color:B.navy,margin:0}}>Key findings</h2>
          <p style={{fontSize:13,color:B.gray400,margin:"4px 0 0"}}>
            Edit the five findings shown at the top of the dashboard.
            Leave all fields blank to revert to auto-generated findings.
          </p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn small secondary onClick={reset}>Reset to auto</Btn>
          <Btn small onClick={save} style={{
            background: status==="saved"?"#27AE60":status==="error"?"#C0392B":B.navy
          }}>
            {status==="saving"?"Saving…":status==="saved"?"Saved!":status==="error"?"Error — retry":"Save findings"}
          </Btn>
        </div>
      </div>

      {loading ? (
        <p style={{color:B.gray400,fontSize:14,padding:"16px 0"}}>Loading…</p>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:16}}>
          {findings.map((f,i) => (
            <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{color:B.teal,fontWeight:700,fontSize:16,flexShrink:0,marginTop:10}}>→</span>
              <textarea
                value={f}
                onChange={e => {
                  const next = [...findings];
                  next[i] = e.target.value;
                  setFindings(next);
                }}
                placeholder={`Finding ${i+1} — leave blank to skip`}
                rows={2}
                style={{flex:1,padding:"10px 14px",fontSize:14,borderRadius:8,resize:"vertical",
                  border:`1.5px solid ${f.trim()?B.navy:B.gray200}`,lineHeight:1.5,
                  fontFamily:"inherit",color:B.navy,background:f.trim()?B.tealLight:B.white,
                  transition:"all .15s"}}
              />
            </div>
          ))}
        </div>
      )}
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

        <KeyFindingsEditor />

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
  const [customFindings, setCustomFindings] = useState(null);

  useEffect(() => {
    async function init() {
      await seedIfEmpty();
      const data = await loadResponses();
      setResponses(data);
      setDbReady(true);
      const savedFindings = await loadSettings();
      if (savedFindings) setCustomFindings(savedFindings);

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
  if (view === "dashboard") return <Dashboard onBack={null} responses={responses} customFindings={customFindings} />;
  return <ReturningUser onValid={t=>{setToken(t);setView("dashboard");}} onTakeSurvey={()=>setView("welcome")} />;
}
