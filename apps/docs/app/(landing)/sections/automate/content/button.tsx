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
