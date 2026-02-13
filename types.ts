
export type ViewType = 'dashboard' | 'itinerary' | 'map' | 'money' | 'spots' | 'todo' | 'settings' | 'gas' | 'guide';

export type Currency = 'USD' | 'TWD';
export type PaymentMethod = 'cash' | 'jing_card' | 'xiang_card';
export type ExpenseType = 'daily' | 'major'; 
export type EventType = 'sightseeing' | 'food' | 'transport' | 'event' | 'accommodation' | 'shopping';
export type SpotCategory = 'food' | 'sightseeing' | 'shopping';

export interface ChatMessage {
    id: string;
    user: string;
    text: string;
    time: string;
}

export interface FlightInfo {
    flightNumber: string;
    airline?: string;
    terminal?: string;
    gate?: string;
    arrivalTime?: string;
    departureTime?: string;
}

export interface TripEvent {
    id: string;
    time: string;
    title: string;
    type: EventType;
    location: string;
    note: string;
    updatedAt: number;
    order: number; 
    url?: string;
    bookingInfo?: string;
    cost?: number;
    currency?: Currency;
    paymentMethod?: PaymentMethod;
    flightInfo?: FlightInfo;
}

export interface ItineraryDay {
    id: string;
    date: string;
    calendarDate?: string;
    theme: string;
    mainLocation: string;
    lat: number;
    lon: number;
    events: TripEvent[];
    updatedAt: number;
}

export interface Expense {
    id: string;
    item: string;
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    isShared: boolean;
    date: string;
    type: ExpenseType;
    updatedAt: number;
}

export interface Spot {
    id: string;
    name: string;
    category: SpotCategory;
    city: string;
    location: string;
    note: string;
    updatedAt: number;
}

export interface GasStation {
    id: string;
    name: string;
    address: string;
    description: string;
    isCostco: boolean;
    updatedAt: number; // 新增同步時間戳
}

export interface Todo {
    id: string;
    text: string;
    done: boolean;
    category: 'general' | 'packing';
    daysBefore?: number; 
    assignedDate?: string;
    updatedAt: number;
}

export interface AppSettings {
    exchangeRate: number;
    googleMapsKey: string;
}

export interface WeatherData {
    temperature: number;
    weathercode: number;
}
