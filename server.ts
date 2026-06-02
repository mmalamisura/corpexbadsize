import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as xlsx from "xlsx";
import dotenv from "dotenv";
import crypto from "crypto";

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
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), "utf8");
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf8");
}

// User auth and session helpers
const JWT_SECRET = process.env.JWT_SECRET || "malamisura_super_secret_key_2026_salt";

interface User {
  email: string;
  passwordHash: string;
  name: string;
  dateRegistered: string;
}

function readUsers(): User[] {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(data) as User[];
  } catch (error) {
    console.error("Error reading users database:", error);
    return [];
  }
}

function writeUsers(data: User[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing users database:", error);
  }
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + JWT_SECRET).digest("hex");
}

function generateToken(email: string): string {
  const expiration = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const data = `${email}:${expiration}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("hex");
  return `${Buffer.from(data).toString("base64")}.${signature}`;
}

function verifyToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encodedData, signature] = parts;
    const data = Buffer.from(encodedData, "base64").toString("utf8");
    const [email, expiration] = data.split(":");
    if (!email || !expiration) return null;
    if (Date.now() > parseInt(expiration)) return null;
    
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${email}:${expiration}`).digest("hex");
    if (signature === expectedSignature) {
      return email;
    }
  } catch (err) {
    console.error("Token verification failed", err);
  }
  return null;
}

