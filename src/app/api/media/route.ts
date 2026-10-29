import { cmsHostGuard, originGuard } from "@/lib/cms-host";
import { MAX_UPLOAD_BYTES, UploadError } from "@/lib/image-process";
import { saveUpload } from "@/lib/media-store";
import { mediaUrl } from "@/lib/media";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// POST multipart/form-data with a "file" field. Any signed-in role may upload (contributors work on
// drafts too). The host and login checks run before the body is read, so anonymous callers can't
// make the server buffer large uploads. src/proxy.ts deliberately skips this path for the same reason.
export async function POST(request: Request) {
  const blocked = cmsHostGuard(request) ?? originGuard(request);
  if (blocked) return blocked;
  const user = await requireApiUser();
  if (user instanceof Response) return user;

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return Response.json({ error: "Foto lebih dari 20 MB." }, { status: 413 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return Response.json({ error: "Unggahan tidak terbaca. Coba lagi." }, { status: 400 });
  }
  if (!(file instanceof File)) return Response.json({ error: "Pilih file foto." }, { status: 400 });

  try {
    const saved = await saveUpload(Buffer.from(await file.arrayBuffer()), file.name, user.id);
    return Response.json({ id: saved.id, url: mediaUrl(saved.id, 800), width: saved.width, height: saved.height }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) return Response.json({ error: err.message }, { status: err.status });
    console.error("upload failed", err);
    return Response.json({ error: "Gagal menyimpan foto. Coba lagi." }, { status: 500 });
  }
}
