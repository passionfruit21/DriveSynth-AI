
from pathlib import Path
import csv
import numpy as np
from PIL import Image, ImageFilter

# Project paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent

SYNTHETIC_DIR = PROJECT_ROOT / "frontend" / "public" / "synthetic"
REAL_DIR = PROJECT_ROOT / "frontend" / "public" / "real"

OUTPUT_DIR = PROJECT_ROOT / "backend" / "results"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_CSV = OUTPUT_DIR / "image_quality_metrics.csv"

FRONTEND_METRICS_CSV = (
    PROJECT_ROOT / "frontend" / "public" / "image_quality_metrics.csv"
)


def analyze_image(image_path, dataset, scenario):
    """Calculate basic visual statistics for one image."""

    try:
        with Image.open(image_path) as original:
            image = original.convert("RGB")
            gray = image.convert("L")

            # Brightness: mean grayscale pixel intensity (0-255)
            pixels = np.asarray(gray, dtype=np.float32)
            brightness = float(np.mean(pixels))

            # Contrast: standard deviation of grayscale intensity
            contrast = float(np.std(pixels))

            # Sharpness proxy: variance of a Laplacian-like filter response
            edges = np.asarray(
                gray.filter(ImageFilter.FIND_EDGES),
                dtype=np.float32,
            )
            sharpness = float(np.var(edges))

            return {
                "filename": image_path.name,
                "dataset": dataset,
                "scenario": scenario,
                "width": image.width,
                "height": image.height,
                "brightness": round(brightness, 3),
                "contrast": round(contrast, 3),
                "sharpness": round(sharpness, 3),
            }

    except Exception as error:
        print(f"Skipping {image_path}: {error}")
        return None


def main():
    results = []

    # Analyze synthetic images grouped by scenario folder.
    if SYNTHETIC_DIR.exists():
        for scenario_dir in sorted(SYNTHETIC_DIR.iterdir()):
            if not scenario_dir.is_dir():
                continue

            for image_path in sorted(scenario_dir.iterdir()):
                if image_path.suffix.lower() in {
                    ".png", ".jpg", ".jpeg", ".webp", ".bmp"
                }:
                    result = analyze_image(
                        image_path,
                        dataset="synthetic",
                        scenario=scenario_dir.name,
                    )
                    if result:
                        results.append(result)
    else:
        print(f"Synthetic image folder not found: {SYNTHETIC_DIR}")

    # Analyze the real KITTI images copied into the frontend.
    if REAL_DIR.exists():
        for image_path in sorted(REAL_DIR.iterdir()):
            if image_path.suffix.lower() in {
                ".png", ".jpg", ".jpeg", ".webp", ".bmp"
            }:
                result = analyze_image(
                    image_path,
                    dataset="real",
                    scenario="kitti",
                )
                if result:
                    results.append(result)
    else:
        print(f"Real image folder not found: {REAL_DIR}")

    if not results:
        print("No images were analyzed. Check the image folder paths.")
        return

    fieldnames = [
        "filename",
        "dataset",
        "scenario",
        "width",
        "height",
        "brightness",
        "contrast",
        "sharpness",
    ]

    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"\nAnalyzed {len(results)} images.")
    print(f"Results saved to: {OUTPUT_CSV}")
    
    FRONTEND_METRICS_CSV.parent.mkdir(parents=True, exist_ok=True)

    with FRONTEND_METRICS_CSV.open(
        "w", newline="", encoding="utf-8"
    ) as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"Dashboard CSV saved to: {FRONTEND_METRICS_CSV}")

    for dataset in ("real", "synthetic"):
        subset = [row for row in results if row["dataset"] == dataset]
        if not subset:
            continue

        print(f"\n{dataset.upper()} IMAGES ({len(subset)})")
        for metric in ("brightness", "contrast", "sharpness"):
            average = np.mean([row[metric] for row in subset])
            print(f"  Average {metric}: {average:.3f}")


if __name__ == "__main__":
    main()
