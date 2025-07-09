//! Domain layer for ACMI repositories
//! 
//! This module contains the core traits and types that define the behavior
//! of ACMI data repositories in the Stormworks-Tacview bridge.

pub mod acmi;
pub mod acmi_file;
pub mod real_time_telemetry;

pub use acmi::AcmiRepository;
pub use acmi_file::AcmiFileRepository;
pub use real_time_telemetry::RealTimeTelemetryRepository;
