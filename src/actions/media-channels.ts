"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { mediaChannels } from "@/db/schema";
import { assertCanWrite } from "@/lib/auth";
import { mediaChannelSchema, type FormState } from "@/lib/validators";
import { describeDbError, isUniqueViolation } from "@/lib/db-error";

const COMPANY_ID = 1;

function parse(formData: FormData) {
  return mediaChannelSchema.safeParse({
    mediaType: formData.get("mediaType") || "print",
    name: formData.get("name"),
    code: formData.get("code"),
    vendorId: formData.get("vendorId"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

export async function createMediaChannel(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await db.insert(mediaChannels).values({
      companyId: COMPANY_ID,
      mediaType: d.mediaType,
      name: d.name,
      code: d.code,
      vendorId: d.vendorId,
      notes: d.notes,
      isActive: d.isActive,
    });
  } catch (e) {
    if (isUniqueViolation(e, "channel_code_uq"))
      return { ok: false, errors: { code: ["This code is already in use — pick another."] } };
    return { ok: false, message: `Could not save channel: ${describeDbError(e).message}` };
  }
  revalidatePath("/media-channels");
  redirect("/media-channels");
}

export async function updateMediaChannel(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await db
      .update(mediaChannels)
      .set({
        mediaType: d.mediaType,
        name: d.name,
        code: d.code,
        vendorId: d.vendorId,
        notes: d.notes,
        isActive: d.isActive,
      })
      .where(and(eq(mediaChannels.id, id), eq(mediaChannels.companyId, COMPANY_ID)));
  } catch (e) {
    if (isUniqueViolation(e, "channel_code_uq"))
      return { ok: false, errors: { code: ["This code is already in use — pick another."] } };
    return { ok: false, message: `Could not update channel: ${describeDbError(e).message}` };
  }
  revalidatePath("/media-channels");
  redirect("/media-channels");
}
