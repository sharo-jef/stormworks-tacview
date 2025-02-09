import { compress } from 'https://deno.land/x/zip@v1.2.5/mod.ts';
import {
  AttitudeObject,
  type PageObject,
  RadarObject,
  RadarSttObject,
  type VehicleObject,
  type VehicleObjectData,
  WeaponData,
  type WeaponObject,
  type WeaponType,
} from './stormworks.ts';
import { SteamRepository } from './steam.ts';

export interface IClient {
  write(data: PageObject): Promise<void>;
  tick(): void;
}

export class Client implements IClient {
  frame: number = 0;
  vehicles: Map<
    number,
    VehicleObjectData & { frame: number; color: string }
  > = new Map();
  bullets: Map<
    number,
    {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      weaponType: WeaponType;
      frame: number;
    }
  > = new Map();
  radars: Map<number, number> = new Map();
  stt: Map<number, number> = new Map();

  constructor(protected readonly steamRepository: SteamRepository) {}

  // deno-lint-ignore require-await
  async write(data: PageObject): Promise<void> {
    const acmi = this.writeAcmi(data);
    console.log(acmi);
  }

  protected writeAcmi(data: PageObject): string {
    let acmi = '';

    if (data.type === 'vehicle') {
      const vehicle = data as VehicleObject;

      // Vehicle のデータを受信する度に frame を進める
      if (vehicle.page === '1') {
        this.frame += 0.1; // 6ticks 毎に vehicle のデータが送られてくる場合: 6ticks / 60ticks (1s) = 0.1s
        acmi += `#${this.frame}\n`;

        // フレーム毎の処理
        this.bullets.forEach((bullet, id) => {
          acmi += `${id},T=${bullet.x * 0.000009090909090909091}|${
            bullet.y * 0.000009090909090909091
          }|${bullet.z}||||||,Type=Projectile+Bullet,Color=Yellow\n`;
        });
        this.radars.forEach((frame, id) => {
          if (this.frame - frame > 0.5) {
            acmi +=
              `${id},RadarMode=0,RadarAzimuth=0,RadarElevation=0,RadarRange=0,RadarHorizontalBeamwidth=0,RadarVerticalBeamwidth=0\n`;
            this.radars.delete(id);
          }
        });
        this.stt.forEach((frame, id) => {
          if (this.frame - frame > 0.5) {
            acmi +=
              `${id},LockedTargetMode=0,LockedTargetAzimuth=0,LockedTargetElevation=0,LockedTargetRange=0\n`;
            this.stt.delete(id);
          }
        });
      }

      for (const data of vehicle.data) {
        const tag = data.name.match(/^\[[^\]]*\]/)?.[0].slice(1, -1) || null;
        const color = data.name.match(/\[[^\]]*\]$/)?.[0].slice(1, -1) || null;
        const name = data.name.replace(/\[[^\]]*\]/g, '').replace(/__/g, ' ');

        const internalType = tag
          ? tag
          : data.seat_count === 0 && data.z >= 0
          ? 'Missile'
          : data.seat_count === 0
          ? 'Torpedo'
          : data.seat_count === 1 || data.z > 20
          ? 'Aircraft'
          : 'Sea';
        const type = internalType.toUpperCase() === 'AIRCRAFT'
          ? 'Air+FixedWing'
          : internalType.toUpperCase() === 'MISSILE'
          ? 'Weapon+Missile'
          : internalType.toUpperCase() === 'TORPEDO'
          ? 'Weapon+Torpedo'
          : internalType.toUpperCase() === 'ANTIAIRCRAFT'
          ? 'Ground+AntiAircraft+SAM'
          : 'Sea+Watercraft';

        const parent = this.getParentData(vehicle.data, data.p_id);
        const parentObj = this.vehicles.get(data.p_id);

        if (!parent) {
          // 親が存在しない場合は無視 (自分が親の場合も自分が返るはずなので、基本的にはこの処理は実行されない想定)
          console.warn(`Parent not found: ${data.id}`);
          continue;
        }

