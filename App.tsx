
import React, { useEffect, useState } from 'react';
import { ViewType } from './types';
import { loadData, saveData, AppData } from './services/storageService';
import { DashboardView, ItineraryView, ExpenseView, SpotsView, MapView, TodoView, GasView, SurvivalGuideView } from './components/Views';
import { GoogleGenAI } from '@google/genai';

// 修正 TypeScript 找不到 process 的問題
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

const AIAssistant: React.FC<{ data: AppData }> = ({ data }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);

    const askAI = async () => {
        // 安全地讀取 API KEY
        let apiKey = '';
        try {
            if (typeof process !== 'undefined' && process.env) {
                apiKey = process.env.API_KEY || '';
            }
        } catch (e) {
            console.warn("無法存取環境變數");
        }

        if (!apiKey) {
            setResponse("尚未配置 API Key，請檢查環境設定。");
            return;
        }

        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `你是一個美西旅遊專家。這是目前的行程摘要：${data.itinerary.map(d => d.date + d.theme).join(', ')}。請給我三個旅遊建議或提醒。`;
            const res = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt
            });
            setResponse(res.text || "AI 暫時無法回應");
        } catch (e) { 
            console.error(e);
            setResponse("抱歉，我現在無法連線，請稍後再試。"); 
        }
        setLoading(false);
    };

    return (
        <div className="fixed right-4 bottom-24 z-50">
            <button onClick={() => { setIsOpen(!isOpen); if(!response && !loading) askAI(); }} className="w-12 h-12 bg-milk-tea-800 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce">
                <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-robot'}`}></i>
            </button>
            {isOpen && (
                <div className="absolute bottom-14 right-0 w-64 bg-white rounded-2xl p-4 shadow-2xl border border-milk-tea-100 animate-in fade-in slide-in-from-bottom-4">
                    <h4 className="text-xs font-black text-milk-tea-800 mb-2">AI 旅遊助理</h4>
                    <div className="text-[11px] leading-relaxed text-milk-tea-600 max-h-48 overflow-y-auto no-scrollbar whitespace-pre-wrap">
                        {loading ? '思考中...' : response}
                    </div>
                </div>
            )}
        </div>
    );
};

const SettingsView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [syncCode, setSyncCode] = useState('');
    return (
        <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-milk-tea-100">
                <h3 className="font-bold mb-3 text-sm text-milk-tea-800 uppercase tracking-tighter">兩人同步協作</h3>
                <p className="text-[10px] text-gray-400 mb-4">將同步碼傳給另一半，對方貼上後即可同步最新行程與支出。</p>
                <button onClick={() => {
                    const code = btoa(encodeURIComponent(JSON.stringify(data)));
                    navigator.clipboard.writeText(code);
                    alert("同步碼已複製！快傳給旅伴吧。");
                }} className="w-full py-3 bg-milk-tea-800 text-white rounded-xl text-xs font-bold mb-3 active:scale-95 transition-transform shadow-md">產生我的同步碼</button>
                <div className="flex gap-2">
                    <input value={syncCode} onChange={e => setSyncCode(e.target.value)} placeholder="貼上對方的代碼" className="flex-1 p-3 bg-milk-tea-50 rounded-xl text-xs outline-none text-black font-bold border border-milk-tea-100" />
                    <button onClick={() => {
                        if (!syncCode) return;
                        try {
                            const decoded = JSON.parse(decodeURIComponent(atob(syncCode)));
                            if (confirm("這會覆蓋目前資料，確定嗎？")) {
                                setData(decoded);
                                alert("同步成功！");
                            }
                        } catch(e) { alert("代碼無效，請確認是否複製完整。"); }
                    }} className="px-4 bg-milk-tea-100 text-milk-tea-800 rounded-xl text-xs font-bold active:scale-95 transition-transform">同步</button>
                </div>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-milk-tea-100">
                <h3 className="font-bold mb-3 text-sm text-milk-tea-800 uppercase tracking-tighter">匯率設定</h3>
                <label className="text-[10px] text-gray-400 mb-2 block font-bold">1 USD = ? TWD</label>
                <input type="number" value={data.settings.exchangeRate} onChange={e => {
                    const next = {...data, settings: {...data.settings, exchangeRate: Number(e.target.value)}};
                    setData(next);
                }} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs outline-none text-black font-bold border border-milk-tea-100" />
            </div>
        </div>
    );
};

export default function App() {
    const [view, setView] = useState<ViewType>('dashboard');
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [data, setData] = useState<AppData | null>(null);

    useEffect(() => {
        setData(loadData());
    }, []);

    if (!data) return <div className="h-screen flex items-center justify-center bg-milk-tea-50 text-milk-tea-400 font-bold">冒險載入中...</div>;

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
            <AIAssistant data={data} />
            <BottomNav view={view} setView={setView} />
        </div>
    );
}
