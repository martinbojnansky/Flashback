/// <reference lib="webworker" />

import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import * as moment from 'moment';
import { Video } from 'src/app/models/video';

export type FfmpegWorkerCommand = FfmpegWorkerGeneratePreviewCommand;
export type FfmpegWorkerResponse = FfmpegWorkerGeneratePreviewResponse;

export interface FfmpegWorkerGeneratePreviewCommand {
  type: 'generatePreview';
  audio: File | null;
  videos: Video[];
}

export interface FfmpegWorkerGeneratePreviewResponse {
  type: 'generatePreview';
  url?: string;
}

const ffmpeg = createFFmpeg();

ffmpeg.setLogger(({ type, message }) => {
  console.log(`%c${type} ${message}`, 'color: gray');
});

ffmpeg.setProgress(({ ratio }) => {
  console.log(
    `%c[ffmpeg.progress] ${((ratio || 0) * 100).toFixed(0)}%`,
    'color: gray'
  );
});

const queue: FfmpegWorkerCommand[] = [];

addEventListener('message', async (message: { data: FfmpegWorkerCommand }) => {
  queue.push(message.data);
  if (queue.length === 1) {
    await next();
  }
});

const next = async () => {
  const cmd = queue.shift();
  if (cmd) {
    console.info('processing next', cmd);
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }
    let res: any;
    switch (cmd.type) {
      case 'generatePreview':
        res = await generatePreview(cmd);
        break;
      default:
        console.error('unknown command received', cmd);
        break;
    }
    postMessage(res);
    ffmpeg.exit();
    await next();
  } else {
    console.info('waiting, nothing else to process');
  }
};

const generatePreview = async (
  cmd: FfmpegWorkerGeneratePreviewCommand
): Promise<FfmpegWorkerGeneratePreviewResponse> => {
  let timelineTxtText = '';
  // Trim and save all videos
  for (let video of cmd.videos) {
    if (video.file) {
      ffmpeg.FS('writeFile', video.file.name, await fetchFile(video.file));
      const trimmedFileName = `${video.id}.mp4`;
      // https://trac.ffmpeg.org/wiki/Seeking
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
        trimmedFileName
      );
      timelineTxtText += `\nfile ${trimmedFileName}`;
    } else {
      // TODO: Generate black screen
    }
  }

  // Save video list
  const timelineFileName = 'timeline.txt';
  timelineTxtText = timelineTxtText.substring(1);
  ffmpeg.FS('writeFile', timelineFileName, timelineTxtText);
  console.info('created timeline.txt', timelineTxtText.split('\n'));

  // Merge all videos
  const mergedVideosFileName = 'merged.mp4';
  await ffmpeg.run(
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    timelineFileName,
    '-c',
    'copy',
    mergedVideosFileName
  );

  const previewFileName = 'preview.mp4';
  if (cmd.audio) {
    ffmpeg.FS('writeFile', cmd.audio.name, await fetchFile(cmd.audio));
    await ffmpeg.run(
      '-i',
      mergedVideosFileName,
      '-i',
      cmd.audio.name,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c',
      'copy',
      previewFileName
    );
  }

  let previewFile: Uint8Array | null = null;
  try {
    previewFile = ffmpeg.FS('readFile', previewFileName);
  } catch {}

  return {
    type: 'generatePreview',
    url: previewFile
      ? URL.createObjectURL(
          new Blob([previewFile.buffer], {
            type: 'video/mp4',
          })
        )
      : undefined,
  };
};

const formatTime = (totalSeconds: number) => {
  return moment(new Date(2023, 1, 1, 0, 0, 0, 0))
    .add(totalSeconds * 1000, 'milliseconds')
    .format('HH:mm:ss.SSS');
};
