
import { RoomData, RoomStatus } from './types';

export const INITIAL_ROOMS: RoomData[] = [
  {
    id: 'room-101',
    name: 'Lecture Hall A (LH-101)',
    status: RoomStatus.EMPTY,
    occupancyCount: 0,
    temperature: 28,
    brightness: 80,
    imageUrl: 'https://picsum.photos/seed/lh101/800/600',
    lastUpdate: new Date().toISOString(),
    devices: [
      { id: '101-l1', name: 'Main Lights', type: 'LIGHT', isOn: false, powerConsumption: 200 },
      { id: '101-f1', name: 'Ceiling Fan 1', type: 'FAN', isOn: false, powerConsumption: 75, speed: 0 },
      { id: '101-ac1', name: 'West AC Unit', type: 'AC', isOn: false, powerConsumption: 1500 }
    ]
  },
  {
    id: 'room-102',
    name: 'CS Lab 1 (CL-102)',
    status: RoomStatus.OCCUPIED,
    occupancyCount: 15,
    temperature: 22,
    brightness: 45,
    imageUrl: 'https://picsum.photos/seed/cl102/800/600',
    lastUpdate: new Date().toISOString(),
    devices: [
      { id: '102-l1', name: 'Lab Lights', type: 'LIGHT', isOn: true, powerConsumption: 300 },
      { id: '102-f1', name: 'Exhaust Fan', type: 'FAN', isOn: true, powerConsumption: 100, speed: 1 },
      { id: '102-ac1', name: 'Server AC', type: 'AC', isOn: true, powerConsumption: 2000 }
    ]
  },
  {
    id: 'room-103',
    name: 'Physics Seminar (PS-103)',
    status: RoomStatus.EMPTY,
    occupancyCount: 0,
    temperature: 30,
    brightness: 90,
    imageUrl: 'https://picsum.photos/seed/ps103/800/600',
    lastUpdate: new Date().toISOString(),
    devices: [
      { id: '103-l1', name: 'Track Lights', type: 'LIGHT', isOn: false, powerConsumption: 150 },
      { id: '103-f1', name: 'Wall Fan', type: 'FAN', isOn: false, powerConsumption: 60, speed: 0 },
      { id: '103-ac1', name: 'Seminar AC', type: 'AC', isOn: false, powerConsumption: 1200 }
    ]
  }
];

export const POWER_COST_PER_KWH = 0.12; // Example cost
