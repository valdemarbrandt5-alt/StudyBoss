# Mail og adgangskode i StudyBoss

Hjemmeside: https://study-boss-eta.vercel.app/

Supabase-projekt: StudyBoss, reference `ytmosjreydqayjrkcfwy`.

## Opsætning

I [Authentication → Sign In / Providers](https://supabase.com/dashboard/project/ytmosjreydqayjrkcfwy/auth/providers):

- Email skal være aktiveret.
- Allow new users to sign up skal være slået til.
- Confirm email skal være slået til. En ekstern mailtjeneste er nødvendig til andre end Supabase-projektets team.
- Gem indstillingerne.

Ingen Google Cloud-konto eller OAuth-klient bruges længere. Private profiler og synkronisering bruger den samme database og adgangskontrol som før.

## Brug

Vælg Log ind på hjemmesiden. Skriv din mail og en adgangskode på mindst otte tegn, og vælg Opret profil. Bekræft mailadressen via linket i din mail. Ved senere besøg vælger du Log ind med samme mail og adgangskode.

Under Min profil kan du vælge Føj mine lokale fag til profilen for at få fag fra før login med. Log ind på samme profil på en anden computer for at hente dem. AI-modellen skal stadig startes lokalt på hver computer.

## Begrænsninger i prøveversionen

Mailadressen skal bekræftes. Appen giver ingen særlige rettigheder ud fra maildomæne. Adgang til fag styres udelukkende af kontoens interne bruger-id.

Nulstilling af glemt adgangskode er ikke tilgængelig, før en mailtjeneste bliver tilsluttet. Appen viser denne begrænsning inden oprettelse. Der tilbydes ingen usikker genvej til nulstilling uden bekræftelse af identitet.

Fag, udtrukket materialetekst, noter, samtaler og træningsdata synkroniseres. Originale PDF-filer og AI-modeldownloads gør ikke. Samtidige ændringer håndteres med Behold begge versioner. Profilen må højst fylde 20 MB. Lokal cache bliver liggende efter logout; brug egen browserprofil på delte computere.

Appen sender adgangskoden til Supabase Auth over HTTPS og gemmer den ikke selv i fag, profiler eller browserlager. Supabase håndterer adgangskode og session.

Kilder: [Adgangskode-login](https://supabase.com/docs/guides/auth/passwords), [mailbekræftelse](https://supabase.com/docs/guides/auth/general-configuration).


## Gmail uden eget domæne

Gmail kan bruges til en lille prøveversion via SMTP. Google skal tillade appadgangskoder på kontoen, hvilket kræver totrinsbekræftelse. En separat Gmail-konto til StudyBoss kan bruges, så afsenderen er tydelig. Brugeren opretter og indsætter selv appadgangskoden direkte i Supabase.

I Authentication → Emails → SMTP Settings bruges host `smtp.gmail.com`, port `465`, SMTP username og Sender email er samme fulde Gmail-adresse, Sender name er `StudyBoss`, og SMTP password er appadgangskoden (ikke den normale Google-adgangskode). Aktivér og gem først, når felterne er udfyldt.

I Authentication → URL Configuration skal Site URL være `https://study-boss-eta.vercel.app`, og Redirect URLs skal indeholde `https://study-boss-eta.vercel.app/`.

Gmail har sendegrænser og kan blokere ved misbrug. Det er ikke en mailtjeneste med leveringsgaranti til en stor offentlig lancering. Test bekræftelseslinket med en rigtig konto, når SMTP er sat op.

[Google appadgangskoder](https://myaccount.google.com/apppasswords) · [Supabases Gmail-vejledning](https://supabase.com/docs/guides/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y)
