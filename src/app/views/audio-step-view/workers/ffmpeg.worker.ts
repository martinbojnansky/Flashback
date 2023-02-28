/// <reference lib="webworker" />

import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

addEventListener(
  'message',
  async (scope: { data: { file: File; params: string[] } }) => {
    await ffmpeg.load();
    ffmpeg.FS(
      'writeFile',
      scope.data.file.name,
      await fetchFile(scope.data.file)
    );
    await ffmpeg.run(...scope.data.params);
    postMessage({
      url: URL.createObjectURL(
        new Blob([ffmpeg.FS('readFile', 'output.mp4').buffer], {
          type: 'video/mp4',
        })
      ),
    });
  }
);
