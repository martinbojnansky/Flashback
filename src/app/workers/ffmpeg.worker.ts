/// <reference lib="webworker" />

import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import * as moment from 'moment';
import { Video } from 'src/app/models/video';
import { environment } from 'src/environments/environment';

export interface FfmpegWorkerCommands {
  saveAudio: [File, {}];
  saveVideo: [Video, {}];
  trimVideo: [Video, {}];
  deleteVideo: [{ video: Video; deleteSourceFile: boolean }, {}];
  buildTimeline: [Video[], {}];
  generatePreview: [{}, string | undefined];
  _idle: [void, {}];
}

export interface FfmpegWorkerCommand<
  T extends keyof FfmpegWorkerCommands = keyof FfmpegWorkerCommands
> {
  type: T;
  payload: FfmpegWorkerCommands[T][0];
}

export type FfmpegWorkerResponse<
  T extends keyof FfmpegWorkerCommands = keyof FfmpegWorkerCommands
> = {
  type: T;
  payload: FfmpegWorkerCommands[T][1];
};

const ffmpeg = createFFmpeg();

ffmpeg.setLogger(({ type, message }) => {
  if (environment.ffmpeg.log) {
    console.log(`%c${type} ${message}`, 'color: gray');
  }
});

ffmpeg.setProgress(({ ratio }) => {
  if (environment.ffmpeg.log) {
    console.log(
      `%c[ffmpeg.progress] ${((ratio || 0) * 100).toFixed(0)}%`,
      'color: gray'
    );
  }
});

const queue: FfmpegWorkerCommand[] = [];
let idle: boolean = true;

addEventListener('message', async (message: { data: FfmpegWorkerCommand }) => {
  queue.push(message.data);
  if (idle) {
    await next();
  }
});

const next = async () => {
  idle = false;
  const cmd = queue.shift();
  if (cmd) {
    console.info('processing next', cmd);
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }
    let res: any;
    switch (cmd.type) {
      case 'saveAudio':
        res = await saveAudio(cmd as FfmpegWorkerCommand<'saveAudio'>);
        break;
      case 'saveVideo':
        res = await saveVideo(cmd as FfmpegWorkerCommand<'saveVideo'>);
        break;
      case 'trimVideo':
        res = await trimVideo(cmd as FfmpegWorkerCommand<'trimVideo'>);
        break;
      case 'buildTimeline':
        res = await buildTimeline(cmd as FfmpegWorkerCommand<'buildTimeline'>);
        break;
      case 'generatePreview':
        res = await generatePreview(
          cmd as FfmpegWorkerCommand<'generatePreview'>
        );
        break;
      case 'deleteVideo':
        res = deleteVideo(cmd as FfmpegWorkerCommand<'deleteVideo'>);
        break;
      default:
        console.error('unknown command received', cmd);
        break;
    }
    postMessage(res);
    console.info('processed', cmd);
    await next();
  } else {
    idle = true;
    console.info('idle, nothing else to process');
    postMessage(<FfmpegWorkerResponse<'_idle'>>{
      type: '_idle',
      payload: {},
    });
  }
};

const saveAudio = async (
  cmd: FfmpegWorkerCommand<'saveAudio'>
): Promise<FfmpegWorkerResponse<'saveAudio'>> => {
  const name = 'audio.mp3';
  ffmpeg.FS('writeFile', name, cmd.payload ? await fetchFile(cmd.payload) : '');
  console.info(`saved audio ${name}`);
  return {
    type: 'saveAudio',
    payload: {},
  };
};

const saveVideo = async (
  cmd: FfmpegWorkerCommand<'saveVideo'>
): Promise<FfmpegWorkerResponse<'saveVideo'>> => {
  const name = cmd.payload.file?.name || '';
  ffmpeg.FS(
    'writeFile',
    name,
    cmd.payload.file ? await fetchFile(cmd.payload.file) : ''
  );
  console.info(`saved video ${name}`);
  return {
    type: 'saveVideo',
    payload: {},
  };
};

