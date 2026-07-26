# Call Tree — Draft from Anupam's IT Hierarchy Excel

*A draft mapping of your uploaded Excel (IT Dept Hierarchy + Incident Matrix) into SENTINEL. **Nothing here is loaded into the app yet** — it's a ready reference for when you have consent + real contact details.*

---

## ⚠️ Read first — two things to know
1. **Contacts are placeholders.** Real **emails/phones** get filled in **per person, as they consent** (not needed to build this draft). Known-real values are marked ✅; everything else is `‹confirm›`.
2. **The app uses ONE ordered chain, not branching towers.** Your Excel is a branching org chart; the app escalates 1st → 2nd → 3rd in a single line. So below, each tower is shown separately, and the **pilot** is one clean chain. (Routing different incident *types* to different towers would be a future feature.)

---

## ✅ RECOMMENDED: IT / Cyber pilot chain (upload-ready)
This is your actual pilot scope — Nurul's **"Infrastructure, Security & Compliance"** tower, escalating up to the Director. Paste into a `.csv` and upload via **Call tree → Upload CSV** once contacts are confirmed.

```csv
order,name,role,email,phone,backup
1,Prashant Kamble,Network Admin & Security,‹confirm›@sodexo.com,‹confirm›,Neha Mayekar
2,Neha Mayekar,Telecom Ops & Asset/Vendor,‹confirm›@sodexo.com,‹confirm›,Prashant Kamble
3,Nurul Qureshi,Lead — Infrastructure/Security/Compliance,‹confirm›@sodexo.com,+91 98198 48222,Prashant Kamble
4,Anupam Singh,IT Director (TDDI India),Anupam.Singh@sodexo.com,+91 86188 79550,Nurul Qureshi
```
✅ known: Nurul phone, Anupam email + phone. `‹confirm›` = get from the person (with consent).
*Order = who's contacted first → escalates up to the Director. Adjust as your policy dictates.*

---

## 📋 Full IT department reference (from Sheet 1)
For the wider rollout later. Each tower is a potential separate chain/tree.

| Tower / Function | Lead | Team members (from Excel) |
|---|---|---|
| **TDDI / IT India** | Anupam Singh — Director (Bangalore) | (overall IT leadership) |
| **Application Management** | Badal Pardesi | Akshay Bore, Kumar Polisetti, Naveen Kumar |
| **End User Support** | Digambar Sasane | Balakannan Vadivel, Mukesh Dulgeh, Ravi Varma |
| **Infrastructure, Security & Compliance** ⭐(pilot) | Nurul Qureshi | Neha Mayekar, Prashant Kamble |
| **Digital Management** | (directly under Anupam) | Sumit Roy, Vinay Kolla, Rishabh Bharat, Sachin Amberkar |
| **Transversal / PMO & Transformation** | (under Anupam) | Tejesh Pendhari, Pradnya Shinde |

---

## 📋 Incident type → owning tower (from Sheet 2)
Useful for assigning **severities** later and for a future type-routing feature.

| Incident category | Example | Owning tower | Owner |
|---|---|---|---|
| Application | Outage / access / functional issue | Application Management | Badal Pardesi |
| End User Support | Laptop, access, printer, regional | End User Support | Digambar Sasane |
| Infrastructure | Network / server / telecom availability | Infra, Security & Compliance | Nurul Qureshi |
| Security & Compliance | Security incident, audit, risk | Infra, Security & Compliance | Nurul Qureshi |
| Digital / Data | Platform, analytics, data, product | Digital Management | (under Anupam) |
| PMO / Transformation | ERP, procurement, IT transformation | Transversal / PMO | Pradnya Shinde |

---

## Before this can be loaded live
- [ ] **Confirm each person's email + phone** (with their consent) — replace every `‹confirm›`.
- [ ] **Assign a severity (L0–L3)** to each incident type (your stakeholders decide — keep defaults for now).
- [ ] **Permission** to store the real contact data (see [PERMISSIONS_TO_OBTAIN.md](PERMISSIONS_TO_OBTAIN.md)).
- [ ] Decide: **just the IT/Cyber tower** (the pilot CSV above) **or** the whole department.

*Once those are ticked, loading it is a 1-minute CSV upload.*
