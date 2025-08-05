use anyhow::Result;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tracing::{error, info};

use crate::domain::AcmiFileRepository;
use crate::handlers::AppState;

/// Simple HTTP server for Stormworks integration
pub struct HttpServer {
    state: Arc<AppState>,
}

impl HttpServer {
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    pub async fn start(&self, port: u16) -> Result<()> {
        let listener = TcpListener::bind(format!("127.0.0.1:{port}")).await?;
        info!("HTTP server listening on port {}", port);

        loop {
            let (mut socket, addr) = listener.accept().await?;
            let state_clone = self.state.clone();
            if state_clone.verbose {
                info!("New HTTP connection from: {}", addr);
            }

            tokio::spawn(async move {
                let mut buffer = [0; 16384]; // Increased buffer size for large ACMI data (16KB)

                match socket.read(&mut buffer).await {
                    Ok(0) => {
                        if state_clone.verbose {
                            info!("HTTP connection closed by client: {}", addr);
                        }
                    }
                    Ok(n) => {
                        let request = String::from_utf8_lossy(&buffer[..n]);
                        if state_clone.verbose {
                            info!(
                                "HTTP request from {}: {}",
                                addr,
                                request.lines().next().unwrap_or("(empty)")
                            );
                        }

                        let response = if request.contains("GET /start") {
                            info!("Processing /start command");
                            handle_start(&state_clone).await
                        } else if request.contains("GET /stop") {
                            info!("Processing /stop command");
                            handle_stop(&state_clone).await
                        } else if request.contains("GET /acmi/") {
                            if let Some(data) = extract_acmi_data(&request) {
                                if state_clone.verbose {
                                    info!("Extracted ACMI data length: {}", data.len());
                                }
                                handle_acmi(&state_clone, &data).await
                            } else {
                                error!("Invalid ACMI data in request");
                                error!(
                                    "Request first line: {}",
                                    request.lines().next().unwrap_or("(empty)")
                                );
                                "HTTP/1.1 400 Bad Request\r\n\r\nBad Request".to_string()
                            }
                        } else {
                            // Unknown request は発生する前提なのでログ不要
                            "HTTP/1.1 404 Not Found\r\n\r\nNot Found".to_string()
                        };

                        let _ = socket.write_all(response.as_bytes()).await;
                    }
                    Err(e) => {
                        error!("Failed to read from socket {}: {}", addr, e);
                    }
                }
            });
        }
    }
}

async fn handle_start(state: &AppState) -> String {
    let repos = state.file_repositories.lock().await;

    for repo in repos.iter() {
        if let Err(e) = repo.start() {
            error!("Failed to start ACMI recording: {}", e);
            return "HTTP/1.1 500 Internal Server Error\r\n\r\nInternal Server Error".to_string();
        }
    }

    info!("Started ACMI recording");
    "HTTP/1.1 200 OK\r\n\r\nOK".to_string()
}

async fn handle_stop(state: &AppState) -> String {
    let repos = state.file_repositories.lock().await;

    for repo in repos.iter() {
        if let Err(e) = repo.stop().await {
            error!("Failed to stop ACMI recording: {}", e);
            return "HTTP/1.1 500 Internal Server Error\r\n\r\nInternal Server Error".to_string();
        }
    }

    info!("Stopped ACMI recording");
    "HTTP/1.1 200 OK\r\n\r\nOK".to_string()
}

async fn handle_acmi(state: &AppState, data: &str) -> String {
    // Message counter for periodic logging
    static MESSAGE_COUNT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let count = MESSAGE_COUNT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    // Log every 100 messages to verify Stormworks is still sending (reduced frequency)
    if count % 100 == 0 && count > 0 {
        info!("Received message #{} from Stormworks", count);
    }

    // Simple base64 decode (simplified implementation)
    let decoded = match decode_base64_simple(data) {
        Ok(decoded) => decoded,
        Err(_) => {
            error!("Failed to decode base64 data (length: {})", data.len());
            return "HTTP/1.1 400 Bad Request\r\n\r\nBad Request".to_string();
        }
    };

    let acmi_data = format!("{decoded}\n");

    // Write to all repositories
    let repos = state.acmi_repositories.lock().await;

    // Log repository count only once
    static FIRST_CALL: std::sync::Once = std::sync::Once::new();
    FIRST_CALL.call_once(|| {
        info!(
            "Total repositories: {} (file + TCP connections)",
            repos.len()
        );
    });

    // Log every 100 repository writes (reduced frequency)
    if state.verbose && count % 100 == 0 && count > 0 {
        info!("Writing to {} repositories", repos.len());
    }

    for (i, repo) in repos.iter().enumerate() {
        match repo.write(&acmi_data).await {
            Ok(_) => {
                // Successfully wrote to repository
            }
            Err(e) => {
                error!("Failed to write ACMI data to repository {}: {}", i, e);
            }
        }
    }

    "HTTP/1.1 200 OK\r\n\r\nOK".to_string()
}

fn extract_acmi_data(request: &str) -> Option<String> {
    // Parse the first line to get the URL path
    let first_line = request.lines().next()?;
    let parts: Vec<&str> = first_line.split_whitespace().collect();

    if parts.len() < 2 {
        return None;
    }

    let url_path = parts[1]; // GET /acmi/... HTTP/1.1

    // Split the URL path and extract the data part
    let url_parts: Vec<&str> = url_path.split('/').collect();

    if url_parts.len() < 3 || url_parts[1] != "acmi" {
        return None;
    }

    // Join all parts after /acmi/ to get the full base64 data
    let data = url_parts[2..].join("/");

    if data.is_empty() {
        return None;
    }

    Some(data)
}

fn decode_base64_simple(input: &str) -> Result<String, ()> {
    // Simple base64 decoding implementation
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut result = Vec::new();
    let input = input.trim_end_matches('=');
    let input = input.as_bytes();

    for chunk in input.chunks(4) {
        let mut values = [0u8; 4];
        for (i, &byte) in chunk.iter().enumerate() {
            values[i] = match ALPHABET.iter().position(|&x| x == byte) {
                Some(pos) => pos as u8,
                Option::None => return Err(()),
            };
        }

        result.push((values[0] << 2) | (values[1] >> 4));
        if chunk.len() > 2 {
            result.push((values[1] << 4) | (values[2] >> 2));
        }
        if chunk.len() > 3 {
            result.push((values[2] << 6) | values[3]);
        }
    }

    String::from_utf8(result).map_err(|_| ())
}
