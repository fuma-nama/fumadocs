// #region props
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
// #endregion props

export function Button({ label, href, onPress }: ButtonProps) {
  const className =
    'inline-flex rounded-full bg-fd-primary px-4 py-1.5 text-sm font-medium text-fd-primary-foreground no-underline';
  if (href)
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  return (
    <button type="button" className={className} onClick={onPress}>
      {label}
    </button>
  );
}
