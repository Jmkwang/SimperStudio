import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DebugBadge } from "@/components/debug/DebugBadge";
import { useTranslation } from "@/hooks/useTranslation";

export function ProfileView() {
  const { t } = useTranslation();
  return (
    <div className="relative flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
      <DebugBadge id="ProfileView" />
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">{t('Profile')}</h2>
        <p className="text-muted-foreground mt-2">
          {t('Manage your personal information and account settings.')}
        </p>
      </div>

      <div className="space-y-8">
        <section className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src="" alt="Profile" />
              <AvatarFallback className="text-4xl bg-primary text-primary-foreground">U</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm">{t('Change Avatar')}</Button>
          </div>

          <div className="flex-1 space-y-4 w-full">
            <h3 className="text-lg font-medium border-b pb-2">{t('Personal Information')}</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('Full Name')}</Label>
                <Input id="name" defaultValue="Simper User" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t('Email Address')}</Label>
                <Input id="email" type="email" defaultValue="user@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">{t('Bio')}</Label>
                <Input id="bio" defaultValue="AI Enthusiast and Developer" />
              </div>
              <div className="pt-4">
                <Button>{t('Update Profile')}</Button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <h3 className="text-lg font-medium border-b pb-2 text-destructive">{t('Danger Zone')}</h3>
          <div className="rounded-lg border border-destructive/20 p-4 bg-destructive/5">
            <h4 className="font-medium text-destructive">{t('Delete Account')}</h4>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {t('Permanently delete your account and all of your data. This action cannot be undone.')}
            </p>
            <Button variant="destructive">{t('Delete Account')}</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
