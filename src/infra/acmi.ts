import { AcmiRepository } from '../repository/acmi.ts';

export class ProdAcmiRepository implements AcmiRepository {
  previousTick = 0;
  vehicles = new Map<string, VehicleDataObject & { tick: number }>();
  sitData = new Map<string, SitDataObject>();
  chaffData = new Map<string, ChaffDataObject & { tick: number; id: number }>();
  delayed = '';

  constructor(private readonly interval: number = 12) {}

  // deno-lint-ignore require-await
  async write(page: PageObject) {
    const acmi = this.writeAcmi(page);
    console.log(acmi);
  }

  protected writeAcmi(page: PageObject): string {
    if (page.data.some((d) => d.type === 'create')) {
      return this.onCreate();
    }

    if (this.previousTick < page.tick) {
      this.step();
    }

    let acmi = `#${this.previousTick / 60}\n${this.delayed}\n`;
    this.delayed = '';

    // vehicle
    for (const vehicle of this.vehicles.values()) {
      const tag = vehicle.name.match(/^\[[^\]]*\]/)?.[0].slice(1, -1) || null;
      const color = vehicle.name.match(/\[[^\]]*\]$/)?.[0].slice(1, -1) ||
        'Red';
      const name = vehicle.name
        .replace(/\[[^\]]*\]/g, '')
        .replace(/__/g, ' ');

      const internalType = tag
        ? tag
        : vehicle.seatCount === 0 && vehicle.y >= 0
        ? 'Missile'
        : vehicle.seatCount === 0
        ? 'Torpedo'
        : vehicle.seatCount === 1 || vehicle.y > 20
        ? 'Aircraft'
        : 'Sea';
      const type = internalType.toUpperCase() === 'AIRCRAFT'
        ? 'Air+FixedWing'
        : (internalType.toUpperCase() === 'MISSILE' ||
            internalType.toUpperCase() === 'VLSMISSILE')
        ? 'Weapon+Missile'
        : internalType.toUpperCase() === 'TORPEDO'
        ? 'Weapon+Torpedo'
        : internalType.toUpperCase() === 'ANTIAIRCRAFT'
        ? 'Ground+AntiAircraft+SAM'
        : 'Sea+Watercraft';

      const parent = this.getParentData(vehicle);
      if (!parent) {
        console.warn(`Parent not found for ${vehicle.vehicleId}`);
        continue;
      }

      const sqrDistance = (parent.x - vehicle.x) ** 2 +
        (parent.y - vehicle.y) ** 2 + (parent.z - vehicle.z) ** 2;
      if (vehicle.vehicleId === parent.vehicleId || sqrDistance > 900) {
        const useAttitude = tag?.toLocaleUpperCase() !== 'VLSMISSILE';
        const acmiName = name ||
          (type === 'Air+FixedWing'
            ? 'F-16CM'
            : type === 'Sea+Watercraft'
            ? `${internalType} #${vehicle.vehicleId}`
            : `${internalType} #${vehicle.vehicleId}`);
        const steamName = this.sitData.get(vehicle.vehicleId)?.name;
        acmi += `${vehicle.vehicleId},T=${
          vehicle.x * 0.000009090909090909091
        }|${vehicle.z * 0.000009090909090909091}|${vehicle.y}|${
          useAttitude ? vehicle.roll : ''
        }|${useAttitude ? vehicle.pitch : ''}|${
          useAttitude ? vehicle.yaw : ''
        }|||,Type=${type},Name=${acmiName},Color=${color}${
          steamName ? `,Pilot=${steamName}` : ''
        }\n`;
      }
    }

    // damage
    for (
      const damage of page.data.filter((v) =>
        v.type === 'damage'
      ) as DamageDataObject[]
    ) {
      const explosionId = Math.floor(Math.random() * 10000000);
      acmi += `${explosionId},T=${+damage.x * 0.000009090909090909091}|${
        +damage.z * 0.000009090909090909091
      }|${damage.y},Type=Explosion\n`;
      this.delayed += `-${explosionId}\n`;
    }

    // chaff
    for (
      const chaff of page.data.filter((v) =>
        v.type === 'chaff'
      ) as ChaffDataObject[]
    ) {
      const chaffId = Math.floor(Math.random() * 10000000);
      acmi += `${chaffId},T=${+chaff.x * 0.000009090909090909091}|${
        +chaff.z * 0.000009090909090909091
      }|${chaff.y},Type=Misc+Decoy+Chaff\n`;
      this.chaffData.set(chaffId.toString(), {
        ...chaff,
        vy: chaff.vy - 0.5,
        tick: this.previousTick,
        id: chaffId,
      });
    }

    this.updateSitData(page.data);
    this.delayed += this.updateVehicle(page.data, this.previousTick);
    if (page.tick > 0) {
      // マイコンからのデータは tick が -1 になっているので
      this.previousTick = page.tick;
    }
    return acmi;
  }

  private getParentData(
    vehicleData: VehicleDataObject,
  ): VehicleDataObject {
    return this.vehicles.get(vehicleData.parentId) || vehicleData;
  }

  private onCreate(): string {
    this.delayed = '';
    let acmi = `#${this.previousTick / 60}\n`;
    for (const vehicle of this.vehicles.values()) {
      acmi += `-${vehicle.vehicleId}\n`;
    }
    for (const chaff of this.chaffData.values()) {
      acmi += `-${chaff.id}\n`;
    }
    this.vehicles.clear();
    this.sitData.clear();
    const now = new Date();
    this.delayed = `0,ReferenceTime=${now.toISOString()}
0,RecordingTime=${now.toISOString()}
0,Event=Message|Reloaded\n`;
    return acmi;
  }

  /**
   * vehicle に関する情報を更新する
   */
  private updateVehicle(data: DataObject[], tick: number): string {
    for (
      const vehicle of data.filter((v) =>
        v.type === 'vehicle'
      ) as VehicleDataObject[]
    ) {
      this.vehicles.set(vehicle.vehicleId, { ...vehicle, tick });
    }

    let acmi = '';
    for (
      const despawn of data.filter((v) =>
        v.type === 'despawn'
      ) as DespawnDataObject[]
    ) {
      if (this.vehicles.has(despawn.vehicleId)) {
        this.vehicles.delete(despawn.vehicleId);
      }
      acmi += `-${despawn.vehicleId}\n`;
    }

    for (const vehicle of this.vehicles.values()) {
      if (vehicle.tick < tick - 25) {
        this.vehicles.delete(vehicle.vehicleId);
        acmi += `-${vehicle.vehicleId}\n`;
      }
    }
    return acmi;
  }

  private updateSitData(data: DataObject[]): void {
    for (
      const sit of data.filter((v) => v.type === 'sit') as SitDataObject[]
    ) {
      this.sitData.set(sit.vehicleId, sit);
    }
    for (
      const dataObject of data.filter((v) =>
        v.type === 'unsit' || v.type === 'despawn'
      ) as (UnsitDataObject | DespawnDataObject)[]
    ) {
      if (this.sitData.has(dataObject.vehicleId)) {
        this.sitData.delete(dataObject.vehicleId);
      }
    }
  }

  /**
   * 砲弾等の物理演算を進める
   */
  step(): void {
    const alpha = 0.1;
    for (const chaff of this.chaffData.values()) {
      if (this.previousTick - chaff.tick > 600 || chaff.y < 0) {
        this.chaffData.delete(chaff.id.toString());
        this.delayed += `-${chaff.id}\n`;
        continue;
      }
      chaff.vx = chaff.vx * (1 - alpha);
      chaff.vz = chaff.vz * (1 - alpha);
      chaff.vy = chaff.vy - 9.8 * ((this.interval / 60) ** 2) * alpha;
      chaff.x += chaff.vx * (this.interval / 60);
      chaff.y += chaff.vy * (this.interval / 60);
      chaff.z += chaff.vz * (this.interval / 60);
      this.delayed += `${chaff.id},T=${chaff.x * 0.000009090909090909091}|${
        chaff.z * 0.000009090909090909091
      }|${chaff.y},\n`;
    }
  }
}