// Middleware to authenticate user
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const queryToken = req.query.token as string;
  let token = "";
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (queryToken) {
    token = queryToken;
  }
  
  if (!token) {
    return res.status(401).json({ error: "Accesso non autorizzato. Effettua il login." });
  }
  
  const email = verifyToken(token);
  if (!email) {
    return res.status(401).json({ error: "Sessione scaduta o non valida. Effettua nuovamente il login." });
  }
  
  (req as any).userEmail = email;
  next();
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
  andamentoContiBanca?: string;
  ownerEmail?: string;
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
function parseMarkdownToHtmlTablesForWord(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let convertedHtml = "";
  let inTable = false;
  let tableRows: string[][] = [];
  let inList = false;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Blockquote
    if (line.startsWith(">")) {
      if (!inBlockquote) {
        if (inList) { convertedHtml += "</ul>"; inList = false; }
        if (inTable) { convertedHtml += renderHtmlTableForWord(tableRows); inTable = false; tableRows = []; }
        convertedHtml += "<div style='background-color: #f8fafc; border-left: 4px solid #1e3a8a; padding: 12px; margin: 15px 0; font-style: italic;'>";
        inBlockquote = true;
      }
      line = line.substring(1).trim();
    } else if (inBlockquote && !line.startsWith(">") && line !== "") {
      convertedHtml += "</div>";
      inBlockquote = false;
    }

    if (line === "") {
      if (inList) { convertedHtml += "</ul>"; inList = false; }
      if (inTable) { convertedHtml += renderHtmlTableForWord(tableRows); inTable = false; tableRows = []; }
      continue;
    }

    if (line.startsWith("|")) {
      if (inList) { convertedHtml += "</ul>"; inList = false; }
      if (line.includes("---")) {
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
      convertedHtml += renderHtmlTableForWord(tableRows);
      inTable = false;
      tableRows = [];
    }

    // Headers
    if (line.startsWith("# ")) {
      convertedHtml += `<h1 style="color: #1e3a8a; font-family: Arial, sans-serif; font-size: 20px; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; margin-top: 30px;">${line.substring(2)}</h1>`;
    } else if (line.startsWith("## ")) {
      convertedHtml += `<h2 style="color: #0d253f; font-family: Arial, sans-serif; font-size: 16px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; margin-top: 22px;">${line.substring(3)}</h2>`;
    } else if (line.startsWith("### ")) {
      convertedHtml += `<h3 style="color: #334155; font-family: Arial, sans-serif; font-size: 14px; margin-top: 18px;">${line.substring(4)}</h3>`;
    } else if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("✦ ") || line.startsWith("• ")) {
      if (!inList) {
        inList = true;
        convertedHtml += "<ul style='font-family: Arial, sans-serif; font-size: 11px; margin-bottom: 10px; padding-left: 20px;'>";
      }
      const content = line.substring(2);
      convertedHtml += `<li style='margin-bottom: 4px;'>${content}</li>`;
    } else {
      if (inList) {
        convertedHtml += "</ul>";
        inList = false;
      }
      let prg = line;
      convertedHtml += `<p style="font-family: Arial, sans-serif; font-size: 11px; line-height: 1.5; text-align: justify; margin-bottom: 12px;">${prg}</p>`;
    }
  }

  if (inList) convertedHtml += "</ul>";
  if (inTable) convertedHtml += renderHtmlTableForWord(tableRows);
  if (inBlockquote) convertedHtml += "</div>";

  // Inline formatting
  convertedHtml = convertedHtml.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  convertedHtml = convertedHtml.replace(/\*(.*?)\*/g, "<em>$1</em>");
  convertedHtml = convertedHtml.replace(/`([^`]+)`/g, "<code style='background-color: #f1f5f9; padding: 2px 4px; font-family: Courier, monospace; font-size: 10px;'>$1</code>");
  convertedHtml = convertedHtml.replace(/\[([^\]]+:[^\]]+)\]/g, `<span style="background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 2px 6px; font-size: 9px; font-family: Arial, sans-serif; font-weight: bold; border-radius: 4px; display: inline-block;">$1</span>`);

  return convertedHtml;
}

function renderHtmlTableForWord(rows: string[][]): string {
  if (rows.length === 0) return "";
  let html = "<table border='1' cellspacing='0' cellpadding='6' style='width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; font-family: Arial, sans-serif; font-size: 11px; border-color: #cbd5e1;'>";
  
  // Header row
  html += "<thead><tr style='background-color: #0f172a;'>";
  rows[0].forEach(cell => {
    let cleanCell = cell.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html += `<th style='color: white; font-weight: bold; text-align: left; padding: 8px 10px; border: 1px solid #1e293b;'>${cleanCell}</th>`;
  });
  html += "</tr></thead><tbody>";
  
  // Body rows
  for (let i = 1; i < rows.length; i++) {
    const bgRowStyle = i % 2 === 0 ? "style='background-color: #f8fafc;'" : "";
    html += `<tr ${bgRowStyle}>`;
    rows[i].forEach(cell => {
      let cleanCell = cell.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>");
      
      let isNumeric = /^\s*[\d\.,€%\-\s\*\/\+]+$/.test(cell.replace(/<strong>|<\/strong>|<em>|<\/em>/g, "")) && cell.trim().length > 0;
      let alignStyle = isNumeric ? "text-align: right; font-family: Courier, monospace; font-size: 10px;" : "text-align: left;";
      
      html += `<td style='padding: 8px 10px; border: 1px solid #e2e8f0; ${alignStyle}'>${cleanCell}</td>`;
    });
    html += "</tr>";
  }
  
  html += "</tbody></table>";
  return html;
}

function simpleMarkdownToHtml(markdown: string, aziendaName: string, numeroPratica: string, cdgCliente: string, settoreAttivita: string): string {
  const currentDate = new Date().toLocaleDateString("it-IT", { day: '2-digit', month: '2-digit', year: 'numeric' });
  const parsedBody = parseMarkdownToHtmlTablesForWord(markdown);

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #333333; margin: 40px; }
          h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; font-size: 20px; font-weight: bold; margin-top: 30px; }
          h2 { color: #0d253f; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; font-size: 16px; font-weight: bold; margin-top: 24px; }
          h3 { color: #334155; font-size: 14px; font-weight: bold; margin-top: 18px; }
          p, ul { font-size: 11px; margin-bottom: 12px; }
          li { margin-bottom: 4px; }
          strong { color: #111111; font-weight: bold; }
          .alert-box { background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 12px; margin: 16px 0; }
        </style>
      </head>
      <body>
        <!-- FIRST PAGE: COVER SECTION FOR MS WORD -->
        <div class="cover-page" style="margin-bottom: 50px; font-family: Arial, sans-serif;">
          <div style="border-bottom: 3px double #1e3a8a; padding-bottom: 15px; margin-bottom: 40px; display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: middle;">
              <span style="font-size: 20px; font-weight: bold; color: #1e3a8a; text-transform: uppercase;">Massimo Malamisura</span><br>
              <span style="font-size: 9px; color: #475569; letter-spacing: 1px; text-transform: uppercase; font-weight: bold;">Istruttoria Corporate — © Copyright 2026</span>
            </div>
          </div>
          
          <div style="padding: 50px 0;">
            <div style="font-size: 10.5px; background-color: #eff6ff; color: #1e40af; padding: 4px 10px; border-radius: 4px; font-weight: bold; display: inline-block;">INFORMATIVA RELAZIONE FINANZIARIA</div>
            <h1 style="font-size: 30px; color: #1e3a8a; margin: 15px 0 5px 0; font-weight: bold; border-bottom: none;">Relazione Commerciale Evoluta</h1>
            <h3 style="font-size: 16px; color: #475569; margin: 0; font-weight: normal;">Fascicolo di Istruttoria Fidi ed Alerts Finanziari</h3>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-top: 40px; margin-bottom: 40px;">
            <table border="0" cellpadding="4" cellspacing="0" style="width: 100%; font-size: 11px; margin: 0; border-collapse: collapse;">
              <tr>
                <td style="width: 30%; color: #64748b; font-weight: bold; border: none; padding: 5px;">RAGIONE SOCIALE:</td>
                <td style="color: #0f172a; font-weight: bold; border: none; padding: 5px; font-size: 13px;">${aziendaName}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: bold; border: none; padding: 5px;">CDG CLIENTE:</td>
                <td style="color: #0f172a; font-weight: bold; border: none; padding: 5px; font-family: Courier, monospace; font-size: 12px;">${cdgCliente}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: bold; border: none; padding: 5px;">SETTORE DI ATTIVITÀ:</td>
                <td style="color: #0f172a; border: none; padding: 5px;">${settoreAttivita}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: bold; border: none; padding: 5px;">CODICE PRATICA fidi:</td>
                <td style="color: #1e3a8a; font-weight: bold; border: none; padding: 5px; font-family: Courier, monospace;">${numeroPratica}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-weight: bold; border: none; padding: 5px;">DATA ELABORAZIONE:</td>
                <td style="color: #0f172a; border: none; padding: 5px;">${currentDate}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 9px; color: #94a3b8; font-style: italic; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px;">Relazione riservata ad uso creditizio interno.</p>
        </div>

        <!-- MS WORD PAGE BREAK -->
        <br clear="all" style="page-break-before: always; break-before: page;">

        <!-- SECOND PAGE: REPORT CONTENT -->
        ${parsedBody}
        
        <!-- FOOTER ELEMENT INSIDE MS WORD FLOW -->
        <div style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-family: Courier, monospace; font-size: 9px; color: #64748b; text-align: center;">
          CDG: ${cdgCliente} | AZIENDA: ${aziendaName} | SETTORE: ${settoreAttivita} | CODICE PRATICA: ${numeroPratica}
        </div>
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

function renderMarkdownToHtmlForPrint(aziendaName: string, numeroPratica: string, cdgCliente: string, settoreAttivita: string, markdown: string): string {
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
  convertedHtml = convertedHtml.replace(/\[([^\]]+:[^\]]+)\]/g, `<span class="badge">$1</span>`);
  
  const currentDate = new Date().toLocaleDateString("it-IT", { day: '2-digit', month: '2-digit', year: 'numeric' });
  
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
            position: relative;
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
            
            .page-break {
              page-break-after: always;
              break-after: page;
              height: 0;
              margin: 0;
              border: none;
            }
            
            .cover-page {
              height: 250mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              padding: 0 10px 20px 10px;
              page-break-after: always;
              break-after: page;
            }
            
            .running-footer {
              display: block !important;
              position: fixed;
              bottom: -0.5cm;
              left: 1.5cm;
              right: 1.5cm;
              height: 12mm;
              background: white;
              border-top: 1px solid #cbd5e1;
              font-size: 7.5pt;
              color: #64748b;
              text-align: center;
              z-index: 10;
            }
            
            .first-page-footer-cover {
              display: block !important;
              position: absolute;
              top: 240mm;
              left: 0;
              width: 210mm;
              height: 40mm;
              background: white !important;
              z-index: 999;
            }
          }
          
          @media screen {
            .running-footer, .first-page-footer-cover {
              display: none !important;
            }
            .cover-page {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 40px;
              margin-bottom: 45px;
            }
            .page-break {
              border-top: 2px dashed #cbd5e1;
              margin: 40px 0;
              position: relative;
            }
            .page-break::after {
              content: "PAGINA CONTINUA";
              position: absolute;
              top: -10px;
              left: 50%;
              transform: translateX(-50%);
              background: #cbd5e1;
              color: #475569;
              font-size: 8pt;
              padding: 2px 8px;
              border-radius: 4px;
              font-weight: bold;
            }
          }

          /* Cover formatting */
          .cover-top {
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .cover-logo-img {
            height: 52px;
            width: 52px;
            object-fit: contain;
          }
          .cover-brand {
            font-size: 26px;
            font-weight: bold;
            color: #1e3a8a;
            letter-spacing: -0.5px;
            text-transform: uppercase;
          }
          .cover-subbrand {
            font-size: 10px;
            letter-spacing: 2px;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 4px;
          }
          .cover-center {
            padding: 60px 0;
          }
          .cover-report-tag {
            font-size: 11px;
            background-color: #eff6ff;
            color: #1e40af;
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 20px;
          }
          .cover-title {
            font-size: 36px;
            color: #1e3a8a;
            margin: 0;
            font-weight: 800;
            line-height: 1.2;
            border-bottom: none;
            padding-bottom: 0;
          }
          .cover-subtitle {
            font-size: 18px;
            color: #475569;
            margin-top: 10px;
            font-weight: 500;
            border: none;
            padding: 0;
          }
          .cover-bottom {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 24px;
            border: 1px solid #e2e8f0;
          }
          .cover-meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .cover-meta-item {
            display: flex;
            flex-direction: column;
          }
          .cover-meta-label {
            font-size: 9px;
            color: #64748b;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .cover-meta-val {
            font-size: 14px;
            color: #0f172a;
            font-weight: 600;
            margin-top: 2px;
          }
          .cover-policy {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
            font-size: 9px;
            color: #94a3b8;
            font-style: italic;
            text-align: center;
          }
          .running-footer-content {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="toolbar no-print">
          <div class="toolbar-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
            <span>Istruttoria Corporate — Massimo Malamisura</span>
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
          <!-- COVER PAGE -->
          <div class="cover-page">
            <div class="cover-top" style="display: flex; align-items: center; gap: 16px;">
              <div style="background-color: #1e3a8a; height: 52px; width: 52px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-family: sans-serif; font-size: 20px;">
                MM
              </div>
              <div>
                <div class="cover-brand">Massimo Malamisura</div>
                <div class="cover-subbrand">STRUTTURA ISTRUTTORIE E RELAZIONI CREDITIZIE — © COPYRIGHT 2026</div>
              </div>
            </div>
            <div class="cover-center">
              <div class="cover-report-tag">INFORMATIVA RELAZIONE FINANZIARIA</div>
              <h1 class="cover-title">Relazione Commerciale Evoluta</h1>
              <h2 class="cover-subtitle">Fascicolo di Istruttoria Fidi ed Alerts Finanziari</h2>
            </div>
            
            <div class="cover-bottom">
              <div class="cover-meta-grid">
                <div class="cover-meta-item">
                  <div class="cover-meta-label">RAGIONE SOCIALE:</div>
                  <div class="cover-meta-val">${aziendaName}</div>
                </div>
                <div class="cover-meta-item">
                  <div class="cover-meta-label">CDG CLIENTE:</div>
                  <div class="cover-meta-val font-mono">${cdgCliente}</div>
                </div>
                <div class="cover-meta-item">
                  <div class="cover-meta-label">SETTORE DI ATTIVITÀ:</div>
                  <div class="cover-meta-val">${settoreAttivita}</div>
                </div>
                <div class="cover-meta-item">
                  <div class="cover-meta-label">CODICE PRATICA fidi:</div>
                  <div class="cover-meta-val font-mono">${numeroPratica}</div>
                </div>
                <div class="cover-meta-item">
                  <div class="cover-meta-label">DATA ELABORAZIONE:</div>
                  <div class="cover-meta-val">${currentDate}</div>
                </div>
              </div>
              <div class="cover-policy">Relazione riservata ad uso creditizio interno bancario.</div>
            </div>
          </div>
          
          <div class="first-page-footer-cover no-print-visible"></div>
          <div class="page-break"></div>
          
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
        
        <div class="running-footer no-print-visible">
          <div class="running-footer-content font-mono">
            <span>CDG: ${cdgCliente}</span> | <span>AZIENDA: ${aziendaName}</span> | <span>SETTORE: ${settoreAttivita}</span> | <span>CODICE PRATICA: ${numeroPratica}</span>
          </div>
        </div>
        
        <script>
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

// --- AUTH ENDPOINTS ---

const recoveryCodes = new Map<string, { code: string; expires: number }>();

// 0. Password Reset Request
app.post("/api/auth/reset-password-request", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "L'indirizzo email è richiesto." });
  }
  
  const emailLower = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === emailLower);
  
  if (!user) {
    return res.status(404).json({ error: "L'indirizzo email non risulta associato a nessun account." });
  }
  
  // Generate random 6-digit OTP code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
  
  recoveryCodes.set(emailLower, { code, expires });
  
  // Return OTP in response so they don't get stuck due to lack of real automated email sender
  res.json({
    success: true,
    message: `Procedura avviata. Un codice OTP è stato simulato per l'invio.`,
    demoOtp: code
  });
});

