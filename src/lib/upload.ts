import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a file to the private "documents" bucket under the user's folder.
 * Returns the storage path. Use createSignedUrl to read it back.
 */
export async function uploadDocument(userId: string, folder: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
