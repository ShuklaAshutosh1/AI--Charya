import {
  Atom,
  Binary,
  BookOpenText,
  Calculator,
  Languages,
  Landmark,
  type LucideIcon
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  mathematics: Calculator,
  science: Atom,
  english: BookOpenText,
  "social-science": Landmark,
  "computer-science": Binary,
  hindi: Languages
};

export function LearningAreaIcon({ id, size = 20 }: { id: string; size?: number }) {
  const Icon = icons[id] ?? BookOpenText;
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
