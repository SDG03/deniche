import { describe, expect, it } from "vitest";
import { loyaltyCard, perkForRank, ranksToGrant, STAMPS_PER_REWARD } from "./loyalty";

describe("carte fidélité", () => {
  it("un cadeau tous les 3 tampons", () => {
    expect(STAMPS_PER_REWARD).toBe(3);
    expect(loyaltyCard(0)).toMatchObject({ stamps: 0, toNext: 3, earned: 0 });
    expect(loyaltyCard(2)).toMatchObject({ stamps: 2, toNext: 1, earned: 0 });
    expect(loyaltyCard(3)).toMatchObject({ stamps: 0, toNext: 3, earned: 1 });
    expect(loyaltyCard(7)).toMatchObject({ stamps: 1, toNext: 2, earned: 2 });
  });

  it("le premier cadeau est une boisson, puis les cadeaux tournent", () => {
    expect(perkForRank(1)).toBe("drink");
    expect(perkForRank(2)).toBe("snack");
    expect(perkForRank(5)).toBe("drink");
    expect(loyaltyCard(3).nextPerk).toBe("snack");
  });

  it("n'accorde jamais deux fois le même cadeau", () => {
    expect(ranksToGrant(3, [])).toEqual([1]);
    expect(ranksToGrant(3, [1])).toEqual([]);
    expect(ranksToGrant(6, [1])).toEqual([2]);
    expect(ranksToGrant(2, [])).toEqual([]);
  });

  it("ignore les valeurs négatives ou décimales", () => {
    expect(loyaltyCard(-4)).toMatchObject({ stamps: 0, earned: 0 });
    expect(loyaltyCard(3.9)).toMatchObject({ earned: 1 });
  });
});
