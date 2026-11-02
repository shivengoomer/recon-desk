import { cn } from "@/lib/cn";

type Props = React.HTMLAttributes<HTMLDivElement> & { featured?: boolean; dark?: boolean };

export function Card({ featured, dark, className, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-md p-6 md:p-3xl",
        dark ? "bg-primary text-on-primary" : "border border-hairline bg-canvas text-ink",
        featured && "shadow-layer-2",
        className,
      )}
    />
  );
}

export type Accent = "purple" | "pink" | "blue" | "orange" | "green";
const fills: Record<Accent, string> = {
  purple: "bg-accent-purple text-white",
  pink: "bg-accent-pink text-white",
  blue: "bg-accent-blue text-white",
  orange: "bg-accent-orange text-white",
  green: "bg-accent-green text-primary", // ink text for legibility on the lighter green
};

export function CategoryCard({ accent, className, ...rest }: React.HTMLAttributes<HTMLDivElement> & { accent: Accent }) {
  return <div {...rest} className={cn("rounded-md p-6 md:p-3xl", fills[accent], className)} />;
}
