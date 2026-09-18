import { useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8081'
const ACCEPTED_EXT = ['.pdf', '.docx', '.tex', '.txt', '.md']

export default function App() {
  const [resumeFile, setResumeFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { tailoredResume, changes, format }
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const resultRef = useRef(null)

  const isValidExt = (name) => ACCEPTED_EXT.some((ext) => name.toLowerCase().endsWith(ext))

  const applyFile = (file) => {
    if (!file) return
    if (!isValidExt(file.name)) {
      setError(`"${file.name}" supported nahi hai. .pdf, .docx, .tex ya .txt use karo.`)
      return
    }
    setError('')
    setResumeFile(file)
  }

  const handleFileChange = (e) => applyFile(e.target.files?.[0])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragActive(false)
    applyFile(e.dataTransfer.files?.[0])
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }
  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!resumeFile) {
      setError('Pehle apna resume file (.pdf, .docx, .tex ya .txt) choose karo.')
      return
    }
    if (!jobDescription.trim()) {
      setError('Job description bhi daalo.')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('resume', resumeFile)
      formData.append('jobDescription', jobDescription)

      const res = await fetch(`${API_BASE}/api/tailor`, { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'Kuch gadbad ho gayi.')

      setResult({
        tailoredResume: data.tailoredResume,
        changes: data.changes || [],
        format: data.format || 'text',
      })
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      setError(err.message || 'Server se connect nahi ho paaya. Backend chal raha hai na?')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.tailoredResume)
    } catch {
      /* clipboard permission may be blocked, ignore silently */
    }
  }

  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleDownloadTxt = () => {
    if (!result) return
    triggerDownload(new Blob([result.tailoredResume], { type: 'text/plain' }), 'tailored-resume.txt')
  }

  const handleDownloadDocx = async () => {
    if (!result) return
    try {
      const res = await fetch(`${API_BASE}/api/tailor/docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailoredResume: result.tailoredResume }),
      })
      if (!res.ok) throw new Error('Download fail ho gaya.')
      triggerDownload(await res.blob(), 'tailored-resume.docx')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDownloadTex = async () => {
    if (!result) return
    try {
      const res = await fetch(`${API_BASE}/api/tailor/tex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailoredResume: result.tailoredResume }),
      })
      if (!res.ok) throw new Error('Download fail ho gaya.')
      triggerDownload(await res.blob(), 'tailored-resume.tex')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page">
      <div className="spiral" aria-hidden="true" />
      <div className="wrap">
        <header className="masthead">
          <div>
            <span className="eyebrow">Built for job seekers, not ATS games</span>
            <h1>Tailor Your<span className="mark">Resume</span></h1>
            <p>Upload your resume, paste the job description, and get a version tailored to the role — while staying true to your experience.</p>
            <span className="sticker sticker-blue">Privacy first.
No signup, Just upload</span>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="inputs">
            <div className="field">
              <label><span className="step">1</span> Resume file</label>
              <div
                className={`dropzone${dragActive ? ' active' : ''}${resumeFile ? ' filled' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXT.join(',')}
                  onChange={handleFileChange}
                  hidden
                />
                {resumeFile ? (
                  <>
                    <div className="drop-icon ok">✓</div>
                    <div className="drop-title">{resumeFile.name}</div>
                    <div className="drop-sub">Want a different resume? Click here</div>
                  </>
                ) : (
                  <>
                    <div className="drop-icon">↑</div>
                    <div className="drop-title">Drag &amp; drop, ya click karo</div>
                    <div className="drop-sub">.pdf · .docx · .tex · .txt</div>
                  </>
                )}
              </div>
            </div>

            <div className="field">
              <label><span className="step">2</span> Job description</label>
              <textarea
                placeholder="Jis role ke liye apply kar rahe ho, uski poori job description yahan paste karo — we'll handle the tailoring."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="actions">
            <button className="primary" type="submit" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? 'Tailoring…' : 'Tailor my resume →'}
            </button>
            {error && <span className="status err">{error}</span>}
          </div>
        </form>

        {result && (
          <section className="result" ref={resultRef}>
            <div className="result-head">
              <h2><span className="step">3</span> Tailored resume{result.format === 'latex' ? ' · LaTeX' : ''}</h2>
              <div className="result-actions">
                <button className="ghost" onClick={handleCopy}>Copy</button>
                {result.format === 'latex' ? (
                  <button className="ghost" onClick={handleDownloadTex}>Download .tex</button>
                ) : (
                  <>
                    <button className="ghost" onClick={handleDownloadTxt}>.txt</button>
                    <button className="ghost" onClick={handleDownloadDocx}>.docx</button>
                  </>
                )}
              </div>
            </div>

            {result.format === 'latex' ? (
              <pre className="sheet sheet-code">{result.tailoredResume}</pre>
            ) : (
              <div className="sheet resume-doc">
                <span className="stamp">tailored ✓</span>
                <ReactMarkdown>{result.tailoredResume}</ReactMarkdown>
              </div>
            )}

            {result.changes.length > 0 && (
              <div className="changes">
                <h3>What changed, and why</h3>
                <ul>
                  {result.changes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </section>
        )}

        <footer>
          Your experience stays the same. We just help it speak the language of the role.
        </footer>
      </div>
    </div>
  )
}
