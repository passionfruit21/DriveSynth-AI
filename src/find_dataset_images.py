
from pathlib import Path

project_root = Path.cwd()
extensions = {".jpg", ".jpeg", ".png", ".bmp"}

print("Project root:", project_root)
print("\nSearching for images across the project...\n")

image_paths = [
    p for p in project_root.rglob("*")
    if p.is_file()
    and p.suffix.lower() in extensions
    and ".venv" not in p.parts
    and "node_modules" not in p.parts
]

print("Total images found:", len(image_paths))

for path in image_paths[:30]:
    print(path.relative_to(project_root))

if len(image_paths) > 30:
    print(f"... and {len(image_paths) - 30} more")
