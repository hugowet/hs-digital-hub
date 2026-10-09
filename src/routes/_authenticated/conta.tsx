import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Camera, CheckCircle2, Mail, MapPin, Plus, Trash2, User, UserCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
      {
        name: "description",
        content: "Gerencie seu perfil, documento e endereços na HS Digital.",
      },
    ],
  }),
  component: AccountPage,
});

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
  "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// Campos novos do perfil (vindos da migração do banco)
type ProfileExtra = {
  full_name?: string | null;
  phone?: string | null;
  account_type?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  cpf_verified?: boolean | null;
};

type AddressForm = {
  label: string;
  recipient_name: string;
  phone: string;
  postal_code: string;
  street_address: string;
  complement: string;
  city: string;
  state: string;
};

const EMPTY_ADDRESS: AddressForm = {
  label: "Casa",
  recipient_name: "",
  phone: "",
  postal_code: "",
  street_address: "",
  complement: "",
  city: "",
  state: "",
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

// Algoritmo oficial de validação de CPF (dígitos verificadores)
function validateCPF(cpf: string): boolean {
  const clean = onlyDigits(cpf);
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

function maskCPF(value: string) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCEP(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function isValidBirthDate(value: string) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const earliest = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
  return date <= now && date >= earliest;
}

export function AccountPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  // Dados do perfil (tudo vem do banco, nada fica salvo só no navegador)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const hydrated = useRef(false);

  // Endereço
  const [form, setForm] = useState<AddressForm>(EMPTY_ADDRESS);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const extra = profile as ProfileExtra | null | undefined;
  // CPF salvo não muda pelo app: evita trocar o documento depois de validado
  const cpfLocked = Boolean(extra?.cpf);
  const isCpfVerified = Boolean(extra?.cpf_verified);
  const avatarUrl = extra?.avatar_url ?? null;

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
    if (!profile || hydrated.current) return;
    hydrated.current = true;
    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setCpf(extra?.cpf ? maskCPF(extra.cpf) : "");
    setBirthDate(extra?.birth_date || "");
  }, [profile, extra]);

  // Foto de perfil: envia para o armazenamento e grava o link no perfil
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 2MB.");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicData.publicUrl })
        .eq("id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
      toast.success("Foto de perfil atualizada!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Salvar dados pessoais e CPF
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Informe seu nome completo.");
      return;
    }
    const cleanCpf = onlyDigits(cpf);
    if (!cpfLocked) {
      if (!validateCPF(cleanCpf)) {
        toast.error("CPF inválido. Confira os 11 números.");
        return;
      }
      if (!isValidBirthDate(birthDate)) {
        toast.error("Informe uma data de nascimento válida.");
        return;
      }
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          ...(cpfLocked ? {} : { cpf: cleanCpf, birth_date: birthDate }),
        })
        .eq("id", user.id);
      if (error) {
        if (error.code === "23505") throw new Error("Este CPF já está cadastrado em outra conta.");
        throw error;
      }
      await qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
      toast.success("Dados da conta salvos!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar os dados.");
    } finally {
      setIsSaving(false);
    }
  };

  // Preenche rua, cidade e estado a partir do CEP (ViaCEP)
  const handleCepChange = async (value: string) => {
    const masked = maskCEP(value);
    setForm((prev) => ({ ...prev, postal_code: masked }));
    const digits = onlyDigits(masked);
    if (digits.length !== 8) return;
    setIsLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado. Confira o número.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        street_address:
          prev.street_address || [data.logradouro, data.bairro].filter(Boolean).join(" - "),
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch {
      // Sem conexão com o serviço de CEP: a pessoa preenche manualmente
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!form.recipient_name.trim()) missing.push("Nome de quem recebe");
    if (onlyDigits(form.postal_code).length !== 8) missing.push("CEP");
    if (!form.street_address.trim()) missing.push("Rua, número e bairro");
    if (!form.city.trim()) missing.push("Cidade");
    if (!form.state) missing.push("Estado");
    if (missing.length > 0) {
      toast.error(`Preencha: ${missing.join(", ")}.`);
      return;
    }
    setIsSavingAddress(true);
    try {
      const { error } = await supabase.from("user_addresses").insert({
        user_id: user.id,
        label: form.label.trim() || "Casa",
        recipient_name: form.recipient_name.trim(),
        phone: form.phone.trim(),
        postal_code: onlyDigits(form.postal_code),
        street_address: form.street_address.trim(),
        complement: form.complement.trim(),
        city: form.city.trim(),
        state: form.state,
        is_default: addresses.length === 0,
      });
      if (error) throw error;
      toast.success("Endereço adicionado!");
      setForm(EMPTY_ADDRESS);
      await qc.invalidateQueries({ queryKey: ["my-addresses", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o endereço.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Só um endereço pode ser o padrão
  const handleSetDefault = async (addressId: string) => {
    const { error: clearError } = await supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
    if (clearError) {
      toast.error(clearError.message);
      return;
    }
    const { error } = await supabase.from("user_addresses").update({ is_default: true }).eq("id", addressId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["my-addresses", user.id] });
    toast.success("Endereço definido como padrão.");
  };

  const handleDeleteAddress = async (addressId: string) => {
    const { error } = await supabase.from("user_addresses").delete().eq("id", addressId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Endereço removido.");
    await qc.invalidateQueries({ queryKey: ["my-addresses", user.id] });
  };

  const inputClass = "h-9 text-xs";
  const addressInputClass = "h-8 text-xs";

  return (
    <div className="min-h-screen bg-[#ebebeb] text-gray-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-3 sm:px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Minha conta</h1>
          <p className="text-xs text-gray-500">
            Gerencie suas informações pessoais, documento e locais de entrega.
          </p>
        </div>

        {/* Perfil e identidade */}
        <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-5 border-b pb-6">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 rounded-full bg-[#3483fa] p-2 text-white shadow-md transition-colors hover:bg-[#2968c8] ${isUploadingAvatar ? "cursor-wait opacity-60" : "cursor-pointer"}`}
                title="Trocar foto de perfil"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingAvatar}
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
                    <CheckCircle2 className="h-3.5 w-3.5" /> Identidade verificada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {cpfLocked ? "Documento em análise" : "Documento pendente"}
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center justify-center sm:justify-start gap-1.5 text-xs text-gray-500">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#3483fa]">
                  {extra?.account_type === "seller" ? "Conta de vendedor" : "Conta de comprador"}
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  ID: {user.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-[#3483fa]" /> Dados cadastrais e documento
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-xs">
                  Nome completo *
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  className={inputClass}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs">
                  WhatsApp / telefone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(92) 99999-0000"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cpf" className="text-xs">
                  CPF *
                </Label>
                <Input
                  id="cpf"
                  value={cpf}
                  maxLength={14}
                  disabled={cpfLocked}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className={inputClass}
                />
                {cpfLocked && (
                  <p className="text-[11px] text-gray-500">
                    CPF salvo. Para alterar, fale com o suporte.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="birthDate" className="text-xs">
                  Data de nascimento *
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  disabled={cpfLocked}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#3483fa] hover:bg-[#2968c8] text-white text-xs font-semibold px-6"
              >
                {isSaving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </section>

        {/* Endereços */}
        <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-gray-900 text-base">
            <MapPin className="h-5 w-5 text-[#3483fa]" /> Meus endereços de entrega
          </h2>
          <div className="mt-4 space-y-3">
            {addresses.length === 0 && (
              <p className="text-xs text-gray-500">Nenhum endereço cadastrado ainda.</p>
            )}
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
                  <p className="text-gray-700 font-medium">
                    {address.recipient_name} • {address.phone}
                  </p>
                  <p className="text-gray-500">
                    {address.street_address}
                    {address.complement ? `, ${address.complement}` : ""} - {address.city}/{address.state}
                    {" "}(CEP: {address.postal_code || "N/A"})
                  </p>
                  {!address.is_default && (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs text-[#3483fa] font-semibold"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      Definir como endereço padrão
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-500"
                  aria-label="Remover endereço"
                  onClick={() => handleDeleteAddress(address.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddAddress} className="mt-6 border-t pt-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Adicionar novo endereço</h3>
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div>
                <Label className="text-[11px]">Tipo (Casa, Trabalho)</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className={addressInputClass}
                />
              </div>
              <div>
                <Label className="text-[11px]">Nome de quem recebe *</Label>
                <Input
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  placeholder="Nome completo"
                  className={addressInputClass}
                />
              </div>
              <div>
                <Label className="text-[11px]">WhatsApp / contato</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(92) 99999-0000"
                  className={addressInputClass}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4 text-xs">
              <div>
                <Label className="text-[11px]">CEP *</Label>
                <div className="relative">
                  <Input
                    value={form.postal_code}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    inputMode="numeric"
                    className={addressInputClass}
                  />
                  {isLoadingCep && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                      buscando...
                    </span>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px]">Rua, número e bairro *</Label>
                <Input
                  value={form.street_address}
                  onChange={(e) => setForm({ ...form, street_address: e.target.value })}
                  placeholder="Av. Principal, 123 - Centro"
                  className={addressInputClass}
                />
              </div>
              <div>
                <Label className="text-[11px]">Complemento</Label>
                <Input
                  value={form.complement}
                  onChange={(e) => setForm({ ...form, complement: e.target.value })}
                  placeholder="Apto 101, Bloco B"
                  className={addressInputClass}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4 text-xs">
              <div className="sm:col-span-2">
                <Label className="text-[11px]">Cidade *</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Manaus"
                  className={addressInputClass}
                />
              </div>
              <div>
                <Label className="text-[11px]">Estado *</Label>
                <select
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="h-8 w-full rounded-md border border-input bg-white px-2 text-xs"
                >
                  <option value="">Selecione</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={isSavingAddress}
              className="bg-[#00a650] hover:bg-[#008f45] text-white text-xs font-bold gap-1 mt-2"
            >
              <Plus className="h-3.5 w-3.5" /> {isSavingAddress ? "Salvando..." : "Adicionar endereço"}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
