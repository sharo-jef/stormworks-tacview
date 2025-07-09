# Stormworks-Tacview Bridge (Rust)

A high-performance bridge software written in Rust that connects Stormworks with Tacview, enabling real-time telemetry streaming and ACMI file export.

## Features

- ✅ **ACMI File Export**: Export flight data to compressed ACMI files
- ✅ **Real-time Telemetry**: Stream live data to Tacview clients
- ✅ **High Performance**: Built with Rust for maximum efficiency
- ✅ **Concurrent Processing**: Handle multiple Tacview connections simultaneously
- ✅ **Automatic Compression**: ACMI files are automatically compressed to ZIP format
- ✅ **Graceful Shutdown**: Proper cleanup on application termination
- ✅ **Structured Logging**: Comprehensive logging with tracing

## Architecture

The application follows clean architecture principles with clear separation of concerns:

- **Domain Layer**: Core business logic and traits
- **Infrastructure Layer**: Concrete implementations for file I/O and networking
- **Server Layer**: HTTP and TCP server implementations
- **Handlers Layer**: Request/response handling logic

## Requirements

- [Rust](https://rustup.rs/) 1.70 or later
- [WebMap](https://steamcommunity.com/sharedfiles/filedetails/?id=3132180760) Stormworks addon

## Building

```bash
# Clone the repository
git clone https://github.com/sharo-jef/stormworks-tacview.git
cd stormworks-tacview

# Build the project
cargo build --release

# Run tests
cargo test
```

## Running

```bash
# Run the application
cargo run

# Or run the compiled binary
./target/release/stormworks-tacview
```

The application will start two servers:

- **HTTP Server**: `localhost:3000` (for Stormworks communication)
- **TCP Server**: `localhost:42674` (for Tacview connections)

## Usage

### ACMI File Export

1. Start the `stormworks-tacview` application
2. In Stormworks, execute `?start` to begin recording
3. Perform your flight operations
4. Execute `?stop` to end recording
5. Find the compressed ACMI file in the application directory

### Real-Time Telemetry

1. Start the `stormworks-tacview` application
2. In Tacview, connect to the real-time telemetry:
   - Data Recorder Address: `localhost`
   - Data Recorder Port: `42674`
   - Username: Any (ignored)
   - Password: Not required
3. Real-time data will be streamed to Tacview

## Configuration

Currently, the application uses default configuration:

- HTTP Port: 3000
- TCP Port: 42674

Configuration can be extended by modifying the `Config` struct in `src/main.rs`.

## API Endpoints

The HTTP server provides the following endpoints:

- `GET /api/stormworks/start` - Start ACMI recording
- `GET /api/stormworks/stop` - Stop ACMI recording
- `GET /api/stormworks/acmi/{base64_data}` - Receive ACMI data

## Logging

The application uses structured logging with the `tracing` crate. Set the `RUST_LOG` environment variable to control log levels:

```bash
# Enable debug logging
RUST_LOG=stormworks_tacview=debug cargo run

# Enable info logging (default)
RUST_LOG=stormworks_tacview=info cargo run
```

## Performance

The Rust implementation provides significant performance improvements over the original TypeScript version:

- **Memory Efficiency**: Lower memory usage with zero-copy operations where possible
- **Concurrent Processing**: Tokio async runtime for handling multiple connections
- **Fast File I/O**: Efficient file operations with proper buffering
- **Minimal Allocations**: Careful memory management to reduce GC pressure

## Testing

Run the test suite with:

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_file_repository_write
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Original TypeScript implementation
- Stormworks game by Geometa
- Tacview by Raia Software
- Rust community for excellent crates and tools