        const sqrDistance = (parent.x - data.x) ** 2 +
          (parent.y - data.y) ** 2 + (parent.z - data.z) ** 2;
        if (data.p_id === data.id || sqrDistance > 900) {
          // 親が自分自身の場合と、親との距離が 30m 以上の場合に ACMI に追記する
          this.vehicles.set(data.id, {
            ...data,
            frame: this.frame,
            color: color || parentObj?.color || 'Red',
          });

          const acmiName = name ||
            (type === 'Air+FixedWing'
              ? 'F-16CM'
              : type === 'Sea+Watercraft'
              ? `${internalType} #${data.id}`
              : `${internalType} #${data.id}`);
          acmi += `${data.id},T=${data.x * 0.000009090909090909091}|${
            data.y * 0.000009090909090909091
          }|${data.z}||||||,Type=${type},Name=${acmiName},Color=${
            this.vehicles.get(data.id)?.color || 'Red'
          },FullName=${
            acmiName + (data.plist.stmid
              ? ` (${
                this.steamRepository.getPersonaname(
                  data.plist.stmid,
                )
              })`
              : '')
          }\n`;
        }
        if (data.dmg >= 9999) {
          acmi += `-${data.id}\n`;
        }
      }
      this.vehicles.forEach((obj, id) => {
        if (this.frame - obj.frame > 0.2) {
          acmi += `${id},T=||||||||,Type=Misc+Explosion\n`;
          acmi += `-${id}\n`;
          this.vehicles.delete(id);
        }
      });
    } else if (data.type === 'weapon') {
      const weapon = data as WeaponObject;
      this.bullets.set(Math.floor(Math.random() * 100000 + 100000), {
        x: weapon.data.cx,
        y: weapon.data.cy,
        z: weapon.data.cz,
        vx: weapon.data.cxv +
          Math.cos(weapon.data.elevation * Math.PI * 2) *
            Math.sin(-weapon.data.azimuth * Math.PI * 2) *
            (WeaponData[weapon.data.wType]?.initialSpeed || 1000) / 60,
        vy: weapon.data.cyv +
          Math.cos(weapon.data.elevation * Math.PI * 2) *
            Math.cos(-weapon.data.azimuth * Math.PI * 2) *
            (WeaponData[weapon.data.wType]?.initialSpeed || 1000) / 60,
        vz: weapon.data.czv +
          Math.sin(weapon.data.elevation * Math.PI * 2) *
            (WeaponData[weapon.data.wType]?.initialSpeed || 1000) / 60,
        weaponType: weapon.data.wType,
        frame: this.frame,
      });
    } else if (data.type === 'radar') {
      const radar = data as RadarObject;
      let minSqrDistance = 400;
      let minId = -1;
      this.vehicles.forEach((obj, id) => {
        const sqrDistance = (obj.x - radar.data.x) ** 2 +
          (obj.y - radar.data.y) ** 2 + (obj.z - radar.data.z) ** 2;
        if (sqrDistance < minSqrDistance) {
          minSqrDistance = sqrDistance;
          minId = id;
        }
      });
      if (minId !== -1) {
        acmi += `${minId},T=||||||||,RadarMode=1,RadarAzimuth=${
          -radar.data.azimuth * 360
        },RadarElevation=${
          radar.data.elevation * 360
        },RadarRange=4000,RadarHorizontalBeamwidth=10,RadarVerticalBeamwidth=10\n`;
        this.radars.set(minId, this.frame);
      }
    } else if (data.type === 'attitude') {
      const attitude = data as AttitudeObject;
      let minSqrDistance = 400;
      let minId = -1;
      this.vehicles.forEach((obj, id) => {
        const sqrDistance = (obj.x - attitude.data.x) ** 2 +
          (obj.y - attitude.data.y) ** 2 + (obj.z - attitude.data.z) ** 2;
        if (sqrDistance < minSqrDistance) {
          minSqrDistance = sqrDistance;
          minId = id;
        }
      });
      if (minId !== -1) {
        acmi += `${minId},T=|||${attitude.data.roll / Math.PI * 180}|${
          attitude.data.pitch / Math.PI * 180
        }|${attitude.data.yaw / Math.PI * 180}|||\n`;
      }
    } else if (data.type === 'radar_stt') {
      const stt = data as RadarSttObject;
      let minSqrDistance = 400;
      let minId = -1;
      this.vehicles.forEach((obj, id) => {
        const sqrDistance = (obj.x - stt.data.x) ** 2 +
          (obj.y - stt.data.y) ** 2 + (obj.z - stt.data.z) ** 2;
        if (sqrDistance < minSqrDistance) {
          minSqrDistance = sqrDistance;
          minId = id;
        }
      });
      if (minId !== -1) {
        acmi += `${minId},T=||||||||,LockedTargetMode=1,LockedTargetAzimuth=${
          stt.data.azimuth / Math.PI * 180
        },LockedTargetElevation=${
          stt.data.elevation / Math.PI * 180
        },LockedTargetRange=${stt.data.distance}\n`;
        this.stt.set(minId, this.frame);
      }
    }

    return acmi;
  }

  protected getParentData(
    data: VehicleObjectData[],
    parentId: number,
  ): VehicleObjectData | undefined {
    return data.find((v) => v.id === parentId) || this.vehicles.get(parentId);
  }

  tick() {
    this.bullets.forEach((bullet, id) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      bullet.z += bullet.vz;
      bullet.vz =
        bullet.vz * (1 - (WeaponData[bullet.weaponType]?.drag || 0.025)) -
        (WeaponData[bullet.weaponType]?.gravity || 30) / 3600;
      bullet.vx = bullet.vx *
        (1 -
          (WeaponData[bullet.weaponType]?.drag || 0.025));
      bullet.vy = bullet.vy *
        (1 -
          (WeaponData[bullet.weaponType]?.drag || 0.025));
      if (bullet.z < 0 || this.frame - bullet.frame > 10) {
        this.bullets.delete(id);
      }
    });
  }
}

