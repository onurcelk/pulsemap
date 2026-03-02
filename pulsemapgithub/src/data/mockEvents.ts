import { MapEvent } from '../types';

export const MOCK_EVENTS: MapEvent[] = [
  {
    id: '1',
    title: 'Explosion reported in northern district',
    description: 'Local sources report a large explosion near the industrial zone. Emergency services are on the way.',
    category: 'explosion',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    location: {
      lat: 48.3794,
      lng: 31.1656,
      name: 'Central Region'
    }
  },
  {
    id: '2',
    title: 'Military convoy spotted moving south',
    description: 'A large convoy of armored vehicles was seen moving along the M-05 highway towards the southern border.',
    category: 'military',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    location: {
      lat: 46.4825,
      lng: 30.7233,
      name: 'Odesa'
    }
  },
  {
    id: '3',
    title: 'Peaceful protest in city square',
    description: 'Hundreds have gathered to protest the new economic measures. The situation remains calm.',
    category: 'protest',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    location: {
      lat: 50.4501,
      lng: 30.5234,
      name: 'Kyiv'
    }
  },
  {
    id: '4',
    title: 'Humanitarian aid corridor established',
    description: 'International organizations have successfully negotiated a safe passage for civilians in the eastern sector.',
    category: 'humanitarian',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5 hours ago
    location: {
      lat: 48.0159,
      lng: 37.8028,
      name: 'Donetsk'
    }
  }
];
