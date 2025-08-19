import Link from 'next/link';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

export default function NewPollPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto max-w-2xl flex-1 px-4 py-8">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to polls
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Create a new poll</CardTitle>
            <CardDescription>
              What question is on your mind?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="question">Your Question</Label>
                  <Textarea id="question" placeholder="e.g., Is pineapple on pizza a crime?" />
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild>
                <Link href="/">Cancel</Link>
            </Button>
            <Button>Create Poll</Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
