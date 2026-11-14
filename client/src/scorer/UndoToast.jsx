export default function UndoToast({ toast, onUndo }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast.text}</span>
      <button onClick={() => onUndo(toast.entryId)}>Undo</button>
    </div>
  );
}
