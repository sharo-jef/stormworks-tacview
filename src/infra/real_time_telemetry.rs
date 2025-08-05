use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tracing::{error, info};

use crate::domain::{AcmiRepository, RealTimeTelemetryRepository};

/// Real-time telemetry repository implementation
///
/// This implementation handles TCP connections with Tacview clients,
/// performing the necessary handshake and streaming ACMI data in real-time.
pub struct TcpRealTimeTelemetryRepository {
    stream: Arc<tokio::sync::Mutex<TcpStream>>,
    closed: Arc<AtomicBool>,
    message_count: Arc<std::sync::atomic::AtomicU64>,
    verbose: bool,
}

impl TcpRealTimeTelemetryRepository {
    /// Create a new real-time telemetry repository from a TCP connection
    pub fn new(stream: TcpStream) -> Self {
        Self {
            stream: Arc::new(tokio::sync::Mutex::new(stream)),
            closed: Arc::new(AtomicBool::new(false)),
            message_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            verbose: false,
        }
    }

    /// Create a new real-time telemetry repository with verbose logging
    pub fn new_with_verbose(stream: TcpStream, verbose: bool) -> Self {
        Self {
            stream: Arc::new(tokio::sync::Mutex::new(stream)),
            closed: Arc::new(AtomicBool::new(false)),
            message_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            verbose,
        }
    }

    /// Generate ACMI header for real-time telemetry
    fn generate_realtime_header() -> String {
        let now = Utc::now();
        let time_str = now.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
        format!(
            "FileType=text/acmi/tacview\n\
            FileVersion=2.2\n\
            0,ReferenceTime={time_str}\n\
            0,RecordingTime={time_str}\n\
            0,Title=StormworksACMI\n\
            0,DataRecorder=StormworksACMI 0.1.0\n\
            0,DataSource=Stormworks\n\
            0,Author=stormworks-tacview-rust\n\
            0,ReferenceLongitude=180\n\
            0,ReferenceLatitude=0\n\
            40000003,T=0|0|2000|0|0,Type=Navaid+Static+Bullseye,Color=Blue,Coalition=Allies\n\
            #0.001\n"
        )
    }

    /// Handle connection closure
    fn handle_connection_error(&self, error: &std::io::Error) {
        self.closed.store(true, Ordering::Relaxed);

        match error.kind() {
            std::io::ErrorKind::ConnectionAborted | std::io::ErrorKind::BrokenPipe => {
                info!("Tacview connection closed by client");
            }
            _ => {
                error!("Unexpected TCP error: {}", error);
            }
        }
    }
}

#[async_trait]
impl AcmiRepository for TcpRealTimeTelemetryRepository {
    async fn write(&self, acmi: &str) -> Result<()> {
        if self.closed.load(Ordering::Relaxed) {
            if self.verbose {
                info!("TCP connection is closed, skipping write");
            }
            return Ok(());
        }

        // Send raw ACMI data without timestamp formatting (like original TypeScript)
        // The timestamp is only added once in the header during handshake

        // Track message count and log regularly
        let count = self.message_count.fetch_add(1, Ordering::Relaxed);

        // Debug: Always log first few messages, then every 100th (reduced frequency)
        if self.verbose && (count < 5 || count % 100 == 0) {
            info!(
                "Sending to Tacview: message #{}, {} bytes (raw ACMI)",
                count + 1,
                acmi.len()
            );
        }

        let mut stream = self.stream.lock().await;

        match stream.write_all(acmi.as_bytes()).await {
            Ok(_) => {
                // Flush the stream to ensure data is sent immediately
                if let Err(e) = stream.flush().await {
                    error!("Failed to flush TCP stream: {}", e);
                    self.handle_connection_error(&e);
                    return Err(e.into());
                }

                // Log connection health less frequently
                if self.verbose && count < 5 {
                    info!("Message #{} sent successfully", count + 1);
                } else if count % 500 == 0 && count > 0 {
                    info!("Tacview connection healthy ({} messages sent)", count + 1);
                }
                Ok(())
            }
            Err(e) => {
                error!("Failed to send message #{} to Tacview: {}", count + 1, e);
                self.handle_connection_error(&e);
                Err(e.into())
            }
        }
    }

    fn step(&self) {
        // No periodic processing needed for TCP repository
    }
}

#[async_trait]
impl RealTimeTelemetryRepository for TcpRealTimeTelemetryRepository {
    async fn handshake(&self) -> Result<()> {
        let mut stream = self.stream.lock().await;

        // Send handshake response
        let handshake_response =
            "XtraLib.Stream.0\nTacview.RealTimeTelemetry.0\nHost stormworks\n\0";

        if let Err(e) = stream.write_all(handshake_response.as_bytes()).await {
            self.handle_connection_error(&e);
            return Err(e.into());
        }

        // Read client handshake
        let mut buffer = [0u8; 1024];
        match stream.read(&mut buffer).await {
            Ok(bytes_read) => {
                if bytes_read == 0 {
                    self.closed.store(true, Ordering::Relaxed);
                    return Err(anyhow::anyhow!("Client disconnected during handshake"));
                }

                let client_handshake = String::from_utf8_lossy(&buffer[..bytes_read]);
                if self.verbose {
                    info!("Client handshake: {}", client_handshake.trim());
                }
            }
            Err(e) => {
                self.handle_connection_error(&e);
                return Err(e.into());
            }
        }

        // Send ACMI header
        let header = Self::generate_realtime_header();
        if let Err(e) = stream.write_all(header.as_bytes()).await {
            self.handle_connection_error(&e);
            return Err(e.into());
        }

        info!("Tacview handshake completed successfully");
        Ok(())
    }

    fn is_closed(&self) -> bool {
        self.closed.load(Ordering::Relaxed)
    }
}
