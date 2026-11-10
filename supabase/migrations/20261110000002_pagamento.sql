-- Fan Joy Store — pagamento on-line pelo Mercado Pago (Checkout Pro).
-- O site nunca marca um pedido como pago. Quem faz isso é a Edge Function "mercadopago-webhook",
-- depois de consultar o pagamento direto na API do Mercado Pago. As duas funções abaixo só podem ser
-- chamadas com a chave secreta (papel service_role), que fica apenas nas Edge Functions.

-- Dados do pedido para criar a cobrança. Exige o código e o e-mail usado na compra.
create or replace function public.payment_order(p_code text, p_email text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('code', o.code, 'status', o.status, 'total', o.total, 'method', o.payment_method,
    'installments', o.installments, 'name', o.customer_name, 'email', o.customer_email)
  from public.orders o
  where o.code = upper(trim(p_code)) and o.customer_email = lower(trim(p_email));
$$;

-- Confirma um pagamento aprovado. Só muda pedidos aguardando pagamento e confere o valor.
-- Pagamento que chega para pedido já cancelado fica anotado no pedido, para a loja devolver.
create or replace function public.confirm_payment(p_code text, p_payment_ref text, p_amount numeric) returns text
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare o public.orders;
begin
  select * into o from public.orders where code = upper(trim(p_code)) for update;
  if not found then return 'pedido_nao_encontrado'; end if;
  if o.payment_ref = p_payment_ref then return 'ja_confirmado'; end if;
  if o.status = 'cancelado' then
    update public.orders set notes = concat_ws(E'\n', notes,
      format('Pagamento %s de R$ %s aprovado depois do cancelamento: devolver pelo Mercado Pago.', p_payment_ref, p_amount))
    where id = o.id;
    return 'pago_apos_cancelamento';
  end if;
  if o.status <> 'aguardando' then return 'ja_processado'; end if;
  if p_amount + 0.01 < o.total then
    update public.orders set notes = concat_ws(E'\n', notes,
      format('Pagamento %s de R$ %s menor que o total de R$ %s: conferir.', p_payment_ref, p_amount, o.total))
    where id = o.id;
    return 'valor_divergente';
  end if;
  update public.orders set status = 'pago', payment_ref = p_payment_ref where id = o.id;
  return 'pago';
end $$;

revoke execute on function public.payment_order(text, text) from public, anon, authenticated;
revoke execute on function public.confirm_payment(text, text, numeric) from public, anon, authenticated;
grant execute on function public.payment_order(text, text) to service_role;
grant execute on function public.confirm_payment(text, text, numeric) to service_role;
