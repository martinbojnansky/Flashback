import { Injectable } from '@angular/core';
// @ts-ignore
import { from, switchMap } from 'rxjs';
import { simpleMp3 } from 'simple-mp3';

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
    const buffers: AudioBuffer[] = [];

    for (let i = 0; i < result.slices.length; i++) {
      let buffer = this.audioCtx.createBuffer(
        1,
        result.slices[i].length,
        result.sampleRate
      );
      let data = buffer.getChannelData(0);
      for (let j = 0; j < result.slices[i].length; j++)
        data[j] = result.slices[i][j];
      buffers.push(buffer);
    }

    let slices = buffers.map((sliceBuffer) => {
      const numberOfChannels = sliceBuffer.numberOfChannels;
      const channelData: Float32Array[] = [];
      for (let i = 0; i < numberOfChannels; ++i) {
        channelData.push(sliceBuffer.getChannelData(i));
      }
      // TODO: Try to use FFmpeg 'ffmpeg -i input.raw -acodec libmp3 output.mp3'
      const mp3Data = simpleMp3({
        channelData,
        sampleRate: sliceBuffer.sampleRate,
      });
      return URL.createObjectURL(new Blob(mp3Data, { type: 'audio/mpeg' }));
    });

    return slices;
  }

  private async decodeBuffer(arrayBuffer: ArrayBuffer) {
    return new Promise<AudioBuffer>((resolve, reject) => {
      this.audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }
}
