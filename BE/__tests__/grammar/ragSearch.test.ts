import { reciprocalRankFusion } from "../../src/service/ragSearch.service";

describe("RAG hybrid search", () => {
  it("RRF merges vector and keyword rankings", () => {
    const vector = [
      { id: "a", text: "chunk a" },
      { id: "b", text: "chunk b" },
    ];
    const keyword = [
      { id: "b", text: "chunk b" },
      { id: "c", text: "chunk c" },
    ];
    const fused = reciprocalRankFusion([vector, keyword]);
    expect(fused[0].id).toBe("b");
    expect(fused.map(f => f.id)).toEqual(expect.arrayContaining(["a", "b", "c"]));
  });
});
