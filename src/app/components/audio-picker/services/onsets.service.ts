import { Injectable } from '@angular/core';
// @ts-ignore
import { from, map, Observable, tap } from 'rxjs';

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

  analyzeFile(file: File): Observable<number[]> {
    return from(this.split(file)).pipe(
      map((res) => this.measureSlices(res)),
      tap((onsets) => console.info('onsets analyzed', onsets))
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
      request: 'analyze',
      audio: audioArray,
    });

    return promise;
  }

  private measureSlices(result: {
    sampleRate: number;
    slices: any[];
  }): number[] {
    return result.slices.map((slice) => slice.length / result.sampleRate);
  }

  private async decodeBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise<AudioBuffer>((resolve, reject) => {
      this.audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }
}
