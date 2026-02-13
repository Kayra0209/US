
import React, { useState, useEffect, useMemo } from 'react';
import { AppData, saveData } from '../services/storageService';
import { TripEvent, ItineraryDay, Expense, Spot, Todo, EventType, PaymentMethod, SpotCategory, ExpenseType, GasStation, Currency, ViewType } from '../types';

// --- 通用輔助函式 ---
const formatMoney = (val: number) => isNaN(val) ? "0" : Math.round(val).toLocaleString();

const getCategoryColor = (type: string) => {
    const map: Record<string, string> = {
        sightseeing: 'bg-green-400', food: 'bg-orange-400', transport: 'bg-blue-400',
        event: 'bg-purple-500', accommodation: 'bg-gray-400', shopping: 'bg-pink-400'
    };
    return map[type] || 'bg-gray-400';
};

const getCategoryLabel = (type: string) => {
    const map: Record<string, string> = {
        sightseeing: '景點', food: '美食', transport: '交通',
        event: '球賽', accommodation: '住宿', shopping: '購物'
    };
    return map[type] || type;
};

const getPaymentLabel = (method: PaymentMethod) => {
    const map: Record<PaymentMethod, string> = { cash: '現金', jing_card: '璟刷卡', xiang_card: '翔刷卡' };
    return map[method] || method;
};

const getPaymentColor = (method: PaymentMethod) => {
    if (method === 'jing_card') return 'bg-blue-500';
    if (method === 'xiang_card') return 'bg-pink-500';
    return 'bg-milk-tea-400';
};

const openInGoogleMaps = (location: string) => {
    if (!location) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
};

const openDailyRoute = (day: ItineraryDay) => {
    if (!day || !day.events.length) return;
    const locations = day.events
        .map(e => e.location)
        .filter(l => l && l.trim().length > 0)
        .map(l => encodeURIComponent(l));
    if (locations.length < 1) return;
    const origin = locations[0];
    const destination = locations[locations.length - 1];
    const waypoints = locations.slice(1, -1).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    window.open(url, '_blank');
};

// --- 天氣小工具 ---
const WeatherWidget: React.FC<{ lat: number; lon: number }> = ({ lat, lon }) => {
    const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
    useEffect(() => {
        if (!lat || !lon) return;
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
            .then(res => res.json())
            .then(data => {
                if (data.current_weather) {
                    setWeather({ temp: Math.round(data.current_weather.temperature), code: data.current_weather.weathercode });
                }
            })
            .catch(() => {});
    }, [lat, lon]);
    if (!weather) return null;
    const getWeatherIcon = (code: number) => {
        if (code === 0) return '☀️';
        if (code <= 3) return '🌤️';
        if (code >= 45 && code <= 48) return '🌫️';
        if (code >= 51 && code <= 67) return '🌧️';
        return '☁️';
    };
    return (
        <div className="flex items-center gap-1.5 bg-white/30 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20">
            <span className="text-sm">{getWeatherIcon(weather.code)}</span>
            <span className="text-[10px] font-black text-milk-tea-900">{weather.temp}°C</span>
        </div>
    );
};

