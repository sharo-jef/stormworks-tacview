use anyhow::Result;
use async_trait::async_trait;

/// Core trait for ACMI data repositories
///
/// This trait defines the interface for writing ACMI data to various destinations
/// such as files or real-time telemetry streams.
#[async_trait]
pub trait AcmiRepository: Send + Sync {
    /// Write ACMI data to the repository
    ///
    /// # Arguments
    /// * `acmi` - The ACMI data string to write
    ///
    /// # Returns
    /// * `Result<()>` - Success or error
    async fn write(&self, acmi: &str) -> Result<()>;

    /// Perform a step operation (for periodic processing)
    fn step(&self);
}
