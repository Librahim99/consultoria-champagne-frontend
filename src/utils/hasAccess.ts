import { UserRank } from './enums';

export const hasAccess = (userRank: UserRank, allowed: UserRank[]): boolean => {
  return allowed.includes(userRank);
};
