
from pathlib import Path
from PIL import Image
import matplotlib.pyplot as plt

image_dir = Path("data/real/kitti/images/train")

extensions = {".jpg", ".jpeg", ".png", ".bmp"}

image_paths = sorted(
    p for p in image_dir.rglob("*")
    if p.is_file() and p.suffix.lower() in extensions
)

print("Dataset folder:", image_dir.resolve())
print("Total training images:", len(image_paths))

if not image_paths:
    print("No images found. Check the folder path.")
else:
    sample_path = image_paths[0]

    with Image.open(sample_path) as image:
        print("Sample:", sample_path.name)
        print("Dimensions:", image.size)
        print("Format:", image.format)

        plt.figure(figsize=(12, 6))
        plt.imshow(image.convert("RGB"))
        plt.title(f"KITTI training image: {sample_path.name}")
        plt.axis("off")
        plt.show()
