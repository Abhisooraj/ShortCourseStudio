import { db, newToken, type Application } from "./enrollment";
import { PAISE } from "./courses";

export const referralDiscount = 50_000;

export async function studentReferral(row: Application) {
 if (row.payment_state !== "paid") return null;
 const code = "REF-" + newToken().slice(0, 16).toUpperCase();
 await db().prepare("INSERT INTO referrals (owner,code) VALUES (?,?) ON CONFLICT(owner) DO NOTHING").bind(row.email, code).run();
 return db().prepare("SELECT * FROM referrals WHERE owner=?").bind(row.email).first<Referral>();
}

type Referral = {
 owner: string;
 code: string;
 friend_application: string | null;
 wallet_application: string | null;
 confirmed_at: string | null;
 spent_at: string | null;
};

export async function listReferrals() {
 return (await db().prepare("SELECT * FROM referrals ORDER BY owner LIMIT 100").all<Referral>()).results;
}

export function referralStatus(referral: Referral) {
 return referral.confirmed_at ? "Closed" : referral.friend_application ? "Payment pending" : "Available";
}

export async function reserveDiscount(row: Application, code: string, wallet: boolean, verifiedEmail: string | null) {
 if (row.order_id || row.amount !== PAISE || (!code && !wallet)) return;
 const eligible = "EXISTS (SELECT 1 FROM applications WHERE id=? AND amount=? AND payment_state='unpaid' AND order_id IS NULL)";
 const claim = wallet
  ? db().prepare(`UPDATE referrals SET wallet_application=? WHERE owner=? AND confirmed_at IS NOT NULL AND wallet_application IS NULL AND ${eligible}`).bind(row.id, verifiedEmail === row.email ? verifiedEmail : null, row.id, PAISE)
  : db().prepare(`UPDATE referrals SET friend_application=? WHERE code=? AND owner<>? AND friend_application IS NULL AND confirmed_at IS NULL AND ${eligible}
     AND NOT EXISTS (SELECT 1 FROM referrals r JOIN applications a ON a.id=r.friend_application WHERE a.email=?)`).bind(row.id, code, row.email, row.id, PAISE, row.email);
 const price = db().prepare(`UPDATE applications SET amount=? WHERE id=? AND amount=? AND order_id IS NULL AND payment_state='unpaid'
   AND EXISTS (SELECT 1 FROM referrals WHERE friend_application=? OR wallet_application=?)`).bind(PAISE-referralDiscount,row.id,PAISE,row.id,row.id);
 const [, result] = await db().batch([claim,price]);
 return result.meta.changes === 1;
}
