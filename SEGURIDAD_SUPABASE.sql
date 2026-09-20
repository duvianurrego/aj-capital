-- =========================================================
-- A&J CAPITAL - SEGURIDAD PARA LA APLICACION WEB
-- Ejecutar ANTES de publicar la web.
-- =========================================================

-- Las tablas quedan accesibles únicamente para usuarios autenticados.
alter table socios enable row level security;
alter table configuracion enable row level security;
alter table clientes enable row level security;
alter table prestamos enable row level security;
alter table pagos enable row level security;
alter table cierres enable row level security;
alter table auditoria enable row level security;
alter table movimientos_caja enable row level security;
alter table saldos_caja_cierre enable row level security;
alter table punto_cero enable row level security;
alter table intereses_historicos enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'socios','configuracion','clientes','prestamos','pagos','cierres',
    'auditoria','movimientos_caja','saldos_caja_cierre','punto_cero',
    'intereses_historicos'
  ]
  loop
    execute format('drop policy if exists "aj_authenticated_all" on %I',t);
    execute format(
      'create policy "aj_authenticated_all" on %I for all to authenticated using (true) with check (true)',t
    );
  end loop;
end $$;

-- Acceso a vistas para usuarios autenticados.
grant usage on schema public to authenticated;
grant select on
  resumen_capital_prestado,
  ciclo_actual_aj,
  cartera_operativa,
  resumen_punto_cero,
  resumen_caja_socios,
  historial_cierres_aj,
  movimientos_control_nuevo,
  resumen_movimientos_nuevos,
  alerta_clientes_varios_prestamos,
  conciliacion_transferencias
to authenticated;

-- Funciones que usará la aplicación.
grant execute on function registrar_pago_aj(bigint,bigint,date,numeric,numeric,text,text) to authenticated;
grant execute on function crear_prestamo_aj(bigint,bigint,date,numeric,numeric,date,text) to authenticated;
grant execute on function transferir_caja_aj(bigint,bigint,date,numeric,text) to authenticated;
grant execute on function registrar_cuota_banco_aj(bigint,date,numeric,text) to authenticated;
grant execute on function retirar_utilidad_aj(bigint,date,numeric,text) to authenticated;
grant execute on function cerrar_ciclo_aj(date,text) to authenticated;

select 'SEGURIDAD_AJ_PREPARADA' as resultado;
