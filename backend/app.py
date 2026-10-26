
import os
import secrets
from pathlib import Path
from typing import Literal

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env", override=False)

app = FastAPI(title="DriveSynth AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
        "https://drive-synth-ai.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^https://drive-synth-[a-z0-9-]+-passionfruit2\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COLAB_API_URL = os.getenv("COLAB_API_URL", "").rstrip("/")
DRIVESYNTH_API_TOKEN = os.getenv("DRIVESYNTH_API_TOKEN", "")

print("Colab URL loaded:", bool(COLAB_API_URL))
print("DriveSynth token loaded:", bool(DRIVESYNTH_API_TOKEN))

OUTPUT_DIR = BASE_DIR / "generated_images"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/generated",
    StaticFiles(directory=str(OUTPUT_DIR)),
    name="generated",
)


class GenerationRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=500)
    condition: Literal["daytime", "night", "rain", "fog"]
    count: Literal[1, 4, 8]


@app.get("/")
def home():
    return {"message": "DriveSynth AI API is running"}


@app.post("/generate")
def prepare_generation(request: GenerationRequest):
    if not COLAB_API_URL or not DRIVESYNTH_API_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Colab API configuration is missing. Set COLAB_API_URL and DRIVESYNTH_API_TOKEN.",
        )

    headers = {"X-API-Token": DRIVESYNTH_API_TOKEN}
    saved_images = []

    # The Colab endpoint accepts at most 4 images per request.
    remaining = request.count

    try:
        while remaining > 0:
            batch_count = min(remaining, 4)

            response = requests.post(
                f"{COLAB_API_URL}/generate",
                headers=headers,
                json={
                    "prompt": request.prompt,
                    "condition": request.condition,
                    "count": batch_count,
                },
                timeout=600,
            )
            response.raise_for_status()
            result = response.json()

            if result.get("status") != "success":
                raise HTTPException(
                    status_code=502,
                    detail="Colab did not confirm successful generation.",
                )

            for image_path in result.get("images", []):
                # Only accept paths returned by the expected image endpoint.
                if not isinstance(image_path, str) or not image_path.startswith("/images/"):
                    raise HTTPException(
                        status_code=502,
                        detail="Colab returned an unexpected image path.",
                    )

                image_response = requests.get(
                    f"{COLAB_API_URL}{image_path}",
                    headers=headers,
                    timeout=60,
                )
                image_response.raise_for_status()

                if "image/png" not in image_response.headers.get("content-type", ""):
                    raise HTTPException(
                        status_code=502,
                        detail="Colab returned a non-PNG image.",
                    )

                filename = f"{secrets.token_hex(12)}.png"
                destination = OUTPUT_DIR / filename
                destination.write_bytes(image_response.content)
                saved_images.append(f"/generated/{filename}")

            remaining -= batch_count

    except HTTPException:
        raise
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "Could not reach the Colab model. Check that Colab is running "
                "and the tunnel URL is current."
            ),
        ) from exc

    if len(saved_images) != request.count:
        raise HTTPException(
            status_code=502,
            detail="The model returned fewer images than requested.",
        )

    return {
        "message": "Images generated successfully",
        "prompt": request.prompt,
        "condition": request.condition,
        "count": len(saved_images),
        "status": "success",
        "images": saved_images,
    }
