import { useState } from "react";
import { useApiClient } from "@/contexts/ApiClientContext";
import { request, wsUrl } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { motion } from "framer-motion";

const Settings = () => {
  const { baseUrl: initBase, apiKey: initKey, setConfig } = useApiClient();
  const [baseUrl, setBaseUrl] = useState(initBase);
  const [apiKey, setApiKey] = useState(initKey);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);
  const [confirmToken, setConfirmToken] = useState("");
  const navigate = useNavigate();

  const onTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await request<{ status: string }>("/health", { method: "GET" });
      setResult(res.status === "ok" ? "ok" : "error");
    } catch {
      setResult("error");
    } finally {
      setTesting(false);
    }
  };

  const onSave = () => {
    setConfig({ baseUrl, apiKey });
    toast({ title: "Settings saved" });
  };

  const resolvedWs = wsUrl("/ws/status/example");

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
                <Label className="text-base font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground">Switch between light and dark modes</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="h-6" />

      {/* API Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>Configure API connectivity</CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Label htmlFor="base">API Base URL</Label>
            <Input id="base" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://localhost:8000" />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="key">API Key</Label>
            <Input id="key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="changeme" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onTest} disabled={testing} aria-busy={testing}>
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            {result === "ok" && <span className="text-sm text-muted-foreground">Health: OK</span>}
            {result === "error" && <span className="text-sm text-destructive">Health: ERROR</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            WS URL preview: <code className="px-1 py-0.5 rounded bg-secondary">{resolvedWs}</code>
          </div>
          <div className="pt-2">
            <Button onClick={onSave}>Save</Button>
          </div>
        </CardContent>
        </Card>
      </motion.div>

      <div className="h-6" />

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Card className="glass-card border-destructive/20 glass-danger">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible operations. Proceed with caution.</CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm">Type DELETE ALL to enable</Label>
            <Input id="confirm" value={confirmToken} onChange={(e) => setConfirmToken(e.target.value)} placeholder="DELETE ALL" />
            <p className="text-xs text-muted-foreground">
              This wipes the entire dataset, file records, uploaded blobs, and Redis job statuses.
            </p>
          </div>
          <div>
            <Button
              variant="destructive"
              disabled={confirmToken !== "DELETE ALL"}
              onClick={async () => {
                try {
                  const res = await request<{ ok: boolean; cleared: string[] }>("/admin/clear", {
                    method: "POST",
                    body: JSON.stringify({ scope: "all", confirm: true, confirm_token: "DELETE ALL" }),
                  });
                  if (res.ok) {
                    toast({ title: "All data cleared", description: res.cleared.join(", ") });
                    sessionStorage.setItem("ucpv.cleared", "1");
                    navigate("/");
                  }
                } catch (e: any) {
                  const status = e?.status;
                  if (status === 400) {
                    toast({ title: "Missing confirmation", description: e.message, variant: "destructive" });
                  } else {
                    toast({ title: "Clear failed", description: e.message, variant: "destructive" });
                  }
                }
              }}
            >
              DELETE EVERYTHING
            </Button>
          </div>
        </CardContent>
        </Card>
      </motion.div>
    </motion.main>
  );
};

export default Settings;
