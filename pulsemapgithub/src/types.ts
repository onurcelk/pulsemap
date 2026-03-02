export type EventCategory = 'military' | 'explosion' | 'protest' | 'politics' | 'humanitarian' | 'other';
export type TimeRange = '1h' | '24h' | '1w' | 'all';

export interface MapEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  region?: string;
  sourceUrl?: string;
  imageUrl?: string;
  /** Number of distinct sources that reported the same story — used for pulse intensity */
  hotScore?: number;
  /** All stories grouped into this event (used for stacked multi-story popup) */
  relatedStories?: Array<{
    title: string;
    sourceUrl?: string;
    source: string;
    timestamp: string;
  }>;
}

export interface Region {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
}

export interface StrategicAsset {
  id: string;
  name: string;
  type: 'nuclear' | 'military' | 'chokepoint' | 'space' | 'oil' | 'mining';
  lat: number;
  lng: number;
  description: string;
  wikiUrl: string;
}

export interface LiveAircraft {
  id: string;
  callsign: string;
  type: string;
  description: string;
  lat: number;
  lng: number;
  alt: number; // in feet
  speed: number; // in knots
  heading: number; // 0-360 degrees
  registration?: string;
  operator?: string;
  history?: [number, number][]; // Array of [lat, lng] for trails
}

export interface LiveShip {
  id: string;
  name: string;
  type: string;
  country: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}
