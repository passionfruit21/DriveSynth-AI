
from pathlib import Path
import random
import shutil

PROJECT_ROOT = Path(__file__).resolve().parent.parent

SOURCE_DIR = PROJECT_ROOT / "data" / "real" / "kitti" / "images" / "train"
OUTPUT_DIR = PROJECT_ROOT / "data" / "training_subset"

NUM_IMAGES = 500
SEED = 42
EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}

def main():
    if not SOURCE_DIR.exists():
        raise FileNotFoundError(f"KITTI folder not found: {SOURCE_DIR}")

    images = sorted(
        p for p in SOURCE_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSIONS
    )

    if len(images) < 2:
        raise RuntimeError(f"Not enough images found: {len(images)}")

    random.seed(SEED)
    selected = random.sample(images, min(NUM_IMAGES, len(images)))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for index, source in enumerate(selected, start=1):
        destination = OUTPUT_DIR / f"kitti_{index:04d}{source.suffix.lower()}"
        shutil.copy2(source, destination)

    print(f"Images found: {len(images)}")
    print(f"Images copied: {len(selected)}")
    print(f"Output folder: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
