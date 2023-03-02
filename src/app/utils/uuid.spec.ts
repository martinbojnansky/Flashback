import { uuid } from './uuid';

describe('uuid', () => {
  it('should be unique', () => {
    expect(uuid()).not.toEqual(uuid());
  });
});
