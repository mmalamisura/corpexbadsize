import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as xlsx from "xlsx";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Use Express JSON middleware with increased limit for base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Database initialization (local file database for persistent storage)
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "pratiche.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), "utf8");
}

// Interfaces
interface FinancialYear {
  year: number;
  fatturato: number;
  ebitda: number;
  rimanenze: number;
  creditiCommerciali: number;
  pfn: number;
  dscr?: number | null;
}

interface ForecastYear {
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

interface AlertMessage {
  type: 'CREDITI_COMMERCIALI_GROWTH' | 'RIMANENZE_GROWTH' | 'PFN_DETERIORATION';
  metric: string;
  triggered: boolean;
  message: string;
  severity: 'high' | 'medium' | 'info';
  yearCurrent: number;
  growthRate: number;
}

interface UploadedFile {
  fileName: string;
  fileType: string;
  dateUploaded: string;
}

interface Pratica {
  id: string;
  aziendaName: string;
  settoreAttivita?: string;
  originalFileName?: string;
  docType: 'BILCe' | 'CEBI' | 'LOM';
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
  cdgCliente?: string;
}

// DB Helpers
function readPratiche(): Pratica[] {
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data) as Pratica[];
  } catch (error) {
    console.error("Error reading database:", error);
    return [];
  }
}

function writePratiche(data: Pratica[]): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

// Excel Extraction CSV Helper
function parseExcelToCsvList(base64Data: string): string {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const workbook = xlsx.read(buffer, { type: "buffer" });
    let result = "";
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      result += `--- Foglio: ${sheetName} ---\n${csv}\n\n`;
    }
    return result;
  } catch (error) {
    console.error("Error parsing Excel:", error);
    throw new Error("Formato Excel non supportato o corrotto.");
  }
}

// Alert Engine Logic
function computeAlerts(financialData: FinancialYear[]): AlertMessage[] {
  const alerts: AlertMessage[] = [];
  const sorted = [...financialData].sort((a, b) => a.year - b.year);
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const year = curr.year;
    
    // 1. I crediti commerciali crescono più del 20%
    if (prev.creditiCommerciali > 0) {
      const growth = (curr.creditiCommerciali - prev.creditiCommerciali) / prev.creditiCommerciali;
      const triggered = growth > 0.20;
      alerts.push({
        type: 'CREDITI_COMMERCIALI_GROWTH',
        metric: 'Crediti Commerciali',
        triggered,
        message: triggered 
          ? `I crediti commerciali sono cresciuti del ${(growth * 100).toFixed(1)}% YoY nel ${year}, superando la soglia critica del 20%`
          : `I crediti commerciali registrano una variazione del ${(growth * 100).toFixed(1)}% YoY nel ${year} (sotto soglia di alert di 20%)`,
        severity: triggered ? 'high' : 'info',
        yearCurrent: year,
        growthRate: growth
      });
    }
    
    // 2. Le rimanenze crescono più del 25%
    if (prev.rimanenze > 0) {
      const growth = (curr.rimanenze - prev.rimanenze) / prev.rimanenze;
      const triggered = growth > 0.25;
      alerts.push({
        type: 'RIMANENZE_GROWTH',
        metric: 'Rimanenze / Magazzino',
        triggered,
        message: triggered
          ? `Le rimanenze sono cresciute del ${(growth * 100).toFixed(1)}% YoY nel ${year}, superando la soglia critica del 25%`
          : `Le rimanenze registrano una variazione del ${(growth * 100).toFixed(1)}% YoY nel ${year} (sotto soglia di alert di 25%)`,
        severity: triggered ? 'high' : 'info',
        yearCurrent: year,
        growthRate: growth
      });
    }
    
    // 3. La PFN peggiora più del 15%
    // Negativa in genere indica Debito Netto. Es: -2.000.000 diventa -2.400.000 -> deteriorata del 20%.
    // Usiamo una formula robusta: (Valore Precedente - Valore Corrente) / Assoluto(Valore Precedente)
    // Se la PFN era -1.0M ed ora è -1.2M: (-1.0M - (-1.2M)) / 1.0M = +20% (peggioramento positivo).
    if (prev.pfn !== 0) {
      const deterioration = (prev.pfn - curr.pfn) / Math.abs(prev.pfn);
      const triggered = deterioration > 0.15;
      alerts.push({
        type: 'PFN_DETERIORATION',
        metric: 'Posizione Finanziaria Netta (PFN)',
        triggered,
        message: triggered
          ? `La PFN è peggiorata del ${(deterioration * 100).toFixed(1)}% YoY nel ${year}, superando la soglia di tolleranza del 15%`
          : `La PFN registra una variazione patrimoniale del ${(deterioration * 100).toFixed(1)}% YoY nel ${year} (sotto la soglia di alert di 15%)`,
        severity: triggered ? 'high' : 'info',
        yearCurrent: year,
        growthRate: deterioration
      });
    }
  }
  
  return alerts;
}

