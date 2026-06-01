import { useState, useEffect, useRef } from "react";
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
  Search
} from "lucide-react";
import Markdown from "react-markdown";
import { FinancialYear, ForecastYear, AlertMessage, Pratica } from "./types";

export default function App() {
  // Application states
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [selectedPratica, setSelectedPratica] = useState<Pratica | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [docFilter, setDocFilter] = useState<string>("all");
  
  // Create practice state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAziendaName, setNewAziendaName] = useState("");
  const [newNumeroPratica, setNewNumeroPratica] = useState("");
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
  const [reportGenStage, setReportGenStage] = useState("");
  const [activeTab, setActiveTab] = useState<'visualizza' | 'modifica'>("visualizza");
  const [editedMarkdown, setEditedMarkdown] = useState("");
  const [reportLoadingTimer, setReportLoadingTimer] = useState(0);

  // Edit details states
  const [isEditingAzienda, setIsEditingAzienda] = useState(false);
  const [editedAziendaName, setEditedAziendaName] = useState("");
  const [editedSettore, setEditedSettore] = useState("");
  const [editedDescrizione, setEditedDescrizione] = useState("");
  const [editedNoteLibere, setEditedNoteLibere] = useState("");
  const [editedNumeroPratica, setEditedNumeroPratica] = useState("");
  const [financialTab, setFinancialTab] = useState<'storico' | 'previsionale'>('storico');

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch practice history on load
  const fetchPratiche = async (selectId?: string) => {
    try {
      const res = await fetch("/api/pratiche");
      if (!res.ok) throw new Error("Errore nel recupero della cronologia fidi.");
      const list: Pratica[] = await res.json();
      setPratiche(list);
      
      if (selectId) {
        const found = list.find(p => p.id === selectId);
        if (found) setSelectedPratica(found);
      } else if (list.length > 0 && !selectedPratica) {
        setSelectedPratica(list[0]);
      }
    } catch (err) {
      console.error(err);
      alert("Impossibile contattare il server CorpEx.");
    }
  };

  useEffect(() => {
    fetchPratiche();
  }, []);

  // Update editor value when selected practice changes
  useEffect(() => {
    if (selectedPratica) {
      setEditedMarkdown(selectedPratica.markdownReport || "");
      setEditedAziendaName(selectedPratica.aziendaName);
      setEditedSettore(selectedPratica.settoreAttivita || "Da definire");
      setEditedDescrizione(selectedPratica.descrizioneOperazione || "");
      setEditedNoteLibere(selectedPratica.noteLibere || "");
      setEditedNumeroPratica(selectedPratica.numeroPratica || "");
    }
  }, [selectedPratica]);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aziendaName: newAziendaName,
          docType: newDocType,
          descrizioneOperazione: newDescrizione,
          numeroPratica: newNumeroPratica
        })
      });
      if (!res.ok) throw new Error("Errore di rete");
      const created: Pratica = await res.json();
      
      // Reset values
      setNewAziendaName("");
      setNewNumeroPratica("");
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
      const res = await fetch(`/api/pratiche/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedPratica?.id === id) {
          setSelectedPratica(null);
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

  // Convert File object to Base64 to safely post to Express API with specific slot
  const processUploadedFile = async (file: File, slotName: string) => {
    if (!selectedPratica) return;
    
    const isValidFormat = 
      file.name.endsWith(".pdf") || 
      file.name.endsWith(".xlsx") || 
      file.name.endsWith(".xls") || 
      file.name.endsWith(".doc") || 
      file.name.endsWith(".docx") || 
      file.name.endsWith("txt");
      
    if (!isValidFormat) {
      alert("Formato file non supportato per l'istruttoria CorpEx. Carica un PDF, un file Excel (.xlsx, .xls), un file Word o un file di testo.");
      return;
    }

    setIsProcessingFile(true);
    setUploadProgressMsg(`Caricamento in corso nello slot "${slotName}"...`);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const rawBase64 = (reader.result as string).split(",")[1];
        
        setUploadProgressMsg("Trasmissione cifrata ai server di credito...");
        setTimeout(() => setUploadProgressMsg(`Analisi del documento nello slot "${slotName}"...`), 600);
        
        const res = await fetch(`/api/pratiche/${selectedPratica.id}/upload/${slotName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        
        // Refresh & Select
        await fetchPratiche(updatedPratica.id);
        setIsProcessingFile(false);
      } catch (err: any) {
        console.error(err);
        alert(`Errore nell'estrazione nello slot ${slotName}: ${err.message || err}`);
        setIsProcessingFile(false);
      }
    };
    reader.onerror = () => {
      alert("Errore nella lettura del file.");
      setIsProcessingFile(false);
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, slotName: string) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0], slotName);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeUploadSlot) {
      processUploadedFile(e.target.files[0], activeUploadSlot);
      e.target.value = ""; // reset input
    }
  };

  // Trigger AI Report Synthesis (Commercial Proposal style)
  const handleGenerateReport = async () => {
    if (!selectedPratica) return;
    
    setIsGeneratingReport(true);
    setReportGenStage("Inizializzazione del Brain Analitico Relazioni Corporate...");
    
    // Simulate banking analytical workflows (Commercial style)
    const stages = [
      "Inizializzazione del Brain Analitico Relazioni Corporate...",
      "Lettura e cross-matching del fascicolo documentale multi-slot...",
      "Estrazione degli alert commerciali su capitale circolante...",
      "Integrazione dinamica della relazione degli amministratori...",
      "Pricing assessment e proposte di mitigazione commerciale...",
      "Sintesi della Centrale Rischi e tassi di utilizzo...",
      "Strutturazione dei 12 capitoli della Proposta Commerciale...",
      "Finalizzazione dei temi critici per la visita commerciale...",
      "Generazione della relazione fidi con parere positivo finale..."
    ];

    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      if (stageIdx < stages.length - 1) {
        stageIdx++;
        setReportGenStage(stages[stageIdx]);
      }
    }, 4500);

    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}/generate-report`, {
        method: "POST"
      });
      
      clearInterval(stageInterval);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Errore nella generazione AI.");
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

  // Save manual modifications in the markdown editor
  const handleSaveReportEdits = async () => {
    if (!selectedPratica) return;
    
    try {
      const res = await fetch(`/api/pratiche/${selectedPratica.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aziendaName: editedAziendaName,
          settoreAttivita: editedSettore,
          descrizioneOperazione: editedDescrizione,
          noteLibere: editedNoteLibere,
          numeroPratica: editedNumeroPratica
        })
      });
      if (res.ok) {
        const updated: Pratica = await res.json();
        setPratiche(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelectedPratica(updated);
        setIsEditingAzienda(false);
      }
    } catch (err) {
      console.error(err);
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
    form.action = `/api/pratiche/${selectedPratica.id}/export/word`;
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  // Premium Invisible Print Layout Trigger
  const handlePrintPDF = async () => {
    if (!selectedPratica) return;
    try {
      const response = await fetch(`/api/pratiche/${selectedPratica.id}/print`);
      if (!response.ok) throw new Error("Errore nel recupero del template");
      const htmlText = await response.text();
      
      const oldIframe = document.getElementById('ex-print-iframe');
      if (oldIframe) {
        oldIframe.parentNode?.removeChild(oldIframe);
      }
      
      const iframe = document.createElement('iframe');
      iframe.id = 'ex-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlText);
        doc.close();
      }
      
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.error("Errore nel trigger di stampa iframe:", printErr);
          window.open(`/api/pratiche/${selectedPratica.id}/print`, '_blank');
        }
      }, 500);
    } catch (error) {
      console.error("Errore durante la preparazione alla stampa:", error);
      window.open(`/api/pratiche/${selectedPratica.id}/print`, '_blank');
    }
  };

  // Filters for Practice Table
  const filteredPratiche = pratiche.filter(p => {
    const matchesSearch = p.aziendaName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.settoreAttivita?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : p.status === statusFilter;
    const matchesDoc = docFilter === "all" ? true : p.docType === docFilter;
    return matchesSearch && matchesStatus && matchesDoc;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased flex flex-col">
      
      {/* HEADERBAR (Hidden during print) */}
      <header className="no-print bg-[#0f172a] text-white py-4 px-6 shadow-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563eb] text-white p-2 rounded-lg font-bold flex items-center justify-center shadow-inner">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">CorpEx</span>
            <span className="text-xs text-slate-400 block font-mono">Platform B2B fidi & analisi corporate</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-sm font-mono text-slate-300 border-l border-slate-700 pl-4">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Network Ingress</span>
              <span className="text-emerald-400 font-medium">● Online / Secure Cloud</span>
            </div>
          </div>
          
          <button 
            id="btn_nuova_pratica_header"
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition duration-150 shadow"
          >
            <Plus className="w-4 h-4" />
            Nuova Pratica fidi
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* SIDEBAR: DASHBOARD LIST (Hidden during print) */}
        <aside className="no-print w-full lg:w-96 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0">
          
          {/* SEARCH & FILTER AREA */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col gap-3">
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
          </div>

          {/* LIST OF CREDIT CASES ("PRATICHE") */}
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
        </aside>

        {/* WORKSPACE AREA (MAIN CONTENT) */}
        <main className="flex-1 bg-[#f8fafc] flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
          
          {selectedPratica ? (
            <div className="space-y-6">
              
              {/* BRAND PRATICA HERO ROW (Hidden during print) */}
              <div className="no-print bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#1e3a8a]"></div>
                
                <div className="flex-1">
                  {isEditingAzienda ? (
                    <div className="w-full space-y-4 max-w-4xl bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Modifica Parametri Pratica Fidi</div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            setIsEditingAzienda(true);
                          }}
                          className="text-slate-400 hover:text-[#2563eb] p-1 rounded hover:bg-slate-50 transition"
                          title="Modifica parametri anagrafica e note"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                        <span className={`flex items-center gap-1 font-mono px-2 py-0.5 rounded text-xs font-bold uppercase transition ${
                          selectedPratica.numeroPratica 
                            ? "text-[#1e3a8a] bg-blue-50 border border-blue-200" 
                            : "text-amber-800 bg-amber-50 border border-amber-200 animate-pulse"
                        }`}>
                          CODICE PRATICA fidi: {selectedPratica.numeroPratica || "DA INSERIRE (Clicca a destra ✎)"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-[10px]" title="ID di tracciamento interno database">
                          REGISTRO INTERNO: {selectedPratica.id}
                        </span>
                        <span>•</span>
                        <span>Tipo: <strong>{selectedPratica.docType}</strong></span>
                        <span>•</span>
                        <span>Settore: <strong>{selectedPratica.settoreAttivita || "Non Specificato"}</strong></span>
                      </div>

                      {/* Operation Credit desc */}
                      <div className="mt-4 bg-[#f8fafc] rounded-lg border border-slate-100 p-3 max-w-4xl text-xs text-slate-600 shadow-sm">
                        <span className="font-bold text-slate-400 block mb-1 uppercase tracking-wider text-[9px]">Operazione Finanziaria Richiesta</span>
                        <p className="leading-snug">{selectedPratica.descrizioneOperazione || "Nessuna descrizione specificata."}</p>
                      </div>

                      {/* Gestor Free Text Notes */}
                      <div className="mt-3 bg-blue-50/45 rounded-lg border border-blue-100/50 p-3 max-w-4xl text-xs text-slate-700 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#1e3a8a] block uppercase tracking-wider text-[9px]">📝 Note Addizionali del Gestore Corporate (Note Libere)</span>
                          <span className="text-[9px] text-[#2563eb] font-mono tracking-widest font-bold">AI GROUNDED</span>
                        </div>
                        <p className="leading-snug whitespace-pre-line text-slate-600">
                          {selectedPratica.noteLibere ? selectedPratica.noteLibere : (
                            <span className="text-slate-400 italic">Nessuna nota aggiuntiva fornita dal gestore. Clicca sul pulsante della matita in alto a sinistra per inserire chiarimenti qualitativi utili per l'analisi.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 shrink-0 self-end md:self-center">
                  <button 
                    onClick={handleExportWord}
                    disabled={!selectedPratica.markdownReport}
                    className="bg-[#1e3a8b] hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <Download className="w-4 h-4" />
                    Word (.doc)
                  </button>
                  
                  <button 
                    onClick={handlePrintPDF}
                    disabled={!selectedPratica.markdownReport}
                    className={`bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-xs flex items-center gap-1.5 transition shadow select-none ${!selectedPratica.markdownReport ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                    <Printer className="w-4 h-4" />
                    Stampa Report / PDF
                  </button>
                </div>
              </div>

              {/* TWO COLUMN GRID: LEFT STORAGE/PARSING/ALERTS, RIGHT THE AI REPORT */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* COLUMN LEFT (5 cols xl): DOCUMENTS & ALERTS & FINANCIALS (Hidden in Print) */}
                <div className="no-print space-y-6 xl:col-span-5">
                             {/* DOCUMENT UPLOAD ZONE (MULTI-SLOT) */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4 gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-[#2563eb]" />
                        <h3 className="font-bold text-slate-800 text-sm">Fascicolo Documentale CorpEx</h3>
                      </div>
                      
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-105 text-slate-600">
                        {Object.keys(selectedPratica.uploadedFiles || {}).length} / 8 SLOT COPERTI
                      </span>
                    </div>

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.txt" 
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
                        { id: "variEventuali", label: "Vari ed Eventuali", desc: "Ulteriori visure, contratti, o garanzie a corredo" }
                      ].map((slot) => {
                        const fileMeta = selectedPratica.uploadedFiles?.[slot.id as keyof typeof selectedPratica.uploadedFiles];
                        const isUploaded = !!fileMeta;
                        
                        return (
                          <div 
                            key={slot.id}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, slot.id)}
                            className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                              isUploaded 
                                ? "bg-emerald-50/20 border-emerald-100 hover:bg-emerald-50/30" 
                                : "bg-slate-50/40 border-slate-200/70 hover:border-blue-450 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isUploaded ? "bg-emerald-550" : "bg-slate-300"}`}></span>
                                <h4 className="text-xs font-bold text-slate-800 truncate">{slot.label}</h4>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{slot.desc}</p>
                              
                              {isUploaded && fileMeta && (
                                <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-emerald-700 bg-emerald-50/60 leading-none py-1 px-1.5 rounded w-fit max-w-full">
                                  <FileText className="w-3 h-3 text-emerald-650 shrink-0" />
                                  <span className="truncate" title={fileMeta.fileName}>{fileMeta.fileName}</span>
                                </div>
                              )}
                            </div>

                            <div className="shrink-0">
                              {isUploaded ? (
                                <button 
                                  onClick={() => triggerUploadForSlot(slot.id)}
                                  className="text-[10px] font-mono font-bold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 bg-white px-2 py-1 rounded shadow-sm transition"
                                >
                                  Sostituisci
                                </button>
                              ) : (
                                <button 
                                  onClick={() => triggerUploadForSlot(slot.id)}
                                  className="text-[10px] font-mono font-bold text-slate-550 hover:text-blue-600 border border-slate-200 bg-white px-2 py-1 rounded shadow-sm transition"
                                >
                                  Carica
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                        selectedPratica.alerts.map((alert, i) => {
                          const isTriggered = alert.triggered;
                          
                          return (
                            <div 
                              key={i}
                              className={`p-3 rounded-lg border flex items-start gap-3 transition-all ${
                                isTriggered 
                                  ? "bg-rose-50/50 border-rose-200/60" 
                                  : "bg-slate-50/50 border-slate-100"
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {isTriggered ? (
                                  <span className="flex p-1 bg-red-100 text-red-700 rounded-full">
                                    <AlertTriangle className="w-4 h-4" />
                                  </span>
                                ) : (
                                  <span className="flex p-1 bg-slate-100 text-slate-400 rounded-full">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center gap-1 mb-0.5">
                                  <span className="text-xs font-bold text-slate-800">{alert.metric}</span>
                                  <span className={`text-[10px] font-mono font-bold px-1 py-0.2 rounded ${
                                    isTriggered ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-400"
                                  }`}>
                                    {isTriggered ? `+${(alert.growthRate * 100).toFixed(1)}%` : `${(alert.growthRate * 100).toFixed(1)}%`}
                                  </span>
                                </div>
                                <p className={`text-[11px] leading-relaxed ${isTriggered ? "text-red-950 font-medium" : "text-slate-500"}`}>
                                  {alert.message}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

                {/* COLUMN RIGHT (7 cols xl): THE DETAILED REPORT EDITOR AND RENDER (Full-width in Print) */}
                <div className="xl:col-span-7 flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden print-report-container">
                  
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
                            <p className="mt-1 font-sans text-slate-400">Le relazioni evolute di CorpEx seguono 12 capitoli regolamentati. Questa operazione richiede tipicamente 15-20 secondi per la formattazione dei dati storici.</p>
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
                              Il sistema utilizzerà i dati consolidati e gli alert per formulare una relazione commerciale completa ed evoluta divisa tassativamente nei 12 capitoli istruttori fidi italiani.
                            </p>
                          </div>

                          <button 
                            id="btn_genera_relazione"
                            onClick={handleGenerateReport}
                            disabled={selectedPratica.financialData.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-full py-3 px-6 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition shadow-md"
                          >
                            <Brain className="w-4 h-4" />
                            Genera Relazione Evoluta con AI
                          </button>
                          
                          {selectedPratica.financialData.length === 0 && (
                            <p className="text-[10px] text-red-500 font-medium">
                              ⚠️ Carica prima un documento di bilancio per estrarne i dati finanziari necessari.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {selectedPratica.markdownReport ? (
                    <div className="flex-1 flex flex-col">
                      
                      {/* HEADER: EDITOR/PREVIEW TAB SELECTOR (Hidden in Print) */}
                      <div className="no-print bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                        
                        <div className="flex bg-slate-200/75 p-1 rounded-lg gap-1">
                          <button 
                            id="tab_visualizza"
                            onClick={() => setActiveTab("visualizza")}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${activeTab === "visualizza" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            Anteprima Relazione (12 Capitoli)
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
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            CONSOLIDATA
                          </span>

                          <button 
                            id="btn_rigenera_ai"
                            onClick={handleGenerateReport}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2 py-1 rounded text-xs flex items-center gap-1 font-semibold transition"
                            title="Rigenera con AI"
                          >
                            <RefreshCw className="w-3 h-3 text-slate-500" />
                            Rigenera AI
                          </button>
                        </div>
                      </div>

                      {/* ACTIVE SCREEN WORKSPACE */}
                      <div className="flex-1 min-h-[500px]">
                        
                        {/* TAB 1: VISUALIZZA / FORMATTED MARKDOWN (Default View) */}
                        <div className={`p-6 sm:p-8 markdown-body prose prose-slate max-w-none prose-sm overflow-y-auto ${activeTab === "visualizza" ? "block" : "hidden print:block"}`}>
                          
                          {/* Running print header repeating on every page */}
                          <div className="hidden print:flex fixed top-[-1.5cm] left-0 right-0 border-b border-slate-200 pb-1.5 text-slate-400 text-[9px] font-mono justify-between">
                            <span>RELAZIONE COMMERCIALE EVOLUTA ED ISTRUTTORIA FIDI</span>
                            <span>PRATICA FIDI N: {selectedPratica.numeroPratica || "N.D. (" + selectedPratica.id + ")"}</span>
                          </div>

                          {/* Running print footer repeating on every page */}
                          <div className="hidden print:flex fixed bottom-[-1.5cm] left-0 right-0 border-t border-slate-200 pt-1.5 text-slate-400 text-[9px] font-mono justify-between">
                            <span>Impresa: {selectedPratica.aziendaName}</span>
                            <span>Banca Corporate Crediti d&apos;Impresa</span>
                          </div>

                          {/* Formal header for professional credit printouts (Only visible on the first page when printing) */}
                          <div className="hidden print:block border-b-2 border-[#1e3a8a] pb-4 mb-6 pt-4">
                            <div className="flex justify-between items-end">
                              <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-[#1e3a8a] m-0">CorpEx</h1>
                                <p className="text-[8px] font-mono text-slate-500 m-0 uppercase tracking-widest">Piattaforma per la Gestione e l&apos;Analisi di Pratiche di Credito Corporate</p>
                              </div>
                              <div className="text-right font-mono text-slate-500 text-[10px] leading-tight">
                                {selectedPratica.numeroPratica && (
                                  <div className="text-[#1e3a8a] font-bold text-xs mb-1">NUMERO PRATICA: {selectedPratica.numeroPratica}</div>
                                )}
                                <div>Dettaglio Pratica: <span className="font-semibold text-slate-700">{selectedPratica.id}</span></div>
                                <div>Data Generazione: <span className="font-semibold text-slate-700">{new Date(selectedPratica.dateCreated).toLocaleDateString("it-IT")}</span></div>
                              </div>
                            </div>
                          </div>

                          <Markdown>{selectedPratica.markdownReport}</Markdown>
                          
                          {/* Signature layout for professional printing */}
                          <div className="hidden print:block mt-12 grid grid-cols-2 gap-12 pt-6 border-t border-slate-100 text-xs font-mono">
                            <div>
                              <span className="block text-slate-400 text-[10px] uppercase">Il Redattore (Senior Credit Specialist)</span>
                              <div className="h-16 border-b border-dashed border-slate-300"></div>
                            </div>
                            <div className="text-right">
                              <span className="block text-slate-400 text-[10px] uppercase">Firma del Deliberante (Responsabile Crediti)</span>
                              <div className="h-16 border-b border-dashed border-slate-300 col-span-1"></div>
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

                      </div>

                    </div>
                  ) : null}

                </div>

              </div>

            </div>
          ) : (
            /* EMPTY WORKSPACE STATE */
            <div className="flex-1 flex flex-col justify-center items-center py-16 text-center max-w-md mx-auto">
              <div className="bg-slate-100 p-4 rounded-full text-slate-400 mb-4 shadow-sm border border-slate-200/50">
                <Building2 className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Nessuna Pratica Selezionata</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Benvenuto in CorpEx. Per iniziare ad analizzare crediti ed alerts finanziari, seleziona una pratica attiva dalla barra laterale o avviane una nuova inserendo l&apos;anagrafica aziendale.
              </p>
              
              <button 
                id="btn_nuova_pratica_vuota"
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 rounded-md font-semibold text-sm flex items-center gap-2 transition shadow"
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
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider">Tipologia Documentazione d&apos;origine</label>
                <select 
                  id="modal_select_doctype"
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                >
                  <option value="BILCe">BILCe (Bilancio ricondotto e schemi standard)</option>
                  <option value="CEBI">CEBI (Centrale di Bilancio)</option>
                  <option value="LOM">LOM (Loan Origination Monitoring standard)</option>
                </select>
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

    </div>
  );
}
