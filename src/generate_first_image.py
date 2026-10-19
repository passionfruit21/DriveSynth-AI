
from pathlib import Path

import torch
from diffusers import StableDiffusionPipeline

# 1. Pre-trained model
MODEL_ID = "stable-diffusion-2-1-base"

# 2. Choose the available device
device = "cuda" if torch.cuda.is_available() else "cpu"

print("Device:", device)

if device == "cpu":
    print("Warning: Image generation on CPU can be very slow.")

# 3. Choose the data type
dtype = torch.float16 if device == "cuda" else torch.float32

# 4. Load the model from Hugging Face
print("Loading the pre-trained diffusion model...")

pipe = StableDiffusionPipeline.from_pretrained(
    f"stabilityai/{MODEL_ID}",
    torch_dtype=dtype
)

pipe = pipe.to(device)

# Save memory where possible
pipe.enable_attention_slicing()

# 5. Describe the image we want
prompt = (
    "A realistic autonomous driving scene on a city road "
    "during daytime, cars, traffic lights, road markings, "
    "dashcam perspective, photorealistic, detailed road scene"
)

# 6. Generate one reproducible image
generator = torch.Generator(device=device).manual_seed(42)

print("Generating image...")

result = pipe(
    prompt=prompt,
    num_inference_steps=25,
    guidance_scale=7.0,
    width=512,
    height=512,
    generator=generator
)

image = result.images[0]

# 7. Save the image
output_dir = Path("generated_images")
output_dir.mkdir(parents=True, exist_ok=True)

output_path = output_dir / "first_driving_scene.png"
image.save(output_path)

print("Image generated successfully!")
print("Saved at:", output_path.resolve())

from pathlib import Path

import torch
from diffusers import StableDiffusionPipeline

# 1. Pre-trained model
MODEL_ID = "stable-diffusion-2-1-base"

# 2. Choose the available device
device = "cuda" if torch.cuda.is_available() else "cpu"

print("Device:", device)

if device == "cpu":
    print("Warning: Image generation on CPU can be very slow.")

# 3. Choose the data type
dtype = torch.float16 if device == "cuda" else torch.float32

# 4. Load the model from Hugging Face
print("Loading the pre-trained diffusion model...")

pipe = StableDiffusionPipeline.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float32,
    use_safetensors=True,
    local_files_only=False
)

pipe = pipe.to(device)

# Save memory where possible
pipe.enable_attention_slicing()

# 5. Describe the image we want
prompt = (
    "A realistic autonomous driving scene on a city road "
    "during daytime, cars, traffic lights, road markings, "
    "dashcam perspective, photorealistic, detailed road scene"
)

# 6. Generate one reproducible image
generator = torch.Generator(device=device).manual_seed(42)

print("Generating image...")

result = pipe(
    prompt=prompt,
    num_inference_steps=25,
    guidance_scale=7.0,
    width=512,
    height=512,
    generator=generator
)

image = result.images[0]

# 7. Save the image
output_dir = Path("generated_images")
output_dir.mkdir(parents=True, exist_ok=True)

output_path = output_dir / "first_driving_scene.png"
image.save(output_path)

print("Image generated successfully!")
print("Saved at:", output_path.resolve())
