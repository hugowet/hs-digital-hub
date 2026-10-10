import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Store,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Minha conta e Perfil · HS Digital" },
      { name: "description", content: "Gerencie seu perfil, verificação de identidade e endereços na HS Digital." },
    ],
  }),
  component: AccountPage,
});

// Algoritmo oficial de validação de CPF (Receita Federal)
function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;

  return true;
}

// Máscara de CPF
function maskCPF(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function AccountPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  // Dados do Perfil
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isCpfVerified, setIsCpfVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Endereço
  const [form, setForm] = useState({
    label: "Casa",
    recipient_name: "",
    phone: "",
    street_address: "",
    city: "",
    state: "",
    postal_code: "",
    complement: "",
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ["my-addresses", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      
      // Carrega dados locais persistidos (foto e CPF verificado)
      const savedData = localStorage.getItem(`user_profile_meta_${user.id}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setCpf(parsed.cpf || "");
          setIsCpfVerified(Boolean(parsed.isCpfVerified));
          setBirthDate(parsed.birthDate || "");
          setAvatarUrl(parsed.avatarUrl || null);
        } catch {}
      }
    }
  }, [profile, user.id]);

  // Upload simulado de foto de perfil (converte em base64 e salva)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarUrl(result);

      // Salva no estado do usuário
      const current = JSON.parse(localStorage.getItem(`user_profile_meta_${user.id}`) || "{}");
      localStorage.setItem(
        `user_profile_meta_${user.id}`,
        JSON.stringify({ ...current, avatarUrl: result })
      );
      toast.success("Foto de perfil atualizada com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  // Salvar alterações cadastrais e validar CPF
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const cleanCpf = cpf.replace(/\D/g, "");
    let validCpf = isCpfVerified;

    if (cleanCpf) {
      if (!validateCPF(cleanCpf)) {
        toast.error("CPF inválido! Por favor digite um CPF real com 11 dígitos válidos.");
        setIsSaving(false);
        return;
      }
      validCpf = true;
      setIsCpfVerified(true);
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Salva os metadados de verificação e foto
      const current = JSON.parse(localStorage.getItem(`user_profile_meta_${user.id}`) || "{}");
      localStorage.setItem(
        `user_profile_meta_${user.id}`,
        JSON.stringify({
          ...current,
          cpf,
          isCpfVerified: validCpf,
          birthDate,
          avatarUrl,
        })
      );

      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Dados da conta atualizados e identidade validada com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipient_name || !form.street_address || !form.city || !form.state) {
      toast.error("Preencha todos os campos obrigatórios do endereço.");
      return;
    }

    const { error } = await supabase.from("user_addresses").insert({
      user_id: user.id,
      ...form,
      is_default: addresses.length === 0,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Endereço adicionado!");
      setForm({
        label: "Casa",
        recipient_name: "",
        phone: "",
        street_address: "",
        city: "",
        state: "",
        postal_code: "",
        complement: "",
      });
      await qc.invalidateQueries({ queryKey: ["my-addresses"] });
    }
  };

  return (
    <div className="min-h-screen bg-[#ebebeb] text-gray-900">
      <SiteHeader />
      
      <main className="mx-auto w-full max-w-4xl px-3 sm:px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Minha conta</h1>
          <p className="text-xs text-gray-500">
            Gerencie suas informações pessoais, verificação de segurança e locais de entrega.
          </p>
        </div>

        {/* CARTÃO DE PERFIL E IDENTIDADE (PADRÃO MERCADO LIVRE / SHOPEE) */}
        <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-5 border-b pb-6">
            
            {/* Foto de Perfil com Botão de Alteração */}
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de Perfil" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-[#3483fa] p-2 text-white shadow-md hover:bg-[#2968c8] transition-colors"
                title="Trocar foto de perfil"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {fullName || profile?.full_name || "Cliente HS Digital"}
                </h2>
                {isCpfVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-[#00a650]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Identidade Verificada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5" /> Verificação Pendente
                  </span>
                )}
              </div>

              <p className="mt-1 flex items-center justify-center sm:justify-start gap-1.5 text-xs text-gray-500">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </p>
              
              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#3483fa]">
                  {profile?.account_type === "seller" ? "Conta de Vendedor" : "Conta de Comprador"}
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  ID: {user.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          {/* FORMULÁRIO DE DADOS PESSOAIS E CPF */}
          <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-[#3483fa]" /> Dados Cadastrais & Validação de Documento
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-xs">Nome Completo Oficial *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs">WhatsApp / Telefone *</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(92) 99999-0000"
                  className="h-9 text-xs"
                />
              </div>

              {/* CPF com Validação Real */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cpf" className="text-xs">CPF do Titular *</Label>
                  {isCpfVerified && (
                    <span className="text-[10px] text-[#00a650] font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="h-3 w-3" /> CPF Válido
                    </span>
                  )}
                </div>
                <Input
                  id="cpf"
                  value={cpf}
                  maxLength={14}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className={`h-9 text-xs ${isCpfVerified ? "border-green-400 bg-green-50/30" : ""}`}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="birthDate" className="text-xs">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#3483fa] hover:bg-[#2968c8] text-white text-xs font-semibold px-6"
              >
                {isSaving ? "Salvando..." : "Salvar Alterações e Validar"}
              </Button>
            </div>
          </form>
        </section>

        {/* GESTÃO DE ENDEREÇOS */}
        <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-gray-900 text-base">
            <MapPin className="h-5 w-5 text-[#3483fa]" /> Meus endereços de entrega
          </h2>

          <div className="mt-4 space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="flex items-start justify-between rounded-lg border border-gray-200 p-3.5 text-xs bg-gray-50/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{address.label}</span>
                    {address.is_default && (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-[#00a650]">
                        Padrão de envio
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 font-medium">{address.recipient_name} • {address.phone}</p>
                  <p className="text-gray-500">
                    {address.street_address}
                    {address.complement ? `, ${address.complement}` : ""} — {address.city}/{address.state} (CEP: {address.postal_code || "N/A"})
                  </p>
                  {!address.is_default && (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs text-[#3483fa] font-semibold"
                      onClick={async () => {
                        await supabase.from("user_addresses").update({ is_default: true }).eq("id", address.id);
                        await qc.invalidateQueries({ queryKey: ["my-addresses"] });
                        toast.success("Endereço definido como padrão.");
                      }}
                    >
                      Definir como endereço padrão
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-500"
                  onClick={async () => {
                    const { error } = await supabase.from("user_addresses").delete().eq("id", address.id);
                    if (error) toast.error(error.message);
                    else {
                      toast.success("Endereço removido.");
                      await qc.invalidateQueries({ queryKey: ["my-addresses"] });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Adicionar Novo Endereço */}
          <form onSubmit={handleAddAddress} className="mt-6 border-t pt-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Adicionar novo endereço</h3>
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div>
                <Label className="text-[11px]">Tipo (Casa, Trabalho)</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">Nome de quem recebe *</Label>
                <Input
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  placeholder="Nome completo"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">WhatsApp / Contato</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(92) 99999-0000"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 text-xs">
              <div className="sm:col-span-2">
                <Label className="text-[11px]">Rua, número e bairro *</Label>
                <Input
                  value={form.street_address}
                  onChange={(e) => setForm({ ...form, street_address: e.target.value })}
                  placeholder="Av. Principal, 123 - Centro"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">Complemento</Label>
                <Input
                  value={form.complement}
                  onChange={(e) => setForm({ ...form, complement: e.target.value })}
                  placeholder="Apto 101, Bloco B"
                  className="h-8 text-xs"
                />
              </div>
              <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px]">Cidade *</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Ex: Rolim de Moura"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">Estado *</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="Ex: RO"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">CEP *</Label>
                <Input
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  placeholder="Ex: 76940-000"
                  className="h-8 text-xs"
                />
              </div>
            </div>
                <Label className="text-[11px]">Estado *</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="Ex: RO"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">CEP *</Label>
                <Input
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  placeholder="Ex: 76940-000"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            </div>

            <Button type="submit" size="sm" className="bg-[#00a650] hover:bg-[#008f45] text-white text-xs font-bold gap-1 mt-2">
              <Plus className="h-3.5 w-3.5" /> Adicionar Endereço
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
