use std::sync::Arc;
use stormworks_tacview::domain::{AcmiFileRepository, AcmiRepository};
use stormworks_tacview::infra::FileAcmiRepository;

#[tokio::test]
async fn test_file_repository_write() {
    let repo = Arc::new(FileAcmiRepository::new());

    // Start recording
    repo.start().expect("Failed to start recording");
    assert!(repo.is_recording());

    // Write some data
    repo.write("test acmi data\n")
        .await
        .expect("Failed to write data");

    // Stop recording
    repo.stop().await.expect("Failed to stop recording");
    assert!(!repo.is_recording());
}

#[tokio::test]
async fn test_file_repository_multiple_start_stop() {
    let repo = Arc::new(FileAcmiRepository::new());

    // Start recording
    repo.start().expect("Failed to start recording");
    assert!(repo.is_recording());

    // Start again (should stop previous recording)
    repo.start().expect("Failed to start recording again");
    assert!(repo.is_recording());

    // Stop recording
    repo.stop().await.expect("Failed to stop recording");
    assert!(!repo.is_recording());

    // Stop again (should not fail)
    repo.stop().await.expect("Failed to stop recording again");
    assert!(!repo.is_recording());
}

#[tokio::test]
async fn test_repository_step() {
    let repo = Arc::new(FileAcmiRepository::new());

    // Step should not panic
    repo.step();
}
