import type { ApiAssociation } from "@/services/admin.service"
import type { Association, Candidate } from "@/types/voting"
import { resolveImageUrl } from "@/lib/api"

export function mapApiAssociation(
  a: ApiAssociation,
  careerName: string
): Association {
  return {
    id: a.association_id,
    name: a.name,
    careerId: a.election_career?.career_id ?? "",
    careerName,
    photoUrl: resolveImageUrl(a.logo_url) ?? null,
    candidates: (a.association_member ?? []).map(
      (m): Candidate => ({
        id: m.association_member_id,
        name: m.full_name,
        role: m.role ?? "Miembro",
        photoUrl: resolveImageUrl(m.photo_url) ?? null,
      })
    ),
  }
}
