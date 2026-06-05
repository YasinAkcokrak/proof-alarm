import * as ImageManipulator from 'expo-image-manipulator'

const WORKER_URL = 'https://proof-alarm-api.yasinakcokrak.workers.dev'

export type VerificationResult = {
  match: boolean
  confidence: number
  reason: string
}

async function resizeToBase64(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512, height: 512 } }],
    { format: ImageManipulator.SaveFormat.JPEG, base64: true, compress: 0.85 }
  )
  if (!result.base64) throw new Error('Image conversion to base64 failed')
  return result.base64
}

export async function verifyLocation(
  referenceUri: string,
  currentUri: string
): Promise<VerificationResult> {
  const [referenceImageBase64, currentImageBase64] = await Promise.all([
    resizeToBase64(referenceUri),
    resizeToBase64(currentUri),
  ])

  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceImageBase64, currentImageBase64 }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Verification error ${response.status}: ${err}`)
  }

  const result: VerificationResult = await response.json()
  return result
}
