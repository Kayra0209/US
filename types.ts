
export type ViewType = 'dashboard' | 'itinerary' | 'map' | 'money' | 'spots' | 'todo' | 'settings' | 'gas' | 'guide';

export type Currency = 'USD' | 'TWD';
export type PaymentMethod = 'cash' | 'jing_card' | 'xiang_card';
export type ExpenseType = 'daily' | 'major'; 
export type EventType = 'sightseeing' | 'food' | 'transport' | 'shopping' | 'event' | 'accommodation';
export type SpotCategory = 'food' | 'sightseeing' | 'shopping';

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
    url?: string;
    bookingInfo?: string;
    cost?: number;
    currency?: Currency;
    paymentMethod?: PaymentMethod;
    flightInfo?: FlightInfo;
}

export interface ItineraryDay {
    date: string;
    theme: string;
    mainLocation: string;
    lat: number;
    lon: number;
    events: TripEvent[];
}

export interface Expense {
    id: string;
    item: string;
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    isShared: boolean; // 新增：是否平分
    date: string;
    type: ExpenseType;
}

export interface Spot {
    id: string;
    name: string;
    category: SpotCategory;
    city: string;
    location: string;
    note: string;
}

export interface GasStation {
    id: string;
    name: string;
    address: string;
    description: string;
    isCostco: boolean;
}

export interface Todo {
    id: string;
    text: string;
    done: boolean;
    category: 'general' | 'packing';
    daysBefore?: number; 
    assignedDate?: string; 
}

export interface AppSettings {
    exchangeRate: number;
    googleMapsKey: string;
}

export interface WeatherData {
    temperature: number;
    weathercode: number;
}
