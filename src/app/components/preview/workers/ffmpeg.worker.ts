/// <reference lib="webworker" />

import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import * as moment from 'moment';
import { Video } from 'src/app/models/video';

const ffmpeg = createFFmpeg({ log: true });
let loaded = false;

addEventListener(
  'message',
  async (scope: { data: { videos: Video[]; files: File[] } }) => {
    if (!loaded) {
      await ffmpeg.load();
      loaded = true;
    }

    let timelineTxt = '';

    // Trim and save all videos
    for (let i = 0; i < scope.data.videos.length; i++) {
      const video = scope.data.videos[i];
      const file = scope.data.files[i];
      if (file) {
        const trimmedFileName = `${file.name}`;
        timelineTxt += `\nfile ${trimmedFileName}`;

        ffmpeg.FS('writeFile', file.name, await fetchFile(file));

        await ffmpeg.run(
          '-i',
          file.name,
          '-ss',
          formatTime(video.trimStart),
          '-to',
          formatTime(video.trimStart + video.duration),
          '-c',
          'copy',
          trimmedFileName
        );
      } else {
        // TODO: Generate black screen
      }
    }

    // Save video list
    const timelineFileName = 'timeline.txt';
    ffmpeg.FS('writeFile', timelineFileName, timelineTxt.substring(1));
    console.log(timelineTxt.substring(1));

    // Merge all videos
    const previewFileName = 'preview.mp4'; // TODO: Inherit file type!
    await ffmpeg.run(
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      timelineFileName,
      '-c',
      'copy',
      previewFileName
    );

    let previewFile: Uint8Array | null = null;
    try {
      previewFile = ffmpeg.FS('readFile', previewFileName);
    } catch {}

    postMessage({
      url: previewFile
        ? URL.createObjectURL(
            new Blob([previewFile.buffer], {
              type: 'video/mp4', // TODO: Inherit file type!
            })
          )
        : null,
    });
  }
);

const formatTime = (totalSeconds: number) => {
  return moment(new Date(2023, 1, 1, 0, 0, 0, 0))
    .add(totalSeconds, 'seconds')
    .format('HH:mm:ss.SSS');
};
