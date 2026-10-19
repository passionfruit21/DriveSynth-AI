
from pathlib import Path
from PIL import Image

image_path = Path("generated_images/first_driving_scene.png")

if not image_path.exists():
    print("Image not found:", image_path.resolve())
    print("Make sure the PNG is inside your project folder.")
else:
    with Image.open(image_path) as image:
        print("Image verified successfully!")
        print("File:", image_path.resolve())
        print("Dimensions:", image.size)
        print("Format:", image.format)
        print("Mode:", image.mode)
        image.show()
