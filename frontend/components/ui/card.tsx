import { cn } from "@/lib/cn";

type Props = React.HTMLAttributes<HTMLDivElement> & { featured?: boolean; dark?: boolean };

/** Content card: 24px radius, hairline border. `dark` is the black hero card; `featured` floats it. */
export function Card({ featured, dark, className, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-md p-6 md:p-8",
        dark ? "bg-primary text-on-primary" : "border border-hairline bg-canvas text-ink",
        featured && "shadow-layer-2",
        className,
      )}
    />
  );
}

/** Product-mockup card: 40px radius with one sharp corner, floating over a mint band. */
export function FeatureCard({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cn("rounded-card rounded-tl-none bg-canvas p-6 shadow-layer-3", className)} />;
}
