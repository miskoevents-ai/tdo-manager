import { Card, Overline } from "@/components/ui/card";

export function ComingSoon({ fase, children }: { fase: number; children: React.ReactNode }) {
  return (
    <Card className="max-w-container-narrow">
      <Overline>Fase {fase}</Overline>
      <h2 className="mt-2 font-display text-h3 font-normal">Próximamente</h2>
      <p className="mt-3 text-small text-ink-secondary">{children}</p>
    </Card>
  );
}