// --- 1. DashboardView ---
export const DashboardView: React.FC<{ data: AppData; setView: (v: ViewType) => void; setSelectedDayIndex: (i: number) => void }> = ({ data, setView }) => {
    const startDate = new Date('2026-03-27');
    const today = new Date();
    const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const rate = data.settings.exchangeRate;
    const totalSpentUSD = data.expenses.reduce((acc, exp) => acc + (exp.currency === 'USD' ? exp.amount : exp.amount / rate), 0);
    return (
        <div className="space-y-4 pb-24 animate-in">
            <div className="flex justify-between items-center px-2 py-1">
                <div>
                    <h1 className="text-lg font-black text-milk-tea-800">{data.tripName || 'Hello!'}</h1>
                    <p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Adventure Awaits</p>
                </div>
                <button onClick={() => setView('settings')} className="w-10 h-10 bg-white rounded-full shadow-sm border border-milk-tea-100 flex items-center justify-center text-milk-tea-600 active:scale-90 shadow-md">
                    <i className="fa-solid fa-sync text-lg"></i>
                </button>
            </div>
            <div className="bg-gradient-to-r from-milk-tea-600 to-milk-tea-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12"><i className="fa-solid fa-plane-departure text-9xl"></i></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div><p className="text-xs font-bold opacity-80 mb-1 tracking-widest">Countdown</p><h2 className="text-5xl font-black mb-4">{diffDays > 0 ? diffDays : 0} <span className="text-sm font-normal">Days</span></h2></div>
                    {data.itinerary[0] && <WeatherWidget lat={data.itinerary[0].lat} lon={data.itinerary[0].lon} />}
                </div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-milk-tea-100">
                <h3 className="font-bold text-milk-tea-800 text-xs mb-3 uppercase tracking-tighter">支出總覽 (USD)</h3>
                <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-milk-tea-400 uppercase tracking-widest">Total Spent</span>
                    <div className="text-right"><p className="text-2xl font-black text-milk-tea-900">${formatMoney(totalSpentUSD)}</p><p className="text-[11px] font-bold text-milk-tea-500">≈ NT$ {formatMoney(totalSpentUSD * rate)}</p></div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setView('todo')} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 border border-milk-tea-50"><div className="w-10 h-10 rounded-full bg-milk-tea-800 text-white flex items-center justify-center"><i className="fa-solid fa-list-check"></i></div><span className="text-[10px] font-black">代辦 / 打包</span></button>
                <button onClick={() => setView('map')} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 border border-milk-tea-50"><div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center"><i className="fa-solid fa-location-dot"></i></div><span className="text-[10px] font-black">路徑導航</span></button>
                <button onClick={() => setView('gas')} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 border border-milk-tea-50"><div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center"><i className="fa-solid fa-gas-pump"></i></div><span className="text-[10px] font-black">加油秘笈</span></button>
                <button onClick={() => setView('guide')} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 border border-milk-tea-50"><div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center"><i className="fa-solid fa-book"></i></div><span className="text-[10px] font-black">生存指南</span></button>
            </div>
        </div>
    );
};