// 0.5 Password Reset Confirm
app.post("/api/auth/reset-password-confirm", (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori." });
  }
  
  const emailLower = email.trim().toLowerCase();
  const recoveryEntry = recoveryCodes.get(emailLower);
  
  if (!recoveryEntry) {
    return res.status(400).json({ error: "Nessuna richiesta di recupero valida trovata per questa email. Ricomincia." });
  }
  
  if (Date.now() > recoveryEntry.expires) {
    recoveryCodes.delete(emailLower);
    return res.status(400).json({ error: "Il codice OTP di sicurezza è scaduto. Richiedilo di nuovo." });
  }
  
  if (recoveryEntry.code !== code.trim()) {
    return res.status(400).json({ error: "Il codice OTP di sicurezza non è corretto." });
  }
  
  const users = readUsers();
  const userIndex = users.findIndex(u => u.email.toLowerCase() === emailLower);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Utente non registrato." });
  }
  
  users[userIndex].passwordHash = hashPassword(newPassword);
  writeUsers(users);
  
  recoveryCodes.delete(emailLower);
  res.json({ success: true, message: "Password aggiornata con successo! Effettua l'accesso ora." });
});

// 1. User Registration
app.post("/api/auth/register", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password e nome sono richiesti." });
  }
  
  const emailLower = email.trim().toLowerCase();
  const users = readUsers();
  
  if (users.some(u => u.email.toLowerCase() === emailLower)) {
    return res.status(400).json({ error: "L'indirizzo email inserito è già registrato." });
  }
  
  const newUser: User = {
    email: emailLower,
    passwordHash: hashPassword(password),
    name: name.trim(),
    dateRegistered: new Date().toISOString()
  };
  
  users.push(newUser);
  writeUsers(users);
  
  const token = generateToken(emailLower);
  res.status(201).json({
    token,
    user: {
      email: newUser.email,
      name: newUser.name
    }
  });
});

