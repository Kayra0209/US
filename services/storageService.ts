
import { AppSettings, Expense, ItineraryDay, Spot, Todo, GasStation } from '../types';

const STORAGE_KEY = 'us_trip_v4_react';

export interface AppData {
    itinerary: ItineraryDay[];
    expenses: Expense[];
    todos: Todo[];
    backupSpots: Spot[];
    gasStations: GasStation[];
    settings: AppSettings;
    lastUpdated: number;
}

const DEFAULT_GAS_STATIONS: GasStation[] = [
    { id: 'gas-1', name: 'Costco Wholesale LAX', address: '14501 Hindry Ave, Hawthorne, CA 90250', description: 'LAX 機場附近，還車前加油首選。', isCostco: true },
    { id: 'gas-2', name: 'Costco Wholesale SF', address: '450 10th St, San Francisco, CA 94103', description: '舊金山市中心稀有的 Costco。', isCostco: true },
    { id: 'gas-3', name: 'Costco Wholesale Vegas', address: '6555 N Decatur Blvd, Las Vegas, NV 89131', description: '前往國家公園前的補給點。', isCostco: true },
    { id: 'gas-4', name: 'Chevron Self Service', address: 'General US Location', description: '非 Costco 時的首選，油質穩定但較貴。', isCostco: false }
];

const DEFAULT_ITINERARY: ItineraryDay[] = [
    { 
        date: 'Day 1', calendarDate: '2026-03-27', theme: '🌟 旅程開始', mainLocation: '洛杉磯 LAX', lat: 33.9416, lon: -118.4085, 
        events: [
            { id: 'sample-1', time: '14:00', title: '抵達 LAX 機場', type: 'transport', location: '1 World Way, Los Angeles, CA 90045', note: '拿行李後前往 Car Rental Center 領車。', flightInfo: { flightNumber: 'BR12', airline: 'EVA Air', terminal: 'B' } },
            { id: 'sample-2', time: '16:00', title: '領取租車', type: 'transport', location: 'Hertz Car Rental - LAX', note: '確認保險、檢查車傷、確認滿油。' }
        ]
    }
];

const DEFAULT_TODOS: Todo[] = [
    { id: 't1', text: '申請國際駕照', done: false, category: 'general', daysBefore: 30 },
    { id: 't2', text: '列印旅館與租車憑證', done: false, category: 'general', daysBefore: 7 },
    { id: 't3', text: '美國轉接頭 (雖然一樣但備用)', done: false, category: 'packing', daysBefore: 3 },
    { id: 't4', text: '防曬乳 & 太陽眼鏡', done: false, category: 'packing', daysBefore: 1 },
    { id: 't5', text: '乳液 & 護唇膏 (美國極乾)', done: false, category: 'packing', daysBefore: 1 }
];

const DEFAULT_SETTINGS: AppSettings = {
    exchangeRate: 32.5,
    googleMapsKey: ''
};

export const loadData = (): AppData => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) { console.error(e); }
    return {
        itinerary: DEFAULT_ITINERARY,
        expenses: [],
        todos: DEFAULT_TODOS,
        backupSpots: [],
        gasStations: DEFAULT_GAS_STATIONS,
        settings: DEFAULT_SETTINGS,
        lastUpdated: Date.now()
    };
};

export const saveData = (data: AppData) => {
    try { 
        const updatedData = { ...data, lastUpdated: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData)); 
    } catch (e) { console.error(e); }
};

export const exportDataToJson = (data: AppData) => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_trip_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};
