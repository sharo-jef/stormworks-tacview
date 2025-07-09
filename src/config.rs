use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tracing::{info, warn};

/// Application configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// Output directory for ACMI files
    pub output_dir: PathBuf,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            output_dir: get_default_output_dir(),
        }
    }
}

impl AppConfig {
    /// Load configuration from file or create default if not found
    pub fn load() -> Self {
        match Self::load_from_file() {
            Ok(config) => {
                info!("Loaded configuration from file");
                config
            }
            Err(e) => {
                warn!("Failed to load configuration: {}", e);
                let config = Self::default();

                // Try to create default config file
                if let Err(e) = Self::create_default_config_file(&config) {
                    warn!("Failed to create default configuration file: {}", e);
                }

                config
            }
        }
    }

    /// Load configuration from the config file
    fn load_from_file() -> Result<Self> {
        let config_path = get_config_file_path()?;

        if !config_path.exists() {
            return Err(anyhow::anyhow!(
                "Configuration file not found: {:?}",
                config_path
            ));
        }

        let content = std::fs::read_to_string(&config_path)
            .with_context(|| format!("Failed to read configuration file: {:?}", config_path))?;

        let config: AppConfig = serde_yaml::from_str(&content)
            .with_context(|| format!("Failed to parse configuration file: {:?}", config_path))?;

        Ok(config)
    }

    /// Create default configuration file
    fn create_default_config_file(config: &AppConfig) -> Result<()> {
        let config_path = get_config_file_path()?;

        // Create config directory if it doesn't exist
        if let Some(parent) = config_path.parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create config directory: {:?}", parent))?;
        }

        // Don't overwrite existing file
        if config_path.exists() {
            return Ok(());
        }

        let yaml_content = serde_yaml::to_string(config)
            .with_context(|| "Failed to serialize default configuration")?;

        std::fs::write(&config_path, yaml_content).with_context(|| {
            format!(
                "Failed to write default configuration file: {:?}",
                config_path
            )
        })?;

        info!("Created default configuration file: {:?}", config_path);
        Ok(())
    }

    /// Ensure the output directory exists
    pub fn ensure_output_dir(&self) -> Result<()> {
        if !self.output_dir.exists() {
            std::fs::create_dir_all(&self.output_dir).with_context(|| {
                format!("Failed to create output directory: {:?}", self.output_dir)
            })?;
            info!("Created output directory: {:?}", self.output_dir);
        }
        Ok(())
    }

    /// Generate a unique filename in the output directory
    pub fn generate_output_path(&self, base_filename: &str) -> PathBuf {
        let mut counter = 0;
        let mut filename = base_filename.to_string();

        loop {
            let file_path = self.output_dir.join(&filename);
            if !file_path.exists() {
                return file_path;
            }

            counter += 1;
            // For compound extensions like .zip.acmi, handle them properly
            if base_filename.ends_with(".zip.acmi") {
                let name = &base_filename[..base_filename.len() - 9]; // Remove ".zip.acmi"
                filename = format!("{}-{}.zip.acmi", name, counter);
            } else if let Some(dot_pos) = base_filename.rfind('.') {
                let name = &base_filename[..dot_pos];
                let ext = &base_filename[dot_pos..];
                filename = format!("{}-{}{}", name, counter, ext);
            } else {
                filename = format!("{}-{}", base_filename, counter);
            }
        }
    }
}

/// Get the path to the configuration file
fn get_config_file_path() -> Result<PathBuf> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| anyhow::anyhow!("Unable to determine config directory"))?;

    Ok(config_dir.join("stormworks-tacview.yml"))
}

/// Get the default output directory
fn get_default_output_dir() -> PathBuf {
    dirs::document_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("StormworksTacview")
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert!(config
            .output_dir
            .to_string_lossy()
            .contains("StormworksTacview"));
    }

    #[test]
    fn test_generate_output_path() {
        let temp_dir = TempDir::new().unwrap();
        let config = AppConfig {
            output_dir: temp_dir.path().to_path_buf(),
        };

        // First file should use original name
        let path1 = config.generate_output_path("test.zip.acmi");
        assert_eq!(path1.file_name().unwrap(), "test.zip.acmi");

        // Create the first file
        std::fs::write(&path1, "test").unwrap();

        // Second file should have counter
        let path2 = config.generate_output_path("test.zip.acmi");
        assert_eq!(path2.file_name().unwrap(), "test-1.zip.acmi");
    }

    #[test]
    fn test_ensure_output_dir() {
        let temp_dir = TempDir::new().unwrap();
        let config = AppConfig {
            output_dir: temp_dir.path().join("new_dir"),
        };

        assert!(!config.output_dir.exists());
        config.ensure_output_dir().unwrap();
        assert!(config.output_dir.exists());
    }
}