// 2. User Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email e password richiesti." });
  }
  
  const emailLower = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === emailLower);
  
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: "Credenziali non valide. Riprova." });
  }
  
  const token = generateToken(emailLower);
  res.json({
    token,
    user: {
      email: user.email,
      name: user.name
    }
  });
});

// 3. User Profile Verification
app.get("/api/auth/me", authenticate, (req, res) => {
  const email = (req as any).userEmail;
  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(404).json({ error: "Utente non trovato." });
  }
  
  res.json({
    user: {
      email: user.email,
      name: user.name
    }
  });
});

// Helper to check practice owner before operation
function getPraticaWithOwnerCheck(id: string, email: string) {
  const pratiche = readPratiche();
  const index = pratiche.findIndex((p) => p.id === id);
  if (index === -1) {
    return { error: "Pratica non trovata", status: 404, index: -1 };
  }
  const pr = pratiche[index];
  const owner = pr.ownerEmail || "m.malamisura@gmail.com";
  
  // Master user (m.malamisura@gmail.com) is allowed to view/edit all practices
  const isMaster = email.trim().toLowerCase() === "m.malamisura@gmail.com";
  if (!isMaster && owner.toLowerCase() !== email.toLowerCase()) {
    return { error: "Non hai l'autorizzazione per accedere a questa pratica.", status: 403, index: -1 };
  }
  
  return { index, pratica: pr };
}

