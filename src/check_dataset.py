
from pathlib import Path

#KITTI dataset inside project folder
DATASET_PATH = Path("data/real/kitti")

# Supported image formats
extensions = {".jpg", ".jpeg", ".png", ".bmp"}

if not DATASET_PATH.exists():
    print("Dataset folder nahi mila!")
    print("Expected path:", DATASET_PATH.resolve())
else:
    images = [
        p for p in DATASET_PATH.rglob("*")
        if p.is_file() and p.suffix.lower() in extensions
    ]

    print("Dataset folder:", DATASET_PATH.resolve())
    print("Total images found:", len(images))

    if images:
        print("\nFirst 5 images:")
        for image in images[:5]:
            print(image)
    else:
        print("Couldn't find images,check folder structure.")
