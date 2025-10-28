import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Search className="w-12 h-12 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <p className="text-xl text-muted-foreground">Page introuvable</p>
        </div>
        <Button onClick={() => setLocation("/")} size="lg" data-testid="button-home">
          <Home className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
}
