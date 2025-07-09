use anyhow::Result;
use async_trait::async_trait;

use super::acmi::AcmiRepository;

/// Trait for ACMI file repositories that can be started and stopped
///
/// This trait extends the basic AcmiRepository with lifecycle management
/// for file-based ACMI recording.
#[async_trait]
pub trait AcmiFileRepository: AcmiRepository {
    /// Start recording ACMI data to a file
    ///
    /// This should create a new ACMI file with proper headers and metadata.
    fn start(&self) -> Result<()>;

    /// Stop recording and finalize the ACMI file
    ///
    /// This should close the file, compress it, and clean up temporary files.
    async fn stop(&self) -> Result<()>;

    /// Check if the repository is currently recording
    fn is_recording(&self) -> bool;
}
