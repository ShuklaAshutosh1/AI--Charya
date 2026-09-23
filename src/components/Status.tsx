import { AlertCircle, LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Loading your learning space…" }: { label?: string }) {
  return (
    <div className="state-message" role="status">
      <LoaderCircle className="spin" size={20} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-message state-message--error" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>Something interrupted this step</strong>
        <span>{message}</span>
      </div>
      {retry && (
        <button className="button button--quiet" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
