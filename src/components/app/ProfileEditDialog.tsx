import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditDialog({ open, onOpenChange }: ProfileEditDialogProps) {
  const { profile, refresh } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState(profile?.name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [linkedin, setLinkedin] = useState(profile?.linkedin || "");
  const [twitter, setTwitter] = useState(profile?.twitter || "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || "");
  const [skills, setSkills] = useState(profile?.skills?.join(", ") || "");
  const [industry, setIndustry] = useState(profile?.industry || "");
  const [community, setCommunity] = useState(profile?.community || "");
  const [achievements, setAchievements] = useState(profile?.achievements?.join(", ") || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    try {
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const achievementsArray = achievements
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          username: username.trim().toLowerCase() || null,
          avatar_url: avatarUrl || null,
          banner_url: bannerUrl || null,
          bio: bio || null,
          location: location || null,
          website: website || null,
          linkedin: linkedin || null,
          twitter: twitter || null,
          whatsapp: whatsapp || null,
          skills: skillsArray,
          industry: industry || null,
          community: community || null,
          achievements: achievementsArray,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      await refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border border-slate-900 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-white text-base">
            Edit Profile Details
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2 text-left">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof-name" className="text-xs font-bold text-slate-400">Full Name</Label>
              <Input
                id="prof-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sandra Cole"
                className="bg-slate-900/50 border-slate-800 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-username" className="text-xs font-bold text-slate-400">Username</Label>
              <Input
                id="prof-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. sandracole"
                className="bg-slate-900/50 border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof-location" className="text-xs font-bold text-slate-400">Location</Label>
              <Input
                id="prof-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lagos, Nigeria"
                className="bg-slate-900/50 border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof-avatar" className="text-xs font-bold text-slate-400">Profile Photo URL</Label>
              <Input
                id="prof-avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="bg-slate-900/50 border-slate-800 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-banner" className="text-xs font-bold text-slate-400">Profile Banner URL</Label>
              <Input
                id="prof-banner"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://..."
                className="bg-slate-900/50 border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-bio" className="text-xs font-bold text-slate-400">Bio</Label>
            <Textarea
              id="prof-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself, your startups, or your skills..."
              rows={3}
              className="bg-slate-900/50 border-slate-800 text-xs text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof-industry" className="text-xs font-bold text-slate-400">Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="bg-slate-900/50 border-slate-800 text-xs text-white">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-900 text-white text-xs">
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind} className="cursor-pointer focus:bg-slate-900">
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-community" className="text-xs font-bold text-slate-400">Community Name</Label>
              <Input
                id="prof-community"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder="e.g. Wigwe Hub"
                className="bg-slate-900/50 border-slate-800 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-website" className="text-xs font-bold text-slate-400">Website</Label>
              <Input
                id="prof-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. mycompany.com"
                className="bg-slate-900/50 border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof-linkedin" className="text-xs font-bold text-slate-400">LinkedIn URL</Label>
              <Input
                id="prof-linkedin"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="linkedin.com/in/..."
                className="bg-slate-900/50 border-slate-800 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-twitter" className="text-xs font-bold text-slate-400">Twitter / X URL</Label>
              <Input
                id="prof-twitter"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="twitter.com/..."
                className="bg-slate-900/50 border-slate-800 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-whatsapp" className="text-xs font-bold text-slate-400">WhatsApp Phone</Label>
              <Input
                id="prof-whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. +234..."
                className="bg-slate-900/50 border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-skills" className="text-xs font-bold text-slate-400">Skills (comma-separated)</Label>
            <Input
              id="prof-skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Product Management, Next.js, Financial Modeling"
              className="bg-slate-900/50 border-slate-800 text-xs text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-achievements" className="text-xs font-bold text-slate-400">Achievements (comma-separated)</Label>
            <Input
              id="prof-achievements"
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="e.g. Wigwe University Top Innovator, Hackathon Winner"
              className="bg-slate-900/50 border-slate-800 text-xs text-white"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-900/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-800 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={submitting} className="text-xs font-bold">
              {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save Profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
