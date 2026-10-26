# DriveSynth AI 🚗

**AI-powered synthetic driving scene generation and evaluation.**

DriveSynth AI is a project for generating synthetic driving-scene images and exploring them through a dashboard. It combines a React/Vite frontend, a Python FastAPI backend, and a Stable Diffusion model running in Google Colab.

## ✨ Features

- **Overview Dashboard** — View synthetic dataset information and compare generated images.
- **Synthetic Dataset** — Browse generated driving-scene images.
- **Real Dataset** — Explore real-world driving images.
- **Generation Lab** — Submit prompts and conditions to generate synthetic driving scenes.
- **Evaluation Dashboard** — View available FID summaries and condition-wise evaluation results.
- **Colab Model Integration** — Run the image-generation model in a Google Colab runtime.
- **API Integration** — Connect the local backend to the Colab API through an ngrok HTTPS tunnel.

## 🧰 Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Python, FastAPI, Uvicorn |
| Image Generation | Stable Diffusion with LoRA |
| Model Runtime | Google Colab |
| API Tunnel | ngrok |
| Dataset and Metrics | Driving-scene images and available FID results |

## 📁 Project Structure

```text
DriveSynth-AI/
├── frontend/
│   ├── public/
│   │   └── fid_results.json
│   └── src/
│       ├── App.jsx
│       └── App.css
├── backend/
│   ├── app.py
│   └── generated_images/
├── Project.ipynb
└── README.md
```

*The structure above highlights the main project files; additional configuration and dependency files may also be present.*

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/passionfruit21/DriveSynth-AI.git
cd DriveSynth-AI
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

### 3. Prepare the Google Colab model

1. Open `Project.ipynb` in Google Colab.
2. Select a GPU runtime if available.
3. Run the required setup and model-loading cells.
4. Confirm that the Stable Diffusion model and LoRA checkpoint load successfully.
5. Start the FastAPI server in Colab.
6. Configure ngrok and create a public HTTPS URL for port `8000`.

Keep the Colab runtime running while using the live generation integration. The public ngrok URL may change when a new tunnel is created.

### 4. Configure the backend

Create a `backend/.env` file with the current Colab URL and the matching API token:

```env
COLAB_API_URL=https://your-current-ngrok-url.ngrok-free.app
DRIVESYNTH_API_TOKEN=your_api_token
```

Replace the example values with your actual values. Never commit `.env` or publish API tokens.

The backend loads this file only for local development. Environment variables already provided by the process take precedence.

### 5. Deploy the backend to Render

Create a Blueprint in the Render Dashboard from this repository and select the root-level `render.yaml`. It creates the `drivesynth-api` web service and builds the Dockerfile in `backend/`. Render provides the `PORT` variable automatically. The Blueprint prompts for these values during initial setup:

```env
COLAB_API_URL=https://your-current-ngrok-url.ngrok-free.app
DRIVESYNTH_API_TOKEN=your_current_colab_token
FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
```

Enter the DriveSynth token in Render's setup prompt or add it later in the service's Environment settings. Do not put it in the Dockerfile, build arguments, or repository. When Colab creates a new token or ngrok URL, update the corresponding Render variables and restart the service.

In Vercel, set `VITE_API_BASE_URL` to the public Render service URL (for example, `https://drivesynth-api.onrender.com`) and redeploy the frontend. This Vite variable is public configuration and must contain only the backend URL, never a secret.

The Docker build context excludes `.env` files and generated outputs. The runtime image receives credentials only from Render's runtime environment. The service automatically deploys after commits to its linked branch.

### 6. Start the backend locally

Open another terminal from the repository root:

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

If the project has a backend requirements file, use that file to install its dependencies instead.

Restart the backend whenever you change `.env` so the updated configuration is loaded.

## 🔄 Image Generation Workflow

1. Enter a scene prompt in the Generation Lab.
2. Choose the available generation condition and image count.
3. The frontend sends the request to the local FastAPI backend.
4. The backend forwards the request to the Colab API using the configured URL and API token.
5. The Stable Diffusion pipeline generates the requested image.
6. The generated output is returned and made available to the dashboard.

Live generation requires the Colab model, API server, ngrok tunnel, and local backend to be running and configured correctly.

## 📊 Evaluation

The dashboard includes available FID summaries and condition-wise evaluation results.

Fréchet Inception Distance (FID) is commonly used to compare the distributions of generated and real images. Lower FID generally indicates greater similarity between the compared image distributions, but it does not by itself establish driving-scene realism or safety.

Evaluation values depend on the data and results supplied to the project.

## 🔐 Security Notes

- Do not commit `.env` files, API tokens, or ngrok credentials.
- Store credentials securely and rotate any token that has been exposed.
- Treat a public ngrok URL as a public entry point to your API.
- Use authentication and appropriate access controls when exposing the API.
- Generated images committed to the repository may be publicly accessible if the repository is public.

## ⚠️ Current Limitations

- The Colab runtime must remain active for the hosted generation API to be available.
- A new ngrok tunnel may require updating `COLAB_API_URL`.
- The configured LoRA checkpoint must exist at the expected path and contain compatible weights.
- Generation speed and reliability depend on the available Colab hardware and runtime limits.

## 🎯 Project Goal

DriveSynth AI aims to make synthetic driving-scene generation easier to explore, visualize, and evaluate through an integrated web dashboard and model-serving workflow.

## 👩‍💻 Repository

[passionfruit21/DriveSynth-AI](https://github.com/passionfruit21/DriveSynth-AI)
