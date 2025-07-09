use anyhow::{Context, Result};
use async_trait::async_trait;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{info, warn};

use crate::domain::{AcmiFileRepository, AcmiRepository};

/// File-based ACMI repository implementation
///
/// This implementation writes ACMI data to files and provides lifecycle management
/// for starting/stopping recordings.
pub struct FileAcmiRepository {
    state: Arc<Mutex<FileAcmiState>>,
}

#[derive(Debug)]
struct FileAcmiState {
    filename: Option<PathBuf>,
    is_recording: bool,
}

impl FileAcmiRepository {
    /// Create a new file-based ACMI repository
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(FileAcmiState {
                filename: None,
                is_recording: false,
            })),
        }
    }

    /// Generate ACMI file header with metadata
    fn generate_acmi_header() -> String {
        format!(
            "FileType=text/acmi/tacview\n\
            FileVersion=2.2\n\
            0,ReferenceTime=2023-01-01T00:00:00.000Z\n\
            0,RecordingTime=2023-01-01T00:00:00.000Z\n\
            0,Title=StormworksACMI\n\
            0,DataRecorder=StormworksACMI 0.1.0\n\
            0,DataSource=Stormworks\n\
            0,Author=stormworks-tacview-rust\n\
            0,ReferenceLongitude=180\n\
            0,ReferenceLatitude=0\n\
            40000003,T=0|0|2000|0|0,Type=Navaid+Static+Bullseye,Color=Blue,Coalition=Allies\n"
        )
    }

    /// Generate filename based on current timestamp
    fn generate_filename() -> PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let filename = format!("Stormworks-{}.txt.acmi", now);
        PathBuf::from(filename)
    }
}

impl Default for FileAcmiRepository {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AcmiRepository for FileAcmiRepository {
    async fn write(&self, acmi: &str) -> Result<()> {
        let filename = {
            let state = self.state.lock().unwrap();
            state.filename.clone()
        };

        if let Some(filename) = filename {
            use tokio::fs::OpenOptions;
            use tokio::io::AsyncWriteExt;

            let mut file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&filename)
                .await
                .with_context(|| format!("Failed to open ACMI file: {:?}", filename))?;

            file.write_all(acmi.as_bytes())
                .await
                .with_context(|| format!("Failed to write to ACMI file: {:?}", filename))?;

            file.flush()
                .await
                .with_context(|| format!("Failed to flush ACMI file: {:?}", filename))?;
        }

        Ok(())
    }

    fn step(&self) {
        // No periodic processing needed for file repository
    }
}

#[async_trait]
impl AcmiFileRepository for FileAcmiRepository {
    fn start(&self) -> Result<()> {
        let mut state = self.state.lock().unwrap();

        // Stop any existing recording
        if state.is_recording {
            warn!("Stopping existing recording before starting new one");
            state.is_recording = false;
        }

        let filename = Self::generate_filename();
        let header = Self::generate_acmi_header();

        // Write header to file synchronously since we're in a sync function
        std::fs::write(&filename, header)
            .with_context(|| format!("Failed to create ACMI file: {:?}", filename))?;

        state.filename = Some(filename.clone());
        state.is_recording = true;

        info!("Started ACMI recording: {:?}", filename);

        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        let mut state = self.state.lock().unwrap();

        if !state.is_recording {
            warn!("No active recording to stop");
            return Ok(());
        }

        state.is_recording = false;

        if let Some(filename) = state.filename.take() {
            info!("Stopped ACMI recording: {:?}", filename);
        } else {
            warn!("No filename to process when stopping recording");
        }

        Ok(())
    }

    fn is_recording(&self) -> bool {
        self.state.lock().unwrap().is_recording
    }
}
