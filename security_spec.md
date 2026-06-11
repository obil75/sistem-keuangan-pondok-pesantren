# Security Specification - SIKEU Pesantren Firebase Rules

## Data Invariants
1. Students records must have a valid non-empty NIS, name, parent information, and className.
2. DIPA Category allocations must have positive `allocatedAmount` and `realizedAmount`.
3. Transactions can be of type 'masuk' (inflow) or 'keluar' (outflow).
4. WhatsApp Notification Logs must track recipient phone numbers, students and outcome statuses ('sukses' or 'gagal').

## The "Dirty Dozen" Payloads (Unauthorized Written Requests)
The following operations must be blocked by the security rules:
1. Writing to a student profile without authentication.
2. Modifying student's `nis` as a non-admin.
3. Updating a DIPA category realizing budget to exceed the allocated amounts without verification.
4. Setting a transaction amount to negative.
5. Inflow SPP transaction where `paymentMonth` is in an invalid format.
6. Spoofing user identity (adjusting `id` parameter on student or owner).
7. Creating a notification log without an associated active student record.
8. Non-authenticated users reading general transaction ledger.
9. Deleting critical audit records (Transactions) compiled by other staff.
10. Modifying transaction timestamps to any date other than standard server formats.
11. Injecting massive strings as student IDs (Resource/ID Poisoning).
12. Appending non-whitelisted keys into a DipaCategory document (Shadow Update Attack).

## Rule Test Spec
We will enforce that no client-side writes can bypass validation helpers. All writes require authentication and must match strictly defined keys where applicable. All standard read rules will prevent blanket unstructured list queries.
