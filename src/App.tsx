import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Building2, 
  FileText, 
  Upload, 
  FileSpreadsheet, 
  ChevronRight, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Printer, 
  Layers, 
  Bookmark, 
  Brain, 
  Trash2,
  Edit3,
  ListFilter,
  ArrowRightLeft,
  ChevronDown,
  Info,
  Calendar,
  Save,
  Check,
  RefreshCw,
  Search,
  Globe,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  Activity,
  ArrowRight,
  Lock,
  Image,
  Paperclip,
  Database
} from "lucide-react";
import Markdown from "react-markdown";
import { FinancialYear, ForecastYear, AlertMessage, Pratica } from "./types";

const sectionsConfig = [
  { num: 1, name: "1. Richiesta e fidi proposti", desc: "Pricing, tassi, spread e commissioni delle linee proposte", source: "udcCondizioni / udmCondizioni" },
  { num: 2, name: "2. Governance e compagine sociale", desc: "Soci, amministratori, controlli e beneficiari effettivi", source: "Report Gold / Visura" },
  { num: 3, name: "3. Cenni storici", desc: "Fondazione, tappe storiche ed evoluzione territoriale", source: "Relazione Sulla Gestione / Visura" },
  { num: 4, name: "4. Note su soci e organi d'amministrazione", desc: "Commenti su successione, deleghe e ricancio generazionale", source: "Note Qualitativo" },
  { num: 5, name: "5. Punti di forza d'azienda (SWOT)", desc: "Mitigazioni crediti, vantaggi operativi e vantaggi competitivi", source: "Note Qualitativo" },
  { num: 6, name: "6. Punti di debolezza d'azienda (SWOT)", desc: "Aree di rischio presidiate, concentrazione clienti", source: "Note Qualitativo" },
  { num: 7, name: "7. Principali prodotti / organizzazione commerciale", desc: "Unità logistica Casoria, flotta, foto e sopralluoghi degli stabilimenti", source: "immaginiAzienda / Relazione Gestione" },
  { num: 8, name: "8. Storia d'affidamento e precedenti significativi", desc: "Merito storico creditizio e tappe di affidamento", source: "Note Qualitativo" },
  { num: 9, name: "9. Mercato e concorrenza", desc: "Scenario economico con fonti web istituzionali", source: "Istat / Cerved / Web" },
  { num: 10, name: "10. Presentazione strategica cliente", desc: "Sintesi consolidamento business e modello distributivo", source: "Business Plan / Relazione Sulla Gestione" },
  { num: 11, name: "11. Andamento conti in banca / reciprocità commerciale", desc: "Movimentazione, andamento, andamento conti e reciprocità commerciale", source: "redditivita / Estratti" },
  { num: 12, name: "12. Commento Cebi + Bilce (Scostamenti)", desc: "Commento economico, scostamenti e dicitura score LOM", source: "BILCe / LOM Report" },
  { num: 13, name: "13. Centrale Rischi / CRIF / Eurisc", desc: "Analisi di accordato e utilizzato, sconfinamenti e fasce di rischio", source: "centraleRischi / CRIF / Eurisc" }
];

