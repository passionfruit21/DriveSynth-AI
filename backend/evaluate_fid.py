
from pathlib import Path
import json

import torch
from torchmetrics.image.fid import FrechetInceptionDistance
from torchvision.datasets import ImageFolder
from torch.utils.data import DataLoader
from torchvision import transforms


# Project paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent

REAL_DIR = PROJECT_ROOT / "data" / "real" / "kitti" / "images" / "train"
SYNTHETIC_DIR = PROJECT_ROOT / "frontend" / "public" / "synthetic"
OUTPUT_DIR = PROJECT_ROOT / "backend" / "results"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
IMAGE_SIZE = 299
BATCH_SIZE = 8


def get_image_paths(folder):
    extensions = {".jpg", ".jpeg", ".png", ".bmp"}
    return sorted(
        path for path in folder.rglob("*")
        if path.is_file() and path.suffix.lower() in extensions
    )


def load_images(paths, transform):
    from PIL import Image

    for path in paths:
        try:
            with Image.open(path) as image:
                yield transform(image.convert("RGB"))
        except Exception as exc:
            print(f"Skipping unreadable image {path.name}: {exc}")


def update_fid(metric, paths, transform, label):
    from torch.utils.data import DataLoader

    tensors = list(load_images(paths, transform))
    if not tensors:
        raise RuntimeError(f"No readable images found for {label}")

    loader = DataLoader(tensors, batch_size=BATCH_SIZE)

    for batch in loader:
        batch = (batch * 255).round().clamp(0, 255).to(torch.uint8)
        metric.update(batch, real=(label == "real"))

    print(f"Processed {len(tensors)} {label} images.")


def main():
    if not REAL_DIR.exists():
        raise FileNotFoundError(f"Real image folder not found: {REAL_DIR}")

    if not SYNTHETIC_DIR.exists():
        raise FileNotFoundError(
            f"Synthetic image folder not found: {SYNTHETIC_DIR}"
        )

    real_paths = get_image_paths(REAL_DIR)
    synthetic_paths = get_image_paths(SYNTHETIC_DIR)

    print(f"Device: {DEVICE}")
    print(f"Real images found: {len(real_paths)}")
    print(f"Synthetic images found: {len(synthetic_paths)}")

    if len(real_paths) < 2 or len(synthetic_paths) < 2:
        raise RuntimeError("FID needs at least two images in each group.")

    transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
    ])

    metric = FrechetInceptionDistance(
        feature=2048,
        normalize=False,
    ).to(DEVICE)

    # Use the same preprocessing and consistent uint8 input format.
    update_fid(metric, real_paths, transform, "real")
    update_fid(metric, synthetic_paths, transform, "synthetic")

    fid_value = float(metric.compute().cpu().item())

    results = {
        "metric": "FID",
        "fid": fid_value,
        "real_image_count": len(real_paths),
        "synthetic_image_count": len(synthetic_paths),
        "device": DEVICE,
        "image_size": IMAGE_SIZE,
    }

    output_path = OUTPUT_DIR / "fid_results.json"
    output_path.write_text(json.dumps(results, indent=2), encoding="utf-8")

    print("\nFID evaluation complete")
    print(f"FID score: {fid_value:.4f}")
    print(f"Results saved to: {output_path}")


if __name__ == "__main__":
    main()
