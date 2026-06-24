import { supabase } from "@/integrations/supabase/client";

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "png", "jpg", "jpeg", "webp"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
];

/**
 * Upload a file to the private "documents" bucket under the user's folder.
 * Returns the storage path. Use createSignedUrl to read it back.
 */
export async function uploadDocument(userId: string, folder: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File extension '.${ext}' is not allowed. Supported types: PDF, Word, PowerPoint, PNG, JPG, WEBP.`);
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`File format '${file.type}' is not supported. Please upload a valid document or image.`);
  }

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
