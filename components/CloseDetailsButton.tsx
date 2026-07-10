'use client';

type CloseDetailsButtonProps = {
  className?: string;
};

export default function CloseDetailsButton({ className = '' }: CloseDetailsButtonProps) {
  return (
    <button
      type="button"
      aria-label="Close panel"
      className={className}
      onClick={(event) => {
        const details = event.currentTarget.closest('details');
        if (details) details.open = false;
      }}
    >
      <span aria-hidden="true">&times;</span>
    </button>
  );
}
