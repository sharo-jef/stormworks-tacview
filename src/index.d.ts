interface PageObject {
  tick: number;
  data: DataObject[];
}

interface DataObject {
  type: string;
}

interface VehicleDataObject extends DataObject {
  type: 'vehicle';
  vehicleId: string;
  name: string;
  groupId: string;
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
  mass: number;
  seatCount: number;
  parentId: string;
}

interface SpawnDataObject extends DataObject {
  type: 'spawn';
  vehicleId: string;
  peerId: string;
  x: string;
  y: string;
  z: string;
  groupCost: string;
  groupId: string;
  name: string;
  mass: string;
  seatCount: string;
  parentId: string;
}

interface DespawnDataObject extends DataObject {
  type: 'despawn';
  vehicleId: string;
  peerId: string;
}

interface DamageDataObject extends DataObject {
  type: 'damage';
  x: string;
  y: string;
  z: string;
}

interface SitDataObject extends DataObject {
  type: 'sit';
  peerId: string;
  vehicleId: string;
  name: string;
  steamId: string;
}

interface UnsitDataObject extends DataObject {
  type: 'unsit';
  peerId: string;
  vehicleId: string;
  name: string;
  steamId: string;
}

interface ChaffDataObject extends DataObject {
  type: 'chaff';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}
