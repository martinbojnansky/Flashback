import * as moment from 'moment';

const dateRef = new Date(2023, 1, 1);

export const indexToDate = (index: number): Date => {
  return moment(dateRef).add(index, 'seconds').toDate();
};

export const dateToIndex = (date: Date): number => {
  return moment(date).diff(dateRef) / 1000;
};

export const indexToTime = (index: number, onsetLengths: number[]): number => {
  let time = 0;
  for (let i = 0; i <= index; i++) {
    time += onsetLengths[i - 1] || 0;
  }
  return time;
};
