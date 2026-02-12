
import React, { useState, useEffect, useMemo } from 'react';
import { AppData, saveData } from '../services/storageService';
import { TripEvent, ItineraryDay, Expense, Spot, Todo, EventType, PaymentMethod, SpotCategory, ExpenseType, GasStation, Currency, ViewType } from '../types';

// 修正 GitHub Actions 編譯時找不到 process 的報錯
declare var process: any;

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
                <div><h1 className="text-lg font-black text-milk-tea-800">Hello, 2026!</h1><p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Our West Coast Adventure</p></div>
                <button onClick={() => setView('settings')} className="w-10 h-10 bg-white rounded-full shadow-sm border border-milk-tea-100 flex items-center justify-center text-milk-tea-600 active:scale-90 transition-all shadow-md"><i className="fa-solid fa-cloud-arrow-up text-lg"></i></button>
            </div>
            <div className="bg-gradient-to-r from-milk-tea-600 to-milk-tea-800 rounded-3xl p-6 text-white card-shadow relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12"><i className="fa-solid fa-plane-departure text-9xl"></i></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div><p className="text-xs font-bold opacity-80 mb-1 uppercase tracking-widest">Adventure Begins In</p><h2 className="text-5xl font-black mb-4">{diffDays > 0 ? diffDays : 0} <span className="text-sm font-normal">Days</span></h2></div>
                    {data.itinerary[0] && <WeatherWidget lat={data.itinerary[0].lat} lon={data.itinerary[0].lon} />}
                </div>
            </div>
            <div className="bg-white rounded-3xl p-5 card-shadow border border-milk-tea-100">
                <h3 className="font-bold text-milk-tea-800 text-sm mb-4 tracking-tighter uppercase">預算概覽 (USD)</h3>
                <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-milk-tea-400 uppercase tracking-widest">Total Spent</span>
                    <div className="text-right"><p className="text-2xl font-black text-milk-tea-900">${formatMoney(totalSpentUSD)}</p><p className="text-[11px] font-bold text-milk-tea-500">≈ NT$ {formatMoney(totalSpentUSD * rate)}</p></div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setView('money')} className="bg-white p-4 rounded-2xl card-shadow flex flex-col items-center gap-2 border border-milk-tea-50 active:scale-95 transition-transform"><div className="w-8 h-8 rounded-full bg-milk-tea-100 text-milk-tea-600 flex items-center justify-center shadow-sm"><i className="fa-solid fa-wallet text-sm"></i></div><span className="text-[10px] font-bold text-milk-tea-800">記帳明細</span></button>
                <button onClick={() => setView('todo')} className="bg-white p-4 rounded-2xl card-shadow flex flex-col items-center gap-2 border border-milk-tea-50 active:scale-95 transition-transform"><div className="w-8 h-8 rounded-full bg-milk-tea-100 text-milk-tea-600 flex items-center justify-center shadow-sm"><i className="fa-solid fa-check text-sm"></i></div><span className="text-[10px] font-bold text-milk-tea-800">代辦/行李</span></button>
                
                <button onClick={() => setView('gas')} className="bg-white p-4 rounded-2xl card-shadow flex flex-col items-center gap-2 border border-milk-tea-50 active:scale-95 transition-transform"><div className="w-8 h-8 rounded-full bg-milk-tea-100 text-red-500 flex items-center justify-center shadow-sm"><i className="fa-solid fa-gas-pump text-sm"></i></div><span className="text-[10px] font-bold text-milk-tea-800">加油秘笈</span></button>
                <button onClick={() => setView('guide')} className="bg-white p-4 rounded-2xl card-shadow flex flex-col items-center gap-2 border border-milk-tea-50 active:scale-95 transition-transform"><div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm"><i className="fa-solid fa-coins text-sm"></i></div><span className="text-[10px] font-bold text-milk-tea-800">小費速算</span></button>

                <button onClick={() => setView('spots')} className="bg-white p-4 rounded-2xl card-shadow flex flex-col items-center gap-2 border border-milk-tea-50 active:scale-95 transition-transform"><div className="w-8 h-8 rounded-full bg-milk-tea-100 text-pink-400 flex items-center justify-center shadow-sm"><i className="fa-solid fa-heart text-sm"></i></div><span className="text-[10px] font-bold text-milk-tea-800">口袋名單</span></button>
                <button onClick={() => setView('map')} className="bg-white p-4 rounded-2xl card-shadow flex flex-col items-center gap-2 border border-milk-tea-50 active:scale-95 transition-transform"><div className="w-8 h-8 rounded-full bg-milk-tea-100 text-blue-500 flex items-center justify-center shadow-sm"><i className="fa-solid fa-map-location-dot text-sm"></i></div><span className="text-[10px] font-bold text-milk-tea-800">地圖導航</span></button>
            </div>
        </div>
    );
};