// --- PRACTICE ENDPOINTS (PROTECTED WITH AUTH) ---

// 1. Get all credit files ("pratiche") (Filtered by owner or showing all if Admin/Master)
app.get("/api/pratiche", authenticate, (req, res) => {
  const email = (req as any).userEmail;
  const pratiche = readPratiche();
  const users = readUsers();
  
  const isMaster = email.trim().toLowerCase() === "m.malamisura@gmail.com";
  
  const filteredPratiche = pratiche.filter(p => {
    if (isMaster) return true; // Master Supervisor sees all practices
    const owner = p.ownerEmail || "m.malamisura@gmail.com";
    return owner.toLowerCase() === email.toLowerCase();
  });
  
  // Enrich practices with original creator names for master role information
  const enriched = filteredPratiche.map(p => {
    const ownerEmail = p.ownerEmail || "m.malamisura@gmail.com";
    const userMatch = users.find(u => u.email.toLowerCase() === ownerEmail.toLowerCase());
    return {
      ...p,
      ownerEmail,
      ownerName: userMatch ? userMatch.name : (ownerEmail === "m.malamisura@gmail.com" ? "Massimo Malamisura" : "Utente Esterno")
    };
  });
  
  // Return descending by dateCreated so newest is first
  res.json([...enriched].sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()));
});

// 2. Get single custom practice
app.get("/api/pratiche/:id", authenticate, (req, res) => {
  const check = getPraticaWithOwnerCheck(req.params.id, (req as any).userEmail);
  if (check.error) return res.status(check.status).json({ error: check.error });
  res.json(check.pratica);
});

// 3. Create raw blank practice
app.post("/api/pratiche", authenticate, (req, res) => {
  const { aziendaName, docType, descrizioneOperazione, numeroPratica, cdgCliente, andamentoContiBanca } = req.body;
  const targetDocType = docType || "BILCe";
  const email = (req as any).userEmail;
  
  const pratiche = readPratiche();
  const newPratica: Pratica = {
    id: "pratica_" + Math.random().toString(36).substring(2, 11),
    aziendaName: aziendaName || "Nuova Pratica da Analizzare",
    numeroPratica: numeroPratica || "",
    cdgCliente: cdgCliente || "",
    andamentoContiBanca: andamentoContiBanca || "",
    settoreAttivita: "Da definire",
    docType: targetDocType,
    status: "In Corso",
    dateCreated: new Date().toISOString(),
    financialData: [],
    alerts: [],
    markdownReport: "",
    descrizioneOperazione: descrizioneOperazione || "Istruttoria di credito per finanziamento chirografario/ipotecario a medio-lungo termine.",
    uploadedFiles: {},
    ownerEmail: email
  };
  
  pratiche.push(newPratica);
  writePratiche(pratiche);
  res.status(201).json(newPratica);
});

