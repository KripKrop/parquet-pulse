import { useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddTenantMember } from "@/hooks/useTenantMembersAdmin";
import { CollabApiError } from "@/services/collabApi";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const newUserSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  name: z.string().trim().min(1, "Name required").max(100),
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Needs an uppercase letter")
    .regex(/[a-z]/, "Needs a lowercase letter")
    .regex(/[0-9]/, "Needs a number"),
  role: z.enum(["member", "owner"]),
});

const existingSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  role: z.enum(["member", "owner"]),
});

export function AddMemberDialog({ open, onOpenChange }: Props) {
  const add = useAddTenantMember();
  const [tab, setTab] = useState<"new" | "existing">("new");

  // new user fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "owner">("member");

  // existing user fields
  const [existingEmail, setExistingEmail] = useState("");
  const [existingRole, setExistingRole] = useState<"member" | "owner">("member");

  const reset = () => {
    setEmail(""); setName(""); setPassword(""); setRole("member");
    setExistingEmail(""); setExistingRole("member");
    setTab("new");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const submitNew = async () => {
    const parsed = newUserSchema.safeParse({ email, name, password, role });
    if (!parsed.success) {
      toast({ title: "Check your input", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    try {
      await add.mutateAsync(parsed.data);
      handleClose(false);
    } catch (e) {
      if (e instanceof CollabApiError && e.status === 409) {
        toast({
          title: "User already exists",
          description: "Switch to 'Existing user' to attach them to this tenant.",
        });
        setExistingEmail(email);
        setTab("existing");
      }
    }
  };

  const submitExisting = async () => {
    const parsed = existingSchema.safeParse({ email: existingEmail, role: existingRole });
    if (!parsed.success) {
      toast({ title: "Check your input", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    try {
      await add.mutateAsync(parsed.data);
      handleClose(false);
    } catch {/* surfaced by hook */}
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>Add a new account or attach an existing user to this tenant.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "existing")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">New user</TabsTrigger>
            <TabsTrigger value="existing">Existing user</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">Password</Label>
              <Input id="new-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, mixed case + number" />
              <p className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase, and a number.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "member" | "owner")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={add.isPending}>Cancel</Button>
              <Button onClick={submitNew} disabled={add.isPending}>{add.isPending ? "Adding…" : "Add member"}</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="existing" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="ex-email">Email</Label>
              <Input id="ex-email" type="email" value={existingEmail} onChange={(e) => setExistingEmail(e.target.value)} placeholder="user@example.com" />
              <p className="text-xs text-muted-foreground">The user must already have a Crunch account.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={existingRole} onValueChange={(v) => setExistingRole(v as "member" | "owner")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={add.isPending}>Cancel</Button>
              <Button onClick={submitExisting} disabled={add.isPending}>{add.isPending ? "Attaching…" : "Attach user"}</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