// --- Itinerary View ---
export const ItineraryView: React.FC<{ data: AppData; setData: any; selectedDayIndex: number; setSelectedDayIndex: any }> = ({ data, setData, selectedDayIndex, setSelectedDayIndex }) => {
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<TripEvent | null>(null);

    // 確保這裡的初始化包含所有必要的屬性
    const [dayForm, setDayForm] = useState<Omit<ItineraryDay, 'events'>>({ 
        date: '', 
        calendarDate: '', 
        theme: '', 
        mainLocation: '', 
        lat: 34.05, 
        lon: -118.24 
    });
    
    const [eventForm, setEventForm] = useState<TripEvent>({
        id: '', time: '09:00', title: '', type: 'sightseeing', location: '', note: '', url: ''
    });

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
        
        const nextData = { ...data, itinerary: updatedItinerary };
        setData(nextData);
        saveData(nextData);
        setIsEventModalOpen(false);
    };

    const handleDeleteEvent = (id: string) => {
        if (!confirm("確定刪除此行程項目？")) return;
        const updatedItinerary = data.itinerary.map((d, i) => i === selectedDayIndex ? { ...d, events: d.events.filter(e => e.id !== id) } : d);
        const nextData = { ...data, itinerary: updatedItinerary };
        setData(nextData);
        saveData(nextData);
        setIsEventModalOpen(false);
    };

    return (
        <div className="space-y-4 pb-24">
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
                {data.itinerary.map((d, i) => (
                    <button key={i} onClick={() => setSelectedDayIndex(i)} className={`flex-none px-4 py-2 rounded-2xl font-black text-xs border transition-all ${selectedDayIndex === i ? 'bg-milk-tea-800 text-white border-transparent shadow-md' : 'bg-white text-milk-tea-400 border-milk-tea-100'}`}>
                        {d.date}
                    </button>
                ))}
                <button onClick={() => setIsDayModalOpen(true)} className="flex-none px-4 py-2 rounded-2xl bg-milk-tea-100 text-milk-tea-600 font-black text-xs border border-milk-tea-200 shadow-sm">
                    <i className="fa-solid fa-plus mr-1"></i> 新增天數
                </button>
            </div>

            {currentDay ? (
                <>
                    <div className="bg-white rounded-3xl p-5 card-shadow border border-milk-tea-100 flex justify-between items-center">
                        <div>
                            <span className="px-2 py-0.5 bg-milk-tea-600 text-white text-[9px] font-bold rounded mb-1 inline-block uppercase tracking-wider">{currentDay.theme}</span>
                            <h2 className="text-2xl font-black text-milk-tea-900 leading-none">{currentDay.date}</h2>
                            <p className="text-[10px] text-milk-tea-500 font-bold mt-1 uppercase tracking-widest">{currentDay.calendarDate || '未選擇日期'} · {currentDay.mainLocation}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <WeatherWidget lat={currentDay.lat} lon={currentDay.lon} />
                            <button onClick={() => openDailyRoute(currentDay)} className="text-[10px] font-black text-white bg-milk-tea-800 px-3 py-1.5 rounded-xl border border-milk-tea-800 shadow-sm active:scale-95 transition-all">
                                <i className="fa-solid fa-route mr-1"></i> 今日導航
                            </button>
                        </div>
                    </div>

                    <div className="pl-3 border-l-2 border-milk-tea-200 space-y-4 ml-1">
                        {currentDay.events.map(event => (
                            <div key={event.id} className="relative bg-white p-4 rounded-2xl card-shadow border border-milk-tea-50 active:bg-milk-tea-50/30 transition-all group">
                                <div className={`absolute -left-[18px] top-5 w-2.5 h-2.5 rounded-full border-2 border-white ${getCategoryColor(event.type)}`}></div>
                                
                                <div className="flex justify-between items-start mb-1">
                                    <div onClick={() => { setEditingEvent(event); setEventForm(event); setIsEventModalOpen(true); }} className="flex-1 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-milk-tea-400">{event.time}</span>
                                            <span className={`text-[8px] text-white px-2 py-0.5 rounded-full font-black uppercase ${getCategoryColor(event.type)} shadow-sm`}>{getCategoryLabel(event.type)}</span>
                                        </div>
                                        <h3 className="text-sm font-bold text-milk-tea-900 mt-0.5">{event.title}</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        {event.location && (
                                            <button onClick={() => openInGoogleMaps(event.location)} className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center hover:bg-blue-100 active:scale-90 transition-all shadow-sm">
                                                <i className="fa-solid fa-compass text-[11px]"></i>
                                            </button>
                                        )}
                                        <button onClick={() => { setEditingEvent(event); setEventForm(event); setIsEventModalOpen(true); }} className="w-8 h-8 bg-milk-tea-50 text-milk-tea-300 rounded-full flex items-center justify-center shadow-sm">
                                            <i className="fa-solid fa-pen text-[9px]"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div onClick={() => { setEditingEvent(event); setEventForm(event); setIsEventModalOpen(true); }} className="cursor-pointer">
                                    {event.location && <p className="text-[9px] text-milk-tea-400 mt-1 truncate"><i className="fa-solid fa-location-dot mr-1 opacity-50"></i>{event.location}</p>}
                                    {event.note && <p className="text-[9px] text-milk-tea-500 mt-2 bg-milk-tea-50/50 p-2 rounded-lg italic border border-milk-tea-100/30 whitespace-pre-line">"{event.note}"</p>}
                                </div>
                            </div>
                        ))}
                        <button onClick={() => { setEditingEvent(null); setEventForm({id: '', time: '12:00', title: '', type: 'sightseeing', location: '', note: '', url: ''}); setIsEventModalOpen(true); }} className="w-full py-4 border-2 border-dashed border-milk-tea-200 text-milk-tea-400 rounded-2xl text-[10px] font-black bg-white/50 active:bg-white active:border-milk-tea-400 transition-all">
                            <i className="fa-solid fa-plus mr-2"></i> 新增行程項目
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-center py-20">
                    <i className="fa-solid fa-calendar-plus text-milk-tea-100 text-5xl mb-4"></i>
                    <p className="text-milk-tea-300 font-bold">點擊上方新增您的第一天行程</p>
                </div>
            )}

            {isDayModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">行程天數管理</h3><button onClick={() => setIsDayModalOpen(false)}><i className="fa-solid fa-xmark text-milk-tea-300"></i></button></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[9px] font-black text-milk-tea-400 uppercase ml-1 tracking-widest">天數編號</label><input value={dayForm.date} onChange={e => setDayForm({...dayForm, date: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none border border-transparent focus:border-milk-tea-300" placeholder="Day 1" /></div>
                            <div><label className="text-[9px] font-black text-milk-tea-400 uppercase ml-1 tracking-widest">選擇具體日期</label><input type="date" value={dayForm.calendarDate} onChange={e => setDayForm({...dayForm, calendarDate: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none border border-transparent focus:border-milk-tea-300" /></div>
                        </div>
                        <div><label className="text-[9px] font-black text-milk-tea-400 uppercase ml-1 tracking-widest">今日主題</label><input value={dayForm.theme} onChange={e => setDayForm({...dayForm, theme: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none border border-transparent focus:border-milk-tea-300" placeholder="如: 抵達洛杉磯" /></div>
                        <div><label className="text-[9px] font-black text-milk-tea-400 uppercase ml-1 tracking-widest">城市名稱 (天氣用)</label><input value={dayForm.mainLocation} onChange={e => setDayForm({...dayForm, mainLocation: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none border border-transparent focus:border-milk-tea-300" placeholder="如: Los Angeles" /></div>
                        <button onClick={handleAddDay} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black shadow-lg active:scale-95 transition-all">儲存日期資訊</button>
                    </div>
                </div>
            )}

            {isEventModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 overflow-y-auto max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-milk-tea-900">{editingEvent ? '編輯項目' : '新增項目'}</h3>
                            <div className="flex gap-4 items-center">
                                {editingEvent && <button onClick={() => handleDeleteEvent(editingEvent.id)} className="text-red-400 text-xs font-bold hover:text-red-600"><i className="fa-solid fa-trash mr-1"></i> 刪除</button>}
                                <button onClick={() => setIsEventModalOpen(false)} className="w-8 h-8 rounded-full bg-milk-tea-50 text-milk-tea-300 flex items-center justify-center shadow-md"><i className="fa-solid fa-xmark"></i></button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[9px] font-black text-milk-tea-400 uppercase ml-1 tracking-widest">選擇類別</label>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {(['sightseeing', 'food', 'transport', 'accommodation', 'event', 'shopping'] as EventType[]).map(cat => (
                                    <button key={cat} onClick={() => setEventForm({...eventForm, type: cat})} className={`flex-none px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${eventForm.type === cat ? `${getCategoryColor(cat)} text-white border-transparent shadow-sm` : 'bg-white text-milk-tea-400 border-milk-tea-100'}`}>
                                        {getCategoryLabel(cat)}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-1"><label className="text-[9px] font-black text-milk-tea-400 uppercase ml-1 tracking-widest">時間</label><input type="time" value={eventForm.time} onChange={e => setEventForm({...eventForm, time: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none" /></div>
                                <div className="col-span-3"><label className="text-[9px] font-black text-milk-tea-400 uppercase ml-1 tracking-widest">項目名稱</label><input value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none" placeholder="輸入地點或事項" /></div>
                            </div>
                            <div><label className="text-[9px] font-black text-milk-tea-400 uppercase ml-1 tracking-widest">地址 / 地點 (導航用)</label><input value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold text-black outline-none" placeholder="貼上 Google Maps 地址" /></div>
                            <div><label className="text-[9px] font-black text-milk-tea-400 uppercase ml-1 tracking-widest">備註 / 訂位代號</label><textarea rows={3} value={eventForm.note} onChange={e => setEventForm({...eventForm, note: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold text-black outline-none resize-none" placeholder="其他重要資訊..." /></div>
                            <button onClick={handleSaveEvent} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black shadow-lg active:scale-95 transition-all">儲存行程項目</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Survival Guide View (Enhanced Tipping Calculator) ---
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

        return {
            pct: percentage,
            tip: tipAmount.toFixed(2),
            total: total.toFixed(2)
        };
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
                    <div className="bg-milk-tea-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border-4 border-white/10">
                        <div className="absolute -right-4 -top-4 opacity-10 rotate-12"><i className="fa-solid fa-hand-holding-dollar text-8xl"></i></div>
                        
                        <h3 className="text-xs font-black opacity-80 mb-4 uppercase tracking-widest relative z-10 text-white">小費速算 (USD)</h3>
                        
                        <div className="mb-6 relative z-10">
                            <label className="text-[10px] font-black opacity-90 mb-2 block uppercase tracking-widest text-milk-tea-100">未稅金額 (Subtotal)</label>
                            <input 
                                type="number" 
                                inputMode="decimal"
                                value={bill} 
                                onChange={e => setBill(e.target.value)} 
                                className="w-full bg-white text-black text-2xl font-black rounded-2xl p-4 outline-none border-2 border-milk-tea-600 shadow-inner focus:ring-2 ring-milk-tea-300 transition-all placeholder:text-gray-400" 
                                placeholder="0.00" 
                            />
                        </div>

                        <div className="space-y-3 relative z-10">
                            <label className="text-[10px] font-black opacity-90 uppercase tracking-widest block text-milk-tea-100">服務滿意度</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['average', 'good', 'excellent', 'custom'] as const).map((lvl) => (
                                    <button 
                                        key={lvl}
                                        onClick={() => setServiceLevel(lvl)}
                                        className={`py-3 rounded-xl text-[10px] font-black border transition-all ${serviceLevel === lvl ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-milk-tea-900/40 text-milk-tea-50 border-white/20'}`}
                                    >
                                        {lvl === 'average' ? '普普通通 (15%)' : lvl === 'good' ? '服務不錯 (18%)' : lvl === 'excellent' ? '極佳讚爆 (20%)' : '自訂比例 %'}
                                    </button>
                                ))}
                            </div>

                            {serviceLevel === 'custom' && (
                                <div className="mt-2 flex items-center gap-3 animate-in slide-in-from-top-2">
                                    <input 
                                        type="number"
                                        value={customPct}
                                        onChange={e => setCustomPct(e.target.value)}
                                        className="flex-1 bg-white text-black border-none rounded-xl p-3 text-center text-sm font-black outline-none shadow-inner placeholder:text-gray-400"
                                        placeholder="輸入百分比"
                                    />
                                    <span className="text-lg font-black text-white">%</span>
                                </div>
                            )}
                        </div>

                        {tippingResult && (
                            <div className="mt-8 space-y-4 animate-in fade-in zoom-in-95 duration-300 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <div className="flex justify-between items-center text-sm font-bold border-b border-white/10 pb-2">
                                    <span className="text-milk-tea-100">小費金額 ({tippingResult.pct}%)</span>
                                    <span className="text-white">${tippingResult.tip}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-widest text-milk-tea-200">應付總額 (Total)</span>
                                    <span className="text-3xl font-black text-milk-tea-50 shadow-sm">${tippingResult.total}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'clothing' ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-white p-6 rounded-3xl card-shadow border border-milk-tea-100 space-y-6">
                        <h3 className="text-lg font-black text-milk-tea-900 flex items-center gap-2"><i className="fa-solid fa-shirt text-blue-300"></i> 各區穿衣與氣候</h3>
                        <div className="space-y-6">
                            <div className="border-l-4 border-blue-200 pl-4 py-1">
                                <h4 className="text-xs font-black text-blue-700 mb-1 uppercase tracking-widest">舊金山 SF / 沿海區</h4>
                                <p className="text-[11px] text-gray-700 font-bold leading-relaxed">平均 10-18°C。風極大且寒。必備：防風外套、輕薄發熱衣。洋蔥式穿法是唯一正解。</p>
                            </div>
                            <div className="border-l-4 border-orange-200 pl-4 py-1">
                                <h4 className="text-xs font-black text-orange-700 mb-1 uppercase tracking-widest">洛杉磯 LA / 聖地牙哥</h4>
                                <p className="text-[11px] text-gray-700 font-bold leading-relaxed">平均 12-25°C。日夜溫差大。白天可穿短袖+太陽眼鏡，但傍晚後必須加外套。</p>
                            </div>
                            <div className="border-l-4 border-red-200 pl-4 py-1">
                                <h4 className="text-xs font-black text-red-700 mb-1 uppercase tracking-widest">拉斯維加斯 / 峽谷區</h4>
                                <p className="text-[11px] text-gray-700 font-bold leading-relaxed">氣溫變幻莫測。清晨與深夜接近 0-5°C。必備：護唇膏、保濕乳液、防風羽絨外套。</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-white p-5 rounded-3xl card-shadow border border-milk-tea-100">
                        <h3 className="font-black text-sm text-milk-tea-800 mb-5 flex items-center gap-2"><i className="fa-solid fa-traffic-light text-red-400"></i> 🛑 重點交通法規</h3>
                        <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-2">
                                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">STOP Sign (生死攸關)</p>
                                <p className="text-[11px] text-red-800 font-bold leading-relaxed">看見此標誌必須「完全靜止」3秒，不可滑行。先到路口者先走。</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
                                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Carpool / HOV</p>
                                <p className="text-[11px] text-blue-800 font-bold leading-relaxed">最左側菱形標誌車道。需載有 2人(含)以上方可進入。單人誤闖罰金 $490 起。</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 其他 View (Expense, Spots, etc.) 保留原有邏輯並確保文字顏色 ---
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

    const handleDelete = (id: string) => {
        if (!confirm("確定刪除此筆支出記錄？")) return;
        const nextData = { ...data, expenses: data.expenses.filter(e => e.id !== id) };
        setData(nextData);
        saveData(nextData);
    };

    return (
        <div className="space-y-4 pb-24">
            <div className="bg-milk-tea-800 rounded-3xl p-5 text-white card-shadow relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><i className="fa-solid fa-receipt text-9xl"></i></div>
                <h3 className="text-xs font-black uppercase opacity-60 mb-4 tracking-widest relative z-10">共享支出結算 (USD)</h3>
                <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                    <div><p className="text-[10px] opacity-60">璟已刷卡/付</p><p className="text-xl font-black">${formatMoney(stats.jing)}</p></div>
                    <div className="text-right"><p className="text-[10px] opacity-60">翔已刷卡/付</p><p className="text-xl font-black">${formatMoney(stats.xiang)}</p></div>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl flex justify-between items-center border border-white/10 relative z-10">
                    <span className="text-xs font-bold">{stats.balance > 0 ? '翔 需支付給 璟' : stats.balance < 0 ? '璟 需支付給 翔' : '雙方目前平衡'}</span>
                    <span className="text-xl font-black text-milk-tea-100">${formatMoney(Math.abs(stats.balance))}</span>
                </div>
            </div>

            <button onClick={() => setIsModalOpen(true)} className="w-full py-4 bg-milk-tea-100 text-milk-tea-800 rounded-2xl text-[10px] font-black border border-milk-tea-200 shadow-sm active:scale-95 transition-all"><i className="fa-solid fa-plus mr-2"></i> 記錄新支出</button>

            <div className="space-y-2">
                {data.expenses.map(exp => (
                    <div key={exp.id} onContextMenu={(e) => { e.preventDefault(); handleDelete(exp.id); }} className="bg-white p-4 rounded-2xl card-shadow flex justify-between items-center border border-milk-tea-50 active:bg-milk-tea-50 transition-all">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] ${getPaymentColor(exp.paymentMethod)} shadow-sm`}><i className="fa-solid fa-credit-card"></i></div>
                            <div><h4 className="font-bold text-milk-tea-800 text-sm">{exp.item}</h4><p className="text-[9px] text-milk-tea-400 font-bold">{getPaymentLabel(exp.paymentMethod)} · {exp.date}</p></div>
                        </div>
                        <div className="text-right"><p className="text-sm font-black text-milk-tea-900">{exp.currency === 'USD' ? '$' : 'NT$'} {formatMoney(exp.amount)}</p></div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-center mb-2"><h3 className="text-lg font-black text-milk-tea-900">記錄一筆支出</h3><button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-milk-tea-50 text-milk-tea-300 flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button></div>
                        <div className="flex gap-2">
                            {(['cash', 'jing_card', 'xiang_card'] as PaymentMethod[]).map(m => (
                                <button key={m} onClick={() => setForm({...form, paymentMethod: m})} className={`flex-1 py-3 rounded-xl text-[10px] font-bold border transition-all ${form.paymentMethod === m ? 'bg-milk-tea-800 text-white border-transparent shadow-sm' : 'bg-milk-tea-50 text-milk-tea-400 border-milk-tea-100'}`}>{getPaymentLabel(m)}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[9px] font-black text-milk-tea-400 ml-1 tracking-widest uppercase">金額</label><input type="number" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none" placeholder="0.00" /></div>
                            <div><label className="text-[9px] font-black text-milk-tea-400 ml-1 tracking-widest uppercase">幣別</label><select value={form.currency} onChange={e => setForm({...form, currency: e.target.value as Currency})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none border-none"><option value="USD">USD</option><option value="TWD">TWD</option></select></div>
                        </div>
                        <div><label className="text-[9px] font-black text-milk-tea-400 ml-1 tracking-widest uppercase">支出品項 / 店名</label><input value={form.item} onChange={e => setForm({...form, item: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none" placeholder="例如：In-N-Out" /></div>
                        <div className="flex items-center justify-between p-3 bg-milk-tea-50 rounded-xl">
                            <span className="text-xs font-bold text-milk-tea-800">這是共享支出嗎？</span>
                            <input type="checkbox" checked={form.isShared} onChange={e => setForm({...form, isShared: e.target.checked})} className="w-5 h-5 accent-milk-tea-800 rounded-md" />
                        </div>
                        <button onClick={handleSave} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black shadow-lg active:scale-95 transition-all">儲存支出紀錄</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const SpotsView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<Spot>({ id: '', name: '', category: 'sightseeing', city: '', location: '', note: '' });

    const handleSave = () => {
        if (!form.name) return;
        const nextData = { ...data, backupSpots: [{ ...form, id: Date.now().toString() }, ...data.backupSpots] };
        setData(nextData);
        saveData(nextData);
        setIsModalOpen(false);
        setForm({ id: '', name: '', category: 'sightseeing', city: '', location: '', note: '' });
    };

    const handleDelete = (id: string) => {
        if (!confirm("確定移除此口袋收藏？")) return;
        const nextData = { ...data, backupSpots: data.backupSpots.filter(s => s.id !== id) };
        setData(nextData);
        saveData(nextData);
    };

    return (
        <div className="space-y-4 pb-24">
            <div className="bg-white rounded-3xl p-5 card-shadow border border-milk-tea-100 flex justify-between items-center">
                <div><h2 className="text-xl font-black text-milk-tea-900 mb-1">口袋名單</h2><p className="text-[10px] text-milk-tea-400 font-bold uppercase tracking-widest">Backup & Must-Go Spots</p></div>
                <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 bg-pink-50 text-pink-400 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all shadow-md"><i className="fa-solid fa-heart"></i></button>
            </div>
            <div className="grid grid-cols-1 gap-3">
                {data.backupSpots.map(spot => (
                    <div key={spot.id} className="bg-white p-4 rounded-2xl card-shadow border border-milk-tea-50 relative group active:bg-milk-tea-50 transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${getCategoryColor(spot.category as any)} text-white`}>{spot.category}</span>
                            <div className="flex gap-2">
                                <button onClick={() => openInGoogleMaps(spot.location)} className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center hover:bg-blue-100 active:scale-90 transition-all shadow-sm"><i className="fa-solid fa-compass text-xs"></i></button>
                                <button onClick={() => handleDelete(spot.id)} className="w-8 h-8 bg-red-50 text-red-300 rounded-full flex items-center justify-center transition-colors shadow-sm"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                            </div>
                        </div>
                        <h4 className="font-bold text-milk-tea-900 text-sm">{spot.name}</h4>
                        <p className="text-[10px] text-milk-tea-500 mt-1 font-bold"><i className="fa-solid fa-map-pin mr-1 opacity-50"></i>{spot.location}</p>
                        {spot.note && <p className="text-[10px] text-milk-tea-400 mt-2 italic bg-milk-tea-50 p-2 rounded-xl border border-milk-tea-100/30 font-bold">"{spot.note}"</p>}
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 space-y-4 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">新增口袋清單</h3><button onClick={() => setIsModalOpen(false)} className="w-8 h-8 bg-milk-tea-50 text-milk-tea-300 rounded-full flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button></div>
                        <div><label className="text-[9px] font-black text-milk-tea-400 uppercase tracking-widest ml-1">地點名稱</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none border border-transparent focus:border-milk-tea-300" /></div>
                        <div><label className="text-[9px] font-black text-milk-tea-400 uppercase tracking-widest ml-1">精確地址 (導航用)</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none border border-transparent focus:border-milk-tea-300" /></div>
                        <div><label className="text-[9px] font-black text-milk-tea-400 uppercase tracking-widest ml-1">分類</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value as SpotCategory})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none border-none"><option value="sightseeing">觀光</option><option value="food">美食</option><option value="shopping">購物</option></select></div>
                        <button onClick={handleSave} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black shadow-lg active:scale-95 transition-all">加入口袋清單</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const MapView: React.FC<{ data: AppData; selectedDayIndex: number }> = ({ data, selectedDayIndex }) => {
    const day = data.itinerary[selectedDayIndex];
    return (
        <div className="space-y-4 pb-24">
            <div className="bg-white rounded-3xl p-5 card-shadow border border-milk-tea-100">
                <h2 className="text-xl font-black text-milk-tea-900 mb-1">地圖連動</h2>
                <p className="text-[10px] text-milk-tea-400 font-bold uppercase tracking-widest">{day?.date || '目前未選擇日期'}</p>
            </div>
            <div className="aspect-square bg-white rounded-3xl card-shadow border border-milk-tea-100 flex flex-col items-center justify-center p-8 text-center gap-6">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-400 shadow-inner shadow-blue-100">
                    <i className="fa-solid fa-map-location-dot text-5xl"></i>
                </div>
                <div className="space-y-2">
                    <h3 className="text-base font-black text-milk-tea-800">開啟 Google Maps 導航</h3>
                    <p className="text-[11px] text-milk-tea-500 font-medium leading-relaxed px-4 font-bold">系統將彙整這一天所有行程的地點，自動生成多站路徑導航。</p>
                </div>
                {day && (
                    <button onClick={() => openDailyRoute(day)} className="bg-blue-600 text-white px-10 py-4 rounded-2xl text-[13px] font-black shadow-xl active:scale-95 transition-all flex items-center gap-2">
                        <i className="fa-solid fa-diamond-turn-right"></i> 開啟多點路徑導航
                    </button>
                )}
            </div>
        </div>
    );
};

export const TodoView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [newTodo, setNewTodo] = useState('');
    const handleToggle = (id: string) => {
        const next = { ...data, todos: data.todos.map(t => t.id === id ? { ...t, done: !t.done } : t) };
        setData(next);
        saveData(next);
    };
    const handleAdd = (cat: 'general' | 'packing') => {
        if (!newTodo) return;
        const next = { ...data, todos: [{ id: Date.now().toString(), text: newTodo, done: false, category: cat }, ...data.todos] };
        setData(next);
        saveData(next);
        setNewTodo('');
    };
    const handleDelete = (id: string) => {
        const next = { ...data, todos: data.todos.filter(t => t.id !== id) };
        setData(next);
        saveData(next);
    };
    return (
        <div className="space-y-6 pb-24">
            <div className="bg-white p-4 rounded-3xl card-shadow border border-milk-tea-50 flex gap-2">
                <input value={newTodo} onChange={e => setNewTodo(e.target.value)} placeholder="新增一項清單..." className="flex-1 p-3 bg-milk-tea-50 rounded-xl text-xs font-black text-black outline-none border border-transparent focus:border-milk-tea-300" />
                <button onClick={() => handleAdd('general')} className="bg-milk-tea-800 text-white px-5 rounded-xl active:scale-90 transition-all shadow-md shadow-milk-tea-200"><i className="fa-solid fa-plus"></i></button>
            </div>
            {['general', 'packing'].map(cat => (
                <div key={cat} className="space-y-2">
                    <h3 className="px-2 text-[10px] font-black text-milk-tea-400 uppercase tracking-widest flex justify-between items-center">{cat === 'general' ? '準備事項' : '行李打包'} <span className="text-[8px] opacity-40">{data.todos.filter(t => t.category === cat && t.done).length}/{data.todos.filter(t => t.category === cat).length}</span></h3>
                    {data.todos.filter(t => t.category === cat).map(t => (
                        <div key={t.id} className="flex gap-2 group">
                            <div onClick={() => handleToggle(t.id)} className={`flex-1 bg-white p-4 rounded-2xl card-shadow border border-milk-tea-50 flex items-center gap-3 active:scale-[0.98] transition-all ${t.done ? 'opacity-50' : ''}`}>
                                <i className={`fa-solid ${t.done ? 'fa-circle-check text-milk-tea-800' : 'fa-circle text-milk-tea-100'} text-lg`}></i>
                                <span className={`text-xs font-bold ${t.done ? 'line-through text-milk-tea-400' : 'text-milk-tea-800'}`}>{t.text}</span>
                            </div>
                            <button onClick={() => handleDelete(t.id)} className="w-10 bg-red-50 text-red-200 hover:text-red-400 rounded-2xl transition-colors active:bg-red-100"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export const GasView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    return (
        <div className="space-y-4 pb-24">
            <div className="bg-gradient-to-br from-red-600 to-blue-700 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border-4 border-white/10">
                <div className="absolute -right-6 -bottom-6 opacity-20 rotate-12"><i className="fa-solid fa-gas-pump text-9xl"></i></div>
                <h3 className="font-black text-sm uppercase mb-3 relative z-10 flex items-center gap-2"><i className="fa-solid fa-id-card"></i> Costco 加油攻略</h3>
                <ul className="text-[11px] space-y-3 font-bold opacity-90 relative z-10 leading-relaxed">
                    <li>1. 插卡後若要求 ZIP Code，不要慌，按取消或揮手叫店員 (Attendant)。</li>
                    <li>2. 向店員說: "I have an international Costco card, can you bypass ZIP code?"</li>
                    <li>3. 店員會來幫你刷一下卡繞過 ZIP Code。</li>
                    <li>4. 或者嘗試輸入 99999 或 00000 往往可以順利通過驗證。</li>
                </ul>
            </div>
            {data.gasStations.map(gs => (
                <div key={gs.id} className="bg-white p-4 rounded-2xl card-shadow border border-milk-tea-50 flex justify-between items-center transition-all group">
                    <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white ${gs.isCostco ? 'bg-red-500 shadow-red-100' : 'bg-blue-500 shadow-blue-100'} shadow-sm`}>{gs.isCostco ? 'COSTCO' : 'GAS'}</span>
                            <h4 className="font-bold text-milk-tea-800 text-sm truncate">{gs.name}</h4>
                        </div>
                        <p className="text-[10px] text-milk-tea-400 truncate font-bold">{gs.description}</p>
                    </div>
                    <button onClick={() => openInGoogleMaps(gs.address)} className="w-10 h-10 bg-milk-tea-50 text-milk-tea-300 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-sm"><i className="fa-solid fa-location-arrow text-sm"></i></button>
                </div>
            ))}
        </div>
    );
};

export default DashboardView;
