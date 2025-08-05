use anyhow::Result;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing::{error, info};

use crate::domain::{AcmiRepository, RealTimeTelemetryRepository};
use crate::handlers::AppState;
use crate::infra::TcpRealTimeTelemetryRepository;

/// TCP server for Tacview integration
///
/// This server handles TCP connections from Tacview clients,
/// performs the necessary handshake, and streams ACMI data in real-time.
pub struct TcpServer {
    state: Arc<AppState>,
}

impl TcpServer {
    /// Create a new TCP server
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    /// Start the TCP server
    pub async fn start(&self, port: u16) -> Result<()> {
        let listener = TcpListener::bind(format!("0.0.0.0:{port}")).await?;
        info!("TCP server listening on port {}", port);

        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    info!("New Tacview connection from: {}", addr);

                    let state = self.state.clone();
                    tokio::spawn(async move {
                        if let Err(e) = Self::handle_connection(stream, state).await {
                            error!("Error handling Tacview connection: {}", e);
                        }
                    });
                }
                Err(e) => {
                    error!("Failed to accept TCP connection: {}", e);
                }
            }
        }
    }

    /// Handle a single TCP connection
    async fn handle_connection(stream: tokio::net::TcpStream, state: Arc<AppState>) -> Result<()> {
        let repo = Arc::new(TcpRealTimeTelemetryRepository::new_with_verbose(
            stream,
            state.verbose,
        ));

        // Perform handshake
        if state.verbose {
            info!("Starting Tacview handshake...");
        }
        repo.handshake().await?;

        // Add to repositories list
        {
            let mut repos = state.acmi_repositories.lock().await;
            repos.push(repo.clone() as Arc<dyn AcmiRepository>);
            info!(
                "Added Tacview client to repositories (total: {})",
                repos.len()
            );
        }

        // Wait for connection to close
        while !repo.is_closed() {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }

        // Remove from repositories list
        {
            let mut repos = state.acmi_repositories.lock().await;
            let initial_count = repos.len();
            repos.retain(|r| {
                // Check if this is the same repository by comparing memory addresses
                !Arc::ptr_eq(r, &(repo.clone() as Arc<dyn AcmiRepository>))
            });
            info!(
                "Removed Tacview client from repositories ({} -> {})",
                initial_count,
                repos.len()
            );
        }

        info!("Tacview connection closed");
        Ok(())
    }
}
