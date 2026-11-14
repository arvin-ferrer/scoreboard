export default function OfflineBanner({ online, unsent, texts }) {
  if (online && unsent === 0) return null;
  return (
    <div className={`banner ${online ? 'sending' : 'offline'}`} role="alert">
      {online ? `${texts.sending} ${unsent}` : `${texts.offline}${unsent ? ` (${unsent} waiting)` : ''}`}
    </div>
  );
}
