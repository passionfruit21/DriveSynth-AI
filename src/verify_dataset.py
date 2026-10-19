
from pathlib import Path
from PIL import Image
import csv

PROJECT_ROOT = Path(__file__).resolve().parent.parent

REAL_DIR = PROJECT_ROOT / "data" / "real" / "kitti" / "images" / "train"
SYNTHETIC_DIR = PROJECT_ROOT / "data" / "synthetic"

print("=" * 45)
print("SYNTHETIC DRIVING DATASET VERIFICATION")
print("=" * 45)

# Check real KITTI images
real_images = list(REAL_DIR.glob("*.png"))
real_images += list(REAL_DIR.glob("*.jpg"))
real_images += list(REAL_DIR.glob("*.jpeg"))

print(f"\nReal KITTI images: {len(real_images)}")

# Check synthetic images
total_synthetic = 0

for condition in ["daytime", "night", "rain", "fog"]:
    folder = SYNTHETIC_DIR / condition

    images = []
    if folder.exists():
        for pattern in ("*.png", "*.jpg", "*.jpeg"):
            images.extend(folder.glob(pattern))

    total_synthetic += len(images)
    print(f"Synthetic {condition}: {len(images)} images")

print(f"\nTotal synthetic images: {total_synthetic}")

# Check metadata
metadata_path = SYNTHETIC_DIR / "metadata.csv"

if metadata_path.exists():
    with open(metadata_path, newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    print(f"Metadata records: {len(rows)}")
else:
    print("Metadata CSV not found at:", metadata_path)

# Test whether one synthetic image can be opened
sample_images = list(SYNTHETIC_DIR.glob("*/*.png"))

if sample_images:
    try:
        with Image.open(sample_images[0]) as image:
            image.verify()
        print("Sample synthetic image: OK")
        print("Sample path:", sample_images[0].relative_to(PROJECT_ROOT))
    except Exception as error:
        print("Sample image verification failed:", error)
else:
    print("No synthetic PNG images found in condition folders.")

print("\nVerification complete.")
