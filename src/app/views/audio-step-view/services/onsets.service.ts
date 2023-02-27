import { Injectable } from '@angular/core';
import audioEncoder from 'audio-encoder';
import { from, map, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OnsetsService {
  private audioCtx: AudioContext;
  private audioWorker: Worker;

  constructor() {
    this.audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    this.audioWorker = new Worker(
      new URL('../workers/onsets-audio.worker', import.meta.url)
    );
  }

  splitFile(file: File) {
    return from(this.split(file)).pipe(
      switchMap((res) => from(this.encode(res)))
    );
  }

  private async split(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.decodeBuffer(arrayBuffer);
    const audioArray = audioBuffer.getChannelData(0);
    const audioSampleRate =
      audioBuffer.sampleRate || this.audioCtx.sampleRate || 44100;

    const promise = new Promise<{
      sampleRate: number;
      slices: any[];
    }>((resolve) => {
      this.audioWorker.onmessage = async (msg) => {
        if (msg.data.onsets?.length) {
          resolve({
            sampleRate: audioSampleRate,
            slices: msg.data.slices,
          });
        }
      };
    });

    this.audioWorker.postMessage({
      request: 'initParams',
      params: {
        sampleRate: audioSampleRate,
        frameSize: 1024,
        hopSize: 512,
        odfs: ['hfc', 'complex'],
        odfsWeights: [0.5, 0.5],
        sensitivity: 0.65,
      },
    });
    this.audioWorker.postMessage({
      request: 'analyse',
      audio: audioArray,
    });

    return promise;
  }

  private async encode(result: { sampleRate: number; slices: any[] }) {
    let resampledSlices: AudioBuffer[] = [];

    for (let i = 0; i < result.slices.length; i++) {
      let buffer = this.audioCtx.createBuffer(
        1,
        result.slices[i].length,
        result.sampleRate
      );
      let data = buffer.getChannelData(0);
      for (let j = 0; j < result.slices[i].length; j++)
        data[j] = result.slices[i][j];
      let resampledBuffer: AudioBuffer = await this.resample(buffer, 44100); // audioEncoder only supports 44100hz sampling rate
      resampledSlices.push(resampledBuffer);
    }

    let blobs = resampledSlices.map((sliceBuffer) => {
      return audioEncoder(sliceBuffer, 'WAV', null, null);
    });

    let encodedSlices = blobs.map((b, idx) => {
      return {
        name: `${idx}.wav`,
        blob: b,
      };
    });

    return encodedSlices;
  }

  private async decodeBuffer(arrayBuffer: ArrayBuffer) {
    return new Promise<AudioBuffer>((resolve, reject) => {
      this.audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  private async resample(
    sourceAudioBuffer: AudioBuffer,
    targetSampleRate: number
  ) {
    let offlineCtx = new OfflineAudioContext(
      sourceAudioBuffer.numberOfChannels,
      sourceAudioBuffer.duration * targetSampleRate,
      targetSampleRate
    );
    // Play it from the beginning.
    let offlineSource = offlineCtx.createBufferSource();
    offlineSource.buffer = sourceAudioBuffer;
    offlineSource.connect(offlineCtx.destination);
    offlineSource.start();
    let resampled = await offlineCtx.startRendering();
    return resampled;
  }
}
