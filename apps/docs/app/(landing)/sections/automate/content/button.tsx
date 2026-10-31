export interface ButtonProps {
  /** The text inside the button. */
  label: string;
  /** Renders a link instead. */
  href?: string;
  /** @deprecated Use `className`. */
  color?: string;
  /** Called when it is pressed. */
  onPress?: () => void;
}

const base = 'inline-flex rounded-full border px-4 py-1.5 text-sm font-medium no-underline';

export function Button({ label, href, onPress }: ButtonProps) {
  // a link is the secondary form, an action the primary one
  if (href)
    return (
      <a href={href} className={`${base} bg-fd-secondary text-fd-secondary-foreground`}>
        {label}
      </a>
    );
  return (
    <button
      type="button"
      className={`${base} border-fd-primary bg-fd-primary text-fd-primary-foreground`}
      onClick={onPress}
    >
      {label}
    </button>
  );
}
