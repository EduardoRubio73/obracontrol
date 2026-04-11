import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface DescricaoComboboxProps {
  obraId: string | null;
  value: string;
  onChange: (value: string) => void;
}

export function DescricaoCombobox({ obraId, value, onChange }: DescricaoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!obraId) return;
    supabase
      .from("financeiro")
      .select("descricao")
      .eq("obra_id", obraId)
      .not("descricao", "is", null)
      .then(({ data }) => {
        const unique = [...new Set((data ?? []).map((d) => d.descricao).filter(Boolean))] as string[];
        setSuggestions(unique.sort());
      });
  }, [obraId]);

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  const showAdd = search.trim() && !filtered.some((s) => s.toLowerCase() === search.trim().toLowerCase());

  return (
    <>
      <input type="hidden" name="descricao" value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-12 justify-between text-base font-normal"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || "Ex: Cimento, Mão de obra..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar ou digitar..."
              value={search}
              onValueChange={setSearch}
              autoComplete="off"
            />
            <CommandList>
              <CommandEmpty className="py-2 px-3 text-sm text-muted-foreground">
                Nenhuma sugestão encontrada
              </CommandEmpty>
              {showAdd && (
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onChange(search.trim());
                      setOpen(false);
                      setSearch("");
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar: "{search.trim()}"
                  </CommandItem>
                </CommandGroup>
              )}
              {filtered.length > 0 && (
                <CommandGroup heading="Recentes">
                  {filtered.map((item) => (
                    <CommandItem
                      key={item}
                      value={item}
                      onSelect={() => {
                        onChange(item);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === item ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {item}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
