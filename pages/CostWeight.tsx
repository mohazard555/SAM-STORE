
import React, { useState, useMemo, useEffect } from 'react';
import { Material, WeightCalculation, User, SettingsData } from '@/types';
import { usePrint } from '@/services/PrintContext';
import { 
  Scale, History, Save, Search, Printer, Download, 
  ChevronUp, ChevronDown, CheckCircle2, FileText, 
  Calendar, Trash2, Package, RefreshCcw, Edit3
} from 'lucide-react';
import { getWeightCalculations, addWeightCalculation, deleteWeightCalculation, updateMaterial } from '@/services/mockApi';
import * as XLSX from 'xlsx';
import { exportToExcel } from '@/utils/excelExport';

interface CostWeightProps {
  materials: Material[];
  user: User;
  settings?: SettingsData;
  onMaterialUpdate: () => void;
}

const CostWeight: React.FC<CostWeightProps> = ({ materials, user, settings, onMaterialUpdate }) => {
  const { triggerPrint } = usePrint();
  // --- Calculator State ---
  const [calcTitle, setCalcTitle] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [pieceCount, setPieceCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [savedCalculations, setSavedCalculations] = useState<WeightCalculation[]>([]);

  // --- Formula Edit State ---
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [editPieces, setEditPieces] = useState(100);
  const [editWeight, setEditWeight] = useState(5);

  // --- Archive Filters ---
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveStartDate, setArchiveStartDate] = useState('');
  const [archiveEndDate, setArchiveEndDate] = useState('');

  useEffect(() => {
    setSavedCalculations(getWeightCalculations());
  }, []);

  const pieceMaterials = useMemo(() => materials.filter(m => m.unit === 'قطعة' || m.unit === 'حبة'), [materials]);
  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  const formula = selectedMaterial?.weightFormula || { pieces: 100, weight: 5 };

  const totalWeight = useMemo(() => {
    if (!selectedMaterial || pieceCount <= 0) return 0;
    return (pieceCount / formula.pieces) * formula.weight;
  }, [selectedMaterial, pieceCount, formula]);

  const handleSaveCalculation = () => {
    if (!selectedMaterial) {
      alert('يرجى اختيار مادة.');
      return;
    }
    const newCalc = addWeightCalculation({
      title: calcTitle || `حساب وزن لـ ${selectedMaterial.name}`,
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      pieceCount,
      standardPieces: formula.pieces,
      standardWeight: formula.weight,
      totalWeight,
      notes
    });
    setSavedCalculations([newCalc, ...savedCalculations]);
    setCalcTitle('');
    setPieceCount(0);
    setNotes('');
    alert('تم حفظ عملية الحساب بنجاح');
  };

  const handleDeleteCalculation = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      deleteWeightCalculation(id);
      setSavedCalculations(savedCalculations.filter(c => c.id !== id));
    }
  };

  const handleUpdateFormula = () => {
    if (!selectedMaterial) return;
    const updatedMaterial = {
      ...selectedMaterial,
      weightFormula: {
        pieces: editPieces,
        weight: editWeight
      }
    };
    updateMaterial(updatedMaterial);
    onMaterialUpdate();
    setIsEditingFormula(false);
    alert('تم تحديث معادلة الوزن للمادة بنجاح');
  };

  const filteredArchive = useMemo(() => {
    return savedCalculations.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(archiveSearch.toLowerCase()) || 
                            c.materialName.toLowerCase().includes(archiveSearch.toLowerCase());
      const cDate = new Date(c.date);
      const matchesStartDate = archiveStartDate === '' || cDate >= new Date(archiveStartDate);
      const matchesEndDate = archiveEndDate === '' || cDate <= new Date(archiveEndDate + 'T23:59:59');
      return matchesSearch && matchesStartDate && matchesEndDate;
    });
  }, [savedCalculations, archiveSearch, archiveStartDate, archiveEndDate]);

  const handlePrintArchive = () => {
    const tableContent = filteredArchive.map(c => `
      <tr>
        <td>${c.title}</td>
        <td>${new Date(c.date).toLocaleString('ar-EG')}</td>
        <td>${c.materialName}</td>
        <td>${c.pieceCount}</td>
        <td>${c.standardPieces} ق = ${c.standardWeight} كغم</td>
        <td>${c.totalWeight.toFixed(2)} كغم</td>
      </tr>
    `).join('');

    const html = `
      <div class="print-container">
        <style>
          .print-container { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; background: white; color: black; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
          .header img { max-width: 80px; max-height: 80px; }
          .company-info { text-align: right; }
          .report-title { text-align: center; margin-bottom: 20px; font-size: 1.5em; }
          table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f2f2f2; }
        </style>
        <div class="header">
          ${settings?.companyLogo ? `<img src="${settings.companyLogo}" alt="Logo">` : '<div></div>'}
          <div class="company-info">
            <h2>${settings?.companyName || ''}</h2>
            <p>${settings?.companyAddress || ''}</p>
          </div>
        </div>
        <h2 class="report-title">أرشيف حاسبة الوزن</h2>
        <table>
          <thead>
            <tr>
              <th>العنوان</th>
              <th>التاريخ</th>
              <th>المادة</th>
              <th>عدد القطع</th>
              <th>المعيار</th>
              <th>الوزن الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>
      </div>
    `;
    triggerPrint(html);
  };

  const handleExportArchive = async () => {
    const data = filteredArchive.map(c => ({
      'العنوان': c.title,
      'التاريخ': new Date(c.date).toLocaleString('ar-EG'),
      'المادة': c.materialName,
      'عدد القطع': c.pieceCount,
      'المعيار (قطع)': c.standardPieces,
      'المعيار (وزن)': c.standardWeight,
      'الوزن الإجمالي': c.totalWeight,
      'ملاحظات': c.notes || ''
    }));
    await exportToExcel(data, "weight_calculator_archive", "أرشيف حاسبة الوزن");
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Scale className="text-emerald-500" size={32} />
          حاسبة الكلف بالوزن
        </h1>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sky-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm no-print"
        >
          <History size={18} />
          {showHistory ? 'العودة للحاسبة' : 'أرشيف العمليات'}
        </button>
      </div>

      {showHistory ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Archive Filters */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 no-print">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث في الأرشيف..." 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="date" 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  value={archiveStartDate}
                  onChange={(e) => setArchiveStartDate(e.target.value)}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="date" 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  value={archiveEndDate}
                  onChange={(e) => setArchiveEndDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrintArchive} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 transition-colors">
                  <Printer size={18} /> طباعة
                </button>
                <button onClick={handleExportArchive} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                  <Download size={18} /> تصدير
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredArchive.length > 0 ? filteredArchive.map(calc => (
              <div key={calc.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{calc.title}</h3>
                    <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full font-bold">
                      {calc.totalWeight.toFixed(2)} كغم
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1"><Calendar size={14}/> {new Date(calc.date).toLocaleDateString('ar-EG')}</div>
                    <div className="flex items-center gap-1"><Package size={14}/> {calc.materialName}</div>
                    <div className="flex items-center gap-1 font-bold text-sky-600">القطع: {calc.pieceCount}</div>
                    <div className="flex items-center gap-1">المعيار: {calc.standardPieces} ق = {calc.standardWeight} كغم</div>
                  </div>
                  {calc.notes && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 border-r-2 border-gray-200 dark:border-gray-700 pr-3 italic">
                      {calc.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center no-print">
                  <button onClick={() => handleDeleteCalculation(calc.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <History size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">لا يوجد سجلات محفوظة تطابق البحث</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4">
          {/* Input Form */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">عنوان العملية</label>
                <input 
                  type="text" 
                  placeholder="مثال: وزن طلبية رقم 101" 
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  value={calcTitle}
                  onChange={(e) => setCalcTitle(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">المادة (الوحدة: قطعة/حبة)</label>
                <select 
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  value={selectedMaterialId}
                  onChange={(e) => {
                    setSelectedMaterialId(e.target.value);
                    const mat = materials.find(m => m.id === e.target.value);
                    if (mat?.weightFormula) {
                      setEditPieces(mat.weightFormula.pieces);
                      setEditWeight(mat.weightFormula.weight);
                    }
                  }}
                >
                  <option value="">-- اختر مادة --</option>
                  {pieceMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              {selectedMaterial && (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">معادلة الوزن الحالية:</span>
                    <button 
                      onClick={() => setIsEditingFormula(!isEditingFormula)}
                      className="text-xs text-sky-500 flex items-center gap-1 hover:underline"
                    >
                      <Edit3 size={12} /> {isEditingFormula ? 'إلغاء التعديل' : 'تعديل المعادلة'}
                    </button>
                  </div>
                  
                  {isEditingFormula ? (
                    <div className="flex items-center gap-3 animate-in zoom-in-95">
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-500">عدد القطع</label>
                        <input 
                          type="number" 
                          step="0.1"
                          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                          value={editPieces}
                          onChange={(e) => setEditPieces(Number(e.target.value))}
                        />
                      </div>
                      <span className="mt-4">=</span>
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-500">الوزن (كغم)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                          value={editWeight}
                          onChange={(e) => setEditWeight(Number(e.target.value))}
                        />
                      </div>
                      <button 
                        onClick={handleUpdateFormula}
                        className="mt-4 p-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                      >
                        <RefreshCcw size={16} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-lg font-black text-emerald-800 dark:text-emerald-300">
                      كل {formula.pieces} قطعة = {formula.weight} كغم
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">عدد القطع المطلوب حساب وزنها</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.1"
                  placeholder="أدخل العدد..."
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  value={pieceCount || ''}
                  onChange={(e) => setPieceCount(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ملاحظات</label>
                <textarea 
                  rows={2}
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <button 
              disabled={!selectedMaterial || pieceCount <= 0}
              onClick={handleSaveCalculation}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              <Save size={20} />
              حفظ العملية في الأرشيف
            </button>
          </div>

          {/* Results Display */}
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-10 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between shadow-xl">
            <div>
              <h4 className="text-emerald-800 dark:text-emerald-300 font-black text-2xl mb-8 border-b border-emerald-200 dark:border-emerald-800 pb-4">نتائج الحساب</h4>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                  <span className="text-sm">المادة المختارة:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{selectedMaterial?.name || '---'}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                  <span className="text-sm">العدد المطلوب:</span>
                  <span className="font-black text-2xl text-emerald-600 dark:text-emerald-400">{pieceCount} قطعة</span>
                </div>
                
                <div className="pt-8 space-y-4">
                  <p className="text-xs text-emerald-400 uppercase tracking-widest font-bold">المعادلة المستخدمة:</p>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-r-4 border-emerald-500">
                    <p className="text-sm text-gray-500 mb-1">الوزن المعياري للمادة:</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      كل <span className="text-emerald-500">{formula.pieces}</span> قطعة تزن <span className="text-emerald-500">{formula.weight}</span> كغم
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-r-4 border-sky-500">
                    <p className="text-sm text-gray-500 mb-1">طريقة الحساب:</p>
                    <p className="text-xs font-mono text-gray-400">
                      ({pieceCount} / {formula.pieces}) × {formula.weight} = {totalWeight.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-emerald-200 dark:border-emerald-800">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">الوزن الإجمالي النهائي</p>
                  <p className="text-6xl font-black text-emerald-700 dark:text-emerald-300 mt-2">
                    {totalWeight.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                    <span className="text-xl font-normal mr-3">كغم</span>
                  </p>
                </div>
                <div className="bg-emerald-500 text-white p-5 rounded-3xl shadow-2xl shadow-emerald-500/50">
                  <CheckCircle2 size={48} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostWeight;
