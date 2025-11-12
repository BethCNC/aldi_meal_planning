import { splitInstructions } from '../../utils/textFormat';

export function InstructionList({instructions, variant = 'card'}) {
  const steps = splitInstructions(instructions);

  if (!steps.length) {
    return <p className="text-icon-subtle">No instructions available.</p>;
  }

  if (variant === 'list') {
    return (
      <ol className="list-decimal space-y-2 pl-6 text-sm leading-6 text-text-body">
        {steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li
          key={index}
          className="flex gap-3 rounded-2xl border border-border-subtle bg-surface-card p-4 shadow-sm"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-primary text-sm font-semibold text-text-display">
            {index + 1}
          </span>
          <p className="text-sm text-text-body leading-6">{step}</p>
        </li>
      ))}
    </ol>
  );
}

