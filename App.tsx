
import React, { useState, useRef } from 'react';
import { ViewType } from './types';
import { loadData, saveData, AppData, getInitialData, mergeAppData } from './services/storageService';
import { DashboardView, ItineraryView, ExpenseView, SpotsView, MapView, TodoView, GasView, SurvivalGuideView } from './components/Views';

const BottomNav: React.FC<{ view: ViewType; setView: (v: ViewType) => void }> = ({ view, setView }) => {
    const items: { id: ViewType; icon: string; label: string }[] = [
        { id: 'dashboard', icon: 'fa-house', label: '首頁' },
        { id: 'itinerary', icon: 'fa-calendar-days', label: '行程' },
        { id: 'money', icon: 'fa-wallet', label: '記帳' },
        { id: 'spots', icon: 'fa-heart', label: '收藏' },
        { id: 'settings', icon: 'fa-sync', label: '同步' },
    ];
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-milk-tea-100 px-6 pt-2 pb-6 safe-bottom flex justify-between items-center z-50 max-w-md mx-auto shadow-2xl">
            {items.map(item => (
                <button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center gap-1 pb-2 transition-all ${view === item.id ? 'text-milk-tea-800 scale-110' : 'text-milk-tea-300 opacity-60'}`}>
                    <i className={`fa-solid ${item.icon} text-lg`}></i>
                    <span className="text-[9px] font-black tracking-tighter uppercase">{item.label}</span>
                </button>
            ))}
        </nav>
    );
};

const SettingsView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [importCode, setImportCode] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const syncCode = btoa(encodeURIComponent(JSON.stringify(data)));

    const handleCopy = () => {
        try {
            navigator.clipboard.writeText(syncCode);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            alert("複製失敗，請手動全選複製代碼框內容。");
        }
    };

    const handleMergeCode = () => {
        if (!importCode.trim()) return;
        try {
            const remoteData = JSON.parse(decodeURIComponent(atob(importCode.trim())));
            processImportedData(remoteData);
            setImportCode('');
        } catch (e) {
            alert("⚠️ 同步碼格式錯誤。");
        }
    };

    const processImportedData = (remoteData: any) => {
        try {
            const merged = mergeAppData(data, remoteData);
            setData(merged);
            saveData(merged);
            alert("🎉 同步成功！已根據更新時間智慧合併資料。");
        } catch (e) {
            alert("❌ 資料處理失敗，請確認檔案格式是否正確。");
        }
    };

    const exportJSON = () => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `cotravel_backup_${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                processImportedData(json);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } catch (err) {
                alert("❌ 解析失敗，請確保選擇的是正確的 JSON 檔案。");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6 pb-24 animate-in">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h2 className="text-xl font-black text-milk-tea-800">同步與備份</h2>
                    <p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Backup & Restore</p>
                </div>
                <div className="w-12 h-12 bg-milk-tea-100 rounded-2xl flex items-center justify-center text-milk-tea-600">
                    <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-milk-tea-100 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-milk-tea-800 uppercase tracking-widest">JSON 檔案備份</h4>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={exportJSON} className="flex flex-col items-center justify-center p-4 bg-milk-tea-50 rounded-2xl border border-milk-tea-100 hover:bg-milk-tea-100 transition-all gap-2">
                        <i className="fa-solid fa-file-export text-milk-tea-500 text-lg"></i>
                        <span className="text-[10px] font-black text-milk-tea-800">匯出備份檔</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 bg-milk-tea-50 rounded-2xl border border-milk-tea-100 hover:bg-milk-tea-100 transition-all gap-2">
                        <i className="fa-solid fa-file-import text-milk-tea-500 text-lg"></i>
                        <span className="text-[10px] font-black text-milk-tea-800">匯入並合併</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-milk-tea-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-milk-tea-800 uppercase tracking-widest">快速同步碼</h4>
                    <span className="text-[9px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">即時共享</span>
                </div>
                <div className="relative">
                    <textarea readOnly value={syncCode} onClick={(e) => (e.target as HTMLTextAreaElement).select()} className="w-full h-20 p-3 bg-milk-tea-50 rounded-xl text-[8px] font-mono text-milk-tea-400 border border-milk-tea-100 focus:outline-none resize-none break-all" />
                    <button onClick={handleCopy} className={`absolute right-2 bottom-2 px-3 py-1.5 rounded-lg text-[9px] font-black shadow-lg active:scale-90 transition-all flex items-center gap-1.5 ${copySuccess ? 'bg-green-500 text-white' : 'bg-milk-tea-800 text-white'}`}>
                        <i className={`fa-solid ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
                        {copySuccess ? '已複製' : '複製'}
                    </button>
                </div>
                <div className="space-y-3 pt-2">
                    <textarea value={importCode} onChange={(e) => setImportCode(e.target.value)} placeholder="在此貼上隊友的同步碼..." className="w-full h-24 p-3 bg-milk-tea-50 rounded-xl text-[10px] font-bold text-milk-tea-800 border border-milk-tea-100 focus:ring-1 focus:ring-milk-tea-200 outline-none resize-none" />
                    <button onClick={handleMergeCode} disabled={!importCode.trim()} className={`w-full py-3.5 rounded-2xl font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 ${!importCode.trim() ? 'bg-milk-tea-100 text-milk-tea-300' : 'bg-milk-tea-800 text-white'}`}>
                        <i className="fa-solid fa-bolt"></i>
                        貼上並合併
                    </button>
                </div>
            </div>
            
            <button onClick={() => confirm("確定要重置嗎？這將清空所有本地行程。") && setData(getInitialData())} className="w-full text-red-500 font-black text-[10px] opacity-40 py-4 uppercase tracking-widest">
                <i className="fa-solid fa-trash-can mr-2"></i> Reset Local Data
            </button>
        </div>
    );
};

export default function App() {
    const [view, setView] = useState<ViewType>('dashboard');
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [data, setData] = useState<AppData>(loadData());

    const handleSetData = (newData: AppData) => {
        setData(newData);
        saveData(newData);
    };

    return (
        <div className="max-w-md mx-auto h-screen flex flex-col bg-milk-tea-50 relative overflow-hidden shadow-2xl border-x border-milk-tea-100">
            {/* 修正 iPhone 頂部安全區域間距 */}
            <main className="flex-1 overflow-y-auto p-4 pb-32 no-scrollbar" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
                {view === 'dashboard' && <DashboardView data={data} setView={setView} setSelectedDayIndex={setSelectedDayIndex} />}
                {view === 'itinerary' && <ItineraryView data={data} setData={handleSetData} selectedDayIndex={selectedDayIndex} setSelectedDayIndex={setSelectedDayIndex} />}
                {view === 'money' && <ExpenseView data={data} setData={handleSetData} />}
                {view === 'spots' && <SpotsView data={data} setData={handleSetData} />}
                {view === 'map' && <MapView data={data} selectedDayIndex={selectedDayIndex} />}
                {view === 'todo' && <TodoView data={data} setData={handleSetData} />}
                {view === 'gas' && <GasView data={data} setData={handleSetData} />}
                {view === 'guide' && <SurvivalGuideView />}
                {view === 'settings' && <SettingsView data={data} setData={handleSetData} />}
            </main>
            <BottomNav view={view} setView={setView} />
        </div>
    );
}