function processTextForGroundedSpans(text: string) {
  if (!text || typeof text !== 'string') return text;
  
  const regex = /({{CLIENTE_CONCENTRATO_A}}|\b\d+[,.]\d+\s*(?:K\s*€|MLN\s*€|€)\b|(?:€\s*\d+(?:[.,]\d+)*\b)|\b\d+[,.]\d+\s*%\b|\b(?:Centrale Rischi|udcCondizioni|BILCe|CEBI|LOM|CRIF|Eurisc)\b)/gi;
  
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  
  return parts.map((part, i) => {
    if (!part) return null;
    const lower = part.toLowerCase();
    
    if (lower === "{{cliente_concentrato_a}}") {
      return (
        <span key={i} className="relative group inline-block mx-0.5 bg-[#e0e7ff] text-[#4338ca] border border-[#c7d2fe] rounded px-1.5 py-0.5 text-[11px] font-bold font-mono">
          [CLIENTE CONCENTRATO A]
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 bg-[#0f172a] text-white text-[10px] p-2 rounded-md shadow-lg w-52 font-medium pointer-events-none text-center">
            Nome d'origine rimosso e censurato via whitelisting post-processing deterministico per prevenire allucinazioni o fuoriuscite di dati.
          </span>
        </span>
      );
    }
    
    if (lower === "centrale rischi") {
      return (
        <span key={i} className="relative group inline-block mx-0.5 bg-[#fef2f2] text-[#b91c1c] border border-[#fca5a5] rounded px-1.5 py-0.2 text-[10.5px] font-bold font-mono">
          {part}
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 bg-[#0f172a] text-white text-[10px] p-2 rounded-md shadow-lg w-48 font-normal leading-relaxed pointer-events-none text-left">
            <strong>Fonte di Verità:</strong> Centrale Rischi (BdI)
            <br />Disponibile via allegato autenticato.
          </span>
        </span>
      );
    }
    
    if (lower === "udccondizioni") {
      return (
        <span key={i} className="relative group inline-block mx-0.5 bg-[#fef3c7] text-[#b45309] border border-[#fde68a] rounded px-1.5 py-0.2 text-[10.5px] font-bold font-mono">
          {part}
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 bg-[#0f172a] text-white text-[10px] p-2 rounded-md shadow-lg w-48 font-normal leading-relaxed pointer-events-none text-left">
            <strong>Fonte di Verità:</strong> udcCondizioni
            <br />Delibera ufficiale dei tassi d'istruttoria proposti.
          </span>
        </span>
      );
    }
    
    if (lower === "bilce" || lower === "cebi" || lower === "lom") {
      return (
        <span key={i} className="relative group inline-block mx-0.5 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] rounded px-1.5 py-0.2 text-[10.5px] font-bold font-mono">
          {part}
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 bg-[#0f172a] text-white text-[10px] p-2 rounded-md shadow-lg w-48 font-normal leading-relaxed pointer-events-none text-left">
            <strong>Fonte di Verità:</strong> {part} Report
            <br />Analisi riclassificata fidi d'impresa.
          </span>
        </span>
      );
    }
    
    if (lower === "crif" || lower === "eurisc") {
      return (
        <span key={i} className="relative group inline-block mx-0.5 bg-[#faf5ff] text-[#6b21a8] border border-[#e9d5ff] rounded px-1.5 py-0.2 text-[10.5px] font-bold font-mono">
          {part}
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 bg-[#0f172a] text-white text-[10px] p-2 rounded-md shadow-lg w-48 font-normal leading-relaxed pointer-events-none text-left">
            <strong>Fonte di Verità:</strong> CRIF Eurisc Card
            <br />Score di merito d'affidabilità creditizia.
          </span>
        </span>
      );
    }
    
    if (/\d/.test(part)) {
      let colorClass = "bg-[#f8fafc] text-[#334155] border-[#cbd5e1] hover:bg-[#f1f5f9]";
      let tooltipText = "Dato finanziario pre-calcolato ed estratto per l'analisi dal fascicolo fidi.";
      
      if (part.includes("%")) {
        colorClass = "bg-[#fffbeb] text-[#92400e] border-[#fde68a] hover:bg-[#fef3c7]";
        tooltipText = "Tasso d'interesse o commissione d'istruttoria. Riconducibile alla delibera fidi 'udcCondizioni'.";
      } else if (part.toUpperCase().includes("K") || part.toUpperCase().includes("MLN") || part.includes("€") || (part.length > 3 && part.includes("."))) {
        colorClass = "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0] hover:bg-[#d1fae5] font-semibold";
        tooltipText = "Valore monetario consolidato verificato e riconciliato nel Credit Data Audit.";
      }
      
      return (
        <span key={i} className={`relative group inline-block mx-0.5 rounded px-1 leading-normal text-xs border transition cursor-pointer ${colorClass}`}>
          {part}
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 bg-[#0f172a] text-white text-[10px] p-2.5 rounded-lg shadow-xl w-56 font-sans font-normal leading-relaxed pointer-events-none text-left">
            <strong>DATO GROUNDED:</strong> {part}
            <br />
            {tooltipText}
          </span>
        </span>
      );
    }
    
    return <span key={i}>{part}</span>;
  });
}

const stripCreditDataAudit = (md: string, stripAudit: boolean = true, stripSection1: boolean = true): string => {
  if (!md) return "";
  const lines = md.split(/\r?\n/);
  const resultLines: string[] = [];
  let skipAudit = false;
  let skipSec1 = false;
  const auditHeaderRegex = /^#\s*\*?\*?VERIFICA\s+COERENZA/i;
  const section1HeaderRegex = /^(?:#+\s*)?\*?\*?1\b/i;
  const section2HeaderRegex = /^(?:#+\s*)?\*?\*?2\b/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (stripAudit && auditHeaderRegex.test(trimmed)) {
      skipAudit = true;
      continue;
    }
    
    if (stripSection1 && section1HeaderRegex.test(trimmed)) {
      skipSec1 = true;
      continue;
    }
    
    if (skipAudit) {
      if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
        if (!auditHeaderRegex.test(trimmed)) {
          skipAudit = false;
        }
      }
    }
    
    if (skipSec1) {
      if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
        if (section2HeaderRegex.test(trimmed)) {
          skipSec1 = false;
        }
      }
    }
    
    if (!skipAudit && !skipSec1) {
      resultLines.push(line);
    }
  }
  return resultLines.join("\n");
};

export default function App() {
  // Authentication states
  const [userToken, setUserToken] = useState<string | null>(localStorage.getItem("malamisura_auth_token"));
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'resetConfirm'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMessage, setAuthSuccessMessage] = useState('');
  const [authLoadingSpin, setAuthLoadingSpin] = useState(false);

  // Password reset state
  const [resetCode, setResetCode] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('');

  // Master Supervisor options
  const [supervisorUserFilter, setSupervisorUserFilter] = useState('all');

  // Application states
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [selectedPratica, setSelectedPratica] = useState<Pratica | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [docFilter, setDocFilter] = useState<string>("all");
  
  const [activeSidebarView, setActiveSidebarView] = useState<'pratiche' | 'fascicolo'>('pratiche');
  
  // Create practice state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAziendaName, setNewAziendaName] = useState("");
  const [newNumeroPratica, setNewNumeroPratica] = useState("");
  const [newCdgCliente, setNewCdgCliente] = useState("");
  const [newAndamentoContiBanca, setNewAndamentoContiBanca] = useState("");
  const [newDocType, setNewDocType] = useState<'BILCe' | 'CEBI' | 'LOM'>("BILCe");
  const [newDescrizione, setNewDescrizione] = useState(
    "Istruttoria di fidi ordinaria per richiesta finanziamento a medio-lungo termine chirografario/ipotecario volto a sostenere lo smobilizzo circolante e investimenti produttivi."
  );

  // File Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI report states
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isRegeneratingSection7, setIsRegeneratingSection7] = useState(false);
  const [isAnalyzingImages, setIsAnalyzingImages] = useState(false);
  const [reportGenStage, setReportGenStage] = useState("");
  const [activeTab, setActiveTab] = useState<'visualizza' | 'modifica' | 'assistente' | 'sezioni'>("visualizza");
  const [selectedSectionNum, setSelectedSectionNum] = useState<number>(1);
  const [sectionsInstructionsMap, setSectionsInstructionsMap] = useState<Record<number, string>>({});
  const sectionInstructions = sectionsInstructionsMap[selectedSectionNum] || "";
  const setSectionInstructions = (val: string) => {
    setSectionsInstructionsMap(prev => ({ ...prev, [selectedSectionNum]: val }));
  };
  const [individualSectionEditText, setIndividualSectionEditText] = useState<string>("");
  const [isRegeneratingSection, setIsRegeneratingSection] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState("");
  const [chatAttachments, setChatAttachments] = useState<{ fileData: string; fileName: string; fileType: string }[]>([]);
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [editedMarkdown, setEditedMarkdown] = useState("");
  const [reportLoadingTimer, setReportLoadingTimer] = useState(0);
  const [reportQuotaError, setReportQuotaError] = useState<{ message: string; retryIn?: string } | null>(null);

  // Custom elegant toast notification state for iframe-friendly alerts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Edit details states
  const [isEditingAzienda, setIsEditingAzienda] = useState(false);
  const [editedAziendaName, setEditedAziendaName] = useState("");
  const [editedSettore, setEditedSettore] = useState("");
  const [editedDescrizione, setEditedDescrizione] = useState("");
  const [editedNoteLibere, setEditedNoteLibere] = useState("");
  const [editedNumeroPratica, setEditedNumeroPratica] = useState("");
  const [editedCdgCliente, setEditedCdgCliente] = useState("");
  const [editedAndamentoConti, setEditedAndamentoConti] = useState("");
  const [financialTab, setFinancialTab] = useState<'storico' | 'previsionale'>('storico');

  // Alerts accordion state
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});
  const [showOtherAlerts, setShowOtherAlerts] = useState(false);

  // Inline editing and prompt banner states
  const [showRegenerationBanner, setShowRegenerationBanner] = useState(false);
  const [isEditingInlineNotes, setIsEditingInlineNotes] = useState(false);
  const [isEditingInlineAndamento, setIsEditingInlineAndamento] = useState(false);
  const [isEditingInlineDescrizione, setIsEditingInlineDescrizione] = useState(false);
  const [inlineNotesVal, setInlineNotesVal] = useState("");
  const [inlineAndamentoVal, setInlineAndamentoVal] = useState("");
  const [inlineDescrizioneVal, setInlineDescrizioneVal] = useState("");

  const [isGroundingDescrizione, setIsGroundingDescrizione] = useState(false);
  const [isExtractingLinesAI, setIsExtractingLinesAI] = useState(false);
  const [isGroundingAndamento, setIsGroundingAndamento] = useState(false);
  const [isGroundingNoteLibere, setIsGroundingNoteLibere] = useState(false);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Request password reset
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMessage('');
    setDemoOtpCode('');
    if (!authEmail) {
      setAuthError("Inserisci l'indirizzo email.");
      return;
    }
    setAuthLoadingSpin(true);
    try {
      const res = await fetch("/api/auth/reset-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossibile avviare il recupero.");
      }
      setAuthSuccessMessage("Verifica avviata!");
      if (data.demoOtp) {
        setDemoOtpCode(data.demoOtp);
      }
      setAuthMode('resetConfirm');
    } catch (err: any) {
      setAuthError(err.message || "Errore di connessione.");
    } finally {
      setAuthLoadingSpin(false);
    }
  };

  // 2. Confirm password reset with OTP
  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMessage('');
    if (!authEmail || !resetCode || !authPassword) {
      setAuthError("Tutti i campi sono obbligatori.");
      return;
    }
    setAuthLoadingSpin(true);
    try {
      const res = await fetch("/api/auth/reset-password-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          code: resetCode,
          newPassword: authPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Codice errato o scaduto.");
      }
      setAuthSuccessMessage("Password reimpostata con successo! Ora puoi accedere.");
      setAuthMode('login');
      setResetCode('');
      setAuthPassword('');
      setDemoOtpCode('');
    } catch (err: any) {
      setAuthError(err.message || "Errore di connessione.");
    } finally {
      setAuthLoadingSpin(false);
    }
  };

  // Resilient session restoration sync (For Cloud Run statutory ephemeral storage lifecycle)
  const restoreSession = async (backup: any): Promise<boolean> => {
    try {
      const offlinePraticheStr = localStorage.getItem("malamisura_offline_pratiche_v1");
      const offlinePratiche = offlinePraticheStr ? JSON.parse(offlinePraticheStr) : [];

      const res = await fetch("/api/auth/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: backup.email,
          name: backup.name,
          password: backup.password,
          pratiche: offlinePratiche
        })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("malamisura_auth_token", data.token);
        setUserToken(data.token);
        setCurrentUser(data.user);
        // Refresh restored database
        await fetchPratiche(undefined, data.token);
        return true;
      }
    } catch (err) {
      console.error("Session auto-restoration background sync failed:", err);
    }
    return false;
  };

  // Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMessage('');
    if (!authEmail || !authPassword || (authMode === 'register' && !authName)) {
      setAuthError('Tutti i campi sono obbligatori.');
      return;
    }
    
    setAuthLoadingSpin(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authMode === 'login' 
        ? { email: authEmail, password: authPassword }
        : { email: authEmail, password: authPassword, name: authName };
        
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante l\'autenticazione.');
      }
      
      localStorage.setItem('malamisura_auth_token', data.token);
      localStorage.setItem('malamisura_auth_backup', JSON.stringify({
        email: data.user.email,
        name: data.user.name,
        password: authPassword
      }));
      // Keep a persistent registration backup that is NOT deleted on logout
      localStorage.setItem('malamisura_persistent_reg', JSON.stringify({
        email: data.user.email,
        name: data.user.name,
        password: authPassword
      }));
      setUserToken(data.token);
      setCurrentUser(data.user);
      
      // Clear fields
      setAuthPassword('');
      setAuthEmail('');
      setAuthName('');
      
      // Fetch practices immediately with the new token
      await fetchPratiche(undefined, data.token);
    } catch (err: any) {
      console.error(err);
      
      // Resilient Auto-recovery: if manual login fails due to server restart wipeout
      const backupStr = localStorage.getItem('malamisura_auth_backup');
      let backup = backupStr ? JSON.parse(backupStr) : null;
      
      // Fallback to persistent registration backup if the user logged out previously
      if (!backup) {
        const persistentRegStr = localStorage.getItem('malamisura_persistent_reg');
        if (persistentRegStr) {
          try {
            const pReg = JSON.parse(persistentRegStr);
            if (pReg && pReg.email.toLowerCase() === authEmail.toLowerCase() && pReg.password === authPassword) {
              backup = pReg;
            }
          } catch (e) {
            console.error("Failed to parse persistent credentials fallback:", e);
          }
        }
      }

      if (backup && backup.email.toLowerCase() === authEmail.toLowerCase() && authMode === 'login') {
        const restored = await restoreSession(backup);
        if (restored) {
          // Re-create the normal backup as well
          localStorage.setItem('malamisura_auth_backup', JSON.stringify(backup));
          setAuthPassword('');
          setAuthEmail('');
          setAuthError('');
          return;
        }
      }
      
      setAuthError(err.message || 'Errore di connessione al server.');
    } finally {
      setAuthLoadingSpin(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("malamisura_auth_token");
    localStorage.removeItem("malamisura_auth_backup");
    localStorage.removeItem("malamisura_offline_pratiche_v1");
    setUserToken(null);
    setCurrentUser(null);
    setPratiche([]);
    setSelectedPratica(null);
  };

  // Verify token validation on load
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("malamisura_auth_token");
      const backupStr = localStorage.getItem("malamisura_auth_backup");
      const backup = backupStr ? JSON.parse(backupStr) : null;

      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUserToken(token);
          setCurrentUser(data.user);
          // Fetch historical database files
          await fetchPratiche(undefined, token);
        } else {
          // Token is present but user profile is missing (due to server container wipeout)
          if (backup) {
            console.log("🔄 Auto-restoring credit session index of user...");
            const restored = await restoreSession(backup);
            if (!restored) {
              localStorage.removeItem("malamisura_auth_token");
              localStorage.removeItem("malamisura_auth_backup");
              setUserToken(null);
              setCurrentUser(null);
            }
          } else {
            localStorage.removeItem("malamisura_auth_token");
            setUserToken(null);
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error("Auth validation failed:", err);
        // Server could be temporarily down or restarted. Keep the offline view visible so they never lose work.
        if (backup) {
          setUserToken(token);
          setCurrentUser({ email: backup.email, name: backup.name });
          const offlinePraticheStr = localStorage.getItem("malamisura_offline_pratiche_v1");
          if (offlinePraticheStr) {
            setPratiche(JSON.parse(offlinePraticheStr));
          }
        }
      } finally {
        setAuthLoading(false);
      }
    };
    verifyToken();
  }, []);

  // 1. Fetch practice history with bearer authorization
  const fetchPratiche = async (selectId?: string, customToken?: string | null) => {
    const activeToken = customToken !== undefined ? customToken : userToken;
    if (!activeToken) return;
    
    try {
      const res = await fetch("/api/pratiche", {
        headers: {
          "Authorization": `Bearer ${activeToken}`
        }
      });
      if (!res.ok) throw new Error("Errore nel recupero della cronologia fidi.");
      let list: Pratica[] = await res.json();
      
      // Resilient background sync of any offline parent practices that are missing from server
      const offlinePraticheStr = localStorage.getItem("malamisura_offline_pratiche_v1");
      if (offlinePraticheStr) {
        try {
          const offlinePratiche: Pratica[] = JSON.parse(offlinePraticheStr);
          const emailToCheck = currentUser?.email || "m.malamisura@gmail.com";
          const isMaster = emailToCheck.toLowerCase() === "m.malamisura@gmail.com";
          
          const myOfflinePratiche = offlinePratiche.filter(op => 
            isMaster || !op.ownerEmail || op.ownerEmail.toLowerCase() === emailToCheck.toLowerCase()
          );
          
          const missingOnServer = myOfflinePratiche.filter(op => !list.some(s => s.id === op.id));
          if (missingOnServer.length > 0) {
            console.log(`Syncing ${missingOnServer.length} missing practices back to server...`);
            const syncRes = await fetch("/api/pratiche/sync", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${activeToken}`
              },
              body: JSON.stringify({ pratiche: missingOnServer })
            });
            if (syncRes.ok) {
              // Re-fetch updated list from server
              const refreshRes = await fetch("/api/pratiche", {
                headers: { "Authorization": `Bearer ${activeToken}` }
              });
              if (refreshRes.ok) {
                list = await refreshRes.json();
              }
            }
          }
        } catch (syncErr) {
          console.error("Silent background practice restoration failed:", syncErr);
        }
      }

      setPratiche(list);
      
      // Store list for offline resilient persistence
      localStorage.setItem("malamisura_offline_pratiche_v1", JSON.stringify(list));
      
      if (selectId) {
        const found = list.find(p => p.id === selectId);
        if (found) setSelectedPratica(found);
      } else if (list.length > 0) {
        // Only select first if nothing is selected or if selected is not in the list anymore
        setSelectedPratica(prev => {
          if (prev && list.some(l => l.id === prev.id)) {
            return list.find(l => l.id === prev.id) || prev;
          }
          return list[0];
        });
      } else {
        setSelectedPratica(null);
      }
    } catch (err) {
      console.error(err);
      // Attempt read-only fallback to local cache
      const offlinePraticheStr = localStorage.getItem("malamisura_offline_pratiche_v1");
      if (offlinePraticheStr) {
        setPratiche(JSON.parse(offlinePraticheStr));
      } else {
        alert("Impossibile contattare il server delle pratiche fidi.");
      }
    }
  };

  // Update editor value when selected practice changes
  useEffect(() => {
    if (selectedPratica) {
      setEditedMarkdown(selectedPratica.markdownReport || "");
      setEditedAziendaName(selectedPratica.aziendaName);
      setEditedSettore(selectedPratica.settoreAttivita || "Da definire");
      setEditedDescrizione(selectedPratica.descrizioneOperazione || "");
      setEditedNoteLibere(selectedPratica.noteLibere || "");
      setEditedNumeroPratica(selectedPratica.numeroPratica || "");
      setEditedCdgCliente(selectedPratica.cdgCliente || "");
      setEditedAndamentoConti(selectedPratica.andamentoContiBanca || "");
      
      // Inline edit sync
      setInlineNotesVal(selectedPratica.noteLibere || "");
      setInlineAndamentoVal(selectedPratica.andamentoContiBanca || "");
      setInlineDescrizioneVal(selectedPratica.descrizioneOperazione || "");
      setIsEditingInlineNotes(false);
      setIsEditingInlineAndamento(false);
      setIsEditingInlineDescrizione(false);
      setShowRegenerationBanner(false);
    }
  }, [selectedPratica]);

  // Helper to find starting index and length of a section header in markdown
  const findSectionHeaderIndex = (text: string, num: number) => {
    if (!text) return { index: -1, length: 0 };
    
    // Try 1: Try to match with markdown header symbols (e.g. #, ##, ###) at the start of a line
    const headerWithMarkdownRegex = new RegExp(`(?:^|\\r?\\n)(#{1,4}\\s+)(${num}\\.\\s+[^\\n]+)`, 'i');
    let match = text.match(headerWithMarkdownRegex);
    if (match) {
      let matchedText = match[0];
      let index = match.index!;
      if (matchedText.startsWith('\r\n')) {
        index += 2;
      } else if (matchedText.startsWith('\n')) {
        index += 1;
      }
      return { index, length: matchedText.length - (matchedText.startsWith('\r\n') ? 2 : matchedText.startsWith('\n') ? 1 : 0) };
    }
    
    // Try 2: Try to match without markdown header symbols, but must be at the start of a line and followed by uppercase letters (titles)
    const headerPlainRegex = new RegExp(`(?:^|\\r?\\n)(${num}\\.\\s+[A-Z\xC0-\xDF]{2,})`);
    match = text.match(headerPlainRegex);
    if (match) {
      let matchedText = match[0];
      let index = match.index!;
      if (matchedText.startsWith('\r\n')) {
        index += 2;
      } else if (matchedText.startsWith('\n')) {
        index += 1;
      }
      return { index, length: matchedText.length - (matchedText.startsWith('\r\n') ? 2 : matchedText.startsWith('\n') ? 1 : 0) };
    }

    // Try 3: Simple fallback matching just start-of-line number, dot and space
    const fallbackRegex = new RegExp(`(?:^|\\r?\\n)(${num}\\.\\s+)`);
    match = text.match(fallbackRegex);
    if (match) {
      let matchedText = match[0];
      let index = match.index!;
      if (matchedText.startsWith('\r\n')) {
        index += 2;
      } else if (matchedText.startsWith('\n')) {
        index += 1;
      }
      return { index, length: matchedText.length - (matchedText.startsWith('\r\n') ? 2 : matchedText.startsWith('\n') ? 1 : 0) };
    }
    
    return { index: -1, length: 0 };
  };

  // Helper to extract a single section
  const extractMarkdownSection = (fullText: string, num: number): string => {
    if (!fullText) return "";
    
    const currentHeader = findSectionHeaderIndex(fullText, num);
    if (currentHeader.index === -1) return "";
    
    const nextHeader = findSectionHeaderIndex(fullText, num + 1);
    if (nextHeader.index !== -1 && nextHeader.index > currentHeader.index) {
      return fullText.substring(currentHeader.index, nextHeader.index).trim();
    }
    
    return fullText.substring(currentHeader.index).trim();
  };

  // Sync section edit text when section selection or markdown Report changes
  useEffect(() => {
    if (selectedPratica && selectedPratica.markdownReport) {
      const sectionText = extractMarkdownSection(selectedPratica.markdownReport, selectedSectionNum);
      setIndividualSectionEditText(sectionText);
    } else {
      setIndividualSectionEditText("");
    }
  }, [selectedSectionNum, selectedPratica?.markdownReport]);

  const handleRegenerateSection = async (sectionNum: number) => {
    if (!selectedPratica) return;
    setIsRegeneratingSection(true);
    try {
      const response = await fetch(`/api/pratiche/${selectedPratica.id}/regenerate-section`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          sectionNum,
          userInstructions: sectionInstructions,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Impossibile rigenerare la sezione.");
      }
      
      // Update local state with the new practice
      if (data.practice) {
        setSelectedPratica(data.practice);
        setPratiche(prev => prev.map(p => p.id === selectedPratica.id ? data.practice : p));
        setSectionInstructions(""); // Clear instructions on success
        showToast(`Sezione ${sectionNum} rigenerata con successo con AI Grounding!`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Errore durante la rigenerazione della sezione con l'AI.", "error");
    } finally {
      setIsRegeneratingSection(false);
    }
  };

  const handleUpdateSection = async (sectionNum: number) => {
    if (!selectedPratica) return;
    try {
      const response = await fetch(`/api/pratiche/${selectedPratica.id}/update-section`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          sectionNum,
          content: individualSectionEditText,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Impossibile salvare la sezione.");
      }
      
      // Update local state with the new practice
      if (data.practice) {
        setSelectedPratica(data.practice);
        setPratiche(prev => prev.map(p => p.id === selectedPratica.id ? data.practice : p));
        showToast(`Modifiche alla Sezione ${sectionNum} salvate nel report complessivo!`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Errore durante il salvataggio della sezione.", "error");
    }
  };

  // Loading timer helper for report generation
  useEffect(() => {
    if (isGeneratingReport) {
      timerIntervalRef.current = setInterval(() => {
        setReportLoadingTimer(t => t + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setReportLoadingTimer(0);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isGeneratingReport]);

  const handleCreatePratica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAziendaName.trim()) return;
    
    try {
      const res = await fetch("/api/pratiche", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          aziendaName: newAziendaName,
          docType: newDocType,
          descrizioneOperazione: newDescrizione,
          numeroPratica: newNumeroPratica,
          cdgCliente: newCdgCliente,
          andamentoContiBanca: newAndamentoContiBanca
        })
      });
      if (!res.ok) throw new Error("Errore di rete");
      const created: Pratica = await res.json();
      
      // Reset values
      setNewAziendaName("");
      setNewNumeroPratica("");
      setNewCdgCliente("");
      setNewAndamentoContiBanca("");
      setNewDescrizione("Istruttoria di fidi ordinaria per richiesta finanziamento a medio-lungo termine chirografario/ipotecario volto a sostenere lo smobilizzo circolante e investimenti produttivi.");
      setShowCreateModal(false);
      
      // Refresh list & select the new item
      await fetchPratiche(created.id);
    } catch (err) {
      console.error(err);
      alert("Impossibile creare una nuova pratica.");
    }
  };

  const handleDeletePratica = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Sei sicuro di voler eliminare questa pratica creditizia? L'azione è irreversibile.")) return;
    
    try {
      const res = await fetch(`/api/pratiche/${id}`, { 
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${userToken}`
        }
      });
      if (res.ok) {
        if (selectedPratica?.id === id) {
          setSelectedPratica(null);
        }
        
        // Remove from offline storage
        const offlinePraticheStr = localStorage.getItem("malamisura_offline_pratiche_v1");
        if (offlinePraticheStr) {
          const offlinePratiche: Pratica[] = JSON.parse(offlinePraticheStr);
          const updatedOffline = offlinePratiche.filter(op => op.id !== id);
          localStorage.setItem("malamisura_offline_pratiche_v1", JSON.stringify(updatedOffline));
        }

        fetchPratiche();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [activeUploadSlot, setActiveUploadSlot] = useState<string | null>(null);

  const triggerUploadForSlot = (slotName: string) => {
    setActiveUploadSlot(slotName);
    fileInputRef.current?.click();
  };

  // Convert File objects to Base64 and upload sequentially supporting multi-file slots
  const processMultipleUploadedFiles = async (files: File[], slotName: string) => {
    if (!selectedPratica) return;

    // Filter out unsupported file endings
    const filesToUpload = files.filter(file => {
      const nameLower = file.name.toLowerCase();
      if (slotName === "immaginiAzienda") {
        const isImage = 
          nameLower.endsWith(".jpg") || 
          nameLower.endsWith(".jpeg") || 
          nameLower.endsWith(".png") || 
          nameLower.endsWith(".gif") || 
          nameLower.endsWith(".webp");
        if (!isImage) {
          alert(`Formato file non supportato: ${file.name}. Per questo slot sono consentite solo immagini (.jpg, .jpeg, .png, .gif, .webp).`);
        }
        return isImage;
      } else {
        const isValid = 
          nameLower.endsWith(".pdf") || 
          nameLower.endsWith(".xlsx") || 
          nameLower.endsWith(".xls") || 
          nameLower.endsWith(".doc") || 
          nameLower.endsWith(".docx") || 
          nameLower.endsWith(".txt");
        if (!isValid) {
          alert(`Formato file non supportato: ${file.name}. Carica solo file PDF, Excel (.xlsx, .xls), Word (.doc, .docx) o Testo (.txt).`);
        }
        return isValid;
      }
    });

    if (filesToUpload.length === 0) return;

    setIsProcessingFile(true);

    const readAsDataURLPromise = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Errore di lettura del file"));
      });
    };

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const countLabel = filesToUpload.length > 1 ? `[FILE ${i + 1} di ${filesToUpload.length}] ` : "";
      
      const isQuantitative = ["cebi", "bilce", "lom", "businessplan"].includes(slotName.toLowerCase());
      const isUdcCondizioni = slotName.toLowerCase() === "udccondizioni";
      const isCentraleRischi = slotName.toLowerCase() === "centralerischi";
      const isCrif = slotName.toLowerCase() === "sprintcrif";
      const isReportGold = slotName.toLowerCase() === "reportgold";

      if (isQuantitative) {
        setUploadProgressMsg(`${countLabel}Estrazione dati finanziari da "${file.name}"... L'analisi AI tramite Gemini può richiedere circa 4-10 secondi.`);
      } else if (isUdcCondizioni) {
        setUploadProgressMsg(`${countLabel}Estrazione di spread, tassi, commissioni e linee di fido da "${file.name}"... L'analisi AI può richiedere 3-8 secondi.`);
      } else if (isCentraleRischi) {
        setUploadProgressMsg(`${countLabel}Lettura dell'andamento e delle tensioni Centrale Rischi da "${file.name}"... L'analisi AI può richiedere 3-8 secondi.`);
      } else if (isCrif) {
        setUploadProgressMsg(`${countLabel}Lettura della classe di rischio CRIF Sprint da "${file.name}"... L'analisi AI può richiedere 3-8 secondi.`);
      } else if (isReportGold) {
        setUploadProgressMsg(`${countLabel}Estrazione di soci, governance, CdA, sindaci, revisori e dati qualitativi da "${file.name}"... L'analisi AI può richiedere 3-8 secondi.`);
      } else {
        setUploadProgressMsg(`${countLabel}Caricamento e archiviazione sicura di "${file.name}" nello slot "${slotName}"...`);
      }

      try {
        const fileResult = await readAsDataURLPromise(file);
        const rawBase64 = fileResult.split(",")[1];

        const res = await fetch(`/api/pratiche/${selectedPratica.id}/upload/${slotName}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userToken}`
          },
          body: JSON.stringify({
            fileData: rawBase64,
            fileName: file.name,
            fileType: file.type
          })
        });

        if (!res.ok) {
          const errMsg = await res.json();
          throw new Error(errMsg.error || "Errore sconosciuto nel parsing AI del documento.");
        }

        const updatedPratica: Pratica = await res.json();
        
        // Refresh state
        await fetchPratiche(updatedPratica.id);
        setShowRegenerationBanner(true);
      } catch (err: any) {
        console.error(err);
        alert(`Errore nell'estrazione dello slot ${slotName} per il file ${file.name}: ${err.message || err}`);
      }
    }

    setIsProcessingFile(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent, slotName: string) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      if (slotName.toLowerCase() === "varieventuali" || slotName.toLowerCase() === "immaginiazienda" || slotName.toLowerCase() === "redditivita") {
        await processMultipleUploadedFiles(filesArray, slotName);
      } else {
        await processMultipleUploadedFiles([filesArray[0]], slotName);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeUploadSlot) {
      const filesArray = Array.from(e.target.files);
      if (activeUploadSlot.toLowerCase() === "varieventuali" || activeUploadSlot.toLowerCase() === "immaginiazienda" || activeUploadSlot.toLowerCase() === "redditivita") {
        await processMultipleUploadedFiles(filesArray, activeUploadSlot);
      } else {
        await processMultipleUploadedFiles([filesArray[0]], activeUploadSlot);
      }
      e.target.value = ""; // reset input
    }
  };

  const handleDeleteFile = async (slotName: string, fileName?: string) => {
    if (!selectedPratica) return;
    
    const confirmMsg = fileName 
      ? `Sei sicuro di voler eliminare l'allegato "${fileName}"?` 
      : `Sei sicuro di voler eliminare l'intero allegato nello slot "${slotName}"?`;
      
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const url = fileName 
        ? `/api/pratiche/${selectedPratica.id}/upload/${slotName}?fileName=${encodeURIComponent(fileName)}`
        : `/api/pratiche/${selectedPratica.id}/upload/${slotName}`;
        
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${userToken}`
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Impossibile eliminare l'allegato.");
      }
      
      const updatedPratica = await res.json();
      await fetchPratiche(updatedPratica.id);
      setShowRegenerationBanner(true);
    } catch (err: any) {
      console.error(err);
      alert(`Errore nella cancellazione: ${err.message || err}`);
    }
  };

  // Trigger AI Report Synthesis (Commercial Proposal style)
  const handleGenerateReport = async (useChatFeedbackVal: boolean | React.MouseEvent = false, liteModeVal: boolean = false) => {
    if (!selectedPratica) return;
    const useChatFeedback = typeof useChatFeedbackVal === 'boolean' ? useChatFeedbackVal : false;
    const liteMode = typeof liteModeVal === 'boolean' ? liteModeVal : false;
    
    setReportQuotaError(null);
    setIsGeneratingReport(true);
    setReportGenStage(liteMode ? "Avvio Generatore Offline / Compilation deterministica..." : "Inizializzazione del Brain Analitico Relazioni Corporate...");
    
    // Simulate banking analytical workflows (Commercial style)
    const stages = liteMode ? [
      "Inizializzazione del compilatore offline...",
      "Esecuzione audit dei saldi contabili dei bilanci storici...",
      "Analisi dei flussi di scenario e delle tabelle previsionali...",
      "Elaborazione compagine societaria e cenni di governance...",
      "Intercettazione degli indicatori qualitativi e degli alert...",
      "Composizione dei 13 capitoli strutturati...",
      "Scrittura testo definitivo e finalizzazione dei dati strutturati..."
    ] : [
      "Inizializzazione del Brain Analitico Relazioni Corporate...",
      "Lettura e cross-matching del fascicolo documentale multi-slot...",
      "Estrazione degli alert commerciali su capitale circolante...",
      "Integrazione dinamica della relazione degli amministratori...",
      "Pricing assessment e proposte di mitigazione commerciale...",
      "Sintesi della Centrale Rischi e tassi di utilizzo...",
      "Strutturazione dei 14 capitoli della Relazione Commerciale...",
      "Finalizzazione dei temi critici per la visita commerciale...",
      "Generazione della relazione fidi con parere positivo finale..."
    ];

    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      if (stageIdx < stages.length - 1) {
        stageIdx++;
        setReportGenStage(stages[stageIdx]);
      }
    }, liteMode ? 800 : 4500);

    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}/generate-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ useChatFeedback, liteMode })
      });
      
      clearInterval(stageInterval);
      
      if (!res.ok) {
        if (res.status === 429) {
          const quotaData = await res.json();
          setReportQuotaError({
            message: quotaData.message || "Quota limite dell'API di Gemini superata.",
            retryIn: quotaData.retryIn
          });
          setIsGeneratingReport(false);
          return;
        }
        const errorData = await res.json();
        const errMessage = errorData.error || "Errore nella generazione AI.";
        const isQuota = errMessage.toLowerCase().includes("quota") || 
                        errMessage.toLowerCase().includes("limite") || 
                        errMessage.toLowerCase().includes("api key") || 
                        errMessage.toLowerCase().includes("key") ||
                        errMessage.toLowerCase().includes("429");
        if (isQuota) {
          setReportQuotaError({
            message: errMessage
          });
          setIsGeneratingReport(false);
          return;
        }
        throw new Error(errMessage);
      }
      
      const updatedPratica: Pratica = await res.json();
      await fetchPratiche(updatedPratica.id);
      setIsGeneratingReport(false);
      setActiveTab("visualizza");
    } catch (err: any) {
      clearInterval(stageInterval);
      console.error(err);
      alert(`Errore AI: ${err.message || err}`);
      setIsGeneratingReport(false);
    }
  };

  const handleChatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    filesArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatAttachments(prev => [
          ...prev,
          {
            fileData: reader.result as string,
            fileName: file.name,
            fileType: file.type || "application/octet-stream"
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    // Clear input so same file can be selected again
    e.target.value = "";
  };

  const removeChatAttachment = (indexToRemove: number) => {
    setChatAttachments(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  // Handle Q&A Chat interaction with the credit analyst
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && chatAttachments.length === 0) || !selectedPratica || isSendingChatMessage) return;

    const msg = chatInput.trim();
    const currentAttachments = [...chatAttachments];
    
    // Clear inputs optimistically
    setChatInput("");
    setChatAttachments([]);
    setIsSendingChatMessage(true);
    setChatError(null);

    // Optimistically update locally
    const tempUserMsg = {
      role: 'user' as const,
      text: msg,
      timestamp: new Date().toISOString(),
      attachments: currentAttachments.map(att => ({
        fileName: att.fileName,
        fileType: att.fileType
      }))
    };
    
    const updatedWithUser = {
      ...selectedPratica,
      chatHistory: [...(selectedPratica.chatHistory || []), tempUserMsg]
    };
    setSelectedPratica(updatedWithUser);
    setPratiche(prev => prev.map(p => p.id === selectedPratica.id ? updatedWithUser : p));

    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ 
          message: msg || `Consultazione file allegati: ${currentAttachments.map(a => a.fileName).join(", ")}`, 
          attachments: currentAttachments 
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Errore dell'assistente fidi.");
      }

      const data = await res.json();
      const updatedWithReply = {
        ...selectedPratica,
        chatHistory: data.chatHistory
      };
      setSelectedPratica(updatedWithReply);
      setPratiche(prev => prev.map(p => p.id === selectedPratica.id ? updatedWithReply : p));
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "Impossibile comunicare con l'assistente fidi.");
      setChatAttachments(currentAttachments);
      setChatInput(msg);
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  // Reset conversation
  const handleClearChatHistory = async () => {
    if (!selectedPratica) return;
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}/chat/clear`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userToken}`
        }
      });
      if (res.ok) {
        const updated = {
          ...selectedPratica,
          chatHistory: []
        };
        setSelectedPratica(updated);
        setPratiche(prev => prev.map(p => p.id === selectedPratica.id ? updated : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save manual modifications in the markdown editor
  const handleSaveReportEdits = async () => {
    if (!selectedPratica) return;
    
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          markdownReport: editedMarkdown
        })
      });
      if (res.ok) {
        const updated: Pratica = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        alert("Modifiche salvate con successo nella piattaforma!");
      }
    } catch (err) {
      console.error(err);
      alert("Impossibile salvare le modifiche del report.");
    }
  };

  // Update custom fields (azienda name, settore, descrizione operazione, noteLibere, numeroPratica)
  const handleSaveParameters = async () => {
    if (!selectedPratica) return;
    
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          aziendaName: editedAziendaName,
          settoreAttivita: editedSettore,
          descrizioneOperazione: editedDescrizione,
          noteLibere: editedNoteLibere,
          numeroPratica: editedNumeroPratica,
          cdgCliente: editedCdgCliente,
          andamentoContiBanca: editedAndamentoConti
        })
      });
      if (res.ok) {
        const updated: Pratica = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setIsEditingAzienda(false);
        setShowRegenerationBanner(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save inline Note Libere
  const handleSaveInlineNotes = async () => {
    if (!selectedPratica) return;
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          noteLibere: inlineNotesVal
        })
      });
      if (res.ok) {
        const updated: Pratica = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setIsEditingInlineNotes(false);
        setEditedNoteLibere(inlineNotesVal);
        setShowRegenerationBanner(true); // Inform user they can regenerate!
      }
    } catch (err) {
      console.error(err);
      alert("Errore nel salvataggio delle note.");
    }
  };

  // Save inline Andamento Conti Section 12
  const handleSaveInlineAndamento = async () => {
    if (!selectedPratica) return;
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          andamentoContiBanca: inlineAndamentoVal
        })
      });
      if (res.ok) {
        const updated: Pratica = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setIsEditingInlineAndamento(false);
        setEditedAndamentoConti(inlineAndamentoVal);
        setShowRegenerationBanner(true); // Inform user they can regenerate!
      }
    } catch (err) {
      console.error(err);
      alert("Errore nel salvataggio dell'andamento dei conti.");
    }
  };

  // Save inline Operazione Finanziaria Richiesta
  const handleSaveInlineDescrizione = async () => {
    if (!selectedPratica) return;
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          descrizioneOperazione: inlineDescrizioneVal
        })
      });
      if (res.ok) {
        const updated: Pratica = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setIsEditingInlineDescrizione(false);
        setEditedDescrizione(inlineDescrizioneVal);
        setShowRegenerationBanner(true); // Inform user they can regenerate!
      }
    } catch (err) {
      console.error(err);
      alert("Errore nel salvataggio dell'operazione finanziaria.");
    }
  };

  const handleUpdateCreditLine = async (index: number, field: string, value: any) => {
    if (!selectedPratica) return;
    const currentLines = [...(selectedPratica.operazioneFinanziariaRichiesta || [])];
    
    if (field === 'importo' || field === 'tassoProposto' || field === 'commissioni') {
      const parsedVal = parseFloat(value);
      currentLines[index] = {
        ...currentLines[index],
        [field]: isNaN(parsedVal) ? undefined : parsedVal
      };
    } else {
      currentLines[index] = {
        ...currentLines[index],
        [field]: value
      };
    }

    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ operazioneFinanziariaRichiesta: currentLines })
      });
      if (res.ok) {
        const updated = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setShowRegenerationBanner(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCreditLine = async () => {
    if (!selectedPratica) return;
    const defaultLines = [
      { id: "fido_campagna", linea: "Fido di Campagna (Smobilizzo Circolante)", importo: 500000, tassoProposto: 3.85, commissioni: 0.15 },
      { id: "anticipo_fatture", linea: "Anticipo Fatture Italia/Estero s.b.f.", importo: 1000000, tassoProposto: 4.10, commissioni: 0.20 },
      { id: "finanziamento_medio_termine", linea: "Finanziamento M/L Termine (Investimento)", importo: 2500000, tassoProposto: 3.50, commissioni: 0.10 }
    ];
    
    const currentLines = [...(selectedPratica.operazioneFinanziariaRichiesta || [])];
    const index = currentLines.length % defaultLines.length;
    const template = defaultLines[index];
    
    const newLine = {
      id: `${template.id}_${Date.now()}`,
      linea: template.linea,
      importo: template.importo,
      tassoProposto: template.tassoProposto,
      commissioni: template.commissioni
    };
    
    const updatedLines = [...currentLines, newLine];
    
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ operazioneFinanziariaRichiesta: updatedLines })
      });
      if (res.ok) {
        const updated = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setShowRegenerationBanner(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCreditLine = async (index: number) => {
    if (!selectedPratica) return;
    const currentLines = [...(selectedPratica.operazioneFinanziariaRichiesta || [])];
    currentLines.splice(index, 1);
    
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ operazioneFinanziariaRichiesta: currentLines })
      });
      if (res.ok) {
        const updated = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setShowRegenerationBanner(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleForceExtractCreditLines = async () => {
    if (!selectedPratica) return;
    setIsExtractingLinesAI(true);
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ forceCreditLinesSync: true })
      });
      if (res.ok) {
        const updated = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setShowRegenerationBanner(true);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || "Errore durante l'estrazione automatica AI.");
      }
    } catch (err) {
      console.error(err);
      alert("Operazione fallita o timeout della richiesta.");
    } finally {
      setIsExtractingLinesAI(false);
    }
  };

  const handleRegenerateSection7 = async () => {
    if (!selectedPratica) return;
    setIsRegeneratingSection7(true);
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}/regenerate-section7`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.practice) {
          setPratiche(prev => prev.map(p => p.id === data.practice.id ? data.practice : p));
          setSelectedPratica(data.practice);
          alert("Sezione 1 (Linea di Credito Proposta) Rigenerata con successo sulla base dell'Operazione Finanziaria Richiesta!");
        }
      } else {
        const errorData = await res.json();
        alert("Errore AI: " + (errorData.error || "Impossibile rigenerare la sezione 1."));
      }
    } catch (err: any) {
      console.error(err);
      alert("Errore di connessione: " + err.message);
    } finally {
      setIsRegeneratingSection7(false);
    }
  };

  const handleAnalyzeImages = async (force = false) => {
    if (!selectedPratica) return;
    setIsAnalyzingImages(true);
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}/analyze-images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ force })
      });
      if (res.ok) {
        const updatedPratica = await res.json();
        setSelectedPratica(updatedPratica);
        setPratiche(prev => prev.map(p => p.id === updatedPratica.id ? updatedPratica : p));
        alert("Analisi qualitativa visiva (sopralluogo foto) completata ed aggiornata con successo! I commenti sono visibili sotto la galleria.");
      } else {
        const errorData = await res.json();
        alert("Errore nell'analisi delle foto: " + (errorData.error || "Errore."));
      }
    } catch (err: any) {
      alert("Errore di connessione durante l'analisi foto: " + err.message);
    } finally {
      setIsAnalyzingImages(false);
    }
  };

  // Dedicated AI Grounding handler for specific fields
  const handleGroundField = async (fieldName: 'descrizioneOperazione' | 'andamentoContiBanca' | 'noteLibere') => {
    if (!selectedPratica) return;
    
    let rawValue = "";
    if (fieldName === 'descrizioneOperazione') {
      rawValue = inlineDescrizioneVal;
      setIsGroundingDescrizione(true);
    } else if (fieldName === 'andamentoContiBanca') {
      rawValue = inlineAndamentoVal;
      setIsGroundingAndamento(true);
    } else if (fieldName === 'noteLibere') {
      rawValue = inlineNotesVal;
      setIsGroundingNoteLibere(true);
    }

    if (!rawValue.trim()) {
      alert("Inserire del testo prima di richiedere l'elaborazione AI.");
      setIsGroundingDescrizione(false);
      setIsGroundingAndamento(false);
      setIsGroundingNoteLibere(false);
      return;
    }

    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}/ground-field`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          fieldName,
          textValue: rawValue
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Impossibile elaborare il testo con l'AI.");
      }

      const data = await res.json();
      if (data.success && data.groundedText) {
        if (fieldName === 'descrizioneOperazione') {
          setInlineDescrizioneVal(data.groundedText);
          const saveRes = await fetch(`/api/pratiche/${selectedPratica.id}`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userToken}`
            },
            body: JSON.stringify({ descrizioneOperazione: data.groundedText })
          });
          if (saveRes.ok) {
            const updated = await saveRes.json();
            setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedPratica(updated);
            setEditedDescrizione(data.groundedText);
            setShowRegenerationBanner(true);
          }
        } else if (fieldName === 'andamentoContiBanca') {
          setInlineAndamentoVal(data.groundedText);
          const saveRes = await fetch(`/api/pratiche/${selectedPratica.id}`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userToken}`
            },
            body: JSON.stringify({ andamentoContiBanca: data.groundedText })
          });
          if (saveRes.ok) {
            const updated = await saveRes.json();
            setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedPratica(updated);
            setEditedAndamentoConti(data.groundedText);
            setShowRegenerationBanner(true);
          }
        } else if (fieldName === 'noteLibere') {
          setInlineNotesVal(data.groundedText);
          const saveRes = await fetch(`/api/pratiche/${selectedPratica.id}`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userToken}`
            },
            body: JSON.stringify({ noteLibere: data.groundedText })
          });
          if (saveRes.ok) {
            const updated = await saveRes.json();
            setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedPratica(updated);
            setEditedNoteLibere(data.groundedText);
            setShowRegenerationBanner(true);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Errore durante l'elaborazione AI.");
    } finally {
      setIsGroundingDescrizione(false);
      setIsGroundingAndamento(false);
      setIsGroundingNoteLibere(false);
    }
  };
  // Manual financial row update support
  const handleUpdateFinancialMetric = async (yearIndex: number, key: keyof FinancialYear, value: string) => {
    if (!selectedPratica) return;
    
    const parsedVal = Number(value.replace(/[^0-9.-]/g, ""));
    const updatedFinancial = [...selectedPratica.financialData];
    
    // Maintain type safety of number fields
    if (key === "year") {
      updatedFinancial[yearIndex][key] = Math.max(1900, Math.min(2100, Number(value) || 2024));
    } else if (key === "dscr") {
      updatedFinancial[yearIndex][key] = value === "" ? null : parseFloat(value) || null;
    } else {
      updatedFinancial[yearIndex][key] = parsedVal || 0;
    }

    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          financialData: updatedFinancial
        })
      });
      if (res.ok) {
        const updated: Pratica = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setShowRegenerationBanner(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manual forecast row update support
  const handleUpdateForecastMetric = async (yearIndex: number, key: keyof ForecastYear, value: string) => {
    if (!selectedPratica) return;
    
    const parsedVal = Number(value.replace(/[^0-9.-]/g, ""));
    const updatedForecast = [...(selectedPratica.forecastData || [])];
    
    // Maintain type safety of number fields
    if (key === "year") {
      updatedForecast[yearIndex][key] = Math.max(1900, Math.min(2100, Number(value) || 2024));
    } else if (key === "dscrAdjusted" || key === "pfnEbitda" || key === "equityRatio" || key === "ebitdaMargine") {
      updatedForecast[yearIndex][key] = value === "" ? null : parseFloat(value) || null;
    } else {
      updatedForecast[yearIndex][key] = parsedVal || 0;
    }

    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          forecastData: updatedForecast
        })
      });
      if (res.ok) {
        const updated: Pratica = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setShowRegenerationBanner(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add empty forecast year row manually
  const handleAddForecastYear = async () => {
    if (!selectedPratica) return;
    
    const existingYears = (selectedPratica.forecastData || []).map(f => f.year);
    const nextYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : new Date().getFullYear();
    
    const updatedForecast = [
      ...(selectedPratica.forecastData || []),
      {
        year: nextYear,
        ricavi: 45000000,
        ebitda: 6000000,
        ebitdaMargine: 13,
        pfnEbitda: 2.1,
        dscrAdjusted: 4.0,
        patrimonioNetto: 20000000,
        equityRatio: 35,
        fabbisognoBreve: -8500000,
        giorniMagazzino: 130,
        giorniClienti: 90,
        scoreLom: 75
      }
    ].sort((a, b) => a.year - b.year);

    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          forecastData: updatedForecast
        })
      });
      if (res.ok) {
        const updated: Pratica = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add empty financial year row manually
  const handleAddFinancialYear = async () => {
    if (!selectedPratica) return;
    
    const existingYears = selectedPratica.financialData.map(f => f.year);
    const nextYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : new Date().getFullYear();
    
    const updatedFinancial = [
      ...selectedPratica.financialData,
      {
        year: nextYear,
        fatturato: 10000000,
        ebitda: 1000000,
        rimanenze: 1500000,
        creditiCommerciali: 2000000,
        pfn: -3000000,
        dscr: null
      }
    ].sort((a, b) => a.year - b.year);

    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          financialData: updatedFinancial
        })
      });
      if (res.ok) {
        const updated: Pratica = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Download Word helper targeting server wrapper HTML to Word CJS Stream
  const handleExportWord = () => {
    if (!selectedPratica) return;
    
    // HTML standard post action to server to format download file
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `/api/pratiche/${selectedPratica.id}/export/word?token=${userToken}`;
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };



  // Filters for Practice Table
  const filteredPratiche = pratiche.filter(p => {
    const matchesSearch = p.aziendaName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.settoreAttivita?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : p.status === statusFilter;
    const matchesDoc = docFilter === "all" ? true : p.docType === docFilter;
    
    // Master analyst supervisor filters
    const isMaster = currentUser?.email.toLowerCase() === "m.malamisura@gmail.com";
    const matchesSupervisor = (!isMaster || supervisorUserFilter === "all") 
      ? true 
      : (p.ownerEmail || "m.malamisura@gmail.com").toLowerCase() === supervisorUserFilter.toLowerCase();
      
    return matchesSearch && matchesStatus && matchesDoc && matchesSupervisor;
  });

  // Unique list of users for administration dropdown selector
  const uniqueUsersInPratiche = useMemo(() => {
    const map = new Map<string, string>();
    pratiche.forEach(p => {
      const email = (p.ownerEmail || "m.malamisura@gmail.com").toLowerCase();
      const name = (p as any).ownerName || (email === "m.malamisura@gmail.com" ? "Massimo Malamisura" : email);
      map.set(email, name);
    });
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [pratiche]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-400 text-xs mt-4 font-mono">Inizializzazione Workspace Sicuro...</p>
        </div>
      </div>
    );
  }

  if (!userToken) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center p-4 font-sans select-none relative overflow-hidden">
        {/* Glowing atmospheric gradient background elements */}
        <div className="absolute top-[-25%] left-[-25%] w-[60%] h-[60%] rounded-full bg-blue-900/15 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] rounded-full bg-blue-850/15 blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-[#0d1527] rounded-xl border border-slate-800 shadow-2xl overflow-hidden relative z-10 transition-all">
          <div className="p-8 text-center border-b border-slate-800 bg-[#0a1128]">
            <img src="/LOGO.png" alt="Logo" className="w-full h-40 mx-auto mb-4 object-contain" />
            <h1 className="text-xl font-extrabold text-white tracking-tight uppercase">Massimo Malamisura</h1>
            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mt-1 px-4">Istruttoria Crediti Corporate</p>
          </div>

          {authMode === 'login' && (
            <form onSubmit={handleAuthSubmit} className="p-8 space-y-5 text-left">
              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              {authSuccessMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{authSuccessMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase block tracking-wider">Indirizzo Email</label>
                <input 
                  type="email"
                  required
                  placeholder="nome@piattaforma.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#121c32] border border-slate-800 focus:border-blue-600 text-white px-3.5 py-2 rounded-lg text-sm transition focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-slate-400 uppercase block tracking-wider">Password</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setAuthError('');
                      setAuthSuccessMessage('');
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline underline-offset-2 bg-transparent cursor-pointer font-medium"
                  >
                    Dimenticata?
                  </button>
                </div>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#121c32] border border-slate-800 focus:border-blue-600 text-white px-3.5 py-2 rounded-lg text-sm transition focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={authLoadingSpin}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-850 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {authLoadingSpin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Accesso in corso...</span>
                  </>
                ) : (
                  <span>Accedi alla Piattaforma</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                    setAuthSuccessMessage('');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-350 underline underline-offset-4 font-medium transition bg-transparent border-none cursor-pointer"
                >
                  Non hai un account? Registrati gratuitamente
                </button>
              </div>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleAuthSubmit} className="p-8 space-y-5 text-left">
              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase block tracking-wider">Nome Completo</label>
                <input 
                  type="text"
                  required
                  placeholder="Es. Massimo Malamisura"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full bg-[#121c32] border border-slate-800 focus:border-blue-600 text-white px-3.5 py-2 rounded-lg text-sm transition focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase block tracking-wider">Indirizzo Email</label>
                <input 
                  type="email"
                  required
                  placeholder="nome@piattaforma.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#121c32] border border-slate-800 focus:border-blue-600 text-white px-3.5 py-2 rounded-lg text-sm transition focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase block tracking-wider">Password</label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#121c32] border border-slate-800 focus:border-blue-600 text-white px-3.5 py-2 rounded-lg text-sm transition focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={authLoadingSpin}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-850 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {authLoadingSpin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creazione profilo...</span>
                  </>
                ) : (
                  <span>Registra nuovo Profilo</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccessMessage('');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-350 underline underline-offset-4 font-medium transition bg-transparent border-none cursor-pointer"
                >
                  Hai già un account? Effettua l'accesso
                </button>
              </div>
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={handleResetRequest} className="p-8 space-y-5 text-left">
              <div className="text-xs text-slate-300 leading-relaxed bg-[#121a2e] border border-blue-900/40 p-3 rounded-lg">
                Se hai perso la password, inserisci l'email con cui sei registrato. Genereremo un codice di sicurezza OTP direttamente in anteprima sul tuo monitor per permetterti di reimpostarla subito.
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase block tracking-wider">Email registrata</label>
                <input 
                  type="email"
                  required
                  placeholder="Es. nome@piattaforma.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#121c32] border border-slate-800 focus:border-blue-600 text-white px-3.5 py-2 rounded-lg text-sm transition focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={authLoadingSpin}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-850 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {authLoadingSpin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Inizializzazione...</span>
                  </>
                ) : (
                  <span>Invia codice OTP di recupero</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccessMessage('');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-200 font-medium transition bg-transparent border-none cursor-pointer"
                >
                  ← Torna alla login
                </button>
              </div>
            </form>
          )}

          {authMode === 'resetConfirm' && (
            <form onSubmit={handleResetConfirm} className="p-8 space-y-4 text-left">
              <div className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-300 p-3.5 rounded-lg text-xs space-y-1 animate-in fade-in duration-300">
                <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Email di recupero inviata!</span>
                </div>
                <div>Il server ha simulato l'invio di un codice di sicurezza OTP all'indirizzo: <strong className="text-white font-mono">{authEmail}</strong>.</div>
              </div>

              {demoOtpCode && (
                <details className="group border border-slate-800 rounded-lg overflow-hidden bg-[#121c32]/50 text-slate-300 animate-in slide-in-from-top duration-200">
                  <summary className="cursor-pointer select-none py-2 px-3 text-xs bg-[#121c32]/80 hover:bg-[#121c32] font-mono flex items-center justify-between text-slate-400">
                    <span>📟 Simulatore Mailbox Sandbox</span>
                    <span className="text-[10px] bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono group-open:hidden font-bold">Leggi codice</span>
                  </summary>
                  <div className="p-3 text-xs space-y-1.5 border-t border-slate-800 bg-[#0e1628]">
                    <p className="text-[11px] text-slate-400">In ambiente di produzione, questo codice viene inviato tramite SMTP esterno. Trattandosi di un sandbox locale, puoi copiarlo direttamente qui sotto:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-slate-400 font-mono">OTP:</span>
                      <span className="font-mono bg-[#1a2d42] border border-blue-900 px-2.5 py-1 rounded font-bold text-white tracking-widest text-sm select-all">{demoOtpCode}</span>
                    </div>
                  </div>
                </details>
              )}

              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase block tracking-wider">Codice OTP Ricevuto</label>
                <input 
                  type="text"
                  required
                  placeholder="Inserisci il codice OTP"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full bg-[#121c32] border border-slate-800 focus:border-blue-600 text-white px-3.5 py-2 rounded-lg text-sm transition focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono tracking-widest"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase block tracking-wider">Nuova password d'accesso</label>
                <input 
                  type="password"
                  required
                  placeholder="Scegli una nuova password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#121c32] border border-slate-800 focus:border-blue-600 text-white px-3.5 py-2 rounded-lg text-sm transition focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={authLoadingSpin}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#1a2d42] text-white font-medium py-2.5 rounded-lg text-sm transition shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {authLoadingSpin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Aggiornamento...</span>
                  </>
                ) : (
                  <span>Ripristina Password & Accedi</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccessMessage('');
                  }}
                  className="text-xs text-slate-450 hover:text-slate-300 font-medium transition bg-transparent border-none cursor-pointer"
                >
                  Annulla operazione
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased flex flex-col">
      
      {/* HEADERBAR (Hidden during print) */}
      <header className="no-print bg-[#0a1128] text-white py-3 px-6 shadow-md border-b border-slate-850 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <img src="/LOGO.png" alt="Logo" className="h-16 w-44 rounded-lg object-contain bg-white px-2 py-1 shadow-sm" />
          <div>
            <span className="text-base font-extrabold tracking-tight text-white block uppercase">Massimo Malamisura</span>
            <span className="text-[10px] text-blue-400 font-bold block uppercase tracking-wider">@Copyright 2026</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col text-right pl-4 pr-3 border-l border-slate-700 text-xs py-0.5">
            <span className="text-slate-100 font-bold">{currentUser?.name}</span>
            <span className="text-slate-400 text-[10px] font-mono">{currentUser?.email}</span>
            
            {currentUser?.email.toLowerCase() === "m.malamisura@gmail.com" && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase mt-1 w-fit ml-auto">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-450 shrink-0" />
                Supervisor Master
              </span>
            )}
          </div>
          
          <button 
            id="btn_nuova_pratica_header"
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition duration-150 shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuova Pratica fidi
          </button>

          <button 
            onClick={handleLogout}
            className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-md font-medium text-xs border border-slate-700 transition"
          >
            Esci
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* SIDEBAR: DASHBOARD LIST (Hidden during print) */}
        <aside className="no-print w-full lg:w-96 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0">
             <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col gap-3">
             <div className="flex bg-slate-200 p-0.5 rounded-lg mb-2">
               <button 
                  onClick={() => setActiveSidebarView('pratiche')}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition ${activeSidebarView === 'pratiche' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
               >
                 Pratiche
               </button>
               <button 
                  onClick={() => setActiveSidebarView('fascicolo')}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition ${activeSidebarView === 'fascicolo' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
               >
                 Fascicolo
               </button>
             </div>
             
             {activeSidebarView === 'pratiche' && (
               <>
                 <div className="relative">
                   <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                   <input 
                     id="search_practice"
                     type="text" 
                     placeholder="Cerca azienda..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full bg-white text-sm text-slate-800 pl-9 pr-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                   />
                 </div>
                 
                 <div className="flex gap-2">
                   <div className="flex-1">
                     <label className="text-[10px] text-slate-400 block font-medium mb-1 uppercase">Stato Pratica</label>
                     <select 
                       id="filter_status"
                       value={statusFilter}
                       onChange={(e) => setStatusFilter(e.target.value)}
                       className="w-full bg-white text-xs text-slate-600 px-2 py-1.5 border border-slate-200 rounded-md"
                     >
                       <option value="all">Tutti gli stati</option>
                       <option value="In Corso">In Corso</option>
                       <option value="Completata">Completata</option>
                     </select>
                   </div>
   
                   <div className="flex-1">
                     <label className="text-[10px] text-slate-400 block font-medium mb-1 uppercase">Tipo Documento</label>
                     <select 
                       id="filter_docType"
                       value={docFilter}
                       onChange={(e) => setDocFilter(e.target.value)}
                       className="w-full bg-white text-xs text-slate-600 px-2 py-1.5 border border-slate-200 rounded-md"
                     >
                       <option value="all">Tutti (BILCe/CEBI/LOM)</option>
                       <option value="BILCe">BILCe</option>
                       <option value="CEBI">CEBI</option>
                       <option value="LOM">LOM</option>
                     </select>
                   </div>
                 </div>
               </>
             )}

           </div>

            {/* Master User Filter for Supervisor Role */}
            {currentUser?.email.toLowerCase() === "m.malamisura@gmail.com" && (
              <div className="border-t border-slate-100 pt-3 mt-1">
                <label className="text-[10px] text-slate-400 block font-bold mb-1 uppercase tracking-wider">Supervisione Analisti</label>
                <select 
                  id="filter_analyst"
                  value={supervisorUserFilter}
                  onChange={(e) => setSupervisorUserFilter(e.target.value)}
                  className="w-full bg-white text-xs text-slate-700 px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="all">Tutti gli analisti (Visualizzazione Globale)</option>
                  {uniqueUsersInPratiche.map(u => (
                    <option key={u.email} value={u.email}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* LIST OF CREDIT CASES ("PRATICHE") */}
          {activeSidebarView === "pratiche" && (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[300px] lg:max-h-none">
            {filteredPratiche.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm">Nessuna pratica trovata</p>
                <p className="text-xs text-slate-300 mt-1">Crea una nuova pratica o adatta i filtri.</p>
              </div>
            ) : (
              filteredPratiche.map((p) => {
                const isSelected = selectedPratica?.id === p.id;
                const dateClean = new Date(p.dateCreated).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                });
                
                return (
                  <div 
                    key={p.id}
                    id={`pratica_item_${p.id}`}
                    onClick={() => setSelectedPratica(p)}
                    className={`p-4 cursor-pointer hover:bg-slate-50/80 transition relative flex justify-between items-start ${isSelected ? "bg-blue-50/50 border-l-4 border-blue-600" : ""}`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                          p.docType === 'BILCe' ? 'bg-[#e0f2fe] text-[#0369a1]' :
                          p.docType === 'CEBI' ? 'bg-[#fef3c7] text-[#b45309]' :
                          'bg-[#f3e8ff] text-[#6b21a8]'
                        }`}>
                          {p.docType}
                        </span>
                        
                        <span className={`text-[10px] items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${
                          p.status === "Completata" 
                            ? "bg-emerald-50 text-emerald-700" 
                            : "bg-amber-50 text-amber-700 animate-pulse"
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-semibold text-slate-950 truncate">{p.aziendaName}</h4>
                      
                      {currentUser?.email.toLowerCase() === "m.malamisura@gmail.com" && (
                        <div className="text-[10px] text-blue-600 font-medium bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 w-fit mt-1.5 flex items-center gap-1 font-mono">
                          <ShieldCheck className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                          <span>Analista: {(p as any).ownerName || p.ownerEmail || "Massimo Malamisura"}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {dateClean}
                        </span>
                        <span className="truncate">
                          {p.settoreAttivita || "Settore N.D."}
                        </span>
                      </div>

                      {p.originalFileName && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 font-mono italic truncate bg-slate-100 rounded px-1 w-fit">
                          <FileText className="w-2.5 h-2.5 shrink-0" />
                          {p.originalFileName}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={(e) => handleDeletePratica(p.id, e)}
                      className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50/50 transition self-center"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          )}
          {/* FASCICOLO IN SIDEBAR */}
          {activeSidebarView === "fascicolo" && (
            <div className="flex-1 overflow-y-auto w-full bg-slate-50/50 p-4 border-t border-slate-100">
              {!selectedPratica ? (
                <div className="p-8 text-center text-slate-400 mt-10">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-sm font-semibold">Nessuna pratica selezionata</p>
                  <p className="text-xs text-slate-400 mt-1">Seleziona una pratica dall&apos;elenco per visualizzarne o compilarne il fascicolo documentale.</p>
                </div>
              ) : (<>
                                
                                {/* COLUMN LEFT (4 cols lg) [lg:order-1]: DOCUMENTS (Hidden in Print, hidden on editorial/interactive workspaces to avoid squeezing layout) */}
                                <div className={`no-print space-y-6 lg:order-1 lg:sticky lg:top-6 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto pr-1 transition-all duration-300 lg:col-span-4`}>
                                             {/* DOCUMENT UPLOAD ZONE (MULTI-SLOT) */}
                                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex items-center justify-between mb-4 gap-2">
                                      <div className="flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-[#2563eb]" />
                                        <h3 className="font-bold text-slate-800 text-sm">Fascicolo Documentale</h3>
                                      </div>
                                      
                                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-105 text-slate-600">
                                        {Object.keys(selectedPratica.uploadedFiles || {}).length} / 13 SLOT COPERTI
                                      </span>
                                    </div>
                
                                    <input 
                                      type="file" 
                                      ref={fileInputRef} 
                                      onChange={handleFileChange}
                                      accept={
                                        activeUploadSlot === "immaginiAzienda"
                                          ? "image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                          : ".pdf,.xlsx,.xls,.doc,.docx,.txt"
                                      } 
                                      multiple={activeUploadSlot === "variEventuali" || activeUploadSlot === "immaginiAzienda" || activeUploadSlot === "redditivita"}
                                      className="hidden" 
                                    />
                
                                    {isProcessingFile && (
                                      <div className="mb-4 p-4.5 bg-blue-50 border border-blue-105 rounded-lg text-center space-y-2">
                                        <RefreshCw className="w-6 h-6 text-blue-650 animate-spin mx-auto" />
                                        <div className="font-bold text-xs text-blue-900 animate-pulse">{uploadProgressMsg}</div>
                                        <div className="text-[10px] text-slate-500 font-medium">Analisi semantica in corso con Gemini AI...</div>
                                      </div>
                                    )}
                
                                    <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                                      {[
                                        { id: "cebi", label: "CEBI (Centrale Bilanci)", desc: "Estrazione Centrale Rischi e storico crediti bancari" },
                                        { id: "bilce", label: "BILCe (Bilancio Riconciliato)", desc: "Bilancio ricondotto del cliente (Cerved/MOL)" },
                                        { id: "lom", label: "LOM Report (SDA)", desc: "Report Loan Origination Monitoring standard" },
                                        { id: "relazioneGestione", label: "Relazione di Gestione", desc: "Commento degli amministratori all'andamento economico" },
                                        { id: "businessPlan", label: "Business Plan / Previsionale", desc: "Piani industriali e flussi finanziari prospettici" },
                                        { id: "elencoFinanziamenti", label: "Elenco Finanziamenti M/L", desc: "Elenco strutturato dei finanziamenti e scadenziario debiti" },
                                        { id: "centraleRischi", label: "Centrale Rischi Bdf", desc: "Segnalazioni Banca d'Italia del cliente" },
                                        { id: "sprintCrif", label: "CRIF Sprint Business", desc: "Classe/Score e Fascia di rischio d'affidabilità creditizia Eurisc" },
                                        { id: "udcCondizioni", label: "udcCondizioni / udmCondizioni (Delibera Prezzi)", desc: "Spread, tassi e commissioni fidi deliberati (accetta anche slot udm)" },
                                        { id: "reportGold", label: "Report GOLD (Governance e Qualitativo)", desc: "Estrazione soci, governance, CdA, sindaci, revisori e dati qualitativi" },
                                        { id: "esgReport", label: "Bilancio di Sostenibilità ESG", desc: "Report sulle performance ambientali, sociali e di governance" },
                                        { id: "redditivita", label: "Rendiconti Redditività / Struttura Conti", desc: "Estratti conto, fogli redditività, andamento e struttura del rapporto con la banca (Selezione Multipla)" },
                                        { id: "immaginiAzienda", label: "Fotografie Azienda / Visite", desc: "Foto storiche degli stabilimenti, uffici o sopralluoghi effettuati" },
                                        { id: "variEventuali", label: "Vari ed Eventuali", desc: "Ulteriori visure, contratti, o garanzie a corredo" }
                                      ].map((slot) => {
                                        const fileMeta = selectedPratica.uploadedFiles?.[slot.id as keyof typeof selectedPratica.uploadedFiles];
                                        const isVariEventuali = slot.id === "variEventuali";
                                        const isImmaginiAzienda = slot.id === "immaginiAzienda";
                                        const isRedditivita = slot.id === "redditivita";
                                        const isMultiFileSlot = isVariEventuali || isImmaginiAzienda || isRedditivita;
                                        
                                        const isUploaded = isMultiFileSlot 
                                          ? (Array.isArray(fileMeta) ? fileMeta.length > 0 : !!fileMeta)
                                          : !!fileMeta;
                                        const fileCount = isMultiFileSlot 
                                          ? (Array.isArray(fileMeta) ? fileMeta.length : (fileMeta ? 1 : 0)) 
                                          : 0;
                                        
                                        return (
                                          <div 
                                            key={slot.id}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, slot.id)}
                                            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-2.5 ${
                                              isUploaded 
                                                ? "bg-emerald-50/20 border-emerald-150 hover:bg-emerald-50/35" 
                                                : "bg-slate-50/40 border-slate-200/70 hover:border-[#2563eb]/20 hover:bg-slate-50/60"
                                            }`}
                                          >
                                            {/* TOP ROW: Title and status indicators */}
                                            <div className="flex items-start justify-between gap-2.5">
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isUploaded ? "bg-emerald-550 animate-pulse" : "bg-slate-300"}`}></span>
                                                  <h4 className="text-xs font-bold text-slate-800 leading-tight" title={slot.label}>{slot.label}</h4>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1 leading-snug">{slot.desc}</p>
                                              </div>
                                              
                                              {isMultiFileSlot && fileCount > 0 && (
                                                <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 border uppercase font-extrabold ${
                                                  isImmaginiAzienda 
                                                    ? "bg-amber-100 text-amber-800 border-amber-200" 
                                                    : isRedditivita 
                                                      ? "bg-indigo-100 text-indigo-800 border-indigo-200" 
                                                      : "bg-blue-100 text-blue-800 border-blue-200"
                                                }`}>
                                                  {fileCount} {isImmaginiAzienda ? "FOTO" : "FILE"}
                                                </span>
                                              )}
                                            </div>
                
                                            {/* MIDDLE ROW: File List if uploaded */}
                                            {isUploaded && fileMeta && (
                                              <div className="space-y-1">
                                                {isMultiFileSlot && Array.isArray(fileMeta) ? (
                                                  (fileMeta as any[]).map((f: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between gap-2 text-[10px] font-mono text-emerald-800 bg-emerald-50/50 leading-none py-1.5 px-2 rounded border border-emerald-100/50 w-full">
                                                      <div className="flex items-center gap-1.5 truncate max-w-[85%]">
                                                        {isImmaginiAzienda ? (
                                                          <Image className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                        ) : (
                                                          <FileText className="w-3.5 h-3.5 text-emerald-650 shrink-0" />
                                                        )}
                                                        <span className="truncate font-medium text-slate-700" title={f.fileName}>{f.fileName}</span>
                                                      </div>
                                                      <button 
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleDeleteFile(slot.id, f.fileName);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 p-0.5 hover:bg-red-50 rounded font-bold shrink-0 cursor-pointer text-[11px]"
                                                        title="Elimina"
                                                      >
                                                        ✕
                                                      </button>
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-805 bg-emerald-50/50 leading-none py-1.5 px-2 rounded border border-emerald-100/50 w-full">
                                                    {isImmaginiAzienda ? (
                                                      <Image className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                    ) : (
                                                      <FileText className="w-3.5 h-3.5 text-emerald-650 shrink-0" />
                                                    )}
                                                    <span className="truncate font-medium text-slate-700" title={(fileMeta as any).fileName}>{(fileMeta as any).fileName}</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                
                                            {/* BOTTOM ROW: Dedicated Action and Status Toolbar */}
                                            <div className="flex items-center justify-between border-t border-slate-100/60 pt-2.5 mt-0.5">
                                              <div>
                                                {isUploaded ? (
                                                  <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-150 uppercase tracking-wider font-mono">Presente</span>
                                                ) : (
                                                  <span className="text-[8.5px] font-bold text-slate-450 bg-slate-105 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Mancante</span>
                                                )}
                                              </div>
                
                                              <div className="shrink-0 flex gap-1.5">
                                                {isMultiFileSlot ? (
                                                  <div className="flex gap-1.5">
                                                    {fileCount > 0 && (
                                                      <button 
                                                        type="button"
                                                        onClick={() => handleDeleteFile(slot.id)}
                                                        className="text-[10px] font-mono font-bold text-red-600 hover:text-red-750 border border-red-200 hover:border-red-350 bg-red-50/20 px-2.5 py-1 rounded shadow-xs transition"
                                                      >
                                                        Svuota
                                                      </button>
                                                    )}
                                                    <button 
                                                      onClick={() => triggerUploadForSlot(slot.id)}
                                                      disabled={fileCount >= 30}
                                                      className="text-[10px] font-mono font-bold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 bg-white px-2.5 py-1 rounded shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                      Aggiungi
                                                    </button>
                                                  </div>
                                                ) : isUploaded ? (
                                                  <div className="flex gap-1.5">
                                                    <button 
                                                      onClick={() => triggerUploadForSlot(slot.id)}
                                                      className="text-[10px] font-mono font-bold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 bg-white px-2.5 py-1 rounded shadow-xs transition"
                                                    >
                                                      Sostituisci
                                                    </button>
                                                    <button 
                                                      onClick={() => handleDeleteFile(slot.id)}
                                                      className="text-[10px] font-mono font-bold text-rose-600 hover:text-rose-750 border border-rose-250 hover:border-rose-350 bg-rose-50/20 px-2.5 py-1 rounded shadow-xs transition"
                                                    >
                                                      Elimina
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <button 
                                                    onClick={() => triggerUploadForSlot(slot.id)}
                                                    className="text-[10px] font-mono font-bold text-slate-600 hover:text-blue-650 border border-slate-200 hover:border-blue-200 bg-white px-3 py-1 rounded shadow-xs transition"
                                                  >
                                                    Carica
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                
                                  {/* CORPORATE PHOTO PREVIEW GALLERY (Left Column, below upload zones) */}
                                  {selectedPratica.uploadedFiles?.immaginiAzienda && (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mt-4 animate-fade-in no-print">
                                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                          <Image className="w-4 h-4 text-amber-600 shrink-0" />
                                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Galleria Foto Azienda</h4>
                                        </div>
                                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                                          {Array.isArray(selectedPratica.uploadedFiles.immaginiAzienda) ? selectedPratica.uploadedFiles.immaginiAzienda.length : 1} FOTO
                                        </span>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 mb-4">
                                        {(Array.isArray(selectedPratica.uploadedFiles.immaginiAzienda) 
                                          ? selectedPratica.uploadedFiles.immaginiAzienda 
                                          : [selectedPratica.uploadedFiles.immaginiAzienda]
                                        ).map((imgObj: any, index: number) => {
                                          const imgSrc = `/api/pratiche/${selectedPratica.id}/files/immaginiAzienda?fileName=${encodeURIComponent(imgObj.fileName)}&t=${Date.now()}`;
                                          return (
                                            <div 
                                              key={index} 
                                              className="group relative aspect-video rounded-lg overflow-hidden border border-slate-150 bg-slate-50 hover:shadow-md transition cursor-pointer"
                                              onClick={() => {
                                                window.open(imgSrc, "_blank");
                                              }}
                                              title="Clicca per zoom / aprire l'immagine"
                                            >
                                              <img 
                                                src={imgSrc} 
                                                alt={imgObj.fileName} 
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                              />
                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-1.5">
                                                <span className="text-[8px] text-white truncate font-mono w-full">
                                                  {imgObj.fileName}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                
                                      {/* Grounded AI observations under images */}
                                      <div className="mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-center justify-between mb-2 pb-1">
                                          <div className="flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700">Osservazioni AI Foto</span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleAnalyzeImages(true)}
                                            disabled={isAnalyzingImages}
                                            className="text-[9px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 px-2 py-0.5 rounded transition border border-amber-200"
                                          >
                                            {isAnalyzingImages ? "Analisi..." : "Rigenera Analisi AI"}
                                          </button>
                                        </div>
                
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                          {(Array.isArray(selectedPratica.uploadedFiles.immaginiAzienda) 
                                            ? selectedPratica.uploadedFiles.immaginiAzienda 
                                            : [selectedPratica.uploadedFiles.immaginiAzienda]
                                          ).map((imgObj: any, index: number) => {
                                            const imgSrc = `/api/pratiche/${selectedPratica.id}/files/immaginiAzienda?fileName=${encodeURIComponent(imgObj.fileName)}&t=${Date.now()}`;
                                            return (
                                              <div key={index} className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 transition hover:border-slate-200 text-left">
                                                <div className="flex items-center gap-2 mb-1.5 min-w-0">
                                                  <div className="w-5 h-5 rounded overflow-hidden border border-slate-200 shrink-0 bg-white">
                                                    <img src={imgSrc} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                  </div>
                                                  <span className="text-[9px] font-mono text-slate-400 truncate grow block" title={imgObj.fileName}>
                                                    {imgObj.fileName}
                                                  </span>
                                                  <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1 rounded shrink-0">
                                                    VISUAL AI
                                                  </span>
                                                </div>
                                                <p className="text-[10px] leading-snug text-slate-600 font-medium italic">
                                                  {imgObj.aiObservation ? `"${imgObj.aiObservation}"` : "Nessuna analisi qualitativa generata. Premi 'Rigenera Analisi AI' in alto per eseguire l'analisi d'immagine."}
                                                </p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        <p className="text-[8px] text-slate-400 mt-2 leading-relaxed">
                                          *I commenti del sopralluogo visivo sono inseriti ed analizzati dinamicamente anche all'interno della Relazione Commerciale (Sezione 7) per validare l'istruttoria fidi.
                                        </p>
                                      </div>
                
                                    </div>
                                  )}
                
                                </div>
              </>)}
            </div>
          )}
        </aside>

        {/* WORKSPACE AREA (MAIN CONTENT) */}
        <main className="flex-1 bg-[#f8fafc] flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
          
          {selectedPratica ? (
            <div className="space-y-6">
              
              {/* BRAND PRATICA HERO ROW (Hidden during print) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start no-print">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 flex flex-col md:flex-row justify-between relative overflow-hidden xl:col-span-7 h-full">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#1e3a8a]"></div>
                  
                  <div className="flex-1 w-full">
                  {isEditingAzienda ? (
                    <div className="w-full space-y-4 max-w-4xl bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Modifica Parametri Pratica Fidi</div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Denominazione Impresa</label>
                          <input 
                            id="edit_azienda_name"
                            type="text" 
                            value={editedAziendaName}
                            onChange={(e) => setEditedAziendaName(e.target.value)}
                            className="bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-850"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Settore Sottocategoria</label>
                          <input 
                            id="edit_azienda_settore"
                            type="text" 
                            value={editedSettore}
                            onChange={(e) => setEditedSettore(e.target.value)}
                            className="bg-white border border-slate-300 px-3 py-1.5 text-xs font-normal rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-850"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Numero Pratica Fidi</label>
                          <input 
                            id="edit_azienda_numero"
                            type="text" 
                            value={editedNumeroPratica}
                            onChange={(e) => setEditedNumeroPratica(e.target.value)}
                            className="bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-[#1e3a8a]"
                            placeholder="Esempio: CC-2026-DLN"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">CDG Cliente</label>
                          <input 
                            id="edit_azienda_cdg"
                            type="text" 
                            value={editedCdgCliente}
                            onChange={(e) => setEditedCdgCliente(e.target.value)}
                            className="bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-850 font-mono"
                            placeholder="Es. CDG-0918-X"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Operazione Finanziaria Richiesta (Descrizione)</label>
                        <textarea 
                          id="edit_azienda_descrizione"
                          rows={2}
                          value={editedDescrizione}
                          onChange={(e) => setEditedDescrizione(e.target.value)}
                          className="bg-white border border-slate-300 px-3 py-2 text-xs font-normal rounded focus:ring-1 focus:ring-blue-500 focus:outline-none w-full resize-y font-sans text-slate-850"
                          placeholder="Inserisci la descrizione della richiesta di fidi / operazione..."
                        />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-emerald-800 block uppercase tracking-wider">
                            🏦 Andamento conti e redditività con la banca (Sezione 11)
                          </label>
                          <span className="text-[9px] text-slate-400 font-mono">SEZIONE 11</span>
                        </div>
                        <textarea 
                          id="edit_azienda_andamentoconti"
                          rows={2}
                          value={editedAndamentoConti}
                          onChange={(e) => setEditedAndamentoConti(e.target.value)}
                          className="bg-white border border-slate-300 px-3 py-2 text-xs font-normal rounded focus:ring-1 focus:ring-emerald-600 focus:outline-none w-full resize-y font-sans text-slate-850"
                          placeholder="Fornisci qui: Anzianità del rapporto, movimentazione, insoluti %, rating interno/score Gianos, pricing, ecc... Se lasciato vuoto, verrà inserito un promemoria formale con le info da richiedere."
                        />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-[#1e3a8a] block uppercase tracking-wider">
                            📝 Note Addizionali del Gestore (Corporate Notes & Chiarimenti)
                          </label>
                          <span className="text-[9px] text-slate-400">Verranno integrate dall'AI nelle sezioni appropriate della relazione</span>
                        </div>
                        <textarea 
                          id="edit_azienda_notelibere"
                          rows={3}
                          value={editedNoteLibere}
                          onChange={(e) => setEditedNoteLibere(e.target.value)}
                          className="bg-white border border-slate-300 px-3 py-2 text-xs font-normal rounded focus:ring-1 focus:ring-[#1e3a8a] focus:outline-none w-full resize-y font-sans text-slate-850"
                          placeholder="Scrivi qui osservazioni libere, appunti qualitativi, chiarimenti raccolti dal cliente, o storici del debito. L'AI li posizionerà e strutturerà in automatico nel capitolo più logico durante la generazione del report!"
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => setIsEditingAzienda(false)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold transition"
                        >
                          Annulla
                        </button>
                        <button 
                          onClick={handleSaveParameters}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-xs flex items-center gap-1 font-semibold transition shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          Salva Parametri & Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedPratica.aziendaName}</h2>
                        <button 
                          onClick={() => {
                            setEditedAziendaName(selectedPratica.aziendaName);
                            setEditedSettore(selectedPratica.settoreAttivita || "Da definire");
                            setEditedDescrizione(selectedPratica.descrizioneOperazione || "");
                            setEditedNoteLibere(selectedPratica.noteLibere || "");
                            setEditedNumeroPratica(selectedPratica.numeroPratica || "");
                            setEditedCdgCliente(selectedPratica.cdgCliente || "");
                            setEditedAndamentoConti(selectedPratica.andamentoContiBanca || "");
                            setIsEditingAzienda(true);
                          }}
                          className="text-slate-400 hover:text-[#2563eb] p-1 rounded hover:bg-slate-50 transition"
                          title="Modifica parametri anagrafica e note"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500 mt-1">
                        <span className={`flex items-center gap-1 font-mono px-2 py-0.5 rounded text-xs font-bold uppercase transition ${
                          selectedPratica.numeroPratica 
                            ? "text-[#1e3a8a] bg-blue-50 border border-blue-200" 
                            : "text-amber-800 bg-amber-50 border border-amber-200 animate-pulse"
                        }`}>
                          CODICE PRATICA fidi: {selectedPratica.numeroPratica || "DA INSERIRE (Clicca a destra ✎)"}
                        </span>
                        <span>•</span>
                        <span className={`flex items-center gap-1 font-mono px-2 py-0.5 rounded text-xs font-bold uppercase transition ${
                          selectedPratica.cdgCliente 
                            ? "text-[#1e3a8a] bg-emerald-50 border border-emerald-200" 
                            : "text-amber-800 bg-amber-50 border border-amber-200 animate-pulse"
                        }`}>
                          CDG CLIENTE: {selectedPratica.cdgCliente || "NON SPECIFICATO (Clicca a destra ✎)"}
                        </span>
                        <span>•</span>
                        <span>Tipo: <strong>{selectedPratica.docType}</strong></span>
                        <span>•</span>
                        <span>Settore: <strong>{selectedPratica.settoreAttivita || "Non Specificato"}</strong></span>
                      </div>

                      {/* Operation Credit desc */}
                      <div className="mt-4 bg-[#f8fafc] rounded-lg border border-slate-100 p-3 max-w-4xl text-xs text-slate-705 shadow-sm transition-all duration-200">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9px]">Operazione Finanziaria Richiesta</span>
                            <span className="text-[9px] bg-blue-50 text-[#1e3a8a] border border-blue-200 font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">AI Grounded</span>
                          </div>
                          <div className="flex items-center gap-1.5 no-print">
                            {!isEditingInlineDescrizione && (
                              <button
                                onClick={() => {
                                  setInlineDescrizioneVal(selectedPratica.descrizioneOperazione || "");
                                  setIsEditingInlineDescrizione(true);
                                }}
                                className="text-slate-500 hover:text-slate-800 font-bold ml-2 underline text-[10px]"
                                title="Modifica l'operazione finanziaria richiesta"
                              >
                                ✎ Modifica
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditingInlineDescrizione ? (
                          <div className="space-y-2 mt-2 no-print">
                            <textarea
                              rows={3}
                              value={inlineDescrizioneVal}
                              onChange={(e) => setInlineDescrizioneVal(e.target.value)}
                              className="bg-white border border-slate-300 w-full rounded focus:ring-1 focus:ring-blue-500 focus:outline-none p-2 text-xs font-normal text-slate-850 font-sans leading-normal"
                              placeholder="Descrivi l'operazione finanziaria richiesta..."
                              disabled={isGroundingDescrizione}
                            />
                            <div className="flex justify-between items-center">
                              <button
                                onClick={() => handleGroundField('descrizioneOperazione')}
                                disabled={isGroundingDescrizione}
                                className="bg-blue-50 text-[#1e3a8a] hover:bg-blue-100 border border-blue-200 px-2.5 py-1 text-[11px] rounded font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {isGroundingDescrizione ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Elaborazione AI...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Migliora con AI (Grounded) ⚡
                                  </>
                                )}
                              </button>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setIsEditingInlineDescrizione(false)}
                                  disabled={isGroundingDescrizione}
                                  className="bg-slate-200 text-slate-700 px-2 py-1 text-[11px] rounded font-semibold hover:bg-slate-300 transition"
                                >
                                  Annulla
                                </button>
                                <button
                                  onClick={handleSaveInlineDescrizione}
                                  disabled={isGroundingDescrizione}
                                  className="bg-[#1e3a8a] text-white px-2.5 py-1 text-[11px] rounded font-semibold hover:bg-blue-800 transition"
                                >
                                  Salva
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="prose prose-slate max-w-none text-xs text-slate-700 leading-relaxed text-left">
                            {selectedPratica.descrizioneOperazione ? (
                              <Markdown components={{
                                p: ({ children }: any) => <p className="mb-3 leading-relaxed text-slate-700 whitespace-pre-wrap">{children}</p>,
                                li: ({ children }: any) => <li className="ml-4 list-disc text-slate-700 mb-1">{children}</li>,
                                ul: ({ children }: any) => <ul className="mb-3 space-y-1">{children}</ul>,
                                ol: ({ children }: any) => <ol className="mb-3 list-decimal pl-5 space-y-1">{children}</ol>,
                                h1: ({ children }: any) => <h1 className="text-base font-extrabold text-[#111827] mt-4 mb-2 tracking-tight uppercase border-b border-slate-200 pb-1">{children}</h1>,
                                h2: ({ children }: any) => <h2 className="text-sm font-bold text-[#1e3a8a] mt-4 mb-2 tracking-tight uppercase">{children}</h2>,
                                h3: ({ children }: any) => <h3 className="text-xs font-extrabold text-slate-800 mt-3.5 mb-1.5 uppercase tracking-wider">{children}</h3>,
                                h4: ({ children }: any) => <h4 className="text-xs font-bold text-slate-700 mt-3 mb-1 uppercase tracking-wide">{children}</h4>,
                                strong: ({ children }: any) => <strong className="font-extrabold text-slate-900 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 inline-block font-sans">{children}</strong>,
                                hr: () => <hr className="my-4 border-t-2 border-dashed border-slate-200/60" />,
                                em: ({ children }: any) => <em className="italic text-slate-800 bg-amber-50/50 px-1 py-0.2 rounded font-medium">{children}</em>
                              }}>
                                {selectedPratica.descrizioneOperazione}
                              </Markdown>
                            ) : (
                              <span className="text-slate-400 italic font-medium">Nessuna descrizione specificata fidi. Clicca su "Modifica" a destra per compilarla.</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Interactive Credit Lines Table */}
                      <div className="mt-3 bg-white rounded-lg border border-slate-200 p-3.5 max-w-4xl text-xs shadow-sm transition-all duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div className="text-left">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-800 block uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                Righe dell'Affidamento Richiesto (Riepilogo Analitico Sezione 1)
                              </span>
                              {!(selectedPratica.uploadedFiles?.udcCondizioni || selectedPratica.uploadedFiles?.udmCondizioni || selectedPratica.uploadedFiles?.udmcondizioni || selectedPratica.uploadedFiles?.udccondizioni) && (
                                <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shrink-0" title="I tassi e le commissioni inseriti verranno omessi nel report finché non carichi il Pricing (udcCondizioni)">
                                  <Info className="w-2.5 h-2.5" />
                                  Tassi Nascosti
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              Queste linee formano la tabella analitica inserita nel Report e nel documento generato di Sezione 1. Puoi modificarle o aggiornarle in tempo reale qui sotto.
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 self-start sm:self-auto no-print">
                            <button
                              id="btn_estrai_righe_ai"
                              onClick={handleForceExtractCreditLines}
                              disabled={isExtractingLinesAI || !selectedPratica.descrizioneOperazione}
                              className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-[10px] px-2.5 py-1.5 rounded transition flex items-center gap-1.5 tracking-tight cursor-pointer"
                              title="Analizza il testo della descrizione con l'AI ed estrai le righe in modo automatico"
                            >
                              <Sparkles className={`w-3 h-3 text-blue-500 ${isExtractingLinesAI ? 'animate-spin' : ''}`} />
                              {isExtractingLinesAI ? "Estrazione..." : "Estrai con AI"}
                            </button>
                            
                            <button
                              id="btn_aggiungi_riga_linea"
                              onClick={handleAddCreditLine}
                              className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 font-bold text-[10px] px-2.5 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                              title="Aggiungi una nuova riga di finanziamento"
                            >
                              <Plus className="w-3 h-3 text-slate-500" />
                              Aggiungi Linea
                            </button>
                          </div>
                        </div>

                        {(!selectedPratica.operazioneFinanziariaRichiesta || selectedPratica.operazioneFinanziariaRichiesta.length === 0) ? (
                          <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                            <p className="text-slate-400 text-[11px] font-medium">
                              Nessuna linea di credito presente. Scrivi la descrizione sopra e premi "Estrai con AI" o "Aggiungi Linea" per iniziare.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-100 rounded-lg">
                            <table className="min-w-full divide-y divide-slate-100 text-[11px]">
                              <thead className="bg-[#f8fafc] text-slate-500 text-[9px] uppercase tracking-wider font-bold">
                                <tr>
                                  <th scope="col" className="text-left px-3 py-1.5">Linea di Credito</th>
                                  <th scope="col" className="text-right px-3 py-1.5 w-36">Importo Richiesto (€)</th>
                                  <th scope="col" className="text-right px-3 py-1.5 w-24">Tasso (%)</th>
                                  <th scope="col" className="text-right px-3 py-1.5 w-24">Commis. (%)</th>
                                  <th scope="col" className="text-center px-2 py-1.5 w-10 no-print"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {selectedPratica.operazioneFinanziariaRichiesta.map((linea, index) => (
                                  <tr key={linea.id || index} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-1.5 text-left">
                                      <input
                                        type="text"
                                        value={linea.linea || ""}
                                        onChange={(e) => handleUpdateCreditLine(index, "linea", e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all text-left"
                                        placeholder="es. Anticipo Fatture / SBF"
                                      />
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                      <input
                                        type="number"
                                        value={linea.importo ?? ""}
                                        onChange={(e) => handleUpdateCreditLine(index, "importo", e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all text-right"
                                        placeholder="0"
                                      />
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={linea.tassoProposto ?? ""}
                                          onChange={(e) => handleUpdateCreditLine(index, "tassoProposto", e.target.value)}
                                          className="w-full bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all text-right"
                                          placeholder="N.D."
                                        />
                                        <span className="text-slate-400 font-mono font-bold">%</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={linea.commissioni ?? ""}
                                          onChange={(e) => handleUpdateCreditLine(index, "commissioni", e.target.value)}
                                          className="w-full bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all text-right"
                                          placeholder="N.D."
                                        />
                                        <span className="text-slate-400 font-mono font-bold">%</span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5 text-center no-print whitespace-nowrap">
                                      <button
                                        onClick={() => handleDeleteCreditLine(index)}
                                        className="text-slate-400 hover:text-red-650 p-1 hover:bg-red-50 rounded transition duration-200"
                                        title="Elimina riga"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {!(selectedPratica.uploadedFiles?.udcCondizioni || selectedPratica.uploadedFiles?.udmCondizioni || selectedPratica.uploadedFiles?.udmcondizioni || selectedPratica.uploadedFiles?.udccondizioni) && selectedPratica.operazioneFinanziariaRichiesta && selectedPratica.operazioneFinanziariaRichiesta.some(l => l.tassoProposto !== undefined || l.commissioni !== undefined) && (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-150 rounded text-amber-850 flex items-start gap-1.5 text-[10px] leading-relaxed">
                            <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                              <strong>Nota di Trasparenza Fidi:</strong> I tassi e le commissioni non compariranno nella Relazione poiché manca la Delibera Prezzi (<code>udcCondizioni/udmCondizioni</code>). Il report mostrerà solo gli importi. Carica l'allegato per sbloccare l'esposizione completa dei tassi.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN RIGHT (Moved to Top Grid): PRE-FLIGHT & FINANCIALS */}
              <div className="no-print space-y-6 xl:col-span-5 w-full">
                  
                  {/* SIDEBAR CARD 1: EXQUISITE HIGH-FIDELITY CORPORATE BRANDING CARD */}
                  <div className="bg-[#0f172a] text-white rounded-xl shadow-md border border-slate-800 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden transition hover:scale-[1.01] duration-300">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="bg-white p-3.5 rounded-2xl shadow-lg mb-4 border border-slate-100 flex items-center justify-center w-full max-w-[200px]">
                      <img src="/LOGO.png" alt="Massimo Malamisura Logo" className="h-28 w-auto object-contain" />
                    </div>
                    
                    <div className="space-y-1">
                      <h2 className="text-base font-black text-white tracking-tight uppercase leading-none">
                        Massimo Malamisura
                      </h2>
                      <div className="h-px bg-slate-800 w-16 mx-auto my-1.5"></div>
                      <p className="text-[9px] text-blue-400 font-extrabold uppercase tracking-widest">
                        Istruttoria Crediti Corporate
                      </p>
                      <span className="inline-block text-[7px] font-mono text-slate-550 tracking-wider mt-1 uppercase">
                        @Copyright 2026 • Analisi Avanzata Fidi
                      </span>
                    </div>
                  </div>
                  
                  {/* COHERENCE PRE-FLIGHT CHECKLIST CARD */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-205 p-5 animate-fade-in">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                      <ShieldCheck className="w-5 h-5 text-[#1e3a8a]" />
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Verifica Coerenza Pre-flight</h3>
                    </div>

                    <div className="space-y-4">
                      {/* 1. CENTRALE RISCHI CHECK */}
                      <div className="flex items-start gap-2.5">
                        <div className="mt-1 shrink-0">
                          {selectedPratica.uploadedFiles?.centraleRischi ? (
                            <span className="flex h-3 w-3 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                          ) : (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 leading-none">
                            Analisi Centrale Rischi
                            {selectedPratica.uploadedFiles?.centraleRischi ? (
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold uppercase border border-emerald-150 shrink-0 font-mono">Verde</span>
                            ) : (
                              <span className="text-[8px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-extrabold uppercase border border-rose-150 shrink-0 font-mono">Rosso</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                            {selectedPratica.uploadedFiles?.centraleRischi 
                              ? "File Centrale Rischi presente. Analisi quantitativa fidi s.b.f. e a revoca attiva."
                              : "CR assente. Sezione 13 bloccata: verrà iniettato testo standard d'assenza documentale senza formule qualitative fittizie."}
                          </p>
                        </div>
                      </div>

                      {/* 2. UDC CONDIZIONI CHECK */}
                      <div className="flex items-start gap-2.5">
                        <div className="mt-1 shrink-0">
                          {(selectedPratica.uploadedFiles?.udcCondizioni || selectedPratica.uploadedFiles?.udmCondizioni || selectedPratica.uploadedFiles?.udmcondizioni || selectedPratica.uploadedFiles?.udccondizioni) ? (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          ) : (selectedPratica.operazioneFinanziariaRichiesta && selectedPratica.operazioneFinanziariaRichiesta.length > 0) ? (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-550 animate-pulse"></span>
                          ) : (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400"></span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 leading-none">
                            Pricing e Condizioni
                            {(selectedPratica.uploadedFiles?.udcCondizioni || selectedPratica.uploadedFiles?.udmCondizioni || selectedPratica.uploadedFiles?.udmcondizioni || selectedPratica.uploadedFiles?.udccondizioni) ? (
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold uppercase border border-emerald-150 shrink-0 font-mono font-mono">Verde</span>
                            ) : (selectedPratica.operazioneFinanziariaRichiesta && selectedPratica.operazioneFinanziariaRichiesta.length > 0) ? (
                              <span className="text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-extrabold uppercase border border-amber-150 shrink-0 font-mono font-mono">Giallo</span>
                            ) : (
                              <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-extrabold uppercase border border-slate-205 shrink-0 font-mono font-mono">Grigio</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                            {(selectedPratica.uploadedFiles?.udcCondizioni || selectedPratica.uploadedFiles?.udmCondizioni || selectedPratica.uploadedFiles?.udmcondizioni || selectedPratica.uploadedFiles?.udccondizioni) 
                              ? "Delibera prezzi / udm caricata. Piena analisi di spread, tassi e commissioni attivi."
                              : "Documento udcCondizioni/udmCondizioni mancante. Commento prezzi in Sezione 1 limitato e tassi bloccati."}
                          </p>
                        </div>
                      </div>

                      {/* 3. LOM & BP STRATEGICO CHECK */}
                      <div className="flex items-start gap-2.5">
                        <div className="mt-1 shrink-0">
                          {(selectedPratica.uploadedFiles?.lom && selectedPratica.uploadedFiles?.businessPlan) ? (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          ) : (selectedPratica.uploadedFiles?.lom || selectedPratica.uploadedFiles?.businessPlan) ? (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-550"></span>
                          ) : (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 leading-none">
                            LOM & Business Plan
                            {(selectedPratica.uploadedFiles?.lom && selectedPratica.uploadedFiles?.businessPlan) ? (
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold uppercase border border-emerald-150 shrink-0 font-mono">Verde</span>
                            ) : (selectedPratica.uploadedFiles?.lom || selectedPratica.uploadedFiles?.businessPlan) ? (
                              <span className="text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-extrabold uppercase border border-amber-150 shrink-0 font-mono">Giallo</span>
                            ) : (
                              <span className="text-[8px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-extrabold uppercase border border-rose-150 shrink-0 font-mono">Rosso</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                            {(selectedPratica.uploadedFiles?.lom && selectedPratica.uploadedFiles?.businessPlan) 
                              ? "Fascicolo strategico completo. Analisi e score LOM con prospettive future integrati."
                              : "Documentazione parziale o assente. Scenari strategici qualitativi omessi o limitati ai soli dati storici."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* INTERACTIVE COMPREHENSIVE FINANCIALS TABS SETUP */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3 border-b border-slate-100 pb-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <FileSpreadsheet className="w-5 h-5 text-[#2563eb]" />
                        <h3 className="font-bold text-slate-800 text-sm">Prospetto Finanziario</h3>
                        
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 ml-1">
                          <button
                            id="tab_storico"
                            type="button"
                            onClick={() => setFinancialTab('storico')}
                            className={`px-3 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${financialTab === 'storico' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Consolidato Storico
                          </button>
                          <button
                            id="tab_previsionale"
                            type="button"
                            onClick={() => setFinancialTab('previsionale')}
                            className={`px-3 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${financialTab === 'previsionale' ? 'bg-white text-[#2563eb] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Previsionale (BILCe)
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {financialTab === 'storico' ? (
                          <button 
                            id="btn_add_year"
                            type="button"
                            onClick={handleAddFinancialYear}
                            className="text-[11px] border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md inline-flex items-center gap-1 font-medium transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Aggiungi Anno Storico
                          </button>
                        ) : (
                          <button 
                            id="btn_add_forecast_year"
                            type="button"
                            onClick={handleAddForecastYear}
                            className="text-[11px] border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md inline-flex items-center gap-1 font-medium transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Aggiungi Anno Forecast
                          </button>
                        )}
                      </div>
                    </div>

                    {financialTab === 'storico' ? (
                      selectedPratica.financialData.length === 0 ? (
                        <div className="p-6 text-center border border-dashed border-slate-100 rounded-lg text-slate-400 text-xs">
                          Nessun dato finanziario consolidato presente. Carica un documento PDF o Excel per estrarre le tabelle storiche in modalità automatica, oppure clicca &quot;Aggiungi Anno Storico&quot; per compilarlo manualmente.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <th className="py-2.5 px-2 font-semibold">Indicatore Pre-calcolato</th>
                                {selectedPratica.financialData.map((f, i) => (
                                  <th key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="number" 
                                      value={f.year} 
                                      onChange={(e) => handleUpdateFinancialMetric(i, "year", e.target.value)}
                                      className="w-14 bg-transparent font-mono text-xs font-bold text-slate-800 border-none p-0 text-right focus:ring-1 focus:ring-blue-400 rounded"
                                    />
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                              
                              {/* FATTURATO */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">Fatturato / Ricavi</td>
                                {selectedPratica.financialData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="text" 
                                      value={f.fatturato.toLocaleString('it-IT')} 
                                      onChange={(e) => handleUpdateFinancialMetric(i, "fatturato", e.target.value)}
                                      className="w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded font-semibold text-slate-900"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* EBITDA */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">EBITDA (MOL)</td>
                                {selectedPratica.financialData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="text" 
                                      value={f.ebitda.toLocaleString('it-IT')} 
                                      onChange={(e) => handleUpdateFinancialMetric(i, "ebitda", e.target.value)}
                                      className="w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded font-semibold text-slate-900"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* CREDITI COMMERCIALI */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">Crediti Commerciali</td>
                                {selectedPratica.financialData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="text" 
                                      value={f.creditiCommerciali.toLocaleString('it-IT')} 
                                      onChange={(e) => handleUpdateFinancialMetric(i, "creditiCommerciali", e.target.value)}
                                      className="w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded text-amber-900 bg-amber-50/25 px-1 font-semibold"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* RIMANENZE */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">Rimanenze / Magazzino</td>
                                {selectedPratica.financialData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="text" 
                                      value={f.rimanenze.toLocaleString('it-IT')} 
                                      onChange={(e) => handleUpdateFinancialMetric(i, "rimanenze", e.target.value)}
                                      className="w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded text-amber-900 bg-amber-50/25 px-1 font-semibold"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* PFN */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium hover:help" title="Posizione Finanziaria Netta. Negativo esprime Debito netto, positivo esprime Cassa netta">PFN (Negativo = Debito Netto)</td>
                                {selectedPratica.financialData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="text" 
                                      value={f.pfn.toLocaleString('it-IT')} 
                                      onChange={(e) => handleUpdateFinancialMetric(i, "pfn", e.target.value)}
                                      className={`w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded font-semibold ${f.pfn < 0 ? 'text-red-700 bg-red-50/20 px-1' : 'text-emerald-700 bg-emerald-50/20 px-1'}`}
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* DSCR */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">DSCR (Debt Ratio)</td>
                                {selectedPratica.financialData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="text" 
                                      placeholder="N.D."
                                      value={f.dscr !== undefined && f.dscr !== null ? f.dscr : ""} 
                                      onChange={(e) => handleUpdateFinancialMetric(i, "dscr", e.target.value)}
                                      className="w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded text-slate-700"
                                    />
                                  </td>
                                ))}
                              </tr>

                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      // PREVISIONALE TABLE FROM BILCE
                      !(selectedPratica.forecastData && selectedPratica.forecastData.length > 0) ? (
                        <div className="p-6 text-center border border-dashed border-slate-100 rounded-lg text-slate-400 text-xs">
                          Nessun prospetto finanziario previsione presente. Carica il documento BILCe (Scenari Previsionali) per estrarre la tabella automatica, oppure clicca &quot;Aggiungi Anno Forecast&quot; per iniziare a compilarlo.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <th className="py-2.5 px-2 font-semibold">Indicatore Previsionale (BILCe)</th>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <th key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="number" 
                                      value={f.year} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "year", e.target.value)}
                                      className="w-14 bg-transparent font-mono text-xs font-bold text-[#2563eb] border-none p-0 text-right focus:ring-1 focus:ring-blue-400 rounded"
                                    />
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                              
                              {/* RICAVI */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">Ricavi Prospettici</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="text" 
                                      value={f.ricavi.toLocaleString('it-IT')} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "ricavi", e.target.value)}
                                      className="w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded font-semibold text-slate-900"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* EBITDA */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">EBITDA Previsionale</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="text" 
                                      value={f.ebitda.toLocaleString('it-IT')} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "ebitda", e.target.value)}
                                      className="w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded font-semibold text-slate-900"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* EBITDA MARGINE */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">EBITDA Margine (%)</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <span className="text-slate-400 mr-0.5">%</span>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={f.ebitdaMargine !== undefined ? f.ebitdaMargine : ""} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "ebitdaMargine", e.target.value)}
                                      className="w-12 bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded text-slate-800 font-semibold"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* PFN / EBITDA */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">PFN / EBITDA (x)</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <span className="text-slate-400 mr-0.5">x</span>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={f.pfnEbitda !== undefined ? f.pfnEbitda : ""} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "pfnEbitda", e.target.value)}
                                      className="w-12 bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded text-slate-800 font-semibold"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* DSCR ADJUSTED */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">DSCR Adjusted</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      placeholder="N.D."
                                      value={f.dscrAdjusted !== undefined && f.dscrAdjusted !== null ? f.dscrAdjusted : ""} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "dscrAdjusted", e.target.value)}
                                      className="w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded text-blue-800 font-semibold bg-blue-50/25 px-1"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* PATRIMONIO NETTO */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">Patrimonio Netto</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="text" 
                                      value={f.patrimonioNetto.toLocaleString('it-IT')} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "patrimonioNetto", e.target.value)}
                                      className="w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded font-semibold text-slate-900"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* EQUITY RATIO */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">Equity Ratio (%)</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <span className="text-slate-400 mr-0.5">%</span>
                                    <input 
                                      type="number" 
                                      value={f.equityRatio !== undefined && f.equityRatio !== null ? f.equityRatio : ""} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "equityRatio", e.target.value)}
                                      className="w-12 bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded text-slate-800"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* FABBISOGNO A BREVE TERMINE */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">Fabbisogno a Breve</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="text" 
                                      value={f.fabbisognoBreve.toLocaleString('it-IT')} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "fabbisognoBreve", e.target.value)}
                                      className="w-full bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded text-slate-800 font-semibold"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* GIORNI MAGAZZINO */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">Giorni Magazzino (gg)</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="number" 
                                      value={f.giorniMagazzino} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "giorniMagazzino", e.target.value)}
                                      className="w-16 bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded font-semibold text-slate-700"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* GIORNI CLIENTI */}
                              <tr>
                                <td className="py-2.5 px-2 text-slate-600 font-sans font-medium">Giorni Clienti (gg)</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="number" 
                                      value={f.giorniClienti} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "giorniClienti", e.target.value)}
                                      className="w-16 bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 rounded font-semibold text-slate-700"
                                    />
                                  </td>
                                ))}
                              </tr>

                              {/* SCORE LOM */}
                              <tr>
                                <td className="py-2.5 px-2 text-[#2563eb] font-sans font-bold">Score Previsionale LOM</td>
                                {selectedPratica.forecastData.map((f, i) => (
                                  <td key={i} className="py-2.5 px-2 text-right">
                                    <input 
                                      type="number" 
                                      value={f.scoreLom !== undefined && f.scoreLom !== null ? f.scoreLom : ""} 
                                      onChange={(e) => handleUpdateForecastMetric(i, "scoreLom", e.target.value)}
                                      className="w-14 bg-transparent text-right border-none p-0 focus:ring-1 focus:ring-blue-400 text-blue-800 bg-blue-100/50 px-1.5 py-0.5 rounded font-bold font-mono text-center"
                                    />
                                  </td>
                                ))}
                              </tr>

                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    <div className="mt-4 text-[10px] text-slate-400 flex items-start gap-1.5 font-sans border-t border-slate-100 pt-3">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#2563eb]" />
                      <span>Tutti i valori monetari inseriti o estratti sono espressi in Euro complessivi. Ciascuna casella è direttamente editabile per simulare scenari; i calcoli complessivi degli indicatori si ri-aggiornano immediatamente a sistema.</span>
                    </div>
                  </div>

                  {/* AUTOMATIC CREDIT ALERTS ENGINE */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-slate-800 text-sm">Motore Alert Automatici</h3>
                      </div>
                      
                      {selectedPratica.alerts.length > 0 && (
                        <div className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                          {selectedPratica.alerts.filter(a => a.triggered).length} TRIGGERATI
                        </div>
                      )}
                    </div>

                    <div className="space-y-3.5">
                      {selectedPratica.alerts.length === 0 ? (
                        <div className="p-4 text-center border border-dashed border-slate-100 rounded-lg text-slate-400 text-xs text-slate-400">
                          Caricare prospetti di bilancio per alimentare il confronto anno-su-anno ed i relativi alert automatici per capitale circolare e PFN.
                        </div>
                      ) : (
                        (() => {
                          const highSeverityAlerts = selectedPratica.alerts.filter(a => a.severity === 'high');
                          const infoSeverityAlerts = selectedPratica.alerts.filter(a => a.severity !== 'high');

                          const renderAlertRow = (alert: AlertMessage, index: number) => {
                            const isTriggered = alert.triggered;
                            const uniqueKey = `${alert.type}_${alert.yearCurrent}_${index}`;
                            const isExpanded = expandedAlerts[uniqueKey] !== undefined 
                              ? expandedAlerts[uniqueKey] 
                              : alert.severity === 'high';

                            const toggleExpand = () => {
                              setExpandedAlerts(prev => ({
                                ...prev,
                                [uniqueKey]: !isExpanded
                              }));
                            };

                            return (
                              <div 
                                key={uniqueKey}
                                className={`rounded-lg border transition-all ${
                                  isTriggered 
                                    ? "bg-rose-50/50 border-rose-200/60" 
                                    : "bg-slate-50/50 border-slate-100"
                                }`}
                              >
                                {/* Header Row (Always Clickable) */}
                                <div 
                                  onClick={toggleExpand}
                                  className="p-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-100/35 transition-colors select-none"
                                >
                                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                    <div className="mt-0.5 shrink-0">
                                      {isTriggered ? (
                                        <span className="flex p-0.5 bg-red-100 text-red-700 rounded-full">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                        </span>
                                      ) : (
                                        <span className="flex p-0.5 bg-slate-100 text-slate-450 rounded-full">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 text-left">
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="text-xs font-bold text-slate-800 tracking-tight">{alert.metric}</span>
                                        <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded shrink-0 ${
                                          isTriggered ? "bg-red-100 text-red-750" : "bg-slate-150 text-slate-550"
                                        }`}>
                                          {isTriggered ? `+${(alert.growthRate * 100).toFixed(1)}%` : `${(alert.growthRate * 100).toFixed(1)}%`}
                                        </span>
                                      </div>
                                      <div className="text-[9px] font-semibold font-mono text-slate-400 uppercase mt-0.5 tracking-wider">
                                        Riscontro: <span className="font-bold text-slate-500">{alert.yearCurrent}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex items-center self-center" style={{ outline: 'none' }}>
                                    <ChevronDown className={`w-4 h-4 text-slate-455 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </div>

                                {/* Body Message (Collapsible) */}
                                {isExpanded && (
                                  <div className="px-3 pb-3 pt-0.5 border-t border-slate-100/40 text-[11px] leading-relaxed text-left animate-fade-in">
                                    <p className={`font-normal ${isTriggered ? "text-red-950/90 font-medium" : "text-slate-550"}`}>
                                      {alert.message}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          };

                          return (
                            <div className="space-y-3 text-left">
                              {/* High Priority Alerts (Always visible, open by default) */}
                              {highSeverityAlerts.length > 0 && (
                                <div className="space-y-2">
                                  {highSeverityAlerts.map((alert, idx) => renderAlertRow(alert, idx))}
                                </div>
                              )}

                              {/* Collapsible Info/Medium group */}
                              {infoSeverityAlerts.length > 0 && (
                                <div className="border border-slate-150 rounded-lg overflow-hidden bg-slate-50/10">
                                  {/* Group Trigger Button */}
                                  <button
                                    type="button"
                                    onClick={() => setShowOtherAlerts(!showOtherAlerts)}
                                    className="w-full p-2.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100/50 transition-colors text-left border-none focus:outline-none cursor-pointer"
                                  >
                                    <span className="text-xs font-bold text-slate-650 flex items-center gap-1.5 leading-none">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                      Indicatori Sani e Informativi
                                      <span className="bg-slate-200 text-slate-755 rounded-full px-1.5 py-0.2 text-[8px] font-mono font-extrabold ml-1 leading-normal">
                                        {infoSeverityAlerts.length} SANI
                                      </span>
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-slate-550 transition-transform duration-200 ${showOtherAlerts ? 'rotate-180' : ''}`} />
                                  </button>

                                  {showOtherAlerts && (
                                    <div className="p-2.5 bg-white space-y-2 border-t border-slate-150/70 animate-fade-in max-h-[250px] overflow-y-auto pr-1">
                                      {infoSeverityAlerts.map((alert, idx) => renderAlertRow(alert, idx + highSeverityAlerts.length))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION: DATI COMPORTAMENTALI & RATINGS (ANDAMENTO CONTI, NOTE LIBERE, CRIF, CR) */}
              <div className="no-print bg-white rounded-xl shadow-md border border-slate-200/85 p-6 space-y-6 text-left">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <Database className="w-5 h-5 text-blue-600 animate-pulse" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Sintesi Comportamentale & Ratings Qualitativi</h3>
                    <p className="text-[10px] text-slate-500 font-sans">Compilazione interattiva e analisi di CRIF, Centrale Rischi (BdI), andamento storico del rapporto e appunti gestore.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column of Dati: Andamento Conti & Note Libere */}
                  <div className="space-y-4">
                    {/* Andamento conti e redditività (Sezione 11) */}
                    <div className="bg-emerald-50/45 rounded-lg border border-emerald-100/50 p-4 shadow-xs transition-all duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-800 block uppercase tracking-wider text-[10px]">🏦 Andamento conti e redditività (Sezione 11)</span>
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">AI Grounded</span>
                        </div>
                        {!isEditingInlineAndamento && (
                          <button
                            onClick={() => {
                              setInlineAndamentoVal(selectedPratica.andamentoContiBanca || "");
                              setIsEditingInlineAndamento(true);
                            }}
                            className="text-emerald-700 hover:text-emerald-900 font-extrabold underline text-[10px] cursor-pointer"
                            title="Modifica inline l'andamento dei conti"
                          >
                            ✎ Modifica
                          </button>
                        )}
                      </div>

                      {isEditingInlineAndamento ? (
                        <div className="space-y-2 mt-2">
                          <textarea
                            rows={3}
                            value={inlineAndamentoVal}
                            onChange={(e) => setInlineAndamentoVal(e.target.value)}
                            className="bg-white border border-emerald-300 w-full rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none p-2 text-xs font-normal text-slate-855 font-sans leading-normal shadow-sm"
                            placeholder="Anzianità del rapporto, movimentazione, insoluti %, rating interno, pricing..."
                            disabled={isGroundingAndamento}
                          />
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleGroundField('andamentoContiBanca')}
                              disabled={isGroundingAndamento}
                              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[11px] rounded font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isGroundingAndamento ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Elaborazione AI...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Migliora con AI (Grounded) ⚡
                                </>
                              )}
                            </button>
                            <div className="flex gap-1.5 ml-auto">
                              <button
                                onClick={() => setIsEditingInlineAndamento(false)}
                                disabled={isGroundingAndamento}
                                className="bg-slate-200 text-slate-700 px-2 py-1 text-[11px] rounded font-semibold hover:bg-slate-300 transition cursor-pointer"
                              >
                                Annulla
                              </button>
                              <button
                                onClick={handleSaveInlineAndamento}
                                disabled={isGroundingAndamento}
                                className="bg-emerald-600 text-white px-2.5 py-1 text-[11px] rounded font-semibold hover:bg-emerald-700 transition cursor-pointer"
                              >
                                Salva
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="leading-snug whitespace-pre-line text-xs text-slate-655 font-sans">
                          {selectedPratica.andamentoContiBanca ? selectedPratica.andamentoContiBanca : (
                            <span className="text-slate-400 italic font-medium">Nessuna informazione sull'andamento dei conti bancari inserita. Clicca su "Modifica" a destra per compilarlo.</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Gestor Free Text Notes */}
                    <div className="bg-blue-50/45 rounded-lg border border-blue-100/50 p-4 shadow-xs transition-all duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-800 block uppercase tracking-wider text-[10px]">📝 Note Addizionali del Gestore (Note Libere)</span>
                          <span className="text-[8px] bg-blue-100 text-blue-800 border border-blue-200 font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">AI Grounded</span>
                        </div>
                        {!isEditingInlineNotes && (
                          <button
                            onClick={() => {
                              setInlineNotesVal(selectedPratica.noteLibere || "");
                              setIsEditingInlineNotes(true);
                            }}
                            className="text-blue-700 hover:text-blue-900 font-extrabold underline text-[10px] cursor-pointer"
                            title="Modifica inline le note del gestore"
                          >
                            ✎ Compila / Modifica
                          </button>
                        )}
                      </div>

                      {isEditingInlineNotes ? (
                        <div className="space-y-2 mt-2">
                          <textarea
                            rows={3}
                            value={inlineNotesVal}
                            onChange={(e) => setInlineNotesVal(e.target.value)}
                            className="bg-white border border-blue-300 w-full rounded focus:ring-1 focus:ring-blue-500 focus:outline-none p-2 text-xs font-normal text-slate-855 font-sans leading-normal shadow-sm"
                            placeholder="Scrivi qui osservazioni libere, debito storico, appunti qualitativi sul cliente..."
                            disabled={isGroundingNoteLibere}
                          />
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleGroundField('noteLibere')}
                              disabled={isGroundingNoteLibere}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 text-[11px] rounded font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isGroundingNoteLibere ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Elaborazione AI...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Migliora con AI (Grounded) ⚡
                                </>
                              )}
                            </button>
                            <div className="flex gap-1.5 ml-auto">
                              <button
                                onClick={() => setIsEditingInlineNotes(false)}
                                disabled={isGroundingNoteLibere}
                                className="bg-slate-200 text-slate-700 px-2 py-1 text-[11px] rounded font-semibold hover:bg-slate-300 transition cursor-pointer"
                              >
                                Annulla
                              </button>
                              <button
                                onClick={handleSaveInlineNotes}
                                disabled={isGroundingNoteLibere}
                                className="bg-blue-600 text-white px-2.5 py-1 text-[11px] rounded font-semibold hover:bg-blue-700 transition cursor-pointer"
                              >
                                Salva Note
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="leading-snug whitespace-pre-line text-xs text-slate-655 font-sans">
                          {selectedPratica.noteLibere ? selectedPratica.noteLibere : (
                            <span className="text-slate-400 italic font-medium">Nessuna nota aggiuntiva fornita dal gestore. Clicca su "Compila / Modifica" a destra per inserire appunti qualitativi utili per l'analisi.</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column of Dati: CRIF & Centrale Rischi summaries */}
                  <div className="space-y-4">
                    {/* CRIF Sprint Business Ratings Summary */}
                    <div className="bg-purple-50/45 rounded-lg border border-purple-100/50 p-4 shadow-xs transition-all duration-200">
                      <div className="flex items-center justify-between mb-2 border-b border-purple-100 pb-1.5">
                        <span className="font-bold text-purple-800 block uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                          📊 CRIF EURISC (Sprint Business)
                        </span>
                        <span className="text-[8px] text-purple-600 font-mono tracking-widest font-black uppercase bg-purple-100 px-1.5 py-0.5 rounded">Fiscale & Comportamentale</span>
                      </div>
                      {selectedPratica.crifValutazione ? (
                        <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="bg-white p-2 rounded border border-purple-100 shadow-xs flex justify-between items-center">
                            <span className="text-[9px] text-purple-500 font-mono block uppercase font-bold">VALUTAZIONE CLASSE</span>
                            <span className="font-extrabold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-mono">{selectedPratica.crifValutazione}</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-purple-100 shadow-xs flex justify-between items-center">
                            <span className="text-[9px] text-purple-500 font-mono block uppercase font-bold">FASCIA DI RISCHIO</span>
                            <span className="font-extrabold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-mono">{selectedPratica.crifFascia}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded border border-purple-100 shadow-xs md:col-span-2">
                            <span className="text-[9px] text-purple-500 font-mono block uppercase font-bold mb-0.5">SINTESI DELLA MOTIVAZIONE</span>
                            <p className="text-slate-655 leading-relaxed font-sans">{selectedPratica.crifMotivazione}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="leading-snug text-xs text-slate-400 italic p-2 bg-white/50 border border-slate-100 rounded">
                          Nessun report CRIF Sprint Business rilevato nel fascicolo. Carica il documento nello slot dedicato a destra per estrarre istantaneamente classe, fascia ed evidenza motivazionale CRIF per la relazione fidi.
                        </p>
                      )}
                    </div>

                    {/* Centrale Rischi Ratings Summary */}
                    <div className="bg-blue-50/45 rounded-lg border border-blue-100/50 p-4 shadow-xs transition-all duration-200">
                      <div className="flex items-center justify-between mb-2 border-b border-blue-100 pb-1.5">
                        <span className="font-bold text-blue-800 block uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                          🏦 CENTRALE RISCHI BANCA D'ITALIA
                        </span>
                        <span className="text-[8px] text-blue-600 font-mono tracking-widest font-black uppercase bg-blue-100 px-1.5 py-0.5 rounded">Rilevazione Automatica</span>
                      </div>
                      {selectedPratica.crValutazione ? (
                        <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="bg-white p-2 rounded border border-blue-100 shadow-xs flex justify-between items-center">
                            <span className="text-[9px] text-blue-500 font-mono block uppercase font-bold">STATO COMPLESSIVO</span>
                            <span className="font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">{selectedPratica.crValutazione}</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-blue-100 shadow-xs flex justify-between items-center">
                            <span className="text-[9px] text-blue-500 font-mono block uppercase font-bold">ACCORDATO / UTILIZZATO</span>
                            <span className="font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">{selectedPratica.crFascia}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded border border-blue-100 shadow-xs md:col-span-2">
                            <span className="text-[9px] text-blue-500 font-mono block uppercase font-bold mb-0.5">SINTESI DELLA RILEVAZIONE</span>
                            <p className="text-slate-655 leading-relaxed font-sans">{selectedPratica.crSintesi}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="leading-snug text-xs text-slate-400 italic p-2 bg-white/50 border border-slate-100 rounded">
                          Nessun report Centrale Rischi (BdI) rilevato nel fascicolo. Carica il documento nello slot dedicato a destra per estrarre istantaneamente lo stato comportamentale, l'accordato vs utilizzato e la sintesi dei principali fidi per la relazione.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMN CENTER: THE DETAILED REPORT EDITOR AND RENDER (Full-width) */}
              <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden print-report-container relative transition-all duration-300 w-full mt-2">
                  
                  {reportQuotaError && (
                    <div className="no-print mx-6 mt-6 p-5 bg-red-50 border border-red-200 rounded-xl text-left animate-fade-in shadow-sm relative z-50">
                      <button 
                        onClick={() => setReportQuotaError(null)} 
                        className="absolute top-3 right-3 text-red-500 hover:text-red-800 font-bold text-xs"
                      >
                        ✕ Chiudi
                      </button>
                      <div className="flex gap-4">
                        <div className="bg-red-100 p-2.5 rounded-xl text-red-650 h-fit shrink-0">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-red-950 m-0 leading-tight">Limite Quota API Superato (Errore 429)</h4>
                          <p className="text-xs text-red-700 m-0 mt-2 leading-relaxed">
                            {reportQuotaError.message || "Hai raggiunto il limite temporaneo o giornaliero di richieste consentite dall'API gratuita di Gemini."}
                          </p>
                          <div className="text-[11px] text-red-650 font-mono mt-2 bg-white/60 p-2 rounded border border-red-100">
                            <strong>Nota per l'analista:</strong> Puoi configurare la tua API Key esclusiva (senza limiti gratuiti) inserendo la chiave `GEMINI_API_KEY` nella scheda dei Segreti del progetto (AI Studio Editor - Secrets).
                          </div>
                          <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => {
                                setReportQuotaError(null);
                                handleGenerateReport(false, true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3.5 py-1.5 rounded transition shadow-sm w-fit flex items-center gap-1.5"
                            >
                              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              Genera con Opzione Lite (Senza AI)
                            </button>
                            <button
                              onClick={() => setReportQuotaError(null)}
                              className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3.5 py-1.5 rounded transition shadow-sm w-fit"
                            >
                              Ho Capito
                            </button>
                            <a
                              href="https://ai.google.dev/gemini-api/docs/rate-limits"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 text-[11px] font-semibold px-3.5 py-1.5 rounded transition shadow-sm w-fit flex items-center justify-center gap-1.5"
                            >
                              Limiti Gemini API ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GENERATOR WORKPLACE PREVIEW & ACTION BLOCK */}
                  {!selectedPratica.markdownReport ? (
                    <div className="no-print p-12 text-center flex-1 flex flex-col justify-center items-center space-y-6 min-h-[500px]">
                      
                      {isGeneratingReport ? (
                        <div className="space-y-4 max-w-md">
                          <div className="relative w-20 h-20 mx-auto">
                            <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                            <Brain className="w-8 h-8 text-[#2563eb] absolute inset-0 m-auto animate-pulse" />
                          </div>

                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 text-sm">Compilazione Relazione AI in corso...</h4>
                            <div className="font-mono text-xs text-blue-600 min-h-[1.5rem] font-semibold">{reportGenStage}</div>
                          </div>

                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[11px] text-slate-500 font-mono">
                            Tempo Svolgimento: <span className="text-blue-600 font-bold">{reportLoadingTimer} secondi</span>
                            <p className="mt-1 font-sans text-slate-400">Le relazioni evolute seguono 14 capitoli regolamentati. Questa operazione richiede tipicamente 15-20 secondi per la formattazione dei dati storici.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-md space-y-4">
                          <div className="bg-blue-50 text-[#2563eb] p-4 rounded-full w-fit mx-auto shadow-inner">
                            <Brain className="w-10 h-10" />
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900">Relazione AI non ancora generata</h3>
                            <p className="text-xs text-slate-500">
                              Il sistema utilizzerà i dati consolidati e gli alert per formulare una relazione commerciale completa ed evoluta divisa tassativamente nei 14 capitoli istruttori fidi italiani.
                            </p>
                          </div>

                          {(() => {
                            const hasFinancialDoc = (selectedPratica.financialData && selectedPratica.financialData.length > 0) || 
                                                    !!(selectedPratica.uploadedFiles && Object.keys(selectedPratica.uploadedFiles).some(k => 
                                                      ["cebi", "bilce", "lom"].includes(k.toLowerCase())
                                                    ));
                            return (
                              <>
                                <button 
                                  id="btn_genera_relazione"
                                  onClick={handleGenerateReport}
                                  disabled={!hasFinancialDoc}
                                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-full py-3 px-6 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition shadow-md"
                                >
                                  <Brain className="w-4 h-4" />
                                  Genera Relazione Evoluta con AI
                                </button>

                                <button 
                                  id="btn_genera_relazione_lite"
                                  onClick={() => handleGenerateReport(false, true)}
                                  disabled={!hasFinancialDoc}
                                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-full py-2.5 px-6 rounded-md font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm mt-2"
                                >
                                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                  Genera con Opzione Lite (Bypass Quota AI)
                                </button>
                                
                                {!hasFinancialDoc && (
                                  <p className="text-[10px] text-red-500 font-medium">
                                    ⚠️ Carica prima un documento di bilancio (CEBI, BILCe o LOM) per estrarne i dati finanziari necessari.
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {selectedPratica.markdownReport ? (
                    <div className="flex-1 flex flex-col">
                      
                      {isGeneratingReport && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-40 flex flex-col justify-center items-center p-8 text-center animate-fade-in">
                          <div className="space-y-4 max-w-sm">
                            <div className="relative w-20 h-20 mx-auto">
                              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                              <Brain className="w-8 h-8 text-[#2563eb] absolute inset-0 m-auto animate-pulse" />
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-bold text-slate-900 text-sm">Aggiornamento Relazione in corso...</h4>
                              <div className="font-mono text-xs text-blue-600 min-h-[1.5rem] font-semibold">{reportGenStage}</div>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[11px] text-slate-500 font-mono">
                              Tempo Svolgimento: <span className="text-blue-600 font-bold">{reportLoadingTimer} secondi</span>
                              <p className="mt-1 font-sans text-slate-400">Riscrittura della Relazione Istruttoria coerentemente con i nuovi allegati...</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* HEADER: EDITOR/PREVIEW TAB SELECTOR (Hidden in Print) */}
                      <div className="no-print bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                        
                        <div className="flex bg-slate-200/75 p-1 rounded-lg gap-1">
                          <button 
                            id="tab_visualizza"
                            onClick={() => setActiveTab("visualizza")}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${activeTab === "visualizza" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            Anteprima Relazione
                          </button>
                          <button 
                            id="tab_modifica"
                            onClick={() => {
                              setEditedMarkdown(selectedPratica.markdownReport);
                              setActiveTab("modifica");
                            }}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${activeTab === "modifica" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            Editor Testo (Markdown)
                          </button>
                          <button 
                            id="tab_assistente"
                            onClick={() => setActiveTab("assistente")}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${activeTab === "assistente" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            Assistente AI Domande / Q&A
                          </button>
                          <button 
                            id="tab_sezioni"
                            onClick={() => setActiveTab("sezioni")}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${activeTab === "sezioni" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            Sezioni AI Grounded
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            CONSOLIDATA
                          </span>

                          <button 
                            id="btn_rigenera_ai"
                            onClick={handleGenerateReport}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2 py-1.5 rounded text-xs flex items-center gap-1 font-semibold transition"
                            title="Rigenera con AI"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                            Rigenera AI
                          </button>

                          <button 
                            id="btn_rigenera_lite"
                            onClick={() => handleGenerateReport(false, true)}
                            className="bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 px-2 py-1.5 rounded text-xs flex items-center gap-1 font-semibold transition shadow-xs"
                            title="Rigenera con Opzione Lite (Senza AI)"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                            Rigenera Lite
                          </button>
                          
                          <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>

                          <button 
                            onClick={handleExportWord}
                            disabled={!selectedPratica.markdownReport}
                            className="bg-[#1e3a8b] hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Word (.doc)
                          </button>
                          
                          <a 
                            href={selectedPratica.markdownReport ? `/api/pratiche/${selectedPratica.id}/print?token=${userToken}` : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded font-medium text-xs flex items-center gap-1.5 transition shadow-sm select-none ${!selectedPratica.markdownReport ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                            onClick={(e) => {
                              if (!selectedPratica.markdownReport) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Stampa / PDF
                          </a>
                        </div>
                      </div>

                      {/* ACTIVE SCREEN WORKSPACE */}
                      <div className="flex-1 min-h-[500px]">
                        
                        {/* TAB 1: VISUALIZZA / FORMATTED MARKDOWN (Default View) */}
                        <div className={`p-6 sm:p-8 markdown-body prose prose-slate max-w-none prose-sm overflow-y-auto ${activeTab === "visualizza" ? "block" : "hidden print:block"}`}>
                          
                          {/* UPDATE/REGENERATION REMINDER BANNER */}
                          {showRegenerationBanner && (
                            <div className="no-print mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-fade-in shadow-sm">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                <div className="not-prose">
                                  <p className="text-xs font-bold text-amber-900 leading-none m-0">Nuovi Documenti o Note Rilevati!</p>
                                  <p className="text-[11px] text-amber-700 m-0 mt-1 leading-snug">Hai caricato nuovi file o modificato le note del gestore. Clicca a destra per rigenerare la relazione commerciale con i dati aggiornati dall'AI.</p>
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  setShowRegenerationBanner(false);
                                  await handleGenerateReport();
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow flex items-center gap-1.5 transition-colors self-end md:self-center shrink-0"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Rigenera Ora
                              </button>
                            </div>
                          )}

                          {/* Show full report on web page, but strip Credit Data Audit inside printable version */}
                          <div className="print:hidden">
                            <Markdown components={{
                              p: ({ children }: any) => <p>{children && Array.isArray(children) ? children.map((c: any) => typeof c === 'string' ? processTextForGroundedSpans(c) : c) : (typeof children === 'string' ? processTextForGroundedSpans(children) : children)}</p>,
                              li: ({ children }: any) => <li>{children && Array.isArray(children) ? children.map((c: any) => typeof c === 'string' ? processTextForGroundedSpans(c) : c) : (typeof children === 'string' ? processTextForGroundedSpans(children) : children)}</li>,
                              td: ({ children }: any) => <td>{children && Array.isArray(children) ? children.map((c: any) => typeof c === 'string' ? processTextForGroundedSpans(c) : c) : (typeof children === 'string' ? processTextForGroundedSpans(children) : children)}</td>
                            }}>{stripCreditDataAudit(selectedPratica.markdownReport, false, true)}</Markdown>
                          </div>
                          
                          <div className="hidden print:block relative">
                            {/* Static print header for first page */}
                            <div className="border-b-2 border-[#1e3a8a] pb-4 mb-6">
                              <div className="flex justify-between items-end">
                                <div className="flex items-center gap-3">
                                  <div className="bg-[#1e3a8a] text-white font-bold h-10 w-10 flex items-center justify-center rounded">
                                    MM
                                  </div>
                                  <div>
                                    <h1 className="text-xl font-bold tracking-tight text-[#1e3a8a] m-0">Massimo Malamisura</h1>
                                    <p className="text-[9px] font-mono text-slate-500 m-0 uppercase tracking-wider">Gestione Relazioni Corporate</p>
                                  </div>
                                </div>
                                <div className="text-right font-mono text-slate-500 text-[10px] leading-tight">
                                  {selectedPratica.numeroPratica && (
                                    <div className="text-[#1e3a8a] font-bold text-xs mb-1">NUMERO PRATICA: {selectedPratica.numeroPratica}</div>
                                  )}
                                  <div>Data Generazione: <span className="font-semibold text-slate-700">{new Date(selectedPratica.dateCreated).toLocaleDateString("it-IT")}</span></div>
                                </div>
                              </div>
                            </div>

                            <Markdown components={{
                              p: ({ children }: any) => <p>{children && Array.isArray(children) ? children.map((c: any) => typeof c === 'string' ? processTextForGroundedSpans(c) : c) : (typeof children === 'string' ? processTextForGroundedSpans(children) : children)}</p>,
                              li: ({ children }: any) => <li>{children && Array.isArray(children) ? children.map((c: any) => typeof c === 'string' ? processTextForGroundedSpans(c) : c) : (typeof children === 'string' ? processTextForGroundedSpans(children) : children)}</li>,
                              td: ({ children }: any) => <td>{children && Array.isArray(children) ? children.map((c: any) => typeof c === 'string' ? processTextForGroundedSpans(c) : c) : (typeof children === 'string' ? processTextForGroundedSpans(children) : children)}</td>
                            }}>{stripCreditDataAudit(selectedPratica.markdownReport, true, true)}</Markdown>

                            {/* Signatures placed at the end */}
                            <div className="mt-16 pt-8 border-t border-slate-100 text-xs font-mono w-full text-left flex justify-between break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                              <div className="max-w-xs">
                                <span className="block text-slate-400 text-[11px] uppercase text-left mb-12">IL GESTORE RELAZIONI CORPORATE (CONFERMATORE)</span>
                                <div className="border-b border-dashed border-slate-400 mb-2"></div>
                                <span className="text-[10px] text-slate-500 block text-left">Firma: _ _ _ _ _ _ _ _ _ _ _ _ _ _ _</span>
                              </div>
                            </div>
                            
                            {/* Document ending static footer */}
                            <div className="mt-12 pt-2 border-t border-slate-200 text-slate-400 text-[9px] font-mono flex justify-between w-full break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                              <span>Impresa: {selectedPratica.aziendaName}</span>
                              <span>Massimo Malamisura — © Copyright 2026</span>
                            </div>
                          </div>
                      
                        </div>

                        {/* TAB 2: EDIT MARKDOWN CODE VIEW (No print) */}
                        <div className={`no-print p-4 flex flex-col h-full bg-slate-50 border-t border-slate-100 ${activeTab === "modifica" ? "block" : "hidden"}`}>
                          <div className="flex-1 flex flex-col gap-2 relative">
                            <textarea
                              id="editor_textarea_markdown"
                              value={editedMarkdown}
                              onChange={(e) => setEditedMarkdown(e.target.value)}
                              placeholder="# Relazione Commerciale Evoluta..."
                              className="w-full h-[550px] p-4 bg-white text-slate-800 font-mono text-xs border border-slate-200 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            
                            <div className="flex justify-between items-center mt-2.5">
                              <div className="text-[10px] text-slate-400 font-mono">
                                Caratteri totali: <span className="font-bold">{editedMarkdown.length}</span>
                              </div>
                              <button
                                id="btn_salva_report"
                                onClick={handleSaveReportEdits}
                                className="bg-[#059669] hover:bg-[#047857] text-white px-4 py-2 rounded font-semibold text-xs flex items-center gap-1.5 transition shadow"
                              >
                                <Save className="w-3.5 h-3.5" />
                                Salva Modifiche Capitoli
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* TAB 3: ASSISTENTE AI CHAT / ANALISI CONVERGENZA (No print) */}
                        <div className={`no-print p-4 sm:p-6 flex flex-col h-full bg-slate-50 border-t border-slate-100 ${activeTab === "assistente" ? "block" : "hidden"}`}>
                          
                          {/* SPREAD CHAT CONTROLLER BANNER */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-150 rounded-xl p-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-xs">
                            <div className="space-y-0.5 text-left">
                              <h4 className="text-xs font-extrabold text-blue-950 uppercase tracking-wide">🧠 Rigenerazione Relazione basata su Richieste Chat</h4>
                              <p className="text-[11px] text-slate-650 leading-relaxed font-semibold">Dopo aver descritto all'assistente i chiarimenti e le integrazioni desiderate, clicca su questo pulsante per istruire il Brain AI a incorporare queste richieste direttamente nella stesura formale del Report Fidi.</p>
                            </div>
                            <button
                              onClick={async () => {
                                await handleGenerateReport(true);
                              }}
                              disabled={isGeneratingReport || !(selectedPratica.chatHistory && selectedPratica.chatHistory.length > 0)}
                              className="bg-blue-650 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-md transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Rigenera con modifiche chat
                            </button>
                          </div>

                          <div className="flex flex-col bg-white border border-slate-200/75 rounded-xl shadow-xs overflow-hidden h-[580px]">
                            {/* CHAT MESSAGES PANEL */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                              {(!selectedPratica.chatHistory || selectedPratica.chatHistory.length === 0) ? (
                                <div className="text-center py-10 space-y-3 max-w-sm mx-auto">
                                  <div className="bg-slate-100 p-3 h-12 w-12 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                                    <Brain className="w-6 h-6 text-slate-450" />
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-slate-800 text-xs">Assistente AI Credit Analyst Sotto-mano</h5>
                                    <p className="text-[11px] text-slate-450 mt-1 leading-normal">
                                      Benvenuto, Gestore Massimo Malamisura. Chiedimi dove ho reperito dati specifici della relazione, chiedi di calcolare indici, spiegare anomalie o define integrazioni. Chiedimi di riscrivere parti della relazione e premi "Rigenera con modifiche" qui sopra quando sei pronto!
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                selectedPratica.chatHistory.map((msg, index) => (
                                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-xl p-3 text-xs shadow-xs leading-relaxed text-left ${
                                      msg.role === 'user' 
                                        ? 'bg-blue-600 text-white rounded-tr-none font-medium' 
                                        : 'bg-slate-100 text-slate-800 rounded-tl-none font-normal'
                                    }`}>
                                      <div className="whitespace-pre-line text-left">
                                        {msg.role === 'model' ? (
                                          <div className="markdown-body prose max-w-none text-xs text-slate-800">
                                            <Markdown>{msg.text}</Markdown>
                                          </div>
                                        ) : msg.text}
                                      </div>
                                      
                                      {/* Message Attachments List */}
                                      {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200/50 flex flex-wrap gap-1.5 justify-start">
                                          {msg.attachments.map((att: any, attIdx: number) => {
                                            const isImage = att.fileType && att.fileType.startsWith("image/");
                                            const downloadUrl = `/api/pratiche/${selectedPratica.id}/files/chat?fileName=${att.savedName || att.fileName}`;
                                            return (
                                              <a
                                                key={attIdx}
                                                href={downloadUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-semibold transition hover:scale-[1.01] ${
                                                  msg.role === 'user'
                                                    ? 'bg-blue-700/55 text-white border-blue-500/25 hover:bg-blue-700'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs'
                                                }`}
                                              >
                                                {isImage ? (
                                                  <Image className="w-3 h-3 text-emerald-500 shrink-0" />
                                                ) : (
                                                  <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                                                )}
                                                <span className="truncate max-w-[130px] font-sans">{att.fileName}</span>
                                                <span className="text-[7.5px] font-mono opacity-60">↓</span>
                                              </a>
                                            );
                                          })}
                                        </div>
                                      )}

                                      <span className={`block text-[8px] font-mono mt-1.5 opacity-60 text-left ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {msg.role === 'user' ? 'Massimo Malamisura' : 'Credit Analyst AI'} • {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("it-IT") : ''}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                              {isSendingChatMessage && (
                                <div className="flex justify-start">
                                  <div className="bg-slate-150 p-2.5 rounded-xl rounded-tl-none text-[11px] text-slate-600 font-mono flex items-center gap-1.5 max-w-[80%] shadow-xs">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>L'analista sta riesaminando la documentazione...</span>
                                  </div>
                                </div>
                              )}
                              {chatError && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-medium text-left">
                                  ⚠️ Errore di connessione: {chatError}
                                </div>
                              )}
                            </div>

                            {/* CHAT INPUT AREA */}
                            <form onSubmit={handleSendChatMessage} className="border-t border-slate-205 p-3 bg-slate-50 flex flex-col gap-2">
                              {chatAttachments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100 rounded-lg border border-slate-200 max-h-24 overflow-y-auto">
                                  {chatAttachments.map((att, attIdx) => {
                                    const isImage = att.fileType && att.fileType.startsWith("image/");
                                    return (
                                      <div key={attIdx} className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-205 shadow-xs text-[10px] font-semibold text-slate-700">
                                        {isImage ? <Image className="w-3 h-3 text-emerald-500" /> : <FileText className="w-3 h-3 text-blue-500" />}
                                        <span className="truncate max-w-[130px]">{att.fileName}</span>
                                        <button
                                          type="button"
                                          onClick={() => removeChatAttachment(attIdx)}
                                          className="text-slate-400 hover:text-red-500 shrink-0 transition p-0.5 ml-1 font-bold"
                                          title="Rimuovi allegato"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={handleClearChatHistory}
                                  title="Azzera conversazione"
                                  className="bg-white border border-slate-200 hover:bg-slate-100 px-2.5 py-2 text-slate-500 hover:text-slate-700 rounded-lg shadow-sm transition shrink-0 cursor-pointer text-xs"
                                >
                                  Cancella 🗑️
                                </button>

                                <input 
                                  type="file" 
                                  id="chat-file-input" 
                                  multiple 
                                  onChange={handleChatFileChange} 
                                  className="hidden" 
                                />
                                <label
                                  htmlFor="chat-file-input"
                                  className="bg-white border border-slate-200 hover:bg-slate-100 px-2.5 py-2 text-slate-600 hover:text-slate-800 rounded-lg shadow-sm transition shrink-0 cursor-pointer text-xs flex items-center justify-center gap-1 font-semibold"
                                  title="Allega uno o più file"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Allega 📎</span>
                                </label>

                                <textarea 
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendChatMessage(e);
                                    }
                                  }}
                                  rows={1}
                                  style={{ minHeight: '38px', maxHeight: '160px' }}
                                  ref={(el) => {
                                    if (el) {
                                      el.style.height = "auto";
                                      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                                    }
                                  }}
                                  placeholder="Chiedi spiegazioni o commenta file e relazioni insieme..."
                                  className="flex-1 bg-white border border-slate-250 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium focus:outline-none resize-none overflow-y-auto"
                                />
                                <button
                                  type="submit"
                                  disabled={isSendingChatMessage || (!chatInput.trim() && chatAttachments.length === 0)}
                                  className="bg-blue-650 hover:bg-blue-750 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow transition cursor-pointer shrink-0 h-[38px] flex items-center justify-center"
                                >
                                  Invia
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>

                        {/* TAB 4: SEZIONI INTERATTIVE / AI GROUNDED SECTION BY SECTION (No print) */}
                        <div className={`no-print p-4 sm:p-6 bg-slate-50 border-t border-slate-100 ${activeTab === "sezioni" ? "block" : "hidden"}`}>
                          
                          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-150 rounded-xl p-4.5 mb-5 text-left shadow-xs">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
                              <h4 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider">Gestione Paragrafi Relazione (AI Grounded & Local Edit)</h4>
                            </div>
                            <p className="text-[11px] text-slate-650 leading-relaxed font-semibold">
                              Intervieni in modo chirurgico su ciascuno dei 13 capitoli istruttori della Pratica di Fido. Puoi modificare il testo localmente, oppure inserire linee guida e istruzioni specifiche (es. basate sui fidi reali) e far **rigenerare solo quel paragrafo con l'AI Grounding**, lasciando intatto il resto del report!
                            </p>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            
                            {/* LEFT SIDE: LIST OF SECTIONS (lg:col-span-8) */}
                            <div className="lg:col-span-8 space-y-2 max-h-[580px] overflow-y-auto pr-1">
                              {[
                                { num: 1, label: "1. Linee e Fidi Proposti", desc: "Pricing, tassi, spread, commissioni", dep: "udcCondizioni" },
                                { num: 2, label: "2. Soci e Governance d'impresa", desc: "Tabelle soci, organi di controllo e AML", dep: "reportGold" },
                                { num: 3, label: "3. Cenni Storici", desc: "Fondazione, evoluzione del business", dep: "relazioneGestione" },
                                { num: 4, label: "4. Dettaglio Soci e Amm.ri", desc: "Governance, ricambio generazionale", dep: "reportGold" },
                                { num: 5, label: "5. Punti di Forza (SWOT)", desc: "Mitgazione rischi e plus competitivi", dep: "" },
                                { num: 6, label: "6. Punti di Debolezza (SWOT)", desc: "Aree di attenzione presidiate", dep: "" },
                                { num: 7, label: "7. Prodotti e Organizzazione", desc: "Logistica, sopralluogo, analisi visiva", dep: "immaginiAzienda" },
                                { num: 8, label: "8. Precedenti e Affermazione", desc: "Storia di merito creditizio", dep: "" },
                                { num: 9, label: "9. Mercato e Concorrenza", desc: "Macro scenari, link a fonti esterne", dep: "" },
                                { num: 10, label: "10. Presentazione Cliente", desc: "Modello strategico a 360 gradi", dep: "businessPlan" },
                                { num: 11, label: "11. Andamento Conti e Rapporti", desc: "Movimentazione e reciprocità", dep: "redditivita" },
                                { num: 12, label: "12. Commento Bilancio", desc: "Margini, indici di sviluppo, score LOM", dep: "bilce" },
                                { num: 13, label: "13. Commento CR e Eurisc", desc: "Analisi accordato/utilizzato, Crif", dep: "centraleRischi" }
                              ].map((sect) => {
                                const isSelected = selectedSectionNum === sect.num;
                                // Check if the dependency file is uploaded
                                let isGrounded = false;
                                if (sect.dep === "udcCondizioni") {
                                  isGrounded = !!(selectedPratica.uploadedFiles?.udcCondizioni || selectedPratica.uploadedFiles?.udmCondizioni || selectedPratica.uploadedFiles?.udmcondizioni || selectedPratica.uploadedFiles?.udccondizioni);
                                } else if (sect.dep) {
                                  isGrounded = !!selectedPratica.uploadedFiles?.[sect.dep as keyof typeof selectedPratica.uploadedFiles];
                                } else {
                                  isGrounded = true; // No file dependency, always grounded on note / inputs
                                }

                                return (
                                  <button
                                    key={sect.num}
                                    type="button"
                                    onClick={() => setSelectedSectionNum(sect.num)}
                                    className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 select-none ${
                                      isSelected 
                                        ? "bg-teal-50/45 border-teal-300 ring-2 ring-teal-300/20" 
                                        : "bg-white border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-full font-sans font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                      isSelected ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700"
                                    }`}>
                                      {sect.num}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-1.5 font-sans">
                                        <span className={`text-[11px] font-bold leading-tight ${isSelected ? "text-teal-950 font-extrabold" : "text-slate-800"}`}>
                                          {sect.label}
                                        </span>
                                        {isGrounded ? (
                                          <span className="text-[7.5px] uppercase tracking-wider font-mono px-1 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-150 shrink-0">Grounded</span>
                                        ) : (
                                          <span className="text-[7.5px] uppercase tracking-wider font-mono px-1 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-150 shrink-0">Grezzo</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                                        {sect.desc}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* RIGHT SIDE: SELECTED SECTION WORKSPACE (lg:col-span-7) */}
                            <div className="lg:col-span-7 space-y-4">
                              
                              {/* CURRENT SECTION BOX */}
                              <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden text-left flex flex-col">
                                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block tracking-widest leading-none mb-1">CAPITOLO IN USO</span>
                                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight leading-snug">
                                      {sectionsConfig.find(s => s.num === selectedSectionNum)?.name || "Sezione Relazione"}
                                    </h3>
                                  </div>
                                  <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold shrink-0 border border-blue-150">
                                    AI-GROUNDED ACTIVO
                                  </span>
                                </div>

                                <div className="p-5 space-y-4">
                                  {/* Preview & Editor Switch */}
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 block text-left">Contenuto Corrente del Paragrafo:</label>
                                    {individualSectionEditText ? (
                                      <textarea
                                        value={individualSectionEditText}
                                        onChange={(e) => setIndividualSectionEditText(e.target.value)}
                                        placeholder="Caricamento contenuto..."
                                        className="w-full h-[260px] p-4 bg-slate-50/50 border border-slate-200 rounded-xl font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/15 focus:bg-white transition"
                                      />
                                    ) : (
                                      <div className="h-[200px] bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center space-y-1">
                                        <AlertTriangle className="w-5 h-5 text-slate-400" />
                                        <p className="text-[11px] font-semibold text-slate-700 m-0">Questa sezione non è ancora presente nel report</p>
                                        <p className="text-[10px] text-slate-400 m-0">Clicca su 'Rigenera con AI Grounding' a destra per scansionare gli allegati ed estrarre questo capitolo.</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* AI instructions / prompt box */}
                                  <div className="bg-teal-50/15 border border-teal-150 rounded-xl p-4.5 text-left space-y-2">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="w-4 h-4 text-teal-605" />
                                      <span className="text-xs font-bold text-teal-950 uppercase tracking-wide">Orientamento ed Istruzioni AI Personalizzate per questa Sezione</span>
                                    </div>
                                    
                                    <p className="text-[10px] text-slate-550 leading-relaxed font-semibold">
                                      Fornisci all'AI istruzioni e note specifiche desunte dalla pratica o dalle tue preferenze (es. "Rafforza il commento sull'EBITDA e la logistica di Casoria che serve le farmacie retail", "Evidenzia che il DSCR di piano a 1.20 supera i canali di vigilanza"). L'AI integrerà rigidamente queste considerazioni nella stesura.
                                    </p>

                                    <textarea
                                      value={sectionInstructions}
                                      onChange={(e) => setSectionInstructions(e.target.value)}
                                      placeholder="Digita qui le tue note gestore e istruzioni per l'AI specifiche per questa sezione... (es. 'Spiega la dinamica dei giorni crediti clientela e l'affidamento MCC')"
                                      className="w-full h-[72px] mt-2 p-2.5 bg-white border border-teal-200 focus:outline-none focus:border-teal-400 rounded-lg text-xs font-medium placeholder-slate-400"
                                    />
                                  </div>

                                  {/* Actions Bar */}
                                  <div className="flex items-center justify-between gap-3 pt-1.5">
                                    <div className="text-[9.5px] text-slate-400 font-mono">
                                      Ultima stima: <span className="font-bold">{individualSectionEditText ? individualSectionEditText.length : 0} caratteri</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateSection(selectedSectionNum)}
                                        disabled={!individualSectionEditText}
                                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                        Salva Modifiche Locali
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleRegenerateSection(selectedSectionNum)}
                                        disabled={isRegeneratingSection}
                                        className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
                                      >
                                        {isRegeneratingSection ? (
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Brain className="w-3.5 h-3.5" />
                                        )}
                                        {isRegeneratingSection ? "AI Grounding in corso..." : "Rigenera Sezione con AI"}
                                      </button>
                                    </div>
                                  </div>

                                </div>
                              </div>
                              
                              {/* Source/Grounding mapping info */}
                              <div className="bg-slate-100/60 rounded-xl p-4 text-left font-sans text-[11px] text-slate-500 space-y-1">
                                <span className="font-bold text-slate-700 block text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                                  🔍 Grounding Documentale Suggerito per questa sezione:
                                </span>
                                <p className="m-0 leading-relaxed font-semibold">
                                  L'AI ricostruisce questa sezione attingendo prevalentemente al file: <span className="font-mono bg-slate-200/80 px-1.5 py-0.5 rounded text-indigo-700 font-bold">{sectionsConfig.find(s => s.num === selectedSectionNum)?.source || "Note Qualitativo"}</span>.
                                </p>
                                <p className="m-0 font-medium leading-relaxed mt-1 text-slate-450">
                                  Se il file è caricato nel 'Fascicolo Documentale' a sinistra, Gemini estratrà i dati storici effettivi sviscerando e spiegando tutte le dinamiche necessarie con il tipico stile bancario senior.
                                </p>
                              </div>

                            </div>

                          </div>
                          
                        </div>

                      </div>

                    </div>
                  ) : null}

                </div>

            </div>
          ) : (
            /* EMPTY WORKSPACE STATE */
            <div className="flex-1 flex flex-col justify-center items-center py-16 text-center max-w-2xl mx-auto">
              <div className="mb-8 w-full">
                <img src="/LOGO.png" alt="Massimo Malamisura Logo" className="w-full h-48 sm:h-64 object-contain" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Nessuna Pratica Fidi Selezionata</h3>
              <p className="text-base text-slate-500 mb-8 leading-relaxed max-w-lg mx-auto">
                Benvenuto nella piattaforma professionale di analisi creditizia e fidi di Massimo Malamisura. Per iniziare, seleziona una pratica attiva dalla barra laterale o avviane una nuova inserendo l'anagrafica aziendale.
              </p>
              
              <button 
                id="btn_nuova_pratica_vuota"
                onClick={() => setShowCreateModal(true)}
                className="bg-[#1e3a8a] hover:bg-blue-800 text-white py-2.5 px-6 rounded-md font-bold text-sm flex items-center gap-2 transition shadow-md"
              >
                <Plus className="w-4 h-4" />
                Crea Nuova Pratica
              </button>
            </div>
          )}

        </main>

      </div>

      {/* CREATE MODAL DIALOG (Hidden in print) */}
      {showCreateModal && (
        <div id="modal_nuova_pratica" className="no-print fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0f172a] text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base">Inizializza Nuova Pratica</h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreatePratica} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider">Denominazione Azienda (Ragione Sociale)</label>
                <input 
                  id="modal_input_azienda"
                  type="text" 
                  required
                  placeholder="Es. Officine Meccaniche Italiane S.p.A." 
                  value={newAziendaName}
                  onChange={(e) => setNewAziendaName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1e3a8a] block mb-1 uppercase tracking-wider font-mono">Codice o Numero della Pratica (Compila Tu)</label>
                <input 
                  id="modal_input_numero_pratica"
                  type="text" 
                  placeholder="Es. TS-2026-FOOD, CC-2026-DLN, ecc." 
                  value={newNumeroPratica}
                  onChange={(e) => setNewNumeroPratica(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-[#1e3a8a] font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider font-mono">Codice CDG Cliente (Compila Tu)</label>
                <input 
                  id="modal_input_cdg_cliente"
                  type="text" 
                  placeholder="Es. CDG-0918-X, CDG-204-A, ecc." 
                  value={newCdgCliente}
                  onChange={(e) => setNewCdgCliente(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider font-mono">Andamento Conti e Redditività con la Banca (Opzionale)</label>
                <textarea 
                  id="modal_input_andamento_conti"
                  rows={2}
                  placeholder="Inserisci anzianità rapporto, movimentazione, insoluti, rating Gianos, tassi, ecc. per la sezione 11..." 
                  value={newAndamentoContiBanca}
                  onChange={(e) => setNewAndamentoContiBanca(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider font-mono">Descrizione Operazione creditizia</label>
                <textarea 
                  id="modal_input_descrizione"
                  rows={4}
                  required
                  placeholder="Descrivi la richiesta di affidamento fidi..." 
                  value={newDescrizione}
                  onChange={(e) => setNewDescrizione(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded text-xs font-semibold transition"
                >
                  Annulla
                </button>
                <button 
                  id="modal_submit_crea"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-semibold transition shadow"
                >
                  Inizializza Pratica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification HUD */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom border border-slate-200 max-w-sm rounded-xl shadow-lg bg-white p-4.5 flex items-start gap-4" style={{ animationDuration: '250ms' }}>
          <div className={`p-2 rounded-xl shrink-0 ${
            toast.type === "success" 
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
              : toast.type === "error" 
                ? "bg-rose-50 text-rose-600 border border-rose-100" 
                : "bg-blue-50 text-blue-600 border border-blue-100"
          }`}>
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 animate-pulse" />
            ) : toast.type === "error" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide leading-none mb-1">
              {toast.type === "success" ? "Operazione Completata" : toast.type === "error" ? "Si è verificato un errore" : "Avviso di Sistema"}
            </h5>
            <p className="text-xs m-0 text-slate-600 font-medium leading-relaxed">{toast.message}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setToast(null)} 
            className="text-slate-400 hover:text-slate-700 font-bold shrink-0 text-xs px-1 hover:bg-slate-100 rounded cursor-pointer transition select-none"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
