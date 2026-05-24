import subprocess

cmd = ["git", "diff", "origin/main:demo.html", "cf4be7f:demo.html"]
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')

lines = res.stdout.splitlines()
plus_lines = [l for l in lines if l.startswith('+') and not l.startswith('+++')]
minus_lines = [l for l in lines if l.startswith('-') and not l.startswith('---')]

print(f"Total lines added in local: {len(plus_lines)}")
print(f"Total lines removed in local: {len(minus_lines)}")

# Print the first 50 lines of added and removed lines to get a sense
print("\n--- FIRST 20 REMOVED FROM LOCAL (exist in remote origin/main but not local) ---")
for l in minus_lines[:20]:
    print(l)

print("\n--- FIRST 20 ADDED IN LOCAL (exist in local but not remote origin/main) ---")
for l in plus_lines[:20]:
    print(l)
