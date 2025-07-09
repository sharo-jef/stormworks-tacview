//! Stormworks-Tacview Bridge
//! 
//! A bridge software that connects Stormworks with Tacview, enabling
//! real-time telemetry streaming and ACMI file export.

pub mod domain;
pub mod handlers;
pub mod infra;
pub mod server;

pub use domain::{AcmiRepository, AcmiFileRepository, RealTimeTelemetryRepository};
pub use handlers::AppState;
pub use infra::{FileAcmiRepository, TcpRealTimeTelemetryRepository};
pub use server::{HttpServer, TcpServer};