// 4. Upload & AI Auto-extract financial data with specialized slots
app.post(["/api/pratiche/:id/upload", "/api/pratiche/:id/upload/:slot"], authenticate, async (req, res) => {
  const { id } = req.params;
  const slot = req.params.slot || "bilce";
  const { fileData, fileName, fileType } = req.body;
  const email = (req as any).userEmail;
  
  if (!fileData || !fileName || !fileType) {
    return res.status(400).json({ error: "Dati del file incompleti." });
  }
  
  const check = getPraticaWithOwnerCheck(id, email);
  if (check.error) return res.status(check.status).json({ error: check.error });
  
  const pratiche = readPratiche();
  const praticaIndex = check.index!;
  
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
app.post("/api/pratiche/:id/generate-report", authenticate, async (req, res) => {
  const { id } = req.params;
  const email = (req as any).userEmail;
  
  const check = getPraticaWithOwnerCheck(id, email);
  if (check.error) return res.status(check.status).json({ error: check.error });
  
  const pratica = check.pratica!;
  
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
    
    const systemPrompt = `Sei un Senior Corporate Relationship Manager e Senior Financial Analyst di altissimo livello presso una primaria banca d'affari e retail italiana, specializzato nel settore agroindustriale ed enterprise.
Il tuo compito principale è redigere una 'Relazione Commerciale Evoluta ed Istruttoria Fidi' d'eccellenza per l'azienda "${pratica.aziendaName}" associata alla pratica fidi numero "${numeroPratica}".

La relazione ha l'obiettivo di strutturare ed argomentare la proposta di fidi in modo impeccabile, persuasivo, formale ed istituzionale, ma con un taglio fortemente COMMERCIALE, PROATTIVO orientato alle soluzioni e alla valorizzazione della relazione (cross-selling). La relazione sarà poi esaminata dall'Analista Fidi Deliberante: devi quindi presentare i dati con rigore, ma descrivendo le mitigazioni qualitative e la bontà strategica dell'azienda.

⚠️ REGOLE DI SISTEMA PER LA GENERAZIONE DEL RAPPORTO DI CREDITO (TASSATIVE E ASSOLUTE):

1. **FONTE DI VERITÀ ASSOLUTA (SOURCE OF TRUTH) E ASSENZA DI CITAZIONI INTERNE**
   - La documentazione allegata nei vari slot (PDF, Excel, ecc.) è l'UNICA fonte autorizzata per i dati commerciali, finanziari, legali e anagrafici.
   - È ASSOLUTAMENTE VIETATO integrare, dedurre, inventare, o approssimare dati basandoti su database esterni o pattern generali.
   - **MANDATORIO: Nessun riporto alla fonte interno.** NON inserire etichette di tracciabilità interne o citazioni di fonti (come "[Fonte: Relazione n...]" o "[Tracciabilità ...]" o "[Fonte: PEF Sez.7...]") a supporto dei dati desunti dai documenti correnti. Elimina completamente il riporto alla fonte dei documenti caricati; scrivi invece in modo naturale e fluido. L'unica eccezione in cui devi menzionare indirizzi web o portali ufficiali è la sezione 10 per l'analisi di settore scovata sul web.
   - NON inserire mai nomi o dati inventati, nomi di vecchie pratiche o persone estranee a questa specifica azienda.

2. **DUE SEZIONI CON REGOLE DI STESURA SPECIFICHE (ATTENZIONE SUI REQUISITI DETTAGLIATI COMPILATI O CON PROMPT/REMINDER)**
   - **SEZIONE 12 ("ANDAMENTO DEI CONTI E CONSIDERAZIONI SUL LAVORO RISERVATOCI RISPETTO AL GIRO D'AFFARI DEL CLIENTE")**:
     * Se l'utente non ha immesso alcuna informazione comportamentale nel rispettivo campo della pratica ("andamentoContiBanca"), NON inventare dati fittizi. Devi invece stampare un memo formale di promemoria in cui ricordi all'utente l'elenco esatto delle informazioni necessarie affinché tu possa procedere all'istruzione. Ad esempio, scrivi:
       "SITUDAZIONE COMPORTAMENTALE / ANDAMENTO DEI CONTI DA INTEGRARE:
       Promemoria per l'utente - Per completare questa sezione, inserisci nel campo 'Andamento conti e redditività con la banca' le seguenti informazioni:
       - Anzianità del rapporto bancario
       - Qualità comportamentale (serietà, correttezza, precisione negli utilizzi)
       - Movimentazione complessiva del conto
       - Percentuale di insoluti e qualità del portafoglio clienti sottostante
       - Redditività generata per la banca (margine di intermediazione)
       - Rating interno e punteggio comportamentale (scelta rating, es. score Gianos)
       - Pricing applicato (commissioni, tassi debitori con scadenze)"
     * Se l'utente ha fornito dettagli, redigi un commento commercialmente strutturato basandoti esclusivamente su di essi.
   
   - **TASSATIVO: NESSUNA TABELLA NUMERICA RIEPILOGATIVA NEL COMMENTO DI BILANCIO (SEZIONE 13)**:
     * Per il capitolo "13. COMMENTO BILANCIO RICLASSIFICATO", **NON generare alcuna tabella riepilogativa o schema numerico preimpostato**. L'utente richiede espressamente di ELIMINARE le tabelle riepilogative e di spiegare diffusamente le dinamiche a parole in prosa fluida e analitica.
     * Effettua un'analisi finanziaria esauriente e approfondita a livello senior: commenta la crescita dei ricavi, l'andamento del fatturato, i margini intermedi (EBITDA, EBITDA Margin), la leva finanziaria (es. PFN/EBITDA), il patrimonio netto, l'andamento della liquidità, il capitale circolante commerciale (rimanenze, crediti commerciali, debiti fornitori correlati con i giorni medi) e il giudizio di sostenibilità (DSCR). Descrivi le correlazioni causa-effetto e le tendenze evolutive senza fare affidamento su tabelle sintetiche.

3. **MITIGAZIONI COMMERCIALI PER I PUNTI DI DEBOLEZZA**
   - Nei paragrafi dedicati ai punti di debolezza, per ogni debolezza identificata, elabora sempre una mitigazione commerciale credibile ed efficace per rassicurare l'organo deliberante.

REGOLE DI STRUTTURA GRAFICA ED ESTETICA (MANDATORIE):
1. **Badges e Tag di Stato**: Usa scritte formali tra parentesi quadre grassettate, es. **[ORGANIZZAZIONE: STRUTTURATA]**, **[PROFILO DI RISCHIO: MITIGATO]** ad inizio di paragrafi per dare un look premium.
2. **Executive Callout (Blockquotes)**: Utilizza citazioni o note in evidenza usando il blocco quote (\`>\`) per evidenziare i "Comments" o "Strategie".
3. **Punti Elenco Gerarchici**: Non usare solo elenchi piatti. Usa simboli di classe come \`✦\` o \`▪\` per i punti di forza/opportunità.
4. **Markdown Pulito**: Niente log di sistema, nessun tag di debug o ASCII art.

La relazione deve essere scritta interamente in lingua italiana e strutturata TASSATIVAMENTE sotto queste 14 sezioni obbligatorie, numerate rigidamente da 1 a 14:

1. CENNI STORICI
   (Anno e modalità di fondazione, evoluzione storica, tappe significative, cambi governance, riconoscimenti o premi, evoluzione del modello di business come transizione green/digitalizzazione, radicamento territoriale e posizionamento).

2. ORGANIZZAZIONE DELL'IMPRESA
   (Macro-aree di offerta, catalogo per linee di business, struttura commerciale con canali B2B/B2C, agenti o vendite dirette, organizzazione logistica e operativa con magazzini e sistemi informativi, dati dimensionali come fatturato e numero dipendenti, ed eventuali marchi proprietari o private label).

3. NOTE SU SOCI, AMMINISTRATORI, SINDACI E TITOLARI EFFETTIVI
   (Composizione soci, quote e ruoli, cariche sociali correnti come amministratori o sindaci, ricambio generazionale o sostituibilità del management, valutazione qualitativa sul dominus/key man come reputazione e affidabilità morale).

4. PUNTI DI FORZA DELL'AZIENDA
   (Stabilità gestionale, innovazione tecnologica, competenze del personale, strategie di fornitura, asset proprietari come marchi, immobili o stabilimenti logistici, vantaggi competitivi).

5. PUNTI DI DEBOLEZZA DELL'AZIENDA
   (Criticità riscontrate o indicare 'nulla di cui si abbia conoscenza', rischi geografici, di concentrazione o gap generazionali. Se assenti descriverlo esplicitamente).

6. DESCRIZIONE PRINCIPALI PRODOTTI / ORGANIZZAZIONE COMMERCIALE
   (Dettaglio delle categorie merceologiche, canali fisici o digitali, servizi a valore aggiunto come progettazione o assistenza post-vendita, logistica e stoccaggio ordini, nonchè efficacia commerciale riscontrata).

7. INFORMAZIONI, STORIA E PRECEDENTI SIGNIFICATIVI DEL CLIENTE
   (Sintesi storica orientata al merito creditizio e alle tappe di crescita, progetti rilevanti realizzati come grandi forniture o installazioni industriali, certificazioni chiave di qualità, sostenibilità o industria 4.0).

8. ASPETTI DI FORZA DEL CLIENTE (sezione VALUTAZIONI)
   (Governance aziendale, continuità manageriale, efficienza operativa, driver di crescita, investimenti recenti in logistica/impianti industriali, posizionamento competitivo).

9. ASPETTI DI DEBOLEZZA DEL CLIENTE (sezione VALUTAZIONI)
   (Criticità o assenza di elementi bloccanti, mitiganti sul rischio complessivo del cliente).

10. SITUAZIONE DI MERCATO / CONCORRENZA
    (Fase ciclica e macro-scenario del settore, driver di domanda come transizione energetica o automazione, competitors del mercato, posizionamento distintivo e scalabilità competitiva dell'azienda).

11. PRESENTAZIONE DEL CLIENTE
    (Sintesi istituzionale, missione, offerta di valore sul mercato, ambiti applicativi industriale, civile o residenziale, elementi distintivi come affidabilità tecnica e sostenibilità).

12. ANDAMENTO DEI CONTI E CONSIDERAZIONI SUL LAVORO RISERVATOCI RISPETTO AL GIRO D'AFFARI DEL CLIENTE
    (Sintetizza i dati forniti dall'utente sul conto corrente. Se non sono compilati o non sono presenti nel campo specifico, elenca e visualizza il promemoria chiaro e ordinato per ricordare all'utente tutti gli indicatori che si impegna a fornire: Anzianità del rapporto, Qualità comportamentale degli utilizzi, Movimentazione, Insoluti, Redditività/intermediazione per la banca, Rating/score Gianos, Pricing tassi/commissioni).

13. COMMENTO BILANCIO RICLASSIFICATO
    (Commento finanziario approfondito, di livello Senior ed esauriente, su ricavi, margini operativi EBITDA/EBIT, leva finanziaria PFN/EBITDA, Equity Ratio, capitale circolante statico e dinamico, equilibrio di liquidità e DSCR. RICORDA: Tassativo eliminare tabelle sintetiche del bilancio o elenchi ridondanti, spiega estesamente in prosa continuativa le dinamiche).

14. COMMENTO CENTRALE RISCHI
    (Istituti segnalanti, accordato vs utilizzato, regolarità di fidi a revoca, autoliquidanti e a scadenza, garanzie acquisite personali/MCC, coerenza coi dati finanziari).

Sviluppa testi ampi, discorsivi, professionali e formali di livello Executive per ogni capitolo. Evita sintesi sintatticamente povere, frasi di una riga o markdown grezzo incompleto.`;

    const userInstructionsPrompt = `
Dati Finanziari Storici Consolidati estratti:
${financialTableText}

Dati Previsionali e Prospettici (BILCE) inseriti:
${forecastTableText || "Nessun dato previsionale registrato a sistema."}

Descrizione e motivazione dell'operazione:
${pratica.descrizioneOperazione || "Istruttoria fidi ordinaria a supporto di esigenze aziendali."}

Andamento conti e redditività con la banca (campo inserito dall'utente per la sezione 12):
${pratica.andamentoContiBanca ? pratica.andamentoContiBanca : "Nessuna inserita. Mostra il promemoria con l'elenco delle informazioni necessarie."}

Note Addizionali del Gestore Corporate:
${pratica.noteLibere ? pratica.noteLibere : "Nessuna nota aggiuntiva fornita. Se non vi sono note specifiche, ignora ed esegui la stesura in base ai documenti."}

Documenti allegati negli slot di caricamento:
${uploadedDocsInfo.length > 0 ? uploadedDocsInfo.join("\n") : "Solo i dati di bilancio inseriti."}

SETTORE MERCEOLOGICO: ${pratica.settoreAttivita || "Da definire"}

Genera la Relazione Commerciale Evoluta completa in Markdown italiano rispettando fedelmente le 14 sezioni sopra descritte.`;

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
    
    const allPratiche = readPratiche();
    const updatedPraticheList = allPratiche.map(p => p.id === id ? pratica : p);
    writePratiche(updatedPraticheList);
    
    res.json(pratica);
    
  } catch (error: any) {
    console.error("Report generation error:", error);
    res.status(500).json({ error: error.message || "Impossibile generare la relazione commerciale AI." });
  }
});

// 6. Save manual edits list
app.put("/api/pratiche/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const email = (req as any).userEmail;
  const { markdownReport, descrizioneOperazione, aziendaName, settoreAttivita, status, financialData, forecastData, alerts, noteLibere, numeroPratica, cdgCliente, andamentoContiBanca } = req.body;
  
  const check = getPraticaWithOwnerCheck(id, email);
  if (check.error) return res.status(check.status).json({ error: check.error });
  
  const pratiche = readPratiche();
  const index = check.index!;
  const Pratica = pratiche[index];
  
  if (markdownReport !== undefined) Pratica.markdownReport = markdownReport;
  if (descrizioneOperazione !== undefined) Pratica.descrizioneOperazione = descrizioneOperazione;
  if (aziendaName !== undefined) Pratica.aziendaName = aziendaName;
  if (settoreAttivita !== undefined) Pratica.settoreAttivita = settoreAttivita;
  if (status !== undefined) Pratica.status = status;
  if (noteLibere !== undefined) Pratica.noteLibere = noteLibere;
  if (numeroPratica !== undefined) Pratica.numeroPratica = numeroPratica;
  if (cdgCliente !== undefined) Pratica.cdgCliente = cdgCliente;
  if (andamentoContiBanca !== undefined) Pratica.andamentoContiBanca = andamentoContiBanca;
  if (financialData !== undefined) {
    Pratica.financialData = financialData;
    // Re-evaluate alerts if financialData was customized
    Pratica.alerts = computeAlerts(financialData);
  }
  if (forecastData !== undefined) {
    Pratica.forecastData = forecastData;
  }
  if (alerts !== undefined) Pratica.alerts = alerts;
  
  writePratiche(pratiche);
  res.json(Pratica);
});

