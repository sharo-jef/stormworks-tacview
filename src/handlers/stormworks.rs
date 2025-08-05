use std::sync::Arc;
use tokio::sync::Mutex;

use crate::domain::AcmiRepository;
use crate::infra::FileAcmiRepository;

/// Shared state for ACMI repositories
pub type AcmiRepositories = Arc<Mutex<Vec<Arc<dyn AcmiRepository>>>>;

/// Shared state for file-based ACMI repositories
pub type FileAcmiRepositories = Arc<Mutex<Vec<Arc<FileAcmiRepository>>>>;

/// Application state containing both repository types
pub struct AppState {
    pub acmi_repositories: AcmiRepositories,
    pub file_repositories: FileAcmiRepositories,
    pub verbose: bool,
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

impl AppState {
    pub fn new() -> Self {
        Self {
            acmi_repositories: Arc::new(Mutex::new(Vec::new())),
            file_repositories: Arc::new(Mutex::new(Vec::new())),
            verbose: false,
        }
    }

    pub fn new_with_verbose(verbose: bool) -> Self {
        Self {
            acmi_repositories: Arc::new(Mutex::new(Vec::new())),
            file_repositories: Arc::new(Mutex::new(Vec::new())),
            verbose,
        }
    }
}
