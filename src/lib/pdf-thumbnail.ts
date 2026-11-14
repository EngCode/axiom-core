/**======> Reference By Comment <======
 * ===> 01 - PDF.js Loader
 * ===> 02 - First Page Thumbnail
 */

//=====> PDF.js Loader <=====//

type PdfModule = typeof import('pdfjs-dist')

let pdfjs: Promise<PdfModule> | null = null

async function loadPdfjs(): Promise<PdfModule> {
  if (!pdfjs) {
    pdfjs = (async () => {
      const library = await import('pdfjs-dist')
      // The worker ships with the package; Vite turns it into a hashed asset.
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      library.GlobalWorkerOptions.workerSrc = worker.default
      return library
    })()
  }
  return pdfjs
}

//=====> First Page Thumbnail <=====//

/**
 * Render the first page of a PDF into a small PNG data URL. The UI only calls
 * this for PDF attachments, so a normal image never pays the download cost of
 * the PDF.js bundle.
 */
export async function renderPdfThumbnail(url: string, maxWidth = 96): Promise<string> {
  const library = await loadPdfjs()
  const task = library.getDocument({ url, isEvalSupported: false })
  const document = await task.promise
  try {
    const page = await document.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.max(0.05, maxWidth / base.width)
    const viewport = page.getViewport({ scale })
    const canvas = window.document.createElement('canvas')
    canvas.width = Math.max(1, Math.ceil(viewport.width))
    canvas.height = Math.max(1, Math.ceil(viewport.height))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable')
    await page.render({ canvasContext: context, viewport }).promise
    return canvas.toDataURL('image/png')
  } finally {
    await document.destroy()
  }
}