// 7. Delete practice
app.delete("/api/pratiche/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const email = (req as any).userEmail;
  
  const check = getPraticaWithOwnerCheck(id, email);
  if (check.error) return res.status(check.status).json({ error: check.error });
  
  const pratiche = readPratiche();
  const filtered = pratiche.filter((p) => p.id !== id);
  writePratiche(filtered);
  res.json({ success: true, message: "Pratica eliminata con successo." });
});

// 8. Download as Word (.doc) stream
app.post("/api/pratiche/:id/export/word", authenticate, (req, res) => {
  const { id } = req.params;
  const email = (req as any).userEmail;
  
  const check = getPraticaWithOwnerCheck(id, email);
  if (check.error) return res.status(check.status).send(check.error);
  
  const pr = check.pratica!;
  const payloadMarkdown = pr.markdownReport || "Nessun report generato.";
  const cleanHtml = simpleMarkdownToHtml(
    payloadMarkdown,
    pr.aziendaName,
    pr.numeroPratica || "Nessun Codice",
    pr.cdgCliente || "Nessun CDG",
    pr.settoreAttivita || "Non specificato"
  );
  
  // Clean special characters for MS word header compatibility
  const filename = `${pr.aziendaName.replace(/[^a-zA-Z0-9]/g, "_")}_Relazione_Istruttoria.doc`;
  
  res.setHeader("Content-Type", "application/msword; charset=UTF-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.write('\ufeff'); // Write UTF-8 byte order mark so Word understands all accents natively
  res.end(cleanHtml);
});

// 9. Premium print rendering tab
app.get("/api/pratiche/:id/print", authenticate, (req, res) => {
  const { id } = req.params;
  const email = (req as any).userEmail;
  
  const check = getPraticaWithOwnerCheck(id, email);
  if (check.error) return res.status(check.status).send(`<h1>Errore</h1><p>${check.error}</p>`);
  
  const pr = check.pratica!;
  const compiledHtml = renderMarkdownToHtmlForPrint(
    pr.aziendaName,
    pr.numeroPratica || "Nessun Codice",
    pr.cdgCliente || "Nessun CDG",
    pr.settoreAttivita || "Non specificato",
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
    console.log(`Massimo Malamisura Credit Server running securely on port ${PORT}`);
  });
}

startServer();
