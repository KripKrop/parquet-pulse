import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { request } from "@/services/apiClient";
import { Building2, User, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const navigate = useNavigate();
  const { isAuthenticated, user, tenant, role } = useAuth();

  const handleClearData = async () => {
    if (deleteConfirm !== "DELETE ALL") {
      toast({
        title: "Incorrect confirmation",
        description: "Please type 'DELETE ALL' to confirm",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await request<{ ok: boolean; cleared: string[] }>("/admin/clear", {
        method: "POST",
        body: JSON.stringify({ scope: "all", confirm: true }),
      });
      if (res.ok) {
        toast({ title: "All data cleared", description: res.cleared.join(", ") });
        sessionStorage.setItem("ucpv.cleared", "1");
        setDeleteConfirm("");
        navigate("/");
      }
    } catch (e: any) {
      const status = e?.status;
      if (status === 400) {
        toast({ title: "Missing confirmation", description: e.message, variant: "destructive" });
      } else if (status === 403) {
        toast({ 
          title: "Access Denied", 
          description: "Only tenant owners can delete all data", 
          variant: "destructive" 
        });
      } else if (status === 404) {
        toast({ 
          title: "Not Found", 
          description: "Resource not found or access denied", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Clear failed", description: e.message, variant: "destructive" });
      }
    }
  };

  return (
    <motion.main
      className="container mx-auto max-w-3xl py-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h1 className="sr-only">Settings - Crunch</h1>

      {/* Theme Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize your visual experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-base font-medium">Theme</label>
                <p className="text-sm text-muted-foreground">Switch between light and dark modes</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="h-6" />

      {/* Account Information */}
      {isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your current user and tenant details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">User Email</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Organization</p>
                    <p className="text-sm text-muted-foreground">{tenant?.name}</p>
                  </div>
                </div>

                {role && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Role</p>
                      <p className="text-sm text-muted-foreground capitalize">{role}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isAuthenticated && <div className="h-6" />}

      {/* Danger Zone - Only for Owners and Admins */}
      {isAuthenticated && (role === 'owner' || role === 'platform_admin' || role === 'superadmin') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Card className="glass-card border-destructive/20 glass-danger">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible operations. Only {role === 'owner' ? 'tenant owners' : 'administrators'} can perform these actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="confirm" className="text-sm font-medium">
                  Type DELETE ALL to enable
                </label>
                <Input
                  id="confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE ALL"
                />
                <p className="text-xs text-muted-foreground">
                  This wipes the entire dataset, file records, uploaded blobs, and Redis job statuses for your tenant.
                </p>
              </div>
              <div>
                <Button
                  variant="destructive"
                  disabled={deleteConfirm !== "DELETE ALL"}
                  onClick={handleClearData}
                >
                  DELETE EVERYTHING
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Message for non-privileged users */}
      {isAuthenticated && role && !['owner', 'platform_admin', 'superadmin'].includes(role) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Card className="glass-card border-muted">
            <CardHeader>
              <CardTitle className="text-muted-foreground">Administrative Actions</CardTitle>
              <CardDescription>
                Contact your tenant owner to perform administrative operations like deleting all data.
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      )}
    </motion.main>
  );
}
