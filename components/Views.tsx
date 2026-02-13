import React, { useState, useEffect, useMemo } from 'react';
import { AppData, saveData } from '../services/storageService';
import { TripEvent, ItineraryDay, Expense, Spot, Todo, EventType, PaymentMethod, SpotCategory, ExpenseType, GasStation, Currency, ViewType } from '../types';

// --- Helper Functions ---
const formatMoney = (val: number) => {
    if (isNaN(val)) return "0";
    return Math.round(val).toLocaleString();
};

const getCategoryColor = (type: string) => {
    const map: Record<string, string> = {
        sightseeing: 'bg-green-400', 
        food: 'bg-orange-400', 
        transport: 'bg-blue-400',
        event: 'bg-purple-500', 
        accommodation: 'bg-gray-400',
        shopping: 'bg-pink-400'
    };
    return map[type] || 'bg-gray-400';
};

const getCategoryLabel = (type: string) => {
    const map: Record<string, string> = {
        sightseeing: '景點', 
        food: '美食', 
        transport: '交通',
        event: '球賽', 
        accommodation: '住宿',
        shopping: '購物'
    };
    return map[type] || type;
};

const getPaymentLabel = (method: PaymentMethod) => {
    const map: Record<PaymentMethod, string> = {
        cash: '現金', jing_card: '璟刷卡', xiang_card: '翔刷卡'
    };
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
    
    if (locations.length < 1) {
        alert("這天的行程沒有設定地點地址喔！");
        return;
    }
    
    if (locations.length < 2) { 
        openInGoogleMaps(day.events.find(e => e.location)?.location || ""); 
        return; 
    }
    
    const origin = locations[0];
    const destination = locations[locations.length - 1];
    const waypoints = locations.slice(1, -1).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
    window.open(url, '_blank');
};

// --- Weather Widget ---
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

// --- Dashboard View ---
export const DashboardView: React.FC<{ data: AppData; setView: (v: ViewType) => void; setSelectedDayIndex: (i: number) => void }> = ({ data, setView, setSelectedDayIndex }) => {
    const startDate = new Date('2026-03-27');
    const today = new Date();
    const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const rate = data.settings.exchangeRate;
    const totalSpentUSD = data.expenses.reduce((acc, exp) => acc + (exp.currency === 'USD' ? exp.amount : exp.amount / rate), 0);
    return (
        <div className="space-y-4 pb-24">
            <div className="flex justify-between items-center px-2 py-1">
                <div>
                    <h1 className="text-lg font-black text-milk-tea-800">{data.tripName || 'Hello, Trip!'}</h1>
                    <p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Adventure Begins</p>
                </div>
                <button onClick={() => setView('settings')} className="w-10 h-10 bg-white rounded-full shadow-sm border border-milk-tea-100 flex items-center justify-center text-milk-tea-600 active:scale-90 transition-all shadow-md">
                    <i className="fa-solid fa-cloud-arrow-up text-lg"></i>
                </button>
            </div>
            <div className="bg-gradient-to-r from-milk-tea-600 to-milk-tea-800 rounded-3xl p-6 text-white card-shadow relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12"><i className="fa-solid fa-plane-departure text-9xl"></i></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div><p className="text-xs font-bold opacity-80 mb-1 uppercase tracking-widest">Countdown</p><h2 className="text-5xl font-black mb-4">{diffDays > 0 ? diffDays : 0} <span className="text-sm font-normal">Days</span></h2></div>
                    {data.itinerary[0] && <WeatherWidget lat={data.itinerary[0].lat} lon={data.itinerary[0].lon} />}
                </div>
            </div>
            <div className="bg-white rounded-3xl p-5 card-shadow border border-milk-tea-100">
                <h3 className="font-bold text-milk-tea-800 text-sm mb-4 tracking-tighter uppercase underline decoration-milk-tea-200 underline-offset-4 decoration-2">支出總覽 (USD)</h3>
                <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-milk-tea-400 uppercase tracking-widest">Total Spent</span>
                    <div className="text-right"><p className="text-2xl font-black text-milk-tea-900">${formatMoney(totalSpentUSD)}</p><p className="text-[11px] font-bold text-milk-tea-500">≈ NT$ {formatMoney(totalSpentUSD * rate)}</p></div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setView('todo')} className="bg-white p-4 rounded-2xl card-shadow flex flex-col items-center gap-2 border border-milk-tea-50 active:scale-95 transition-transform"><div className="w-10 h-10 rounded-full bg-milk-tea-800 text-white flex items-center justify-center shadow-lg"><i className="fa-solid fa-list-check text-sm"></i></div><span className="text-[10px] font-black text-milk-tea-800">代辦 / 打包</span></button>
                <button onClick={() => setView('map')} className="bg-white p-4 rounded-2xl card-shadow flex flex-col items-center gap-2 border border-milk-tea-50 active:scale-95 transition-transform"><div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg"><i className="fa-solid fa-location-dot text-sm"></i></div><span className="text-[10px] font-black text-milk-tea-800">路徑導航</span></button>
                <button onClick={() => setView('gas')} className="bg-white p-4 rounded-2xl card-shadow flex flex-col items-center gap-2 border border-milk-tea-50 active:scale-95 transition-transform"><div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"><i className="fa-solid fa-gas-pump text-sm"></i></div><span className="text-[10px] font-black text-milk-tea-800">加油秘笈</span></button>
                <button onClick={() => setView('guide')} className="bg-white p-4 rounded-2xl card-shadow flex flex-col items-center gap-2 border border-milk-tea-50 active:scale-95 transition-transform"><div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg"><i className="fa-solid fa-book text-sm"></i></div><span className="text-[10px] font-black text-milk-tea-800">生存指南</span></button>
            </div>
        </div>
    );
};

