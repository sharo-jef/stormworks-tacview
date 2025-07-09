use anyhow::Result;
use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Method, Request, Response, Server, StatusCode};
use std::convert::Infallible;
use std::sync::Arc;
use tracing::{error, info};

use crate::handlers::AppState;

/// HTTP server for Stormworks integration
/// 
/// This server handles HTTP requests from Stormworks via the WebMap addon,
/// providing endpoints for ACMI data, start, and stop commands.
pub struct HttpServer {
    state: Arc<AppState>,
}

impl HttpServer {
    /// Create a new HTTP server
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    /// Start the HTTP server
    pub async fn start(&self, port: u16) -> Result<()> {
        let state = self.state.clone();
        
        let make_svc = make_service_fn(move |_conn| {
            let state = state.clone();
            async move {
                Ok::<_, Infallible>(service_fn(move |req| {
                    handle_request(req, state.clone())
                }))
            }
        });

        let addr = ([0, 0, 0, 0], port).into();
        let server = Server::bind(&addr).serve(make_svc);
        
        info!("HTTP server listening on port {}", port);
        
        server.await?;
        Ok(())
    }
}

async fn handle_request(req: Request<Body>, state: Arc<AppState>) -> Result<Response<Body>, Infallible> {
    let response = match (req.method(), req.uri().path()) {
        (&Method::GET, path) if path.starts_with("/api/stormworks/start") => {
            handle_start_command(state).await
        }
        (&Method::GET, path) if path.starts_with("/api/stormworks/stop") => {
            handle_stop_command(state).await
        }
        (&Method::GET, path) if path.starts_with("/api/stormworks/acmi/") => {
            let data = path.trim_start_matches("/api/stormworks/acmi/");
            handle_acmi_data(data.to_string(), state).await
        }
        _ => {
            Ok(Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::from("Not Found"))
                .unwrap())
        }
    };
    
    Ok(response.unwrap_or_else(|_| {
        Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(Body::from("Internal Server Error"))
            .unwrap()
    }))
}

async fn handle_acmi_data(data: String, state: Arc<AppState>) -> Result<Response<Body>, anyhow::Error> {
    // Decode base64 data
    let acmi_data = match base64::decode(&data) {
        Ok(decoded) => String::from_utf8_lossy(&decoded).into_owned(),
        Err(e) => {
            error!("Failed to decode base64 ACMI data: {}", e);
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("Bad Request"))
                .unwrap());
        }
    };

    // Add newline to match original behavior
    let acmi_data = format!("{}\n", acmi_data);

    // Write to all repositories
    let repos = state.acmi_repositories.lock().await;
    for repo in repos.iter() {
        if let Err(e) = repo.write(&acmi_data).await {
            error!("Failed to write ACMI data to repository: {}", e);
        }
    }

    Ok(Response::builder()
        .status(StatusCode::OK)
        .body(Body::from("OK"))
        .unwrap())
}

async fn handle_start_command(state: Arc<AppState>) -> Result<Response<Body>, anyhow::Error> {
    let repos = state.file_repositories.lock().await;
    
    for repo in repos.iter() {
        if let Err(e) = repo.start() {
            error!("Failed to start ACMI recording: {}", e);
            return Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from("Internal Server Error"))
                .unwrap());
        }
    }

    info!("Started ACMI recording");
    Ok(Response::builder()
        .status(StatusCode::OK)
        .body(Body::from("OK"))
        .unwrap())
}

async fn handle_stop_command(state: Arc<AppState>) -> Result<Response<Body>, anyhow::Error> {
    let repos = state.file_repositories.lock().await;
    
    for repo in repos.iter() {
        if let Err(e) = repo.stop().await {
            error!("Failed to stop ACMI recording: {}", e);
            return Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from("Internal Server Error"))
                .unwrap());
        }
    }

    info!("Stopped ACMI recording");
    Ok(Response::builder()
        .status(StatusCode::OK)
        .body(Body::from("OK"))
        .unwrap())
}
