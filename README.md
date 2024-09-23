# Stormworks Tacview

## Features

- Export ACMI file
- Serve realtime telemetry server

## Requirements

- [WebMap](https://steamcommunity.com/sharedfiles/filedetails/?id=3132180760)

## Build

```bash
deno compile -A index.ts
```

## Usage

### ACMI

- Run stormworks-tacview.exe
- Execute `?start` in Stormworks to start recording
- Execute `?stop` in Stormworks to stop recording
- Files are exported in the directory that stormworks-tacview.exe is located

### Real-Time Telemetry

- Run stormworks-tacview.exe
- Connect from Tacview
  - stormworks-tacview.exe accepts any user name
  - Data Recorder Address: localhost
  - Data Recorder Port 42674
  - No password
