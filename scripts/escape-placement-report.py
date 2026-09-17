"""Compare the first two seeds of each recorded placement cohort."""
import collections
import gzip
import json
import pathlib
import sys

root = pathlib.Path("experiments/identity")
prefixes = ["concealment-v1", sys.argv[1]]
rows = []
for label in ["concealment", "late-escape"]:
    for prefix in prefixes:
        for relic in ["shieldfire", "hushed-coal", "black-lantern"]:
            path = root / f"{label}-{relic}-exploratory-{prefix}.jsonl.gz"
            with gzip.open(path, "rt") as source:
                for line in source:
                    row = json.loads(line)
                    if int(row["seed"].rsplit(":", 1)[1]) >= 2:
                        continue
                    metric = collections.Counter()
                    work_cards = collections.Counter()
                    played_cards = collections.Counter()
                    for event in row["history"]:
                        before = event["before"]["scene"]
                        after = event["after"]["scene"]
                        action = event["action"]
                        if before["kind"] != "combat" or "objective" not in before:
                            continue
                        metric["reached"] = 1
                        if action["type"] == "end":
                            metric["turnEnds"] += 1
                            metric["damageTaken"] += max(0, event["before"]["hp"] - event["after"]["hp"])
                        if action["type"] in ["work", "play"]:
                            card = next(c for c in before["hand"] if c["uid"] == action["uid"])
                            metric[action["type"]] += 1
                            metric["acquired_" + action["type"]] += card["uid"] > 12
                            metric["upgraded_" + action["type"]] += card["upgraded"]
                            (work_cards if action["type"] == "work" else played_cards)[card["def"]] += 1
                        if after["kind"] == "reward":
                            metric["completed"] += 1
                            snapshots = [f["run"]["scene"] for f in event["frames"] if f["run"]["scene"]["kind"] == "combat"]
                            if not snapshots:
                                raise ValueError("Missing post-action combat snapshot")
                            living = sum(e["hp"] > 0 for e in snapshots[-1]["enemies"])
                            metric["livingAtCompletion"] = living
                            metric["escapedWithEnemies"] = living > 0
                            metric["clearedEnemies"] = living == 0
                    rows.append(dict(label=label, seed=row["seed"], bot=row["bot"], relic=relic,
                                     outcome=row["outcome"], hp=row["hp"], objective=metric,
                                     worked=work_cards, played=played_cards))
summary = []
for label in ["concealment", "late-escape"]:
    selected = [r for r in rows if r["label"] == label]
    if len(selected) != 60:
        raise ValueError(f"Incomplete cohort: {label}")
    total = collections.Counter()
    work = collections.Counter()
    play = collections.Counter()
    for row in selected:
        total.update(row["objective"])
        work.update(row["worked"])
        play.update(row["played"])
    summary.append(dict(label=label, runs=len(selected), wins=sum(r["outcome"] == "win" for r in selected),
                        timeouts=sum(r["outcome"] == "timeout" for r in selected),
                        objective=total, worked=work, played=play))
result = dict(prefixes=prefixes, summary=summary, runs=rows)
(root / "escape-placement-metrics.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(summary, indent=2))
