import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartCombobox } from "@/components/ui/smart-combobox";
import { AlertTriangle, Check, X, Plus, Phone, Users, Star } from "lucide-react";
import { ALL_CATEGORIAS, isRecomendado } from "@/lib/regras-decisao";
import {
  classificacoes,
  type CriacaoObraCardData,
  type ObraSimilar,
  type Complexidade,
  type FornecedorSelecionado,
} from "@/lib/criarObraChatFlow";

interface CriacaoObraCardProps {
  card: CriacaoObraCardData;
  ativo: boolean;
  tiposObraOptions: { value: string; label: string }[];
  onSelecionarTipo: (tipo: string) => void;
  onCriarTipo: (nome: string) => void;
  onSelecionarClassificacao: (c: Complexidade) => void;
  onUsarDuplicata: (obra: ObraSimilar) => void;
  onIgnorarDuplicata: () => void;
  onConfirmarEscopo: () => void;
  onEditarDescricao: () => void;
  onRetryEscopo: () => void;
  classificacao: Complexidade;
  fornecedoresSelecionados: FornecedorSelecionado[];
  allFornecedores: { id: string; nome: string; email: string; tipo: string; categoria: string | null; score: number | null; telefone: string | null }[] | undefined;
  addFornecedorId: string;
  onChangeAddFornecedorId: (id: string) => void;
  onAdicionarFornecedor: () => void;
  onAlternarFornecedor: (f: FornecedorSelecionado) => void;
  onConfirmarCriacao: () => void;
}

export function CriacaoObraCard({
  card,
  ativo,
  tiposObraOptions,
  onSelecionarTipo,
  onCriarTipo,
  onSelecionarClassificacao,
  onUsarDuplicata,
  onIgnorarDuplicata,
  onConfirmarEscopo,
  onEditarDescricao,
  onRetryEscopo,
  classificacao,
  fornecedoresSelecionados,
  allFornecedores,
  addFornecedorId,
  onChangeAddFornecedorId,
  onAdicionarFornecedor,
  onAlternarFornecedor,
  onConfirmarCriacao,
}: CriacaoObraCardProps) {
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

      {card.kind === "tipo" && (
        <Card className="rounded-2xl mt-2">
          <CardContent className="p-4">
            <SmartCombobox
              options={tiposObraOptions}
              value=""
              onChange={onSelecionarTipo}
              onCreateNew={onCriarTipo}
              placeholder="Buscar ou selecionar tipo de obra..."
              emptyText="Nenhum tipo de obra cadastrado."
            />
          </CardContent>
        </Card>
      )}

      {card.kind === "complexidade" && (
        <div className="space-y-2 mt-2">
          {classificacoes.map((c) => (
            <button
              key={c.value}
              onClick={() => onSelecionarClassificacao(c.value)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-border bg-card hover:border-primary/40 transition-all text-left"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shrink-0`}>
                <span className="text-white font-bold text-sm">{c.label[0]}</span>
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {card.kind === "escopo" && (
        <div className="space-y-2 mt-2">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <h4 className="font-bold text-foreground text-sm mb-1">Descrição Estruturada</h4>
              <p className="text-xs text-muted-foreground whitespace-pre-line">{card.escopo.descricao_estruturada}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <h4 className="font-bold text-foreground text-sm mb-2">Necessidades / Materiais</h4>
              <div className="flex flex-wrap gap-1.5">
                {card.escopo.necessidades.map((n, i) => (
                  <Badge key={i} variant="secondary" className="rounded-full text-xs">{n}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <h4 className="font-bold text-foreground text-sm mb-1">Profissional Recomendado</h4>
              <p className="text-sm font-semibold text-primary capitalize">{card.escopo.profissional_recomendado}</p>
            </CardContent>
          </Card>
          {card.escopo.alertas_seguranca.length > 0 && (
            <Card className="rounded-2xl border-destructive/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <h4 className="font-bold text-destructive text-sm">Alertas de Segurança</h4>
                </div>
                <ul className="space-y-0.5">
                  {card.escopo.alertas_seguranca.map((a, i) => (
                    <li key={i} className="text-xs text-destructive/80">• {a}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="rounded-xl flex-1" onClick={onConfirmarEscopo}>
              <Check className="h-4 w-4 mr-1" /> Continuar
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={onEditarDescricao}>
              Editar descrição
            </Button>
          </div>
        </div>
      )}

      {card.kind === "escopo_erro" && (
        <Card className="rounded-2xl border-destructive/30 mt-2">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm text-destructive">{card.mensagem}</p>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={onRetryEscopo}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {card.kind === "fornecedores" && (
        <div className="space-y-2 mt-2">
          {fornecedoresSelecionados.length > 0 ? (
            fornecedoresSelecionados.map((f) => {
              const catLabel = ALL_CATEGORIAS.find((c) => c.value === f.categoria)?.label;
              return (
                <Card key={f.id} className="rounded-2xl">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-foreground text-sm truncate">{f.nome}</p>
                        {isRecomendado(f.categoria, classificacao) && (
                          <Badge className="bg-primary/20 text-primary text-[10px] border-0 shrink-0">
                            <Star className="h-2.5 w-2.5 mr-0.5" /> IA
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        {catLabel && <span className="text-[11px] text-muted-foreground">{catLabel}</span>}
                        {f.telefone && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <Phone className="h-2.5 w-2.5" /> {f.telefone}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => onAlternarFornecedor(f)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum fornecedor selecionado.</p>
          )}

          {fornecedoresSelecionados.length < 3 && allFornecedores && allFornecedores.length > 0 && (
            <div className="flex gap-2">
              <Select value={addFornecedorId} onValueChange={onChangeAddFornecedorId}>
                <SelectTrigger className="flex-1 h-9 rounded-xl">
                  <SelectValue placeholder="Adicionar fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  {allFornecedores
                    .filter((f) => !fornecedoresSelecionados.some((s) => s.id === f.id))
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome} {f.categoria ? `(${ALL_CATEGORIAS.find((c) => c.value === f.categoria)?.label || f.categoria})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={onAdicionarFornecedor} disabled={!addFornecedorId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {fornecedoresSelecionados.length} de 3 selecionado{fornecedoresSelecionados.length !== 1 ? "s" : ""} — você pode enviar para até 3
          </p>

          <Button size="sm" className="rounded-xl w-full" onClick={onConfirmarCriacao} disabled={fornecedoresSelecionados.length < 1}>
            Criar Obra
          </Button>
        </div>
      )}

      {card.kind === "criacao_erro" && (
        <Card className="rounded-2xl border-destructive/30 mt-2">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm text-destructive">{card.mensagem}</p>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={onConfirmarCriacao}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
