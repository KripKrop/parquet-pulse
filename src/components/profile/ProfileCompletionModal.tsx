import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AvatarChip } from "./AvatarChip";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileCompletionModal({ open, onOpenChange }: Props) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      name: name.trim(),
      avatar_url: avatarUrl.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save profile", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How teammates will see you</DialogTitle>
          <DialogDescription>
            Pick a display name and (optionally) an avatar URL so collaborators recognize you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2">
          <AvatarChip
            name={name || user?.email || "?"}
            email={user?.email}
            avatarUrl={avatarUrl || null}
            color={user?.color}
            size="lg"
          />
          <div className="text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{name || "Display name"}</div>
            <div className="text-xs">{user?.email}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Data Lead" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatar-url">Avatar URL (optional)</Label>
            <Input
              id="avatar-url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…/avatar.png"
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Paste a public image URL. Binary upload coming soon.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Skip for now
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
