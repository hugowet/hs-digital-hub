import { Label } from "@/components/ui/label";

export function ColorPhotoSelector({ colors, photos, selected, onChange }: {
  colors: string[];
  photos: Array<{ key: string; preview: string }>;
  selected: Record<string, string>;
  onChange: (color: string, key: string) => void;
}) {
  if (!colors.length) return null;
  return <fieldset className="space-y-3"><legend className="text-sm font-semibold">Foto de cada cor</legend>
    {colors.map((color, i) => {
      const photo = photos.find(p => p.key === selected[color]);
      return <div key={color} className="flex items-center gap-3">
        {photo?.preview && <img src={photo.preview} alt={`Foto da cor ${color}`} className="size-14 shrink-0 rounded-md border object-contain" />}
        <div className="min-w-0 flex-1"><Label htmlFor={`color-photo-${i}`}>{color}</Label><select id={`color-photo-${i}`} aria-label={`Foto da cor ${color}`} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={photo ? selected[color] : ""} onChange={e => onChange(color, e.target.value)}>
          <option value="">Sem foto vinculada</option>{photos.map((p, index) => <option key={p.key} value={p.key}>Foto {index + 1}</option>)}
        </select></div>
      </div>;
    })}
  </fieldset>;
}