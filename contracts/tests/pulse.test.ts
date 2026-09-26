import { describe, expect, it } from "vitest";
import { Cl, ClarityType, type ClarityValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;
const carol = accounts.get("wallet_3")!;

function pub(fn: string, args: ClarityValue[], sender: string): ClarityValue {
  const { result } = simnet.callPublicFn("pulse", fn, args, sender);
  return result;
}

function ro(fn: string, args: ClarityValue[], sender: string): ClarityValue {
  const { result } = simnet.callReadOnlyFn("pulse", fn, args, sender);
  return result;
}

function createPoll(
  sender: string,
  question = "Best option?",
  options = ["Alpha", "Beta", "Gamma"],
  category = "tech",
  duration = 1440
): ClarityValue {
  return pub(
    "create-poll",
    [
      Cl.stringUtf8(question),
      Cl.list(options.map((o) => Cl.stringUtf8(o))),
      Cl.stringUtf8(category),
      Cl.uint(duration),
    ],
    sender
  );
}

function deep(cv: any): any {
  if (cv === null || cv === undefined || typeof cv !== "object" || !("type" in cv)) return cv;
  switch (cv.type) {
    case ClarityType.OptionalSome:
      return deep(cv.value);
    case ClarityType.OptionalNone:
      return null;
    case ClarityType.Tuple: {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(cv.value)) out[k] = deep(cv.value[k]);
      return out;
    }
    case ClarityType.List:
      return (cv.value as any[]).map(deep);
    case ClarityType.ResponseOk:
    case ClarityType.ResponseErr:
      return deep(cv.value);
    default:
      return cv.value;
  }
}

function getPoll(id: number, sender: string): Record<string, unknown> | null {
  return deep(ro("get-poll", [Cl.uint(id)], sender));
}

