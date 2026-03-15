
import React, { useState, useMemo, useEffect } from 'react';
import { Material, CostCalculation, CostPart, User, CostTemplate, CostTemplatePart, SettingsData } from '@/types';
import { usePrint } from '@/services/PrintContext';
import { 
  Calculator, History, Plus, Trash2, Save, Search, 
  Printer, Download, ChevronUp, ChevronDown, CheckCircle2,
  FileText, Calendar, Filter, Package, LayoutTemplate, Copy, X
} from 'lucide-react';
import { getCostCalculations, addCostCalculation, deleteCostCalculation, getCostTemplates, addCostTemplate, deleteCostTemplate } from '@/services/mockApi';
import * as XLSX from 'xlsx';
import { exportToExcel } from '@/utils/excelExport';

interface CostMeterProps {
  materials: Material[];
  user: User;
  settings?: SettingsData;
}

const CostMeter: React.FC<CostMeterProps> = ({ materials, user, settings }) => {
  const { triggerPrint } = usePrint();
  // --- Calculator State ---
  const [calcTitle, setCalcTitle] = useState('');
  const [calcDescription, setCalcDescription] = useState('');
  const [calcMeasurement, setCalcMeasurement] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [pieceCount, setPieceCount] = useState(1);
  const [baseCost, setBaseCost] = useState(0);
  const [costParts, setCostParts] = useState<(Omit<CostPart, 'id'> & { materialId?: string })[]>([]);
  const [savedCalculations, setSavedCalculations] = useState<CostCalculation[]>([]);
  const [costTemplates, setCostTemplates] = useState<CostTemplate[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // --- Archive Filters ---
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveStartDate, setArchiveStartDate] = useState('');
  const [archiveEndDate, setArchiveEndDate] = useState('');

  // --- Template Form State ---
  const [templateModel, setTemplateModel] = useState('');
  const [templateSize, setTemplateSize] = useState('');

  useEffect(() => {
    setSavedCalculations(getCostCalculations());
    setCostTemplates(getCostTemplates());
  }, []);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  const totalPartsCostPerPiece = costParts.reduce((sum, p) => sum + p.valuePerPiece, 0);
  const totalCostPerPiece = baseCost + totalPartsCostPerPiece;
  const grandTotal = totalCostPerPiece * pieceCount;

  const handleAddPart = () => {
    setCostParts([...costParts, { name: '', valuePerPiece: 0, materialId: '' }]);
  };

  const handleRemovePart = (index: number) => {
    setCostParts(costParts.filter((_, i) => i !== index));
  };

  const handlePartChange = (index: number, field: string, value: string | number) => {
    const newParts = [...costParts];
    newParts[index] = { ...newParts[index], [field]: value };
    setCostParts(newParts);
  };

  const handleSaveCalculation = () => {
    if (!selectedMaterial && !calcTitle) {
      alert('يرجى إدخال عنوان للعملية أو اختيار مادة أساسية.');
      return;
    }
    const newCalc = addCostCalculation({
      title: calcTitle || `حساب لـ ${selectedMaterial?.name || 'مادة غير محددة'}`,
      description: calcDescription,
      measurement: calcMeasurement,
      materialId: selectedMaterial?.id || '',
      materialName: selectedMaterial?.name || '',
      pieceCount,
      baseCostPerPiece: baseCost,
      parts: costParts.map((p, i) => ({ 
        ...p, 
        id: `p${i}`,
        materialName: materials.find(m => m.id === p.materialId)?.name
      })),
      totalCost: grandTotal
    });
    setSavedCalculations([newCalc, ...savedCalculations]);
    setCalcTitle('');
    setCalcDescription('');
    setCalcMeasurement('');
    setCostParts([]);
    setBaseCost(0);
    alert('تم حفظ عملية الحساب بنجاح');
  };

  const handleSaveAsTemplate = () => {
    if (!calcTitle) {
      alert('يرجى إدخال عنوان للنموذج');
      return;
    }
    const newTemplate = addCostTemplate({
      title: calcTitle,
      model: templateModel,
      size: templateSize || calcMeasurement,
      parts: costParts.map((p, i) => ({
        id: `tp${i}`,
        name: p.name,
        cost: p.valuePerPiece
      })),
      totalCost: totalCostPerPiece
    });
    setCostTemplates([newTemplate, ...costTemplates]);
    alert('تم حفظ النموذج بنجاح');
  };

  const handleLoadTemplate = (template: CostTemplate) => {
    setCalcTitle(template.title);
    setTemplateModel(template.model);
    setCalcMeasurement(template.size);
    setCostParts(template.parts.map(p => ({
      name: p.name,
      valuePerPiece: p.cost,
      materialId: ''
    })));
    setBaseCost(0);
    setShowTemplates(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا النموذج؟')) {
      deleteCostTemplate(id);
      setCostTemplates(costTemplates.filter(t => t.id !== id));
    }
  };

  const handleDeleteCalculation = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      deleteCostCalculation(id);
      setSavedCalculations(savedCalculations.filter(c => c.id !== id));
    }
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

  const handleExportArchive = () => {
    const data = filteredArchive.map(c => ({
      'العنوان': c.title,
      'التاريخ': new Date(c.date).toLocaleString('ar-EG'),
      'المادة': c.materialName,
      'القياس': c.measurement || '',
      'العدد': c.pieceCount,
      'التكلفة الإجمالية': c.totalCost,
      'الوصف': c.description || ''
    }));
    exportToExcel(data, "cost_meter_archive", "أرشيف حاسبة الكلف");
  };

  const handlePrintArchive = () => {
    const tableContent = filteredArchive.map(c => `
      <tr>
        <td>${c.title}</td>
        <td>${new Date(c.date).toLocaleString('ar-EG')}</td>
        <td>${c.materialName}</td>
        <td>${c.measurement || ''}</td>
        <td>${c.pieceCount}</td>
        <td>${c.totalCost.toFixed(2)}</td>
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
        <h2 class="report-title">أرشيف حاسبة الكلف بالمتر</h2>
        <table>
          <thead>
            <tr>
              <th>العنوان</th>
              <th>التاريخ</th>
              <th>المادة</th>
              <th>القياس</th>
              <th>العدد</th>
              <th>التكلفة الإجمالية</th>
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

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Calculator className="text-violet-500" size={32} />
          حاسبة الكلف بالمتر
        </h1>
        <div className="flex gap-2 no-print">
          <button 
            onClick={() => { setShowTemplates(!showTemplates); setShowHistory(false); }}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors shadow-sm ${
              showTemplates 
                ? 'bg-violet-500 text-white border-violet-500' 
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-violet-500 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <LayoutTemplate size={18} />
            نماذج جاهزة
          </button>
          <button 
            onClick={() => { setShowHistory(!showHistory); setShowTemplates(false); }}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors shadow-sm ${
              showHistory 
                ? 'bg-sky-500 text-white border-sky-500' 
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sky-500 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <History size={18} />
            {showHistory ? 'العودة للحاسبة' : 'أرشيف العمليات'}
          </button>
        </div>
      </div>

      {showTemplates ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {costTemplates.length > 0 ? costTemplates.map(template => (
              <div key={template.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="p-5 border-b dark:border-gray-700 bg-violet-50/50 dark:bg-violet-900/10 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{template.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{template.model} | {template.size}</p>
                  </div>
                  <button onClick={() => handleDeleteTemplate(template.id)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-5 flex-1 space-y-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">الأجزاء والتكلفة:</div>
                  {template.parts.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{p.name}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{p.cost.toFixed(3)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t dark:border-gray-700 flex justify-between items-center mt-auto">
                    <span className="text-xs font-bold text-violet-500">إجمالي التكلفة:</span>
                    <span className="text-lg font-black text-violet-600 dark:text-violet-400">{template.totalCost.toFixed(3)}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleLoadTemplate(template)}
                  className="w-full py-3 bg-violet-500 text-white font-bold hover:bg-violet-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={18} /> استخدام هذا النموذج
                </button>
              </div>
            )) : (
              <div className="col-span-full text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <LayoutTemplate size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">لا توجد نماذج محفوظة حالياً</p>
              </div>
            )}
          </div>
        </div>
      ) : showHistory ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Archive Filters */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 no-print">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث في الأرشيف..." 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="date" 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                  value={archiveStartDate}
                  onChange={(e) => setArchiveStartDate(e.target.value)}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="date" 
                  className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
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
                    <span className="text-xs px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full font-bold">
                      {calc.totalCost.toFixed(2)} {settings?.currencySymbol || 'ج.م'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1"><Calendar size={14}/> {new Date(calc.date).toLocaleDateString('ar-EG')}</div>
                    <div className="flex items-center gap-1"><FileText size={14}/> {calc.measurement || 'بدون قياس'}</div>
                    <div className="flex items-center gap-1"><Package size={14}/> {calc.materialName || 'بدون مادة'}</div>
                    <div className="flex items-center gap-1 font-bold text-emerald-600">العدد: {calc.pieceCount}</div>
                  </div>
                  {calc.description && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 border-r-2 border-gray-200 dark:border-gray-700 pr-3 italic">
                      {calc.description}
                    </p>
                  )}
                  {/* Parts breakdown in archive */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {calc.parts.map(p => (
                      <span key={p.id} className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                        {p.name}: {p.valuePerPiece}
                      </span>
                    ))}
                  </div>
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
                  placeholder="مثال: تفصيل خزانة غرفة نوم" 
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                  value={calcTitle}
                  onChange={(e) => setCalcTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">الموديل</label>
                  <input 
                    type="text" 
                    placeholder="مثال: محير / توب 160" 
                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                    value={templateModel}
                    onChange={(e) => setTemplateModel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">القياس</label>
                  <input 
                    type="text" 
                    placeholder="مثال: 10/12/14" 
                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                    value={calcMeasurement}
                    onChange={(e) => setCalcMeasurement(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">وصف إضافي</label>
                <input 
                  type="text" 
                  placeholder="ملاحظات..." 
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                  value={calcDescription}
                  onChange={(e) => setCalcDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">المادة الأساسية</label>
                <select 
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                >
                  <option value="">-- اختر مادة --</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">عدد القطع</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                  value={pieceCount}
                  onChange={(e) => setPieceCount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-gray-800 dark:text-gray-200">تفاصيل التكلفة للقطعة الواحدة</h4>
                <button 
                  onClick={handleAddPart}
                  className="flex items-center gap-2 text-xs bg-violet-500 text-white px-3 py-2 rounded-lg hover:bg-violet-600 transition-all shadow-md shadow-violet-500/20"
                >
                  <Plus size={14} /> إضافة جزء مستقل
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      readOnly 
                      value="التكلفة الأساسية" 
                      className="w-full p-2 bg-transparent text-sm font-bold text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  <div className="w-32">
                    <input 
                      type="number" 
                      placeholder="القيمة"
                      className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                      value={baseCost}
                      onChange={(e) => setBaseCost(Number(e.target.value))}
                    />
                  </div>
                  <div className="w-8"></div>
                </div>

                {costParts.map((part, index) => (
                  <div key={index} className="flex flex-col gap-2 p-4 border rounded-xl dark:border-gray-700 bg-white dark:bg-gray-800 animate-in fade-in slide-in-from-right-2 shadow-sm">
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          placeholder="اسم الجزء (خلف، جنب...)"
                          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                          value={part.name}
                          onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="w-32">
                        <input 
                          type="number" 
                          placeholder="القيمة"
                          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                          value={part.valuePerPiece}
                          onChange={(e) => handlePartChange(index, 'valuePerPiece', Number(e.target.value))}
                        />
                      </div>
                      <button onClick={() => handleRemovePart(index)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex gap-3 items-center">
                       <select 
                        className="flex-1 p-2 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                        value={part.materialId || ''}
                        onChange={(e) => handlePartChange(index, 'materialId', e.target.value)}
                      >
                        <option value="">-- مادة الجزء (اختياري) --</option>
                        {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                disabled={!selectedMaterialId && !calcTitle}
                onClick={handleSaveCalculation}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                <Save size={20} />
                حفظ في الأرشيف
              </button>
              <button 
                disabled={!calcTitle || costParts.length === 0}
                onClick={handleSaveAsTemplate}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-500 text-white py-4 rounded-2xl font-bold hover:bg-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
              >
                <LayoutTemplate size={20} />
                حفظ كنموذج
              </button>
            </div>
          </div>

          {/* Results Display */}
          <div className="bg-violet-50 dark:bg-violet-900/10 p-10 rounded-3xl border border-violet-100 dark:border-violet-900/30 flex flex-col justify-between shadow-xl">
            <div>
              <h4 className="text-violet-800 dark:text-violet-300 font-black text-2xl mb-8 border-b border-violet-200 dark:border-violet-800 pb-4">ملخص الحساب</h4>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                  <span className="text-sm">عنوان العملية:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{calcTitle || '---'}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                  <span className="text-sm">المادة الأساسية:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{selectedMaterial?.name || '---'}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                  <span className="text-sm">القياس:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{calcMeasurement || '---'}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                  <span className="text-sm">عدد القطع:</span>
                  <span className="font-black text-xl text-violet-600 dark:text-violet-400">{pieceCount}</span>
                </div>
                
                <div className="pt-8 space-y-3">
                  <p className="text-xs text-violet-400 uppercase tracking-widest font-bold">تفاصيل التكلفة الإجمالية:</p>
                  <div className="flex justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <span className="text-gray-600 dark:text-gray-400">التكلفة الأساسية ({baseCost} × {pieceCount}):</span>
                    <span className="font-bold text-gray-900 dark:text-white">{(baseCost * pieceCount).toFixed(2)}</span>
                  </div>
                  {costParts.map((p, i) => (
                    <div key={i} className="flex flex-col p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-r-4 border-violet-500">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{p.name || `جزء ${i+1}`} ({p.valuePerPiece} × {pieceCount}):</span>
                        <span className="font-bold text-gray-900 dark:text-white">{(p.valuePerPiece * pieceCount).toFixed(2)}</span>
                      </div>
                      {p.materialId && (
                        <span className="text-[10px] text-violet-400 mt-1">مادة: {materials.find(m => m.id === p.materialId)?.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-violet-200 dark:border-violet-800">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider">المجموع الكلي النهائي</p>
                  <p className="text-6xl font-black text-violet-700 dark:text-violet-300 mt-2">
                    {grandTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                    <span className="text-xl font-normal mr-3">{settings?.currencySymbol || 'ج.م'}</span>
                  </p>
                </div>
                <div className="bg-violet-500 text-white p-5 rounded-3xl shadow-2xl shadow-violet-500/50 animate-pulse">
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

export default CostMeter;
