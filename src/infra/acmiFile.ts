import { compress } from 'https://deno.land/x/zip@v1.2.5/mod.ts';

import { AcmiFileRepository } from '../repository/acmiFile.ts';
import { ProdAcmiRepository } from './acmi.ts';

export class ProdAcmiFileRepository extends ProdAcmiRepository
  implements AcmiFileRepository {
  filename: string | null = null;
  writing: boolean = false;

  override async write(page: PageObject) {
    if (this.writing && this.filename) {
      const acmi = this.writeAcmi(page);
      await Deno.writeTextFile(this.filename, acmi, { append: true });
    }
  }

  start() {
    if (this.writing) {
      this.stop();
    }
    this.vehicles = new Map();
    this.sitData = new Map();
    this.chaffData = new Map();
    this.delayed = '';
    const now = new Date();
    this.filename = `Stormworks-${`${now.getFullYear()}`.padStart(4, '0')}${
      `${now.getMonth() + 1}`.padStart(2, '0')
    }${`${now.getDate()}`.padStart(2, '0')}-${
      `${now.getHours()}`.padStart(2, '0')
    }${`${now.getMinutes()}`.padStart(2, '0')}${
      `${now.getSeconds()}`.padStart(2, '0')
    }.txt.acmi`;
    this.previousTick = 0;
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

        if (this.filename) {
          await Deno.remove(this.filename);
          console.log(
            `%cRemoved%c: ${this.filename}`,
            'color: red',
            'color: white',
          );
        } else {
          console.warn(
            `%cFile name is null%c`,
            'color: red',
            'color: white',
          );
        }
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
}
