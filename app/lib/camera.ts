import { Capacitor } from '@capacitor/core'

/**
 * Take a photo or select from gallery using Capacitor Camera plugin
 * Falls back to file input on web
 */
export async function captureImage(source: 'camera' | 'photos' = 'camera'): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    // On web, return null to indicate fallback to file input should be used
    return null
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      correctOrientation: true,
    })

    return image.dataUrl || null
  } catch (error) {
    console.error('Camera error:', error)
    // User cancelled or error occurred
    return null
  }
}

/**
 * Show action sheet to choose between camera and photo library
 */
export async function showImageSourcePicker(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // Shows action sheet to pick camera or photos
      correctOrientation: true,
      promptLabelHeader: 'Select Image Source',
      promptLabelPhoto: 'Choose from Photos',
      promptLabelPicture: 'Take a Photo',
    })

    return image.dataUrl || null
  } catch (error) {
    console.error('Camera error:', error)
    return null
  }
}

/**
 * Check if we're running on a native platform
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}
