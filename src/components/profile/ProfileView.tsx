import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfileView() {
  return (
    <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground mt-2">
          Manage your personal information and account settings.
        </p>
      </div>

      <div className="space-y-8">
        <section className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src="" alt="Profile" />
              <AvatarFallback className="text-4xl bg-primary text-primary-foreground">U</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm">Change Avatar</Button>
          </div>

          <div className="flex-1 space-y-4 w-full">
            <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="Simper User" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="user@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" defaultValue="AI Enthusiast and Developer" />
              </div>
              <div className="pt-4">
                <Button>Update Profile</Button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <h3 className="text-lg font-medium border-b pb-2 text-destructive">Danger Zone</h3>
          <div className="rounded-lg border border-destructive/20 p-4 bg-destructive/5">
            <h4 className="font-medium text-destructive">Delete Account</h4>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Permanently delete your account and all of your data. This action cannot be undone.
            </p>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
