import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, RotateCcw, ChevronDown, ChevronRight, PackageCheck, PenSquare } from 'lucide-react';
import { MinibarCatalogItem } from '../types';
import {
  useMinibarCatalog,
  getVillaCatalogKey,
  saveDefaultMinibarCatalog,
  saveVillaMinibarCatalog,
  resetVillaMinibarCatalog,
} from '../lib/minibarCatalog';
import Toast from './Toast';

interface MinibarCatalogManagerProps {
  complexes: string[];
  unitsByComplex: Record<string, string[]>;
}

const emptyItem = (): MinibarCatalogItem => ({ name: '', location: 'Fridge', price: 0, parQty: 1 });

/** Editable table of catalog rows (name / location / price / par qty), shared
 * by both the default-catalog editor and each villa's override editor. */
function ItemsEditor({
  items,
  onChange,
}: {
  items: MinibarCatalogItem[];
  onChange: (items: MinibarCatalogItem[]) => void;
}) {
  const update = (index: number, field: keyof MinibarCatalogItem, value: string) => {
    const next = [...items];
    const current = { ...next[index] };
    if (field === 'price' || field === 'parQty') {
      (current as any)[field] = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    } else {
      (current as any)[field] = value;
    }
    next[index] = current;
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...items, emptyItem()]);
  };

  return (
    <div className="space-y-2">
      <div className="hidden sm:flex text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">
        <div className="flex-1">Item</div>
        <div className="w-28">Location</div>
        <div className="w-28 text-right">Price (IDR)</div>
        <div className="w-20 text-center">Par Qty</div>
        <div className="w-8"></div>
      </div>
      {items.map((item, index) => (
        <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-2 items-stretch sm:items-center bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg">
          <input
            type="text"
            value={item.name}
            onChange={(e) => update(index, 'name', e.target.value)}
            placeholder="Item name"
            className="flex-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={item.location}
            onChange={(e) => update(index, 'location', e.target.value)}
            placeholder="Fridge / Shelf"
            className="w-full sm:w-28 p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            min="0"
            value={item.price}
            onChange={(e) => update(index, 'price', e.target.value)}
            className="w-full sm:w-28 p-2 text-sm text-right border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            min="0"
            value={item.parQty}
            onChange={(e) => update(index, 'parQty', e.target.value)}
            className="w-full sm:w-20 p-2 text-sm text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => remove(index)}
            className="self-end sm:self-auto p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Item
      </button>
    </div>
  );
}

function VillaRow({
  complexName,
  unitName,
  hasOverride,
  overrideItemCount,
  defaultItems,
  overrideItems,
  onSaved,
  toast,
}: {
  complexName: string;
  unitName: string;
  hasOverride: boolean;
  overrideItemCount: number;
  defaultItems: MinibarCatalogItem[];
  overrideItems: MinibarCatalogItem[];
  onSaved: (message: string) => void;
  toast: (message: string, type: 'success' | 'error') => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<MinibarCatalogItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const openEditor = () => {
    setDraft((hasOverride ? overrideItems : defaultItems).map((i) => ({ ...i })));
    setIsOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleaned = draft.filter((i) => i.name.trim().length > 0);
      await saveVillaMinibarCatalog(complexName, unitName, cleaned);
      toast(`Saved custom minibar list for ${unitName}.`, 'success');
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast('Failed to save. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await resetVillaMinibarCatalog(complexName, unitName);
      toast(`${unitName} now follows the default catalog again.`, 'success');
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast('Failed to reset. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openEditor())}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
          <span className="text-sm font-medium text-slate-800 truncate">{unitName}</span>
        </div>
        {hasOverride ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
            <PenSquare className="w-3 h-3" /> Custom · {overrideItemCount}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
            <PackageCheck className="w-3 h-3" /> Default
          </span>
        )}
      </button>
      {isOpen && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-3">
          <ItemsEditor items={draft} onChange={setDraft} />
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save for {unitName}
            </button>
            {hasOverride && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-600 text-sm font-bold rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MinibarCatalogManager({ complexes, unitsByComplex }: MinibarCatalogManagerProps) {
  const catalog = useMinibarCatalog();
  const [defaultDraft, setDefaultDraft] = useState<MinibarCatalogItem[]>([]);
  const [isSavingDefault, setIsSavingDefault] = useState(false);
  const [expandedComplex, setExpandedComplex] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Only pull in live catalog changes while the admin isn't mid-edit -
    // otherwise a snapshot firing while they're typing would blow away
    // their in-progress draft.
    setDefaultDraft((prev) => (prev.length === 0 ? catalog.defaultItems.map((i) => ({ ...i })) : prev));
  }, [catalog.defaultItems]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const handleSaveDefault = async () => {
    setIsSavingDefault(true);
    try {
      const cleaned = defaultDraft.filter((i) => i.name.trim().length > 0);
      await saveDefaultMinibarCatalog(cleaned);
      showToast('Default minibar catalog saved.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setIsSavingDefault(false);
    }
  };

  const overrideCountByComplex = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(catalog.overridesByKey).forEach((o) => {
      if (o.items.length > 0) counts[o.complexName] = (counts[o.complexName] || 0) + 1;
    });
    return counts;
  }, [catalog.overridesByKey]);

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Default Catalog</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Applies to every villa that hasn't been customized below. Pre-Check-In, Post-Check-Out and Manual Entry all
          read from this list.
        </p>
        <ItemsEditor items={defaultDraft} onChange={setDefaultDraft} />
        <div className="pt-3">
          <button
            type="button"
            onClick={handleSaveDefault}
            disabled={isSavingDefault}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" /> Save Default Catalog
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">Per-Villa Overrides</h2>
        <p className="text-xs text-slate-500 mb-4">
          Customize a specific villa's item list or quantities. Anything not customized here follows the default
          catalog above automatically.
        </p>
        <div className="space-y-2">
          {complexes.map((complexName) => {
            const units = unitsByComplex[complexName] || [];
            const customCount = overrideCountByComplex[complexName] || 0;
            const isExpanded = expandedComplex === complexName;
            return (
              <div key={complexName} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedComplex(isExpanded ? null : complexName)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                    <span className="text-sm font-bold text-slate-800">{complexName}</span>
                    <span className="text-xs text-slate-400">({units.length} units)</span>
                  </div>
                  {customCount > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {customCount} customized
                    </span>
                  )}
                </button>
                {isExpanded && (
                  <div className="p-3 space-y-2 bg-white">
                    {units.map((unitName) => {
                      const key = getVillaCatalogKey(complexName, unitName);
                      const override = catalog.overridesByKey[key];
                      const hasOverride = !!override && override.items.length > 0;
                      return (
                        <React.Fragment key={key}>
                          <VillaRow
                            complexName={complexName}
                            unitName={unitName}
                            hasOverride={hasOverride}
                            overrideItemCount={override?.items.length || 0}
                            defaultItems={catalog.defaultItems}
                            overrideItems={override?.items || []}
                            onSaved={() => {}}
                            toast={showToast}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