const trimVideo = async (
  cmd: FfmpegWorkerCommand<'trimVideo'>
): Promise<FfmpegWorkerResponse<'trimVideo'>> => {
  const video: Video = cmd.payload;

  if (video.file) {
    // Pre-trim using key-frame matching to avoid lagging
    const preTrimmedVideoFileName = `pre-trimmed_${video.id}.mp4`;
    await ffmpeg.run(
      '-ss',
      formatTime(video.trimStart),
      '-i',
      video.file.name,
      '-t',
      formatTime(video.duration),
      '-c',
      'copy',
      '-avoid_negative_ts',
      '1',
      preTrimmedVideoFileName
    );

    // Trim one more time to get exact length of the video
    const trimmedVideoFileName = `trimmed_${video.id}.mp4`;
    await ffmpeg.run(
      '-i',
      preTrimmedVideoFileName,
      '-t',
      formatTime(video.duration),
      '-c',
      'copy',
      trimmedVideoFileName
    );

    // Unlink temporary pre-trimmed video file.
    ffmpeg.FS('unlink', preTrimmedVideoFileName);

    // Trim audio
    const trimmedAudioFileName = `audio_${video.id}.mp3`;
    await ffmpeg.run(
      '-i',
      'audio.mp3',
      '-ss',
      formatTime(video.startTime),
      '-t',
      formatTime(video.duration),
      '-c',
      'copy',
      trimmedAudioFileName
    );

    // Add trimmed audio to trimmed video
    const videoFileName = `${video.id}.mp4`;
    await ffmpeg.run(
      '-i',
      trimmedVideoFileName,
      '-i',
      trimmedAudioFileName,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c',
      'copy',
      videoFileName
    );

    // Unlink trimmed files
    ffmpeg.FS('unlink', trimmedVideoFileName);
    ffmpeg.FS('unlink', trimmedAudioFileName);
  }

  return {
    type: 'trimVideo',
    payload: {},
  };
};

const deleteVideo = (
  cmd: FfmpegWorkerCommand<'deleteVideo'>
): FfmpegWorkerResponse<'deleteVideo'> => {
  ffmpeg.FS('unlink', `${cmd.payload.video.id}.mp4`);
  if (cmd.payload.deleteSourceFile && cmd.payload.video.file) {
    ffmpeg.FS('unlink', cmd.payload.video.file?.name);
  }
  console.info(
    `deleted video ${cmd.payload.video.id}.mp4 ${
      cmd.payload.deleteSourceFile ? 'and its' : 'but not its'
    } source file ${cmd.payload.video.file?.name}.`
  );
  return {
    type: 'deleteVideo',
    payload: {},
  };
};

const buildTimeline = async (
  cmd: FfmpegWorkerCommand<'buildTimeline'>
): Promise<FfmpegWorkerResponse<'buildTimeline'>> => {
  const name = 'timeline.txt';
  const contents = cmd.payload
    .sort((a, b) => a.startIndex - b.startIndex)
    .map((v) => `file ${v.id}.mp4`);
  ffmpeg.FS('writeFile', name, contents.join('\n'));
  console.info(`timeline ${name} built`, contents);
  return {
    type: 'buildTimeline',
    payload: {},
  };
};

const generatePreview = async (
  cmd: FfmpegWorkerCommand<'generatePreview'>
): Promise<FfmpegWorkerResponse<'generatePreview'>> => {
  // Merge all videos into preview
  const previewFileName = 'preview.mp4';
  await ffmpeg.run(
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    'timeline.txt',
    '-c',
    'copy',
    previewFileName
  );

  // Try to read generated preview
  let url: string | undefined = undefined;
  try {
    const previewFile = ffmpeg.FS('readFile', previewFileName);
    url = URL.createObjectURL(
      new Blob([previewFile.buffer], {
        type: 'video/mp4',
      })
    );
    console.info('built preview', url);
  } catch {
    console.error('no preview built');
  }

  return {
    type: 'generatePreview',
    payload: url,
  };
};

const formatTime = (totalSeconds: number) => {
  return moment(new Date(2023, 1, 1, 0, 0, 0, 0))
    .add(totalSeconds * 1000, 'milliseconds')
    .format('HH:mm:ss.SSS');
};
