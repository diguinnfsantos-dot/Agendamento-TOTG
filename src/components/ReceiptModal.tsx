import React, { useState, useEffect, useRef } from 'react';
import { Appointment, SystemRule } from '../types';
import { formatDateBR, getDayOfWeekName } from '../utils/formatters';
import { 
  Printer, 
  X, 
  Building, 
  CheckCircle2, 
  FileDown, 
  HelpCircle, 
  SlidersHorizontal,
  Copy,
  Check,
  FileCode,
  Download,
  Calendar,
  Clock,
  User,
  Phone,
  ShieldCheck
} from 'lucide-react';

interface ReceiptModalProps {
  appointment: Appointment | null;
  rules: SystemRule;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  appointment,
  rules,
  onClose,
}) => {
  if (!appointment) return null;

  const [printFormat, setPrintFormat] = useState<'A4' | 'THERMAL'>('A4');
  const [showPrinterGuide, setShowPrinterGuide] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Guarantee that on opening, the scroll starts at the very top
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [appointment]);

  // Keyboard shortcut listener (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Build clean Standalone HTML for direct printing and downloading
  const generatePrintableHTML = (format: 'A4' | 'THERMAL') => {
    const emissionDate = new Date().toLocaleString('pt-BR');
    const isThermal = format === 'THERMAL';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante_${appointment.paciente.paciente.replace(/\s+/g, '_')}_${appointment.data}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: ${isThermal ? '6px' : '20px'};
      font-size: ${isThermal ? '11px' : '13px'};
      line-height: 1.4;
    }
    .receipt-container {
      max-width: ${isThermal ? '76mm' : '700px'};
      margin: 0 auto;
      border: ${isThermal ? '1px dashed #64748b' : '1px solid #cbd5e1'};
      border-radius: ${isThermal ? '4px' : '10px'};
      padding: ${isThermal ? '10px 8px' : '24px 28px'};
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: ${isThermal ? '8px' : '14px'};
      margin-bottom: ${isThermal ? '8px' : '16px'};
    }
    .header h1 {
      font-size: ${isThermal ? '13px' : '18px'};
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header p {
      font-size: ${isThermal ? '10px' : '11px'};
      color: #475569;
      margin-top: 2px;
    }
    .badge {
      display: inline-block;
      margin-top: 6px;
      padding: ${isThermal ? '3px 6px' : '4px 10px'};
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      font-weight: bold;
      font-size: ${isThermal ? '10px' : '11px'};
      text-transform: uppercase;
    }
    .section-box {
      background: ${isThermal ? '#ffffff' : '#f8fafc'};
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: ${isThermal ? '6px' : '10px 14px'};
      margin-bottom: ${isThermal ? '8px' : '12px'};
    }
    .section-title {
      font-size: ${isThermal ? '10px' : '11px'};
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: ${isThermal ? '1fr' : '1fr 1fr'};
      gap: ${isThermal ? '4px' : '8px 16px'};
    }
    .field-label {
      font-size: ${isThermal ? '9.5px' : '10.5px'};
      color: #64748b;
      font-weight: 500;
    }
    .field-value {
      font-size: ${isThermal ? '11px' : '13px'};
      font-weight: bold;
      color: #0f172a;
    }
    .field-value-highlight {
      font-size: ${isThermal ? '12px' : '15px'};
      font-weight: 900;
      color: #1d4ed8;
      font-family: monospace;
    }
    .notice-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: ${isThermal ? '6px' : '10px 12px'};
      margin-bottom: ${isThermal ? '8px' : '12px'};
      font-size: ${isThermal ? '9.5px' : '11px'};
      color: #92400e;
    }
    .notice-box strong {
      display: block;
      margin-bottom: 3px;
      color: #78350f;
    }
    .notice-box ul {
      padding-left: 16px;
    }
    .notice-box li {
      margin-bottom: 2px;
    }
    .footer-auth {
      text-align: center;
      font-size: ${isThermal ? '9px' : '10px'};
      font-family: monospace;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 8px;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .receipt-container {
        border: ${isThermal ? 'none' : '1px solid #000'};
        padding: ${isThermal ? '4px' : '16px'};
        max-width: 100%;
      }
      .no-print { display: none !important; }
      @page {
        size: ${isThermal ? '80mm auto' : 'portrait'};
        margin: ${isThermal ? '3mm' : '10mm'};
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h1>${rules.nomeClinica}</h1>
      <p>${rules.enderecoClinica}</p>
      <p>Central de Atendimento: ${rules.telefoneClinica}</p>
      <div class="badge">✓ COMPROVANTE DE AGENDAMENTO CONFIRMADO</div>
    </div>

    <!-- Dados da Consulta -->
    <div class="section-box">
      <div class="section-title">Dados da Consulta Médica</div>
      <div class="grid-2">
        <div>
          <div class="field-label">Especialidade Médica:</div>
          <div class="field-value">${appointment.especialidade}</div>
        </div>
        <div>
          <div class="field-label">Médico / Especialista:</div>
          <div class="field-value">${appointment.medico || 'Médico Plantonista'}</div>
        </div>
        <div>
          <div class="field-label">Data da Consulta:</div>
          <div class="field-value">${formatDateBR(appointment.data)} (${getDayOfWeekName(appointment.data)})</div>
        </div>
        <div>
          <div class="field-label">Horário Previsto:</div>
          <div class="field-value-highlight">${appointment.horario}</div>
        </div>
      </div>
    </div>

    <!-- Identificação do Paciente -->
    <div class="section-box">
      <div class="section-title">Identificação do Paciente</div>
      <div class="grid-2">
        <div style="grid-column: ${isThermal ? '1' : '1 / -1'};">
          <div class="field-label">Nome Completo:</div>
          <div class="field-value" style="font-size: ${isThermal ? '12px' : '14px'};">${appointment.paciente.paciente}</div>
        </div>
        <div>
          <div class="field-label">CPF:</div>
          <div class="field-value" style="font-family: monospace;">${appointment.paciente.cpf}</div>
        </div>
        <div>
          <div class="field-label">Cartão SUS (CNS):</div>
          <div class="field-value" style="font-family: monospace;">${appointment.paciente.sus}</div>
        </div>
        <div>
          <div class="field-label">Data de Nascimento:</div>
          <div class="field-value">${formatDateBR(appointment.paciente.nascido)}</div>
        </div>
        <div>
          <div class="field-label">Telefone de Contato:</div>
          <div class="field-value">${appointment.paciente.tel}</div>
        </div>
        <div style="grid-column: ${isThermal ? '1' : '1 / -1'};">
          <div class="field-label">Nome da Mãe:</div>
          <div class="field-value">${appointment.paciente.mae}</div>
        </div>
        <div style="grid-column: ${isThermal ? '1' : '1 / -1'};">
          <div class="field-label">Endereço / CEP:</div>
          <div class="field-value" style="font-size: ${isThermal ? '10px' : '12px'};">${appointment.paciente.endereco} - CEP: ${appointment.paciente.cep}</div>
        </div>
      </div>
    </div>

    <!-- Origem e Operador -->
    <div class="section-box">
      <div class="grid-2">
        <div>
          <div class="field-label">Posto Emissor (ID):</div>
          <div class="field-value">${appointment.postoId} • ${appointment.origem}</div>
        </div>
        <div>
          <div class="field-label">Operador Responsável:</div>
          <div class="field-value">${appointment.operadorNome}</div>
        </div>
      </div>
    </div>

    <!-- Recomendações -->
    <div class="notice-box">
      <strong>⚠️ Recomendações ao Paciente:</strong>
      <ul>
        <li>Comparecer com <strong>15 minutos de antecedência</strong> do horário agendado.</li>
        <li>Apresentar este comprovante, documento de identidade com foto e o Cartão SUS físico.</li>
        <li>Em caso de impossibilidade de comparecimento, favor comunicar seu posto de saúde com antecedência.</li>
      </ul>
    </div>

    <!-- Rodapé de Autenticidade -->
    <div class="footer-auth">
      Código de Autenticidade: ${appointment.id} • Emitido em: ${emissionDate}
    </div>
  </div>
</body>
</html>`;
  };

  // Robust Direct Printing Function with Hidden Iframe & Focus (Windows Print Dialog Trigger)
  const handlePrint = () => {
    const htmlContent = generatePrintableHTML(printFormat);

    // Create an invisible iframe to isolate the printable document
    const printIframe = document.createElement('iframe');
    printIframe.setAttribute('title', 'Impressão de Comprovante de Agendamento');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    printIframe.style.opacity = '0';
    printIframe.style.pointerEvents = 'none';
    document.body.appendChild(printIframe);

    try {
      const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();

        // Give the iframe browser rendering engine 300ms to parse styles
        setTimeout(() => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
          } catch (err) {
            console.warn('Iframe print error, falling back to window.print', err);
            window.print();
          }

          // Clean up the iframe after print dialog resolves
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 3000);
        }, 300);
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('Direct print fallback', e);
      window.print();
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
    }
  };

  // Generate plain text version for copy/txt
  const getPlainTextReceipt = () => {
    return `=====================================================
${rules.nomeClinica.toUpperCase()}
${rules.enderecoClinica}
Central de Atendimento: ${rules.telefoneClinica}
=====================================================
COMPROVANTE OFICIAL DE AGENDAMENTO MÉDICO
Código de Autenticidade: ${appointment.id}
Data de Emissão: ${new Date().toLocaleString('pt-BR')}
-----------------------------------------------------
DADOS DA CONSULTA:
Especialidade: ${appointment.especialidade}
Médico: ${appointment.medico || 'Médico Plantonista'}
Data: ${formatDateBR(appointment.data)} (${getDayOfWeekName(appointment.data)})
Horário Previsto: ${appointment.horario}

IDENTIFICAÇÃO DO PACIENTE:
Nome: ${appointment.paciente.paciente}
CPF: ${appointment.paciente.cpf}
Cartão SUS (CNS): ${appointment.paciente.sus}
Nascimento: ${formatDateBR(appointment.paciente.nascido)}
Telefone: ${appointment.paciente.tel}
Nome da Mãe: ${appointment.paciente.mae}
Endereço: ${appointment.paciente.endereco} - CEP: ${appointment.paciente.cep}

ORIGEM E EMISSÃO:
Posto Emissor: ${appointment.postoId} - ${appointment.origem}
Operador Responsável: ${appointment.operadorNome}

ORIENTAÇÕES:
- Comparecer com 15 minutos de antecedência.
- Apresentar este comprovante, documento com foto e Cartão SUS.
=====================================================`;
  };

  // Download Standalone Printable HTML File
  const handleDownloadHTML = () => {
    const htmlContent = generatePrintableHTML(printFormat);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovante_${appointment.paciente.paciente.replace(/\s+/g, '_')}_${appointment.data}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Plain Text File (.txt)
  const handleDownloadTextCopy = () => {
    const textContent = getPlainTextReceipt();
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovante_${appointment.paciente.paciente.replace(/\s+/g, '_')}_${appointment.data}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy Plain Text to Clipboard
  const handleCopyText = () => {
    const textContent = getPlainTextReceipt();
    navigator.clipboard.writeText(textContent).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    });
  };

  return (
    <div 
      id="receipt-modal-backdrop"
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 md:py-6 z-50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="receipt-modal-dialog"
        className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 my-auto flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 relative"
      >
        {/* TOP CONTROL HEADER - FIXED & ALWAYS VISIBLE */}
        <div className="bg-white px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 shrink-0 z-30 space-y-2.5 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                  Visualização & Impressão
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Comprovante de Agendamento Confirmado
              </h3>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-print-windows"
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                title="Abrir caixa de diálogo de impressoras do Windows (USB/Wi-Fi/Rede) ou Salvar em PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Salvar PDF</span>
              </button>

              <button
                id="btn-download-receipt-html"
                type="button"
                onClick={handleDownloadHTML}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Baixar cópia pronta para impressão (.HTML)"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Salvar HTML</span>
              </button>

              <button
                id="btn-download-receipt-txt"
                type="button"
                onClick={handleDownloadTextCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Baixar cópia em arquivo de texto simples (.txt)"
              >
                <FileDown className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">.TXT</span>
              </button>

              <button
                id="btn-copy-receipt-txt"
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Copiar texto completo para a área de transferência"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold hidden sm:inline">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Copiar</span>
                  </>
                )}
              </button>

              <button
                id="btn-close-receipt-modal"
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                title="Fechar comprovante (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Secondary Options Toolbar: Format & Guide */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs border-t border-slate-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700 text-[11px]">Formato:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPrintFormat('A4')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    printFormat === 'A4' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📄 Folha A4 Padrão
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('THERMAL')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    printFormat === 'THERMAL' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🧾 Cupom Térmico (80mm)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPrinterGuide(!showPrinterGuide)}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showPrinterGuide ? 'Ocultar Instruções' : 'Dúvidas de Impressão / Salvar PDF?'}</span>
            </button>
          </div>

          {/* Windows Printer & PDF Guide Box */}
          {showPrinterGuide && (
            <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5 animate-in fade-in duration-150">
              <p className="font-bold flex items-center gap-1.5 text-blue-950">
                <Printer className="w-3.5 h-3.5 text-blue-700" />
                Como funciona a impressão no Windows e navegadores:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-blue-800">
                <li>
                  <strong>Impressoras Físicas:</strong> Ao clicar no botão azul <em>"Imprimir / Salvar PDF"</em>, o sistema aciona a janela oficial de impressão do Windows com todas as suas impressoras configuradas (USB, Wi-Fi ou Rede).
                </li>
                <li>
                  <strong>Salvar em PDF:</strong> Na janela de impressão do seu computador, selecione <strong>"Salvar como PDF"</strong> ou <strong>"Microsoft Print to PDF"</strong> no campo de destino para salvar o arquivo direto no disco.
                </li>
                <li>
                  <strong>Download Direto:</strong> Você também pode usar os botões <strong>"Salvar HTML"</strong> ou <strong>".TXT"</strong> para arquivar o comprovante sem precisar imprimir.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* SCROLLABLE RECEIPT BODY - STARTS FROM THE VERY TOP */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 space-y-4"
        >
          {/* Printable Receipt Card */}
          <div 
            id="printable-receipt"
            className={`bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm font-sans text-xs text-slate-800 space-y-4 ${
              printFormat === 'THERMAL' ? 'max-w-[360px] mx-auto border-dashed border-2' : 'max-w-xl mx-auto'
            }`}
          >
            {/* Header */}
            <div className="text-center border-b border-slate-200 pb-3.5">
              <div className="flex items-center justify-center gap-2 text-slate-900 font-black text-base">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
                  <Building className="w-4 h-4 text-blue-400" />
                </div>
                <span>{rules.nomeClinica}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{rules.enderecoClinica}</p>
              <p className="text-[10px] text-slate-400 font-mono">Central de Atendimento: {rules.telefoneClinica}</p>
              <div className="mt-2.5 inline-block px-3 py-1 bg-emerald-50 text-emerald-900 font-bold rounded-lg text-[11px] border border-emerald-200">
                ✓ COMPROVANTE DE AGENDAMENTO CONFIRMADO
              </div>
            </div>

            {/* Dados da Consulta */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
              <h4 className="font-bold text-slate-900 text-[10px] uppercase tracking-wider font-mono border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Dados da Consulta Médica
              </h4>
              <div className={`grid gap-2 text-xs ${printFormat === 'THERMAL' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <span className="text-slate-500 text-[11px]">Especialidade:</span>
                  <p className="font-bold text-slate-900 text-sm">{appointment.especialidade}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Médico / Especialista:</span>
                  <p className="font-bold text-slate-900 text-sm">{appointment.medico || 'Médico Plantonista'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Data da Consulta:</span>
                  <p className="font-bold text-slate-900">
                    {formatDateBR(appointment.data)} ({getDayOfWeekName(appointment.data)})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Horário Previsto:</span>
                  <p className="font-black text-blue-700 font-mono text-base">{appointment.horario}</p>
                </div>
              </div>
            </div>

            {/* Dados do Paciente */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
              <h4 className="font-bold text-slate-900 text-[10px] uppercase tracking-wider font-mono border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Identificação do Paciente
              </h4>
              <div className={`grid gap-2 text-xs ${printFormat === 'THERMAL' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div className={printFormat === 'THERMAL' ? '' : 'col-span-2'}>
                  <span className="text-slate-500 text-[11px]">Nome do Paciente:</span>
                  <p className="font-black text-slate-900 text-sm">{appointment.paciente.paciente}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">CPF:</span>
                  <p className="font-mono font-bold text-slate-800">{appointment.paciente.cpf}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Cartão SUS (CNS):</span>
                  <p className="font-mono font-bold text-slate-800">{appointment.paciente.sus}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Data de Nascimento:</span>
                  <p className="font-semibold text-slate-800">{formatDateBR(appointment.paciente.nascido)}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Telefone / WhatsApp:</span>
                  <p className="font-semibold text-slate-800">{appointment.paciente.tel}</p>
                </div>
                <div className={printFormat === 'THERMAL' ? '' : 'col-span-2'}>
                  <span className="text-slate-500 text-[11px]">Nome da Mãe:</span>
                  <p className="font-semibold text-slate-800">{appointment.paciente.mae}</p>
                </div>
                <div className={printFormat === 'THERMAL' ? '' : 'col-span-2'}>
                  <span className="text-slate-500 text-[11px]">Endereço / CEP:</span>
                  <p className="text-slate-700">{appointment.paciente.endereco} - CEP: {appointment.paciente.cep}</p>
                </div>
              </div>
            </div>

            {/* Origem e Operador */}
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500">Posto Emissor (ID):</span>
                <p className="font-bold text-slate-800">{appointment.postoId} • {appointment.origem}</p>
              </div>
              <div>
                <span className="text-slate-500">Operador Responsável:</span>
                <p className="font-bold text-slate-800">{appointment.operadorNome}</p>
              </div>
            </div>

            {/* Orientações */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              <strong className="block mb-1 font-bold">⚠️ Recomendações ao Paciente:</strong>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Comparecer ao local com <strong>15 minutos de antecedência</strong>.</li>
                <li>Apresentar este comprovante, documento oficial com foto e o Cartão SUS físico.</li>
                <li>Em caso de impossibilidade de comparecimento, avisar seu posto emissor com antecedência.</li>
              </ul>
            </div>

            {/* Código de Autenticidade */}
            <div className="text-center text-[10px] text-slate-400 font-mono pt-1">
              Código de Autenticidade: {appointment.id} • Emitido em: {new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER BAR - QUICK ACTIONS */}
        <div className="bg-slate-50 px-4 py-3 sm:px-6 border-t border-slate-200 shrink-0 flex items-center justify-between z-20 no-print">
          <div className="text-[11px] text-slate-500">
            Código: <span className="font-mono font-bold text-slate-700">{appointment.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
