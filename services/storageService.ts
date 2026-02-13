
import { AppSettings, Expense, ItineraryDay, Spot, Todo, GasStation, ChatMessage } from '../types';

const STORAGE_KEY = 'us_trip_v5_react';

export interface AppData {
    tripName: string;
    itinerary: ItineraryDay[];
    expenses: Expense[];
    todos: Todo[];
    backupSpots: Spot[];
    gasStations: GasStation[];
    settings: AppSettings;
    chat: ChatMessage[];
    lastUpdated: number;
}

const DEFAULT_GAS_STATIONS: GasStation[] = [
    { id: 'gas-1', name: 'Costco Wholesale LAX', address: '14501 Hindry Ave, Hawthorne, CA 90250', description: 'LAX 機場附近，還車前最後補油首選。', isCostco: true },
    { id: 'gas-2', name: 'Costco Wholesale SF', address: '450 10th St, San Francisco, CA 94103', description: '舊金山市中心稀有的 Costco，進城前可補。', isCostco: true },
    { id: 'gas-3', name: 'Costco Wholesale Las Vegas', address: '6555 N Decatur Blvd, Las Vegas, NV 89131', description: '前往大峽谷/佩吉市前的超便宜油站。', isCostco: true },
    { id: 'gas-4', name: 'Costco Wholesale San Diego', address: '4605 Morena Blvd, San Diego, CA 92117', description: '聖地牙哥市區補油點。', isCostco: true },
    { id: 'gas-5', name: 'Chevron Kingman', address: '3325 Stockton Hill Rd, Kingman, AZ 86401', description: '66 號公路重要補給點。', isCostco: false },
    { id: 'gas-6', name: 'Shell Page AZ', address: '644 Haul Rd, Page, AZ 86040', description: '羚羊峽谷與馬蹄灣區域的補給站。', isCostco: false },
    { id: 'gas-7', name: '76 - Yosemite Gateway', address: '5010 CA-140, Mariposa, CA 95338', description: '進入優山美地前的油站。', isCostco: false }
];

const DEFAULT_ITINERARY: ItineraryDay[] = [
    { 
        id: 'day-1',
        date: 'Day 1', calendarDate: '2026-03-27', theme: '🌟 旅程開始', mainLocation: '洛杉磯 LAX', lat: 33.9416, lon: -118.4085, 
        updatedAt: Date.now(),
        events: [
            { id: 'sample-1', time: '14:00', title: '抵達 LAX 機場', type: 'transport', location: '1 World Way, Los Angeles, CA 90045', note: '拿行李後前往 Car Rental Center 領車。', flightInfo: { flightNumber: 'BR12', airline: 'EVA Air', terminal: 'B' }, updatedAt: Date.now() },
            { id: 'sample-2', time: '16:00', title: '領取租車', type: 'transport', location: 'Hertz Car Rental - LAX', note: '確認保險、檢查車傷、確認滿油。', updatedAt: Date.now() }
        ]
    }
];

const DEFAULT_TODOS: Todo[] = [
    { id: 't1', text: '申請國際駕照', done: false, category: 'general', daysBefore: 30, updatedAt: Date.now() },
    { id: 't2', text: '列印旅館與租車憑證', done: false, category: 'general', daysBefore: 7, updatedAt: Date.now() },
    { id: 't3', text: '美國轉接頭', done: false, category: 'packing', daysBefore: 3, updatedAt: Date.now() },
    { id: 't4', text: '防曬乳 & 太陽眼鏡', done: false, category: 'packing', daysBefore: 1, updatedAt: Date.now() },
    { id: 't5', text: '乳液 & 護唇膏', done: false, category: 'packing', daysBefore: 1, updatedAt: Date.now() }
];

const DEFAULT_SETTINGS: AppSettings = {
    exchangeRate: 32.5,
    googleMapsKey: ''
};

export const getInitialData = (): AppData => ({
    tripName: '2026 美西之旅',
    itinerary: DEFAULT_ITINERARY,
    expenses: [],
    todos: DEFAULT_TODOS,
    backupSpots: [],
    gasStations: DEFAULT_GAS_STATIONS,
    settings: DEFAULT_SETTINGS,
    chat: [],
    lastUpdated: Date.now()
});

export const loadData = (): AppData => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (!parsed.tripName) parsed.tripName = '2026 美西之旅';
            if (!parsed.gasStations || parsed.gasStations.length === 0) parsed.gasStations = DEFAULT_GAS_STATIONS;
            return parsed;
        }
    } catch (e) { console.error(e); }
    return getInitialData();
};

export const saveData = (data: AppData) => {
    try { 
        const updatedData = { ...data, lastUpdated: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData)); 
    } catch (e) { console.error(e); }
};

/**
 * 智慧合併：基於 ID 與 updatedAt 增量合併兩份資料
 */
export const mergeAppData = (local: AppData, remote: AppData): AppData => {
    const mergeArray = <T extends { id: string; updatedAt: number }>(arr1: T[], arr2: T[]): T[] => {
        const map = new Map<string, T>();
        arr1.forEach(item => map.set(item.id, item));
        arr2.forEach(remoteItem => {
            const localItem = map.get(remoteItem.id);
            if (!localItem || remoteItem.updatedAt > localItem.updatedAt) {
                map.set(remoteItem.id, remoteItem);
            }
        });
        return Array.from(map.values());
    };

    // 行程天數比較特殊，還需要合併內部的 events
    const mergeItinerary = (localDays: ItineraryDay[], remoteDays: ItineraryDay[]): ItineraryDay[] => {
        const dayMap = new Map<string, ItineraryDay>();
        localDays.forEach(d => dayMap.set(d.id, d));
        
        remoteDays.forEach(rDay => {
            const lDay = dayMap.get(rDay.id);
            if (!lDay) {
                dayMap.set(rDay.id, rDay);
            } else {
                // 如果 ID 相同，取較新的一個作為基礎，並合併 events
                const base = rDay.updatedAt > lDay.updatedAt ? rDay : lDay;
                const mergedEvents = mergeArray(lDay.events, rDay.events);
                dayMap.set(rDay.id, { ...base, events: mergedEvents, updatedAt: Math.max(lDay.updatedAt, rDay.updatedAt) });
            }
        });
        return Array.from(dayMap.values());
    };

    return {
        ...local,
        tripName: remote.lastUpdated > local.lastUpdated ? remote.tripName : local.tripName,
        itinerary: mergeItinerary(local.itinerary, remote.itinerary),
        expenses: mergeArray(local.expenses, remote.expenses),
        todos: mergeArray(local.todos, remote.todos),
        backupSpots: mergeArray(local.backupSpots, remote.backupSpots),
        lastUpdated: Math.max(local.lastUpdated, remote.lastUpdated)
    };
};
