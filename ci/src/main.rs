use clap::Parser;
use std::process::Command;

#[derive(Parser)]
#[command(name = "ci")]
#[command(about = "A CI tool for running various cargo tasks")]
struct Args {
    #[arg(long, help = "Open documentation in browser after building")]
    open: bool,
}

fn main() {
    let args = Args::parse();

    let mut tasks = vec![
        ("fmt", vec!["cargo", "fmt"]),
        ("check", vec!["cargo", "check"]),
        ("test", vec!["cargo", "test"]),
        ("clippy", vec!["cargo", "clippy"]),
        ("build", vec!["cargo", "build", "--release"]),
        (
            "install cargo-audit",
            vec!["cargo", "install", "cargo-audit", "--root", "target/tools"],
        ),
        ("audit", vec!["./target/tools/bin/cargo-audit", "audit"]),
    ];

    // Add doc task with --open flag if requested
    if args.open {
        tasks.push(("doc", vec!["cargo", "doc", "--open"]));
    } else {
        tasks.push(("doc", vec!["cargo", "doc"]));
    }

    for (name, command) in tasks {
        println!("> {}", command.join(" "));
        let status = Command::new(command[0])
            .args(&command[1..])
            .status()
            .expect("Failed to execute command");
        if !status.success() {
            panic!("Task {name} failed with status: {status}");
        }
    }
}
