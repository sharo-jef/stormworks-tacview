use anyhow::{Context, Result};
use async_trait::async_trait;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tempfile::NamedTempFile;
use tracing::{error, info, warn};
use zip::write::FileOptions;
use zip::ZipWriter;

use crate::config::AppConfig;
use crate::domain::{AcmiFileRepository, AcmiRepository};

/// File-based ACMI repository implementation
///
/// This implementation writes ACMI data to files and provides lifecycle management
/// for starting/stopping recordings.
pub struct FileAcmiRepository {
    state: Arc<Mutex<FileAcmiState>>,
    config: AppConfig,
}

#[derive(Debug)]
struct FileAcmiState {
    filename: Option<PathBuf>,
    is_recording: bool,
    temp_file: Option<NamedTempFile>,
}

impl Drop for FileAcmiRepository {
    fn drop(&mut self) {
        // Try to save any active recording when the repository is dropped
        let mut state = self.state.lock().unwrap();
        if state.is_recording {
            warn!("FileAcmiRepository dropped with active recording, attempting to save...");

            state.is_recording = false;
            let filename = state.filename.take();
            let temp_file = state.temp_file.take();

            if let (Some(filename), Some(temp_file)) = (filename, temp_file) {
                // Attempt to save the file
                match self.save_acmi_file(&filename, temp_file) {
                    Ok(_) => info!("Successfully saved ACMI file during drop: {:?}", filename),
                    Err(e) => error!("Failed to save ACMI file during drop: {}", e),
                }
            }
        }
    }
}

impl FileAcmiRepository {
    /// Create a new file-based ACMI repository with default configuration
    pub fn new() -> Self {
        Self::new_with_config(AppConfig::default())
    }

    /// Create a new file-based ACMI repository with custom configuration
    pub fn new_with_config(config: AppConfig) -> Self {
        Self {
            state: Arc::new(Mutex::new(FileAcmiState {
                filename: None,
                is_recording: false,
                temp_file: None,
            })),
            config,
        }
    }

    /// Generate ACMI file header with metadata
    fn generate_acmi_header() -> String {
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
            .to_string()
    }

    /// Save ACMI data from temporary file to ZIP file
    fn save_acmi_file(&self, filename: &PathBuf, temp_file: NamedTempFile) -> Result<()> {
        // Create ZIP file and copy content from temporary file
        let zip_file = std::fs::File::create(filename)
            .with_context(|| format!("Failed to create ZIP file: {filename:?}"))?;

        let mut zip = ZipWriter::new(zip_file);
        let options = FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o755);

        // Generate txt.acmi filename based on zip filename
        let txt_filename = filename
            .file_stem()
            .unwrap()
            .to_str()
            .unwrap()
            .replace(".zip", ".txt");
        let txt_filename = format!("{txt_filename}.acmi");

        zip.start_file(&txt_filename, options)
            .with_context(|| format!("Failed to start file in ZIP: {txt_filename}"))?;

        // Copy content from temporary file to ZIP
        let temp_path = temp_file.path();
        let temp_content = std::fs::read(temp_path)
            .with_context(|| format!("Failed to read temporary file: {temp_path:?}"))?;

        zip.write_all(&temp_content)
            .with_context(|| format!("Failed to write ACMI content to ZIP: {filename:?}"))?;

        zip.finish()
            .with_context(|| format!("Failed to finalize ZIP file: {filename:?}"))?;

        // Temporary file is automatically deleted when dropped
        info!("Saved ACMI file: {:?}", filename);
        Ok(())
    }

    /// Generate filename based on current timestamp
    fn generate_filename(&self) -> PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let base_filename = format!("Stormworks-{now}.zip.acmi");
        self.config.generate_output_path(&base_filename)
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
        let mut state = self.state.lock().unwrap();

        if state.is_recording {
            if let Some(ref mut temp_file) = state.temp_file {
                use std::io::Write;
                temp_file
                    .write_all(acmi.as_bytes())
                    .with_context(|| "Failed to write to temporary ACMI file")?;
                temp_file
                    .flush()
                    .with_context(|| "Failed to flush temporary ACMI file")?;
            }
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
            state.temp_file = None;
        }

        // Ensure output directory exists
        if let Err(e) = self.config.ensure_output_dir() {
            warn!("Failed to ensure output directory: {}", e);
        }

        let filename = self.generate_filename();
        let header = Self::generate_acmi_header();

        // Create temporary file and write header
        let mut temp_file =
            NamedTempFile::new().with_context(|| "Failed to create temporary ACMI file")?;

        use std::io::Write;
        temp_file
            .write_all(header.as_bytes())
            .with_context(|| "Failed to write header to temporary ACMI file")?;
        temp_file
            .flush()
            .with_context(|| "Failed to flush temporary ACMI file")?;

        state.filename = Some(filename.clone());
        state.temp_file = Some(temp_file);
        state.is_recording = true;

        info!("Started ACMI recording: {:?}", filename);

        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        let (filename, temp_file) = {
            let mut state = self.state.lock().unwrap();

            if !state.is_recording {
                warn!("No active recording to stop");
                return Ok(());
            }

            state.is_recording = false;
            let filename = state.filename.take();
            let temp_file = state.temp_file.take();

            (filename, temp_file)
        };

        if let (Some(filename), Some(temp_file)) = (filename, temp_file) {
            self.save_acmi_file(&filename, temp_file)?;
            info!("Stopped ACMI recording and saved ZIP: {:?}", filename);
        } else {
            warn!("No filename or temporary file to process when stopping recording");
        }

        Ok(())
    }

    fn is_recording(&self) -> bool {
        self.state.lock().unwrap().is_recording
    }
}
