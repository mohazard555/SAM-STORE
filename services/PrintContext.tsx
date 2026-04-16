
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
    // Give it a moment to render then print
    setTimeout(() => {
      if ((window as any).AppCompatibility) {
        (window as any).AppCompatibility.safePrint();
      } else {
        window.print();
      }
      // Clear content after a longer delay to ensure print dialog is handled
      setTimeout(() => setPrintContent(null), 1000);
    }, 500);
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
