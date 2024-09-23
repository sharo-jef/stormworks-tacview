export interface PageObject {
  type: string;
}

export interface VehicleObject extends PageObject {
  type: "vehicle";
  page: string;
  maxpage: string;
  data: VehicleObjectData[];
  player_count: number;
}

export interface VehicleObjectData {
  id: number;
  g_id: number;
  p_id: number;
  x: number;
  y: number;
  z: number;
  dmg: number;
  mass: number;
  seat_count: number;
  name: string;
  plist: PlayerList;
}

export interface PlayerList {
  stmid: string;
}

export interface WeaponObject extends PageObject {
  type: "weapon";
  page: string;
  maxpage: string;
  data: WeaponObjectData;
}

export interface WeaponObjectData {
  cx: number;
  cy: number;
  cz: number;
  cxv: number;
  cyv: number;
  czv: number;
  elevation: number;
  azimuth: number;
  wType: WeaponType;
}

export enum WeaponType {
  MG = 1,
  LAC = 2,
  RAC = 3,
  HAC = 4,
  BC = 5,
  AC = 6,
  BERTHA = 7,
  SELECT = 8,
}

export const WeaponData = [
  null,
  // MG
  {
    initialSpeed: 800,
    drag: 0.025,
    gravity: 30,
    rate: 4,
  },
  // LAC
  {
    initialSpeed: 1000,
    drag: 0.02,
    gravity: 30,
    rate: 8,
  },
  // RAC
  {
    initialSpeed: 1000,
    drag: 0.01,
    gravity: 30,
    rate: 2,
  },
  // HAC
  {
    initialSpeed: 900,
    drag: 0.005,
    gravity: 30,
    rate: 32,
  },
  // BC
  {
    initialSpeed: 800,
    drag: 0.002,
    gravity: 30,
    rate: 29, // 要検証
  },
  // AC
  {
    initialSpeed: 700,
    drag: 0.001,
    gravity: 30,
    rate: 29, // 要検証
  },
  // BERTHA
  {
    initialSpeed: 600,
    drag: 0.0005,
    gravity: 30,
    rate: 29, // 要検証
  },
];

export interface RadarObject extends PageObject {
  type: "radar";
  data: RadarObjectData;
}

export interface RadarObjectData {
  x: number;
  y: number;
  z: number;
  elevation: number;
  azimuth: number;
}

export interface AttitudeObject {
  type: "attitude";
  data: AttitudeObjectData;
}

export interface AttitudeObjectData {
  x: number;
  y: number;
  z: number;
  pitch: number;
  roll: number;
  yaw: number;
}

export interface RadarSttObject extends PageObject {
  type: "radar_stt";
  page: string;
  maxpage: string;
  data: RadarSttObjectData;
}

export interface RadarSttObjectData {
  x: number;
  y: number;
  z: number;
  elevation: number;
  azimuth: number;
  distance: number;
}