// --- Itinerary View ---
export const ItineraryView: React.FC<{ data: AppData; setData: any; selectedDayIndex: number; setSelectedDayIndex: any }> = ({ data, setData, selectedDayIndex, setSelectedDayIndex }) => {
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<TripEvent | null>(null);

    const [dayForm, setDayForm] = useState<Omit<ItineraryDay, 'events'>>({ 
        date: '', calendarDate: '', theme: '', mainLocation: '', lat: 34.05, lon: -118.24 
    });
    const [eventForm, setEventForm] = useState<TripEvent>({ id: '', time: '09:00', title: '', type: 'sightseeing', location: '', note: '' });

    const currentDay = data.itinerary[selectedDayIndex];

    const handleAddDay = () => {
        if (!dayForm.date || !dayForm.theme) return;
        const newDay: ItineraryDay = { ...dayForm, events: [] };
        const nextData = { ...data, itinerary: [...data.itinerary, newDay] };
        setData(nextData);
        saveData(nextData);
        setIsDayModalOpen(false);
        setSelectedDayIndex(data.itinerary.length);
    };

    const handleSaveEvent = () => {
        if (!eventForm.title) return;
        const newEvent = { ...eventForm, id: editingEvent ? editingEvent.id : Date.now().toString() };
        const updatedEvents = editingEvent 
            ? currentDay.events.map(e => e.id === editingEvent.id ? newEvent : e)
            : [...currentDay.events, newEvent];
        const sortedEvents = updatedEvents.sort((a, b) => a.time.localeCompare(b.time));
        const updatedItinerary = data.itinerary.map((d, i) => i === selectedDayIndex ? { ...d, events: sortedEvents } : d);
        setData({ ...data, itinerary: updatedItinerary });
        saveData({ ...data, itinerary: updatedItinerary });
        setIsEventModalOpen(false);
    };

    const handleDeleteEvent = (id: string) => {
        if (!confirm("確定刪除？")) return;
        const updatedItinerary = data.itinerary.map((d, i) => i === selectedDayIndex ? { ...d, events: d.events.filter(e => e.id !== id) } : d);
        setData({ ...data, itinerary: updatedItinerary });
        saveData({ ...data, itinerary: updatedItinerary });
        setIsEventModalOpen(false);
    };

    return (
        <div className="space-y-4 pb-24">
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
                {data.itinerary.map((d, i) => (
                    <button key={i} onClick={() => setSelectedDayIndex(i)} className={`flex-none px-4 py-2 rounded-2xl font-black text-xs border transition-all ${selectedDayIndex === i ? 'bg-milk-tea-800 text-white border-transparent shadow-md' : 'bg-white text-milk-tea-400 border-milk-tea-100'}`}>{d.date}</button>
                ))}
                <button onClick={() => setIsDayModalOpen(true)} className="flex-none px-4 py-2 rounded-2xl bg-milk-tea-100 text-milk-tea-600 font-black text-xs border border-milk-tea-200"><i className="fa-solid fa-plus mr-1"></i> 新增天數</button>
            </div>
            {currentDay ? (
                <>
                    <div className="bg-white rounded-3xl p-5 border border-milk-tea-100 flex justify-between items-center shadow-sm">
                        <div><span className="px-2 py-0.5 bg-milk-tea-600 text-white text-[9px] font-bold rounded mb-1 inline-block uppercase">{currentDay.theme}</span><h2 className="text-2xl font-black text-milk-tea-900 leading-none">{currentDay.date}</h2><p className="text-[10px] text-milk-tea-500 font-bold mt-1">{currentDay.calendarDate} · {currentDay.mainLocation}</p></div>
                        <div className="flex flex-col items-end gap-2"><WeatherWidget lat={currentDay.lat} lon={currentDay.lon} /><button onClick={() => openDailyRoute(currentDay)} className="text-[10px] font-black text-white bg-blue-600 px-3 py-1.5 rounded-xl">地圖導航</button></div>
                    </div>
                    <div className="pl-3 border-l-2 border-milk-tea-200 space-y-4 ml-1">
                        {currentDay.events.map(event => (
                            <div key={event.id} className="relative bg-white p-4 rounded-2xl border border-milk-tea-50 shadow-sm active:bg-milk-tea-50 transition-all">
                                <div className={`absolute -left-[18px] top-5 w-2.5 h-2.5 rounded-full border-2 border-white ${getCategoryColor(event.type)}`}></div>
                                <div className="flex justify-between items-start mb-1">
                                    <div onClick={() => { setEditingEvent(event); setEventForm(event); setIsEventModalOpen(true); }} className="flex-1 cursor-pointer">
                                        <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-milk-tea-400">{event.time}</span><span className={`text-[8px] text-white px-2 py-0.5 rounded-full font-black uppercase ${getCategoryColor(event.type)}`}>{getCategoryLabel(event.type)}</span></div>
                                        <h3 className="text-sm font-bold text-milk-tea-900 mt-0.5">{event.title}</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openInGoogleMaps(event.location)} className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center active:scale-90 shadow-sm"><i className="fa-solid fa-compass text-[11px]"></i></button>
                                        <button onClick={() => { setEditingEvent(event); setEventForm(event); setIsEventModalOpen(true); }} className="w-8 h-8 bg-milk-tea-50 text-milk-tea-300 rounded-full flex items-center justify-center shadow-sm"><i className="fa-solid fa-pen text-[9px]"></i></button>
                                    </div>
                                </div>
                                {event.location && <p className="text-[9px] text-milk-tea-400 mt-1 truncate"><i className="fa-solid fa-location-dot mr-1"></i>{event.location}</p>}
                                {event.note && <p className="text-[9px] text-milk-tea-500 mt-2 bg-milk-tea-50/50 p-2 rounded-lg italic">"{event.note}"</p>}
                            </div>
                        ))}
                        <button onClick={() => { setEditingEvent(null); setEventForm({id: '', time: '12:00', title: '', type: 'sightseeing', location: '', note: ''}); setIsEventModalOpen(true); }} className="w-full py-4 border-2 border-dashed border-milk-tea-200 text-milk-tea-400 rounded-2xl text-[10px] font-black bg-white/50 active:bg-white transition-all"><i className="fa-solid fa-plus mr-2"></i> 新增項目</button>
                    </div>
                </>
            ) : <div className="text-center py-20 text-milk-tea-300 font-bold">新增您的第一天行程</div>}

            {isDayModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">新增天數</h3><button onClick={() => setIsDayModalOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
                        <input value={dayForm.date} onChange={e => setDayForm({...dayForm, date: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" placeholder="Day 1" />
                        <input type="date" value={dayForm.calendarDate} onChange={e => setDayForm({...dayForm, calendarDate: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" />
                        <input value={dayForm.theme} onChange={e => setDayForm({...dayForm, theme: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" placeholder="今日主題" />
                        <input value={dayForm.mainLocation} onChange={e => setDayForm({...dayForm, mainLocation: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" placeholder="城市 (天氣查詢)" />
                        <button onClick={handleAddDay} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black active:scale-95 transition-all shadow-lg">儲存日期</button>
                    </div>
                </div>
            )}

            {isEventModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 overflow-y-auto max-h-[90vh] space-y-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">{editingEvent ? '編輯項目' : '新增項目'}</h3><button onClick={() => setIsEventModalOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {(['sightseeing', 'food', 'transport', 'accommodation', 'event', 'shopping'] as EventType[]).map(cat => (
                                <button key={cat} onClick={() => setEventForm({...eventForm, type: cat})} className={`flex-none px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${eventForm.type === cat ? `${getCategoryColor(cat)} text-white` : 'bg-white text-milk-tea-400'}`}>{getCategoryLabel(cat)}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <input type="time" value={eventForm.time} onChange={e => setEventForm({...eventForm, time: e.target.value})} className="col-span-1 p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" />
                            <input value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="col-span-3 p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" placeholder="項目名稱" />
                        </div>
                        <input value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold outline-none" placeholder="地點 / 地址" />
                        <textarea rows={3} value={eventForm.note} onChange={e => setEventForm({...eventForm, note: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold outline-none resize-none" placeholder="備註..." />
                        <div className="flex gap-3">
                            {editingEvent && <button onClick={() => handleDeleteEvent(editingEvent.id)} className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl text-sm font-black active:scale-95 transition-all">刪除</button>}
                            <button onClick={handleSaveEvent} className="flex-[2] py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black active:scale-95 transition-all shadow-lg">儲存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Survival Guide View ---
export const SurvivalGuideView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'driving' | 'tipping' | 'clothing'>('tipping');
    const [bill, setBill] = useState('');
    const [serviceLevel, setServiceLevel] = useState<'average' | 'good' | 'excellent' | 'custom'>('good');
    const [customPct, setCustomPct] = useState('18');

    const tippingResult = useMemo(() => {
        const val = parseFloat(bill);
        if (isNaN(val)) return null;
        let percentage = 18;
        if (serviceLevel === 'average') percentage = 15;
        else if (serviceLevel === 'good') percentage = 18;
        else if (serviceLevel === 'excellent') percentage = 20;
        else percentage = parseFloat(customPct) || 0;
        const tipAmount = val * (percentage / 100);
        const total = val + tipAmount;
        return { pct: percentage, tip: tipAmount.toFixed(2), total: total.toFixed(2) };
    }, [bill, serviceLevel, customPct]);

    return (
        <div className="space-y-4 pb-24">
            <div className="flex bg-white p-1 rounded-2xl border border-milk-tea-100 mx-auto max-w-[320px] shadow-sm">
                {(['driving', 'tipping', 'clothing'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${activeTab === t ? 'bg-milk-tea-800 text-white shadow-md' : 'text-milk-tea-300'}`}>
                        {t === 'driving' ? '🚗 自駕' : t === 'tipping' ? '💵 小費' : '🧥 穿衣'}
                    </button>
                ))}
            </div>
            {activeTab === 'tipping' ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-milk-tea-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                        <h3 className="text-xs font-black opacity-80 mb-4 tracking-widest uppercase">小費速算 (USD)</h3>
                        <div className="mb-6 relative z-10">
                            <label className="text-[10px] font-black opacity-90 mb-2 block uppercase text-white">未稅金額 (Subtotal)</label>
                            <input type="number" inputMode="decimal" value={bill} onChange={e => setBill(e.target.value)} className="w-full bg-white text-black text-2xl font-black rounded-2xl p-4 outline-none border-2 border-milk-tea-600 shadow-inner" placeholder="0.00" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {(['average', 'good', 'excellent', 'custom'] as const).map(lvl => (
                                <button key={lvl} onClick={() => setServiceLevel(lvl)} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${serviceLevel === lvl ? 'bg-white text-black border-white' : 'bg-milk-tea-900/40 text-milk-tea-50'}`}>
                                    {lvl === 'average' ? '普通 (15%)' : lvl === 'good' ? '不錯 (18%)' : lvl === 'excellent' ? '極佳 (20%)' : '自訂 %'}
                                </button>
                            ))}
                        </div>
                        {tippingResult && (
                            <div className="mt-8 space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <div className="flex justify-between items-center text-sm font-bold border-b border-white/10 pb-2"><span className="text-milk-tea-100">小費金額 ({tippingResult.pct}%)</span><span className="text-white">${tippingResult.tip}</span></div>
                                <div className="flex justify-between items-center"><span className="text-xs font-black uppercase text-milk-tea-200">總額 (Total)</span><span className="text-3xl font-black text-white">${tippingResult.total}</span></div>
                            </div>
                        )}
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-milk-tea-100 space-y-3 shadow-sm">
                        <h3 className="font-black text-sm text-milk-tea-800">小費情境</h3>
                        <div className="space-y-2 text-[11px] font-bold text-gray-700">
                            <p className="p-3 bg-milk-tea-50 rounded-xl"><span className="text-milk-tea-600">餐廳:</span> 午餐 15-18%, 晚餐 18-22%。</p>
                            <p className="p-3 bg-milk-tea-50 rounded-xl"><span className="text-milk-tea-600">自助餐:</span> 每人約 $1-3 元給收盤子的。</p>
                            <p className="p-3 bg-milk-tea-50 rounded-xl"><span className="text-milk-tea-600">飯店:</span> 床頭小費每天 $2-5。行李員每件 $1-2。</p>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'driving' ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-white p-5 rounded-3xl border border-milk-tea-100 space-y-4 shadow-sm">
                        <h3 className="font-black text-sm text-milk-tea-800">🛑 自駕重點法規</h3>
                        <div className="space-y-3 font-bold text-[11px] leading-relaxed">
                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-1"><p className="text-[10px] font-black uppercase text-red-700">STOP Sign</p><p>看見 STOP 必須「完全停死」3秒。先到先走；若同時抵達則右方優先。未停穩罰金極重。</p></div>
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-1"><p className="text-[10px] font-black uppercase text-blue-700">紅燈右轉</p><p>除非有標誌禁轉，紅燈可右轉。轉彎前必須完全停穩，確認左右無人才可通過。</p></div>
                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-1"><p className="text-[10px] font-black uppercase text-amber-700">Carpool / HOV</p><p>載客 2人(含)以上方可進入。單人誤闖罰金約 $490 起。</p></div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-white p-5 rounded-3xl border border-milk-tea-100 space-y-6 shadow-sm">
                        <h3 className="text-lg font-black text-milk-tea-900">各區穿衣與氣候</h3>
                        <div className="space-y-4 text-[11px] font-bold">
                            <div className="border-l-4 border-blue-200 pl-4 py-1"><h4 className="font-black text-blue-700 mb-1">舊金山 SF</h4><p>平均 10-18°C。風極大且寒。必備：防風外套、輕薄發熱衣。</p></div>
                            <div className="border-l-4 border-orange-200 pl-4 py-1"><h4 className="font-black text-orange-700 mb-1">洛杉磯 LA</h4><p>平均 12-25°C。日夜溫差很大。白天短袖，傍晚後必須外套。</p></div>
                            <div className="border-l-4 border-red-200 pl-4 py-1"><h4 className="font-black text-red-700 mb-1">峽谷區</h4><p>極度乾燥。清晨 0-5°C，白天乾熱。必備：護唇膏、保濕乳液。</p></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Expense View ---
export const ExpenseView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<Expense>({ id: '', item: '', amount: 0, currency: 'USD', paymentMethod: 'cash', isShared: true, date: new Date().toISOString().split('T')[0], type: 'daily' });
    const rate = data.settings.exchangeRate;

    const stats = useMemo(() => {
        let jing = 0; let xiang = 0;
        data.expenses.forEach(e => {
            if (!e.isShared) return;
            const val = e.currency === 'USD' ? e.amount : e.amount / rate;
            if (e.paymentMethod === 'jing_card') jing += val;
            else if (e.paymentMethod === 'xiang_card') xiang += val;
        });
        const balance = (jing - xiang) / 2;
        return { jing, xiang, balance };
    }, [data.expenses, rate]);

    const handleSave = () => {
        if (!form.item || !form.amount) return;
        const nextData = { ...data, expenses: [{ ...form, id: Date.now().toString() }, ...data.expenses] };
        setData(nextData);
        saveData(nextData);
        setIsModalOpen(false);
        setForm({ id: '', item: '', amount: 0, currency: 'USD', paymentMethod: 'cash', isShared: true, date: new Date().toISOString().split('T')[0], type: 'daily' });
    };

    return (
        <div className="space-y-4 pb-24">
            <div className="bg-milk-tea-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                <h3 className="text-xs font-black uppercase opacity-60 mb-4 tracking-widest">支出結算 (USD)</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><p className="text-[10px] opacity-60">璟已付</p><p className="text-xl font-black">${formatMoney(stats.jing)}</p></div>
                    <div className="text-right"><p className="text-[10px] opacity-60">翔已付</p><p className="text-xl font-black">${formatMoney(stats.xiang)}</p></div>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl flex justify-between items-center border border-white/10">
                    <span className="text-xs font-bold">{stats.balance > 0 ? '翔 需給 璟' : stats.balance < 0 ? '璟 需給 翔' : '雙方平衡'}</span>
                    <span className="text-xl font-black text-milk-tea-100">${formatMoney(Math.abs(stats.balance))}</span>
                </div>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="w-full py-4 bg-milk-tea-100 text-milk-tea-800 rounded-2xl text-[10px] font-black border border-milk-tea-200 active:scale-95 transition-all shadow-sm"><i className="fa-solid fa-plus mr-2"></i> 記錄支出</button>
            <div className="space-y-2">
                {data.expenses.map(exp => (
                    <div key={exp.id} onClick={() => { if(confirm("刪除這筆支出？")){ setData({...data, expenses: data.expenses.filter(e => e.id !== exp.id)}); saveData({...data, expenses: data.expenses.filter(e => e.id !== exp.id)}); } }} className="bg-white p-4 rounded-2xl border border-milk-tea-50 flex justify-between items-center shadow-sm active:bg-milk-tea-50 transition-all">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] ${getPaymentColor(exp.paymentMethod)} shadow-sm`}><i className="fa-solid fa-credit-card"></i></div>
                            <div><h4 className="font-bold text-milk-tea-800 text-sm">{exp.item}</h4><p className="text-[9px] text-milk-tea-400 font-bold">{getPaymentLabel(exp.paymentMethod)} · {exp.date}</p></div>
                        </div>
                        <p className="text-sm font-black text-milk-tea-900">{exp.currency === 'USD' ? '$' : 'NT$'} {formatMoney(exp.amount)}</p>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">記錄支出</h3><button onClick={() => setIsModalOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
                        <div className="flex gap-2">
                            {(['cash', 'jing_card', 'xiang_card'] as PaymentMethod[]).map(m => (
                                <button key={m} onClick={() => setForm({...form, paymentMethod: m})} className={`flex-1 py-3 rounded-xl text-[10px] font-bold border transition-all ${form.paymentMethod === m ? 'bg-milk-tea-800 text-white' : 'bg-milk-tea-50 text-milk-tea-400'}`}>{getPaymentLabel(m)}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" placeholder="金額" />
                            <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value as Currency})} className="p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none"><option value="USD">USD</option><option value="TWD">TWD</option></select>
                        </div>
                        <input value={form.item} onChange={e => setForm({...form, item: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" placeholder="品項名稱" />
                        <label className="flex items-center justify-between p-3 bg-milk-tea-50 rounded-xl font-bold text-xs"><span>共享支出？</span><input type="checkbox" checked={form.isShared} onChange={e => setForm({...form, isShared: e.target.checked})} className="w-5 h-5 accent-milk-tea-800" /></label>
                        <button onClick={handleSave} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black active:scale-95 transition-all shadow-lg">儲存支出</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Spots View ---
export const SpotsView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
    const [selectedSpotForItinerary, setSelectedSpotForItinerary] = useState<Spot | null>(null);
    const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
    const [form, setForm] = useState<Spot>({ id: '', name: '', category: 'sightseeing', city: '', location: '', note: '' });

    const handleOpenModal = (spot?: Spot) => {
        if (spot) { setEditingSpot(spot); setForm(spot); }
        else { setEditingSpot(null); setForm({ id: '', name: '', category: 'sightseeing', city: '', location: '', note: '' }); }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!form.name) return;
        let nextSpots = editingSpot ? data.backupSpots.map(s => s.id === editingSpot.id ? { ...form } : s) : [{ ...form, id: Date.now().toString() }, ...data.backupSpots];
        setData({ ...data, backupSpots: nextSpots });
        saveData({ ...data, backupSpots: nextSpots });
        setIsModalOpen(false);
    };

    const handleAddToItinerary = (dayIndex: number) => {
        if (!selectedSpotForItinerary) return;
        const spot = selectedSpotForItinerary;
        const newEvent: TripEvent = { id: Date.now().toString(), time: '12:00', title: spot.name, type: (spot.category as EventType) || 'sightseeing', location: spot.location, note: spot.note || '一鍵轉入' };
        const updatedItinerary = data.itinerary.map((d, i) => i === dayIndex ? { ...d, events: [...d.events, newEvent].sort((a,b) => a.time.localeCompare(b.time)) } : d);
        setData({ ...data, itinerary: updatedItinerary });
        saveData({ ...data, itinerary: updatedItinerary });
        setIsDayPickerOpen(false);
        setSelectedSpotForItinerary(null);
        alert(`已加入行程！`);
    };

    return (
        <div className="space-y-4 pb-24">
            <div className="bg-white rounded-3xl p-5 border border-milk-tea-100 flex justify-between items-center shadow-sm">
                <div><h2 className="text-xl font-black text-milk-tea-900 mb-1">口袋名單</h2><p className="text-[10px] text-milk-tea-400 font-bold uppercase tracking-widest">Collaborative Bucket List</p></div>
                <button onClick={() => handleOpenModal()} className="w-10 h-10 bg-pink-50 text-pink-400 rounded-full flex items-center justify-center active:scale-95 shadow-sm"><i className="fa-solid fa-plus"></i></button>
            </div>
            <div className="space-y-3">
                {data.backupSpots.map(spot => (
                    <div key={spot.id} className="bg-white p-4 rounded-2xl border border-milk-tea-50 shadow-sm transition-all active:bg-milk-tea-50">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${getCategoryColor(spot.category)} text-white`}>{getCategoryLabel(spot.category)}</span>
                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedSpotForItinerary(spot); setIsDayPickerOpen(true); }} className="w-8 h-8 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center shadow-sm active:scale-90"><i className="fa-solid fa-calendar-plus text-[10px]"></i></button>
                                <button onClick={() => openInGoogleMaps(spot.location)} className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shadow-sm active:scale-90"><i className="fa-solid fa-compass text-xs"></i></button>
                                <button onClick={() => handleOpenModal(spot)} className="w-8 h-8 bg-milk-tea-50 text-milk-tea-400 rounded-full flex items-center justify-center shadow-sm active:scale-90"><i className="fa-solid fa-pen text-[9px]"></i></button>
                                <button onClick={() => { if(confirm("移除收藏？")){ setData({...data, backupSpots: data.backupSpots.filter(s => s.id !== spot.id)}); saveData({...data, backupSpots: data.backupSpots.filter(s => s.id !== spot.id)}); } }} className="w-8 h-8 bg-red-50 text-red-300 rounded-full flex items-center justify-center shadow-sm active:scale-90"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                            </div>
                        </div>
                        <h4 className="font-bold text-milk-tea-900 text-sm">{spot.name}</h4>
                        <p className="text-[10px] text-milk-tea-500 mt-1 font-bold truncate"><i className="fa-solid fa-location-dot mr-1"></i>{spot.location}</p>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">編輯收藏</h3><button onClick={() => setIsModalOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none border border-transparent focus:border-milk-tea-100" placeholder="景點名稱" />
                        <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none border border-transparent focus:border-milk-tea-100" placeholder="地址" />
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value as SpotCategory})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none"><option value="sightseeing">景點</option><option value="food">美食</option><option value="shopping">購物</option></select>
                        <textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold outline-none resize-none" rows={3} placeholder="備註..." />
                        <button onClick={handleSave} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black active:scale-95 transition-all shadow-lg">儲存收藏</button>
                    </div>
                </div>
            )}

            {isDayPickerOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[110] flex items-center justify-center p-6 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        <h3 className="text-sm font-black text-milk-tea-800 text-center uppercase tracking-widest">轉入哪一天的行程？</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                            {data.itinerary.map((d, i) => (
                                <button key={i} onClick={() => handleAddToItinerary(i)} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-milk-tea-700 hover:bg-milk-tea-100 transition-colors">{d.date}</button>
                            ))}
                        </div>
                        <button onClick={() => setIsDayPickerOpen(false)} className="w-full py-3 text-xs font-bold text-milk-tea-300">取消</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Todo View ---
export const TodoView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [newTodo, setNewTodo] = useState('');
    const [activeCategory, setActiveCategory] = useState<'general' | 'packing'>('general');
    const [daysBefore, setDaysBefore] = useState<string>('');

    const handleToggle = (id: string) => {
        const next = { ...data, todos: data.todos.map(t => t.id === id ? { ...t, done: !t.done } : t) };
        setData(next);
        saveData(next);
    };
    const handleAdd = () => {
        if (!newTodo) return;
        const next = { ...data, todos: [{ id: Date.now().toString(), text: newTodo, done: false, category: activeCategory, daysBefore: daysBefore ? parseInt(daysBefore) : undefined }, ...data.todos] };
        setData(next);
        saveData(next);
        setNewTodo('');
        setDaysBefore('');
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="bg-white p-5 rounded-3xl border border-milk-tea-50 shadow-sm space-y-4">
                <div className="flex gap-2">
                    {(['general', 'packing'] as const).map(c => (
                        <button key={c} onClick={() => setActiveCategory(c)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${activeCategory === c ? 'bg-milk-tea-800 text-white shadow-md' : 'bg-milk-tea-50 text-milk-tea-300'}`}>{c === 'general' ? '一般代辦' : '行李打包'}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input value={newTodo} onChange={e => setNewTodo(e.target.value)} placeholder="新增項目..." className="flex-1 p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none border border-transparent focus:border-milk-tea-100" />
                    <input type="number" value={daysBefore} onChange={e => setDaysBefore(e.target.value)} placeholder="天前" className="w-16 p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none text-center" />
                    <button onClick={handleAdd} className="bg-milk-tea-800 text-white px-5 rounded-xl active:scale-90 transition-all shadow-md"><i className="fa-solid fa-plus"></i></button>
                </div>
            </div>

            <div className="space-y-8">
                {/* 分開顯示兩大清單 */}
                <section className="space-y-3">
                    <h3 className="px-2 text-[11px] font-black text-milk-tea-800 uppercase tracking-widest border-l-4 border-milk-tea-800 pl-3">📋 一般代辦事項</h3>
                    <div className="space-y-2">
                        {data.todos.filter(t => t.category === 'general').sort((a,b) => (b.daysBefore || 0) - (a.daysBefore || 0)).map(t => (
                            <div key={t.id} onClick={() => handleToggle(t.id)} className={`bg-white p-4 rounded-2xl border border-milk-tea-50 flex items-center gap-3 transition-all active:scale-[0.98] shadow-sm ${t.done ? 'opacity-40' : ''}`}>
                                <i className={`fa-solid ${t.done ? 'fa-circle-check text-milk-tea-800' : 'fa-circle text-milk-tea-100'} text-lg`}></i>
                                <div className="flex-1">
                                    <span className={`text-xs font-bold ${t.done ? 'line-through' : ''}`}>{t.text}</span>
                                    {t.daysBefore !== undefined && <span className="ml-2 px-1.5 py-0.5 bg-milk-tea-100 text-milk-tea-600 text-[8px] font-black rounded">{t.daysBefore} 天前</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-3">
                    <h3 className="px-2 text-[11px] font-black text-milk-tea-800 uppercase tracking-widest border-l-4 border-amber-400 pl-3">🧳 行李打包清單</h3>
                    <div className="space-y-2">
                        {data.todos.filter(t => t.category === 'packing').sort((a,b) => (b.daysBefore || 0) - (a.daysBefore || 0)).map(t => (
                            <div key={t.id} onClick={() => handleToggle(t.id)} className={`bg-white p-4 rounded-2xl border border-milk-tea-50 flex items-center gap-3 transition-all active:scale-[0.98] shadow-sm ${t.done ? 'opacity-40' : ''}`}>
                                <i className={`fa-solid ${t.done ? 'fa-circle-check text-amber-500' : 'fa-circle text-milk-tea-100'} text-lg`}></i>
                                <div className="flex-1">
                                    <span className={`text-xs font-bold ${t.done ? 'line-through' : ''}`}>{t.text}</span>
                                    {t.daysBefore !== undefined && <span className="ml-2 px-1.5 py-0.5 bg-milk-tea-100 text-milk-tea-600 text-[8px] font-black rounded">{t.daysBefore} 天前</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

// --- Other views preserved... ---
export const MapView: React.FC<{ data: AppData; selectedDayIndex: number }> = ({ data, selectedDayIndex }) => {
    const day = data.itinerary[selectedDayIndex];
    return (
        <div className="space-y-4 pb-24 text-center">
            <div className="bg-white rounded-3xl p-5 border border-milk-tea-100 shadow-sm"><h2 className="text-xl font-black text-milk-tea-900">路徑導航</h2><p className="text-[10px] text-milk-tea-400 font-bold uppercase">{day?.date || '請選擇行程天數'}</p></div>
            <div className="aspect-square bg-white rounded-3xl border border-milk-tea-100 flex flex-col items-center justify-center p-8 gap-6 shadow-inner">
                <i className="fa-solid fa-map-location-dot text-6xl text-blue-500 opacity-20"></i>
                <p className="text-[11px] font-bold text-milk-tea-500 px-4">將自動串連當天所有行程地點，生成 Google Maps 多點導航路徑。</p>
                {day && <button onClick={() => openDailyRoute(day)} className="bg-blue-600 text-white px-10 py-4 rounded-2xl text-[13px] font-black shadow-xl active:scale-95 transition-all">開啟路徑導航</button>}
            </div>
        </div>
    );
};

export const GasView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<GasStation>({ id: '', name: '', address: '', description: '', isCostco: true });

    const handleSave = () => {
        if (!form.name || !form.address) return;
        const nextData = { ...data, gasStations: [{ ...form, id: Date.now().toString() }, ...data.gasStations] };
        setData(nextData); saveData(nextData); setIsModalOpen(false);
    };

    return (
        <div className="space-y-4 pb-24">
            <div className="bg-gradient-to-br from-red-600 to-blue-700 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                <h3 className="font-black text-sm uppercase mb-3 relative z-10 flex items-center gap-2"><i className="fa-solid fa-id-card"></i> Costco 加油攻略</h3>
                <ul className="text-[11px] space-y-2 font-bold opacity-90 relative z-10">
                    <li>1. 插卡後若要求 ZIP Code，按取消或叫店員。</li>
                    <li>2. 說: "International card, bypass ZIP?"</li>
                    <li>3. 店員會來刷卡繞過驗證即可加油。</li>
                    <li>4. 或輸入 99999 / 00000 嘗試通過。</li>
                </ul>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="w-full py-4 bg-white border-2 border-dashed border-milk-tea-200 text-milk-tea-400 rounded-2xl text-[10px] font-black active:scale-95 transition-all shadow-sm"><i className="fa-solid fa-plus mr-2"></i> 新增加油點</button>
            <div className="space-y-2">
                {data.gasStations.map(gs => (
                    <div key={gs.id} className="bg-white p-4 rounded-2xl border border-milk-tea-50 flex justify-between items-center shadow-sm">
                        <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white ${gs.isCostco ? 'bg-red-500' : 'bg-blue-500'}`}>{gs.isCostco ? 'COSTCO' : 'GAS'}</span>
                                <h4 className="font-bold text-milk-tea-800 text-sm truncate">{gs.name}</h4>
                            </div>
                            <p className="text-[10px] text-milk-tea-400 truncate font-bold">{gs.description}</p>
                        </div>
                        <button onClick={() => openInGoogleMaps(gs.address)} className="w-10 h-10 bg-milk-tea-50 text-milk-tea-300 rounded-full flex items-center justify-center shadow-sm active:scale-90"><i className="fa-solid fa-location-arrow text-sm"></i></button>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">新增加油站</h3><button onClick={() => setIsModalOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none w-full" placeholder="名稱" />
                        <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none w-full" placeholder="地址 (導航用)" />
                        <label className="flex items-center justify-between p-3 bg-milk-tea-50 rounded-xl font-bold text-xs"><span>Costco？</span><input type="checkbox" checked={form.isCostco} onChange={e => setForm({...form, isCostco: e.target.checked})} className="w-5 h-5 accent-red-500" /></label>
                        <button onClick={handleSave} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black active:scale-95 transition-all shadow-lg">儲存站點</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardView;
