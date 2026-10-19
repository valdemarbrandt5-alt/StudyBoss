# Mail og adgangskode i StudyBoss

Hjemmeside: https://study-boss-eta.vercel.app/

Supabase-projekt: StudyBoss, reference `ytmosjreydqayjrkcfwy`.

## Opsætning

I [Authentication → Sign In / Providers](https://supabase.com/dashboard/project/ytmosjreydqayjrkcfwy/auth/providers):

- Email skal være aktiveret.
- Allow new users to sign up skal være slået til.
- Confirm email skal være slået fra for denne prøveversion uden mailtjeneste.
- Gem indstillingerne.

Ingen Google Cloud-konto eller OAuth-klient bruges længere. Private profiler og synkronisering bruger den samme database og adgangskontrol som før.

## Brug

Vælg Log ind på hjemmesiden. Skriv din mail og en adgangskode på mindst otte tegn, og vælg Opret profil. Ved senere besøg vælger du Log ind med samme mail og adgangskode. Brug din egen mailadresse, selvom den ikke bliver bekræftet.

Under Min profil kan du vælge Føj mine lokale fag til profilen for at få fag fra før login med. Log ind på samme profil på en anden computer for at hente dem. AI-modellen skal stadig startes lokalt på hver computer.

## Begrænsninger i prøveversionen

Mailadressen bekræftes ikke. En mailadresse er derfor ikke dokumentation for en persons identitet, og appen giver ingen særlige rettigheder ud fra maildomæne. Adgang til fag styres udelukkende af kontoens interne bruger-id.

Nulstilling af glemt adgangskode er ikke tilgængelig, før en mailtjeneste bliver tilsluttet. Appen viser denne begrænsning inden oprettelse. Der tilbydes ingen usikker genvej til nulstilling uden bekræftelse af identitet.

Fag, udtrukket materialetekst, noter, samtaler og træningsdata synkroniseres. Originale PDF-filer og AI-modeldownloads gør ikke. Samtidige ændringer håndteres med Behold begge versioner. Profilen må højst fylde 20 MB. Lokal cache bliver liggende efter logout; brug egen browserprofil på delte computere.

Appen sender adgangskoden til Supabase Auth over HTTPS og gemmer den ikke selv i fag, profiler eller browserlager. Supabase håndterer adgangskode og session.

Kilder: [Adgangskode-login](https://supabase.com/docs/guides/auth/passwords), [mailbekræftelse](https://supabase.com/docs/guides/auth/general-configuration).
