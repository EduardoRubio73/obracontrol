CREATE OR REPLACE FUNCTION public.auto_status_obra_execucao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE obras SET status = 'execução'
  WHERE id = NEW.obra_id AND status = 'planejamento';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compras_auto_status
  AFTER INSERT ON compras
  FOR EACH ROW EXECUTE FUNCTION auto_status_obra_execucao();

CREATE TRIGGER trg_financeiro_auto_status
  AFTER INSERT ON financeiro
  FOR EACH ROW EXECUTE FUNCTION auto_status_obra_execucao();