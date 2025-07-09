//! Server implementations for HTTP and TCP
//! 
//! This module contains server implementations for handling HTTP requests
//! from Stormworks and TCP connections from Tacview.

pub mod http_simple;
pub mod tcp;

pub use http_simple::HttpServer;
pub use tcp::TcpServer;
