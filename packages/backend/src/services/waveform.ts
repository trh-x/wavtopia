import { Readable } from "stream";
import * as wav from "wav";

interface WavFormat {
  audioFormat: number;
  endianness: string;
  channels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitDepth: number;
  signed: boolean;
}

export async function generateWaveformData(
  audioBuffer: Buffer
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    try {
      // Create a readable stream from the buffer
      const bufferStream = new Readable();
      bufferStream.push(audioBuffer);
      bufferStream.push(null);

      // Create WAV reader
      const reader = new wav.Reader();
      const peaks: number[] = [];
      let samplesPerPeak = 1000; // Adjust this value to control resolution
      let currentMax = 0;
      let currentMin = 0;
      let sampleCount = 0;

      // Process the audio data
      reader.on("format", function (format: WavFormat) {
        reader.on("data", function (chunk: Buffer) {
          // Convert buffer to 16-bit samples
          for (let i = 0; i < chunk.length; i += 2) {
            const sample = chunk.readInt16LE(i) / 32768.0; // Normalize to [-1, 1]

            currentMax = Math.max(currentMax, sample);
            currentMin = Math.min(currentMin, sample);
            sampleCount++;

            if (sampleCount >= samplesPerPeak) {
              peaks.push(currentMax);
              peaks.push(currentMin);
              currentMax = 0;
              currentMin = 0;
              sampleCount = 0;
            }
          }
        });

        reader.on("end", function () {
          // Add any remaining samples
          if (sampleCount > 0) {
            peaks.push(currentMax);
            peaks.push(currentMin);
          }
          resolve(peaks);
        });
      });

      reader.on("error", reject);

      // Pipe the buffer stream through the WAV reader
      bufferStream.pipe(reader);
    } catch (error) {
      reject(error);
    }
  });
}