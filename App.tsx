import React, { useState, useRef } from 'react';
import { ViewType } from './types';
import { loadData, saveData, AppData, getInitialData } from './services/storageService';
import { DashboardView, ItineraryView, ExpenseView, SpotsView, MapView, TodoView, GasView, SurvivalGuideView } from './components/Views';

// 修正編譯器對 process 的檢查
declare var process: any;

const BottomNav: React.FC<{ view: ViewType; setView: (v: ViewType) => void }> = ({ view, setView }) => {
    const items: { id: ViewType; icon: string; label: string }[] = [
        { id: 'dashboard', icon: 'fa-house', label: '首頁' },
        { id: 'itinerary', icon: 'fa-calendar-days', label: '行程' },
        { id: 'money', icon: 'fa-wallet', label: '記帳' },
        { id: 'todo', icon: 'fa-list-check', label: '清單' },
        { id: 'settings', icon: 'fa-gear', label: '設定' },
    ];
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-milk-tea-100 px-6 pt-2 safe-bottom flex justify-between items-center z-50 max-w-md mx-auto">
            {items.map(item => (
                <button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center gap-1 pb-2 transition-all ${view === item.id ? 'text-milk-tea-800 scale-110' : 'text-milk-tea-300'}`}>
                    <i className={`fa-solid ${item.icon} text-lg`}></i>
                    <span className="text-[9px] font-bold">{item.label}</span>
                </button>
            ))}
        </nav>
    );
};

const SettingsView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [syncCode, setSyncCode] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExportJSON = () => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${data.tripName}_backup.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target?.result as string);
                if (confirm("導入 JSON 將會覆蓋目前所有資料，確定嗎？")) {
                    setData(importedData);
                    alert("資料導入成功！");
                }
            } catch (err) {
                alert("無效的 JSON 檔案內容。");
            }
        };
        reader.readAsText(file);
    };

    const handleClearAll = () => {
        if (confirm("🚨 警告：這將會清除「所有」目前的行程、記帳與清單資料，並回復到初始狀態。此操作無法復原，確定嗎？")) {
            const initial = getInitialData();
            setData(initial);
            alert("資料已完全重置。");
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* 行程名稱設定 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-milk-tea-100">
                <h3 className="font-black mb-3 text-sm text-milk-tea-800 uppercase tracking-tighter flex items-center gap-2">
                    <i className="fa-solid fa-pen-to-square"></i> 行程名稱
                </h3>
                <input 
                    value={data.tripName} 
                    onChange={e => setData({ ...data, tripName: e.target.value })} 
                    className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none text-milk-tea-800 border border-milk-tea-100" 
                    placeholder="例如：2026 美西之旅" 
                />
            </div>

            {/* JSON 與 同步 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-milk-tea-100 space-y-4">
                <h3 className="font-black mb-1 text-sm text-milk-tea-800 uppercase tracking-tighter flex items-center gap-2">
                    <i className="fa-solid fa-cloud-arrow-up"></i> 資料同步與備份
                </h3>
                
                {/* 線上代碼同步 */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400">使用快速代碼同步 (Base64)</p>
                    <button onClick={() => {
                        const code = btoa(encodeURIComponent(JSON.stringify(data)));
                        navigator.clipboard.writeText(code);
                        alert("同步碼已複製！");
                    }} className="w-full py-3 bg-milk-tea-800 text-white rounded-xl text-xs font-black active:scale-95 transition-transform flex items-center justify-center gap-2">
                        <i className="fa-solid fa-copy"></i> 複製我的同步碼
                    </button>
                    <div className="flex gap-2 pt-1">
                        <input value={syncCode} onChange={e => setSyncCode(e.target.value)} placeholder="貼上對方的代碼" className="flex-1 p-3 bg-milk-tea-50 rounded-xl text-xs outline-none text-black font-black border border-milk-tea-100" />
                        <button onClick={() => {
                            if (!syncCode) return;
                            try {
                                const decoded = JSON.parse(decodeURIComponent(atob(syncCode)));
                                if (confirm("這會覆蓋目前資料，確定嗎？")) {
                                    setData(decoded);
                                    alert("同步成功！");
                                }
                            } catch(e) { alert("無效的代碼。"); }
                        }} className="px-4 bg-milk-tea-100 text-milk-tea-800 rounded-xl text-xs font-black active:scale-95">同步</button>
                    </div>
                </div>

                <div className="h-px bg-milk-tea-50 my-2"></div>

                {/* 檔案備份 */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400">使用 JSON 檔案管理</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleExportJSON} className="py-3 bg-white border border-milk-tea-300 text-milk-tea-800 rounded-xl text-xs font-black active:scale-95 transition-transform flex items-center justify-center gap-2">
                            <i className="fa-solid fa-file-export"></i> 導出 JSON
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="py-3 bg-white border border-milk-tea-300 text-milk-tea-800 rounded-xl text-xs font-black active:scale-95 transition-transform flex items-center justify-center gap-2">
                            <i className="fa-solid fa-file-import"></i> 導入 JSON
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
                    </div>
                </div>
            </div>

            {/* 危險區域 */}
            <div className="bg-red-50 p-5 rounded-3xl shadow-sm border border-red-100">
                <h3 className="font-black mb-3 text-sm text-red-800 uppercase tracking-tighter flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation"></i> 危險區域
                </h3>
                <button onClick={handleClearAll} className="w-full py-4 bg-white border-2 border-red-200 text-red-500 rounded-2xl text-xs font-black active:bg-red-500 active:text-white active:border-red-500 transition-all flex items-center justify-center gap-2">
                    <i className="fa-solid fa-trash-can"></i> 清除所有資料 (重置)
                </button>
                <p className="text-[9px] text-red-400 font-bold mt-2 text-center">※ 此動作會刪除所有本地存儲的行程，請確保已導出 JSON 備份。</p>
            </div>
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
            <main className="flex-1 overflow-y-auto p-4 pb-32 no-scrollbar">
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
