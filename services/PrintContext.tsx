
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PrintContextType {
  printContent: string | null;
  setPrintContent: (content: string | null) => void;
  triggerPrint: (content: string) => void;
}

const PrintContext = createContext<PrintContextType | undefined>(undefined);

export const PrintProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [printContent, setPrintContent] = useState<string | null>(null);

  const triggerPrint = (content: string) => {
    setPrintContent(content);

    // Use an isolated hidden iframe for 100% reliable multi-page printing without single-page clipping
    try {
      let printFrame = document.getElementById('app-print-frame') as HTMLIFrameElement | null;
      if (printFrame) {
        printFrame.remove();
      }

      printFrame = document.createElement('iframe');
      printFrame.id = 'app-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      printFrame.style.zIndex = '-9999';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (frameDoc && printFrame.contentWindow) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8" />
            <title>طباعة السند</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
              html, body {
                margin: 0;
                padding: 0;
                height: auto !important;
                min-height: auto !important;
                overflow: visible !important;
                font-family: 'Cairo', sans-serif;
                direction: rtl;
                background: white;
                color: #0f172a;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              * {
                box-sizing: border-box;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto !important;
              }
              thead {
                display: table-header-group !important;
              }
              tbody {
                page-break-inside: auto !important;
              }
              tr {
                page-break-inside: avoid !important;
                page-break-after: auto !important;
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
          </html>
        `);
        frameDoc.close();

        // Allow document, styles, and fonts to settle then print from isolated iframe
        setTimeout(() => {
          try {
            printFrame?.contentWindow?.focus();
            printFrame?.contentWindow?.print();
          } catch (err) {
            console.warn('Iframe print error, falling back to window.print', err);
            window.print();
          }
        }, 350);
        return;
      }
    } catch (e) {
      console.warn('Could not initialize print iframe, falling back to window.print', e);
    }

    // Direct window fallback
    setTimeout(() => {
      if ((window as any).AppCompatibility) {
        (window as any).AppCompatibility.safePrint();
      } else {
        window.print();
      }
    }, 400);
  };

  return (
    <PrintContext.Provider value={{ printContent, setPrintContent, triggerPrint }}>
      {children}
    </PrintContext.Provider>
  );
};

export const usePrint = () => {
  const context = useContext(PrintContext);
  if (context === undefined) {
    throw new Error('usePrint must be used within a PrintProvider');
  }
  return context;
};
