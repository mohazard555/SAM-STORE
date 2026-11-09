import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, RefreshCw, Volume2, VolumeX, CheckCircle, Keyboard } from 'lucide-react';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

export const playScanBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 note
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio error
  }
};

const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'مسح الباركود بالكاميرا',
  description = 'وجّه الكاميرا نحو الباركود أو رمز QR لقراءته مباشرة'
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch (e) {}
        scannerRef.current = null;
      }
      setCameraError(null);
      setIsInitializing(true);
      setScannedResult(null);
      return;
    }

    let isMounted = true;
    setIsInitializing(true);
    setCameraError(null);
    setScannedResult(null);

    const startCamera = async () => {
      try {
        const elementId = 'interactive-camera-preview-region';
        const element = document.getElementById(elementId);
        if (!element) return;

        // Clean up previous instance
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
          } catch (e) {}
          scannerRef.current = null;
        }

        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode },
          {
            fps: 15,
            qrbox: { width: 280, height: 180 },
            aspectRatio: 1.333,
          },
          (decodedText) => {
            if (!isMounted || isStoppingRef.current) return;
            isStoppingRef.current = true;
            
            if (soundEnabled) {
              playScanBeep();
            }

            setScannedResult(decodedText);

            try {
              if (scanner.isScanning) {
                scanner.stop().catch(() => {});
              }
            } catch (e) {}

            setTimeout(() => {
              isStoppingRef.current = false;
              onScan(decodedText);
              onClose();
            }, 600);
          },
          () => {
            // Frame scanned with no code found
          }
        );

        if (isMounted) {
          setIsInitializing(false);
          setCameraError(null);
        }
      } catch (err: any) {
        console.error('Camera Scanner Error:', err);
        if (isMounted) {
          setIsInitializing(false);
          setCameraError(
            err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
              ? 'يرجى السماح للتطبيق بالوصول إلى الكاميرا من إعدادات المتصفح.'
              : 'تعذر تشغيل الكاميرا على هذا الجهاز، يمكنك استخدام الإدخال اليدوي أدناه.'
          );
        }
      }
    };

    const timer = setTimeout(startCamera, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    if (soundEnabled) playScanBeep();
    onScan(manualCode.trim());
    onClose();
  };

  const handleFlipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col text-right" style={{ direction: 'rtl' }}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Area */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
          
          <div id="interactive-camera-preview-region" className="w-full h-full max-h-[360px] overflow-hidden" />

          {/* Scanner Overlay Guide */}
          {!cameraError && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-40 border-2 border-dashed border-emerald-400/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                
                {/* Laser animation */}
                <div className="w-full h-0.5 bg-emerald-400 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-sm shadow-emerald-400"></div>
              </div>
            </div>
          )}

          {/* Scanned success alert */}
          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 z-20 animate-in zoom-in-95">
              <CheckCircle size={56} className="text-emerald-400 mb-2 animate-bounce" />
              <span className="font-bold text-lg">تمت قراءة الباركود بنجاح!</span>
              <span className="font-mono text-sm bg-emerald-900/80 border border-emerald-600 px-3 py-1 rounded-lg mt-2 text-emerald-200">
                {scannedResult}
              </span>
            </div>
          )}

          {/* Loading Indicator */}
          {isInitializing && !cameraError && (
            <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center text-white gap-3 z-10">
              <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium">جاري تشغيل الكاميرا...</p>
            </div>
          )}

          {/* Error Message */}
          {cameraError && (
            <div className="p-6 text-center text-white max-w-sm">
              <AlertCircle size={40} className="text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-gray-200 mb-4">{cameraError}</p>
            </div>
          )}

          {/* Controls Bar over Camera */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-10 pointer-events-auto">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm text-xs flex items-center gap-1.5 transition-all"
              title={soundEnabled ? 'كتم صوت الصافرة' : 'تفعيل صوت الصافرة'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="text-[11px]">{soundEnabled ? 'الصوت مفعل' : 'صامت'}</span>
            </button>

            <button
              onClick={handleFlipCamera}
              className="p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm text-xs flex items-center gap-1.5 transition-all"
              title="تبديل الكاميرا الخلفية / الأمامية"
            >
              <RefreshCw size={16} />
              <span className="text-[11px]">{facingMode === 'environment' ? 'كاميرا خلفية' : 'كاميرا أمامية'}</span>
            </button>
          </div>
        </div>

        {/* Manual Code Input Fallback */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/70 border-t border-gray-100 dark:border-gray-800">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="أو اكتب/الصق كود الباركود هنا يدوياً..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0"
            >
              إدخال
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default CameraBarcodeScannerModal;
