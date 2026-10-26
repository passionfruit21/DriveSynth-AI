import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'


import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.PROD
  ? 'https://drivesynth-api.onrender.com'
  : 'http://127.0.0.1:8000'

const scenarios = [
  {
    name: 'Daytime',
    folder: 'daytime',
    description: 'Clear roads & natural lighting',
    color: '#e9b96e',
    icon: '☀',
  },
  {
    name: 'Night',
    folder: 'night',
    description: 'Low-light urban driving',
    color: '#9b91ff',
    icon: '☾',
  },
  {
    name: 'Rain',
    folder: 'rain',
    description: 'Wet roads & reflections',
    color: '#6db7ff',
    icon: '⛈',
  },
  {
    name: 'Fog',
    folder: 'fog',
    description: 'Reduced visibility',
    color: '#93d5c5',
    icon: '≋',
  },
]

const realImages = [
  '000002.png',
  '000003.png',
  '000004.png',
  '000005.png',
  '000006.png',
  '000007.png',
]

// Controlled FID comparison: both experiments use the same 100 real KITTI images.
const controlledFidResults = {
  original: 210.71817016601562,
  lora: 154.49598693847656,
  realImages: 100,
  syntheticImages: 100,
}



function App() {
  const [activeFilter, setActiveFilter] = useState('All Scenes')
  const [activeNav, setActiveNav] = useState('Overview')
  const [search, setSearch] = useState('')
  const [images, setImages] = useState([])
  const [qualityMetrics, setQualityMetrics] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [comparisonScenario, setComparisonScenario] = useState('daytime')
  const [realImageIndex, setRealImageIndex] = useState(0)
  const [syntheticImageIndex, setSyntheticImageIndex] = useState(0)
  const [comparisonPosition, setComparisonPosition] = useState(50)
  const [fidResults, setFidResults] = useState(null);
  const [conditionFidResults, setConditionFidResults] = useState(null);
  const [scenePrompt, setScenePrompt] = useState('');
  const [sceneCondition, setSceneCondition] = useState('daytime');
  const [sceneCount, setSceneCount] = useState('4');
  const [generationMessage, setGenerationMessage] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
    
  const averageMetrics = (rows) => {
    const metrics = ['brightness', 'contrast', 'sharpness']

    return metrics.reduce((result, metric) => {
      const values = rows
        .map((row) => Number(row[metric]))
        .filter((value) => Number.isFinite(value))

      result[metric] = values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0

      return result
    }, {})
  }

  
  const realMetrics = averageMetrics(
    qualityMetrics.filter(
      (row) => row.dataset?.trim().toLowerCase() === 'real'
    )
  )

  const syntheticMetrics = averageMetrics(
    qualityMetrics.filter(
      (row) => row.dataset?.trim().toLowerCase() === 'synthetic'
    )
  )

  
  const comparisonData = [
    {
      metric: 'Brightness',
      Real: Number(realMetrics.brightness.toFixed(2)),
      Synthetic: Number(syntheticMetrics.brightness.toFixed(2)),
    },
    {
      metric: 'Contrast',
      Real: Number(realMetrics.contrast.toFixed(2)),
      Synthetic: Number(syntheticMetrics.contrast.toFixed(2)),
    },
    {
      metric: 'Sharpness',
      Real: Number(realMetrics.sharpness.toFixed(2)),
      Synthetic: Number(syntheticMetrics.sharpness.toFixed(2)),
    },
  ]

  
  const scenarioMetrics = scenarios.map((scenario) => {
    const rows = qualityMetrics.filter(
      (row) =>
        row.dataset?.trim().toLowerCase() === 'synthetic' &&
        row.scenario?.trim().toLowerCase() ===
          scenario.folder.toLowerCase()
    )

    return {
      name: scenario.name,
      count: rows.length,
      ...averageMetrics(rows),
    }
  })

  
  
    useEffect(() => {
    fetch('/fid_results.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load FID results');
        }
        return response.json();
      })
      .then((data) => setFidResults(data))
      .catch((error) => {
        console.error('Error loading FID results:', error);
      });
  }, []);

  useEffect(() => {
  fetch("/condition_fid_results.json")
    .then((res) => {
      if (!res.ok) throw new Error("Could not load condition FID results");
      return res.json();
    })
    .then((data) => setConditionFidResults(data))
    .catch((error) => console.error(error));
}, []);

    useEffect(() => {
    fetch('/image_quality_metrics.csv')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load image quality metrics')
        }
        return response.text()
      })
      .then((csv) => {
        const lines = csv.trim().split(/\r?\n/)
        const headers = lines[0].split(',')

        const rows = lines.slice(1).map((line) => {
          const values = line.split(',')
          return Object.fromEntries(
            headers.map((header, index) => [
              header.trim(),
              values[index]?.trim(),
            ])
          )
        })

        setQualityMetrics(rows)
      })
      .catch((error) => {
        console.error('Quality metrics loading failed:', error)
      })
  }, [])
    useEffect(() => {
    fetch('/metadata.csv')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load metadata.csv')
        }
        return response.text()
      })
      .then((csv) => {
        const lines = csv.trim().split(/\r?\n/)
        const headers = lines[0].split(',').map((header) => header.trim())

        const rows = lines.slice(1).map((line, index) => {
          const values = line.split(',')
          const record = Object.fromEntries(
            headers.map((header, i) => [header, values[i]?.trim() ?? '']),
          )

          const folder = record.condition.toLowerCase()

          return {
            id: `${folder}-${index}`,
            title: record.filename,
            scenario: folder.charAt(0).toUpperCase() + folder.slice(1),
            folder,
            filename: record.filename,
            seed: record.seed,
            prompt: record.prompt,
            width: record.width,
            height: record.height,
          }
        })

        setImages(rows)
      })
      .catch((error) => console.error('Metadata loading failed:', error))
  }, [])

  
  const conditionCounts = useMemo(() => {
    const conditions = ['daytime', 'night', 'rain', 'fog']

    return conditions.map((condition) => ({
      condition,
      count: images.filter((image) => image.folder === condition).length,
    }))
  }, [images])


  const filteredImages = useMemo(() => {
    return images.filter((image) => {
      const matchesFilter =
        activeFilter === 'All Scenes' || image.scenario === activeFilter
      const matchesSearch =
        image.title.toLowerCase().includes(search.toLowerCase()) ||
        image.folder.toLowerCase().includes(search.toLowerCase())

      return matchesFilter && matchesSearch
    })
  }, [images,activeFilter, search])

  const scenarioCount = new Set(
  images.map((image) => image.folder)
).size

