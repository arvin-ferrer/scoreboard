import ChamberLogo from '../../ChamberLogo.jsx';

// Awarding: three plinths. 3rd is revealed first, then 2nd, then 1st. `revealed` counts the steps taken (0 to 3).
// `fresh` lists places that were just revealed, so only those animate (a reload shows them already in place).
export default function Podium({ order, chambers, totals, revealed, fresh, animate }) {
  return (
    <div className="podium">
      {[2, 1, 3].map((place) => {
        const c = chambers.find((x) => x.id === order[place - 1]);
        const shown = revealed >= 4 - place && Boolean(c);
        const isFresh = animate && fresh.includes(place);
        return (
          <div key={place} className={`pod pod-${place} ${shown ? 'revealed' : ''} ${isFresh ? 'fresh' : ''}`} style={{ '--chamber': c?.colour }}>
            <div className="pod-who">
              {shown && (
                <>
                  <ChamberLogo chamber={c} />
                  <span className="pod-name">{c.name}</span>
                  <span className="pod-total">{totals[c.id] ?? 0}</span>
                </>
              )}
            </div>
            <div className="pod-block"><span>{place}</span></div>
          </div>
        );
      })}
    </div>
  );
}
