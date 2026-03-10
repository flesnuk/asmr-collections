import { WORK_ID_REGEX } from '../constants';

export interface ParsedWorkInput {
  isEmpty: boolean
  isValid: boolean
  validIds: string[]
}

export function parseWorkInput(input: string | undefined): ParsedWorkInput {
  if (!input) {
    return {
      isEmpty: true,
      isValid: false,
      validIds: []
    };
  }

  const stats: ParsedWorkInput = {
    isEmpty: input.trim().length === 0,
    isValid: false,
    validIds: []
  };

  const matches = input.match(WORK_ID_REGEX);
  if (!matches) return stats;

  stats.validIds = Array.from(new Set(matches.map(id => id.toUpperCase())));
  stats.isValid = stats.validIds.length > 0;

  return stats;
}