export class AcmiClient extends Client {
  filename: string | null = null;
  writing: boolean = false;
  async init(): Promise<void> {
    if (this.writing) {
      await this.stop();
    }
    this.vehicles = new Map();
    this.bullets = new Map();
    this.radars = new Map();
    this.stt = new Map();
    const now = new Date();
    this.filename = `Stormworks-${`${now.getFullYear()}`.padStart(4, '0')}${
      `${now.getMonth() + 1}`.padStart(2, '0')
    }${`${now.getDate()}`.padStart(2, '0')}-${
      `${now.getHours()}`.padStart(2, '0')
    }${`${now.getMinutes()}`.padStart(2, '0')}${
      `${now.getSeconds()}`.padStart(2, '0')
    }.txt.acmi`;
    this.frame = 0;
    const acmi = `FileType=text/acmi/tacview
FileVersion=2.2
0,ReferenceTime=${now.toISOString()}
0,RecordingTime=${now.toISOString()}
0,Title=StormworksACMI
0,DataRecorder=StormworksACMI 0.0.1
0,DataSource=Stormworks
0,Author=mokoko
0,ReferenceLongitude=180
0,ReferenceLatitude=0
40000003,T=0|0|2000|0|0,Type=Navaid+Static+Bullseye,Color=Blue,Coalition=Allies
`;
    Deno.writeTextFileSync(this.filename, acmi);
    this.writing = true;
    console.log(
      `%cCreated%c: ${this.filename}`,
      'color: green',
      'color: white',
    );
  }
  async stop() {
    this.writing = false;

    if (this.filename) {
      try {
        const archiveName = this.filename.replace(/txt/g, 'zip');
        await compress(this.filename, archiveName);
        console.log(
          `%cCompressed%c: ${archiveName}`,
          'color: green',
          'color: white',
        );

        await Deno.remove(this.filename);
        console.log(
          `%cRemoved%c: ${this.filename}`,
          'color: red',
          'color: white',
        );
      } catch (e) {
        console.error(e);
      }
    } else {
      console.warn(
        `%cFailed to compress ACMI file%c: ${this.filename}`,
        'color: red',
        'color: white',
      );
    }

    this.filename = null;
  }
  async write(data: PageObject): Promise<void> {
    if (this.writing && this.filename) {
      const acmi = this.writeAcmi(data);
      await Deno.writeTextFile(this.filename, acmi, { append: true });
    }
  }
}

export class RealtimeTelemetryClient extends Client {
  closed = false;
  constructor(
    private readonly conn: Deno.Conn,
    steamRepository: SteamRepository,
  ) {
    super(steamRepository);
  }
  async write(data: PageObject): Promise<void> {
    if (this.closed) {
      return;
    }
    try {
      const acmi = this.writeAcmi(data);
      await this.conn.write(new TextEncoder().encode(acmi));
    } catch (err) {
      this.closed = true;
      if (err instanceof Deno.errors.ConnectionAborted) {
        console.log('Connection closed by client');
      } else {
        console.error('Unexpected error:', err);
      }
      this.conn.close();
    }
  }
  async handshake() {
    const startDate = new Date();
    try {
      const handshakeResponse =
        `XtraLib.Stream.0\nTacview.RealTimeTelemetry.0\nHost stormworks\n\0`;
      await this.conn.write(new TextEncoder().encode(handshakeResponse));

      const buf = new Uint8Array(1024);
      await this.conn.read(buf);
      const clientHandshake = new TextDecoder().decode(buf);
      console.log(clientHandshake);

      const header = `FileType=text/acmi/tacview
FileVersion=2.2
0,ReferenceTime=${startDate.toISOString()}
0,RecordingTime=${startDate.toISOString()}
0,Title=StormworksACMI
0,DataRecorder=StormworksACMI 0.0.1
0,DataSource=Stormworks
0,Author=mokoko
0,ReferenceLongitude=180
0,ReferenceLatitude=0
40000003,T=0|0|2000|0|0,Type=Navaid+Static+Bullseye,Color=Blue,Coalition=Allies
#0.001
`;

      await this.conn.write(new TextEncoder().encode(header));
    } catch (err) {
      this.closed = true;
      console.error('Unexpected error:', err);
      this.conn.close();
    }
  }
}
