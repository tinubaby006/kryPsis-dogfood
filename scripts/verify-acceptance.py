import sys
import subprocess
import os
import argparse
import re

EXPECTED_CHECKS = [
    "gallery is public",
    "project from fixtures shown",
    "closed event refuses submissions",
    "judge sees own scores",
    "judge cannot see peer scores",
    "participant blocked",
    "csv export works"
]

def main():
    parser = argparse.ArgumentParser(description="Run official acceptance tests and verify output.")
    parser.add_argument("config", help="Path to .dogfood.toml config file")
    parser.add_argument("--output", required=True, help="Path to save the acceptance report")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.config):
        print(f"Error: Config file {args.config} not found.", file=sys.stderr)
        sys.exit(1)
        
    print(f"Running official runner with config: {args.config}")
    
    runner_path = os.path.join("docs", "official", "run.py")
    if not os.path.exists(runner_path):
        print(f"Error: Official runner not found at {runner_path}", file=sys.stderr)
        sys.exit(1)
        
    env = os.environ.copy()
    
    # Run the official runner
    result = subprocess.run(
        [sys.executable, runner_path, args.config],
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8"
    )
    
    stdout = result.stdout
    stderr = result.stderr
    
    # Save the exact stdout
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(stdout)
        
    # Print output to preserve it
    print(stdout, end="")
    if stderr:
        print(stderr, file=sys.stderr, end="")
        
    if result.returncode != 0:
        print("\nError: Official runner exited with non-zero status.", file=sys.stderr)
        sys.exit(result.returncode)
        
    # Check for FAIL lines
    if "FAIL" in stdout:
        print("\nError: A FAIL line was found in the output.", file=sys.stderr)
        sys.exit(1)
        
    # Check that the 7 expected labels exist exactly once
    for check in EXPECTED_CHECKS:
        count = stdout.count(check)
        if count == 0:
            print(f"\nError: Expected check '{check}' is missing from output.", file=sys.stderr)
            sys.exit(1)
        if count > 1:
            print(f"\nError: Expected check '{check}' is duplicated in output.", file=sys.stderr)
            sys.exit(1)
            
    # Check claimed vs verified tiers
    # "claimed T1 T2, verified T1 T2"
    match = re.search(r"claimed (.*?), verified (.*)", stdout)
    if not match:
        print("\nError: Could not find 'claimed X, verified Y' line.", file=sys.stderr)
        sys.exit(1)
        
    claimed = match.group(1).strip()
    verified = match.group(2).strip()
    
    if claimed != verified:
        print(f"\nError: Claimed tiers ({claimed}) do not match verified tiers ({verified}).", file=sys.stderr)
        sys.exit(1)
        
    print("\nAll wrapped verification checks passed successfully.")
    sys.exit(0)

if __name__ == "__main__":
    main()
