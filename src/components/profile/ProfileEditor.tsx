import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AvatarChip } from "./AvatarChip";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserCog } from "lucide-react";

export function ProfileEditor() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    const res = await updateProfile({
      name: name.trim() || undefined,
      avatar_url: avatarUrl.trim() ? avatarUrl.trim() : null,
    });
    setSaving(false);
    if (res.error) {
      toast({ title: "Could not update profile", description: res.error, variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your teammates will see this on reconnect." });
    }
  };

  const handleRemoveAvatar = async () => {
    setSaving(true);
    const res = await updateProfile({ avatar_url: null });
    setSaving(false);
    if (!res.error) {
      setAvatarUrl("");
      toast({ title: "Avatar removed" });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-4 w-4" />
          Display profile
        </CardTitle>
        <CardDescription>How teammates see you in presence, comments, and activity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <AvatarChip
            name={name || user.name}
            avatarUrl={avatarUrl || user.avatar_url}
            color={user.color}
            size="lg"
          />
          <div className="text-sm">
            <p className="font-medium">{name || user.name}</p>
            <p className="text-muted-foreground text-xs">{user.email}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar-url">Avatar URL</Label>
          <Input
            id="avatar-url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
          />
          <p className="text-xs text-muted-foreground">
            Paste a public image URL. Binary uploads aren't supported by the backend yet.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save changes
          </Button>
          {user.avatar_url && (
            <Button variant="outline" onClick={handleRemoveAvatar} disabled={saving}>
              Remove avatar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
