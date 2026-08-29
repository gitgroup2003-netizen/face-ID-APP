import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';
let loadPromise: Promise<void> | null = null;

/** Loads the face detector, landmark, and recognition models once (from /public/models). */
export function loadFaceModels(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })();
  }
  return loadPromise;
}

export interface FaceCaptureResult {
  descriptor: number[];
  box: { x: number; y: number; width: number; height: number };
  imageWidth: number;
  imageHeight: number;
}

/**
 * Detects the single most prominent face in an image/video/canvas and returns
 * its 128-value recognition descriptor (embedding), used both to enroll a
 * guardian and to compare a live gate capture against enrolled guardians.
 */
export async function detectFace(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceCaptureResult | null> {
  await loadFaceModels();
  const result = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;

  const width = 'videoWidth' in input ? input.videoWidth : input.width;
  const height = 'videoHeight' in input ? input.videoHeight : input.height;

  return {
    descriptor: Array.from(result.descriptor),
    box: { x: result.detection.box.x, y: result.detection.box.y, width: result.detection.box.width, height: result.detection.box.height },
    imageWidth: width,
    imageHeight: height,
  };
}

/** Euclidean distance between two descriptors — lower means more similar. */
export function descriptorDistance(a: number[], b: number[]): number {
  return faceapi.euclideanDistance(a, b);
}

// face-api's recognition net was trained so that ~0.6 euclidean distance is
// the standard "same person" cutoff; we use a slightly stricter default
// since a false "match" at a school gate is the costly failure mode.
export const DEFAULT_MATCH_THRESHOLD = 0.5;

export interface GuardianCandidate {
  guardianId: number;
  childId: number;
  descriptor: number[];
}

export interface BestMatch {
  guardianId: number;
  childId: number;
  distance: number;
  confidence: number; // 0-1, higher is better
  isMatch: boolean;
}

/** Finds the closest enrolled guardian to a captured descriptor. */
export function findBestMatch(
  capturedDescriptor: number[],
  candidates: GuardianCandidate[],
  threshold: number = DEFAULT_MATCH_THRESHOLD
): BestMatch | null {
  if (candidates.length === 0) return null;

  let best: GuardianCandidate | null = null;
  let bestDistance = Infinity;
  for (const c of candidates) {
    const d = descriptorDistance(capturedDescriptor, c.descriptor);
    if (d < bestDistance) {
      bestDistance = d;
      best = c;
    }
  }
  if (!best) return null;

  const confidence = Math.max(0, Math.min(1, 1 - bestDistance / threshold / 1.5));
  return {
    guardianId: best.guardianId,
    childId: best.childId,
    distance: bestDistance,
    confidence,
    isMatch: bestDistance <= threshold,
  };
}
