import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface SmartComboboxOption {
  value: string;
  label: string;
}

interface SmartComboboxProps {
  options: SmartComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  onCreateNew?: (label: string) => void | Promise<void>;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  allowCreate?: boolean;
  disabled?: boolean;
}

/**
 * Combobox padrão "Digite ou Selecione" com busca, criação inline e
 * detecção de duplicidade em tempo real.
 */
export function SmartCombobox({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = "Digite ou selecione...",
  emptyText = "Nenhum item encontrado",
  className,
  allowCreate = true,
  disabled,
}: SmartComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected =
    options.find((o) => o.value === value) ??
    (value ? { value, label: value } : undefined);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const exactMatch = useMemo(
    () =>
      options.find(
        (o) => o.label.toLowerCase().trim() === search.toLowerCase().trim()
      ),
    [options, search]
  );

  const showCreateOption =
    allowCreate &&
    !!onCreateNew &&
    search.trim().length > 0 &&
    !exactMatch;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleCreate = async () => {
    if (!onCreateNew || !search.trim()) return;
    await onCreateNew(search.trim());
    setSearch("");
    setOpen(false);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover z-50"
        align="start"
      >
        <div className="p-2 border-b">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreateOption) {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          {exactMatch && search.trim() && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-warning">
              <AlertCircle className="h-3 w-3" />
              <span>Já existe: "{exactMatch.label}"</span>
            </div>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 && !showCreateOption && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {emptyText}
            </p>
          )}
          {filtered.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left"
            >
              <Check
                className={cn(
                  "h-4 w-4",
                  value === opt.value ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
          {showCreateOption && (
            <button
              type="button"
              onClick={handleCreate}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left text-primary border-t mt-1 pt-2"
            >
              <Plus className="h-4 w-4" />
              <span>
                Criar <Badge variant="secondary" className="ml-1">{search.trim()}</Badge>
              </span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
