"""Aggregate recorded engine transitions; no policy intent or fun claims."""
import collections
import gzip
import json
import sys

groups = collections.defaultdict(collections.Counter)
examples = []
for path in sys.argv[1:]:
    with gzip.open(path, "rt") as stream:
        for line in stream:
            row = json.loads(line)
            fight = row["kind"] == "fight"
            bot = row["config"]["bot"] if fight else row["bot"]
            deck = row["config"]["fixture"]["deckId"] if fight else "starter"
            encounter = row["config"]["encounterId"] if fight else "journey"
            key = "/".join([row["label"], row["kind"], bot, deck, encounter])
            counts = groups[key]
            counts["runs"] += 1
            counts[row["outcome"]] += 1
            counts["health"] += row["finalHealth"] if fight else row["hp"]
            counts["turns"] += row["turns"] if fight else row["stats"]["turns"]
            for step in row["replay"] if fight else row["history"]:
                before, after = step["before"], step["after"]
                action = step["selected"] if fight else step["action"]
                c, n = before["scene"], after["scene"]
                if c["kind"] != "combat":
                    if action["type"] == "reward":
                        counts["rewardsSkipped" if action["card"] is None else "rewardsSelected"] += 1
                        for card in c["cards"]:
                            counts["offer_" + card] += 1
                        if action["card"]:
                            counts["selected_" + action["card"]] += 1
                    if action["type"] == "travel":
                        node = next(x for x in before["route"] if x["id"] == action["node"])
                        counts["route_" + node["kind"]] += 1
                    continue
                counts["damage"] += after["stats"]["damage"] - before["stats"]["damage"]
                counts["healthLost"] += max(0, before["hp"] - after["hp"])
                if action["type"] == "bearer":
                    prefix = "startingBearer_" if c["ember"]["window"] == "choose" else "passedTo_"
                    counts[prefix + action["hero"]] += 1
                    if prefix == "passedTo_":
                        counts["passDread"] += n["dread"] - c["dread"]
                        counts["passesDuringObjective"] += bool(c.get("objective"))
                ember = step.get("accounting", {}).get("ember")
                if ember:
                    counts["ability_" + ember["hero"]] += 1
                    counts["bearerDamage"] += ember["damage"]
                    counts["bearerBlock"] += ember["block"]
                    counts["bearerDreadReduced"] += ember["dreadReduced"]
                if c.get("ember") and action["type"] == "end":
                    counts["turnsCarried_" + c["ember"]["bearer"]] += 1
                if n["kind"] != "combat":
                    counts["encountersWon" if n["kind"] == "reward" or n.get("won") else "encountersLost"] += 1
                    counts["encounterEndHealth"] += after["hp"]
                    if c.get("objective"):
                        counts["objectiveFinishes"] += 1
                        counts["objectiveEndHealth"] += after["hp"]
                        counts["objectiveEndTurn"] += c["turn"]
                        counts["objectiveWorkFinishes"] += action["type"] == "work"
                        if action["type"] == "work":
                            counts["objectiveEnemiesLeft"] += sum(e["hp"] > 0 for e in c["enemies"])
                if c.get("objective"):
                    if action["type"] == "work":
                        counts["work"] += 1
                        card = next(x for x in c["hand"] if x["uid"] == action["uid"])
                        counts["workCard_" + card["def"]] += 1
                    elif action["type"] == "end":
                        counts["objectiveEnds"] += 1
                        counts["objectiveEndsWithoutWork"] += c["objective"]["worked"] == 0
                        if c["objective"]["worked"] > 0 and before["hp"] > after["hp"]:
                            counts["workTurnsTakingDamage"] += 1
                if action["type"] == "end":
                    counts["ends"] += 1
                    if n["kind"] == "combat" and "shieldfire" in before["relics"]:
                        counts["blockRetained"] += n["block"]
                    band = "major" if c["dread"] >= 8 else "minor" if c["dread"] >= 4 else "none"
                    counts["ends_" + band] += 1
                    counts["dreadAtEnd"] += c["dread"]
                    if len(c.get("fired", [])) == 2:
                        counts["endsAfterBothHistoricalTriggers"] += 1
                    if c["dread"] >= 8 and row["label"] != "baseline":
                        counts["majorRelief"] += 4
                    # Explicitly a low-enemy-health proxy, not proof of inevitable victory.
                    if sum(e["hp"] for e in c["enemies"]) <= 6:
                        counts["endsWithAtMost6EnemyHP"] += 1
                elif action["type"] == "play":
                    card = next(x for x in c["hand"] if x["uid"] == action["uid"])
                    counts["plays"] += 1
                    counts["card_" + card["def"]] += 1
                    # Journey frames retain final effects even on the winning play.
                    if n["kind"] != "combat":
                        frames = [f["run"]["scene"] for f in step.get("frames", []) if f["run"]["scene"]["kind"] == "combat"]
                        if not frames:
                            counts["terminalEffectMeasurementsMissing"] += 1
                            continue
                        n = frames[-1]
                    for flag, name in [("coalUsed", "coalTriggers"), ("lanternUsed", "lanternTriggers")]:
                        counts[name] += bool(n.get("relicTurn", {}).get(flag) and not c.get("relicTurn", {}).get(flag))
                    delta = n["dread"] - c["dread"]
                    counts["cardDreadGenerated"] += max(0, delta)
                    counts["cardDreadReduced"] += max(0, -delta)
                    counts["blockGenerated"] += max(0, n["block"] - c["block"])
                    if delta < 0:
                        counts["loweringPlays"] += 1
                    for boundary, name in [(4, "minor"), (8, "major")]:
                        if c["dread"] < boundary <= n["dread"]:
                            counts["entered_" + name] += 1
                        if n["dread"] < boundary <= c["dread"]:
                            counts["loweredBelow_" + name] += 1
                            if len(examples) < 12 and row["label"] != "baseline":
                                examples.append({"group": key, "seed": before["seed"], "turn": c["turn"], "card": card["def"], "from": c["dread"], "to": n["dread"], "energy": c["energy"], "enemyHP": sum(e["hp"] for e in c["enemies"])})
print(json.dumps({"groups": groups, "loweringExamples": examples,
    "limits": ["Band crossings are observed, not inferred intentions.",
               "Fixed-fight terminal card effects are omitted where no final combat snapshot exists.",
               "At most 6 enemy HP is a cleanup proxy, not proof of inevitable victory.",
               "Full public-state planners are bounded and reward/route policy is fixed."]}, indent=2))