const resolutions = [
  ...new Set(images.map((image) => `${image.width}×${image.height}`))
]

const resolutionLabel =
  resolutions.length === 0
    ? 'Loading...'
    : resolutions.length === 1
      ? resolutions[0]
      : '512x512'

  const fidReduction = (
    ((controlledFidResults.original - controlledFidResults.lora) /
      controlledFidResults.original) *
    100
  ).toFixed(1)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-name">SYNTH<span>LAB</span></div>
            <div className="brand-subtitle">AUTONOMOUS SYSTEMS</div>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="nav-list">
          {[
            ['Overview', '▦'],
            ['Synthetic Dataset', '▤'],
            ['Real Dataset', '◫'],
            ['Generation Lab', '✳'],
            ['Evaluation', '⌁'],
          ].map(([label, icon]) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? 'active' : ''}`}
              onClick={()=> {
                console.log('Clicked navigation:', label)
                setActiveNav(label)}}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
              {label === 'Synthetic Dataset' && (
                <span className="nav-count">100</span>
              )}
            </button>
          ))}
        </nav>

        
        <div className="sidebar-bottom">
          <div className="sidebar-footer">SYNTHETIC DRIVING PROJECT</div>
        </div>
        </aside>


      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            Project <span>/</span> <strong>{activeNav}</strong>
          </div>
          <div className="topbar-right">
            <span className="environment-tag">
              <span className="status-dot" /> DEVELOPMENT
            </span>
            <div className="avatar">SD</div>
          </div>
        </header>

        <div className="page-content">
          {activeNav === 'Overview' && (
            <>
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" /> RESEARCH WORKSPACE
              </div>
              <h1>Synthetic Driving <span>Data Lab</span></h1>
              <p className="page-description">
                Explore, organize and analyze AI-generated driving scenarios
                for autonomous vehicle research.
              </p>
            </div>
            <div className="project-chip">
              <span className="chip-dot" />
              Diffusion pipeline
              <span className="chip-version">v0.1</span>
            </div>
          </section>

          <section className="stats-grid">
            <StatCard
              label="REAL TRAINING IMAGES"
              value="5,985"
              note="KITTI dataset"
              icon="◫"
              tone="blue"
            />
            <StatCard
              label="SYNTHETIC IMAGES"
              value={images.length.toLocaleString()}
              note="Generated with Stable Diffusion"
              icon="✳"
              tone="purple"
            />
            <StatCard
              label="SCENARIO TYPES"
              value={String(scenarioCount).padStart(2, '0')}
              note="Day · Night · Rain · Fog"
              icon="◈"
              tone="green"
            />
            <StatCard
              label="IMAGE RESOLUTION"
              value={resolutionLabel}
              note="Synthetic image dimensions"
              icon="▧"
              tone="orange"
            />
          </section>

          <section className="experiment-spotlight" aria-labelledby="experiment-spotlight-title">
            <div className="experiment-spotlight-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> MODEL EXPERIMENT</div>
                <h2 id="experiment-spotlight-title">LoRA fine-tuning at a glance</h2>
                <p>Controlled comparison using the same 100 real KITTI reference images and 100 synthetic images per experiment.</p>
              </div>
              <span className="experiment-status"><span className="status-dot" /> EVALUATED</span>
            </div>
            <div className="experiment-spotlight-grid">
              <article className="experiment-result-tile original-result">
                <span className="experiment-result-label">Original synthetic</span>
                <strong>210.72</strong>
                <span className="experiment-result-caption">FID score · baseline</span>
              </article>
              <article className="experiment-result-tile lora-result">
                <span className="experiment-result-label">LoRA fine-tuned</span>
                <strong>154.50</strong>
                <span className="experiment-result-caption">FID score · lower is better</span>
              </article>
              <article className="experiment-result-tile improvement-result">
                <span className="experiment-result-label">Relative reduction</span>
                <strong>−{fidReduction}%</strong>
                <span className="experiment-result-caption">Improved feature-distribution similarity</span>
              </article>
            </div>
            <div className="experiment-method-note">
              <span className="method-note-icon">i</span>
              <p>FID compares image-feature distributions. This result is promising, but it does not by itself establish road geometry, scene correctness, or driving safety.</p>
            </div>
          </section>

          <section className="methodology-section" aria-labelledby="methodology-title">
            <div className="section-heading methodology-heading">
              <div>
                <div className="eyebrow">PROJECT WORKFLOW</div>
                <h2 id="methodology-title">Methodology &amp; Evaluation</h2>
                <p>How the driving scenes were prepared, generated, and evaluated.</p>
              </div>
              <span className="methodology-tag">RESEARCH SUMMARY</span>
            </div>

            <div className="methodology-grid">
              <article className="methodology-card">
                <span className="methodology-step">01</span>
                <h3>Dataset preparation</h3>
                <p>A 500-image subset of KITTI driving scenes was prepared for LoRA fine-tuning. The dashboard also includes 100 synthetic images across daytime, night, rain, and fog, plus six real KITTI images for visual comparison.</p>
                <span className="methodology-meta">KITTI · 500 training images</span>
              </article>

              
              <article className="methodology-card">
                <span className="methodology-step">02</span>
                <h3>LoRA fine-tuning</h3>
                <p>
                  Stable Diffusion 1.5 was fine-tuned in Google Colab using a
                  Tesla T4 GPU and Low-Rank Adaptation (LoRA). The reported
                  training run used a 500-image subset of the KITTI dataset
                  for 500 training steps. The fine-tuned model was then used
                  to generate driving scenes under daytime, night, rain, and
                  fog conditions.
                </p>
                <span className="methodology-meta">
                  Stable Diffusion 1.5 · LoRA · 500 training images · 500 steps
                </span>
              </article>


              
              <article className="methodology-card">
                <span className="methodology-step">03</span>
                <h3>Controlled FID evaluation</h3>
                <p>
                  The original and LoRA fine-tuned model outputs were evaluated
                  using InceptionV3 features against the same selected 100 real
                  KITTI reference images, with 100 synthetic images per experiment.
                  Both experiments used the same evaluation settings. Lower FID
                  indicates greater feature-distribution similarity to the reference
                  images, but does not by itself establish visual realism or driving
                  scene safety.
                </p>
                <div className="methodology-fid-row">
                  <span>Original <strong>210.72</strong></span>
                  <span>LoRA <strong>154.50</strong></span>
                </div>
                <span className="methodology-meta">
                  26.7% lower FID in this controlled comparison
                </span>
              </article>

              <article className="methodology-card methodology-caveat-card">
                <span className="methodology-step">04</span>
                <h3>Interpretation &amp; limitations</h3>
                <p>A lower FID suggests the generated images have a feature distribution closer to the selected real-image sample. It does not prove correct road geometry, traffic behavior, object-detection performance, or autonomous-driving safety.</p>
                <span className="methodology-meta">Use as a distribution-level metric, not a safety guarantee</span>
              </article>
            </div>

            <p className="methodology-condition-note"><strong>Condition-wise FID note:</strong> the current daytime, night, rain, and fog scores use clear-daytime KITTI images as the real reference set. They measure similarity to that reference distribution, not weather-matched realism for each condition.</p>
          </section>
            </>
          )}

          {activeNav === 'Synthetic Dataset' && (
            <section className="section-heading">
              <div>
                <div className="eyebrow">DATA EXPLORER</div>
                <h2>Synthetic Dataset</h2>
                <p>Browse 100 generated driving scenes across daytime, night, rain, and fog.</p>
              </div>
              <div className="image-count"><span className="count-dot" />{images.length} images available</div>
            </section>
          )}
          
          {activeNav === 'Real Dataset' && (
            <section className="section-heading">
              <div>
                <div className="eyebrow">DATA EXPLORER</div>
                <h2>Real Dataset</h2>
                <p>
                  Explore real-world driving images from the KITTI dataset
                  used as reference data for this project.
                </p>
              </div>
              <div className="image-count">
                <span className="count-dot" />
                6 real images available
              </div>
            </section>
          )}


          
          {activeNav === 'Generation Lab' && (
            <section className="generation-lab">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">SYNTHETIC SCENE STUDIO</div>
                  <h2>Generation Lab</h2>
                  <p>Configure a driving scene and prepare it for synthetic image generation.</p>
                </div>
              </div>


              <div className="generation-form">
                <label htmlFor="scene-prompt">Scene description</label>
                <textarea
                  id="scene-prompt"
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  placeholder="Example: A city road at night with wet asphalt and streetlights..."
                  rows={4}
                />

                <label htmlFor="scene-condition">Driving condition</label>
                <select
                  id="scene-condition"
                  value={sceneCondition}
                  onChange={(e) => setSceneCondition(e.target.value)}
                >
                  <option value="daytime">Daytime</option>
                  <option value="night">Night</option>
                  <option value="rain">Rain</option>
                  <option value="fog">Fog</option>
                </select>

                <label htmlFor="scene-count">Number of images</label>
                <select
                  id="scene-count"
                  value={sceneCount}
                  onChange={(e) => setSceneCount(e.target.value)}
                >
                  <option value="1">1 image</option>
                  <option value="4">4 images</option>
                  <option value="8">8 images</option>
                </select>


                <label htmlFor="scene-condition">Driving condition</label>
                <select id="scene-condition" defaultValue="daytime">
                  <option value="daytime">Daytime</option>
                  <option value="night">Night</option>
                  <option value="rain">Rain</option>
                  <option value="fog">Fog</option>
                </select>

                <label htmlFor="scene-count">Number of images</label>
                <select id="scene-count" defaultValue="4">
                  <option value="1">1 image</option>
                  <option value="4">4 images</option>
                  <option value="8">8 images</option>
                </select>

                
                
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={async () => {
                    if (!scenePrompt.trim()) {
                      setGenerationMessage('Please enter a scene description first.');
                      return;
                    }

                    setGenerationMessage('Sending settings to the backend...');
                    setIsGenerating(true);

                    try {
                      const response = await fetch(`${API_BASE_URL}/generate`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          prompt: scenePrompt.trim(),
                          condition: sceneCondition,
                          count: Number(sceneCount),
                        }),
                      });

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(data.detail || 'The backend request failed.');
                      }

                      setGeneratedImages(
                        data.images.map((imagePath) => `${API_BASE_URL}${imagePath}`)
                      );

                      setGenerationMessage(
                        `Successfully generated ${data.count} image(s) for ${data.condition}.`
                      );
                    } catch (error) {
                      setGenerationMessage(
                        `Could not connect to the backend: ${error.message}`
                      );
                    }finally {
                      setIsGenerating(false);
                    }
                  }}
                >
                  {isGenerating ? 'Generating images...' : 'Generate Images'}
                </button>


                {generationMessage && (
                  <p role="status" aria-live="polite">
                    {generationMessage}
                  </p>
                )}
                
                {generatedImages.length > 0 && (
                  <div className="generated-images">
                    {generatedImages.map((imageUrl, index) => (
                      <div className="generated-image-card" key={imageUrl}>
                        <img
                          src={imageUrl}
                          alt={`AI-generated driving scene ${index + 1}`}
                          className="generated-image"
                        />

                        <button
                          type="button"
                          className="download-image-button"
                          onClick={async () => {
                            try {
                              const response = await fetch(imageUrl);

                              if (!response.ok) {
                                throw new Error('Download failed.');
                              }

                              const blob = await response.blob();
                              const downloadUrl = URL.createObjectURL(blob);
                              const link = document.createElement('a');

                              link.href = downloadUrl;
                              link.download = `drivesynth-scene-${index + 1}.png`;
                              document.body.appendChild(link);
                              link.click();
                              link.remove();

                              URL.revokeObjectURL(downloadUrl);
                            } catch (error) {
                              setGenerationMessage(`Could not download image: ${error.message}`);
                            }
                          }}
                        >
                          Download Image
                        </button>
                      </div>
                    ))}
                  </div>
                )}


              </div>
            </section>
          )}

          
          
          {activeNav === 'Evaluation' && (
            <section className="evaluation-page">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">MODEL PERFORMANCE</div>
                  <h2>Evaluation Results</h2>
                  <p>Compare the original model with the LoRA fine-tuned model.</p>
                </div>
              </div>

              <div className="evaluation-metrics">
                <article className="evaluation-card">
                  <span>Original Model FID</span>
                  <strong>
                    {controlledFidResults.original.toFixed(2)}
                  </strong>
                  <p>Baseline synthetic image quality</p>
                </article>

                <article className="evaluation-card">
                  <span>LoRA Fine-Tuned FID</span>
                  <strong>
                    {controlledFidResults.lora.toFixed(2)}
                  </strong>
                  <p>Fine-tuned synthetic image quality</p>
                </article>

                <article className="evaluation-card">
                  <span>FID Reduction</span>
                  <strong>{Number(fidReduction).toFixed(1)}%</strong>
                  <p>Relative change from the original model</p>
                </article>
              </div>

              <section className="evaluation-results-panel">
                <h3>Condition-wise FID Scores</h3>
                <p>Lower FID indicates greater similarity between feature distributions.</p>

                {!conditionFidResults ? (
                  <p>Loading evaluation results...</p>
                ) : (
                  <div className="evaluation-condition-grid">
                    {['daytime', 'night', 'rain', 'fog'].map((condition) => {
                      const result = conditionFidResults[condition]

                      if (!result) return null

                      return (
                        <article className="evaluation-condition-card" key={condition}>
                          <span>{condition}</span>
                          <strong>{Number(result.fid).toFixed(2)}</strong>
                          <p>
                            {result.real_images} real · {result.synthetic_images} synthetic
                          </p>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>

              <p className="evaluation-note">
                FID measures feature-distribution similarity. It does not by itself verify
                driving safety, road geometry, or physical realism.
              </p>
            </section>
          )}




          {(activeNav === 'Overview' || activeNav === 'Synthetic Dataset' || activeNav === 'Real Dataset') && (
            <>
          {activeNav === 'Overview' && (
            <section className="section-heading">
            <div>
              <div className="eyebrow">DATA EXPLORER</div>
              <h2>Synthetic image library</h2>
              <p>Browse the generated scenes by driving condition.</p>
            </div>
            <div className="image-count">
              <span className="count-dot" />
              {filteredImages.length} images displayed
            </div>
            </section>
          )}

          <section className="filter-toolbar">
            <div className="filter-tabs">
              {['All Scenes', 'Daytime', 'Night', 'Rain', 'Fog'].map(
                (filter) => (
                  <button
                    key={filter}
                    className={`filter-tab ${
                      activeFilter === filter ? 'selected' : ''
                    }`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </button>
                ),
              )}
            </div>
            <label className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search scenes..."
              />
            </label>
          </section>

          {activeNav === 'Overview' && (
            <>
          <section className="comparison-section">
            <div className="comparison-heading">
              <div>
                <h2>Interactive Image Comparison</h2>
                <p>
                  Drag the divider to compare a real KITTI road scene with a synthetic
                  driving scene.
                </p>
              </div>

              <select
                value={comparisonScenario}
                onChange={(event) => {
                  setComparisonScenario(event.target.value)
                  setSyntheticImageIndex(0)
                  setComparisonPosition(50)
                }}
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.folder} value={scenario.folder}>
                    {scenario.name}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const scenarioImages = images.filter(
                (image) => image.folder === comparisonScenario
              )

              if (scenarioImages.length === 0 || realImages.length === 0) {
                return (
                  <div className="comparison-empty">
                    No images are available for this comparison.
                  </div>
                )
              }

              const selectedReal =
                realImages[realImageIndex % realImages.length]

              const selectedSynthetic =
                scenarioImages[syntheticImageIndex % scenarioImages.length]

              return (
                <>
                  <div className="wipe-comparison">
                    <div className="wipe-image wipe-image-base">
                      <img
                        src={`/real/${selectedReal}`}
                        alt="Real KITTI driving scene"
                      />
                    </div>

                    <div
                      className="wipe-image wipe-image-overlay"
                      style={{
                        clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)`,
                      }}
                    >
                      <img
                      src={`/synthetic/${selectedSynthetic.folder}/${selectedSynthetic.filename}`}
                      alt={`Synthetic ${selectedSynthetic.scenario} driving scene`}                      
                      />
                    </div>

                    <div
                      className="wipe-divider"
                      style={{ left: `${comparisonPosition}%` }}
                    >
                      <span className="wipe-handle" aria-hidden="true">
                        ↔
                      </span>
                    </div>

                    <span className="wipe-label wipe-label-real">
                      REAL · KITTI
                    </span>
                    <span className="wipe-label wipe-label-synthetic">
                      SYNTHETIC · {comparisonScenario.toUpperCase()}
                    </span>
                  </div>

                  <div className="wipe-slider-control">
                    <label htmlFor="comparison-slider">
                      Comparison divider
                    </label>
                    <input
                      id="comparison-slider"
                      type="range"
                      min="0"
                      max="100"
                      value={comparisonPosition}
                      onChange={(event) =>
                        setComparisonPosition(Number(event.target.value))
                      }
                      aria-label="Move the divider between real and synthetic images"
                    />
                    <div className="wipe-slider-labels">
                      <span>Synthetic view</span>
                      <span>{comparisonPosition}%</span>
                      <span>Real view</span>
                    </div>
                  </div>

                  <div className="comparison-controls">
                    <div className="comparison-image-info">
                      <span>Real image</span>
                      <strong>
                        {realImageIndex + 1} / {realImages.length}
                      </strong>
                      <button
                        onClick={() =>
                          setRealImageIndex(
                            (index) => (index + 1) % realImages.length
                          )
                        }
                      >
                        Next real image
                      </button>
                    </div>

                    <div className="comparison-image-info">
                      <span>Synthetic image</span>
                      <strong>
                        {syntheticImageIndex + 1} / {scenarioImages.length}
                      </strong>
                      <button
                        onClick={() =>
                          setSyntheticImageIndex(
                            (index) => (index + 1) % scenarioImages.length
                          )
                        }
                      >
                        Next synthetic image
                      </button>
                    </div>
                  </div>

                  <p className="comparison-note">
                    Note: Real and synthetic images may show different scenes. This
                    slider compares their visual appearance, not pixel-aligned content.
                  </p>
                </>
              )
            })()}
          </section>


          
          {/* Dataset Analytics */}
          <section className="analytics-section">
            <div className="analytics-heading">
              <div>
                <h2>Dataset Analytics</h2>
                <p>Overview of the synthetic driving image dataset.</p>
              </div>
              <span className="analytics-status">LIVE DATA</span>
            </div>

            {(() => {
              const scenarioCounts = scenarios.map((scenario) => ({
                ...scenario,
                count: images.filter(
                  (image) => image.folder === scenario.folder
                ).length,
              }))

              const totalImages = images.length
              const maxCount = Math.max(
                1,
                ...scenarioCounts.map((scenario) => scenario.count)
              )

              return (
                <>
                  <div className="analytics-summary-grid">
                    <article className="analytics-stat-card">
                      <span>Total synthetic images</span>
                      <strong>{totalImages}</strong>
                      <small>Loaded from metadata</small>
                    </article>

                    <article className="analytics-stat-card">
                      <span>Scenarios</span>
                      <strong>{scenarios.length}</strong>
                      <small>Driving conditions</small>
                    </article>

                    <article className="analytics-stat-card">
                      <span>Largest category</span>
                      <strong>
                        {totalImages > 0
                          ? (() => {
                              const maxCount = Math.max(
                                ...scenarioCounts.map((scenario) => scenario.count)
                              )

                              const leaders = scenarioCounts.filter(
                                (scenario) => scenario.count === maxCount
                              )

                              return leaders.length > 1
                                ? 'All Equal'
                                : leaders[0].name
                            })()
                          : '—'}
                      </strong>
                      <small>By image count</small>
                    </article>

                    <article className="analytics-stat-card">
                      <span>Dataset balance</span>
                      <strong>
                        {totalImages > 0
                          ? `${Math.round(
                              (Math.min(...scenarioCounts.map((item) => item.count)) /
                                (Math.max(...scenarioCounts.map((item) => item.count)) || 1)) *
                                100
                            )}%`
                          : '—'}
                      </strong>
                      <small>Smallest vs. largest category</small>
                    </article>
                  </div>

                  
                  <div className="analytics-summary-grid" style={{ marginTop: '16px' }}>
                    {scenarioCounts.map((scenario) => (
                      <article className="analytics-stat-card" key={scenario.folder}>
                        <span>{scenario.name}</span>
                        <strong>{scenario.count}</strong>
                        <small>
                          {scenario.count === 1 ? 'image' : 'images'} in this condition
                        </small>
                      </article>
                    ))}
                  </div>


                  <div className="analytics-chart-grid">
                    <article className="analytics-chart-card">
                      <div className="analytics-card-heading">
                        <div>
                          <h3>Images by Scenario</h3>
                          <p>Distribution across driving conditions</p>
                        </div>
                      </div>

                      <div className="analytics-bars">
                        {scenarioCounts.map((scenario) => (
                          <div className="analytics-bar-row" key={scenario.folder}>
                            <div className="analytics-bar-label">
                              <span>
                                <i style={{ background: scenario.color }} />
                                {scenario.name}
                              </span>
                              <strong>{scenario.count}</strong>
                            </div>

                            <div
                              className="analytics-bar-track"
                              role="progressbar"
                              aria-label={`${scenario.name} image count`}
                              aria-valuemin={0}
                              aria-valuemax={maxCount}
                              aria-valuenow={scenario.count}
                            >
                              <div
                                className="analytics-bar-fill"
                                style={{
                                  width: `${(scenario.count / maxCount) * 100}%`,
                                  background: scenario.color,
                                }}
                              />
                            </div>

                            <small>
                              {totalImages > 0
                                ? `${((scenario.count / totalImages) * 100).toFixed(1)}% of dataset`
                                : '0% of dataset'}
                            </small>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="analytics-chart-card">
                      <div className="analytics-card-heading">
                        <div>
                          <h3>Dataset Breakdown</h3>
                          <p>Image counts and proportions</p>
                        </div>
                      </div>

                      <div className="analytics-breakdown">
                        {scenarioCounts.map((scenario) => (
                          <div
                            className="analytics-breakdown-row"
                            key={scenario.folder}
                          >
                            <span
                              className="analytics-breakdown-dot"
                              style={{ background: scenario.color }}
                            />
                            <span className="analytics-breakdown-name">
                              {scenario.name}
                            </span>
                            <strong>{scenario.count}</strong>
                            <span className="analytics-breakdown-percent">
                              {totalImages > 0
                                ? `${((scenario.count / totalImages) * 100).toFixed(1)}%`
                                : '0%'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="analytics-total">
                        <span>Total dataset</span>
                        <strong>{totalImages} images</strong>
                      </div>
                    </article>
                  </div>
                </>
              )
            })()}
          </section>

          
          <section className="quality-comparison">
            <div className="section-heading">
              <div>
                <h2>Image Quality Analysis</h2>
                <p>Average pixel-level metrics: real vs. synthetic images</p>
              </div>
            </div>

            <div className="quality-metrics-grid">
              {[
                { key: 'brightness', label: 'Average Brightness' },
                { key: 'contrast', label: 'Average Contrast' },
                { key: 'sharpness', label: 'Edge Sharpness Proxy' },
              ].map((metric) => (
                <div className="quality-metric-card" key={metric.key}>
                  <h3>{metric.label}</h3>

                  <div className="quality-value-row">
                    <span>Real</span>
                    <strong>{(realMetrics[metric.key] ?? 0).toFixed(2)}</strong>
                  </div>

                  <div className="quality-value-row">
                    <span>Synthetic</span>
                    <strong>{(syntheticMetrics[metric.key] ?? 0).toFixed(2)}</strong>
                  </div>
                </div>
              ))}
            </div>

            
            <div className="stat-card">
              <p>Base Model FID</p>
              <h2>
                {fidResults?.controlled_comparison
                  ? Number(fidResults.controlled_comparison.base_model_fid).toFixed(2)
                  : 'Loading...'}
              </h2>
              <p>
                {fidResults?.controlled_comparison
                  ? `${fidResults.controlled_comparison.real_image_count} real images · ${fidResults.controlled_comparison.synthetic_image_count_per_model} synthetic images per model`
                  : 'Loading evaluation results'}
              </p>
            </div>

            <div className="stat-card">
              <p>LoRA Fine-Tuned FID</p>
              <h2>
                {fidResults?.controlled_comparison
                  ? Number(fidResults.controlled_comparison.lora_finetuned_fid).toFixed(2)
                  : 'Loading...'}
              </h2>
              <p>Lower FID indicates greater similarity to the reference image distribution.</p>
            </div>

            <div className="stat-card">
              <p>Relative FID Decrease</p>
              <h2>
                {fidResults?.controlled_comparison
                  ? `${Number(fidResults.controlled_comparison.relative_fid_decrease_percent).toFixed(1)}%`
                  : 'Loading...'}
              </h2>
              <p>Base model compared with LoRA fine-tuned model.</p>
            </div>


            <div
              className="fid-experiment-card"
              style={{
                marginTop: '24px',
                padding: '24px',
                border: '1px solid #303643',
                borderRadius: '16px',
                background: '#171b24',
                color: '#f3f4f6',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '22px',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 6px', color: '#aab3c2', fontSize: '12px', letterSpacing: '0.12em' }}>
                    CONTROLLED FID EVALUATION
                  </p>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>
                    Original vs. LoRA fine-tuned
                  </h3>
                  
                {/* FID comparison bar chart */}
                <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                  <p style={{ color: '#aab3c2', fontSize: '13px', marginBottom: '16px' }}>
                    FID Score Comparison (lower is better)
                  </p>

                  {[
                    { label: 'Original synthetic', value: 210.72, color: '#94a3b8' },
                    { label: 'LoRA fine-tuned', value: 154.50, color: '#34d399' },
                  ].map((item) => (
                    <div key={item.label} style={{ marginBottom: '18px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                          marginBottom: '7px',
                          color: '#e2e8f0',
                          fontSize: '13px',
                        }}
                      >
                        <span>{item.label}</span>
                        <strong>{item.value.toFixed(2)}</strong>
                      </div>

                      <div
                        style={{
                          width: '100%',
                          height: '14px',
                          background: '#263244',
                          borderRadius: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${(item.value / 220) * 100}%`,
                            height: '100%',
                            background: item.color,
                            borderRadius: '8px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <p style={{ color: '#aab3c2', fontSize: '12px', marginTop: '12px' }}>
                    FID decreased by 26.7% after LoRA fine-tuning across the controlled
                    evaluation using 100 real and 100 synthetic images per experiment.
                  </p>
                </div>

                  <p style={{ margin: '8px 0 0', color: '#aab3c2', fontSize: '13px' }}>
                    InceptionV3 features · same 100 real KITTI reference images
                  </p>
                </div>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(34, 197, 94, 0.12)',
                    color: '#86efac',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  ↓ {fidReduction}% FID
                </div>
              </div>

              {[
                {
                  label: 'Original synthetic model',
                  value: controlledFidResults.original,
                  color: '#8b95a5',
                },
                {
                  label: 'LoRA fine-tuned model',
                  value: controlledFidResults.lora,
                  color: '#86efac',
                },
              ].map((result) => (
                <div key={result.label} style={{ marginBottom: '18px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '8px',
                      fontSize: '14px',
                    }}
                  >
                    <span>{result.label}</span>
                    <strong>{result.value.toFixed(2)}</strong>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '10px',
                      overflow: 'hidden',
                      borderRadius: '999px',
                      background: '#303643',
                    }}
                  >
                    <div
                      style={{
                        width: `${(result.value / controlledFidResults.original) * 100}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: result.color,
                      }}
                    />
                  </div>
                </div>
              ))}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px 24px',
                  paddingTop: '14px',
                  borderTop: '1px solid #303643',
                  color: '#aab3c2',
                  fontSize: '12px',
                }}
              >
                <span>{controlledFidResults.realImages} real images per evaluation</span>
                <span>{controlledFidResults.syntheticImages} synthetic images per evaluation</span>
                <span>Lower FID is better</span>
              </div>
              <p style={{ margin: '14px 0 0', color: '#aab3c2', fontSize: '12px', lineHeight: 1.6 }}>
                FID measures similarity between feature distributions; it does not by itself verify road geometry or driving safety.
                The earlier full-dataset baseline uses a different sample count and should be reported separately.
              </p>
            </div>

            {/* Condition-wise FID Results */}
            <div
              style={{
                marginTop: '24px',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #303643',
                background: '#171b24',
              }}
            >
              <h2 style={{ margin: '0 0 8px', fontSize: '20px' }}>
                Condition-wise FID Scores
              </h2>

              
              <p style={{ color: '#aab3c2', fontSize: '13px', lineHeight: 1.6 }}>
                Original synthetic images compared with 100 clear-daytime KITTI
                reference images. Each condition contains 25 synthetic images.
                Lower FID indicates greater feature-distribution similarity, but
                these scores do not isolate weather-specific realism. Night, rain,
                and fog results may be affected by differences from the clear-daytime
                reference distribution.
              </p>


              {!conditionFidResults ? (
                <p style={{ color: '#aab3c2' }}>Loading condition-wise results...</p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '14px',
                    marginTop: '18px',
                  }}
                >
                  {['daytime', 'night', 'rain', 'fog'].map((condition) => {
                    const result = conditionFidResults[condition];

                    if (!result) return null;

                    return (
                      <div
                        key={condition}
                        style={{
                          padding: '18px',
                          borderRadius: '12px',
                          background: '#202632',
                          border: '1px solid #303643',
                        }}
                      >
                        <div
                          style={{
                            color: '#aab3c2',
                            fontSize: '13px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {condition}
                        </div>

                        <div
                          style={{
                            fontSize: '28px',
                            fontWeight: 700,
                            margin: '10px 0',
                            color: '#86efac',
                          }}
                        >
                          {Number(result.fid).toFixed(2)}
                        </div>

                        <div style={{ color: '#aab3c2', fontSize: '11px' }}>
                          {result.real_images} real · {result.synthetic_images} synthetic
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            
            <div className="comparison-chart-card">
              <h3>Real vs. Synthetic Images</h3>
              <p>Comparison of average image statistics</p>

              <div className="comparison-chart">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 15, right: 20, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#303643"
                    />
                    <XAxis
                      dataKey="metric"
                      tick={{ fill: '#b8c0cc', fontSize: 12 }}
                      axisLine={{ stroke: '#454c59' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#b8c0cc', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#171b24',
                        border: '1px solid #363d4b',
                        borderRadius: 8,
                        color: '#ffffff',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="Real"
                      fill="#6db7ff"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Synthetic"
                      fill="#a99aff"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            
            <div className="scenario-analysis">
              <h3>Scenario-Level Analysis</h3>
              <p>Image statistics across synthetic driving conditions</p>

              <div className="scenario-table-wrapper">
                <table className="scenario-table">
                  <thead>
                    <tr>
                      <th>Scenario</th>
                      <th>Images</th>
                      <th>Brightness</th>
                      <th>Contrast</th>
                      <th>Sharpness</th>
                    </tr>
                  </thead>

                  <tbody>
                    {scenarioMetrics.map((scenario) => (
                      <tr key={scenario.name}>
                        <td>{scenario.name}</td>
                        <td>{scenario.count}</td>
                        <td>{scenario.brightness.toFixed(2)}</td>
                        <td>{scenario.contrast.toFixed(2)}</td>
                        <td>{scenario.sharpness.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </section>
            </>
          )}

          
          {activeNav === 'Real Dataset' ? (
            <>
              <h2 style={{ color: 'white', padding: '20px' }}>
                REAL DATASET RENDER TEST
              </h2>

              <section className="image-grid">
                {realImages.map((filename, index) => {
                  const image = {
                    id: `real-${filename}`,
                    filename,
                    title: `Real KITTI Image ${index + 1}`,
                    folder: 'real',
                    scenario: 'Real Dataset',
                  }

                  return (
                    <article
                      className="image-card"
                      key={image.id}
                      onClick={() => setSelectedImage(image)}
                      title="Click to inspect image details"
                    >
                      <div className="scene-preview scene-real">
                        <img
                          src={`/real/${filename}`}
                          alt={image.title}
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                        <span className="scene-badge">
                          <span /> Real KITTI
                        </span>
                        <span className="image-number">{filename}</span>
                      </div>

                      <div className="image-card-info">
                        <div>
                          <h3>{image.title}</h3>
                          <p>Real-world image <span>·</span> KITTI</p>
                        </div>
                        <button
                          className="more-button"
                          title="Show image information"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedImage(image)
                          }}
                        >
                          ···
                        </button>
                      </div>
                    </article>
                  )
                })}
              </section>
            </>
          ) : activeNav === 'Synthetic Dataset' ? (
            <section className="image-grid">
              {filteredImages.map((image) => {
                const scenario = scenarios.find(
                  (item) => item.folder === image.folder
                )

                return (
                  <article
                    className="image-card"
                    key={image.id}
                    onClick={() => setSelectedImage(image)}
                    title="Click to inspect image details"
                  >
                    <div className={`scene-preview scene-${image.folder}`}>
                      <img
                        src={`/synthetic/${image.folder}/${image.filename}`}
                        alt={image.title}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                          event.currentTarget.nextElementSibling.style.display = 'flex'
                        }}
                      />
                      <div className="scene-placeholder">
                        <span className="placeholder-icon">
                          {scenario?.icon ?? '🚗'}
                        </span>
                        <span>{scenario?.name ?? image.scenario} driving scene</span>
                        <small>Image will appear when dataset is connected</small>
                      </div>
                      <span
                        className="scene-badge"
                        style={{ '--scenario-color': scenario?.color ?? '#64748b' }}
                      >
                        <span /> {image.scenario}
                      </span>
                      <span className="image-number">{image.filename}</span>
                    </div>

                    <div className="image-card-info">
                      <div>
                        <h3>{image.title}</h3>
                        <p>512 × 512 px <span>·</span> PNG</p>
                      </div>
                      <button
                        className="more-button"
                        title="Show image information"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedImage(image)
                        }}
                      >
                        ···
                      </button>
                    </div>
                  </article>
                )
              })}
            </section>
          ) : null}



               
          {selectedImage && (
            <div
              className="detail-overlay"
              onClick={() => setSelectedImage(null)}
            >
              <div
                className="detail-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="detail-title"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="detail-close"
                  onClick={() => setSelectedImage(null)}
                  aria-label="Close image details"
                >
                  ×
                </button>

                <h2 id="detail-title">Image Details</h2>

                <img
                  className="detail-image"
                  src={`/synthetic/${selectedImage.folder}/${selectedImage.filename}`}
                  alt={selectedImage.title}
                />

                <h3>{selectedImage.title}</h3>

                <div className="detail-fields">
                  <p>
                    <strong>Scenario:</strong> {selectedImage.scenario}
                  </p>
                  <p>
                    <strong>Filename:</strong> {selectedImage.filename}
                  </p>
                  <p>
                    <strong>Seed:</strong> {selectedImage.seed || 'Not available'}
                  </p>
                  <p>
                    <strong>Resolution:</strong>{' '}
                    {selectedImage.width || 512} × {selectedImage.height || 512}
                  </p>
                  <p>
                    <strong>Format:</strong> PNG
                  </p>
                  <p>
                    <strong>Generation prompt:</strong>
                  </p>
                  <p className="detail-prompt">
                    {selectedImage.prompt || 'No prompt available in metadata.'}
                  </p>
                </div>
              </div>
            </div>
          )}


          {filteredImages.length === 0 && (
            <div className="empty-state">
              <span>⌕</span>
              <h3>No matching scenes</h3>
              <p>Try another search term or scenario filter.</p>
              <button
                onClick={() => {
                  setSearch('')
                  setActiveFilter('All Scenes')
                }}
              >
                Clear filters
              </button>
            </div>
          )}

          </>
          )}

          <footer className="page-footer">
            <span> DRIVESYNTH AI <span className="footer-divider">/</span> RESEARCH BUILD 0.1</span>
            <span>Real and synthetic data are kept separate.</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, note, icon, tone }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </article>
  )
}

export default App
