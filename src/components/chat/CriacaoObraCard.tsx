import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CriacaoObraCardData, ObraSimilar } from "@/lib/criarObraChatFlow";

interface CriacaoObraCardProps {
  card: CriacaoObraCardData;
  ativo: boolean;
  onUsarDuplicata: (obra: ObraSimilar) => void;
  onIgnorarDuplicata: () => void;
}

export function CriacaoObraCard({ card, ativo, onUsarDuplicata, onIgnorarDuplicata }: CriacaoObraCardProps) {
  return (
    <div className={ativo ? "" : "opacity-60 pointer-events-none"}>
      {card.kind === "duplicata" && (
        <Card className="rounded-2xl mt-2">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">{card.obra.nome}</p>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-xl flex-1" onClick={() => onUsarDuplicata(card.obra)}>
                Usar essa obra
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={onIgnorarDuplicata}>
                Criar mesmo assim
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
