"""Summarize retained CLI traces; pass the fresh campaign prefix as argv[1]."""
import collections
import gzip
import json
import pathlib
import sys

root = pathlib.Path("experiments/identity")
prefixes = ["concealment-v1", sys.argv[1]]
cards = ["break-formation", "fading-strike"]
groups = []
for label in ["conversion", "concealment"]:
    policies = ["build-aware", "exploratory"] + (["sampled"] if label == "concealment" else [])
    for policy in policies:
        for relic in ["shieldfire", "hushed-coal", "black-lantern"]:
            counts = collections.Counter()
            usage = {card: collections.Counter() for card in cards}
            seeds = set()
            for prefix in prefixes:
                path = root / f"{label}-{relic}-{policy}-{prefix}.jsonl.gz"
                with gzip.open(path, "rt") as source:
                    for line in source:
                        row = json.loads(line)
                        if row["kind"] != "journey":
                            raise ValueError(f"Unexpected fixed fight in {path}")
                        counts["runs"] += 1
                        seeds.add(row["seed"])
                        counts[row["outcome"]] += 1
                        counts["hp"] += row["hp"]
                        counts["turns"] += row["stats"]["turns"]
                        for decision in row.get("rewardEvaluations", []):
                            for alternative in decision["alternatives"]:
                                for trial in alternative["trials"]:
                                    counts["evaluationTrials"] += 1
                                    counts["evaluationWins"] += trial["won"]
                                    counts["evaluationTimeouts"] += trial["timeout"]
                        for card in cards:
                            usage[card]["finalDecks"] += any(c["def"] == card for c in row["finalDeck"])
                        for event in row["history"]:
                            action = event["action"]
                            before = event["before"]["scene"]
                            after = event["after"]["scene"]
                            if action["type"] == "reward":
                                counts["rewardScreens"] += 1
                                counts["skipped"] += action["card"] is None
                                for card in cards:
                                    usage[card]["offered"] += card in before["cards"]
                                    usage[card]["selected"] += action["card"] == card
                            if action["type"] not in ["play", "work"]:
                                continue
                            selected = next(c for c in before["hand"] if c["uid"] == action["uid"])
                            if selected["def"] not in usage:
                                continue
                            metric = usage[selected["def"]]
                            metric[action["type"]] += 1
                            if action["type"] == "play":
                                metric["positiveBlockPlays"] += before["block"] > 0
                                metric["aboveLowBandPlays"] += before["dread"] > 3
                                if after["kind"] == "combat":
                                    metric["dreadReduced"] += max(0, before["dread"] - after["dread"])
                                    metric["crossedLowBand"] += before["dread"] > 3 and after["dread"] <= 3
                                metric["erynActivations"] += event["accounting"].get("ember", {}).get("hero") == "Eryn"
            if counts["runs"] != (10 if policy == "sampled" else 40):
                raise ValueError(f"Incomplete campaign: {label}/{policy}/{relic}")
            groups.append(dict(label=label, policy=policy, relic=relic, seeds=sorted(seeds), **counts, cards=usage))

with gzip.open(root / "concealment-study.jsonl.gz", "rt") as source:
    fights = [json.loads(line) for line in source]

def key(row):
    return tuple(row[k] for k in ["deck", "encounter", "relic", "weight", "seed"])

candidate = {key(row): row for row in fights if row["card"] == "fading-strike"}
pairs = {}
for card in ["needle", "silence"]:
    counts = collections.Counter()
    for old in fights:
        if old["card"] != card:
            continue
        new = candidate[key(old)]
        counts["pairs"] += 1
        counts["hpNew" if new["hp"] > old["hp"] else "hpOld" if new["hp"] < old["hp"] else "hpTie"] += 1
        counts["fasterNew" if new["turns"] < old["turns"] else "fasterOld" if new["turns"] > old["turns"] else "turnTie"] += 1
    pairs[card] = counts
result = dict(prefixes=prefixes, journeys=groups, constructed=dict(
    runs=len(fights), wins=sum(r["won"] for r in fights), timeouts=sum(r["timeout"] for r in fights),
    seeds=sorted({r["seed"] for r in fights}), pairs=pairs,
))
output = root / "concealment-metrics.json"
output.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
