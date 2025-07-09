use anyhow::Result;
use clap::Parser;
use std::sync::Arc;
use stormworks_tacview::{AppConfig, AppState, FileAcmiRepository, HttpServer, TcpServer};
use stormworks_tacview::domain::AcmiRepository;
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// Stormworks-Tacview Bridge
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Enable verbose debug logging
    #[arg(short, long)]
    verbose: bool,
    
    /// HTTP server port (default: 3000)
    #[arg(long, default_value_t = 3000)]
    http_port: u16,
    
    /// TCP server port (default: 42674)
    #[arg(long, default_value_t = 42674)]
    tcp_port: u16,
}

/// Application configuration
#[derive(Debug)]
struct Config {
    http_port: u16,
    tcp_port: u16,
    verbose: bool,
}

impl From<Args> for Config {
    fn from(args: Args) -> Self {
        Self {
            http_port: args.http_port,
            tcp_port: args.tcp_port,
            verbose: args.verbose,
        }
    }
}

/// Initialize logging
fn init_logging(verbose: bool) {
    let filter = if verbose {
        "stormworks_tacview=debug"
    } else {
        "stormworks_tacview=info"
    };
    
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| filter.into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}

/// Initialize application state with default repositories
async fn init_app_state(verbose: bool) -> Arc<AppState> {
    // Load configuration
    let config = AppConfig::load();
    
    // Ensure output directory exists
    if let Err(e) = config.ensure_output_dir() {
        warn!("Failed to ensure output directory: {}", e);
    }
    
    let state = Arc::new(AppState::new_with_verbose(verbose));
    
    // Add file-based ACMI repository with configuration
    let file_repo = Arc::new(FileAcmiRepository::new_with_config(config));
    {
        let mut file_repos = state.file_repositories.lock().await;
        file_repos.push(file_repo.clone());
    }
    
    {
        let mut acmi_repos = state.acmi_repositories.lock().await;
        acmi_repos.push(file_repo as Arc<dyn AcmiRepository>);
    }
    
    state
}

/// Main application entry point
#[tokio::main]
async fn main() -> Result<()> {
    // Parse command line arguments
    let args = Args::parse();
    let config = Config::from(args);
    
    // Initialize logging
    init_logging(config.verbose);
    
    info!("Starting Stormworks-Tacview Bridge v{}", env!("CARGO_PKG_VERSION"));
    if config.verbose {
        info!("Verbose logging enabled");
    }
    
    // Initialize application state
    let state = init_app_state(config.verbose).await;
    
    // Create servers
    let http_server = HttpServer::new(state.clone());
    let tcp_server = TcpServer::new(state.clone());
    
    // Start servers concurrently
    let http_handle = {
        let http_server = http_server;
        tokio::spawn(async move {
            if let Err(e) = http_server.start(config.http_port).await {
                error!("HTTP server failed: {}", e);
            }
        })
    };
    
    let tcp_handle = {
        let tcp_server = tcp_server;
        tokio::spawn(async move {
            if let Err(e) = tcp_server.start(config.tcp_port).await {
                error!("TCP server failed: {}", e);
            }
        })
    };
    
    // Handle graceful shutdown
    let shutdown_signal = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install CTRL+C signal handler");
    };
    
    tokio::select! {
        _ = shutdown_signal => {
            info!("Received shutdown signal, stopping servers...");
        }
        _ = http_handle => {
            error!("HTTP server terminated unexpectedly");
        }
        _ = tcp_handle => {
            error!("TCP server terminated unexpectedly");
        }
    }
    
    info!("Stormworks-Tacview Bridge stopped");
    Ok(())
}