describe("pulse", () => {
  describe("create poll", () => {
    it("assigns sequential ids and increments total polls", () => {
      expect(ro("get-total-polls", [], deployer)).toBeUint(0);

      expect(createPoll(deployer, "Question one?")).toBeOk(Cl.uint(1));
      expect(createPoll(alice, "Question two?", ["Yes", "No"], "politics", 720)).toBeOk(Cl.uint(2));

      expect(ro("get-total-polls", [], deployer)).toBeUint(2);
    });

    it("stores the poll and returns it from get-poll", () => {
      createPoll(deployer, "Best developer setup?", ["Dual monitors", "Ultrawide", "Laptop only"], "tech", 1440);
      const poll = getPoll(1, deployer);
      expect(poll).not.toBeNull();
      expect(poll!.question).toBe("Best developer setup?");
      expect(poll!.options).toEqual(["Dual monitors", "Ultrawide", "Laptop only"]);
      expect(poll!.category).toBe("tech");
      expect(poll!.creator).toBe(deployer);
      expect(Number(poll!["total-votes"])).toBe(0);
      expect(Number(poll!["expires-at"])).toBeGreaterThan(Number(poll!["created-at"]));
    });

    it("rejects invalid poll input", () => {
      expect(createPoll(deployer, "", ["Alpha", "Beta"])).toBeErr(Cl.uint(104));
      expect(createPoll(deployer, "Q?", ["Only one"])).toBeErr(Cl.uint(104));
      expect(createPoll(deployer, "Q?", ["Alpha", ""])).toBeErr(Cl.uint(104));
      expect(createPoll(deployer, "Q?", ["Alpha", "Beta"], "")).toBeErr(Cl.uint(104));
      expect(createPoll(deployer, "Q?", ["Alpha", "Beta"], "tech", 0)).toBeErr(Cl.uint(104));
    });
  });

  describe("voting", () => {
    it("records a successful vote and updates results", () => {
      createPoll(deployer);

      expect(pub("vote", [Cl.uint(1), Cl.uint(0)], alice)).toBeOk(Cl.uint(0));

      expect(ro("has-voted", [Cl.uint(1), Cl.principal(alice)], alice)).toBeSome(Cl.uint(0));

      expect(ro("get-results", [Cl.uint(1)], deployer)).toBeOk(
        Cl.tuple({
          counts: Cl.list([Cl.uint(1), Cl.uint(0), Cl.uint(0), Cl.uint(0)]),
          total: Cl.uint(1),
        })
      );

      const poll = getPoll(1, deployer);
      expect(Number(poll!["total-votes"])).toBe(1);
    });

    it("rejects a duplicate vote from the same wallet", () => {
      createPoll(deployer);
      expect(pub("vote", [Cl.uint(1), Cl.uint(0)], alice)).toBeOk(Cl.uint(0));

      expect(pub("vote", [Cl.uint(1), Cl.uint(1)], alice)).toBeErr(Cl.uint(102));
    });

    it("rejects votes on an invalid poll", () => {
      expect(pub("vote", [Cl.uint(999), Cl.uint(0)], alice)).toBeErr(Cl.uint(100));
      expect(ro("get-results", [Cl.uint(999)], deployer)).toBeErr(Cl.uint(100));
      expect(ro("get-poll", [Cl.uint(999)], deployer)).toBeNone();
    });

    it("rejects an out-of-range option", () => {
      createPoll(deployer);
      expect(pub("vote", [Cl.uint(1), Cl.uint(5)], alice)).toBeErr(Cl.uint(101));
    });

    it("rejects voting after the poll expires", () => {
      createPoll(deployer, "Short poll?", ["Yes", "No"], "community", 10);
      simnet.mineEmptyBlocks(11);

      expect(pub("vote", [Cl.uint(1), Cl.uint(0)], alice)).toBeErr(Cl.uint(103));
    });

    it("increases result counts as more wallets vote", () => {
      createPoll(deployer);

      expect(pub("vote", [Cl.uint(1), Cl.uint(0)], alice)).toBeOk(Cl.uint(0));
      expect(pub("vote", [Cl.uint(1), Cl.uint(0)], bob)).toBeOk(Cl.uint(0));
      expect(pub("vote", [Cl.uint(1), Cl.uint(1)], carol)).toBeOk(Cl.uint(1));

      expect(ro("get-results", [Cl.uint(1)], deployer)).toBeOk(
        Cl.tuple({
          counts: Cl.list([Cl.uint(2), Cl.uint(1), Cl.uint(0), Cl.uint(0)]),
          total: Cl.uint(3),
        })
      );
    });

    it("tracks wallet-specific vote state", () => {
      createPoll(deployer);

      expect(ro("has-voted", [Cl.uint(1), Cl.principal(alice)], deployer)).toBeNone();

      expect(pub("vote", [Cl.uint(1), Cl.uint(2)], alice)).toBeOk(Cl.uint(2));
      expect(pub("vote", [Cl.uint(1), Cl.uint(1)], bob)).toBeOk(Cl.uint(1));

      expect(ro("has-voted", [Cl.uint(1), Cl.principal(alice)], deployer)).toBeSome(Cl.uint(2));
      expect(ro("has-voted", [Cl.uint(1), Cl.principal(bob)], deployer)).toBeSome(Cl.uint(1));
      expect(ro("has-voted", [Cl.uint(1), Cl.principal(carol)], deployer)).toBeNone();
    });
  });

  describe("read-only helpers", () => {
    it("returns a bigint chain height", () => {
      const height = ro("get-current-height", [], deployer) as { value: bigint };
      expect(typeof height.value).toBe("bigint");
      expect(height.value >= 0n).toBe(true);
    });

    it("keeps poll state independent across polls", () => {
      createPoll(deployer, "Poll A?", ["One", "Two"], "sports");
      createPoll(deployer, "Poll B?", ["Red", "Blue"], "culture");

      expect(pub("vote", [Cl.uint(1), Cl.uint(0)], alice)).toBeOk(Cl.uint(0));
      expect(ro("has-voted", [Cl.uint(2), Cl.principal(alice)], deployer)).toBeNone();

      expect(ro("get-results", [Cl.uint(2)], deployer)).toBeOk(
        Cl.tuple({
          counts: Cl.list([Cl.uint(0), Cl.uint(0), Cl.uint(0), Cl.uint(0)]),
          total: Cl.uint(0),
        })
      );
    });
  });
});
