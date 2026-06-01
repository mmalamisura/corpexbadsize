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
    relazioneGestione?: UploadedFile;
    businessPlan?: UploadedFile;
    elencoFinanziamenti?: UploadedFile;
    centraleRischi?: UploadedFile;
    variEventuali?: UploadedFile;
  };
  noteLibere?: string;
  numeroPratica?: string;
}