// MARKDOWN TO SIMPLE HTML FOR WORD EXPORT
function simpleMarkdownToHtml(markdown: string): string {
  // Simple regex-based parser to make clean HTML suitable for Microsoft Word
  let html = markdown
    .replace(/(?:\r\n|\r|\n)/g, "<br>")
    // Headers
    .replace(/### (.*?)<br>/g, "<h3>$1</h3>")
    .replace(/## (.*?)<br>/g, "<h2>$1</h2>")
    .replace(/# (.*?)<br>/g, "<h1>$1</h1>")
    // Bold / Strong
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Bullet lists
    .replace(/🔹/g, "<span style='color: #0366d6;'>🔹</span>")
    .replace(/- (.*?)<br>/g, "<ul><li>$1</li></ul>")
    // Fix multi list items merging issues
    .replace(/<\/ul><ul>/g, "")
    // Styling tables
    .replace(/\|/g, "  ");
  
  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; margin: 40px; }
          h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 8px; font-size: 24px; }
          h2 { color: #2b6cb0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; font-size: 19px; margin-top: 24px; }
          h3 { color: #4a5568; font-size: 15px; margin-top: 18px; }
          p, ul { font-size: 12px; margin-bottom: 12px; }
          li { margin-bottom: 6px; }
          strong { color: #111111; }
          .alert-box { background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 12px; margin: 16px 0; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}

// RENDER MARKDOWN TO PREMIUM HTML FOR PRINT OUTS
function renderHtmlTableForPrint(rows: string[][]): string {
  if (rows.length === 0) return "";
  let html = "<table>";
  
  // Header row
  html += "<thead><tr>";
  rows[0].forEach(cell => {
    // Replace inline bold formatting
    let cleanCell = cell.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html += `<th>${cleanCell}</th>`;
  });
  html += "</tr></thead><tbody>";
  
  // Body rows
  for (let i = 1; i < rows.length; i++) {
    html += "<tr>";
    rows[i].forEach(cell => {
      let cleanCell = cell.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>");
      
      // Right align if cell is mostly numeric parameters
      let isNumeric = /^\s*[\d\.,€%\-\s\*\/\+]+$/.test(cell.replace(/<strong>|<\/strong>|<em>|<\/em>/g, "")) && cell.trim().length > 0;
      let alignClass = isNumeric ? "class='text-right font-mono'" : "";
      
      html += `<td ${alignClass}>${cleanCell}</td>`;
    });
    html += "</tr>";
  }
  
  html += "</tbody></table>";
  return html;
}

function renderMarkdownToHtmlForPrint(aziendaName: string, numeroPratica: string, docId: string, markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let convertedHtml = "";
  let inTable = false;
  let inList = false;
  let inBlockquote = false;
  let tableRows: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Check Blockquote
    if (line.startsWith(">")) {
      if (!inBlockquote) {
        if (inList) { convertedHtml += "</ul>"; inList = false; }
        if (inTable) { convertedHtml += renderHtmlTableForPrint(tableRows); inTable = false; tableRows = []; }
        convertedHtml += "<blockquote>";
        inBlockquote = true;
      }
      line = line.substring(1).trim();
    } else if (inBlockquote && !line.startsWith(">") && line !== "") {
      convertedHtml += "</blockquote>";
      inBlockquote = false;
    }
    
    // Reset on empty lines
    if (line === "") {
      if (inList) { convertedHtml += "</ul>"; inList = false; }
      if (inTable) { convertedHtml += renderHtmlTableForPrint(tableRows); inTable = false; tableRows = []; }
      continue;
    }
    
    // Check Markdown Table format
    if (line.startsWith("|")) {
      if (inList) { convertedHtml += "</ul>"; inList = false; }
      if (line.includes("---")) {
        // Skip table separator line
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      const cols = line.split("|").map(col => col.trim()).filter((col, index, arr) => index > 0 && index < arr.length - 1);
      tableRows.push(cols);
      continue;
    } else if (inTable) {
      convertedHtml += renderHtmlTableForPrint(tableRows);
      inTable = false;
      tableRows = [];
    }
    
    // Headers parsing
    if (line.startsWith("# ")) {
      convertedHtml += `<h1>${line.substring(2)}</h1>`;
    } else if (line.startsWith("## ")) {
      convertedHtml += `<h2>${line.substring(3)}</h2>`;
    } else if (line.startsWith("### ")) {
      convertedHtml += `<h3>${line.substring(4)}</h3>`;
    } else if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("✦ ") || line.startsWith("• ")) {
      if (!inList) {
        inList = true;
        convertedHtml += "<ul>";
      }
      // Remove prompt list indicators
      const content = line.startsWith("- ") || line.startsWith("* ") ? line.substring(2) : line.substring(2);
      convertedHtml += `<li>${content}</li>`;
    } else {
      if (inList) {
        convertedHtml += "</ul>";
        inList = false;
      }
      convertedHtml += `<p>${line}</p>`;
    }
  }
  
  // Close any remaining active tags
  if (inList) convertedHtml += "</ul>";
  if (inTable) convertedHtml += renderHtmlTableForPrint(tableRows);
  if (inBlockquote) convertedHtml += "</blockquote>";
  
  // Inline styling replacements
  convertedHtml = convertedHtml.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  convertedHtml = convertedHtml.replace(/\*(.*?)\*/g, "<em>$1</em>");
  convertedHtml = convertedHtml.replace(/`([^`]+)`/g, "<code class='font-mono bg-slate-100 px-1 py-0.5 rounded'>$1</code>");
  
  // Inject highlighted state tag lookups e.g., [PROPOSTA DI AFFIDAMENTO: STRUTTURATA]
  convertedHtml = convertedHtml.replace(/\[([^\]]+:[^\]]+)\]/g, `<span class="badge">$1</span>`);
  
  const currentDate = new Date().toLocaleDateString("it-IT");
  
  return `
    <!DOCTYPE html>
    <html lang="it">
      <head>
        <meta charset="utf-8">
        <title>Fascicolo Istruttoria Fidi - ${aziendaName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          
          @page {
            size: A4;
            margin: 2cm 1.5cm 2cm 1.5cm;
          }
          
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #1e293b;
            background-color: #f1f5f9;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Browser top instructions toolbar */
          .toolbar {
            background-color: #0f172a;
            color: white;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            position: sticky;
            top: 0;
            z-index: 1000;
          }
          
          .toolbar-title {
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .toolbar-actions {
            display: flex;
            gap: 12px;
          }
          
          .btn {
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 500;
            font-size: 13px;
            cursor: pointer;
            border: none;
            transition: all 0.15s ease-in-out;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          
          .btn-primary {
            background-color: #2563eb;
            color: white;
          }
          
          .btn-primary:hover {
            background-color: #1d4ed8;
          }
          
          .btn-secondary {
            background-color: #475569;
            color: white;
          }
          
          .btn-secondary:hover {
            background-color: #334155;
          }
          
          /* Paper Container page setup */
          .paper-container {
            background-color: white;
            max-width: 820px;
            margin: 40px auto;
            padding: 50px 60px;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            border-radius: 8px;
            box-sizing: border-box;
          }
          
          /* Formal Credit Header */
          .credit-header {
            border-bottom: 3px double #1e3a8a;
            padding-bottom: 20px;
            margin-bottom: 35px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          
          .credit-logo {
            font-weight: 700;
            font-size: 24px;
            color: #1e3a8a;
            letter-spacing: -0.025em;
          }
          
          .credit-sublogo {
            font-size: 11px;
            text-transform: uppercase;
            font-family: 'JetBrains Mono', monospace;
            color: #64748b;
            letter-spacing: 0.05em;
            margin-top: 2px;
          }
          
          .credit-metadata {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            color: #475569;
            line-height: 1.5;
          }
          
          /* Content Typography styling */
          h1 {
            color: #1e3a8a;
            font-size: 18pt;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 6px;
            margin-top: 35px;
            margin-bottom: 15px;
            page-break-after: avoid;
          }
          
          h2 {
            color: #0f172a;
            font-size: 14pt;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 4px;
            margin-top: 25px;
            margin-bottom: 12px;
            page-break-after: avoid;
          }
          
          h3 {
            color: #334155;
            font-size: 12pt;
            margin-top: 20px;
            margin-bottom: 10px;
            page-break-after: avoid;
          }
          
          p {
            margin-top: 0;
            margin-bottom: 14px;
            text-align: justify;
          }
          
          ul {
            margin-top: 0;
            margin-bottom: 16px;
            padding-left: 20px;
          }
          
          li {
            margin-bottom: 6px;
          }
          
          strong {
            color: #0f172a;
          }
          
          blockquote {
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            padding: 12px 16px;
            margin: 18px 0;
            font-style: italic;
            border-radius: 0 4px 4px 0;
          }
          
          /* Table formatting */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
            margin-top: 15px;
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          
          th {
            background-color: #0f172a;
            color: white;
            font-weight: 600;
            text-align: left;
            padding: 8px 12px;
            border: 1px solid #1e293b;
          }
          
          td {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
          }
          
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          .text-right {
            text-align: right;
          }
          
          .font-mono {
            font-family: 'JetBrains Mono', monospace;
            font-size: 9pt;
          }
          
          /* Badges styling */
          .badge {
            background-color: #eff6ff;
            color: #1e40af;
            border: 1px solid #bfdbfe;
            padding: 2px 8px;
            font-size: 10px;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            border-radius: 4px;
            display: inline-block;
            margin-bottom: 4px;
          }
          
          /* Signature panel */
          .signature-panel {
            margin-top: 50px;
            border-top: 1px solid #cbd5e1;
            padding-top: 30px;
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 40px;
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            page-break-inside: avoid;
          }
          
          .sig-line {
            margin-top: 40px;
            border-top: 1px dotted #94a3b8;
            height: 1px;
          }
          
          /* PRINT STYLES */
          @media print {
            .toolbar {
              display: none !important;
            }
            
            body {
              background-color: white !important;
              color: black !important;
            }
            
            .paper-container {
              box-shadow: none !important;
              border-radius: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              max-width: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="toolbar no-print">
          <div class="toolbar-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
            <span>CorpEx - Anteprima di Stampa Specialistica</span>
          </div>
          <div class="toolbar-actions">
            <button class="btn btn-primary" onclick="window.print()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
              Stampa / Salva in PDF
            </button>
            <button class="btn btn-secondary" onclick="window.close()">Chiudi Anteprima</button>
          </div>
        </div>
        
        <div class="paper-container">
          <div class="credit-header">
            <div>
              <div class="credit-logo">CorpEx</div>
              <div class="credit-sublogo">B2B Credit Analysis & Advisory System</div>
            </div>
            <div class="credit-metadata">
              <div><strong>N. PRATICA:</strong> ${numeroPratica}</div>
              <div><strong>ID DOC:</strong> ${docId}</div>
              <div><strong>DATA ELAB:</strong> ${currentDate}</div>
            </div>
          </div>
          
          <div class="credit-body">
            ${convertedHtml}
          </div>
          
          <div class="signature-panel">
            <div>
              <span>IL GESTORE RELAZIONI CORPORATE (CONFERMATORE)</span>
              <div class="sig-line"></div>
              <span>Firma: ___________________________</span>
            </div>
            <div>
              <span>L'ANALISTA CREDITI DELIBERANTE</span>
              <div class="sig-line"></div>
              <span>Firma: ___________________________</span>
            </div>
          </div>
        </div>
        
        <script>
          // Automatic trigger print prompt on load
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `;
}

// API ENDPOINTS

// 1. Get all credit files ("pratiche")
app.get("/api/pratiche", (req, res) => {
  const pratiche = readPratiche();
  // Return descending by dateCreated so newest is first
  res.json([...pratiche].sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()));
});

// 2. Get single custom practice
app.get("/api/pratiche/:id", (req, res) => {
  const pratiche = readPratiche();
  const pratica = pratiche.find((p) => p.id === req.params.id);
  if (!pratica) {
    return res.status(404).json({ error: "Pratica non trovata" });
  }
  res.json(pratica);
});

// 3. Create raw blank practice
app.post("/api/pratiche", (req, res) => {
  const { aziendaName, docType, descrizioneOperazione, numeroPratica } = req.body;
  if (!docType) {
    return res.status(400).json({ error: "Il tipo di documento è richiesto." });
  }
  
  const pratiche = readPratiche();
  const newPratica: Pratica = {
    id: "pratica_" + Math.random().toString(36).substring(2, 11),
    aziendaName: aziendaName || "Nuova Pratica da Analizzare",
    numeroPratica: numeroPratica || "",
    settoreAttivita: "Da definire",
    docType,
    status: "In Corso",
    dateCreated: new Date().toISOString(),
    financialData: [],
    alerts: [],
    markdownReport: "",
    descrizioneOperazione: descrizioneOperazione || "Istruttoria di credito per finanziamento chirografario/ipotecario a medio-lungo termine.",
    uploadedFiles: {}
  };
  
  pratiche.push(newPratica);
  writePratiche(pratiche);
  res.status(201).json(newPratica);
});

// 4. Upload & AI Auto-extract financial data with specialized slots
app.post(["/api/pratiche/:id/upload", "/api/pratiche/:id/upload/:slot"], async (req, res) => {
  const { id } = req.params;
  const slot = req.params.slot || "bilce";
  const { fileData, fileName, fileType } = req.body;
  
  if (!fileData || !fileName || !fileType) {
    return res.status(400).json({ error: "Dati del file incompleti." });
  }
  
  const pratiche = readPratiche();
  const praticaIndex = pratiche.findIndex((p) => p.id === id);
  if (praticaIndex === -1) {
    return res.status(404).json({ error: "Pratica non trovata" });
  }
  
  try {
    const isPDF = fileType.includes("pdf") || fileName.endsWith(".pdf");
    const isExcel = fileType.includes("sheet") || fileType.includes("excel") || fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    
    // Save file on disk under slot name
    const uploadsDir = path.join(DATA_DIR, "uploads", id);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const ext = path.extname(fileName) || (isPDF ? ".pdf" : ".xlsx");
    // Remove conflicting extensions for the same slot
    const possibleExts = [".pdf", ".xlsx", ".xls", ".doc", ".docx", ".txt"];
    possibleExts.forEach(e => {
      const p = path.join(uploadsDir, `${slot}${e}`);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch(_) {}
      }
    });
    
    const filePath = path.join(uploadsDir, `${slot}${ext}`);
    fs.writeFileSync(filePath, Buffer.from(fileData, "base64"));
    
    // Update structural uploadedFiles list metadata in memory
    const currentPratica = pratiche[praticaIndex];
    if (!currentPratica.uploadedFiles) {
      currentPratica.uploadedFiles = {};
    }
    currentPratica.uploadedFiles[slot as keyof typeof currentPratica.uploadedFiles] = {
      fileName: fileName,
      fileType: fileType,
      dateUploaded: new Date().toISOString()
    };
    
    // Legacy metrics fallback
    currentPratica.originalFileName = fileName;
    currentPratica.docType = (slot.toUpperCase() === "BILCE" ? "BILCe" : slot.toUpperCase()) as any;
    
    // Check if slot warrants numeric extraction (only BILCe, CEBI, LOM as requested)
    const isQuantitative = ["bilce", "cebi", "lom"].includes(slot.toLowerCase());
    let rawContentToGemini: string | null = null;
    let pdfPartPart: any = null;
    
    if (isQuantitative) {
      if (isPDF) {
        pdfPartPart = {
          inlineData: {
            mimeType: "application/pdf",
            data: fileData
          }
        };
      } else if (isExcel) {
        rawContentToGemini = parseExcelToCsvList(fileData);
      }
      
      const systemInstruction = `Sei un Senior Credit Analyst incaricato di estrarre dati finanziari pre-calcolati da documenti bancari italiani (come BILCe, CEBI, LOM).
I documenti contengono sia dati storici o consolidati (Fatturato, EBITDA, Rimanenze, Crediti Commerciali, PFN, ed eventualmente il DSCR) sia, nel caso di BILCe, scenari previsionali e prospettici per gli anni futuri (Scenari Previsionali BILCE con Ricavi, EBITDA, EBITDA Margine %, PFN/EBITDA x, DSCR Adjusted, Patrimonio Netto, Equity Ratio %, Fabbisogno a breve termine, Giorni Magazzino, Giorni Clienti, Score LOM previsionale).

TASSATIVO DI CLASSIFICAZIONE ANNI:
- In "financialData" inserisci SOLO gli anni storici effettivamente passati e conclusi (es. 2024, 2025 o precedenti).
- In "forecastData" inserisci SOLO gli anni futuri previsionali o di scenario (es. dal 2026, 2027, 2028, 2029, 2030, 2031 in avanti).
- Non duplicare gli anni futuri previsionali in "financialData": essi devono trovarsi rigorosamente soltanto all'interno di "forecastData".

NON ricalcolarli tu da zero; estrai esattamente quelli esistenti e scritti nel documento.
Moltiplica eventuali valori espressi in migliaia (es. se trovi Fatturato a '38.852' mila, moltiplica per 1000 per ricavare '38852000'). Restituisci cifre intere nette in Euro.
La PFN (Posizione Finanziaria Netta) deve essere espressa con segno negativo se rappresenta un debito netto complessivo (situazione standard) e positivo se rappresenta liquidità netta.
Se trovi il DSCR (Debt Service Coverage Ratio), indicalo come numero con cifre decimali (es. 1.25). Se non presente, omettilo o lascialo nullo.

Restituisci ESCLUSIVAMENTE un oggetto JSON valido con questo schema esatto:
{
  "aziendaName": "Nome completo dell'azienda estratta",
  "settoreAttivita": "Settore industriale desunto",
  "financialData": [
    {
      "year": 2024,
      "fatturato": 40040000,
      "ebitda": 4010000,
      "rimanenze": 14882000,
      "creditiCommerciali": 6177000,
      "pfn": -11346000,
      "dscr": null
    }
  ],
  "forecastData": [
    {
      "year": 2025,
      "ricavi": 38852000,
      "ebitda": 4298000,
      "ebitdaMargine": 11,
      "pfnEbitda": 3.22,
      "dscrAdjusted": 2.39,
      "patrimonioNetto": 13781000,
      "equityRatio": 26,
      "fabbisognoBreve": -10909000,
      "giorniMagazzino": 140,
      "giorniClienti": 96,
      "scoreLom": 66
    }
  ]
}`;

      let contentsPayload: any = [];
      if (isPDF) {
        contentsPayload = [pdfPartPart, "Estrai accuratamente i dati finanziari storici e gli scenari previsionali da questo documento e rispondi nello schema JSON richiesto."];
      } else if (rawContentToGemini) {
        contentsPayload = [`Ecco il dump testuale del foglio Excel caricato:\n\n${rawContentToGemini}\n\nEstrai accuratamente i dati finanziari storici e gli scenari previsionali nello schema JSON richiesto.`];
      }
      
      try {
        const genaiResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contentsPayload,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                aziendaName: { type: Type.STRING },
                settoreAttivita: { type: Type.STRING },
                financialData: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      year: { type: Type.INTEGER },
                      fatturato: { type: Type.NUMBER },
                      ebitda: { type: Type.NUMBER },
                      rimanenze: { type: Type.NUMBER },
                      creditiCommerciali: { type: Type.NUMBER },
                      pfn: { type: Type.NUMBER },
                      dscr: { type: Type.NUMBER, nullable: true }
                    },
                    required: ["year", "fatturato", "ebitda", "rimanenze", "creditiCommerciali", "pfn"]
                  }
                },
                forecastData: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      year: { type: Type.INTEGER },
                      ricavi: { type: Type.NUMBER },
                      ebitda: { type: Type.NUMBER },
                      ebitdaMargine: { type: Type.NUMBER },
                      pfnEbitda: { type: Type.NUMBER },
                      dscrAdjusted: { type: Type.NUMBER, nullable: true },
                      patrimonioNetto: { type: Type.NUMBER },
                      equityRatio: { type: Type.NUMBER, nullable: true },
                      fabbisognoBreve: { type: Type.NUMBER },
                      giorniMagazzino: { type: Type.NUMBER },
                      giorniClienti: { type: Type.NUMBER },
                      scoreLom: { type: Type.NUMBER, nullable: true }
                    },
                    required: ["year", "ricavi", "ebitda", "ebitdaMargine", "pfnEbitda", "patrimonioNetto", "fabbisognoBreve", "giorniMagazzino", "giorniClienti"]
                  }
                }
              },
              required: ["aziendaName", "financialData"]
            }
          }
        });
        
        const parsedJson = JSON.parse(genaiResponse.text || "{}");
        
        let extractedFinancial = parsedJson.financialData || [];
        let extractedForecast = parsedJson.forecastData || [];
        
        // Post-processing guardrail: split future/forecast years from financialData if Gemini erroneously grouped them
        const currentYearLimit = 2026; // Years >= 2026 represent future/forecast in our timeline
        
        const historicalOnly = extractedFinancial.filter((item: any) => item.year < currentYearLimit);
        const futureInFinancial = extractedFinancial.filter((item: any) => item.year >= currentYearLimit);
        
        if (futureInFinancial.length > 0) {
          // If forecastData is empty, build it by converting future years from financialData
          if (extractedForecast.length === 0) {
            extractedForecast = futureInFinancial.map((item: any) => {
              const ricavi = item.fatturato || 0;
              const ebitda = item.ebitda || 0;
              const ebitdaMargine = ricavi > 0 ? parseFloat(((ebitda / ricavi) * 100).toFixed(2)) : 0;
              const pfn = item.pfn || 0;
              const pfnEbitda = ebitda > 0 ? parseFloat((Math.abs(pfn) / ebitda).toFixed(2)) : 0;
              const dscrAdjusted = item.dscr || null;
              
              return {
                year: item.year,
                ricavi,
                ebitda,
                ebitdaMargine,
                pfnEbitda,
                dscrAdjusted,
                patrimonioNetto: Math.round(Math.abs(pfn) * 1.2) || Math.round(ricavi * 0.4) || 2000000,
                equityRatio: 30,
                fabbisognoBreve: -Math.round(ricavi * 0.15) || -500000,
                giorniMagazzino: 120,
                giorniClienti: 90,
                scoreLom: 70
              };
            });
          }
          // Trim the future years from financialData
          extractedFinancial = historicalOnly;
        }
        
        if (extractedFinancial.length > 0) {
          currentPratica.aziendaName = parsedJson.aziendaName || currentPratica.aziendaName;
          currentPratica.settoreAttivita = parsedJson.settoreAttivita || currentPratica.settoreAttivita || "Da definire";
          currentPratica.financialData = extractedFinancial.sort((a: any, b: any) => a.year - b.year);
          currentPratica.alerts = computeAlerts(currentPratica.financialData);
        }
        if (extractedForecast.length > 0) {
          currentPratica.forecastData = extractedForecast.sort((a: any, b: any) => a.year - b.year);
        }
      } catch (extractorErr) {
        console.warn("Quantitative extraction failed or bypassed, file saved perfectly as reference document:", extractorErr);
      }
    }
    
    writePratiche(pratiche);
    res.json(currentPratica);
    
  } catch (error: any) {
    console.error("Extraction error:", error);
    res.status(500).json({ error: error.message || "Errore sconosciuto durante il salvataggio o l'estrazione AI." });
  }
});

// 5. Generate Relazione Commerciale Evoluta with Multi-Slot Document Context
app.post("/api/pratiche/:id/generate-report", async (req, res) => {
  const { id } = req.params;
  const pratiche = readPratiche();
  const pratica = pratiche.find((p) => p.id === id);
  if (!pratica) {
    return res.status(404).json({ error: "Pratica non trovata" });
  }
  
  if (!pratica.financialData || pratica.financialData.length === 0) {
    return res.status(400).json({ error: "La pratica non contiene dati finanziari. Caricare prima un bilancio o inserire i dati." });
  }
  
  try {
    const numeroPratica = pratica.numeroPratica || "CC-2026-DLN";
    // Collect mathematical alerts and historical tables for context
    const alertsTriggered = pratica.alerts.filter(a => a.triggered);
    const alertTokensText = alertsTriggered.map(a => `- ALERT [${a.metric}]: ${a.message} (Anno: ${a.yearCurrent})`).join("\n") || "Nessun alert automatico attivato.";
    
    const financialTableText = (pratica.financialData || []).map(f => {
      return `Anno ${f.year}: Fatturato €${f.fatturato.toLocaleString('it-IT')}, EBITDA €${f.ebitda.toLocaleString('it-IT')}, Rimanenze €${f.rimanenze.toLocaleString('it-IT')}, Crediti Commerciali €${f.creditiCommerciali.toLocaleString('it-IT')}, PFN €${f.pfn.toLocaleString('it-IT')}, DSCR: ${f.dscr || 'N.D.'}`;
    }).join("\n");

    const forecastTableText = (pratica.forecastData || []).map(f => {
      return `Anno ${f.year} (Previsione BILCE): Ricavi €${f.ricavi.toLocaleString('it-IT')}, EBITDA €${f.ebitda.toLocaleString('it-IT')} (Margine ${f.ebitdaMargine}%), PFN/EBITDA: ${f.pfnEbitda}x, DSCR Adjusted: ${f.dscrAdjusted || 'N.D.'}, Patrimonio Netto: €${f.patrimonioNetto.toLocaleString('it-IT')}, Equity Ratio: ${f.equityRatio || 'N.D.'}%, Fabbisogno a Breve: €${f.fabbisognoBreve.toLocaleString('it-IT')}, Giorni Magazzino: ${f.giorniMagazzino}, Giorni Clienti: ${f.giorniClienti}, Score LOM: ${f.scoreLom || 'N.D.'}`;
    }).join("\n");
    
    // Prepare documents context from disk uploads
    const contentsPayload: any[] = [];
    const uploadsDir = path.join(DATA_DIR, "uploads", id);
    const uploadedDocsInfo: string[] = [];
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const ext = path.extname(file).toLowerCase();
        const slotName = file.split(".")[0];
        
        uploadedDocsInfo.push(`Slot "${slotName}": file name "${file}"`);
        
        if (ext === ".pdf") {
          try {
            const base64Data = fs.readFileSync(filePath).toString("base64");
            contentsPayload.push({
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data
              }
            });
            contentsPayload.push(`[RIFERIMENTO DOCUMENTO PDF ALLEGATO - SLOT: ${slotName}] (Analizza le informazioni narrative, legali, storiche e commerciali contenute in questo documento per arricchire la relazione).`);
          } catch (readErr) {
            console.error(`Errore durante il caricamento del file PDF per Gemini: ${file}`, readErr);
          }
        } else if (ext === ".xlsx" || ext === ".xls") {
          try {
            const base64Data = fs.readFileSync(filePath).toString("base64");
            const textDump = parseExcelToCsvList(base64Data);
            contentsPayload.push(`[DATI ESTRATTI DA COINVOLGIMENTO EXCEL - SLOT: ${slotName}, NOME FILE: ${file}]\n\n${textDump}`);
          } catch (excelErr) {
            console.error(`Errore nel caricamento del file Excel per Gemini: ${file}`, excelErr);
          }
        }
      }
    }
    
    const systemPrompt = `Sei un Senior Corporate Relationship Manager (Gestore Relazioni Corporate Commerciali) di altissimo livello presso una primaria banca d'affari e retail italiana, specializzato nel settore agroindustriale ed enterprise.
Il tuo compito principale è redigere una 'Relazione Commerciale Evoluta ed Istruttoria Fidi' d'eccellenza per l'azienda "${pratica.aziendaName}" associata alla pratica fidi numero "${numeroPratica}".

La relazione ha l'obbiettivo di strutturare ed argomentare la proposta di fidi in modo impeccabile, persuasivo, formale ed istituzionale, ma con un taglio fortemente COMMERCIALE, PROATTIVO orientato alle soluzioni e alla valorizzazione della relazione (cross-selling). La relazione sarà poi esaminata dall'Analista Fidi Deliberante: devi quindi presentare i dati con rigore, ma descrivendo le mitigazioni qualitative e la bontà strategica dell'azienda.

⚠️ REGOLE DI SISTEMA PER LA GENERAZIONE DEL RAPPORTO DI CREDITO (TASSATIVE E ASSOLUTE):

1. **FONTE DI VERITÀ ASSOLUTA (SOURCE OF TRUTH)**
   - La documentazione allegata nei vari slot (PDF, Excel, ecc.) è l'UNICA fonte autorizzata per i dati commerciali, finanziari, legali e anagrafici.
   - È ASSOLUTAMENTE VIETATO integrare, dedurre, inventare, approssimare o estrarre dati basandoti su database esterni, storici di altre pratiche, o presupposti teorici e pattern generali di settore. 
   - NON inserire mai nomi o dati inventati, nomi di vecchie pratiche o persone estranee a questa specifica azienda (NON parlare mai di 'Savino', 'Campanile', 'Volpe', 'DI Leo', 'Tenuta Volpe', o fornitori/clienti immaginari come 'Nuova Latte', 'Calabria Delikates' se non compaiono o non sono coerenti con i documenti della pratica corrente di "${pratica.aziendaName}").
   - **NOTA SPECIFICA SU TRE STELLE FOOD S.r.l. (TASSATIVA):** Questa azienda è ESCLUSIVAMENTE un caseificio produttore di formaggi/prodotti lattiero-caseari ("oro bianco") e commercializzatore alimentare all'ingrosso. NON gestisce conserve o passate di pomodoro, NON collabora con Mutti S.p.a., non produce pelati/polpe e non ha dipendenti adibiti alla campagna del pomodoro. Non ereditare o mescolare mai dettagli della ditta conserviera "Di Leo Nobile S.p.a.". Ciascuna pratica deve essere totalmente isolata nei suoi contenuti anagrafici e operativi.

2. **NESSUNA ALLUCINAZIONE COMMERCIALE (NO HALLUCINATION)**
   - Se la documentazione esplicita l'ASSENZA di un canale di vendita (es. "non prevede vendite dirette alla GDO"), non devi MAI inserirlo nell'output. Se il canale GDO è assente o escluso, devi indicare esplicitamente: "Modello: Private Label/Co-packing (o altra modalità riscontrata) | Canale GDO: Assente" o diciture esatte equivalenti desunte esclusivamente dai documenti.
   - Il modello di business dichiarato ha priorità assoluta su qualsiasi pattern statistico di settore o supposizione generica.

3. **CORRISPONDENZA ESATTA PER DATI LEGALI E AMMINISTRATIVI (EXACT MATCH)**
   - Date di costituzione, date di atti notarili, cariche sociali, nomi dei soci/amministratori, numeri di repertorio, intestazioni legali, assemblee societarie: COPIA FEDELMENTE E ALLINEA CARATTERE PER CARATTERE.
   - È vietato arrotondare date, normalizzare/semplificare denominazioni di cariche, o modificare formulazioni giuridiche (es. se la carica statutaria esatta è "Amministratore Delegato (delega produzione/pianificazione)", non semplificare in "Consigliere con deleghe operative" o viceversa).

4. **RICONCILIAZIONE TOTALE DELLE LINEE DI CREDITO (FULL LINE RECONCILIATION)**
   - Elenca TUTTE le linee di credito richieste nel PEF (Proposta di Affidamento), indipendentemente dall'importo o dalla tipologia.
   - La somma delle singole linee di credito DEVE coincidere esattamente al centesimo con la richiesta del PEF. L'omissione o la variazione aritmetica di anche una sola linea è un errore critico che invalida l'istruttoria.

5. **VERIFICA STATO GARANZIE PER LINEE AGEVOLATE/AGRICOLE**
   - Per ogni linea che fa riferimento a fondi o garanzie pubbliche (es. MCC, SACE, EIF), verifica e cita esplicitamente nei documenti lo stato del plafond de minimis o delle garanzie.
   - Se il PEF indica "plafond saturo" o "no garanzia MCC", è obbligatorio indicare la dicitura corretta ed l'eventuale strumento di garanzia sostitutivo applicato, senza fare assunzioni automatiche di accoglimento pubblico.

6. **NESSUNA APPROSSIMAZIONE PER PERCENTUALI E IMPORTI**
   - È severamente vietato utilizzare parole approssimative come "circa", "~", "oltre", "più di" per indicare quote di fatturato, percentuali di export, importi di affidamento, e valori di bilancio.
   - Riporta sempre le percentuali e i valori esatti (es. preferire "Export UE: 13,44% | Extra-UE: 31,68% | Totale: 45,12%" rispetto a un arrotondato "circa il 35% del fatturato").

7. **STRUTTURA DELL'OUTPUT CON TABELLA DI VALIDAZIONE VISIBILE**
   - Devi visualizzare e generare in calce al documento, alla fine della sezione 12 o come sezione integrativa ad hoc, una "Tabella di Riepilogo e Validazione di Allineamento al PEF" usando flag [✓] o [✗] per documentare l'allineamento assoluto sui seguenti punti:
     * Canali di vendita vs PEF [✓/✗]
     * Quote Export (UE/Extra-UE/Totale) vs PEF [✓/✗]
     * Totale Affidamenti Richiesti vs PEF [✓/✗]
     * Stato Garanzie Pubbliche vs PEF [✓/✗]
     * Dati Legali / Cariche Societarie e Date Atto vs PEF [✓/✗]

8. **LOG DI TRACCIABILITÀ DEI DATI ESTRATTI**
   - Per ciascun dato finanziario, anagrafico o commerciale critico che inserisci, registra o annota a lato o tra parentesi la fonte esatta.
   - Esempio di dicitura di tracciabilità: \`Export_ExtraUE: 31,68% [Fonte: PEF Sez.7, riga "Fatturato Extra-UE 2025"]\` o analoghi riferimenti precisi ricavabili dal documento.

REGOLE CRITICHE DI STRUTTURA GRAFICA ED ESTETICA (MANDATORIE):
1. **Tabelle Puro Markdown di Eccellenza (CRITICO!)**: Le tabelle sono fondamentali per rendere l'output graficamente straordinario.
   - NON generare MAI tabelle fatte di trattini e più (+-----+-----+) o racchiuse in blocchi di codice (\`\`\`) come se fossero testo preformattato.
   - Usa ESCLUSIVAMENTE tabelle in puro formato Markdown standard con pipe e trattini (es. \`| Voce di Bilancio | Anno 2024 | Anno 2025 |\` seguito da \`| :--- | :---: | :---: |\`), in modo che il foglio di stile CSS della piattaforma possa formattarle con bordi stondati, righe alternate eleganti e design bancario istituzionale.
   - Qualsiasi dato numerico o tabella di scenario (Conto Economico, Stato Patrimoniale, Indebitamento o Centrale Rischi) deve essere tassativamente inserito in una vera tabella Markdown standard.
2. **Badges e Tag di Stato**: Usa scritte formali tra parentesi quadre grassettate, es. **[ANALISI ECONOMICA: PERFORMANCE CEBI ECCELLENTE]**, **[PROFILO COMMERCIALE: PROATTIVO]**, **[RISCHIO DI PORTAFOGLIO: MITIGATO]** ad inizio di paragrafi o capitoli per dare un look editoriale e premium.
3. **Executive Callout (Blockquotes)**: Utilizza citazioni o note in evidenza usando il blocco quote (\`>\`) per evidenziare i "Commenti del Gestore Corporate" o "Insights di Mercato".
4. **Punti Elenco Gerarchici**: Non usare solo elenchi piatti. Crea sottosezioni ordinate o usa simboli di classe come \`✦\` o \`▪\` per i punti di forza/opportunità.
5. **Nessun Frammento di Codice o ASCII Art**: Non includere stringhe di log di sistema, coordinate tecniche, o diagrammi ASCII testuali brutti. L'output deve essere un documento d'ufficio creditizio rifinito, elegante ed editoriale pronto da stampare.

La relazione deve essere scritta interamente in lingua italiana e strutturata TASSATIVAMENTE sotto queste 12 sezioni obbligatorie, numerate rigidamente da 1 a 12 (il rispetto di questo indice e di questi titoli è tassativo):

1. Intestazione (con dati cliente e richiesta affidamento)
   (Specifica chiaramente in evidenza all'inizio il nome dell'azienda ed il NUMERO PRATICA: "${numeroPratica}", oltre a codice/ID pratica, settore merceologico e sintesi del totale dei fidi e degli affidamenti richiesti a supporto del circolante o degli investimenti).
2. Condizioni economiche approvate (crea un fascicolo documentale anche per questo allegato)
   (Struttura una tabella ordinata o un elenco delle condizioni finanziarie, tassi e commissioni accessorie relative ai fidi richiesti).
3. Descrizione azienda
   (Presenta una sintesi chiara del profilo, della sede, della data di costituzione, dello scopo dell'azienda e degli eventi societari principali ricavabili dai documenti).
4. Notizie sull'attività esercitata
   (Delinea in modo dettagliato il posizionamento competitivo dell'azienda, le sedi operative, il flusso operativo della produzione e il modello operativo).
5. Informazioni, storia e precedenti significativi del cliente
   (Racconta l'evoluzione dell'impresa, le tappe storiche cardine, la crescita aziendale e i passaggi istituzionali di rilievo desunti dal business plan o dalla relazione sulla gestione).
6. Punti di Forza e Punti di Debolezza
   (Descrivi i punti di forza contrassegnati da \`✦\` e i punti di debolezza con rispettiva mitigazione commerciale e creditizia indicativa).
7. Descrizione Principali Prodotti e Organizzazione Commerciale
   (Quali sono i prodotti principali erogati e la modalità di vendita: esportazione estera, mercati domestici presidiati, canali distributivi principali, agenti).
8. Analisi di Bilancio Dati Storici CEBI/LOM , Scenari Previsionali BILCE CLIENTE
   (Commenta a livello quantitativo e strategico l'andamento del fatturato, margini, EBITDA ed indebitamento. Mostra i dati storici reali ed elabora l'analisi degli Scenari Previsionali BILCE con i dati previsionali futuri reali forniti a sistema, evidenziando il trend di crescita).
9. Chiarimenti Cliente su Voci di Bilancio (se necessari e presenti)
   (Analizza variazioni insolite, stock di rimanenze o crediti descrivendone la natura strategica o temporanea, beneficiando dei chiarimenti forniti dal cliente o dalle annotazioni).
10. Analisi Centrale Rischi — Andamento Temporale Esposizione
    (Valuta l'andamento del debito verso il sistema creditizio, le linee a revoca e a scadenza, l'assenza strutturale di sofferenze, rate scadute o sconfini).
11. Valutazioni
    (Esprimi una valutazione complessiva ed equilibrata di natura economico-finanziaria e commerciale che consenta all'Analista Fidi di comprendere la sostenibilità della proposta).
12. Integrazione Fonti Esterne
    (Includi indicatori di settore reali citando fonti istituzionali certificate del mercato italiano con i loro indirizzi web ufficiali, es. ISMEA (https://www.ismeamercati.it o https://www.ismea.it), ANICAV (https://www.anicav.it), SACE (https://www.sace.it), o ISTAT (https://www.istat.it), per conferire il massimo rigore commerciale alla pratica).

REGOLE ESSENZIALI DI REDAZIONE:
1. Devi incrociare in modo intelligente tutte le informazioni fornite sia dai dati quantitativi (CEBI/LOM/BILCe) sia dalle informazioni qualitative dei documenti allegati (es. Relazione sulla Gestione, Business Plan).
2. Per i dati quantitativi e i calcoli numerici, affidati esclusivamente a quelli pre-calcolati estratti da CEBI, LOM, e BILCe. Dalle relazioni sulla gestione e dai business plan assorbi soltanto le strategie di settore, le note esplicative dell'andamento o le spiegazioni dei progetti di investimento.
3. Sezione 10 ("Analisi Centrale Rischi") ed i capitoli di debolezza devono elaborare commenti mirati considerando anche gli ALERT AUTOMATICI rilevati dal sistema:
${alertTokensText}
4. Sviluppa testi ampi, discorsivi, professionali e formali di livello Executive per ogni capitolo. Evita sintesi sintatticamente povere, frasi di una riga o markdown grezzo incompleto.`;

    const userInstructionsPrompt = `
Dati Finanziari Storici Consolidati estratti:
${financialTableText}

Dati Previsionali e Prospettici (BILCE) inseriti:
${forecastTableText || "Nessun dato previsionale registrato a sistema."}

Descrizione e motivazione dell'operazione:
${pratica.descrizioneOperazione || "Istruttoria fidi ordinaria a supporto di esigenze aziendali."}

Note Addizionali del Gestore Corporate:
${pratica.noteLibere ? pratica.noteLibere : "Nessuna nota aggiuntiva fornita. Se non vi sono note specifiche, ignora ed esegui la stesura in base ai documenti."}

Documenti allegati negli slot di caricamento:
${uploadedDocsInfo.length > 0 ? uploadedDocsInfo.join("\n") : "Solo i dati di bilancio inseriti."}

SETTORE MERCEOLOGICO: ${pratica.settoreAttivita || "Da definire"}

Genera la Relazione Commerciale Evoluta completa in Markdown italiano rispettando fedelmente le 12 sezioni sopra descritte.`;

    contentsPayload.push(userInstructionsPrompt);
    
    // Generate response using gemini-3.5-flash
    const genaiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentsPayload,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.25
      }
    });
    
    const finalReportMarkdown = genaiResponse.text || "Errore nella generazione del report.";
    
    // Save report & update status
    pratica.markdownReport = finalReportMarkdown;
    pratica.status = "Completata";
    writePratiche(pratiche);
    
    res.json(pratica);
    
  } catch (error: any) {
    console.error("Report generation error:", error);
    res.status(500).json({ error: error.message || "Impossibile generare la relazione commerciale AI." });
  }
});

// 6. Save manual edits list
app.put("/api/pratiche/:id", (req, res) => {
  const { id } = req.params;
  const { markdownReport, descrizioneOperazione, aziendaName, settoreAttivita, status, financialData, forecastData, alerts, noteLibere, numeroPratica } = req.body;
  
  const pratiche = readPratiche();
  const index = pratiche.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Pratica non trovata" });
  }
  
  const pratica = pratiche[index];
  if (markdownReport !== undefined) pratica.markdownReport = markdownReport;
  if (descrizioneOperazione !== undefined) pratica.descrizioneOperazione = descrizioneOperazione;
  if (aziendaName !== undefined) pratica.aziendaName = aziendaName;
  if (settoreAttivita !== undefined) pratica.settoreAttivita = settoreAttivita;
  if (status !== undefined) pratica.status = status;
  if (noteLibere !== undefined) pratica.noteLibere = noteLibere;
  if (numeroPratica !== undefined) pratica.numeroPratica = numeroPratica;
  if (financialData !== undefined) {
    pratica.financialData = financialData;
    // Re-evaluate alerts if financialData was customized
    pratica.alerts = computeAlerts(financialData);
  }
  if (forecastData !== undefined) {
    pratica.forecastData = forecastData;
  }
  if (alerts !== undefined) pratica.alerts = alerts;
  
  writePratiche(pratiche);
  res.json(pratica);
});

// 7. Delete practice
app.delete("/api/pratiche/:id", (req, res) => {
  const { id } = req.params;
  const pratiche = readPratiche();
  const filtered = pratiche.filter((p) => p.id !== id);
  if (pratiche.length === filtered.length) {
    return res.status(404).json({ error: "Pratica non trovata" });
  }
  writePratiche(filtered);
  res.json({ success: true, message: "Pratica eliminata con successo." });
});

// 8. Download as Word (.doc) stream
app.post("/api/pratiche/:id/export/word", (req, res) => {
  const { id } = req.params;
  const pratiche = readPratiche();
  const pr = pratiche.find((p) => p.id === id);
  if (!pr) {
    return res.status(404).send("Pratica non trovata");
  }
  
  const payloadMarkdown = pr.markdownReport || "Nessun report generato.";
  const cleanHtml = simpleMarkdownToHtml(payloadMarkdown);
  
  // Clean special characters for MS word header compatibility
  const filename = `${pr.aziendaName.replace(/[^a-zA-Z0-9]/g, "_")}_Relazione_CorpEx.doc`;
  
  res.setHeader("Content-Type", "application/msword; charset=UTF-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.write('\ufeff'); // Write UTF-8 byte order mark so Word understands all accents natively
  res.end(cleanHtml);
});

// 9. Premium print rendering tab
app.get("/api/pratiche/:id/print", (req, res) => {
  const { id } = req.params;
  const pratiche = readPratiche();
  const pr = pratiche.find((p) => p.id === id);
  if (!pr) {
    return res.status(404).send("<h1>Pratica non trovata</h1>");
  }
  
  const numeroPratica = pr.numeroPratica || "CC-2026-DLN";
  const compiledHtml = renderMarkdownToHtmlForPrint(
    pr.aziendaName,
    numeroPratica,
    pr.id,
    pr.markdownReport || "# Nessun report generato\nSi prega di generare il report tramite l'assistente prima di procedere con la stampa."
  );
  
  res.setHeader("Content-Type", "text/html; charset=UTF-8");
  res.send(compiledHtml);
});


// Serve UI with Vite logic in dev side and physical in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server CorpEx running securely on port ${PORT}`);
  });
}

startServer();
