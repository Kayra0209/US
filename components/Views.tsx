
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

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
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
                    <h1 className="text-lg font-black text-milk-tea-800">{data.tripName || 'Hello, Trip!'}</h1>
                    <p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Adventure Begins</p>
                </div>
                <button onClick={() => setView('settings')} className="w-10 h-10 bg-white rounded-full shadow-sm border border-milk-tea-100 flex items-center justify-center text-milk-tea-600 active:scale-90 transition-all shadow-md">
                    <i className="fa-solid fa-sync text-lg"></i>
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
    const [isVoucherOpen, setIsVoucherOpen] = useState<string | null>(null);

    const [dayForm, setDayForm] = useState<Partial<ItineraryDay>>({ 
        date: '', calendarDate: '', theme: '', mainLocation: '', lat: 34.05, lon: -118.24 
    });
    const [eventForm, setEventForm] = useState<Partial<TripEvent>>({ time: '09:00', title: '', type: 'sightseeing', location: '', note: '' });

    const currentDay = data.itinerary[selectedDayIndex];

    const handleAddDay = () => {
        if (!dayForm.date || !dayForm.theme) return;
        const newDay: ItineraryDay = { 
            id: Date.now().toString(),
            date: dayForm.date!,
            calendarDate: dayForm.calendarDate,
            theme: dayForm.theme!,
            mainLocation: dayForm.mainLocation!,
            lat: dayForm.lat || 34,
            lon: dayForm.lon || -118,
            events: [],
            updatedAt: Date.now()
        };
        const nextData = { ...data, itinerary: [...data.itinerary, newDay] };
        setData(nextData);
        saveData(nextData);
        setIsDayModalOpen(false);
        setSelectedDayIndex(data.itinerary.length);
    };

    const handleSaveEvent = () => {
        if (!eventForm.title) return;
        const newEvent: TripEvent = { 
            id: editingEvent ? editingEvent.id : Date.now().toString(),
            time: eventForm.time!,
            title: eventForm.title!,
            type: eventForm.type as EventType || 'sightseeing',
            location: eventForm.location || '',
            note: eventForm.note || '',
            photo: eventForm.photo,
            updatedAt: Date.now()
        };
        const updatedEvents = editingEvent 
            ? currentDay.events.map(e => e.id === editingEvent.id ? newEvent : e)
            : [...currentDay.events, newEvent];
        const sortedEvents = updatedEvents.sort((a, b) => a.time.localeCompare(b.time));
        const updatedItinerary = data.itinerary.map((d, i) => i === selectedDayIndex ? { ...d, events: sortedEvents, updatedAt: Date.now() } : d);
        setData({ ...data, itinerary: updatedItinerary });
        saveData({ ...data, itinerary: updatedItinerary });
        setIsEventModalOpen(false);
    };

    const handleDeleteEvent = (id: string) => {
        if (!confirm("確定刪除？")) return;
        const updatedItinerary = data.itinerary.map((d, i) => i === selectedDayIndex ? { ...d, events: d.events.filter(e => e.id !== id), updatedAt: Date.now() } : d);
        setData({ ...data, itinerary: updatedItinerary });
        saveData({ ...data, itinerary: updatedItinerary });
        setIsEventModalOpen(false);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setEventForm({ ...eventForm, photo: base64 });
        }
    };

    return (
        <div className="space-y-4 pb-24 animate-in">
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
                                {event.photo && <img src={event.photo} onClick={() => setIsVoucherOpen(event.photo!)} className="w-full h-20 object-cover rounded-xl mt-2 border border-milk-tea-50" />}
                                {event.location && <p className="text-[9px] text-milk-tea-400 mt-1 truncate"><i className="fa-solid fa-location-dot mr-1"></i>{event.location}</p>}
                                {event.note && <p className="text-[9px] text-milk-tea-500 mt-2 bg-milk-tea-50/50 p-2 rounded-lg italic">"{event.note}"</p>}
                            </div>
                        ))}
                        <button onClick={() => { setEditingEvent(null); setEventForm({time: '12:00', title: '', type: 'sightseeing', location: '', note: ''}); setIsEventModalOpen(true); }} className="w-full py-4 border-2 border-dashed border-milk-tea-200 text-milk-tea-400 rounded-2xl text-[10px] font-black bg-white/50 active:bg-white transition-all"><i className="fa-solid fa-plus mr-2"></i> 新增項目</button>
                    </div>
                </>
            ) : <div className="text-center py-20 text-milk-tea-300 font-bold">新增您的第一天行程</div>}

            {isDayModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in">
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
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-10 overflow-y-auto max-h-[90vh] space-y-4 shadow-2xl animate-in">
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
                        
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-milk-tea-400 uppercase ml-1">憑證/照片 (截圖)</label>
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" id="event-pic" />
                            <label htmlFor="event-pic" className="w-full p-3 bg-milk-tea-50 rounded-xl flex items-center justify-center gap-2 border border-dashed border-milk-tea-200 cursor-pointer">
                                <i className="fa-solid fa-camera text-xs"></i><span className="text-[10px] font-black">{eventForm.photo ? '更換照片' : '上傳憑證照片'}</span>
                            </label>
                            {eventForm.photo && <img src={eventForm.photo} className="w-full h-20 object-cover rounded-xl" />}
                        </div>

                        <textarea rows={2} value={eventForm.note} onChange={e => setEventForm({...eventForm, note: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold outline-none resize-none" placeholder="備註..." />
                        <div className="flex gap-3 pt-2">
                            {editingEvent && <button onClick={() => handleDeleteEvent(editingEvent.id)} className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl text-sm font-black active:scale-95 transition-all">刪除</button>}
                            <button onClick={handleSaveEvent} className="flex-[2] py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black active:scale-95 transition-all shadow-lg">儲存</button>
                        </div>
                    </div>
                </div>
            )}

            {isVoucherOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/90 z-[120] flex items-center justify-center p-6" onClick={() => setIsVoucherOpen(null)}>
                    <img src={isVoucherOpen} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl animate-in" />
                    <p className="fixed bottom-10 text-white font-black text-xs uppercase tracking-widest">點擊任意處關閉</p>
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
        <div className="space-y-4 pb-24 animate-in">
            <div className="flex bg-white p-1 rounded-2xl border border-milk-tea-100 mx-auto max-w-[320px] shadow-sm">
                {(['driving', 'tipping', 'clothing'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${activeTab === t ? 'bg-milk-tea-800 text-white shadow-md' : 'text-milk-tea-300'}`}>
                        {t === 'driving' ? '🚗 自駕' : t === 'tipping' ? '💵 小費' : '🧥 穿衣'}
                    </button>
                ))}
            </div>
            {activeTab === 'tipping' ? (
                <div className="space-y-4">
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
                </div>
            ) : null}
        </div>
    );
};

// --- Expense View ---
export const ExpenseView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<Partial<Expense>>({ item: '', amount: 0, currency: 'USD', paymentMethod: 'cash', isShared: true, date: new Date().toISOString().split('T')[0], type: 'daily' });
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
        const nextData = { ...data, expenses: [{ ...form, id: Date.now().toString(), updatedAt: Date.now() } as Expense, ...data.expenses] };
        setData(nextData);
        saveData(nextData);
        setIsModalOpen(false);
        setForm({ item: '', amount: 0, currency: 'USD', paymentMethod: 'cash', isShared: true, date: new Date().toISOString().split('T')[0], type: 'daily' });
    };

    return (
        <div className="space-y-4 pb-24 animate-in">
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
                    <div key={exp.id} onClick={() => { if(confirm("刪除這筆支出？")){ const next = {...data, expenses: data.expenses.filter(e => e.id !== exp.id)}; setData(next); saveData(next); } }} className="bg-white p-4 rounded-2xl border border-milk-tea-50 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] ${getPaymentColor(exp.paymentMethod)}`}><i className="fa-solid fa-credit-card"></i></div>
                            <div><h4 className="font-bold text-milk-tea-800 text-sm">{exp.item}</h4><p className="text-[9px] text-milk-tea-400 font-bold">{getPaymentLabel(exp.paymentMethod)} · {exp.date}</p></div>
                        </div>
                        <p className="text-sm font-black text-milk-tea-900">{exp.currency === 'USD' ? '$' : 'NT$'} {formatMoney(exp.amount)}</p>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in">
                        <div className="flex justify-between items-center"><h3 className="text-lg font-black text-milk-tea-900">記錄支出</h3><button onClick={() => setIsModalOpen(false)}><i className="fa-solid fa-xmark"></i></button></div>
                        <div className="flex gap-2">
                            {(['cash', 'jing_card', 'xiang_card'] as PaymentMethod[]).map(m => (
                                <button key={m} onClick={() => setForm({...form, paymentMethod: m})} className={`flex-1 py-3 rounded-xl text-[10px] font-bold border transition-all ${form.paymentMethod === m ? 'bg-milk-tea-800 text-white' : 'bg-milk-tea-50 text-milk-tea-400'}`}>{getPaymentLabel(m)}</button>
                            ))}
                        </div>
                        <input value={form.item} onChange={e => setForm({...form, item: e.target.value})} className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" placeholder="品項名稱" />
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} className="p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" placeholder="金額" />
                            <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value as Currency})} className="p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none"><option value="USD">USD</option><option value="TWD">TWD</option></select>
                        </div>
                        <button onClick={handleSave} className="w-full py-4 bg-milk-tea-800 text-white rounded-2xl text-sm font-black active:scale-95 shadow-lg">儲存支出</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Todo View ---
export const TodoView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [newTodo, setNewTodo] = useState('');
    const handleToggle = (id: string) => {
        const next = { ...data, todos: data.todos.map(t => t.id === id ? { ...t, done: !t.done, updatedAt: Date.now() } : t) };
        setData(next); saveData(next);
    };
    const handleAdd = () => {
        if (!newTodo) return;
        const next = { ...data, todos: [{ id: Date.now().toString(), text: newTodo, done: false, category: 'general', updatedAt: Date.now() } as Todo, ...data.todos] };
        setData(next); saveData(next); setNewTodo('');
    };
    return (
        <div className="space-y-4 pb-24 animate-in">
            <div className="flex gap-2 bg-white p-3 rounded-2xl border border-milk-tea-50 shadow-sm">
                <input value={newTodo} onChange={e => setNewTodo(e.target.value)} placeholder="新增代辦..." className="flex-1 p-2 bg-milk-tea-50 rounded-xl text-xs font-black outline-none" />
                <button onClick={handleAdd} className="bg-milk-tea-800 text-white px-4 rounded-xl active:scale-90 shadow-md"><i className="fa-solid fa-plus"></i></button>
            </div>
            <div className="space-y-2">
                {data.todos.map(t => (
                    <div key={t.id} onClick={() => handleToggle(t.id)} className={`bg-white p-4 rounded-2xl border border-milk-tea-50 flex items-center gap-3 active:scale-[0.98] ${t.done ? 'opacity-40' : ''}`}>
                        <i className={`fa-solid ${t.done ? 'fa-circle-check text-milk-tea-800' : 'fa-circle text-milk-tea-100'} text-lg`}></i>
                        <span className={`text-xs font-bold ${t.done ? 'line-through' : ''}`}>{t.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Spots View (收藏頁面) ---
export const SpotsView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [integratingSpot, setIntegratingSpot] = useState<Spot | null>(null);
    const [filter, setFilter] = useState<SpotCategory | 'all'>('all');
    const [form, setForm] = useState<Partial<Spot>>({ name: '', city: '', location: '', note: '', category: 'food' });

    const filteredSpots = useMemo(() => {
        if (filter === 'all') return data.backupSpots;
        return data.backupSpots.filter(s => s.category === filter);
    }, [data.backupSpots, filter]);

    const handleSave = () => {
        if (!form.name) return;
        const newSpot: Spot = {
            id: Date.now().toString(),
            name: form.name!,
            city: form.city || '',
            location: form.location || '',
            note: form.note || '',
            category: form.category as SpotCategory || 'food',
            updatedAt: Date.now()
        };
        const nextData = { ...data, backupSpots: [newSpot, ...data.backupSpots] };
        setData(nextData);
        saveData(nextData);
        setIsModalOpen(false);
        setForm({ name: '', city: '', location: '', note: '', category: 'food' });
    };

    const handleDelete = (id: string) => {
        if (!confirm("確定要刪除這個收藏嗎？")) return;
        const nextData = { ...data, backupSpots: data.backupSpots.filter(s => s.id !== id) };
        setData(nextData);
        saveData(nextData);
    };

    const handleAddToItinerary = (dayIndex: number) => {
        if (!integratingSpot) return;
        
        const spotTypeToEventType: Record<SpotCategory, EventType> = {
            food: 'food',
            sightseeing: 'sightseeing',
            shopping: 'shopping'
        };

        const newEvent: TripEvent = {
            id: Date.now().toString(),
            time: '12:00',
            title: integratingSpot.name,
            type: spotTypeToEventType[integratingSpot.category] || 'sightseeing',
            location: integratingSpot.location || '',
            note: integratingSpot.note || '',
            updatedAt: Date.now()
        };

        const updatedItinerary = data.itinerary.map((day, idx) => {
            if (idx === dayIndex) {
                const newEvents = [...day.events, newEvent].sort((a, b) => a.time.localeCompare(b.time));
                return { ...day, events: newEvents, updatedAt: Date.now() };
            }
            return day;
        });

        const nextData = { ...data, itinerary: updatedItinerary };
        setData(nextData);
        saveData(nextData);
        setIntegratingSpot(null);
        alert(`已成功將「${integratingSpot.name}」加入 ${data.itinerary[dayIndex].date}！`);
    };

    const getSpotCategoryLabel = (cat: SpotCategory) => {
        if (cat === 'food') return '美食 🍔';
        if (cat === 'sightseeing') return '景點 📸';
        if (cat === 'shopping') return '購物 🛍️';
        return cat;
    };

    const getSpotCategoryColor = (cat: SpotCategory) => {
        if (cat === 'food') return 'bg-orange-100 text-orange-600';
        if (cat === 'sightseeing') return 'bg-green-100 text-green-600';
        if (cat === 'shopping') return 'bg-pink-100 text-pink-600';
        return 'bg-milk-tea-100 text-milk-tea-600';
    };

    return (
        <div className="space-y-4 pb-24 animate-in">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h2 className="text-xl font-black text-milk-tea-800">口袋收藏</h2>
                    <p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Saved Spots</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-10 h-10 bg-milk-tea-800 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
                >
                    <i className="fa-solid fa-plus"></i>
                </button>
            </div>

            {/* 篩選標籤 */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {(['all', 'food', 'sightseeing', 'shopping'] as const).map(f => (
                    <button 
                        key={f} 
                        onClick={() => setFilter(f)}
                        className={`flex-none px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${filter === f ? 'bg-milk-tea-800 text-white border-transparent shadow-md' : 'bg-white text-milk-tea-300 border-milk-tea-100'}`}
                    >
                        {f === 'all' ? '全部' : getSpotCategoryLabel(f as SpotCategory)}
                    </button>
                ))}
            </div>

            {/* 列表 */}
            <div className="grid gap-3">
                {filteredSpots.length > 0 ? (
                    filteredSpots.map(spot => (
                        <div key={spot.id} className="bg-white p-4 rounded-3xl border border-milk-tea-50 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${getSpotCategoryColor(spot.category)}`}>
                                        {getSpotCategoryLabel(spot.category)}
                                    </span>
                                    <h3 className="text-base font-black text-milk-tea-900 mt-1">{spot.name}</h3>
                                    {spot.city && <p className="text-[10px] text-milk-tea-400 font-bold"><i className="fa-solid fa-city mr-1"></i>{spot.city}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setIntegratingSpot(spot)}
                                        className="w-8 h-8 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center active:scale-90"
                                        title="加入行程"
                                    >
                                        <i className="fa-solid fa-calendar-plus text-[11px]"></i>
                                    </button>
                                    <button 
                                        onClick={() => openInGoogleMaps(spot.location || spot.name)}
                                        className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center active:scale-90"
                                    >
                                        <i className="fa-solid fa-compass text-[11px]"></i>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(spot.id)}
                                        className="w-8 h-8 bg-red-50 text-red-300 rounded-full flex items-center justify-center active:scale-90"
                                    >
                                        <i className="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                            {spot.note && <p className="text-[10px] text-milk-tea-500 italic bg-milk-tea-50/50 p-2 rounded-xl">"{spot.note}"</p>}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20">
                        <i className="fa-solid fa-heart text-milk-tea-100 text-5xl mb-4"></i>
                        <p className="text-xs font-bold text-milk-tea-300 uppercase tracking-widest">還沒有收藏項目</p>
                    </div>
                )}
            </div>

            {/* 新增視窗 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[100] flex items-end justify-center backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-black text-milk-tea-900">新增收藏</h3>
                            <button onClick={() => setIsModalOpen(false)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        
                        <div className="flex gap-2 pb-1">
                            {(['food', 'sightseeing', 'shopping'] as SpotCategory[]).map(cat => (
                                <button 
                                    key={cat} 
                                    onClick={() => setForm({...form, category: cat})}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${form.category === cat ? 'bg-milk-tea-800 text-white border-transparent' : 'bg-milk-tea-50 text-milk-tea-400 border-milk-tea-100'}`}
                                >
                                    {getSpotCategoryLabel(cat)}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <input 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})} 
                                className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none border border-milk-tea-100" 
                                placeholder="店名 / 景點名稱" 
                            />
                            <input 
                                value={form.city} 
                                onChange={e => setForm({...form, city: e.target.value})} 
                                className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-black outline-none border border-milk-tea-100" 
                                placeholder="城市 (例如: Los Angeles)" 
                            />
                            <input 
                                value={form.location} 
                                onChange={e => setForm({...form, location: e.target.value})} 
                                className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold outline-none border border-milk-tea-100" 
                                placeholder="詳細地址 (用於導航)" 
                            />
                            <textarea 
                                value={form.note} 
                                onChange={e => setForm({...form, note: e.target.value})} 
                                rows={2}
                                className="w-full p-3 bg-milk-tea-50 rounded-xl text-xs font-bold outline-none border border-milk-tea-100 resize-none" 
                                placeholder="備註 (想吃什麼、幾點開...)" 
                            />
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={!form.name}
                            className={`w-full py-4 rounded-2xl text-sm font-black shadow-lg transition-all active:scale-95 ${!form.name ? 'bg-milk-tea-100 text-milk-tea-300 cursor-not-allowed' : 'bg-milk-tea-800 text-white'}`}
                        >
                            儲存到口袋名單
                        </button>
                    </div>
                </div>
            )}

            {/* 整合至行程視窗 */}
            {integratingSpot && (
                <div className="fixed inset-0 bg-milk-tea-900/60 z-[110] flex items-end justify-center backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-10 space-y-4 shadow-2xl animate-in overflow-y-auto max-h-[70vh]">
                        <div className="flex justify-between items-center border-b border-milk-tea-50 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-milk-tea-900">加入行程</h3>
                                <p className="text-[10px] font-bold text-milk-tea-400">將「{integratingSpot.name}」分配至哪一天？</p>
                            </div>
                            <button onClick={() => setIntegratingSpot(null)}><i className="fa-solid fa-xmark text-milk-tea-300"></i></button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                            {data.itinerary.length > 0 ? (
                                data.itinerary.map((day, idx) => (
                                    <button 
                                        key={day.id} 
                                        onClick={() => handleAddToItinerary(idx)}
                                        className="w-full p-4 bg-milk-tea-50 hover:bg-milk-tea-100 rounded-2xl flex justify-between items-center transition-all group"
                                    >
                                        <div className="text-left">
                                            <span className="text-[10px] font-black text-milk-tea-800 uppercase block">{day.date}</span>
                                            <span className="text-xs font-bold text-milk-tea-400">{day.theme}</span>
                                        </div>
                                        <i className="fa-solid fa-chevron-right text-milk-tea-200 group-hover:text-milk-tea-500 transition-colors"></i>
                                    </button>
                                ))
                            ) : (
                                <p className="text-center text-xs font-bold text-milk-tea-400 py-10">請先在「行程」頁面建立天數</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const GasView: React.FC<{ data: AppData; setData: (d: AppData) => void }> = ({ data, setData }) => {
    return (
        <div className="space-y-4 pb-24 animate-in">
             <div className="px-2">
                <h2 className="text-xl font-black text-milk-tea-800">加油秘笈</h2>
                <p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Gas Station Guide</p>
            </div>
            <div className="space-y-3">
                {data.gasStations.map(station => (
                    <div key={station.id} className="bg-white p-4 rounded-3xl border border-milk-tea-50 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${station.isCostco ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {station.isCostco ? 'Costco 必加' : '一般油站'}
                                </span>
                                <h3 className="text-sm font-black text-milk-tea-900 mt-1">{station.name}</h3>
                            </div>
                            <button onClick={() => openInGoogleMaps(station.address)} className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                                <i className="fa-solid fa-compass text-[11px]"></i>
                            </button>
                        </div>
                        <p className="text-[9px] text-milk-tea-400 mt-1 font-bold">{station.address}</p>
                        <p className="text-[9px] text-milk-tea-500 mt-2 bg-milk-tea-50/50 p-2 rounded-xl italic">"{station.description}"</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MapView: React.FC<{ data: AppData; selectedDayIndex: number }> = ({ data, selectedDayIndex }) => {
    const currentDay = data.itinerary[selectedDayIndex];
    return (
        <div className="space-y-6 pb-24 animate-in">
            <div className="px-2">
                <h2 className="text-xl font-black text-milk-tea-800">路徑導航</h2>
                <p className="text-[10px] font-bold text-milk-tea-400 uppercase tracking-widest">Map & Navigation</p>
            </div>
            
            <div className="bg-white p-6 rounded-[32px] border border-milk-tea-100 shadow-sm text-center space-y-4">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-500 text-3xl">
                    <i className="fa-solid fa-route"></i>
                </div>
                {currentDay ? (
                    <>
                        <h3 className="text-lg font-black text-milk-tea-900">準備好導航到 {currentDay.date} 嗎？</h3>
                        <p className="text-xs font-bold text-milk-tea-400 leading-relaxed px-4">
                            系統將為您開啟 Google Maps，並自動規劃這天所有景點的最佳開車路線。
                        </p>
                        <button 
                            onClick={() => openDailyRoute(currentDay)}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl active:scale-95 transition-all"
                        >
                            開始導航 ({currentDay.events.length} 個停靠點)
                        </button>
                    </>
                ) : (
                    <p className="text-xs font-bold text-milk-tea-300">請先到行程頁面選擇日期</p>
                )}
            </div>

            <div className="bg-milk-tea-100/50 p-6 rounded-[32px] border border-milk-tea-100 space-y-3">
                 <h4 className="text-[10px] font-black text-milk-tea-800 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-circle-info"></i> 小撇步
                 </h4>
                 <p className="text-[10px] font-bold text-milk-tea-500 leading-relaxed">
                    在美國自駕，建議提前在 Google Maps 下載「離線地圖」，避免在國家公園內失去訊號。
                 </p>
            </div>
        </div>
    );
};

export default DashboardView;
