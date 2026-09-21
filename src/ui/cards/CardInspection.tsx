import { useState } from "react";
import type { Card } from "../../game/model";
import type { Inspect } from "./inspection";
import { Modal } from "../shared/Modal";
import { Icon } from "../shared/Icon";
import { CardView } from "./CardView";
export function CardInspection({
  inspection,
  close,
}: {
  inspection: NonNullable<Inspect>;
  close: () => void;
}) {
  const [inspectedCard, setInspectedCard] = useState<Card | null>(null);
  return (
    <Modal title={`${inspection.title} · ${inspection.cards.length}`} close={close} wide>
      {inspectedCard ? (
        <>
          <p>Every card has one improvement. Visit a camp to improve this copy.</p>
          <div className="upgrade-compare">
            <CardView card={inspectedCard} />
            {!inspectedCard.upgraded && (
              <>
                <Icon name="arrow" size={30} />
                <CardView card={{ ...inspectedCard, upgraded: true }} preview />
              </>
            )}
          </div>
          <button onClick={() => setInspectedCard(null)}>Back to cards</button>
        </>
      ) : inspection.cards.length ? (
        <>
          <p className="muted">Select a card to inspect its improvement.</p>
          <div className="deck-grid">
            {inspection.cards.map((card) => (
              <CardView key={card.uid} card={card} onClick={() => setInspectedCard(card)} />
            ))}
          </div>
        </>
      ) : (
        <p>There are no cards here.</p>
      )}
    </Modal>
  );
}
