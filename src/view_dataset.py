
from pathlib import Path
from PIL import Image
import matplotlib.pyplot as plt

dataset_path = Path("data/real/kitti")

image_extensions = {".jpg", ".jpeg", ".png", ".bmp"}

images = sorted(
    p for p in dataset_path.rglob("*")
    if p.is_file() and p.suffix.lower() in image_extensions
)

if not images:
    print("No images found. Check your KITTI folder path.")
else:
    image_path = images[0]

    with Image.open(image_path) as img:
        image = img.convert("RGB")

    print("Image:", image_path)
    print("Image dimensions:", image.size)

    plt.figure(figsize=(10, 6))
    plt.imshow(image)
    plt.title("Real KITTI Driving Image")
    plt.axis("off")
    plt.tight_layout()
    plt.show()
