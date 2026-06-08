import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, X, FileText, Package, Paperclip } from "lucide-react";

import { createListing } from "@/lib/listings.functions";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({ meta: [{ title: "Create a listing · CampusScribe" }] }),
  component: SellPage,
});

type ImgPreview = { name: string; dataUrl: string };
type FilePreview = { name: string; dataUrl: string; size: number };

const PHYSICAL_CATEGORIES = ["Textbooks", "Electronics", "Furniture", "Dorm", "Bikes", "Clothing", "Other"];
const DIGITAL_CATEGORIES = ["Lecture notes", "Past papers", "Lab manuals", "Project reports", "Cheat sheets", "Other"];
const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
];

function SellPage() {
  const navigate = useNavigate();
  const create = useServerFn(createListing);
  const [type, setType] = useState<"PHYSICAL_ITEM" | "DIGITAL_NOTE">("PHYSICAL_ITEM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState<string>("GOOD");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<ImgPreview[]>([]);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [contactPhone, setContactPhone] = useState("");

  const mut = useMutation({
    mutationFn: async () =>
      create({
        data: {
          type,
          title,
          description,
          price: Number(price),
          category,
          condition: type === "PHYSICAL_ITEM" ? (condition as never) : undefined,
          location,
          contactPhone,
          images,
          files: files.map(({ name, dataUrl }) => ({ name, dataUrl })),
        },
      }),
    onSuccess: (res) => {
      toast.success("Listing published!");
      navigate({ to: "/listing/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 6 - images.length);
    const previews = await Promise.all(
      arr.map(
        (f) =>
          new Promise<ImgPreview>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve({ name: f.name, dataUrl: String(r.result) });
            r.readAsDataURL(f);
          }),
      ),
    );
    setImages((prev) => [...prev, ...previews]);
  }

  async function onDocs(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).slice(0, 5 - files.length);
    // 15MB per file cap
    const ok = arr.filter((f) => f.size <= 15 * 1024 * 1024);
    if (ok.length < arr.length) toast.error("Some files exceeded 15MB and were skipped");
    const previews = await Promise.all(
      ok.map(
        (f) =>
          new Promise<FilePreview>((resolve) => {
            const r = new FileReader();
            r.onload = () =>
              resolve({ name: f.name, dataUrl: String(r.result), size: f.size });
            r.readAsDataURL(f);
          }),
      ),
    );
    setFiles((prev) => [...prev, ...previews]);
  }

  const categories = type === "PHYSICAL_ITEM" ? PHYSICAL_CATEGORIES : DIGITAL_CATEGORIES;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-2xl px-4 py-12">
        <header className="mb-8">
          <h1 className="font-display text-4xl font-bold tracking-tight">Create a listing</h1>
          <p className="mt-2 text-muted-foreground">
            Tell us what you're selling. Most listings sell within a week of finals.
          </p>
        </header>

        <form
          className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title || !price || !category) {
              toast.error("Title, price, and category are required");
              return;
            }
            mut.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <TypeCard
              active={type === "PHYSICAL_ITEM"}
              onClick={() => setType("PHYSICAL_ITEM")}
              icon={<Package className="h-5 w-5" />}
              title="Physical item"
              desc="Books, electronics, furniture"
            />
            <TypeCard
              active={type === "DIGITAL_NOTE"}
              onClick={() => setType("DIGITAL_NOTE")}
              icon={<FileText className="h-5 w-5" />}
              title="Study notes"
              desc="Lecture notes, past papers"
            />
          </div>

          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Engineering Mathematics 3 textbook" />
          </Field>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Condition details, edition, what's included…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₹)">
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {type === "PHYSICAL_ITEM" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Condition">
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Pickup location">
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hostel block, campus…" />
              </Field>
            </div>
          )}

          <Field label={`Photos (${images.length}/6)`}>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 6 && (
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground hover:border-primary hover:text-primary">
                  <Upload className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </Field>

          {type === "DIGITAL_NOTE" && (
            <Field label={`Files — PDF, Word, images, anything (${files.length}/5)`}>
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="grid h-6 w-6 place-items-center rounded-full hover:bg-background"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {files.length < 5 && (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                    <Upload className="h-4 w-4" />
                    Add files (any format, max 15MB each)
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => onDocs(e.target.files)}
                    />
                  </label>
                )}
              </div>
            </Field>
          )}

          <Field label="Contact number (optional — lets buyers call/WhatsApp directly)">
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </Field>

          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform fee (5%)</span>
              <span>₹{((Number(price) || 0) * 0.05).toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between font-medium">
              <span>You earn</span>
              <span className="text-primary">₹{((Number(price) || 0) * 0.95).toFixed(2)}</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={mut.isPending}
            className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground"
          >
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish listing
          </Button>
        </form>
      </main>
    </div>
  );
}

function TypeCard({
  active, onClick, icon, title, desc,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-xl border p-4 text-left transition " +
        (active ? "border-primary bg-primary/5 ring-2 ring-primary/40" : "border-border hover:border-primary/50")
      }
    >
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-hero)] text-primary-foreground">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}