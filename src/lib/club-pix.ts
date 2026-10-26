export function validPixCpf(value: string): boolean {
  const cpf=value.replace(/\D/g, "");
  if(cpf.length!==11 || /^(\d)\1{10}$/.test(cpf))return false;
  for(const length of [9,10]) {
    const sum=Array.from(cpf.slice(0,length)).reduce((n,d,i)=>n+Number(d)*(length+1-i),0);
    const digit=(sum*10)%11%10;
    if(digit!==Number(cpf[length]))return false;
  }
  return true;
}
export function clubPixBody(intentId: string, email: string, cpf: string) {
  if(!validPixCpf(cpf))throw new Error("Informe um CPF válido para gerar o Pix.");
  return { transaction_amount:19.9, description:"Clube HS · 1 mês", payment_method_id:"pix",
    external_reference:`club-pix:${intentId}`, notification_url:"https://hs-digital-marck.lovable.app/api/public/mercado-pago/webhook",
    payer:{email,identification:{type:"CPF",number:cpf.replace(/\D/g,"")}},
    date_of_expiration:new Date(Date.now()+30*60_000).toISOString() };
}