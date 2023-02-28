/// <reference lib="webworker" />

// @ts-ignore
import { Essentia, EssentiaWASM } from 'essentia.js';
// @ts-ignore
import { PolarFFTWASM } from '../lib/polarFFT.module.js';
// @ts-ignore
import { OnsetsWASM } from '../lib/onsets.module.js'; // @ts-ignore

let essentia: any = null;

let allowedParams = [
  'sampleRate',
  'frameSize',
  'hopSize',
  'odfs',
  'odfsWeights',
  'sensitivity',
];
let params: any = {}; // changing odfs should require changing odfsWeights (at least length), and viceversa

// global storage for slicing
let signal: any = null;
let polarFrames: any = null;
let onsetPositions: any = null;

try {
  essentia = new Essentia(EssentiaWASM.EssentiaWASM);
} catch (err: any) {
  error(err);
}

addEventListener('message', ({ data }) => {
  switch (data.request) {
    case 'analyse': {
      log('received analyse cmd');
      // const signal = new Float32Array(data.audio);
      signal = data.audio;
      computeFFT();
      onsetPositions = computeOnsets();
      const slices = sliceAudio();

      postMessage({
        onsets: onsetPositions,
        slices: slices,
      });
      break;
    }
    case 'initParams': {
      let [suppliedParamList, newParams] = checkParams(data.params);
      params = { ...params, ...newParams }; // update existing params obj
      log(`updated the following params: ${suppliedParamList.join(',')}`);
      log('current params are: ');
      console.info(params);
      break;
    }
    case 'slice': {
      if (!signal) {
        error('no audio signal available for slicing');
        break;
      }
      if (!onsetPositions || onsetPositions.length <= 0) {
        error('no onset positions available for slicing');
        break;
      }

      const slices = sliceAudio();
      // log(slices);
      postMessage(slices);
      break;
    }
    default:
      error('Received message from main thread; no matching request found!');
      break;
  }
});

function log(msg: string) {
  console.info('audio-worker info:', msg);
}
function error(msg: string) {
  throw Error(`audio-worker error: \n ${msg}`);
}

function computeFFT() {
  polarFrames = []; // clear frames from previous computation
  // algo instantiation
  let PolarFFT = new PolarFFTWASM.PolarFFT(params.frameSize);
  // frame cutting, windowing
  let frames = essentia.FrameGenerator(
    signal,
    params.frameSize,
    params.hopSize
  );

  for (let i = 0; i < frames.size(); i++) {
    let currentFrame = frames.get(i);

    let windowed = essentia.Windowing(currentFrame).frame;

    // PolarFFT
    const polar = PolarFFT.compute(essentia.vectorToArray(windowed)); // default: normalized true, size 1024, type 'hann'

    // save polar frames for reuse
    polarFrames.push(polar);
  }

  frames.delete();
  PolarFFT.shutdown();
}

function computeOnsets() {
  const alpha = 1 - params.sensitivity;
  const Onsets = new OnsetsWASM.Onsets(
    alpha,
    5,
    params.sampleRate / params.hopSize,
    0.02
  );

  // create ODF matrix to be input to the Onsets algorithm
  const odfMatrix: any[] = [];
  for (const func of params.odfs) {
    const odfArray = polarFrames?.map(
      (frame: { magnitude: any; phase: any }) => {
        return essentia.OnsetDetection(
          essentia.arrayToVector(essentia.vectorToArray(frame.magnitude)),
          essentia.arrayToVector(essentia.vectorToArray(frame.phase)),
          func,
          params.sampleRate
        ).onsetDetection;
      }
    );
    odfMatrix.push(Float32Array.from(odfArray));
  }

  // console.table(odfMatrix);
  const onsetPositions = Onsets.compute(
    odfMatrix,
    params.odfsWeights
  ).positions;
  Onsets.shutdown();
  // check possibly all zeros onsetPositions
  if (onsetPositions.size() == 0) {
    return new Float32Array(0);
  } else {
    return essentia.vectorToArray(onsetPositions);
  }
}

function sliceAudio() {
  // onsets: seconds to samples
  const onsetSamplePositions = Array.from(
    onsetPositions.map((pos: number) => Math.round(pos * params.sampleRate))
  );
  return onsetSamplePositions.map((samp, index) =>
    signal.slice(samp, onsetSamplePositions[index + 1])
  );
}

function checkParams(params: any) {
  // guard: check for empty params obj
  if (!params) {
    error('missing `params` object in the `updateParams` command');
    return [undefined, undefined];
  }
  let suppliedParamList = Object.keys(params);

  // guard: check obj properties for forbidden params
  if (!paramsAreAllowed(suppliedParamList)) {
    error(
      `illegal parameter(s) in 'updateParams' command \n - ${getUnsupportedParams(
        suppliedParamList
      ).join('\n - ')}`
    );
    return [undefined, undefined];
  }

  let newParams = params;

  odfParamsAreOkay(suppliedParamList, newParams);

  return [suppliedParamList, newParams];
}

function paramsAreAllowed(paramsList: any[]) {
  return paramsList.every((p) => allowedParams.includes(p));
}

function getUnsupportedParams(paramsList: any[]) {
  return paramsList.filter((p) => !allowedParams.includes(p));
}

function odfParamsAreOkay(
  paramList: string[],
  paramValues: { odfs: string | any[]; odfsWeights: string | any[] }
) {
  if (['odfs', 'odfsWeights'].some((p) => paramList.includes(p))) {
    let bothOnsetParamsChanged = ['odfs', 'odfsWeights'].every((p) =>
      paramList.includes(p)
    );
    if (bothOnsetParamsChanged) {
      let onsetParamsAreEqualLength =
        paramValues.odfs.length == paramValues.odfsWeights.length;
      if (onsetParamsAreEqualLength) {
        return 0;
      } else {
        error(
          'make sure `odfs` and `odfsWeights` are equal length, i.e. provide the same number of weights as ODF methods'
        );
      }
    } else {
      error('always update both `odfs` and `odfsWeights` params');
    }
  } else {
    return 0;
  }

  return 1;
}
