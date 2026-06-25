export interface LineaCredito {
  id: string;
  linea: string;
  importo: number;
  tassoProposto?: number;
  commissioni?: number;
}

export interface FinancialYear {
  year: number;
  fatturato: number;
  ebitda: number;
  rimanenze: number;
  creditiCommerciali: number;
  pfn: number; // Posizione Finanziaria Netta: Negative is net debt, positive is net cash
  dscr?: number | null;
}

export interface ForecastYear {
  year: number;
  ricavi: number;
  ebitda: number;
  ebitdaMargine: number;
  pfnEbitda: number;
  dscrAdjusted?: number | null;
  patrimonioNetto: number;
  equityRatio?: number | null;
  fabbisognoBreve: number;
  giorniMagazzino: number;
  giorniClienti: number;
  scoreLom?: number | null;
}

export interface AlertMessage {
  type: 'CREDITI_COMMERCIALI_GROWTH' | 'RIMANENZE_GROWTH' | 'PFN_DETERIORATION';
  metric: string;
  triggered: boolean;
  message: string;
  severity: 'high' | 'medium' | 'info';
  yearCurrent: number;
  growthRate: number;
}

export interface UploadedFile {
  fileName: string;
  fileType: string;
  dateUploaded: string;
  aiObservation?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  attachments?: {
    fileName: string;
    fileType: string;
    savedName?: string;
  }[];
}

export interface Pratica {
  id: string;
  aziendaName: string;
  settoreAttivita?: string;
  originalFileName?: string;
  docType: 'BILCe' | 'CEBI' | 'LOM'; // For backwards compatibility
  status: 'In Corso' | 'Completata';
  dateCreated: string;
  financialData: FinancialYear[];
  forecastData?: ForecastYear[];
  alerts: AlertMessage[];
  markdownReport: string;
  descrizioneOperazione?: string;
  uploadedFiles?: {
    bilce?: UploadedFile;
    cebi?: UploadedFile;
    lom?: UploadedFile;
    sprintCrif?: UploadedFile;
    relazioneGestione?: UploadedFile;
    businessPlan?: UploadedFile;
    elencoFinanziamenti?: UploadedFile;
    centraleRischi?: UploadedFile;
    udcCondizioni?: UploadedFile;
    udmCondizioni?: UploadedFile;
    udmcondizioni?: UploadedFile;
    udccondizioni?: UploadedFile;
    reportGold?: UploadedFile;
    esgReport?: UploadedFile;
    variEventuali?: UploadedFile | UploadedFile[];
    immaginiAzienda?: UploadedFile | UploadedFile[];
    redditivita?: UploadedFile | UploadedFile[];
  };
  operazioneFinanziariaRichiesta?: LineaCredito[];
  noteLibere?: string;
  numeroPratica?: string;
  cdgCliente?: string;
  andamentoContiBanca?: string;
  crifValutazione?: string;
  crifFascia?: string;
  crifMotivazione?: string;
  crValutazione?: string;
  crFascia?: string;
  crSintesi?: string;
  compagineSociale?: any;
  chatHistory?: ChatMessage[];
  ownerEmail?: string;
  ownerName?: string;
}