// --- 2. ItineraryView ---
export const ItineraryView: React.FC<{ data: AppData; setData: any; selectedDayIndex: number; setSelectedDayIndex: any }> = ({ data, setData, selectedDayIndex, setSelectedDayIndex }) => {
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<TripEvent | null>(null);
    const [dayForm, setDayForm] = useState<Partial<ItineraryDay>>({ date: '', theme: '', mainLocation: '', lat: 34, lon: -118 });
    const [eventForm, setEventForm] = useState<Partial<TripEvent>>({ time: '09:00', title: '', type: 'sightseeing', location: '', note: '' });

    const currentDay = data.itinerary[selectedDayIndex];

    const handleSaveEvent = () => {
        if (!eventForm.title) return;
        const newEvent: TripEvent = { 
            id: editingEvent ? editingEvent.id : Date.now().toString(),
            time: eventForm.time!, title: eventForm.title!, type: eventForm.type as EventType,
            location: eventForm.location || '', note: eventForm.note || '',
            order: editingEvent ? editingEvent.order : currentDay.events.length, updatedAt: Date.now()
        };
        const updatedEvents = editingEvent ? currentDay.events.map(e => e.id === editingEvent.id ? newEvent : e) : [...currentDay.events, newEvent];
        const updatedItinerary = data.itinerary.map((d, i) => i === selectedDayIndex ? { ...d, events: updatedEvents.sort((a,b)=>a.time.localeCompare(b.time)), updatedAt: Date.now() } : d);
        setData({ ...data, itinerary: updatedItinerary });
        saveData({ ...data, itinerary: updatedItinerary });
        setIsEventModalOpen(false);
    };

    return (
        <div className="space-y-4 pb-24 animate-in">
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
                {data.itinerary.map((d, i) => (
                    <button key={i} onClick={() => setSelectedDayIndex(i)} className={`flex-none px-4 py-2 rounded-2xl font-black text-xs border transition-all ${selectedDayIndex === i ? 'bg-milk-tea-800 text-white border-transparent shadow-md' : 'bg-white text-milk-tea-400 border-milk-tea-100'}`}>{d.date}</button>
                ))}
            </div>
            {currentDay && (
                <>
                    <div className="bg-white rounded-3xl p-5 border border-milk-tea-100 flex justify-between items-center shadow-sm">
                        <div><span className="px-2 py-0.5 bg-milk-tea-600 text-white text-[9px] font-bold rounded mb-1 inline-block uppercase">{currentDay.theme}</span><h2 className="text-2xl font-black text-milk-tea-900 leading-none">{currentDay.date}</h2></div>
                        <button onClick={() => openDailyRoute(currentDay)} className="text-[10px] font-black text-white bg-blue-600 px-3 py-1.5 rounded-xl shadow-md">導航模式</button>
                    </div>
                    <div className="space-y-4 ml-1 pl-3 border-l-2 border-milk-tea-100">
                        {currentDay.events.map((event) => (
                            <div key={event.id} className="relative bg-white p-4 rounded-2xl border border-milk-tea-50 shadow-sm flex items-start gap-3">
                                <div className={`absolute -left-[18.5px] top-5 w-2.5 h-2.5 rounded-full border-2 border-white ${getCategoryColor(event.type)}`}></div>
                                <div className="flex-1" onClick={() => { setEditingEvent(event); setEventForm(event); setIsEventModalOpen(true); }}>
                                    <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-bold text-milk-tea-400">{event.time}</span><span className={`text-[8px] text-white px-2 py-0.5 rounded-full font-black uppercase ${getCategoryColor(event.type)}`}>{getCategoryLabel(event.type)}</span></div>
                                    <h3 className="text-sm font-bold text-milk-tea-900">{event.title}</h3>
                                    {event.location && <p className="text-[9px] text-milk-tea-400 mt-1 truncate"><i className="fa-solid fa-location-dot mr-1"></i>{event.location}</p>}
                                </div>
                                <button onClick={() => openInGoogleMaps(event.location)} className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center active:scale-90"><i className="fa-solid fa-compass text-[11px]"></i></button>
                            </div>
                        ))}
                        <button onClick={() => { setEditingEvent(null); setEventForm({time: '12:00', title: '', type: 'sightseeing'}); setIsEventModalOpen(true); }} className="w-full py-4 border-2 border-dashed border-milk-tea-200 text-milk-tea-400 rounded-2xl text-[10px] font-black bg-white/50"><i className="fa-solid fa-plus mr-2"></i> 新增項目</button>
                    </div>
                </>
            )}
            {isEventModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in overflow-y-auto max-h-[85vh]">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">{editingEvent ? '編輯項目' : '新增項目'}</h3><button onClick={() => setIsEventModalOpen(false)}><i className="fa-solid fa-xmark text-lg"></i></button></div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {(['sightseeing', 'food', 'transport', 'accommodation', 'event', 'shopping'] as EventType[]).map(cat => (
                                <button key={cat} onClick={() => setEventForm({...eventForm, type: cat})} className={`flex-none px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${eventForm.type === cat ? `${getCategoryColor(cat)} text-white border-transparent` : 'bg-milk-tea-50 text-milk-tea-400'}`}>{getCategoryLabel(cat)}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <input type="time" value={eventForm.time} onChange={e => setEventForm({...eventForm, time: e.target.value})} className="col-span-1 p-3 bg-milk-tea-50 rounded-xl text-xs font-black border-none" />
                            <input value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="col-span-3 p-3 bg-milk-tea-50 rounded-xl text-xs font-black border-none" placeholder="活動名稱" />
                        </div>
                        <input value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold border-none" placeholder="詳細地點或地址" />
                        <textarea value={eventForm.note} onChange={e => setEventForm({...eventForm, note: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold border-none h-20 resize-none" placeholder="備註..." />
                        <div className="flex gap-3">
                            {editingEvent && <button onClick={() => { if(confirm("刪除？")) { const next = data.itinerary.map((d, i) => i === selectedDayIndex ? { ...d, events: d.events.filter(e => e.id !== editingEvent.id), updatedAt: Date.now() } : d); setData({...data, itinerary: next}); saveData({...data, itinerary: next}); setIsEventModalOpen(false); } }} className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl text-sm font-black">刪除</button>}
                            <button onClick={handleSaveEvent} className="flex-[2] py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black shadow-lg">儲存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 3. SurvivalGuideView (生存指南) ---
export const SurvivalGuideView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'driving' | 'tipping' | 'clothing'>('driving');
    const [bill, setBill] = useState('');
    const [servicePct, setServicePct] = useState(18);
    const tipAmount = (parseFloat(bill) || 0) * (servicePct / 100);
    return (
        <div className="space-y-4 pb-24 animate-in">
            <div className="flex bg-white p-1 rounded-2xl border border-milk-tea-100 mx-auto max-w-[320px] shadow-sm mb-4">
                {(['driving', 'tipping', 'clothing'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${activeTab === t ? 'bg-milk-tea-800 text-white shadow-md' : 'text-milk-tea-300'}`}>
                        {t === 'driving' ? '🚗 交通' : t === 'tipping' ? '💵 小費' : '🧥 穿衣'}
                    </button>
                ))}
            </div>
            {activeTab === 'driving' ? (
                <div className="bg-white p-6 rounded-[32px] border border-milk-tea-100 space-y-4 shadow-sm">
                    <h4 className="text-sm font-black text-milk-tea-800 border-b pb-2">美西開車 5 大必知</h4>
                    <div className="space-y-3">
                        <div className="flex gap-3"><span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black flex-none">1</span><p className="text-[11px] font-bold text-milk-tea-600"><strong>4-Way Stop：</strong>先停者先走！務必完全停止 (Full Stop)。</p></div>
                        <div className="flex gap-3"><span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black flex-none">2</span><p className="text-[11px] font-bold text-milk-tea-600"><strong>紅燈右轉：</strong>大部份地區可紅燈右轉，但必須先完全停下並禮讓行人。</p></div>
                        <div className="flex gap-3"><span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black flex-none">3</span><p className="text-[11px] font-bold text-milk-tea-600"><strong>校車警示：</strong>校車閃紅燈並伸出 STOP 牌時，雙向車輛皆須停車，罰金極重。</p></div>
                        <div className="flex gap-3"><span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black flex-none">4</span><p className="text-[11px] font-bold text-milk-tea-600"><strong>停車顏色：</strong>紅線絕對禁停、藍線殘障、白線上下客、綠線限時。</p></div>
                    </div>
                </div>
            ) : activeTab === 'tipping' ? (
                <div className="bg-milk-tea-800 p-6 rounded-[32px] text-white space-y-4 shadow-xl">
                    <h3 className="text-xs font-black opacity-60 tracking-widest uppercase">小費速算 (USD)</h3>
                    <input type="number" value={bill} onChange={e => setBill(e.target.value)} className="w-full bg-white text-black text-2xl font-black rounded-2xl p-4 outline-none" placeholder="輸入金額..." />
                    <div className="grid grid-cols-3 gap-2">
                        {[15, 18, 20].map(p => (<button key={p} onClick={() => setServicePct(p)} className={`py-3 rounded-xl text-[10px] font-black border ${servicePct === p ? 'bg-white text-black' : 'bg-milk-tea-900/40'}`}>{p}%</button>))}
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center text-xl font-black">
                        <span className="text-sm opacity-60">總計 (含小費)</span>
                        <span>${(tipAmount + (parseFloat(bill) || 0)).toFixed(2)}</span>
                    </div>
                    <p className="text-[9px] opacity-40 text-center italic">註：坐下點餐通常 18% 起跳，外帶可不給或 $1-2。</p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-[32px] border border-milk-tea-100 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-milk-tea-800">穿衣與乾燥防範</h4>
                    <div className="bg-milk-tea-50 p-4 rounded-2xl"><p className="text-[11px] font-bold text-milk-tea-600"><strong>🧅 洋蔥式穿法：</strong>美西溫差極大（5°C~25°C），外層必備防風防潑水外套。</p></div>
                    <div className="bg-milk-tea-50 p-4 rounded-2xl"><p className="text-[11px] font-bold text-milk-tea-600"><strong>🌵 乾燥應對：</strong>必備護唇膏、保濕乳液與人工淚液，乾燥環境容易導致鼻黏膜出血。</p></div>
                </div>
            )}
        </div>
    );
};

// --- 4. GasView (加油秘笈) ---
export const GasView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [integratingStation, setIntegratingStation] = useState<GasStation | null>(null);
    const [form, setForm] = useState<Partial<GasStation>>({ name: '', address: '', description: '', isCostco: false });

    const handleSave = () => {
        if (!form.name || !form.address) return;
        const newStation: GasStation = { id: Date.now().toString(), name: form.name!, address: form.address!, description: form.description || '', isCostco: !!form.isCostco, updatedAt: Date.now() };
        const next = { ...data, gasStations: [newStation, ...(data.gasStations || [])] };
        setData(next); saveData(next); setIsModalOpen(false); setForm({ name: '', address: '', description: '', isCostco: false });
    };

    const handleAddToItinerary = (dayIndex: number) => {
        if (!integratingStation) return;
        const newEvent: TripEvent = {
            id: Date.now().toString(), time: '12:00', title: `⛽ 加油: ${integratingStation.name}`, type: 'transport', location: integratingStation.address, note: integratingStation.description || '',
            order: data.itinerary[dayIndex].events.length, updatedAt: Date.now()
        };
        const nextItinerary = data.itinerary.map((day, idx) => idx === dayIndex ? { ...day, events: [...day.events, newEvent], updatedAt: Date.now() } : day);
        const nextData = { ...data, itinerary: nextItinerary };
        setData(nextData); saveData(nextData); setIntegratingStation(null);
        alert("已加入行程！");
    };

    return (
        <div className="space-y-4 pb-24 animate-in">
             <div className="flex justify-between items-center px-2">
                <div><h2 className="text-xl font-black text-milk-tea-800">加油秘笈</h2><p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Gas Guide</p></div>
                <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90"><i className="fa-solid fa-plus"></i></button>
            </div>
            <div className="bg-white p-5 rounded-[32px] border border-milk-tea-100 space-y-3">
                <h4 className="text-xs font-black">加油必讀</h4>
                <div className="bg-milk-tea-50 p-3 rounded-xl text-[10px] font-bold text-milk-tea-600">信用卡 ZIP Code 要求時，可試 99999。若不行，進店跟櫃台說 Pump Number 與預付金額。</div>
            </div>
            <div className="space-y-3">
                {(data.gasStations || []).map(station => (
                    <div key={station.id} className="bg-white p-4 rounded-3xl border border-milk-tea-50 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${station.isCostco ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{station.isCostco ? 'Costco' : '精選'}</span>
                                <h3 className="text-sm font-black text-milk-tea-900 mt-1">{station.name}</h3>
                                <p className="text-[9px] text-milk-tea-400 font-bold">{station.address}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIntegratingStation(station)} className="w-8 h-8 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shadow-sm"><i className="fa-solid fa-calendar-plus text-[10px]"></i></button>
                                <button onClick={() => { if(confirm("刪除？")) { const next = data.gasStations.filter(s => s.id !== station.id); setData({...data, gasStations: next}); saveData({...data, gasStations: next}); } }} className="w-8 h-8 bg-red-50 text-red-300 rounded-full flex items-center justify-center shadow-sm"><i className="fa-solid fa-trash-can text-[9px]"></i></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">新增油站</h3><button onClick={() => setIsModalOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
                        <div className="flex gap-2 pb-1">
                             <button onClick={() => setForm({...form, isCostco: false})} className={`flex-1 py-3 rounded-xl text-[10px] font-black border ${!form.isCostco ? 'bg-milk-tea-800 text-white border-transparent' : 'bg-milk-tea-50 text-milk-tea-400'}`}>一般</button>
                             <button onClick={() => setForm({...form, isCostco: true})} className={`flex-1 py-3 rounded-xl text-[10px] font-black border ${form.isCostco ? 'bg-red-600 text-white border-transparent' : 'bg-milk-tea-50 text-milk-tea-400'}`}>Costco</button>
                        </div>
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black border-none" placeholder="加油站名稱" />
                        <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold border-none" placeholder="地址" />
                        <button onClick={handleSave} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black active:scale-95 shadow-lg">儲存油站</button>
                    </div>
                </div>
            )}
            {integratingStation && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[110] flex items-end justify-center backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in overflow-y-auto max-h-[70vh]">
                        <div className="flex justify-between items-center border-b pb-4"><h3 className="text-lg font-black text-milk-tea-900">加入哪一天？</h3><button onClick={() => setIntegratingStation(null)}><i className="fa-solid fa-xmark text-milk-tea-300"></i></button></div>
                        {data.itinerary.map((day, idx) => (
                            <button key={day.id} onClick={() => handleAddToItinerary(idx)} className="w-full p-4 bg-milk-tea-50 hover:bg-milk-tea-100 rounded-2xl flex justify-between items-center group transition-all">
                                <div className="text-left"><span className="text-[10px] font-black text-milk-tea-800 uppercase block">{day.date}</span><span className="text-xs font-bold text-milk-tea-400">{day.theme}</span></div>
                                <i className="fa-solid fa-chevron-right text-milk-tea-200 group-hover:text-milk-tea-500"></i>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 5. ExpenseView (記帳) ---
export const ExpenseView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<Partial<Expense>>({ item: '', amount: 0, currency: 'USD', paymentMethod: 'cash', type: 'daily' });
    const rate = data.settings.exchangeRate;
    const totalUSD = data.expenses.reduce((acc, exp) => acc + (exp.currency === 'USD' ? exp.amount : exp.amount / rate), 0);

    const handleSave = () => {
        if (!form.item || !form.amount) return;
        const exp: Expense = { id: Date.now().toString(), item: form.item!, amount: Number(form.amount), currency: form.currency as Currency, paymentMethod: form.paymentMethod as PaymentMethod, isShared: true, date: new Date().toISOString().split('T')[0], type: form.type as ExpenseType, updatedAt: Date.now() };
        const next = { ...data, expenses: [exp, ...data.expenses] };
        setData(next); saveData(next); setIsModalOpen(false); setForm({ item: '', amount: 0, currency: 'USD', paymentMethod: 'cash', type: 'daily' });
    };

    return (
        <div className="space-y-4 pb-24 animate-in">
            <div className="flex justify-between items-center px-2">
                <div><h2 className="text-xl font-black text-milk-tea-800">支出明細</h2><p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Expenses</p></div>
                <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 bg-milk-tea-800 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90"><i className="fa-solid fa-plus"></i></button>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-milk-tea-100 shadow-sm flex justify-between items-end">
                <div><p className="text-[10px] font-black text-milk-tea-400 uppercase mb-1">Total Spent</p><p className="text-2xl font-black text-milk-tea-900">${formatMoney(totalUSD)}</p></div>
                <p className="text-[10px] font-bold text-milk-tea-500">NT$ {formatMoney(totalUSD * rate)}</p>
            </div>
            <div className="space-y-3">
                {data.expenses.map(exp => (
                    <div key={exp.id} className="bg-white p-4 rounded-3xl border border-milk-tea-50 shadow-sm flex justify-between items-center" onClick={() => { if(confirm("刪除？")) { const next = data.expenses.filter(e => e.id !== exp.id); setData({...data, expenses: next}); saveData({...data, expenses: next}); } }}>
                        <div>
                            <div className="flex items-center gap-2"><span className={`text-[8px] font-black px-2 py-0.5 rounded-full text-white ${getPaymentColor(exp.paymentMethod)}`}>{getPaymentLabel(exp.paymentMethod)}</span><h3 className="text-sm font-bold text-milk-tea-900">{exp.item}</h3></div>
                            <p className="text-[9px] text-milk-tea-400 mt-1">{exp.date}</p>
                        </div>
                        <p className="text-sm font-black text-milk-tea-900">{exp.currency === 'USD' ? '$' : 'NT$'} {exp.amount}</p>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">記一筆</h3><button onClick={() => setIsModalOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
                        <input value={form.item} onChange={e => setForm({...form, item: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black border-none" placeholder="項目名稱" />
                        <div className="flex gap-2">
                            <input type="number" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} className="flex-1 p-3 bg-milk-tea-50 rounded-xl text-xs font-black border-none" placeholder="金額" />
                            <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value as Currency})} className="p-3 bg-milk-tea-50 rounded-xl text-xs font-black border-none">
                                <option value="USD">USD</option><option value="TWD">TWD</option>
                            </select>
                        </div>
                        <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value as PaymentMethod})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black border-none">
                            <option value="cash">現金</option><option value="jing_card">璟刷卡</option><option value="xiang_card">翔刷卡</option>
                        </select>
                        <button onClick={handleSave} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black shadow-lg">儲存支出</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 6. SpotsView (口袋名單) ---
export const SpotsView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [integratingSpot, setIntegratingSpot] = useState<Spot | null>(null);
    const [form, setForm] = useState<Partial<Spot>>({ name: '', category: 'sightseeing', location: '' });

    const handleSave = () => {
        if (!form.name) return;
        const spot: Spot = { id: Date.now().toString(), name: form.name!, category: form.category as SpotCategory, city: '', location: form.location || '', note: '', updatedAt: Date.now() };
        const next = { ...data, backupSpots: [spot, ...data.backupSpots] };
        setData(next); saveData(next); setIsModalOpen(false); setForm({ name: '', category: 'sightseeing', location: '' });
    };

    const handleAddToItinerary = (dayIndex: number) => {
        if (!integratingSpot) return;
        const newEvent: TripEvent = { id: Date.now().toString(), time: '12:00', title: integratingSpot.name, type: integratingSpot.category as any, location: integratingSpot.location, note: '', order: data.itinerary[dayIndex].events.length, updatedAt: Date.now() };
        const nextItinerary = data.itinerary.map((day, idx) => idx === dayIndex ? { ...day, events: [...day.events, newEvent], updatedAt: Date.now() } : day);
        setData({ ...data, itinerary: nextItinerary }); saveData({ ...data, itinerary: nextItinerary }); setIntegratingSpot(null);
    };

    return (
        <div className="space-y-4 pb-24 animate-in">
            <div className="flex justify-between items-center px-2">
                <div><h2 className="text-xl font-black text-milk-tea-800">口袋收藏</h2><p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Saved Spots</p></div>
                <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 bg-milk-tea-800 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90"><i className="fa-solid fa-plus"></i></button>
            </div>
            <div className="grid gap-3">
                {data.backupSpots.map(spot => (
                    <div key={spot.id} className="bg-white p-4 rounded-3xl border border-milk-tea-50 shadow-sm flex justify-between items-center">
                        <div>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full text-white ${getCategoryColor(spot.category)}`}>{getCategoryLabel(spot.category)}</span>
                            <h3 className="text-sm font-bold text-milk-tea-900 mt-1">{spot.name}</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIntegratingSpot(spot)} className="w-8 h-8 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shadow-sm active:scale-90"><i className="fa-solid fa-calendar-plus text-[10px]"></i></button>
                            <button onClick={() => openInGoogleMaps(spot.location)} className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center"><i className="fa-solid fa-compass text-[11px]"></i></button>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">新增收藏</h3><button onClick={() => setIsModalOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black border-none" placeholder="店名/景點名" />
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value as SpotCategory})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black border-none">
                            <option value="sightseeing">景點</option><option value="food">美食</option><option value="shopping">購物</option>
                        </select>
                        <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold border-none" placeholder="詳細地址" />
                        <button onClick={handleSave} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black shadow-lg">儲存名單</button>
                    </div>
                </div>
            )}
            {integratingSpot && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[110] flex items-end justify-center backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in overflow-y-auto max-h-[70vh]">
                        <div className="flex justify-between items-center border-b pb-4"><h3 className="text-lg font-black text-milk-tea-900">加入哪一天？</h3><button onClick={() => setIntegratingSpot(null)}><i className="fa-solid fa-xmark text-milk-tea-300"></i></button></div>
                        {data.itinerary.map((day, idx) => (
                            <button key={day.id} onClick={() => handleAddToItinerary(idx)} className="w-full p-4 bg-milk-tea-50 hover:bg-milk-tea-100 rounded-2xl flex justify-between items-center group transition-all">
                                <div className="text-left"><span className="text-[10px] font-black text-milk-tea-800 uppercase block">{day.date}</span><span className="text-xs font-bold text-milk-tea-400">{day.theme}</span></div>
                                <i className="fa-solid fa-chevron-right text-milk-tea-200 group-hover:text-milk-tea-500"></i>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 7. TodoView (待辦) ---
export const TodoView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'packing'>('general');
    const [newTodo, setNewTodo] = useState('');
    const handleToggle = (id: string) => {
        const next = { ...data, todos: data.todos.map(t => t.id === id ? { ...t, done: !t.done, updatedAt: Date.now() } : t) };
        setData(next); saveData(next);
    };
    const handleAdd = () => {
        if (!newTodo.trim()) return;
        const todo: Todo = { id: Date.now().toString(), text: newTodo, done: false, category: activeTab, updatedAt: Date.now() };
        const next = { ...data, todos: [...data.todos, todo] };
        setData(next); saveData(next); setNewTodo('');
    };
    const filtered = data.todos.filter(t => t.category === activeTab);
    return (
        <div className="space-y-4 pb-24 animate-in">
            <div className="flex bg-white p-1 rounded-2xl border border-milk-tea-100 mx-auto max-w-[320px] shadow-sm mb-4">
                {(['general', 'packing'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${activeTab === t ? 'bg-milk-tea-800 text-white shadow-md' : 'text-milk-tea-300'}`}>
                        {t === 'general' ? '📋 待辦' : '🎒 打包'}
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className="flex-1 p-4 bg-white rounded-2xl border border-milk-tea-50 text-xs font-bold outline-none shadow-sm" placeholder="新增事項..." />
                <button onClick={handleAdd} className="w-14 h-14 bg-milk-tea-800 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"><i className="fa-solid fa-plus"></i></button>
            </div>
            <div className="space-y-2">
                {filtered.map(todo => (
                    <div key={todo.id} className={`bg-white p-4 rounded-2xl border border-milk-tea-50 shadow-sm flex items-center gap-3 transition-all ${todo.done ? 'opacity-40' : ''}`}>
                        <button onClick={() => handleToggle(todo.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${todo.done ? 'bg-green-500 border-green-500 text-white' : 'border-milk-tea-200'}`}><i className="fa-solid fa-check text-[8px]"></i></button>
                        <span className={`flex-1 text-[11px] font-bold text-milk-tea-800 ${todo.done ? 'line-through' : ''}`}>{todo.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 8. MapView (導航規劃) ---
export const MapView: React.FC<{ data: AppData; selectedDayIndex: number }> = ({ data, selectedDayIndex }) => {
    return (
        <div className="space-y-4 pb-24 animate-in">
             <div className="flex justify-between items-center px-2">
                <div><h2 className="text-xl font-black text-milk-tea-800">路徑導航</h2><p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Route Planner</p></div>
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><i className="fa-solid fa-route text-xl"></i></div>
            </div>
            <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-xl mb-6">
                <h4 className="text-xs font-black opacity-80 uppercase tracking-widest mb-2">Google Maps 智慧規劃</h4>
                <p className="text-[11px] font-bold leading-relaxed">點擊下方天數按鈕，系統會自動將該日「所有」停靠點串聯成單一導航路線，節省您設定導航的時間。</p>
            </div>
            <div className="space-y-3">
                {data.itinerary.map((day, idx) => (
                    <div key={day.id} className={`bg-white p-5 rounded-3xl border ${selectedDayIndex === idx ? 'border-blue-400 shadow-md ring-1 ring-blue-100' : 'border-milk-tea-50 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                            <div><span className="text-[9px] font-black text-blue-600 uppercase block mb-1">{day.date}</span><h3 className="text-sm font-black text-milk-tea-900 leading-tight">{day.theme}</h3></div>
                            <button onClick={() => openDailyRoute(day)} disabled={day.events.length === 0} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${day.events.length === 0 ? 'bg-milk-tea-50 text-milk-tea-200' : 'bg-blue-600 text-white shadow-lg active:scale-95'}`}>導航模式</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 重新匯出所有 View ---
export default DashboardView;
