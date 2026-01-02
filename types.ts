
export enum RoomStatus {
  OCCUPIED = 'OCCUPIED',
  EMPTY = 'EMPTY',
}

export interface DeviceStatus {
  id: string;
  name: string;
  type: 'LIGHT' | 'AC' | 'FAN';
  isOn: boolean;
  powerConsumption: number; // Watts
  speed?: number; // Speed level (1-5) for Fans
}

export interface RoomData {
  id: string;
  name: string;
  status: RoomStatus;
  occupancyCount: number;
  temperature: number;
  brightness: number; // 0-100
  devices: DeviceStatus[];
  imageUrl: string;
  lastUpdate: string;
}

export interface EnergyStats {
  timestamp: string;
  consumption: number;
  savings: number;
}

export interface AIAnalysisResult {
  occupied: boolean;
  personCount: number;
  lightRecommendation: 'ON' | 'OFF';
  fanRecommendation: 'ON' | 'OFF';
  fanSpeed: number;
  acRecommendation: 'ON' | 'OFF';
  targetTemp: number;
}
