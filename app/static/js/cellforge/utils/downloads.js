export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  downloadBlob(filename, blob)
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportObjectAsGlb(object) {
  if (!object) {
    throw new Error('No exportable model is mounted.')
  }

  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js')

  return new Promise((resolve, reject) => {
    const exportRoot = object.clone(true)
    exportRoot.traverse((node) => {
      if (!node.isMesh && !node.isLine && !node.isLineSegments) return

      node.castShadow = false
      node.receiveShadow = false
      if (Array.isArray(node.material)) {
        node.material = node.material.map((material) => material.clone())
      } else if (node.material) {
        node.material = node.material.clone()
      }
    })

    const exporter = new GLTFExporter()
    exporter.parse(
      exportRoot,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }))
          return
        }

        resolve(new Blob([JSON.stringify(result)], { type: 'model/gltf+json' }))
      },
      (error) => reject(error),
      {
        binary: true,
        onlyVisible: true,
        trs: false,
      },
    )
  })
}

export function downloadCanvasImage(filename) {
  const canvas = document.querySelector('.cell-viewer canvas')
  if (!canvas) return false

  try {
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = filename
    link.click()
    return true
  } catch {
    return false
  }
}
