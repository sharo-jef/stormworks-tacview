use anyhow::Result;
use async_trait::async_trait;

use super::acmi::AcmiRepository;

/// Trait for real-time telemetry repositories
///
/// This trait extends the basic AcmiRepository with handshake functionality
/// for real-time telemetry connections with Tacview.
#[async_trait]
pub trait RealTimeTelemetryRepository: AcmiRepository {
    /// Perform handshake with Tacview client
    ///
    /// This should handle the initial protocol negotiation and send
    /// the ACMI headers to establish the connection.
    async fn handshake(&self) -> Result<()>;

    /// Check if the connection is closed
    fn is_closed(&self) -> bool;
}
