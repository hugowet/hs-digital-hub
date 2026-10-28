UPDATE public.products SET supplier_stock_checked_at = NULL
WHERE supplier = 'amazon' AND (
  length(regexp_replace(coalesce(description,''),'Método de entrega.*$','')) < 200
  OR title ~* '(tênis|tenis|sapat|sandál|sandal|chinel|camis|calça|vestido|bermuda|blusa|bota)'
  OR variations::text ~ '(indexInDimList|defaultAsin)'
);