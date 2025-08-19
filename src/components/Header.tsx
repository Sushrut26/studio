import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
        <Link href="/">
          <h1 className="text-2xl font-bold text-primary font-headline">PollPulse</h1>
        </Link>
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link href="/new">
              <Plus className="mr-2 h-4 w-4" /> New Poll
            </Link>
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="person avatar" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
